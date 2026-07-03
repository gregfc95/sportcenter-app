from datetime import date, datetime

from flask import Blueprint, Response, jsonify, request

from .. import db
from ..auth import current_user_id, require_role
from ..models.pago import PagoEstado
from ..models.reserva import MotivoCancelacion, Reserva, ReservaTipo
from ..models.user import UserRole
from ..services import PagoService, ReservaService, TurnoService
from ..services.reserva_service import AR_TZ


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


def _reserva_sesion_dict(reserva) -> dict:
    """Reserva serializada para el detalle de una sesión (vista admin/empleado).

    Incluye el precio bloqueado al señar y el saldo restante (ver
    PagoService.resumen_pago) para que el cobro de mostrador no dependa del
    precio actual del turno.
    """
    resumen = pago_service.resumen_pago(reserva)
    return {
        "id": reserva.id,
        "tipo": reserva.tipo.value,
        "estado": _estado_pago(reserva),
        "monto_pagado": float(resumen["cobrado"]),
        "precio": float(resumen["total"]),
        "saldo": float(resumen["saldo"]),
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


@reserva_bp.route("", methods=["GET"])
def list_mis_reservas() -> Response:
    """Reservas del usuario para las cards de Mis Turnos.

    Las eventuales salen una por fila. Las mensuales se colapsan en una entrada
    por abono (una card por mes de un turno) con el detalle de todas sus clases
    —incluidas las pasadas (completadas) y las canceladas (tachadas)— en el
    bloque `mensualidad`. Cada clase lleva su `reserva_id` para poder
    cancelarla individualmente.
    """
    user_id = current_user_id()
    reservas = reserva_service.listar_por_usuario(user_id)
    hoy = datetime.now(tz=AR_TZ).date()

    payload = []
    grupos_vistos = set()
    for reserva in reservas:
        turno = reserva.turno
        actividad = turno.actividad
        disponibles = turno_service.lugares_disponibles(turno, reserva.fecha)

        if reserva.tipo == ReservaTipo.MENSUAL:
            # Una card por abono, identificado por grupo_id. Dos abonos del mismo
            # turno y mes (p. ej. cancelar el final y rereservar) son grupos
            # distintos y salen como cards separadas. El (turno, año, mes) queda
            # solo de fallback para filas viejas sin grupo_id.
            clave = reserva.grupo_id or (
                turno.id,
                reserva.fecha.year,
                reserva.fecha.month,
            )
            if clave in grupos_vistos:
                continue
            grupos_vistos.add(clave)

            # Las canceladas viajan tachadas en `clases`; la plata (total,
            # saldo, id de la card) se calcula solo sobre las vivas. Al agrupar
            # por grupo_id cada fecha aparece una sola vez (rereservar crea otro
            # grupo), así que no hace falta deduplicar.
            grupo = reserva_service.grupo_mensual(reserva, include_canceladas=True)
            vivas = [r for r in grupo if not r.is_deleted]
            resumenes = [pago_service.resumen_pago(r) for r in vivas]
            total_grupo = sum(r["total"] for r in resumenes)
            cobrado_grupo = sum(r["cobrado"] for r in resumenes)
            payload.append(
                {
                    "id": vivas[0].id,
                    # La fecha de la card es la próxima clase (esta iteración
                    # trae la más temprana no pasada, por el orden asc).
                    "fecha": reserva.fecha.isoformat(),
                    "tipo": reserva.tipo.value,
                    "estado": _estado_pago(reserva),
                    "actividad": actividad.nombre,
                    "precio": float(total_grupo),
                    "sena": 0.0,
                    "saldo": float(max(total_grupo - cobrado_grupo, 0)),
                    "mensualidad": {
                        "clases": [
                            {
                                "reserva_id": r.id,
                                "fecha": r.fecha.isoformat(),
                                "pasada": r.fecha < hoy,
                                "cancelada": r.is_deleted,
                            }
                            for r in grupo
                        ],
                        "total": float(total_grupo),
                    },
                    "turno": {
                        "id": turno.id,
                        "dia_semana": turno.dia_semana.value,
                        "hora": turno.hora.strftime("%H:%M"),
                        "cupo": turno.cupo,
                        "ocupados": turno.cupo - disponibles,
                    },
                }
            )
            continue

        # Precio bloqueado al momento de la seña (ver PagoService.resumen_pago):
        # un cambio posterior del precio no altera lo que el cliente debe.
        resumen = pago_service.resumen_pago(reserva)
        payload.append(
            {
                "id": reserva.id,
                "fecha": reserva.fecha.isoformat(),
                "tipo": reserva.tipo.value,
                "estado": _estado_pago(reserva),
                "actividad": actividad.nombre,
                "precio": float(resumen["total"]),
                "sena": float(resumen["sena"]),
                "saldo": float(resumen["saldo"]),
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
        "reservas": [_reserva_sesion_dict(reserva) for reserva in reservas],
    }

    return jsonify(payload), 200


@reserva_bp.route("/<int:reserva_id>/cancelar", methods=["POST"])
def cancelar_mi_reserva(reserva_id: int) -> Response:
    """Cancela (soft-delete) una reserva del usuario actual.

    No interactúa con Mercado Pago: registra el cierre en el historial de pagos
    y da de baja la reserva.

    Eventual: con más de 24 h de anticipación la cancelación es reembolsable
    (se devuelve lo abonado) y queda como REEMBOLSADO; dentro de las 24 h no
    hay reembolso y queda como CANCELADO.

    Mensual (una clase del abono): con más de 48 h el cliente elige la
    `resolucion` en el body — "reembolso" (default) o "credito" (crédito a
    favor para esa actividad; por ahora solo se asienta, el canje llega
    después). Dentro de las 48 h se retiene lo abonado (CANCELADO).
    """
    user_id = current_user_id()
    data = request.get_json(silent=True) or {}

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403

    con_beneficio = reserva_service.es_reembolsable(reserva)

    if not con_beneficio:
        resolucion = PagoEstado.CANCELADO
        motivo = None  # el servicio deduce CANCELADO por la anticipación
    elif reserva.tipo == ReservaTipo.MENSUAL and data.get("resolucion") == "credito":
        resolucion = PagoEstado.CREDITO
        motivo = MotivoCancelacion.CREDITO
    else:
        resolucion = PagoEstado.REEMBOLSADO
        motivo = None  # el servicio deduce REEMBOLSADO por la anticipación

    try:
        registro = pago_service.registrar_cancelacion(
            reserva_id, resolucion=resolucion
        )
        reserva_service.cancelar_reserva(reserva_id, motivo=motivo)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return (
        jsonify(
            {
                "ok": True,
                "reembolsado": resolucion == PagoEstado.REEMBOLSADO,
                "resolucion": resolucion.value,
                "monto": float(registro.monto) if registro is not None else None,
            }
        ),
        200,
    )
