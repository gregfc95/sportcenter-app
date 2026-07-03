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
from app.models.turno import DiaSemana
from app.models.user import UserRole
from app.services.pago_service import PagoService
from app.services.reserva_service import ReservaService

svc = PagoService()
reserva_svc = ReservaService()


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
        assert (
            svc.registrar_cancelacion(
                escenario.reserva.id, resolucion=PagoEstado.REEMBOLSADO
            )
            is None
        )

    def test_reembolso(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        cierre = svc.registrar_cancelacion(
            escenario.reserva.id, resolucion=PagoEstado.REEMBOLSADO
        )
        assert cierre.estado == PagoEstado.REEMBOLSADO
        assert cierre.monto == Decimal("500")

    def test_retenido(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        cierre = svc.registrar_cancelacion(
            escenario.reserva.id, resolucion=PagoEstado.CANCELADO
        )
        assert cierre.estado == PagoEstado.CANCELADO

    def test_credito_a_favor(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        cierre = svc.registrar_cancelacion(
            escenario.reserva.id, resolucion=PagoEstado.CREDITO
        )
        assert cierre.estado == PagoEstado.CREDITO
        assert cierre.monto == Decimal("500")

    def test_resolucion_invalida_falla(self, escenario):
        with pytest.raises(ValueError, match="inválida"):
            svc.registrar_cancelacion(
                escenario.reserva.id, resolucion=PagoEstado.PAGADO
            )

    def test_idempotente(self, escenario):
        svc.iniciar_pago(escenario.reserva.id)
        c1 = svc.registrar_cancelacion(
            escenario.reserva.id, resolucion=PagoEstado.REEMBOLSADO
        )
        c2 = svc.registrar_cancelacion(
            escenario.reserva.id, resolucion=PagoEstado.REEMBOLSADO
        )
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


@pytest.fixture
def abono(make_user, make_actividad, make_turno, next_date_for):
    """Abono mensual creado por el servicio real (una reserva por clase)."""
    user = make_user()
    actividad = make_actividad(precio="1000.00")
    turno = make_turno(actividad, dia_semana=DiaSemana.LUNES)
    fecha = next_date_for(DiaSemana.LUNES)
    reservas = reserva_svc.crear_reserva_mensual(user.id, turno.id, fecha)
    return SimpleNamespace(user=user, actividad=actividad, turno=turno, reservas=reservas)


class TestRegistrarMensualidad:
    def test_crea_un_pago_pagado_por_clase(self, abono):
        pagos = svc.registrar_mensualidad(abono.reservas[0].id)

        assert len(pagos) == len(abono.reservas)
        assert all(p.estado == PagoEstado.PAGADO for p in pagos)
        assert all(p.monto == Decimal("1000") for p in pagos)
        assert {p.reserva_id for p in pagos} == {r.id for r in abono.reservas}

    def test_idempotente(self, abono):
        p1 = svc.registrar_mensualidad(abono.reservas[0].id)
        p2 = svc.registrar_mensualidad(abono.reservas[0].id)
        assert [p.id for p in p1] == [p.id for p in p2]

    def test_acepta_cualquier_reserva_del_grupo(self, abono):
        pagos = svc.registrar_mensualidad(abono.reservas[-1].id)
        assert len(pagos) == len(abono.reservas)

    def test_eventual_falla(self, escenario):
        with pytest.raises(ValueError, match="abono mensual"):
            svc.registrar_mensualidad(escenario.reserva.id)


class TestCrearPreferenciaGuards:
    """Sólo las validaciones previas (no se llega a Mercado Pago)."""

    def test_mensual_no_admite_sena(self, abono):
        with pytest.raises(ValueError, match="sin seña"):
            svc.crear_preferencia(abono.reservas[0].id)


class TestCrearPreferenciaMensualidadGuards:
    """Sólo las validaciones previas (no se llega a Mercado Pago)."""

    def test_eventual_falla(self, escenario):
        with pytest.raises(ValueError, match="abono mensual"):
            svc.crear_preferencia_mensualidad(escenario.reserva.id)

    def test_ya_pagada_falla(self, abono):
        svc.registrar_mensualidad(abono.reservas[0].id)
        with pytest.raises(ValueError, match="ya tiene un pago"):
            svc.crear_preferencia_mensualidad(abono.reservas[0].id)


class TestResumenPagoMensual:
    def test_pendiente_sin_sena(self, abono):
        resumen = svc.resumen_pago(abono.reservas[0])
        assert resumen["sena"] == Decimal("0")
        assert resumen["total"] == Decimal("1000")
        assert resumen["saldo"] == Decimal("1000")

    def test_pagada_sin_saldo(self, abono):
        svc.registrar_mensualidad(abono.reservas[0].id)
        resumen = svc.resumen_pago(abono.reservas[0])
        assert resumen["sena"] == Decimal("0")
        assert resumen["cobrado"] == Decimal("1000")
        assert resumen["saldo"] == Decimal("0")
