"""Tests de `PagoService` contra la base de datos de tests.

Cubren el alta y avance de pagos, idempotencia y cierre contable. Mercado Pago
nunca se invoca: de `crear_preferencia_saldo` sólo se prueban las validaciones
previas, que lanzan antes de llamar al SDK.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from freezegun import freeze_time
from sqlalchemy import select

from app.models.credito import Credito, CreditoConsumo
from app.models.pago import Pago, PagoEstado, PagoMedio
from app.models.turno import DiaSemana
from app.models.user import UserRole
from app.services.credito_service import CreditoService
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
def abono(make_user, make_actividad, make_turno):
    """Abono mensual creado por el servicio real (una reserva por clase).

    El usuario no tiene penalizaciones ni suspensiones, así que le corresponde
    el descuento de fidelidad del 20%: cada clase se cobra a 800 (precio 1000).
    """
    user = make_user()
    actividad = make_actividad(precio="1000.00")
    turno = make_turno(actividad, dia_semana=DiaSemana.LUNES)
    # Fecha fija con el reloj anclado: el abono debe tener varias clases del mes
    # (para repartir crédito y validar el pago por clase). Con la fecha real, un
    # "hoy" tarde en el mes dejaría una sola clase y el escenario se rompe.
    with freeze_time("2026-07-01"):
        reservas = reserva_svc.crear_reserva_mensual(
            user.id, turno.id, date(2026, 7, 6)
        )
    return SimpleNamespace(user=user, actividad=actividad, turno=turno, reservas=reservas)


class TestRegistrarMensualidad:
    def test_crea_un_pago_pagado_por_clase(self, abono):
        pagos = svc.registrar_mensualidad(abono.reservas[0].id)

        assert len(pagos) == len(abono.reservas)
        assert all(p.estado == PagoEstado.PAGADO for p in pagos)
        assert all(p.monto == Decimal("800") for p in pagos)  # 1000 − 20% de fidelidad
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
        assert resumen["cobrado"] == Decimal("800")  # 1000 − 20% de fidelidad
        assert resumen["saldo"] == Decimal("0")


def _sena_pago(db_session, reserva_id):
    return db_session.execute(
        select(Pago).where(
            Pago.reserva_id == reserva_id, Pago.estado == PagoEstado.SENADO
        )
    ).scalar_one()


class TestCancelacionCreaCredito:
    def test_credito_crea_credito_de_la_actividad(self, abono, db_session):
        svc.registrar_mensualidad(abono.reservas[0].id)
        clase = abono.reservas[0]

        cierre = svc.registrar_cancelacion(clase.id, resolucion=PagoEstado.CREDITO)
        assert cierre.estado == PagoEstado.CREDITO
        assert cierre.monto == Decimal("800")  # clase con descuento de fidelidad

        credito = db_session.execute(
            select(Credito).where(Credito.reserva_id == clase.id)
        ).scalar_one()
        assert credito.saldo == Decimal("800")
        assert credito.actividad_id == abono.actividad.id
        assert credito.expira_at > datetime.now(timezone.utc) + timedelta(days=29)

    def test_credito_es_idempotente(self, abono, db_session):
        svc.registrar_mensualidad(abono.reservas[0].id)
        clase = abono.reservas[0]
        svc.registrar_cancelacion(clase.id, resolucion=PagoEstado.CREDITO)
        svc.registrar_cancelacion(clase.id, resolucion=PagoEstado.CREDITO)

        creditos = db_session.execute(
            select(Credito).where(Credito.reserva_id == clase.id)
        ).scalars().all()
        assert len(creditos) == 1


class TestCheckoutCubiertoPorCredito:
    """Cobertura total: no se pasa por Mercado Pago (no se mockea el SDK)."""

    def test_sena_cubierta_saltea_mp(self, escenario, make_credito, make_reserva, db_session):
        actividad = escenario.reserva.turno.actividad
        origen = make_reserva(
            escenario.user, escenario.reserva.turno, date.today() + timedelta(days=30)
        )
        make_credito(escenario.user, actividad, origen, monto="500")

        resultado = svc.crear_preferencia(escenario.reserva.id)
        assert resultado["pagado_con_credito"] is True
        assert resultado["monto_credito"] == 500.0

        pago = _sena_pago(db_session, escenario.reserva.id)
        assert pago.metodo == PagoMedio.CREDITO_A_FAVOR
        # El crédito quedó consumido por completo.
        assert CreditoService().saldo_disponible(
            escenario.user.id, actividad.id
        ) == Decimal("0")

    def test_mensualidad_cubierta_saltea_mp(self, abono, make_credito, make_reserva, db_session):
        # Crédito suficiente para todas las clases del abono.
        origen = make_reserva(abono.user, abono.turno, date.today() + timedelta(days=60))
        total = Decimal("1000") * len(abono.reservas)
        make_credito(abono.user, abono.actividad, origen, monto=str(total + 500))

        resultado = svc.crear_preferencia_mensualidad(abono.reservas[0].id)
        assert resultado["pagado_con_credito"] is True

        pagos = db_session.execute(
            select(Pago).where(Pago.estado == PagoEstado.PAGADO)
        ).scalars().all()
        assert len(pagos) == len(abono.reservas)
        assert all(p.metodo == PagoMedio.CREDITO_A_FAVOR for p in pagos)


class TestCheckoutParcialConCredito:
    def test_sena_parcial_manda_resto_a_mp(self, escenario, make_credito, make_reserva, monkeypatch):
        actividad = escenario.reserva.turno.actividad
        origen = make_reserva(
            escenario.user, escenario.reserva.turno, date.today() + timedelta(days=30)
        )
        make_credito(escenario.user, actividad, origen, monto="200")

        capturado = {}

        def fake_pref(self, reserva_id, *, title, monto, success_path):
            capturado["monto"] = monto
            return {
                "preference_id": "x",
                "init_point": "http://mp",
                "sandbox_init_point": None,
            }

        monkeypatch.setattr(PagoService, "_crear_preferencia", fake_pref)

        resultado = svc.crear_preferencia(escenario.reserva.id)
        assert resultado["pagado_con_credito"] is False
        assert capturado["monto"] == Decimal("300")  # seña 500 − crédito 200
        assert resultado["monto_credito"] == 200.0
        assert resultado["monto_a_pagar"] == 300.0


class TestConsumoEnMensualidad:
    def test_reparte_credito_por_clase(self, abono, make_credito, make_reserva, db_session):
        origen = make_reserva(abono.user, abono.turno, date.today() + timedelta(days=60))
        make_credito(abono.user, abono.actividad, origen, monto="1500")

        pagos = svc.registrar_mensualidad(abono.reservas[0].id)
        db_session.commit()

        total = Decimal("1000") * len(pagos)
        consumos = db_session.execute(select(CreditoConsumo)).scalars().all()
        assert sum((c.monto for c in consumos), Decimal("0")) == min(
            Decimal("1500"), total
        )
        # La primera clase (crédito ≥ 1000) queda 100% en crédito.
        primera = next(p for p in pagos if p.reserva_id == abono.reservas[0].id)
        assert primera.metodo == PagoMedio.CREDITO_A_FAVOR

    def test_no_gasta_credito_dos_veces(self, abono, make_credito, make_reserva, db_session):
        origen = make_reserva(abono.user, abono.turno, date.today() + timedelta(days=60))
        credito = make_credito(abono.user, abono.actividad, origen, monto="1000")

        svc.registrar_mensualidad(abono.reservas[0].id)
        db_session.commit()
        saldo_tras_pagar = credito.saldo

        svc.registrar_mensualidad(abono.reservas[0].id)  # doble retorno
        db_session.commit()
        assert credito.saldo == saldo_tras_pagar

    def test_credito_vencido_no_se_consume(self, abono, make_credito, make_reserva, db_session):
        ahora = datetime.now(timezone.utc)
        origen = make_reserva(abono.user, abono.turno, date.today() + timedelta(days=60))
        make_credito(
            abono.user, abono.actividad, origen, monto="1000",
            expira_at=ahora + timedelta(hours=1),
        )

        with freeze_time(ahora + timedelta(days=2)):
            pagos = svc.registrar_mensualidad(abono.reservas[0].id)
            assert all(p.metodo == PagoMedio.MERCADO_PAGO for p in pagos)

        db_session.commit()
        assert db_session.execute(select(CreditoConsumo)).scalars().all() == []


class TestCancelacionRestauraCredito:
    def test_parcial_restaura_y_cierra_solo_efectivo(
        self, abono, make_credito, make_reserva, db_session
    ):
        origen = make_reserva(abono.user, abono.turno, date.today() + timedelta(days=60))
        credito = make_credito(abono.user, abono.actividad, origen, monto="400")

        svc.registrar_mensualidad(abono.reservas[0].id)  # clase 1 (800): 400 crédito + 400 MP
        clase = abono.reservas[0]

        cierre = svc.registrar_cancelacion(clase.id, resolucion=PagoEstado.CREDITO)
        # Solo la parte en dinero (400) forma el cierre y el crédito nuevo.
        assert cierre.monto == Decimal("400")
        # La parte en crédito volvió a su crédito de origen.
        assert credito.saldo == Decimal("400")

    def test_100pct_credito_no_crea_cierre_ni_credito_nuevo(
        self, abono, make_credito, make_reserva, db_session
    ):
        origen = make_reserva(abono.user, abono.turno, date.today() + timedelta(days=60))
        # 800 = una clase con descuento, para que el crédito la cubra 100%.
        credito = make_credito(abono.user, abono.actividad, origen, monto="800")

        svc.registrar_mensualidad(abono.reservas[0].id)  # clase 1 (800): 100% crédito
        clase = abono.reservas[0]

        cierre = svc.registrar_cancelacion(clase.id, resolucion=PagoEstado.CREDITO)
        assert cierre is None

        creditos = db_session.execute(select(Credito)).scalars().all()
        assert len(creditos) == 1  # no se creó uno nuevo
        assert credito.saldo == Decimal("800")  # el original recuperó su saldo
