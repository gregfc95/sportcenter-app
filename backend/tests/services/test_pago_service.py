"""Tests de `PagoService` contra la base de datos de tests.

Cubren el alta y avance de pagos, idempotencia y cierre contable. Mercado Pago
nunca se invoca: de `crear_preferencia_saldo` sólo se prueban las validaciones
previas, que lanzan antes de llamar al SDK.
"""

from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.pago import PagoEstado, PagoMedio
from app.models.user import UserRole
from app.services.pago_service import PagoService

svc = PagoService()


@pytest.fixture
def escenario(make_user, make_actividad, make_turno, make_reserva):
    user = make_user()
    empleado = make_user(role=UserRole.EMPLOYEE)
    actividad = make_actividad(precio="1000.00")
    turno = make_turno(actividad)
    reserva = make_reserva(user, turno, date.today() + timedelta(days=7))
    return SimpleNamespace(user=user, empleado=empleado, reserva=reserva)


class TestIniciarPago:
    def test_crea_sena_del_50pct(self, escenario):
        pago = svc.iniciar_pago(escenario.reserva.id)
        assert pago.estado == PagoEstado.SENADO
        assert pago.monto == Decimal("500")

    def test_duplicado_falla(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        with pytest.raises(ValueError, match="Ya existe un pago"):
            svc.iniciar_pago(escenario.reserva.id)

    def test_registrar_sena_si_falta_es_idempotente(self, escenario):
        p1 = svc.registrar_sena_si_falta(escenario.reserva.id)
        p2 = svc.registrar_sena_si_falta(escenario.reserva.id)
        assert p1.id == p2.id


class TestCompletarPago:
    def test_crea_segundo_pago_por_el_saldo(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        pago = svc.completar_pago(escenario.reserva.id)
        assert pago.estado == PagoEstado.PAGADO
        assert pago.monto == Decimal("500")

    def test_idempotente(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        p1 = svc.completar_pago(escenario.reserva.id)
        p2 = svc.completar_pago(escenario.reserva.id)
        assert p1.id == p2.id

    def test_sin_sena_falla(self, escenario):
        with pytest.raises(ValueError, match="seña"):
            svc.completar_pago(escenario.reserva.id)


class TestPagoManual:
    def test_registra_saldo_en_efectivo(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        pago = svc.registrar_pago_manual(escenario.reserva.id, escenario.empleado.id)
        assert pago.estado == PagoEstado.PAGADO
        assert pago.metodo == PagoMedio.EFECTIVO
        assert pago.registrado_por_id == escenario.empleado.id
        assert pago.monto == Decimal("500")

    def test_ya_pagada_falla(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        svc.completar_pago(escenario.reserva.id)
        with pytest.raises(ValueError, match="ya está paga"):
            svc.registrar_pago_manual(escenario.reserva.id, escenario.empleado.id)


class TestRegistrarCancelacion:
    def test_sin_cobros_devuelve_none(self, escenario):
        assert svc.registrar_cancelacion(escenario.reserva.id, reembolsar=True) is None

    def test_reembolso(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        cierre = svc.registrar_cancelacion(escenario.reserva.id, reembolsar=True)
        assert cierre.estado == PagoEstado.REEMBOLSADO
        assert cierre.monto == Decimal("500")

    def test_retenido(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        cierre = svc.registrar_cancelacion(escenario.reserva.id, reembolsar=False)
        assert cierre.estado == PagoEstado.CANCELADO

    def test_idempotente(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        c1 = svc.registrar_cancelacion(escenario.reserva.id, reembolsar=True)
        c2 = svc.registrar_cancelacion(escenario.reserva.id, reembolsar=True)
        assert c1.id == c2.id


class TestCrearPreferenciaSaldoGuards:
    """Sólo las validaciones previas (no se llega a Mercado Pago)."""

    def test_sin_sena_falla(self, escenario):
        with pytest.raises(ValueError, match="seña"):
            svc.crear_preferencia_saldo(escenario.reserva.id)

    def test_ya_pagada_falla(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        svc.completar_pago(escenario.reserva.id)
        with pytest.raises(ValueError, match="completo"):
            svc.crear_preferencia_saldo(escenario.reserva.id)
