"""Tests de `CreditoService` contra la base de datos de tests.

Cubren la vigencia (saldo y vencimiento), el consumo divisible con orden por
vencimiento y la restauración idempotente. El vencimiento se deriva en lectura
(no hay job), así que la frontera de expiración se prueba con `freezegun`.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from freezegun import freeze_time
from sqlalchemy import select

from app.models.credito import CreditoConsumo
from app.models.pago import PagoEstado
from app.services.credito_service import CreditoService

svc = CreditoService()


@pytest.fixture
def ctx(make_user, make_actividad, make_turno, make_reserva):
    """Usuario + actividad + fábrica de reservas nuevas (para orígenes de crédito)."""
    user = make_user()
    actividad = make_actividad(precio="1000.00")
    turno = make_turno(actividad)
    counter = {"n": 0}

    def nueva_reserva():
        counter["n"] += 1
        return make_reserva(user, turno, date.today() + timedelta(days=counter["n"]))

    return SimpleNamespace(
        user=user, actividad=actividad, turno=turno, nueva_reserva=nueva_reserva
    )


class TestVigentes:
    def test_excluye_vencidos_y_sin_saldo(self, ctx, make_credito):
        ahora = datetime.now(timezone.utc)
        activo = make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="500")
        make_credito(
            ctx.user,
            ctx.actividad,
            ctx.nueva_reserva(),
            monto="500",
            expira_at=ahora - timedelta(days=1),
        )
        make_credito(
            ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="500", saldo="0"
        )

        vigentes = svc.vigentes(ctx.user.id, ctx.actividad.id)
        assert [c.id for c in vigentes] == [activo.id]
        assert svc.saldo_disponible(ctx.user.id, ctx.actividad.id) == Decimal("500")

    def test_orden_por_vencimiento_ascendente(self, ctx, make_credito):
        ahora = datetime.now(timezone.utc)
        tarde = make_credito(
            ctx.user, ctx.actividad, ctx.nueva_reserva(), expira_at=ahora + timedelta(days=20)
        )
        pronto = make_credito(
            ctx.user, ctx.actividad, ctx.nueva_reserva(), expira_at=ahora + timedelta(days=2)
        )
        medio = make_credito(
            ctx.user, ctx.actividad, ctx.nueva_reserva(), expira_at=ahora + timedelta(days=10)
        )

        vigentes = svc.vigentes(ctx.user.id, ctx.actividad.id)
        assert [c.id for c in vigentes] == [pronto.id, medio.id, tarde.id]

    def test_otra_actividad_no_suma(self, ctx, make_credito, make_actividad):
        make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="500")
        otra = make_actividad()
        assert svc.saldo_disponible(ctx.user.id, otra.id) == Decimal("0")


class TestExpiracion:
    def test_frontera_exacta_no_es_vigente(self, ctx, make_credito):
        t = datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)
        credito = make_credito(
            ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="500", expira_at=t
        )

        with freeze_time(t):
            assert not credito.vigente
            assert credito.vencido
            assert svc.saldo_disponible(ctx.user.id, ctx.actividad.id) == Decimal("0")

        with freeze_time(t - timedelta(seconds=1)):
            assert credito.vigente
            assert svc.saldo_disponible(ctx.user.id, ctx.actividad.id) == Decimal("500")


class TestConsumir:
    def test_parcial_deja_remanente(self, ctx, make_credito, make_pago):
        credito = make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="1000")
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "400", PagoEstado.PAGADO)

        consumido = svc.consumir(pago, ctx.actividad.id)
        assert consumido == Decimal("400")
        assert credito.saldo == Decimal("600")

    def test_abarca_varios_el_que_vence_primero(self, ctx, make_credito, make_pago):
        ahora = datetime.now(timezone.utc)
        tarde = make_credito(
            ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="300",
            expira_at=ahora + timedelta(days=20),
        )
        pronto = make_credito(
            ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="300",
            expira_at=ahora + timedelta(days=5),
        )
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "500", PagoEstado.PAGADO)

        consumido = svc.consumir(pago, ctx.actividad.id)
        assert consumido == Decimal("500")
        assert pronto.saldo == Decimal("0")
        assert tarde.saldo == Decimal("100")

    def test_clampa_a_disponible(self, ctx, make_credito, make_pago):
        credito = make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="200")
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "500", PagoEstado.PAGADO)

        consumido = svc.consumir(pago, ctx.actividad.id)
        assert consumido == Decimal("200")
        assert credito.saldo == Decimal("0")

    def test_asienta_un_consumo_por_credito(self, ctx, make_credito, make_pago, db_session):
        make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="1000")
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "400", PagoEstado.PAGADO)

        svc.consumir(pago, ctx.actividad.id)
        db_session.commit()

        consumos = db_session.execute(
            select(CreditoConsumo).where(CreditoConsumo.pago_id == pago.id)
        ).scalars().all()
        assert len(consumos) == 1
        assert consumos[0].monto == Decimal("400")

    def test_otra_actividad_no_consume(self, ctx, make_credito, make_pago, make_actividad):
        credito = make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="1000")
        otra = make_actividad()
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "500", PagoEstado.PAGADO)

        assert svc.consumir(pago, otra.id) == Decimal("0")
        assert credito.saldo == Decimal("1000")


class TestRestaurarConsumos:
    def test_devuelve_saldo_a_origen(self, ctx, make_credito, make_pago, db_session):
        credito = make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="1000")
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "400", PagoEstado.PAGADO)
        svc.consumir(pago, ctx.actividad.id)
        db_session.commit()

        restaurado = svc.restaurar_consumos([pago])
        db_session.commit()
        assert restaurado == Decimal("400")
        assert credito.saldo == Decimal("1000")

    def test_idempotente(self, ctx, make_credito, make_pago, db_session):
        credito = make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="1000")
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "400", PagoEstado.PAGADO)
        svc.consumir(pago, ctx.actividad.id)
        db_session.commit()

        svc.restaurar_consumos([pago])
        db_session.commit()
        segundo = svc.restaurar_consumos([pago])
        db_session.commit()

        assert segundo == Decimal("0")
        assert credito.saldo == Decimal("1000")

    def test_credito_vencido_recibe_saldo_pero_sigue_vencido(
        self, ctx, make_credito, make_pago, db_session
    ):
        ahora = datetime.now(timezone.utc)
        credito = make_credito(
            ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="1000",
            expira_at=ahora + timedelta(days=1),
        )
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "400", PagoEstado.PAGADO)
        svc.consumir(pago, ctx.actividad.id)
        db_session.commit()

        # El crédito vence entre el consumo y la restauración.
        credito.expira_at = ahora - timedelta(days=1)
        db_session.commit()

        svc.restaurar_consumos([pago])
        db_session.commit()
        assert credito.saldo == Decimal("1000")
        assert credito.vencido


class TestTotalConsumido:
    def test_suma_restaurados_y_no_restaurados(self, ctx, make_credito, make_pago, db_session):
        make_credito(ctx.user, ctx.actividad, ctx.nueva_reserva(), monto="1000")
        pago = make_pago(ctx.user, ctx.nueva_reserva(), "400", PagoEstado.PAGADO)
        svc.consumir(pago, ctx.actividad.id)
        db_session.commit()

        # Aún tras restaurar, el total consumido histórico no cambia.
        svc.restaurar_consumos([pago])
        db_session.commit()
        assert svc.total_consumido([pago]) == Decimal("400")
