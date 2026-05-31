import logging

logger = logging.getLogger(__name__)


def send_password_email(email: str, password: str) -> None:
    """Send the generated password to the user's inbox.

    Stub hook for the external email provider. Wire the provider's client in
    here (e.g. SendGrid / AWS SES) when ready.
    """
    # TODO: integrate external email provider
    logger.info("send_password_email -> %s (password generated)", email)
