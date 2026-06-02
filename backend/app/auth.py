from flask import abort, request

from . import db
from .models.user import User, UserRole


def current_user_id() -> int:
    """MVP auth stub. Reads the acting user's id from the X-User-ID header.

    Replace this function's body with real authentication (Flask-Login
    session, JWT, etc.) when ready — route signatures shouldn't change.
    """
    user_id = request.headers.get("X-User-ID")
    if user_id is None:
        abort(401, description="X-User-ID header required")
    try:
        return int(user_id)
    except ValueError:
        abort(400, description="X-User-ID must be an integer")


def current_user() -> User:
    """Load the User row for the current request. Aborts 401 if not found."""
    user = db.session.get(User, current_user_id())
    if user is None:
        abort(401, description="Authenticated user not found")
    return user


def require_role(*allowed: UserRole) -> User:
    """Ensure the current user has one of the allowed roles. Returns the user."""
    user = current_user()
    if user.role not in allowed:
        abort(403, description="Permission denied")
    return user
