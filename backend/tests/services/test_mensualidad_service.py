"""Tests de `MensualidadService`: renovación garantizada, penalizaciones,
suspensión y descuento de fidelidad.

Los jobs (`generar_renovaciones`, `procesar_vencimientos`) reciben `hoy`, así se
prueban con fechas explícitas sin freezegun; las penalizaciones se fechan con
freeze_time para caer en el mes que corresponde.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from freezegun import freeze_time

from app.models.penalizacion import Penalizacion, PenalizacionMotivo
from app.models.reserva import Reserva, ReservaTipo
from app.models.turno import DiaSemana
from app.services.lista_espera_service import ListaEsperaService
from app.services.mensualidad_service import MensualidadService
from app.services.pago_service import PagoService
from app.services.reserva_service import ReservaService

mensual_svc = MensualidadService()
pago_svc = PagoService()
reserva_svc = ReservaService()
lista_svc = ListaEsperaService()


@pytest.fixture(autouse=True)
def _no_email(monkeypatch):
    monkeypatch.setattr(
        "app.services.lista_espera_service.send_lista_espera_email",
        lambda *a, **k: None,
    )


def _penalizar(db_session, user, reserva, cuando, motivo=PenalizacionMotivo.CANCELACION_CLASE):
    """Crea una penalización fechada en `cuando` (para caer en un mes dado)."""
    from app import db

    with freeze_time(cuando):
        db.session.add(
            Penalizacion(user_id=user.id, reserva_id=reserva.id, motivo=motivo)
        )
        db.session.commit()


@pytest.fixture
def abono_pago_julio(make_user, make_actividad, make_turno, db_session):
    """Abono mensual de julio 2026, pagado (candidato a renovación en agosto)."""
    user = make_user()
    actividad = make_actividad(precio="1000.00")
    turno = make_turno(actividad, dia_semana=DiaSemana.LUNES, cupo=10)
    # Se crea con el reloj anclado a comienzos de julio: si no, según la fecha
    # real las clases del abono quedarían en el pasado y `crear_reserva_mensual`
    # las rechazaría.
    with freeze_time("2026-07-01"):
        reservas = reserva_svc.crear_reserva_mensual(user.id, turno.id, date(2026, 7, 6))
        pago_svc.registrar_mensualidad(reservas[0].id)
    return SimpleNamespace(
        user=user, actividad=actividad, turno=turno, grupo_id=reservas[0].grupo_id
    )


class TestGenerarRenovaciones:
    def test_crea_el_abono_del_mes_siguiente(self, abono_pago_julio):
        creadas = mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1))
        assert creadas
        assert all(r.tipo == ReservaTipo.MENSUAL for r in creadas)
        assert all(r.estado_espera is None for r in creadas)
        assert all(
            r.renovacion_de_grupo_id == abono_pago_julio.grupo_id for r in creadas
        )
        assert all(r.fecha.month == 8 for r in creadas)

    def test_es_idempotente(self, abono_pago_julio):
        mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1))
        segunda = mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1))
        assert segunda == []

    def test_no_renueva_abono_impago(
        self, make_user, make_actividad, make_turno
    ):
        user = make_user()
        actividad = make_actividad()
        turno = make_turno(actividad, dia_semana=DiaSemana.LUNES)
        with freeze_time("2026-07-01"):
            reserva_svc.crear_reserva_mensual(user.id, turno.id, date(2026, 7, 6))
        # Sin pago: no es candidato.
        assert mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1)) == []

    def test_no_renueva_usuario_suspendido(self, abono_pago_julio):
        mensual_svc.suspender_usuario(
            abono_pago_julio.user.id, abono_pago_julio.grupo_id
        )
        assert mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1)) == []

    def test_nada_despues_del_11(self, abono_pago_julio):
        assert mensual_svc.generar_renovaciones(hoy=date(2026, 8, 15)) == []


class TestProcesarVencimientos:
    def test_clase_pasada_impaga_penaliza_y_cancela(self, abono_pago_julio):
        mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1))
        # El 10/08 ya pasó el lunes 3/08 impago → +1 penalización y baja.
        mensual_svc.procesar_vencimientos(hoy=date(2026, 8, 10))

        penas = [
            p
            for p in _todas(Penalizacion)
            if p.motivo == PenalizacionMotivo.RENOVACION_IMPAGA
        ]
        assert len(penas) >= 1
        # La clase del 3/08 quedó cancelada (soft-deleted).
        vivas = _renovacion_viva(abono_pago_julio.grupo_id)
        assert all(r.fecha > date(2026, 8, 3) for r in vivas)

    def test_deadline_cancela_resto_y_suspende(self, abono_pago_julio):
        mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1))
        mensual_svc.procesar_vencimientos(hoy=date(2026, 8, 11))

        assert mensual_svc.suspendido(abono_pago_julio.user.id)
        assert _renovacion_viva(abono_pago_julio.grupo_id) == []

    def test_deadline_es_idempotente(self, abono_pago_julio):
        mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1))
        mensual_svc.procesar_vencimientos(hoy=date(2026, 8, 11))
        # Segunda corrida: no crea otra suspensión ni rompe.
        mensual_svc.procesar_vencimientos(hoy=date(2026, 8, 11))
        abiertas = [s for s in _todas_suspensiones() if s.fin_at is None]
        assert len(abiertas) == 1


class TestDescuento:
    def test_usuario_limpio_tiene_descuento(self, make_user):
        user = make_user()
        assert mensual_svc.descuento_mensualidad(
            user.id, hoy=date(2026, 8, 5)
        ) == Decimal("0.20")

    def test_tres_penalizaciones_mes_previo_sin_descuento(
        self, make_user, make_actividad, make_turno, make_reserva, db_session
    ):
        user = make_user()
        actividad = make_actividad()
        turno = make_turno(actividad)
        for i in range(3):
            r = make_reserva(user, turno, date(2026, 7, 6) + timedelta(days=i))
            _penalizar(db_session, user, r, datetime(2026, 7, 15, tzinfo=timezone.utc))
        assert mensual_svc.descuento_mensualidad(
            user.id, hoy=date(2026, 8, 5)
        ) == Decimal("0")

    def test_tres_penalizaciones_mes_corriente_sin_descuento(
        self, make_user, make_actividad, make_turno, make_reserva, db_session
    ):
        user = make_user()
        actividad = make_actividad()
        turno = make_turno(actividad)
        for i in range(3):
            r = make_reserva(user, turno, date(2026, 8, 6) + timedelta(days=i))
            _penalizar(db_session, user, r, datetime(2026, 8, 4, tzinfo=timezone.utc))
        assert mensual_svc.descuento_mensualidad(
            user.id, hoy=date(2026, 8, 5)
        ) == Decimal("0")

    def test_dos_mas_dos_entre_meses_conserva_descuento(
        self, make_user, make_actividad, make_turno, make_reserva, db_session
    ):
        user = make_user()
        actividad = make_actividad()
        turno = make_turno(actividad)
        r1 = make_reserva(user, turno, date(2026, 7, 6))
        r2 = make_reserva(user, turno, date(2026, 7, 13))
        _penalizar(db_session, user, r1, datetime(2026, 7, 10, tzinfo=timezone.utc))
        _penalizar(db_session, user, r2, datetime(2026, 7, 20, tzinfo=timezone.utc))
        r3 = make_reserva(user, turno, date(2026, 8, 3))
        r4 = make_reserva(user, turno, date(2026, 8, 10))
        _penalizar(db_session, user, r3, datetime(2026, 8, 2, tzinfo=timezone.utc))
        _penalizar(db_session, user, r4, datetime(2026, 8, 3, tzinfo=timezone.utc))
        assert mensual_svc.descuento_mensualidad(
            user.id, hoy=date(2026, 8, 5)
        ) == Decimal("0.20")

    def test_suspendido_ahora_sin_descuento(self, make_user):
        user = make_user()
        mensual_svc.suspender_usuario(user.id, "grupo-x")
        assert mensual_svc.descuento_mensualidad(
            user.id, hoy=date(2026, 8, 5)
        ) == Decimal("0")


class TestRecordatorioRenovacion:
    def test_recuerda_renovacion_impaga(self, abono_pago_julio, monkeypatch):
        enviados = []
        monkeypatch.setattr(
            "app.services.mensualidad_service.send_recordatorio_renovacion_email",
            lambda email, **kw: enviados.append((email, kw)),
        )
        mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1))
        mensual_svc.recordar_renovaciones_impagas(hoy=date(2026, 8, 10))

        # Un solo email por grupo aunque la renovación tenga varias clases.
        assert len(enviados) == 1
        email, kwargs = enviados[0]
        assert email == abono_pago_julio.user.email
        assert kwargs["actividad"] == abono_pago_julio.actividad.nombre
        assert kwargs["fecha_limite_label"] == "11/08"

    def test_no_recuerda_renovacion_pagada(self, abono_pago_julio, monkeypatch):
        enviados = []
        monkeypatch.setattr(
            "app.services.mensualidad_service.send_recordatorio_renovacion_email",
            lambda email, **kw: enviados.append(email),
        )
        creadas = mensual_svc.generar_renovaciones(hoy=date(2026, 8, 1))
        pago_svc.registrar_mensualidad(creadas[0].id)
        mensual_svc.recordar_renovaciones_impagas(hoy=date(2026, 8, 10))
        assert enviados == []

    def test_no_recuerda_abono_manual(
        self, make_user, make_actividad, make_turno, monkeypatch
    ):
        enviados = []
        monkeypatch.setattr(
            "app.services.mensualidad_service.send_recordatorio_renovacion_email",
            lambda email, **kw: enviados.append(email),
        )
        user = make_user()
        turno = make_turno(make_actividad(), dia_semana=DiaSemana.LUNES)
        # Abono manual (sin renovacion_de_grupo_id), impago: no es una renovación.
        reserva_svc.crear_reserva_mensual(user.id, turno.id, date(2026, 8, 3))
        mensual_svc.recordar_renovaciones_impagas(hoy=date(2026, 8, 10))
        assert enviados == []


class TestEstadoCliente:
    def test_usuario_limpio(self, make_user):
        user = make_user()
        estado = mensual_svc.estado_cliente(user.id, hoy=date(2026, 8, 5))
        assert estado == {
            "suspendido": False,
            "penalizaciones_mes": 0,
            "penalizaciones_max": 3,
            "tiene_descuento": True,
            "descuento_pct": 20,
        }

    def test_tres_penalizaciones_corriente(
        self, make_user, make_actividad, make_turno, make_reserva, db_session
    ):
        user = make_user()
        turno = make_turno(make_actividad())
        for i in range(3):
            r = make_reserva(user, turno, date(2026, 8, 6) + timedelta(days=i))
            _penalizar(db_session, user, r, datetime(2026, 8, 4, tzinfo=timezone.utc))
        estado = mensual_svc.estado_cliente(user.id, hoy=date(2026, 8, 5))
        assert estado["penalizaciones_mes"] == 3
        assert estado["tiene_descuento"] is False
        assert estado["descuento_pct"] == 0

    def test_suspendido(self, make_user):
        user = make_user()
        mensual_svc.suspender_usuario(user.id, "g1")
        estado = mensual_svc.estado_cliente(user.id, hoy=date(2026, 8, 5))
        assert estado["suspendido"] is True
        assert estado["tiene_descuento"] is False


class TestSuspension:
    def test_idempotente(self, make_user):
        user = make_user()
        s1 = mensual_svc.suspender_usuario(user.id, "g1")
        s2 = mensual_svc.suspender_usuario(user.id, "g2")
        assert s1.id == s2.id

    def test_expulsa_de_la_lista_de_espera(
        self, make_user, make_actividad, make_turno, make_reserva, next_date_for
    ):
        dueno = make_user()
        actividad = make_actividad()
        turno = make_turno(actividad, dia_semana=DiaSemana.LUNES, cupo=1)
        fecha = next_date_for(DiaSemana.LUNES)
        make_reserva(dueno, turno, fecha)  # llena el cupo
        waiter = make_user()
        reserva_svc.unirse_lista_espera(waiter.id, turno.id, fecha)

        mensual_svc.suspender_usuario(waiter.id, "g1")

        # Sus filas en espera quedaron canceladas (soft-deleted): ya no hay
        # ninguna activa para ese usuario.
        from app import db
        from sqlalchemy import select

        activas = db.session.execute(
            select(Reserva).where(Reserva.user_id == waiter.id)
        ).scalars().all()
        assert activas == []
        deleted = db.session.execute(
            select(Reserva)
            .where(Reserva.user_id == waiter.id)
            .execution_options(include_deleted=True)
        ).scalars().all()
        assert deleted and all(r.is_deleted for r in deleted)

    def test_suspendido_puede_seguir_reservando(
        self, make_user, make_actividad, make_turno, next_date_for
    ):
        user = make_user()
        actividad = make_actividad()
        turno = make_turno(actividad, dia_semana=DiaSemana.MARTES, cupo=5)
        mensual_svc.suspender_usuario(user.id, "g1")
        fecha = next_date_for(DiaSemana.MARTES)
        reserva = reserva_svc.crear_reserva(user.id, turno.id, fecha)
        assert reserva.id is not None


# --- Helpers de consulta ----------------------------------------------------


def _todas(modelo):
    from app import db
    from sqlalchemy import select

    return db.session.execute(select(modelo)).scalars().all()


def _todas_suspensiones():
    from app.models.suspension import Suspension

    return _todas(Suspension)


def _renovacion_viva(grupo_origen):
    from app import db
    from sqlalchemy import select

    stmt = select(Reserva).where(Reserva.renovacion_de_grupo_id == grupo_origen)
    return db.session.execute(stmt).scalars().all()
