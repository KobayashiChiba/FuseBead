"""add thumbnail to project_grids

Revision ID: f5c7ac588321
Revises: 1ab1d045f889
Create Date: 2026-07-11 21:09:57.433303
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'f5c7ac588321'
down_revision: Union[str, None] = '1ab1d045f889'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('project_grids', sa.Column('thumbnail', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('project_grids', 'thumbnail')
