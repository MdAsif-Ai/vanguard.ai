"""add documents.checksum index

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-15 00:00:00

Adds the index used for organization-scoped duplicate checksum detection.
"""

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str = "0001"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_index(op.f("ix_documents_checksum"), "documents", ["checksum"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_documents_checksum"), table_name="documents")
