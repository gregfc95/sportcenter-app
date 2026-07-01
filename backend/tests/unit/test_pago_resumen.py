"""Unit tests del cálculo económico `PagoService.resumen_pago` (en memoria, sin DB).

Construye objetos ORM transitorios (sin sesión) para verificar la regla clave:
el precio queda *bloqueado* en `seña × 2` una vez que existe la seña, y no lo
afectan cambios posteriores del precio de la actividad.
"""

from datetime import date, time
from decimal import Decimal

from app.models.actividad import Actividad
from app.models.pago import Pago, PagoEstado
from app.models.reserva import Reserva
from app.models.turno import DiaSemana, Turno
from app.services.pago_service import PagoService


def _reserva(precio, pagos):
    """Reserva transitoria con su actividad (precio) y lista de pagos en memoria."""
    actividad = Actividad(nombre="Test", precio=Decimal(precio))
    turno = Turno(
        actividad=actividad, dia_semana=DiaSemana.LUNES, hora=time(10, 0), cupo=10
    )
    reserva = Reserva(user_id=1, turno_id=1, fecha=date(2026, 1, 1))
    reserva.turno = turno
    reserva.pagos = pagos
    return reserva


def _pago(estado, monto):
    return Pago(user_id=1, reserva_id=1, monto=Decimal(monto), estado=estado)


svc = PagoService()


def test_sin_pagos_usa_precio_actual():
    r = _reserva("1000.00", [])
    res = svc.resumen_pago(r)
    assert res["total"] == Decimal("1000.00")
    assert res["sena"] == Decimal("500.00")
    assert res["cobrado"] == Decimal("0")
    assert res["saldo"] == Decimal("1000.00")


def test_con_sena_total_es_sena_por_dos():
    r = _reserva("1000.00", [_pago(PagoEstado.SENADO, "500.00")])
    res = svc.resumen_pago(r)
    assert res["total"] == Decimal("1000.00")
    assert res["cobrado"] == Decimal("500.00")
    assert res["saldo"] == Decimal("500.00")


def test_precio_bloqueado_ignora_cambio_posterior_de_precio():
    # Señó cuando el precio era 1000 (seña 500). Aunque la actividad ahora valga
    # 2000, el total sigue siendo 1000 (= seña × 2), no 2000.
    r = _reserva("2000.00", [_pago(PagoEstado.SENADO, "500.00")])
    res = svc.resumen_pago(r)
    assert res["total"] == Decimal("1000")
    assert res["saldo"] == Decimal("500")


def test_sena_mas_saldo_deja_saldo_cero():
    r = _reserva(
        "1000.00",
        [_pago(PagoEstado.SENADO, "500.00"), _pago(PagoEstado.PAGADO, "500.00")],
    )
    res = svc.resumen_pago(r)
    assert res["cobrado"] == Decimal("1000.00")
    assert res["saldo"] == Decimal("0")


def test_saldo_nunca_negativo():
    r = _reserva(
        "1000.00",
        [_pago(PagoEstado.SENADO, "500.00"), _pago(PagoEstado.PAGADO, "700.00")],
    )
    assert svc.resumen_pago(r)["saldo"] == Decimal("0")


def test_reembolsado_no_cuenta_como_cobrado():
    # Sólo SENADO y PAGADO suman a `cobrado`; un REEMBOLSADO no.
    r = _reserva(
        "1000.00",
        [_pago(PagoEstado.SENADO, "500.00"), _pago(PagoEstado.REEMBOLSADO, "500.00")],
    )
    res = svc.resumen_pago(r)
    assert res["cobrado"] == Decimal("500.00")
    assert res["saldo"] == Decimal("500.00")
