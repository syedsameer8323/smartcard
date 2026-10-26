# this will have the import section and url patterns for the users app
from django.urls import path

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("login/verify-otp/", views.VerifyLoginOTPView.as_view(), name="auth-login-verify-otp"),
    path("login/resend-otp/", views.ResendLoginOTPView.as_view(), name="auth-login-resend-otp"),
    path("google/", views.GoogleLoginView.as_view(), name="auth-google"),
    path("refresh/", views.RefreshView.as_view(), name="auth-refresh"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="auth-reset-password"),
]
