"""Transactional email sending via Resend (https://resend.com).

Only the API key is a secret - it is read from the ``RESEND_API_KEY`` env var
(injected from ``odes-secret``) and must never be hardcoded.  When the key is
unset (e.g. local dev) sending is skipped and logged, so the rest of the flow
still works without crashing.
"""
import os

import requests

from app.libs.logging.logger import get_logger

logger = get_logger()

RESEND_API_URL = "https://api.resend.com/emails"
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
# Must be an address on a domain verified in Resend (e.g. webodes.app).
MAIL_FROM = os.getenv("MAIL_FROM", "ODES <no-reply@webodes.app>")


def send_email(to: str, subject: str, html: str) -> bool:
    """Send a single HTML email.  Returns True on success, False otherwise.

    Never raises - email delivery is best-effort and must not break the calling
    request (we deliberately don't reveal delivery status to the client anyway).
    """
    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY is not set - skipping email send to %s.", to)
        return False
    try:
        resp = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"from": MAIL_FROM, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
        if resp.status_code >= 400:
            logger.error("Resend send failed (%s): %s", resp.status_code, resp.text)
            return False
        logger.info("Sent email to %s (subject=%r)", to, subject)
        return True
    except Exception as e:  # noqa: BLE001 - best-effort, log and move on
        logger.error("Resend send error for %s: %s", to, e)
        return False
