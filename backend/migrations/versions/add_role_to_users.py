from alembic import op
import sqlalchemy as sa

revision = 'add_role_001'
down_revision = 'c5da9eb735cd'
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE TYPE userrole AS ENUM ('client', 'employee', 'owner')")
    op.add_column('users', sa.Column('role', sa.Enum('client', 'employee', 'owner', name='userrole'), nullable=False, server_default='client'))

def downgrade():
    op.drop_column('users', 'role')
    op.execute("DROP TYPE userrole")