"""Unit tests del espaciado de envíos de `email_service` (sin red ni DB).

Mailtrap (plan gratuito) admite un envío cada 10 segundos; `_send_espaciado`
serializa los emails con 11 s entre requests para que las promociones en
ráfaga no pierdan avisos por rate limit.
"""

import pytest

from app.services import email_service


class RelojFalso:
    """Monotonic + sleep falsos: dormir avanza el reloj y queda registrado."""

    def __init__(self):
        self.ahora = 1000.0
        self.dormido = []

    def monotonic(self):
        return self.ahora

    def sleep(self, segundos):
        self.dormido.append(segundos)
        self.ahora += segundos


@pytest.fixture
def reloj(monkeypatch):
    reloj = RelojFalso()
    monkeypatch.setattr(email_service.time, "monotonic", reloj.monotonic)
    monkeypatch.setattr(email_service.time, "sleep", reloj.sleep)
    monkeypatch.setattr(email_service, "_proximo_envio", 0.0)
    return reloj


class TestSendEspaciado:
    def test_espacia_envios_consecutivos(self, reloj, monkeypatch):
        envios = []
        monkeypatch.setattr(
            email_service,
            "_client",
            lambda cfg: type("C", (), {"send": lambda self, m: envios.append(m)})(),
        )

        email_service._send_espaciado({}, "mail-1")
        assert reloj.dormido == []  # el primero sale inmediato

        email_service._send_espaciado({}, "mail-2")
        assert envios == ["mail-1", "mail-2"]
        assert reloj.dormido == [email_service._ESPACIADO_ENVIO]

    def test_ventana_ya_cumplida_no_duerme(self, reloj, monkeypatch):
        monkeypatch.setattr(
            email_service,
            "_client",
            lambda cfg: type("C", (), {"send": lambda self, m: None})(),
        )
        email_service._send_espaciado({}, "mail-1")
        reloj.ahora += email_service._ESPACIADO_ENVIO + 1

        email_service._send_espaciado({}, "mail-2")
        assert reloj.dormido == []

    def test_envio_fallido_tambien_sella_la_ventana(self, reloj, monkeypatch):
        # Mailtrap cuenta el request aunque falle: el siguiente envío igual
        # tiene que respetar el espaciado.
        def _falla(cfg):
            raise RuntimeError("boom")

        monkeypatch.setattr(email_service, "_client", _falla)
        with pytest.raises(RuntimeError):
            email_service._send_espaciado({}, "mail-1")

        monkeypatch.setattr(
            email_service,
            "_client",
            lambda cfg: type("C", (), {"send": lambda self, m: None})(),
        )
        email_service._send_espaciado({}, "mail-2")
        assert reloj.dormido == [email_service._ESPACIADO_ENVIO]
