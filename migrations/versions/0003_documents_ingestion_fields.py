"""add ingestion result fields to documents

Revision ID: 0003
Revises: 0002
Create Date: 2025-01-20 00:00:00

Adds file_size, page_count, chunk_count and error to documents.
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str = "0002"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.add_column("documents", sa.Column("file_size", sa.BigInteger(), nullable=True))
    op.add_column("documents", sa.Column("page_count", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("chunk_count", sa.Integer(), nullable=True))
    op.add_column("documents", sa.Column("error", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("documents", "error")
    op.drop_column("documents", "chunk_count")
    op.drop_column("documents", "page_count")
    op.drop_column("documents", "file_size")
