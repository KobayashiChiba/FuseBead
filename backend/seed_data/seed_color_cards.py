#!/usr/bin/env python3
"""
色卡种子数据导入脚本
部署时运行：检查 color_cards 表中是否有预置色卡，没有则自动导入
"""

import json
import sys
from pathlib import Path

# 确保 models 可 import
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "app"))

# 注意：后面写 core/database.py 后，这里换成 from core.database import SessionLocal
# 当前先用原始 SQLite 直连验证

SEED_DIR = Path(__file__).resolve().parent

CARDS = [
    {"name": "Mard 221", "file": "mard_221.json"},
    {"name": "Mard 291", "file": "mard_291.json"},
]


def load_card(filename):
    with open(SEED_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def seed(db_session):
    """检查并导入缺失的预置色卡"""
    from models.color_card import ColorCard

    imported = 0
    for card_info in CARDS:
        existing = db_session.query(ColorCard).filter(
            ColorCard.name == card_info["name"],
            ColorCard.is_system == True,
        ).first()
        if existing:
            print(f"  [跳过] {card_info['name']} 已存在")
            continue

        data = load_card(card_info["file"])
        card = ColorCard(
            name=data["name"],
            colors=data["colors"],
            is_system=True,
            is_active=True,
        )
        db_session.add(card)
        imported += 1
        print(f"  [导入] {card_info['name']} ({len(data['colors'])} 色)")

    if imported:
        db_session.commit()
        print(f"共导入 {imported} 张色卡")
    else:
        print("所有预置色卡已齐全，无需导入")

    return imported
