import secrets

LOWER = "abcdefghijklmnopqrstuvwxyz"
UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
DIGITS = "0123456789"
SPECIAL = "!@#$%^&*(),.?\":{}|<>"
ALL = LOWER + UPPER + DIGITS + SPECIAL


def generate_password(length: int = 12) -> str:
    """Generate a random password that satisfies the registration rules:
    8-15 characters with at least one uppercase, one lowercase, one digit and
    one special character."""
    length = max(8, min(length, 15))
    # Guarantee one char from each required class.
    chars = [
        secrets.choice(LOWER),
        secrets.choice(UPPER),
        secrets.choice(DIGITS),
        secrets.choice(SPECIAL),
    ]
    chars += [secrets.choice(ALL) for _ in range(length - len(chars))]
    # Shuffle so the guaranteed chars aren't always in the same positions.
    for i in range(len(chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        chars[i], chars[j] = chars[j], chars[i]
    return "".join(chars)
