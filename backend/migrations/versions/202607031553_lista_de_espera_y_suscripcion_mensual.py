"""lista de espera y suscripcion mensual

Agrega la lista de espera sobre `reservas` (estado_espera + oferta_expira_at) y
la marca de renovación de abonos (renovacion_de_grupo_id), más las tablas
`penalizaciones` (ledger mensual) y `suspensiones` (intervalos por renovación
impaga).

Revision ID: 0c66d42a5814
Revises: b8c7d6e5f4a3
Create Date: 2026-07-03 15:53:46.383243

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '0c66d42a5814'
down_revision = 'b8c7d6e5f4a3'
branch_labels = None
depends_on = None


def upgrade():
    # El enum de la columna nueva de `reservas` se crea explícito (checkfirst):
    # el add_column en modo batch no siempre emite el CREATE TYPE. El de
    # `penalizaciones` lo crea su create_table.
    estado_espera = postgresql.ENUM(
        'esperando', 'ofertado', 'vencido', name='estado_espera'
    )
    estado_espera.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'suspensiones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('grupo_id', sa.String(length=32), nullable=False),
        sa.Column('inicio_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('fin_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'uq_suspension_activa',
        'suspensiones',
        ['user_id'],
        unique=True,
        postgresql_where=sa.text('fin_at IS NULL'),
    )

    op.create_table(
        'penalizaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('reserva_id', sa.Integer(), nullable=False),
        sa.Column(
            'motivo',
            sa.Enum(
                'cancelacion_clase',
                'renovacion_impaga',
                name='penalizacion_motivo',
            ),
            nullable=False,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['reserva_id'], ['reservas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'reserva_id', 'motivo', name='uq_penalizacion_reserva_motivo'
        ),
    )
    op.create_index(
        'ix_penalizaciones_user_created',
        'penalizaciones',
        ['user_id', 'created_at'],
        unique=False,
    )

    with op.batch_alter_table('reservas', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'estado_espera',
                postgresql.ENUM(
                    'esperando',
                    'ofertado',
                    'vencido',
                    name='estado_espera',
                    create_type=False,
                ),
                nullable=True,
            )
        )
        batch_op.add_column(
            sa.Column('oferta_expira_at', sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column('renovacion_de_grupo_id', sa.String(length=32), nullable=True)
        )
        batch_op.create_index(
            batch_op.f('ix_reservas_estado_espera'), ['estado_espera'], unique=False
        )
        batch_op.create_index(
            batch_op.f('ix_reservas_renovacion_de_grupo_id'),
            ['renovacion_de_grupo_id'],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table('reservas', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_reservas_renovacion_de_grupo_id'))
        batch_op.drop_index(batch_op.f('ix_reservas_estado_espera'))
        batch_op.drop_column('renovacion_de_grupo_id')
        batch_op.drop_column('oferta_expira_at')
        batch_op.drop_column('estado_espera')

    op.drop_index('ix_penalizaciones_user_created', table_name='penalizaciones')
    op.drop_table('penalizaciones')

    op.drop_index(
        'uq_suspension_activa',
        table_name='suspensiones',
        postgresql_where=sa.text('fin_at IS NULL'),
    )
    op.drop_table('suspensiones')

    postgresql.ENUM(name='estado_espera').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='penalizacion_motivo').drop(op.get_bind(), checkfirst=True)
