"""色卡路由"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.user import User
from ..models.color_card import ColorCard
from ..schemas.color_card import ColorCardResponse, ColorCardDetailResponse, ColorItem
from .auth import get_current_user

router = APIRouter(prefix="/api/color-cards", tags=["color_cards"])


@router.get("", response_model=list[ColorCardResponse])
def list_cards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """可用色卡列表"""
    cards = db.query(ColorCard).filter(ColorCard.is_active == True).all()
    return [
        ColorCardResponse(
            id=c.id,
            name=c.name,
            is_system=c.is_system,
            is_active=c.is_active,
            color_count=len(c.colors) if c.colors else 0,
        )
        for c in cards
    ]


@router.get("/{card_id}", response_model=ColorCardDetailResponse)
def get_card(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """色卡详情（含颜色数组）"""
    card = db.query(ColorCard).filter(ColorCard.id == card_id, ColorCard.is_active == True).first()
    if not card:
        raise HTTPException(status_code=404, detail="色卡不存在")
    return ColorCardDetailResponse(
        id=card.id,
        name=card.name,
        is_system=card.is_system,
        is_active=card.is_active,
        color_count=len(card.colors) if card.colors else 0,
        colors=[ColorItem(code=c["code"], hex=c["hex"]) for c in card.colors],
    )
