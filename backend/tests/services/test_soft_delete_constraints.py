"""Verifica los índices únicos parciales (`WHERE deleted_at IS NULL`) en Postgres.

`create_all()` reproduce estos índices sólo en Postgres (el `postgresql_where` se
ignora en otros motores), de ahí la elección de Postgres para los tests: permiten
re-registrar el `nombre` de una actividad dada de baja (soft-delete), pero impiden
dos activas con el mismo nombre.
"""

from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.actividad import Actividad


def test_dos_activas_con_mismo_nombre_falla(make_actividad):
    make_actividad(nombre="Futbol")
    db.session.add(Actividad(nombre="Futbol", precio=Decimal("1000.00")))
    with pytest.raises(IntegrityError):
        db.session.commit()
    db.session.rollback()


def test_nombre_de_actividad_eliminada_es_reutilizable(make_actividad):
    actividad = make_actividad(nombre="Futbol")
    actividad.soft_delete()
    db.session.commit()

    nueva = make_actividad(nombre="Futbol")
    assert nueva.id != actividad.id
