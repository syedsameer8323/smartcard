from unittest.mock import patch

from rest_framework.test import APITestCase

from .models import User


REG = "/api/auth/register/"
LOGIN = "/api/auth/login/"
VERIFY_OTP = "/api/auth/login/verify-otp/"
REFRESH = "/api/auth/refresh/"
LOGOUT = "/api/auth/logout/"
ME = "/api/auth/me/"

VALID = {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Str0ng!Pass#99",
    "confirm_password": "Str0ng!Pass#99",
    "role": "customer",
}


class AuthTests(APITestCase):

    def register(self, **over):
        return self.client.post(
            REG,
            {**VALID, **over},
            format="json",
        )

    def login(
        self,
        email="john@example.com",
        password="Str0ng!Pass#99",
    ):
        return self.client.post(
            LOGIN,
            {"email": email, "password": password},
            format="json",
        )

    def test_register_customer_and_seller(self):
        response = self.register()
        self.assertEqual(response.status_code, 201)

        response = self.register(
            email="s@example.com",
            role="seller",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["user"]["role"], "seller")
        self.assertNotIn("password", response.data["user"])

    def test_admin_registration_blocked(self):
        response = self.register(role="admin")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_extra_privilege_fields_ignored(self):
        self.register(
            is_staff=True,
            is_superuser=True,
        )

        user = User.objects.get()

        self.assertFalse(user.is_staff or user.is_superuser)

    def test_duplicate_email_409(self):
        self.register()

        response = self.register(email="JOHN@example.com")

        self.assertEqual(response.status_code, 409)

    def test_validation_errors(self):
        self.assertEqual(
            self.register(email="nope").status_code,
            400,
        )

        self.assertEqual(
            self.register(
                confirm_password="different"
            ).status_code,
            400,
        )

        self.assertEqual(
            self.register(
                password="123",
                confirm_password="123",
            ).status_code,
            400,
        )

    def test_password_is_hashed(self):
        self.register()

        user = User.objects.get()

        self.assertNotEqual(
            user.password,
            VALID["password"],
        )

    def test_login_me_refresh_logout(self):
        self.register()

        # Mock email sending so the test does not depend on SMTP.
        with (
            patch("users.views.send_otp_email") as send_otp_email,
            patch("users.views.send_login_notification"),
        ):
            # Step 1: Submit email and password.
            login_response = self.login()

            self.assertEqual(login_response.status_code, 200)
            self.assertTrue(login_response.data["otp_required"])
            self.assertIn(
                "challenge_id",
                login_response.data,
            )
            self.assertNotIn("access", login_response.data)
            self.assertNotIn("refresh", login_response.data)

            challenge_id = login_response.data["challenge_id"]

            # Step 2: Get the OTP passed to the email function.
            send_otp_email.assert_called_once()

            code = send_otp_email.call_args.args[1]

            self.assertEqual(len(code), 6)
            self.assertTrue(code.isdigit())

            # Step 3: Verify OTP to obtain JWT tokens.
            verify_response = self.client.post(
                VERIFY_OTP,
                {
                    "challenge_id": challenge_id,
                    "code": code,
                },
                format="json",
            )

            self.assertEqual(
                verify_response.status_code,
                200,
                verify_response.data,
            )

            self.assertIn("access", verify_response.data)
            self.assertIn("refresh", verify_response.data)

            access = verify_response.data["access"]
            refresh = verify_response.data["refresh"]

        # Step 4: Verify authenticated access.
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access}"
        )

        me_response = self.client.get(ME)

        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(
            me_response.data["user"]["email"],
            "john@example.com",
        )

        # Step 5: Refresh the JWT.
        refresh_response = self.client.post(
            REFRESH,
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(
            refresh_response.status_code,
            200,
            refresh_response.data,
        )

        new_refresh = refresh_response.data["refresh"]

        # Step 6: Log out and revoke the refresh token.
        logout_response = self.client.post(
            LOGOUT,
            {"refresh": new_refresh},
            format="json",
        )

        self.assertEqual(logout_response.status_code, 200)

        # Step 7: Confirm the revoked token cannot be reused.
        retry_response = self.client.post(
            REFRESH,
            {"refresh": new_refresh},
            format="json",
        )

        self.assertEqual(retry_response.status_code, 401)

    def test_bad_login_401(self):
        self.register()

        response = self.login(password="wrong")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.data["message"],
            "Email or password is incorrect.",
        )

    def test_protected_without_or_invalid_token(self):
        response = self.client.get(ME)

        self.assertEqual(response.status_code, 401)

        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer garbage"
        )

        response = self.client.get(ME)

        self.assertEqual(response.status_code, 401)