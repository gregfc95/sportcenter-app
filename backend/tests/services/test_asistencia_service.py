"""Tests de `AsistenciaService` contra la base de datos de tests.

Cubren el QR del cliente (gates de pago/fecha/uso y token perezoso), el
registro de asistencia por escaneo (idempotencia y códigos ajenos) y el
estado del historial. "Hoy" se ancla a AR_TZ igual que el servicio, así los
tests no dependen de la zona horaria del servidor.
"""

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app import db
from app.models.pago import PagoEstado
from app.models.user import UserRole
from app.services.asistencia_service import (
    QR_PREFIX,
    AsistenciaService,
    QrInvalido,
    QrYaUtilizado,
    estado_asistencia,
)
from app.services.reserva_service import AR_TZ

svc = AsistenciaService()


def hoy_ar():
    return datetime.now(tz=AR_TZ).date()


@pytest.fixture
def escenario(make_user, make_actividad, make_turno, make_reserva, make_pago):
    user = make_user()
    empleado = make_user(role=UserRole.EMPLOYEE)
    actividad = make_actividad(precio="1000.00")
    turno = make_turno(actividad)

    def reserva_pagada(fecha):
        # make_reserva inserta directo (sin validar día de semana ni pasado),
        # lo que permite armar reservas de hoy o de fechas ya pasadas.
        reserva = make_reserva(user, turno, fecha)
        make_pago(user, reserva, "1000.00", PagoEstado.PAGADO)
        return reserva

    return SimpleNamespace(
        user=user,
        empleado=empleado,
        turno=turno,
        make_reserva=make_reserva,
        reserva_pagada=reserva_pagada,
    )


class TestObtenerQr:
    def test_genera_data_url_y_token_estable(self, escenario):
        reserva = escenario.reserva_pagada(hoy_ar())
        qr = svc.obtener_qr(reserva)
        assert qr.startswith("data:image/png;base64,")
        token = reserva.qr_token
        assert token
        svc.obtener_qr(reserva)
        assert reserva.qr_token == token

    def test_no_paga_falla(self, escenario):
        reserva = escenario.make_reserva(escenario.user, escenario.turno, hoy_ar())
        with pytest.raises(ValueError, match="no está paga"):
            svc.obtener_qr(reserva)

    def test_futura_no_disponible(self, escenario):
        reserva = escenario.reserva_pagada(hoy_ar() + timedelta(days=7))
        with pytest.raises(ValueError, match="disponible el día del turno"):
            svc.obtener_qr(reserva)

    def test_pasada_expirado(self, escenario):
        reserva = escenario.reserva_pagada(hoy_ar() - timedelta(days=7))
        with pytest.raises(ValueError, match="ya ha expirado"):
            svc.obtener_qr(reserva)

    def test_ya_utilizado(self, escenario):
        reserva = escenario.reserva_pagada(hoy_ar())
        svc.obtener_qr(reserva)
        svc.registrar_asistencia(QR_PREFIX + reserva.qr_token, escenario.empleado.id)
        with pytest.raises(ValueError, match="ya ha sido utilizado"):
            svc.obtener_qr(reserva)


class TestRegistrarAsistencia:
    def test_registra_fecha_y_staff(self, escenario):
        reserva = escenario.reserva_pagada(hoy_ar())
        svc.obtener_qr(reserva)
        registrada = svc.registrar_asistencia(
            QR_PREFIX + reserva.qr_token, escenario.empleado.id
        )
        assert registrada.id == reserva.id
        assert registrada.asistencia_registrada_at is not None
        assert registrada.asistencia_registrada_por_id == escenario.empleado.id

    def test_sin_prefijo_es_invalido(self, escenario):
        with pytest.raises(QrInvalido):
            svc.registrar_asistencia("cualquier-cosa", escenario.empleado.id)

    def test_token_desconocido_es_invalido(self, escenario):
        with pytest.raises(QrInvalido):
            svc.registrar_asistencia(QR_PREFIX + "no-existe", escenario.empleado.id)

    def test_segundo_escaneo_falla(self, escenario):
        reserva = escenario.reserva_pagada(hoy_ar())
        svc.obtener_qr(reserva)
        codigo = QR_PREFIX + reserva.qr_token
        svc.registrar_asistencia(codigo, escenario.empleado.id)
        with pytest.raises(QrYaUtilizado):
            svc.registrar_asistencia(codigo, escenario.empleado.id)

    def test_turno_de_otro_dia_falla(self, escenario):
        # El QR de una fecha futura no se puede emitir, así que se fuerza el
        # token a mano para probar el gate del escaneo.
        reserva = escenario.reserva_pagada(hoy_ar() + timedelta(days=7))
        reserva.qr_token = "token-futuro"
        db.session.commit()
        with pytest.raises(ValueError, match="día de hoy"):
            svc.registrar_asistencia(QR_PREFIX + "token-futuro", escenario.empleado.id)


class TestHistorial:
    def test_estados_y_orden(self, escenario):
        pasada = escenario.reserva_pagada(hoy_ar() - timedelta(days=14))
        escaneada = escenario.reserva_pagada(hoy_ar())
        futura = escenario.reserva_pagada(hoy_ar() + timedelta(days=7))
        svc.obtener_qr(escaneada)
        svc.registrar_asistencia(
            QR_PREFIX + escaneada.qr_token, escenario.empleado.id
        )

        historial = svc.historial_usuario(escenario.user.id)
        assert [r.id for r in historial] == [futura.id, escaneada.id, pasada.id]

        hoy = hoy_ar()
        assert estado_asistencia(futura, hoy) == "pendiente"
        assert estado_asistencia(escaneada, hoy) == "asistio"
        assert estado_asistencia(pasada, hoy) == "ausente"

    def test_excluye_canceladas(self, escenario):
        activa = escenario.reserva_pagada(hoy_ar() - timedelta(days=7))
        cancelada = escenario.reserva_pagada(hoy_ar() - timedelta(days=14))
        cancelada.soft_delete()
        db.session.commit()

        historial = svc.historial_usuario(escenario.user.id)
        assert [r.id for r in historial] == [activa.id]
