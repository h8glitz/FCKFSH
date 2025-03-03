"""Удаление tg_id из users

Revision ID: 6a078a938ce0
Revises: 5346621406c5
Create Date: 2025-02-04 14:43:23.598116

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a078a938ce0'
down_revision: Union[str, None] = '5346621406c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    """Удаляем колонку tg_id из таблицы users"""
    op.drop_column('users', 'tg_id')

def downgrade():
    """Откатываем изменения: добавляем tg_id обратно"""
    op.add_column('users', sa.Column('tg_id', sa.BigInteger, unique=True, nullable=False))
