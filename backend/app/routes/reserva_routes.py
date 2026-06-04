from datetime import date
from decimal import Decimal

from flask import Blueprint, Response, jsonify

from .. import db
from ..auth import current_user_id, require_role
from ..models.pago import PagoEstado
from ..models.reserva import Reserva
from ..models.user import UserRole
from ..services import PagoService, ReservaService, TurnoService


reserva_bp = Blueprint("reservas", __name__, url_prefix="/api/reservas")

reserva_service = ReservaService()
turno_service = TurnoService()
pago_service = PagoService()


def _estado_pago(reserva) -> str:
    """Estado a mostrar en la card: pagado > senado > pendiente.

    Una reserva sin pago (o solo con pagos cancelados/reembolsados) se considera
    pendiente de pago.
    """
    estados = {p.estado for p in reserva.pagos}
    if PagoEstado.PAGADO in estados:
        return "pagado"
    if PagoEstado.SENADO in estados:
        return "senado"
    return "pendiente"


_ESTADOS_COBRADOS = {PagoEstado.SENADO, PagoEstado.PAGADO}


def _monto_cobrado(reserva) -> float:
    """Total efectivamente cobrado de la reserva (seña y/o saldo)."""
    total = sum(
        (p.monto for p in reserva.pagos if p.estado in _ESTADOS_COBRADOS),
        Decimal("0"),
    )
    return float(total)


@reserva_bp.route("", methods=["GET"])
def list_mis_reservas() -> Response:
    user_id = current_user_id()
    reservas = reserva_service.listar_por_usuario(user_id)

    payload = []
    for reserva in reservas:
        turno = reserva.turno
        actividad = turno.actividad
        disponibles = turno_service.lugares_disponibles(turno, reserva.fecha)
        precio = float(actividad.precio)
        payload.append(
            {
                "id": reserva.id,
                "fecha": reserva.fecha.isoformat(),
                "tipo": reserva.tipo.value,
                "estado": _estado_pago(reserva),
                "actividad": actividad.nombre,
                "precio": precio,
                "sena": precio / 2,
                "turno": {
                    "id": turno.id,
                    "dia_semana": turno.dia_semana.value,
                    "hora": turno.hora.strftime("%H:%M"),
                    "cupo": turno.cupo,
                    "ocupados": turno.cupo - disponibles,
                },
            }
        )

    return jsonify(payload), 200


@reserva_bp.route("/sesiones", methods=["GET"])
def list_sesiones_reservadas() -> Response:
    """Sesiones con reservas para la vista de Turnos Reservados (admin/empleado).

    Cada item es un turno en una fecha concreta con al menos una reserva activa:
    actividad, día/hora, fecha y ocupación (ocupados/cupo), más el conteo de
    reservas de la sesión. Sólo accesible para administradores y empleados.
    """
    require_role(UserRole.ADMIN, UserRole.EMPLOYEE)
    sesiones = reserva_service.listar_sesiones_reservadas()

    payload = []
    for turno, fecha in sesiones:
        actividad = turno.actividad
        disponibles = turno_service.lugares_disponibles(turno, fecha)
        reservas_sesion = sum(1 for r in turno.reservas if r.fecha == fecha)
        payload.append(
            {
                "turno_id": turno.id,
                "fecha": fecha.isoformat(),
                "actividad": actividad.nombre,
                "dia_semana": turno.dia_semana.value,
                "hora": turno.hora.strftime("%H:%M"),
                "cupo": turno.cupo,
                "ocupados": turno.cupo - disponibles,
                "reservas": reservas_sesion,
            }
        )

    return jsonify(payload), 200


@reserva_bp.route("/sesiones/<int:turno_id>/<fecha>", methods=["GET"])
def get_sesion_reservada(turno_id: int, fecha: str) -> Response:
    """Detalle de una sesión: las reservas de ese turno y fecha con su cliente.

    Para que admin/empleado abran una card y vean quiénes reservaron el turno en esa
    fecha, el tipo de reserva, el estado de pago y cuánto pagaron. Sólo admin/empleado.
    """
    require_role(UserRole.ADMIN, UserRole.EMPLOYEE)

    try:
        fecha_obj = date.fromisoformat(fecha)
    except ValueError:
        return jsonify({"error": "fecha debe tener formato YYYY-MM-DD"}), 400

    turno = turno_service.obtener_por_id(turno_id)
    if turno is None:
        return jsonify({"error": "Turno no encontrado"}), 404

    actividad = turno.actividad
    reservas = reserva_service.listar_por_turno_fecha(turno_id, fecha_obj)
    disponibles = turno_service.lugares_disponibles(turno, fecha_obj)

    payload = {
        "turno": {
            "id": turno.id,
            "actividad": actividad.nombre,
            "dia_semana": turno.dia_semana.value,
            "hora": turno.hora.strftime("%H:%M"),
            "fecha": fecha_obj.isoformat(),
            "cupo": turno.cupo,
            "ocupados": turno.cupo - disponibles,
            "precio": float(actividad.precio),
        },
        "reservas": [
            {
                "id": reserva.id,
                "tipo": reserva.tipo.value,
                "estado": _estado_pago(reserva),
                "monto_pagado": _monto_cobrado(reserva),
                "cliente": (
                    {
                        "id": reserva.user.id,
                        "nombre": reserva.user.first_name,
                        "apellido": reserva.user.last_name,
                        "email": reserva.user.email,
                    }
                    if reserva.user
                    else None
                ),
            }
            for reserva in reservas
        ],
    }

    return jsonify(payload), 200


@reserva_bp.route("/<int:reserva_id>/cancelar", methods=["POST"])
def cancelar_mi_reserva(reserva_id: int) -> Response:
    """Cancela (soft-delete) una reserva del usuario actual.

    No interactúa con Mercado Pago: registra el cierre en el historial de pagos
    y da de baja la reserva. Con más de 24 h de anticipación la cancelación es
    reembolsable (se devuelve lo abonado: la seña o el precio completo) y queda
    como REEMBOLSADO; dentro de las 24 h no hay reembolso y queda como CANCELADO.
    """
    user_id = current_user_id()

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403

    reembolsar = reserva_service.es_reembolsable(reserva)
    try:
        registro = pago_service.registrar_cancelacion(reserva_id, reembolsar=reembolsar)
        reserva_service.cancelar_reserva(reserva_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return (
        jsonify(
            {
                "ok": True,
                "reembolsado": reembolsar,
                "monto": float(registro.monto) if registro is not None else None,
            }
        ),
        200,
    )
