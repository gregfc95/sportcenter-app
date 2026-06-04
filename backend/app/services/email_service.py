import logging

import mailtrap as mt
from flask import current_app

from .email_templates import password_email_bodies

logger = logging.getLogger(__name__)


def send_password_email(email: str, password: str) -> None:
    """Send the generated credentials to the user's inbox via the Mailtrap SDK."""
    cfg = current_app.config
    token = cfg.get("MAILTRAP_TOKEN")
    sender = cfg.get("MAIL_FROM")
    if not token or not sender:
        raise RuntimeError(
            "Mailtrap no está configurado (faltan MAILTRIP_TOKEN o MAIL_FROM)"
        )

    login_url = f"{cfg.get('APP_BASE_URL', '').rstrip('/')}/login"
    text, html = password_email_bodies(email, password, login_url)

    mail = mt.Mail(
        sender=mt.Address(email=sender, name=cfg.get("MAIL_FROM_NAME", "Sportify")),
        to=[mt.Address(email=email)],
        subject="Tus datos de acceso a Sportify",
        text=text,
        html=html,
        category="Password Delivery",
    )

    if cfg.get("MAILTRAP_SANDBOX"):
        client = mt.MailtrapClient(
            token=token,
            sandbox=True,
            inbox_id=cfg.get("MAILTRAP_INBOX_ID"),
        )
    else:
        client = mt.MailtrapClient(token=token)

    client.send(mail)
    logger.info("send_password_email -> %s (sent)", email)
