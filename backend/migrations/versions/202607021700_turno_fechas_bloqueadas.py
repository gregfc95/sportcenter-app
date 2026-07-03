"""turno_fechas_bloqueadas: baja de una fecha puntual de un turno

El turno es una plantilla semanal; esta tabla representa la excepción "el
turno del lunes 10:00 no ocurre el 2026-07-13". Bloquea nuevas reservas para
esa fecha sin dar de baja el resto de las semanas. Unique parcial sobre filas
activas para permitir re-bloquear tras restaurar (mismo patrón que turnos).

Revision ID: a7b6c2d3e4f5
Revises: f6d5e1b9c0a3
Create Date: 2026-07-02 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a7b6c2d3e4f5'
down_revision = 'f6d5e1b9c0a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'turno_fechas_bloqueadas',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'turno_id',
            sa.Integer(),
            sa.ForeignKey('turnos.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('fecha', sa.Date(), nullable=False),
        sa.Column(
            'creado_por_id',
            sa.Integer(),
            sa.ForeignKey('users.id'),
            nullable=True,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f('ix_turno_fechas_bloqueadas_deleted_at'),
        'turno_fechas_bloqueadas',
        ['deleted_at'],
    )
    op.create_index(
        'uq_turno_fecha_bloqueada_active',
        'turno_fechas_bloqueadas',
        ['turno_id', 'fecha'],
        unique=True,
        postgresql_where=sa.text('deleted_at IS NULL'),
    )


def downgrade():
    op.drop_index(
        'uq_turno_fecha_bloqueada_active', table_name='turno_fechas_bloqueadas'
    )
    op.drop_index(
        op.f('ix_turno_fechas_bloqueadas_deleted_at'),
        table_name='turno_fechas_bloqueadas',
    )
    op.drop_table('turno_fechas_bloqueadas')
