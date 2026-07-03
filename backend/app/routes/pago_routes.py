from datetime import date

from flask import Blueprint, Response, jsonify, request

from .. import db
from ..auth import current_user_id, require_role
from ..models.reserva import MotivoCancelacion, Reserva, ReservaTipo
from ..models.user import UserRole
from ..services import PagoService, ReservaService


pago_bp = Blueprint("pagos", __name__, url_prefix="/api/pagos")

reserva_service = ReservaService()
pago_service = PagoService()


def _registrado_por(pago) -> dict | None:
    """Empleado/admin que cargó el pago manualmente (None si fue automático)."""
    user = pago.registrado_por
    if user is None:
        return None
    return {
        "id": user.id,
        "nombre": f"{user.first_name} {user.last_name}".strip(),
    }


@pago_bp.route("", methods=["GET"])
def list_mis_pagos() -> Response:
    """Historial de pagos del usuario actual para la tabla de Mis Pagos.

    Cada fila es una transacción inmutable: el comprobante (id del pago), cuándo
    se pagó, la actividad y el turno al que apunta (fecha + hora, lo que
    distingue dos pagos a la misma actividad), el monto cobrado y el estado.
    """
    user_id = current_user_id()
    pagos = pago_service.listar_por_usuario(user_id)

    payload = []
    for pago in pagos:
        reserva = pago.reserva
        turno = reserva.turno if reserva else None
        actividad = turno.actividad if turno else None
        payload.append(
            {
                "id": pago.id,
                "fecha_pago": pago.created_at.isoformat() if pago.created_at else None,
                "monto": float(pago.monto) if pago.monto is not None else None,
                "estado": pago.estado.value if pago.estado else None,
                "metodo": pago.metodo.value if pago.metodo else None,
                "registrado_por": _registrado_por(pago),
                "reserva_id": pago.reserva_id,
                "actividad": actividad.nombre if actividad else None,
                "turno": (
                    {
                        "fecha": reserva.fecha.isoformat() if reserva and reserva.fecha else None,
                        "hora": turno.hora.strftime("%H:%M"),
                        "dia_semana": turno.dia_semana.value,
                    }
                    if turno
                    else None
                ),
            }
        )

    return jsonify(payload), 200


@pago_bp.route("/admin", methods=["GET"])
def list_todos_pagos() -> Response:
    """Historial de pagos de todos los usuarios para la vista de administración.

    Misma estructura que `list_mis_pagos`, pero sin filtrar por usuario y con un
    campo `cliente` (nombre + email) para que el administrador vea a quién
    pertenece cada transacción. Sólo accesible para administradores.
    """
    require_role(UserRole.ADMIN)
    pagos = pago_service.listar_todos()

    payload = []
    for pago in pagos:
        reserva = pago.reserva
        turno = reserva.turno if reserva else None
        actividad = turno.actividad if turno else None
        user = pago.user
        payload.append(
            {
                "id": pago.id,
                "fecha_pago": pago.created_at.isoformat() if pago.created_at else None,
                "monto": float(pago.monto) if pago.monto is not None else None,
                "estado": pago.estado.value if pago.estado else None,
                "metodo": pago.metodo.value if pago.metodo else None,
                "registrado_por": _registrado_por(pago),
                "reserva_id": pago.reserva_id,
                "cliente": (
                    {
                        "id": user.id,
                        "nombre": f"{user.first_name} {user.last_name}".strip(),
                        "email": user.email,
                    }
                    if user
                    else None
                ),
                "actividad": actividad.nombre if actividad else None,
                "turno": (
                    {
                        "fecha": reserva.fecha.isoformat() if reserva and reserva.fecha else None,
                        "hora": turno.hora.strftime("%H:%M"),
                        "dia_semana": turno.dia_semana.value,
                    }
                    if turno
                    else None
                ),
            }
        )

    return jsonify(payload), 200


@pago_bp.route("/registrar", methods=["POST"])
def registrar_pago() -> Response:
    """Registra manualmente (en efectivo) el pago de una reserva.

    Acción de mostrador para admin/empleado: asienta el saldo restante como
    PAGADO con medio EFECTIVO y guarda quién lo registró. Devuelve el pago creado.
    """
    staff = require_role(UserRole.ADMIN, UserRole.EMPLOYEE)
    data = request.get_json() or {}

    reserva_id = data.get("reserva_id")
    if not isinstance(reserva_id, int):
        return jsonify({"error": "reserva_id es requerido y debe ser un entero."}), 400

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404

    try:
        pago = pago_service.registrar_pago_manual(reserva_id, staff.id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(pago.to_dict()), 201


@pago_bp.route("/checkout", methods=["POST"])
def checkout() -> Response:
    """Crea la reserva del turno elegido y devuelve el link de Checkout Pro.

    Recibe el turno y la fecha seleccionados en el frontend, da de alta la
    reserva del usuario actual y genera la preferencia de Mercado Pago para la
    seña. El front redirige al `init_point` devuelto.
    """
    user_id = current_user_id()
    data = request.get_json() or {}

    turno_id = data.get("turno_id")
    if not isinstance(turno_id, int):
        return jsonify({"error": "turno_id es requerido y debe ser un entero."}), 400

    fecha_raw = data.get("fecha")
    try:
        fecha = date.fromisoformat(fecha_raw)
    except (TypeError, ValueError):
        return jsonify({"error": "fecha es requerida con formato YYYY-MM-DD."}), 400

    tipo_raw = data.get("tipo", ReservaTipo.EVENTUAL.value)
    try:
        tipo = ReservaTipo(tipo_raw)
    except ValueError:
        return jsonify({"error": "tipo de reserva inválido."}), 400

    if tipo == ReservaTipo.MENSUAL:
        try:
            reservas = reserva_service.crear_reserva_mensual(user_id, turno_id, fecha)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        try:
            pref = pago_service.crear_preferencia_mensualidad(reservas[0].id)
        except (ValueError, RuntimeError) as e:
            # Sin link de pago no debe quedar un abono pendiente ocupando el
            # cupo de todo el mes: se da de baja el grupo recién creado.
            for r in reservas:
                r.soft_delete()
            db.session.commit()
            return jsonify({"error": str(e)}), 502

        return jsonify({"tipo": ReservaTipo.MENSUAL.value, **pref}), 201

    try:
        reserva = reserva_service.crear_reserva(user_id, turno_id, fecha, tipo)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        pref = pago_service.crear_preferencia(reserva.id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"reserva_id": reserva.id, **pref}), 201


@pago_bp.route("/mensualidad/checkout", methods=["POST"])
def checkout_mensualidad() -> Response:
    """Genera el link de Checkout Pro para pagar un abono mensual pendiente.

    A diferencia de `/checkout`, no crea reservas: reanuda el pago de un abono
    que quedó pendiente (sin pago) desde Mis Turnos. Acepta cualquier reserva
    del grupo; el link cubre el total de las clases del mes.
    """
    user_id = current_user_id()
    data = request.get_json() or {}

    reserva_id = data.get("reserva_id")
    if not isinstance(reserva_id, int):
        return jsonify({"error": "reserva_id es requerido y debe ser un entero."}), 400

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403
    if reserva.tipo != ReservaTipo.MENSUAL:
        return jsonify({"error": "La reserva no es de un abono mensual."}), 400

    grupo = reserva_service.grupo_mensual(reserva)
    if any(pago_service.tiene_pago(r.id) for r in grupo):
        return jsonify({"error": "La mensualidad ya tiene un pago registrado."}), 409

    try:
        pref = pago_service.crear_preferencia_mensualidad(reserva_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(pref), 201


@pago_bp.route("/mensualidad", methods=["POST"])
def registrar_mensualidad() -> Response:
    """Registra el pago completo del abono al volver con éxito de Mercado Pago.

    Idempotente: las clases que ya tienen pago se devuelven sin duplicar.
    Responde el total cobrado para el toast de confirmación.
    """
    user_id = current_user_id()
    data = request.get_json() or {}

    reserva_id = data.get("reserva_id")
    if not isinstance(reserva_id, int):
        return jsonify({"error": "reserva_id es requerido y debe ser un entero."}), 400

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403

    try:
        pagos = pago_service.registrar_mensualidad(reserva_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    monto_total = sum((p.monto for p in pagos), start=0)
    return (
        jsonify(
            {
                "reserva_id": reserva_id,
                "monto_total": float(monto_total),
                "pagos": [p.to_dict() for p in pagos],
            }
        ),
        200,
    )


@pago_bp.route("/sena/checkout", methods=["POST"])
def checkout_sena() -> Response:
    """Genera el link de Checkout Pro para señar una reserva ya existente.

    A diferencia de `/checkout`, no crea una reserva: reanuda el pago de una
    reserva pendiente (sin pago) que quedó así porque no volvió la respuesta de
    Mercado Pago (el usuario cerró la ventana sin completar la seña). Devuelve el
    `init_point` para reintentar el pago de la seña.
    """
    user_id = current_user_id()
    data = request.get_json() or {}

    reserva_id = data.get("reserva_id")
    if not isinstance(reserva_id, int):
        return jsonify({"error": "reserva_id es requerido y debe ser un entero."}), 400

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403
    if pago_service.tiene_pago(reserva_id):
        # Ya tiene seña/pago: no corresponde el checkout de seña.
        return jsonify({"error": "La reserva ya tiene un pago registrado."}), 409

    try:
        pref = pago_service.crear_preferencia(reserva_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"reserva_id": reserva_id, **pref}), 201


@pago_bp.route("/saldo/checkout", methods=["POST"])
def checkout_saldo() -> Response:
    """Genera el link de Checkout Pro para abonar el saldo de una reserva señada.

    A diferencia de `/checkout`, no crea una reserva: la reserva ya existe y
    tiene la seña registrada. Devuelve el `init_point` para redirigir al pago del
    saldo restante.
    """
    user_id = current_user_id()
    data = request.get_json() or {}

    reserva_id = data.get("reserva_id")
    if not isinstance(reserva_id, int):
        return jsonify({"error": "reserva_id es requerido y debe ser un entero."}), 400

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403

    try:
        pref = pago_service.crear_preferencia_saldo(reserva_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify({"reserva_id": reserva_id, **pref}), 201


@pago_bp.route("/completar", methods=["POST"])
def completar() -> Response:
    """Registra el pago del saldo al volver con éxito de Mercado Pago.

    Idempotente: si el saldo ya estaba registrado devuelve ese pago. Crea un
    segundo Pago (estado PAGADO) por el saldo restante.
    """
    user_id = current_user_id()
    data = request.get_json() or {}

    reserva_id = data.get("reserva_id")
    if not isinstance(reserva_id, int):
        return jsonify({"error": "reserva_id es requerido y debe ser un entero."}), 400

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403

    try:
        pago = pago_service.completar_pago(reserva_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    return jsonify(pago.to_dict()), 200


@pago_bp.route("/sena", methods=["POST"])
def registrar_sena() -> Response:
    """Registra la seña de una reserva al volver con éxito de Mercado Pago.

    Idempotente: si el pago ya existe lo devuelve. Hasta tener el webhook, este
    es el momento en que marcamos la reserva como señada.
    """
    user_id = current_user_id()
    data = request.get_json() or {}

    reserva_id = data.get("reserva_id")
    if not isinstance(reserva_id, int):
        return jsonify({"error": "reserva_id es requerido y debe ser un entero."}), 400

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        return jsonify({"error": "La reserva indicada no existe."}), 404
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403

    pago = pago_service.registrar_sena_si_falta(reserva_id)
    return jsonify(pago.to_dict()), 200


@pago_bp.route("/cancelar", methods=["POST"])
def cancelar_checkout() -> Response:
    """Cancela (soft-delete) una reserva cuyo pago no se concretó.

    Se llama al volver con error/cancelación de Mercado Pago. Idempotente y
    seguro: no cancela si la reserva ya tiene un pago (seña o total) registrado.
    """
    user_id = current_user_id()
    data = request.get_json() or {}

    reserva_id = data.get("reserva_id")
    if not isinstance(reserva_id, int):
        return jsonify({"error": "reserva_id es requerido y debe ser un entero."}), 400

    reserva = db.session.get(Reserva, reserva_id)
    if reserva is None:
        # Ya no existe (o ya estaba cancelada): nada que hacer.
        return jsonify({"ok": True, "cancelada": False}), 200
    if reserva.user_id != user_id:
        return jsonify({"error": "La reserva no pertenece al usuario."}), 403

    # Un abono mensual se cancela completo: todas las clases del grupo quedan
    # sin efecto si ninguna tiene pago registrado.
    grupo = (
        reserva_service.grupo_mensual(reserva)
        if reserva.tipo == ReservaTipo.MENSUAL
        else [reserva]
    )

    if any(pago_service.tiene_pago(r.id) for r in grupo):
        # Tiene seña/pago: no la cancelamos por un retorno de error.
        return jsonify({"ok": True, "cancelada": False}), 200

    for r in grupo:
        r.motivo_cancelacion = MotivoCancelacion.CANCELADO
        r.soft_delete()
    db.session.commit()
    return jsonify({"ok": True, "cancelada": True}), 200
