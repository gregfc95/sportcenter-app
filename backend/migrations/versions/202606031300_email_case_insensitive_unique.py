"""users: email case-insensitive unique

Normaliza los emails existentes a minúsculas y agrega un índice único sobre
`lower(email)` para que `JOSE@gmail.com` y `jose@gmail.com` no puedan coexistir,
incluso si algún code path se saltea la validación del schema.

Revision ID: c3a2b8e5f6d7
Revises: b2f1a9c7d3e4
Create Date: 2026-06-03 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3a2b8e5f6d7'
down_revision = 'b2f1a9c7d3e4'
branch_labels = None
depends_on = None


def upgrade():
    # Normaliza datos existentes para que el índice único no falle por
    # duplicados que sólo difieren en mayúsculas/minúsculas.
    op.execute("UPDATE users SET email = lower(email) WHERE email <> lower(email)")

    op.create_index(
        'uq_users_email_lower',
        'users',
        [sa.text('lower(email)')],
        unique=True,
    )


def downgrade():
    op.drop_index('uq_users_email_lower', table_name='users')
