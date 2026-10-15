from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import APIException

from .models import PUBLIC_ROLES, Role, User


class DuplicateEmail(APIException):
    status_code = 409
    default_detail = "An account with this email already exists."
    default_code = "duplicate_email"


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "name", "email", "role")
        read_only_fields = fields


def _check_password(password, user=None):
    try:
        validate_password(password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"password": list(exc.messages)})


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    confirm_password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, default=Role.CUSTOMER)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise DuplicateEmail()
        return value

    def validate_role(self, value):
        if value not in [r.value for r in PUBLIC_ROLES]:
            raise serializers.ValidationError("Role must be either 'customer' or 'seller'.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        _check_password(attrs["password"], User(name=attrs["name"], email=attrs["email"]))
        return attrs

    def create(self, validated):
        return User.objects.create_user(
            email=validated["email"],
            password=validated["password"],
            name=validated["name"],
            role=validated["role"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            self.context.get("request"),
            email=attrs["email"].strip().lower(),
            password=attrs["password"],
        )
        if user is None or not user.is_active:
            raise serializers.ValidationError("Email or password is incorrect.", code="invalid_credentials")
        attrs["user"] = user
        return attrs


class OTPVerifySerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    code = serializers.RegexField(regex=r"^\d{6}$", error_messages={"invalid": "Enter the six-digit code."})


class OTPResendSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        _check_password(attrs["password"])
        return attrs
