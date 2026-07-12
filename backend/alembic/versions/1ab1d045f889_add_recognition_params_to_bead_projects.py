"""add recognition params to bead_projects

Revision ID: 1ab1d045f889
Revises: dfea0bbbeb70
Create Date: 2026-07-11 17:34:50.468118
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '1ab1d045f889'
down_revision: Union[str, None] = 'dfea0bbbeb70'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE bead_projects ADD COLUMN crop_x FLOAT DEFAULT 0")
    op.execute("ALTER TABLE bead_projects ADD COLUMN crop_y FLOAT DEFAULT 0")
    op.execute("ALTER TABLE bead_projects ADD COLUMN crop_w FLOAT DEFAULT 0")
    op.execute("ALTER TABLE bead_projects ADD COLUMN crop_h FLOAT DEFAULT 0")
    op.execute("ALTER TABLE bead_projects ADD COLUMN ref_x FLOAT DEFAULT 0")
    op.execute("ALTER TABLE bead_projects ADD COLUMN ref_y FLOAT DEFAULT 0")
    op.execute("ALTER TABLE bead_projects ADD COLUMN cell_size FLOAT DEFAULT 20")
    op.execute("ALTER TABLE bead_projects ADD COLUMN mode VARCHAR(16) DEFAULT 'dominant'")
    op.execute("ALTER TABLE bead_projects ADD COLUMN merge_threshold INTEGER DEFAULT 25")


def downgrade() -> None:
    pass
