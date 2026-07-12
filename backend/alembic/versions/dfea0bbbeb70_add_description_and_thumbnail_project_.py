"""add description and thumbnail_project_id to folders

Revision ID: dfea0bbbeb70
Revises: 237d0993cc2d
Create Date: 2026-07-11 13:39:54.343417
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'dfea0bbbeb70'
down_revision: Union[str, None] = '237d0993cc2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE folders ADD COLUMN description VARCHAR(512)")
    op.execute("ALTER TABLE folders ADD COLUMN thumbnail_project_id INTEGER REFERENCES bead_projects(id)")


def downgrade() -> None:
    # SQLite doesn't support DROP COLUMN easily; skip for simplicity
    pass
