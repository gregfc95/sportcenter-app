"""reserva: asistencia por QR

Agrega a `reservas` el token del código QR (`qr_token`, único, generado
recién cuando el cliente pide su QR) y el asiento de asistencia:
`asistencia_registrada_at` (cuándo se escaneó) y
`asistencia_registrada_por_id` (el empleado/admin que escaneó). Sin backfill:
las filas existentes quedan en NULL y obtienen token bajo demanda.

Revision ID: f6d5e1b9c0a3
Revises: e5c4d0a8f9b2
Create Date: 2026-07-02 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f6d5e1b9c0a3'
down_revision = 'e5c4d0a8f9b2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'reservas',
        sa.Column('qr_token', sa.String(length=64), nullable=True),
    )
    op.add_column(
        'reservas',
        sa.Column(
            'asistencia_registrada_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        'reservas',
        sa.Column('asistencia_registrada_por_id', sa.Integer(), nullable=True),
    )
    op.create_unique_constraint(
        'uq_reservas_qr_token', 'reservas', ['qr_token']
    )
    op.create_foreign_key(
        'fk_reservas_asistencia_registrada_por_id_users',
        'reservas',
        'users',
        ['asistencia_registrada_por_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint(
        'fk_reservas_asistencia_registrada_por_id_users',
        'reservas',
        type_='foreignkey',
    )
    op.drop_constraint('uq_reservas_qr_token', 'reservas', type_='unique')
    op.drop_column('reservas', 'asistencia_registrada_por_id')
    op.drop_column('reservas', 'asistencia_registrada_at')
    op.drop_column('reservas', 'qr_token')
