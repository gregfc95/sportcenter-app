from alembic import op
import sqlalchemy as sa

revision = 'add_phone_birth_date'
down_revision = 'add_role_001'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('users', sa.Column('phone', sa.String(20), nullable=True))
    op.add_column('users', sa.Column('birth_date', sa.Date(), nullable=True))

def downgrade():
    op.drop_column('users', 'phone')
    op.drop_column('users', 'birth_date')