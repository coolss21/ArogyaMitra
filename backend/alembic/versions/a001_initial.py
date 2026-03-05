# A generic, single database migration

# Revision identifiers
revision = 'a001_initial'
down_revision = None
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # Tables are created by SQLAlchemy Base.metadata.create_all()
    # This migration is a no-op placeholder for Alembic tracking
    pass


def downgrade() -> None:
    pass
