# this is responsible for handling the business logic for user authentication, registration, and password management in the backend of the e-commerce application

import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import update_last_login
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import LoginOTPChallenge, User
from .serializers import (
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    OTPResendSerializer,
    OTPVerifySerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)

OTP_LENGTH = 6
OTP_LIFETIME_MINUTES = 5
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_RESENDS = 5


class PublicThrottledView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]


def send_account_email(user):
    subject = "Welcome to SmartCart"
    message = (
        f"Hi {user.name},\n\n"
        "Thank you for creating your SmartCart account. Your account has been created successfully.\n\n"
        "If you did not create this account, please contact our support team.\n\n"
        "— SmartCart"
    )
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
    except Exception:
        # Account creation should not be undone because an email provider is temporarily unavailable.
        logger.exception("Could not send SmartCart registration email to user id=%s", user.pk)


def send_login_notification(user):
    subject = "New sign-in to your SmartCart account"
    message = (
        f"Hi {user.name},\n\n"
        "Your SmartCart account was just signed in to after email verification.\n\n"
        "If this wasn't you, reset your password immediately and contact support.\n\n"
        "— SmartCart"
    )
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
    except Exception:
        # Do not turn a completed login into a failure if notification email is temporarily unavailable.
        logger.exception("Could not send SmartCart login notification to user id=%s", user.pk)


def send_otp_email(user, code):
    subject = "Your SmartCart sign-in verification code"
    message = (
        f"Hi {user.name},\n\n"
        f"Your SmartCart verification code is: {code}\n\n"
        f"This code expires in {OTP_LIFETIME_MINUTES} minutes and can be used only once. "
        "Do not share it with anyone.\n\n"
        "If you did not try to sign in, you can ignore this email and consider changing your password.\n\n"
        "— SmartCart"
    )
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)


def create_otp_challenge(user):
    code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"
    now = timezone.now()
    # Invalidate outstanding challenges so only the latest code can be used.
    LoginOTPChallenge.objects.filter(user=user, is_used=False).update(is_used=True)
    challenge = LoginOTPChallenge.objects.create(
        user=user,
        code_hash=make_password(code),
        expires_at=now + timedelta(minutes=OTP_LIFETIME_MINUTES),
        last_sent_at=now,
    )
    return challenge, code


def issue_tokens(user):
    update_last_login(None, user)
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    }


class RegisterView(PublicThrottledView):
    throttle_scope = "register"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_account_email(user)
        return Response(
            {
                "message": "Account created successfully. Check your inbox for a welcome email.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(PublicThrottledView):
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            if "non_field_errors" in serializer.errors:
                return Response(
                    {"message": "Email or password is incorrect."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            return Response(
                {"message": "Please correct the highlighted fields.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.validated_data["user"]
        challenge, code = create_otp_challenge(user)
        try:
            send_otp_email(user, code)
        except Exception:
            logger.exception("Could not send SmartCart login OTP to user id=%s", user.pk)
            challenge.delete()
            return Response(
                {"message": "We could not send a verification code. Please try signing in again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # No JWT is issued until the OTP has been verified.
        return Response(
            {
                "message": "Verification code sent to your email.",
                "otp_required": True,
                "challenge_id": str(challenge.challenge_id),
                "email_hint": _mask_email(user.email),
                "expires_in": OTP_LIFETIME_MINUTES * 60,
            },
            status=status.HTTP_200_OK,
        )


def _mask_email(email):
    local, separator, domain = email.partition("@")
    if not separator:
        return "***"
    visible = local[:1] if local else ""
    return f"{visible}{'*' * max(2, len(local) - 1)}@{domain}"


class VerifyLoginOTPView(PublicThrottledView):
    throttle_scope = "otp_verify"

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        challenge = LoginOTPChallenge.objects.select_related("user").filter(
            challenge_id=data["challenge_id"],
            is_used=False,
        ).first()

        if challenge is None:
            return Response(
                {"message": "This verification request is invalid or has expired. Sign in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        if challenge.expires_at <= now:
            challenge.is_used = True
            challenge.save(update_fields=["is_used"])
            return Response(
                {"message": "Your code has expired. Request a new code or sign in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if challenge.attempts >= OTP_MAX_ATTEMPTS:
            challenge.is_used = True
            challenge.save(update_fields=["is_used"])
            return Response(
                {"message": "Too many incorrect codes. Sign in again to request a new code."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if not check_password(data["code"], challenge.code_hash):
            challenge.attempts += 1
            if challenge.attempts >= OTP_MAX_ATTEMPTS:
                challenge.is_used = True
            challenge.save(update_fields=["attempts", "is_used"])
            remaining = max(0, OTP_MAX_ATTEMPTS - challenge.attempts)
            return Response(
                {
                    "message": "The verification code is incorrect.",
                    "attempts_remaining": remaining,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        challenge.is_used = True
        challenge.save(update_fields=["is_used"])
        payload = issue_tokens(challenge.user)
        send_login_notification(challenge.user)
        return Response({"message": "Login successful.", **payload}, status=status.HTTP_200_OK)


class ResendLoginOTPView(PublicThrottledView):
    throttle_scope = "otp_resend"

    def post(self, request):
        serializer = OTPResendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge_id = serializer.validated_data["challenge_id"]

        challenge = LoginOTPChallenge.objects.select_related("user").filter(
            challenge_id=challenge_id,
            is_used=False,
        ).first()
        if challenge is None:
            return Response(
                {"message": "This verification request is invalid or has expired. Sign in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        if challenge.expires_at <= now:
            challenge.is_used = True
            challenge.save(update_fields=["is_used"])
            return Response(
                {"message": "This verification request has expired. Sign in again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        seconds_since_send = (now - challenge.last_sent_at).total_seconds()
        if seconds_since_send < OTP_RESEND_COOLDOWN_SECONDS:
            wait = int(OTP_RESEND_COOLDOWN_SECONDS - seconds_since_send)
            return Response(
                {"message": f"Please wait {wait} seconds before requesting another code.", "retry_after": wait},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if challenge.resend_count >= OTP_MAX_RESENDS:
            challenge.is_used = True
            challenge.save(update_fields=["is_used"])
            return Response(
                {"message": "You have requested too many codes. Sign in again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"
        challenge.code_hash = make_password(code)
        challenge.created_at = now
        challenge.expires_at = now + timedelta(minutes=OTP_LIFETIME_MINUTES)
        challenge.last_sent_at = now
        challenge.attempts = 0
        challenge.resend_count += 1
        challenge.save(update_fields=[
            "code_hash", "created_at", "expires_at", "last_sent_at", "attempts", "resend_count"
        ])

        try:
            send_otp_email(challenge.user, code)
        except Exception:
            logger.exception("Could not resend SmartCart login OTP to user id=%s", challenge.user_id)
            challenge.is_used = True
            challenge.save(update_fields=["is_used"])
            return Response(
                {"message": "We could not send a new code. Please sign in again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {"message": "A new verification code has been sent.", "expires_in": OTP_LIFETIME_MINUTES * 60},
            status=status.HTTP_200_OK,
        )


class RefreshView(TokenRefreshView):
    authentication_classes = []
    permission_classes = [AllowAny]


class MeView(APIView):
    def get(self, request):
        return Response({"user": UserSerializer(request.user).data})


class LogoutView(APIView):
    """Blacklists the refresh token so it cannot mint new access tokens."""

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            pass
        return Response({"message": "Logged out successfully"})


class ForgotPasswordView(PublicThrottledView):
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            try:
                send_mail(
                    "Reset your SmartCart password",
                    f"Reset your password using this link: {link}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception:
                logger.exception("Could not send password reset email to user id=%s", user.pk)
        return Response({"message": "If an account exists for that email, a reset link has been sent."})


class ResetPasswordView(PublicThrottledView):
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(data["uid"])))
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            user = None

        if user is None or not default_token_generator.check_token(user, data["token"]):
            return Response(
                {"message": "This reset link is invalid or has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(data["password"])
        user.save(update_fields=["password", "updated_at"])
        LoginOTPChallenge.objects.filter(user=user, is_used=False).update(is_used=True)
        return Response({"message": "Password updated. You can now sign in."})
