"""creditos: crédito a favor por cancelación de abono mensual

Hace usable el crédito a favor que hasta ahora solo se asentaba en el
historial. `creditos` guarda el saldo (divisible) que le queda al cliente para
una actividad y su vigencia (30 días); `credito_consumos` es el ledger N:M que
registra cuánto crédito financió cada pago. Suma el medio 'credito_a_favor' al
enum `pago_medio` para los pagos cubiertos 100% con crédito.

Revision ID: b8c7d6e5f4a3
Revises: a7b6c2d3e4f5
Create Date: 2026-07-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b8c7d6e5f4a3'
down_revision = 'a7b6c2d3e4f5'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE pago_medio ADD VALUE IF NOT EXISTS 'credito_a_favor'")

    op.create_table(
        'creditos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'user_id',
            sa.Integer(),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'actividad_id',
            sa.Integer(),
            sa.ForeignKey('actividades.id', ondelete='RESTRICT'),
            nullable=False,
        ),
        sa.Column(
            'reserva_id',
            sa.Integer(),
            sa.ForeignKey('reservas.id', ondelete='RESTRICT'),
            nullable=False,
            unique=True,
        ),
        sa.Column('monto_inicial', sa.Numeric(10, 2), nullable=False),
        sa.Column('saldo', sa.Numeric(10, 2), nullable=False),
        sa.Column('expira_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f('ix_creditos_deleted_at'), 'creditos', ['deleted_at']
    )
    op.create_index(
        'ix_creditos_user_actividad', 'creditos', ['user_id', 'actividad_id']
    )

    op.create_table(
        'credito_consumos',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'credito_id',
            sa.Integer(),
            sa.ForeignKey('creditos.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column(
            'pago_id',
            sa.Integer(),
            sa.ForeignKey('pagos.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('monto', sa.Numeric(10, 2), nullable=False),
        sa.Column('restaurado_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        op.f('ix_credito_consumos_pago_id'), 'credito_consumos', ['pago_id']
    )


def downgrade():
    op.drop_index(
        op.f('ix_credito_consumos_pago_id'), table_name='credito_consumos'
    )
    op.drop_table('credito_consumos')
    op.drop_index('ix_creditos_user_actividad', table_name='creditos')
    op.drop_index(op.f('ix_creditos_deleted_at'), table_name='creditos')
    op.drop_table('creditos')
    # PostgreSQL no permite eliminar valores de un enum; se deja como no-op
    # (mismo criterio que 202607011000_pago_credito.py).
