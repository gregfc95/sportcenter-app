"""pagos/reservas: estado y motivo 'credito'

Agrega el valor 'credito' a los enums `pago_estado` y `motivo_cancelacion`:
la cancelación de una clase de un abono mensual con más de 48 h de
anticipación puede resolverse, a elección del cliente, como reembolso o como
crédito a favor para esa actividad. El crédito solo se asienta en el
historial; su canje se implementa más adelante.

Revision ID: d4b3c9f7e8a1
Revises: c3a2b8e5f6d7
Create Date: 2026-07-01 10:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'd4b3c9f7e8a1'
down_revision = 'c3a2b8e5f6d7'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE pago_estado ADD VALUE IF NOT EXISTS 'credito'")
    op.execute("ALTER TYPE motivo_cancelacion ADD VALUE IF NOT EXISTS 'credito'")


def downgrade():
    # PostgreSQL no permite eliminar valores de un enum; quitarlos requeriría
    # recrear el tipo y reescribir las filas. Se deja como no-op.
    pass
