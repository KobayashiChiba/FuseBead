#!/usr/bin/env python3
"""
拼豆图纸可视化渲染器
将色号数据渲染为带坐标、色号文字和统计信息的可视化图片
"""

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from collections import Counter
from pathlib import Path


# ── 字体加载 ──
_FONT_CACHE = {}

def _get_font(size):
    """尝试加载系统字体，缓存结果"""
    if size in _FONT_CACHE:
        return _FONT_CACHE[size]

    candidates = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/msyhbd.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            try:
                font = ImageFont.truetype(path, size)
                _FONT_CACHE[size] = font
                return font
            except Exception:
                continue

    font = ImageFont.load_default()
    _FONT_CACHE[size] = font
    return font


def _luminance(r, g, b):
    """计算感知亮度，用于判断文字颜色"""
    return 0.299 * r + 0.587 * g + 0.114 * b


def _draw_checkerboard(draw, x, y, cell_size):
    """在指定区域画棋盘格（空格子）"""
    small = max(2, cell_size // 4)
    for sr in range(0, cell_size, small):
        for sc in range(0, cell_size, small):
            is_light = ((sr // small) + (sc // small)) % 2 == 0
            color = (248, 248, 248) if is_light else (220, 220, 220)
            ex = min(sc + small, cell_size)
            ey = min(sr + small, cell_size)
            draw.rectangle([x + sc, y + sr, x + ex, y + ey], fill=color)


def render_bead_art(color_codes, color_map, title="拼豆图纸", cell_size=60):
    """
    将色号二维表渲染为可视化拼豆图纸图片

    布局:
      - 左上角标题 Title(num)
      - 坐标格：与内部格子同尺寸，深蓝底浅色字，四角同色无文字，四周全包围
      - 统计区：圆角矩形色块，高度 = 格子 ×1.5，宽度自适应

    参数:
        color_codes: list[list[str]], extract 输出的色号二维表
        color_map:   dict, 色号 -> (R, G, B)
        title:       str, 图纸标题
        cell_size:   int, 每个格子的像素大小

    返回:
        numpy array (BGR), 可直接用 cv2.imwrite 保存
    """
    rows = len(color_codes)
    cols = len(color_codes[0]) if rows > 0 else 0
    if rows == 0 or cols == 0:
        raise ValueError("color_codes 为空")

    # ── 统计 ──
    flat = [code for row in color_codes for code in row if code]
    counter = Counter(flat)
    stats = counter.most_common()
    total = len(flat)

    # ── 带坐标边框的总网格 ──
    total_rows = rows + 2          # 上坐标 + 数据 + 下坐标
    total_cols = cols + 2          # 左坐标 + 数据 + 右坐标
    grid_w = total_cols * cell_size
    grid_h = total_rows * cell_size

    # ── 统计区域 ──
    stat_h = int(cell_size * 1.5)
    font_stat = _get_font(int(stat_h * 0.42))
    stat_pad_h = 14                # 圆角矩形内左右留白
    stat_margin = 8                # 色块间距
    stat_gap = 10                  # 行间距

    # ── 布局尺寸 ──
    title_h = 70
    pad_top = 16
    pad_bottom = 16
    gap_after_grid = 20
    left_margin = cell_size // 2    # 标题/统计的左侧留白

    # 用最宽松的估计（每个颜色单独一行），保证画布足够大
    est_stats_h = len(stats) * (stat_h + stat_gap) + 20

    grid_x0 = 0
    grid_y0 = pad_top + title_h + gap_after_grid

    canvas_w = grid_w
    canvas_h = pad_top + title_h + gap_after_grid + grid_h + gap_after_grid + est_stats_h + pad_bottom

    # ── 创建画布 ──
    img = Image.new("RGB", (canvas_w, canvas_h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    font_title = _get_font(36)
    font_cell  = _get_font(max(10, int(cell_size * 0.32)))
    font_coord = _get_font(max(10, int(cell_size * 0.38)))

    # ── 左上角标题 ──
    title_text = f"{title}({total})"
    draw.text((left_margin, pad_top + 10), title_text, fill=(30, 30, 30), font=font_title)

    # ── 坐标样式 ──
    coord_bg = (0,49,83)       # 深蓝

    # ── 先填充所有格子背景色 ──
    for r in range(total_rows):
        for c in range(total_cols):
            x = grid_x0 + c * cell_size
            y = grid_y0 + r * cell_size

            is_corner = (r == 0 or r == total_rows - 1) and (c == 0 or c == total_cols - 1)
            is_coord = (r == 0 or r == total_rows - 1 or c == 0 or c == total_cols - 1)

            if is_coord:
                draw.rectangle([x, y, x + cell_size, y + cell_size], fill=coord_bg)
            else:
                code = color_codes[r - 1][c - 1]
                if code and code in color_map:
                    rgb = color_map[code]
                    draw.rectangle([x, y, x + cell_size, y + cell_size], fill=(rgb[0], rgb[1], rgb[2]))
                else:
                    _draw_checkerboard(draw, x, y, cell_size)

    # ── 画网格线（先画再写文字，避免文字被网格线盖住） ──
    for r in range(total_rows + 1):
        y = grid_y0 + r * cell_size
        thick = 3 if r >= 1 and (r - 1) % 5 == 0 else 1
        draw.line([(grid_x0, y), (grid_x0 + grid_w, y)], fill=(140, 140, 140), width=thick)
    for c in range(total_cols + 1):
        x = grid_x0 + c * cell_size
        thick = 3 if c >= 1 and (c - 1) % 5 == 0 else 1
        draw.line([(x, grid_y0), (x, grid_y0 + grid_h)], fill=(140, 140, 140), width=thick)

    # ── 写坐标文字 + 数据格色号文字 ──
    for r in range(total_rows):
        for c in range(total_cols):
            x = grid_x0 + c * cell_size
            y = grid_y0 + r * cell_size

            is_corner = (r == 0 or r == total_rows - 1) and (c == 0 or c == total_cols - 1)
            is_coord_top = r == 0 and not is_corner
            is_coord_bottom = r == total_rows - 1 and not is_corner
            is_coord_left = c == 0 and not is_corner
            is_coord_right = c == total_cols - 1 and not is_corner
            is_data = not (is_corner or is_coord_top or is_coord_bottom or is_coord_left or is_coord_right)

            if is_corner:
                continue  # 四角无文字

            if is_coord_top or is_coord_bottom or is_coord_left or is_coord_right:
                # 坐标文字（深蓝底 + 白字）
                label = str(c) if (is_coord_top or is_coord_bottom) else str(r)
                lb = draw.textbbox((0, 0), label, font=font_coord)
                lw = lb[2] - lb[0]
                lh = lb[3] - lb[1]
                draw.text((x + (cell_size - lw) / 2, y + (cell_size - lh) / 2 - 2),
                          label, fill=(255, 255, 255), font=font_coord)
            else:
                # 数据格色号文字
                code = color_codes[r - 1][c - 1]
                if code:
                    if code in color_map:
                        rgb = color_map[code]
                        fill = (rgb[0], rgb[1], rgb[2])
                    else:
                        fill = (245, 245, 245)
                    r_lum, g_lum, b_lum = fill
                    text_color = (0, 0, 0) if _luminance(r_lum, g_lum, b_lum) > 128 else (255, 255, 255)
                    cb = draw.textbbox((0, 0), code, font=font_cell)
                    cw = cb[2] - cb[0]
                    ch = cb[3] - cb[1]
                    draw.text((x + (cell_size - cw) / 2, y + (cell_size - ch) / 2 - 2),
                              code, fill=text_color, font=font_cell)

    # ── 统计区域（圆角矩形色块） ──
    stats_y0 = grid_y0 + grid_h + gap_after_grid
    cur_x = left_margin
    cur_y = stats_y0

    for code, count in stats:
        text = f" {code}({count}) "
        tb = draw.textbbox((0, 0), text, font=font_stat)
        tw = tb[2] - tb[0]
        item_w = tw + stat_pad_h * 2

        # 换行
        if cur_x + item_w > canvas_w:
            cur_x = left_margin
            cur_y += stat_h + stat_gap

        # 色块底色
        if code in color_map:
            swatch_rgb = tuple(color_map[code])
        else:
            swatch_rgb = (200, 200, 200)

        # 圆角矩形（白色描边）
        draw.rounded_rectangle(
            [cur_x, cur_y, cur_x + item_w, cur_y + stat_h],
            radius=8, fill=swatch_rgb, outline=(255, 255, 255), width=2,
        )

        # 文字（深色底白字，浅色底黑字）
        r_lum, g_lum, b_lum = swatch_rgb
        text_color = (0, 0, 0) if _luminance(r_lum, g_lum, b_lum) > 128 else (255, 255, 255)
        draw.text((cur_x + stat_pad_h, cur_y + (stat_h - (tb[3] - tb[1])) / 2 - 2),
                  text, fill=text_color, font=font_stat)

        cur_x += item_w + stat_margin

    # ── 精确裁切到内容实际高度 ──
    actual_bottom = cur_y + stat_h + pad_bottom
    if actual_bottom > canvas_h:
        # 画布不够高 -> 扩展
        new_img = Image.new("RGB", (canvas_w, int(actual_bottom)), (255, 255, 255))
        new_img.paste(img, (0, 0))
        img = new_img
    else:
        # 画布有多余 -> 裁切
        img = img.crop((0, 0, canvas_w, int(actual_bottom)))

    # ── 转为 OpenCV BGR ──
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)


def render_thumbnail(color_codes, color_map, size=256):
    """生成缩略图：取网格中心正方形区域，纯色块无网格线无文字，缩放至 size×size

    返回 base64 PNG 字符串（含 data:image/png;base64, 前缀）
    """
    import base64
    from io import BytesIO

    rows = len(color_codes)
    cols = len(color_codes[0]) if rows > 0 else 0
    if rows == 0 or cols == 0:
        return None

    # 取中心正方形
    side = min(rows, cols)
    r0 = (rows - side) // 2
    c0 = (cols - side) // 2

    # 纯色块渲染（一个格子一个像素）
    cell_px = 1
    img_w = side * cell_px
    img_h = side * cell_px

    img = Image.new("RGB", (img_w, img_h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    for r in range(side):
        for c in range(side):
            code = color_codes[r0 + r][c0 + c]
            if code and code in color_map:
                rgb = color_map[code]
                fill = (rgb[0], rgb[1], rgb[2])
            else:
                # 棋盘格 — 缩略图用灰色代替
                fill = (240, 240, 240)
            draw.rectangle([c, r, c + cell_px, r + cell_px], fill=fill)

    # 缩放到目标尺寸
    img = img.resize((size, size), Image.NEAREST)

    # 编码为 PNG base64
    buf = BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"

