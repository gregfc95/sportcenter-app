import os

import mercadopago

# El ejemplo de la doc usa SDK("TEST_ACCESS_TOKEN"); en este proyecto el token
# vive en el entorno bajo MP_ACCESS_TOKEN (ver .env), inyectado por docker-compose.
_sdk: mercadopago.SDK | None = None


def get_sdk() -> mercadopago.SDK:
    """Devuelve un SDK de Mercado Pago, creándolo la primera vez.

    Se inicializa de forma perezosa para que el token se lea recién cuando se
    usa (y no al importar el módulo), tomándolo de la variable de entorno.
    """
    global _sdk
    if _sdk is None:
        access_token = os.getenv("MP_ACCESS_TOKEN")
        if not access_token:
            raise RuntimeError(
                "MP_ACCESS_TOKEN no está configurado en el entorno."
            )
        _sdk = mercadopago.SDK(access_token)
    return _sdk
