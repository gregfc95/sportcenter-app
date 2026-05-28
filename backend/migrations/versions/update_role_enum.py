from alembic import op

revision = 'update_role_enum'
down_revision = 'add_phone_birth_date'
branch_labels = None
depends_on = None

def upgrade():
    op.execute("ALTER TYPE userrole RENAME VALUE 'owner' TO 'admin'")

def downgrade():
    op.execute("ALTER TYPE userrole RENAME VALUE 'admin' TO 'owner'")