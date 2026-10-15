from getpass import getpass

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from users.models import User


class Command(BaseCommand):
    help = "Create an admin account (password is prompted, never echoed or printed)."

    def add_arguments(self, parser):
        parser.add_argument("--name")
        parser.add_argument("--email")

    def handle(self, *args, **opts):
        name = opts["name"] or input("Name: ").strip()
        email = (opts["email"] or input("Email: ")).strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError("A user with this email already exists.")
        password = getpass("Password: ")
        if password != getpass("Confirm password: "):
            raise CommandError("Passwords do not match.")
        try:
            validate_password(password, User(name=name, email=email))
        except ValidationError as exc:
            raise CommandError("; ".join(exc.messages))
        User.objects.create_superuser(email=email, password=password, name=name)
        self.stdout.write(self.style.SUCCESS(f"Admin created: {email}"))
