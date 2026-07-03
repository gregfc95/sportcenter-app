"""Configuración compartida de los tests del backend.

Levanta la app real con `TestingConfig` contra una base PostgreSQL aparte
(reutiliza el factory y el `db` de la app, no reimplementa modelos). El esquema
se crea una vez por sesión con `create_all` —en Postgres reproduce los índices
únicos parciales `WHERE deleted_at IS NULL`— y cada test queda aislado vaciando
las tablas con TRUNCATE ... RESTART IDENTITY al terminar.

Mercado Pago y el envío de email nunca se tocan: los servicios bajo prueba no
los invocan o se prueban sólo sus validaciones previas.
"""

from datetime import date, time, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


# --- Infraestructura de base de datos ---------------------------------------


@pytest.fixture(scope="session")
def ensure_test_db():
    """Crea la base de tests si no existe (Postgres no tiene CREATE DATABASE IF NOT EXISTS)."""
    from app.config import TestingConfig

    url = make_url(TestingConfig.SQLALCHEMY_DATABASE_URI)
    db_name = url.database
    maintenance = create_engine(
        url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    with maintenance.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": db_name}
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))
    maintenance.dispose()
    return url


@pytest.fixture(scope="session")
def app(ensure_test_db):
    from app import create_app
    from app.config import TestingConfig

    application = create_app(TestingConfig)
    with application.app_context():
        yield application


@pytest.fixture(scope="session")
def _schema(app):
    """Crea el esquema una vez por sesión y lo deja limpio al final.

    No es autouse: sólo se monta cuando un test pide `db_session` (o una
    factory), así los tests puramente unitarios corren sin Postgres.
    """
    from app import db

    db.drop_all()
    db.create_all()
    yield
    db.session.remove()
    db.drop_all()


@pytest.fixture
def db_session(_schema):
    """Sesión limpia por test: vacía todas las tablas al terminar.

    TRUNCATE ... RESTART IDENTITY CASCADE resetea también las secuencias, así
    los IDs son predecibles entre tests. El filtro global de soft-delete sólo
    afecta SELECTs, de modo que el TRUNCATE borra físicamente todo.
    """
    from app import db

    yield db.session

    db.session.rollback()
    db.session.remove()
    tables = ", ".join(f'"{t.name}"' for t in db.metadata.sorted_tables)
    if tables:
        db.session.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
        db.session.commit()
    db.session.remove()


# --- Factories ---------------------------------------------------------------


@pytest.fixture
def make_user(db_session):
    from app import db
    from app.models.user import User, UserRole
    from werkzeug.security import generate_password_hash

    counter = {"n": 0}

    def _make(role=UserRole.CLIENT, email=None, dni=None, password="Passw0rd!", **kw):
        counter["n"] += 1
        i = counter["n"]
        user = User(
            first_name=kw.pop("first_name", "Test"),
            last_name=kw.pop("last_name", "User"),
            dni=dni if dni is not None else f"{10_000_000 + i}",
            email=email if email is not None else f"user{i}@test.com",
            phone=kw.pop("phone", "1122334455"),
            birth_date=kw.pop("birth_date", date(1990, 1, 1)),
            password_hash=generate_password_hash(password),
            role=role,
            **kw,
        )
        db.session.add(user)
        db.session.commit()
        return user

    return _make


@pytest.fixture
def make_actividad(db_session):
    from app import db
    from app.models.actividad import Actividad

    counter = {"n": 0}

    def _make(nombre=None, precio=Decimal("1000.00")):
        counter["n"] += 1
        actividad = Actividad(
            nombre=nombre if nombre is not None else f"Actividad {counter['n']}",
            precio=Decimal(precio),
        )
        db.session.add(actividad)
        db.session.commit()
        return actividad

    return _make


@pytest.fixture
def make_turno(db_session):
    from app import db
    from app.models.turno import DiaSemana, Turno

    def _make(actividad, dia_semana=DiaSemana.LUNES, hora=time(10, 0), cupo=10):
        turno = Turno(
            actividad_id=actividad.id,
            dia_semana=dia_semana,
            hora=hora,
            cupo=cupo,
        )
        db.session.add(turno)
        db.session.commit()
        return turno

    return _make


@pytest.fixture
def make_reserva(db_session):
    from app import db
    from app.models.reserva import Reserva, ReservaTipo

    def _make(user, turno, fecha, tipo=ReservaTipo.EVENTUAL):
        reserva = Reserva(
            user_id=user.id, turno_id=turno.id, fecha=fecha, tipo=tipo
        )
        db.session.add(reserva)
        db.session.commit()
        return reserva

    return _make


@pytest.fixture
def make_pago(db_session):
    from app import db
    from app.models.pago import Pago, PagoEstado, PagoMedio

    def _make(user, reserva, monto, estado, metodo=PagoMedio.MERCADO_PAGO, registrado_por=None):
        pago = Pago(
            user_id=user.id,
            reserva_id=reserva.id,
            monto=Decimal(monto),
            estado=estado,
            metodo=metodo,
            registrado_por_id=registrado_por.id if registrado_por else None,
        )
        db.session.add(pago)
        db.session.commit()
        return pago

    return _make


@pytest.fixture
def make_credito(db_session):
    from datetime import datetime, timezone

    from app import db
    from app.models.credito import Credito

    def _make(
        user, actividad, reserva, monto="1000.00", saldo=None, expira_at=None, dias=30
    ):
        monto = Decimal(monto)
        credito = Credito(
            user_id=user.id,
            actividad_id=actividad.id,
            reserva_id=reserva.id,
            monto_inicial=monto,
            saldo=Decimal(saldo) if saldo is not None else monto,
            expira_at=expira_at
            or (datetime.now(timezone.utc) + timedelta(days=dias)),
        )
        db.session.add(credito)
        db.session.commit()
        return credito

    return _make


# --- Helpers de fechas -------------------------------------------------------


@pytest.fixture
def next_date_for():
    """Devuelve una fecha futura cuyo día de la semana coincide con `dia_semana`.

    `crear_reserva` exige que el weekday de la fecha coincida con el del turno y
    que el turno no haya pasado; por defecto la fecha cae al menos 7 días
    adelante para que ninguna hora del día quede en el pasado.
    """
    from app.services.reserva_service import WEEKDAY_TO_DIA_SEMANA

    dia_to_weekday = {dia: wd for wd, dia in WEEKDAY_TO_DIA_SEMANA.items()}

    def _next(dia_semana, min_days=7):
        target = dia_to_weekday[dia_semana]
        d = date.today() + timedelta(days=min_days)
        while d.weekday() != target:
            d += timedelta(days=1)
        return d

    return _next


@pytest.fixture
def past_date_for():
    """Devuelve una fecha pasada cuyo día de la semana coincide con `dia_semana`."""
    from app.services.reserva_service import WEEKDAY_TO_DIA_SEMANA

    dia_to_weekday = {dia: wd for wd, dia in WEEKDAY_TO_DIA_SEMANA.items()}

    def _past(dia_semana, min_days=7):
        target = dia_to_weekday[dia_semana]
        d = date.today() - timedelta(days=min_days)
        while d.weekday() != target:
            d -= timedelta(days=1)
        return d

    return _past
