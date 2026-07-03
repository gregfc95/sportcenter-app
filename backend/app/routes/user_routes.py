import logging

from flask import Blueprint, abort, request, jsonify, Response
from app.auth import current_user_id, require_role
from app.models.user import UserRole
from app.services import MensualidadService, UserService, send_password_email
from app.utils.password import generate_password
from app.schemas import (
    UserRegisterSchema,
    EmployeeRegisterSchema,
    UserResponseSchema,
    UserLoginSchema,
    UserUpdateProfileSchema,
    UserChangePasswordSchema,
)

logger = logging.getLogger(__name__)

user_bp = Blueprint("users", __name__, url_prefix="/api/users")

user_service = UserService()
mensualidad_service = MensualidadService()
register_schema = UserRegisterSchema()
employee_register_schema = EmployeeRegisterSchema()
login_schema = UserLoginSchema()
update_profile_schema = UserUpdateProfileSchema()
change_password_schema = UserChangePasswordSchema()
response_schema = UserResponseSchema()


def _notify_password(email: str, password: str) -> None:
    """Email the generated password; never let a send failure break the request."""
    try:
        send_password_email(email, password)
    except Exception:
        logger.exception("No se pudo enviar la contraseña a %s", email)


@user_bp.route("", methods=["GET"])
def list_users() -> Response:
    user = require_role(UserRole.ADMIN, UserRole.EMPLOYEE)

    role_param = request.args.get("role")
    role: UserRole | None = None
    if role_param is not None:
        try:
            role = UserRole(role_param)
        except ValueError:
            valid = ", ".join(r.value for r in UserRole)
            return jsonify({"error": f"role debe ser uno de: {valid}"}), 400

    if user.role == UserRole.EMPLOYEE:
        if role is not None and role != UserRole.CLIENT:
            abort(403, description="Solo podés ver clientes")
        role = UserRole.CLIENT

    users = user_service.listar_usuarios(role=role)
    return jsonify(response_schema.dump(users, many=True)), 200


@user_bp.route("/register", methods=["POST"])
def register() -> Response:
    data = request.get_json()
    generated = not (data or {}).get("password")
    if generated:
        data["password"] = generate_password()
    errors = register_schema.validate(data)
    if errors:
        return jsonify(errors), 400

    try:
        user = user_service.register_user(data)
        if generated:
            _notify_password(user.email, data["password"])
        return jsonify(response_schema.dump(user)), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@user_bp.route("", methods=["POST"])
def create_user() -> Response:
    require_role(UserRole.ADMIN)

    data = request.get_json() or {}
    role_param = data.pop("role", None)
    if role_param is None:
        return jsonify({"error": "El campo role es requerido"}), 400
    try:
        role = UserRole(role_param)
    except ValueError:
        valid = ", ".join(r.value for r in UserRole)
        return jsonify({"error": f"role debe ser uno de: {valid}"}), 400

    generated = not data.get("password")
    if generated:
        data["password"] = generate_password()

    schema = employee_register_schema if role == UserRole.EMPLOYEE else register_schema
    errors = schema.validate(data)
    if errors:
        return jsonify(errors), 400

    try:
        user = user_service.register_user(data, role=role)
        if generated:
            _notify_password(user.email, data["password"])
        return jsonify(response_schema.dump(user)), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409


@user_bp.route("/login", methods=["POST"])
def login() -> Response:
    data = request.get_json()
    errors = login_schema.validate(data)
    if errors:
        return jsonify({"error": "Email y/o contraseña inválidos"}), 401

    try:
        user = user_service.login_user(data["email"], data["password"])
        payload = response_schema.dump(user)
        payload["suspendido"] = mensualidad_service.suspendido(user.id)
        return jsonify(payload), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@user_bp.route("/me", methods=["PUT"])
def update_profile() -> Response:
    user_id = current_user_id()
    data = request.get_json()

    if not data.get("first_name") or not data.get("last_name") or not data.get("email"):
        return jsonify({"error": "Campos requeridos faltantes"}), 400

    errors = update_profile_schema.validate(data)
    if errors:
        if "email" in errors:
            return jsonify({"error": "El email ingresado no es valido"}), 400
        return jsonify({"error": "Campos requeridos faltantes-Debug"}), 400

    current_password = data.get("current_password")
    new_password = data.get("new_password")
    wants_password_change = bool(current_password or new_password)
    if wants_password_change:
        if not current_password:
            return (
                jsonify({"errors": {"current_password": "Campo requerido faltante"}}),
                400,
            )
        pw_errors = change_password_schema.validate({"new_password": new_password})
        if pw_errors:
            return (
                jsonify({"errors": {"new_password": pw_errors["new_password"][0]}}),
                400,
            )

    try:
        user = user_service.update_profile(
            user_id,
            data,
            current_password=current_password if wants_password_change else None,
            new_password=new_password if wants_password_change else None,
        )
        payload = response_schema.dump(user)
        payload["suspendido"] = mensualidad_service.suspendido(user.id)
        return jsonify(payload), 200
    except ValueError as e:
        msg = str(e)
        if msg == "La contraseña actual no es valida":
            return jsonify({"errors": {"current_password": msg}}), 400
        return jsonify({"error": msg}), 409
