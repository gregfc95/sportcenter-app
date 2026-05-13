from flask import Blueprint, request, jsonify
from ..services import UserService
from ..schemas import UserRegisterSchema, UserResponseSchema

user_bp = Blueprint("users", __name__, url_prefix="/api/users")

user_service = UserService()
register_schema = UserRegisterSchema()
response_schema = UserResponseSchema()

@user_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    errors = register_schema.validate(data)
    if errors:
        return jsonify(errors), 400

    try:
        user = user_service.register_user(data)
        return jsonify(response_schema.dump(user)), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 409