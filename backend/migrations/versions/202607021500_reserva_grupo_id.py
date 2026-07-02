"""reserva: grupo_id (identidad del abono mensual)

Agrega `grupo_id` a `reservas`: todas las clases de una misma compra de abono
mensual comparten el id, así las generaciones canceladas de un mismo mes no se
mezclan al inferir el grupo. Backfill de filas existentes: una generación es un
lote creado junto (mismo user, turno y `created_at` truncado al segundo).

Revision ID: e5c4d0a8f9b2
Revises: d4b3c9f7e8a1
Create Date: 2026-07-02 15:00:00.000000

"""
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5c4d0a8f9b2'
down_revision = 'd4b3c9f7e8a1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'reservas',
        sa.Column('grupo_id', sa.String(length=32), nullable=True),
    )
    op.create_index('ix_reservas_grupo_id', 'reservas', ['grupo_id'])

    # Backfill en Python (portable, sin depender de gen_random_uuid/pgcrypto).
    # SQL crudo ve las filas soft-deleted, así que cada generación cancelada
    # recibe su propio grupo_id. Una generación = mismo (user, turno) creado en
    # el mismo segundo (crear_reserva_mensual comitea todo el lote a la vez).
    bind = op.get_bind()
    clusters = bind.execute(
        sa.text(
            """
            SELECT DISTINCT user_id, turno_id,
                   date_trunc('second', created_at) AS gen
            FROM reservas
            WHERE tipo = 'mensual'
            """
        )
    ).all()
    for user_id, turno_id, gen in clusters:
        bind.execute(
            sa.text(
                """
                UPDATE reservas
                SET grupo_id = :gid
                WHERE tipo = 'mensual'
                  AND user_id = :user_id
                  AND turno_id = :turno_id
                  AND date_trunc('second', created_at) = :gen
                """
            ),
            {
                "gid": uuid4().hex,
                "user_id": user_id,
                "turno_id": turno_id,
                "gen": gen,
            },
        )


def downgrade():
    op.drop_index('ix_reservas_grupo_id', table_name='reservas')
    op.drop_column('reservas', 'grupo_id')
