"""pago: medio de pago + registrado_por

Agrega a `pagos` el medio de pago (mercado_pago / efectivo) y el empleado/admin
que registró el cobro manual. Las filas existentes se rellenan como mercado_pago.

Revision ID: b2f1a9c7d3e4
Revises: 8df715d4afd9
Create Date: 2026-06-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2f1a9c7d3e4'
down_revision = '8df715d4afd9'
branch_labels = None
depends_on = None


def upgrade():
    # registrado_por_id: NULL = cobro automático (Mercado Pago).
    op.add_column(
        'pagos',
        sa.Column('registrado_por_id', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'fk_pagos_registrado_por_id_users',
        'pagos',
        'users',
        ['registrado_por_id'],
        ['id'],
        ondelete='SET NULL',
    )

    # Tipo enum del medio de pago. Se crea explícitamente y luego se referencia
    # con create_type=False para que add_column no intente recrearlo.
    pago_medio = sa.Enum('mercado_pago', 'efectivo', name='pago_medio')
    pago_medio.create(op.get_bind(), checkfirst=True)

    # server_default rellena las filas existentes como mercado_pago...
    op.add_column(
        'pagos',
        sa.Column(
            'metodo',
            sa.Enum('mercado_pago', 'efectivo', name='pago_medio', create_type=False),
            nullable=False,
            server_default='mercado_pago',
        ),
    )
    # ...y luego se quita: el default queda en la app, no en la BD.
    op.alter_column('pagos', 'metodo', server_default=None)


def downgrade():
    op.drop_column('pagos', 'metodo')
    sa.Enum(name='pago_medio').drop(op.get_bind(), checkfirst=True)

    op.drop_constraint(
        'fk_pagos_registrado_por_id_users', 'pagos', type_='foreignkey'
    )
    op.drop_column('pagos', 'registrado_por_id')
