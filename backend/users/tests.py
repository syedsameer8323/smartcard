from rest_framework.test import APITestCase

from .models import User

REG = "/api/auth/register/"
LOGIN = "/api/auth/login/"
VALID = {"name": "John Doe", "email": "john@example.com", "password": "Str0ng!Pass#99",
         "confirm_password": "Str0ng!Pass#99", "role": "customer"}


class AuthTests(APITestCase):
    def register(self, **over):
        return self.client.post(REG, {**VALID, **over}, format="json")

    def login(self, email="john@example.com", password="Str0ng!Pass#99"):
        return self.client.post(LOGIN, {"email": email, "password": password}, format="json")

    def test_register_customer_and_seller(self):
        self.assertEqual(self.register().status_code, 201)
        r = self.register(email="s@example.com", role="seller")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["user"]["role"], "seller")
        self.assertNotIn("password", r.data["user"])

    def test_admin_registration_blocked(self):
        r = self.register(role="admin")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.exists())

    def test_extra_privilege_fields_ignored(self):
        self.register(is_staff=True, is_superuser=True)
        u = User.objects.get()
        self.assertFalse(u.is_staff or u.is_superuser)

    def test_duplicate_email_409(self):
        self.register()
        self.assertEqual(self.register(email="JOHN@example.com").status_code, 409)

    def test_validation_errors(self):
        self.assertEqual(self.register(email="nope").status_code, 400)
        self.assertEqual(self.register(confirm_password="different").status_code, 400)
        self.assertEqual(self.register(password="123", confirm_password="123").status_code, 400)

    def test_password_is_hashed(self):
        self.register()
        self.assertNotEqual(User.objects.get().password, VALID["password"])

    def test_login_me_refresh_logout(self):
        self.register()
        r = self.login()
        self.assertEqual(r.status_code, 200)
        access, refresh = r.data["access"], r.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(self.client.get("/api/auth/me/").data["user"]["email"], "john@example.com")
        new = self.client.post("/api/auth/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(new.status_code, 200)
        out = self.client.post("/api/auth/logout/", {"refresh": new.data["refresh"]}, format="json")
        self.assertEqual(out.status_code, 200)
        again = self.client.post("/api/auth/refresh/", {"refresh": new.data["refresh"]}, format="json")
        self.assertEqual(again.status_code, 401)

    def test_bad_login_401(self):
        self.register()
        r = self.login(password="wrong")
        self.assertEqual(r.status_code, 401)
        self.assertEqual(r.data["message"], "Email or password is incorrect.")

    def test_protected_without_or_invalid_token(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer garbage")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
