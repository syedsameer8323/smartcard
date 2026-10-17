"""
Django email backend that sends mail through Brevo's HTTPS API (port 443).

Why: Render's free tier blocks SMTP ports (25/465/587), so Gmail SMTP cannot
work there. This backend needs no extra pip packages.

Required environment variables on Render:
    EMAIL_BACKEND=config.brevo_email.BrevoEmailBackend
    BREVO_API_KEY=<your Brevo API key (starts with xkeysib-)>
    DEFAULT_FROM_EMAIL=<the sender email you verified in Brevo>
"""
import json
import os
import urllib.error
import urllib.request
from email.utils import parseaddr

from django.core.mail.backends.base import BaseEmailBackend

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


class BrevoEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        api_key = os.environ.get("BREVO_API_KEY", "")
        if not api_key:
            if not self.fail_silently:
                raise RuntimeError("BREVO_API_KEY is not set.")
            return 0

        sent = 0
        for message in email_messages:
            name, address = parseaddr(message.from_email)
            payload = {
                "sender": {"email": address, **({"name": name} if name else {})},
                "to": [{"email": r} for r in message.to],
                "subject": message.subject,
            }
            html = next(
                (c for c, m in getattr(message, "alternatives", []) if m == "text/html"),
                None,
            )
            if message.content_subtype == "html":
                payload["htmlContent"] = message.body
            else:
                payload["textContent"] = message.body
                if html:
                    payload["htmlContent"] = html
            if message.cc:
                payload["cc"] = [{"email": r} for r in message.cc]
            if message.bcc:
                payload["bcc"] = [{"email": r} for r in message.bcc]

            request = urllib.request.Request(
                BREVO_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "api-key": api_key,
                    "accept": "application/json",
                    "content-type": "application/json",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(request, timeout=15):
                    sent += 1
            except (urllib.error.URLError, TimeoutError):
                if not self.fail_silently:
                    raise
        return sent