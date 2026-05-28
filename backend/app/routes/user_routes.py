from flask import Blueprint, request, jsonify, Response
from app.services import UserService
from app.schemas import UserRegisterSchema, UserResponseSchema, UserLoginSchema, UserUpdateProfileSchema

user_bp = Blueprint("users", __name__, url_prefix="/api/users")

user_service = UserService()
register_schema = UserRegisterSchema()
login_schema = UserLoginSchema()
update_profile_schema = UserUpdateProfileSchema()
response_schema = UserResponseSchema()

@user_bp.route("/register", methods=["POST"])
def register() -> Response:
    data = request.get_json()
    errors = register_schema.validate(data)
    if errors:
        return jsonify(errors), 400

    try:
        user = user_service.register_user(data)
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
        return jsonify(response_schema.dump(user)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 401

@user_bp.route("/profile/<int:user_id>", methods=["PUT"])
def update_profile(user_id: int) -> Response:
    data = request.get_json()

    if not data.get("first_name") or not data.get("last_name") or not data.get("email"):
        return jsonify({"error": "Campos requeridos faltantes"}), 400

    errors = update_profile_schema.validate(data)
    if errors:
        if "email" in errors:
            return jsonify({"error": "El email ingresado no es valido"}), 400
        return jsonify({"error": "Campos requeridos faltantes"}), 400

    try:
        user = user_service.update_profile(user_id, data)
        return jsonify(response_schema.dump(user)), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 409