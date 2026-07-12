"""add color_count to project_grids

Revision ID: e0da2c42dc37
Revises: f5c7ac588321
Create Date: 2026-07-11 21:20:15.725739
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'e0da2c42dc37'
down_revision: Union[str, None] = 'f5c7ac588321'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('project_grids', sa.Column('color_count', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('project_grids', 'color_count')
