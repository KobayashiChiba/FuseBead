#!/usr/bin/env python3
"""
拼豆图纸色号提取器 — 核心库
输入: 完整图片(numpy array) + 参考格(ref_x, ref_y, cell_size)
输出: 色号二维列表

通过参考格自动检测网格范围，用像素坐标精确定位每个格子，无需裁剪重算。
ref_x/ref_y/cell_size 均支持浮点数，兼容原图压缩后的非整数像素场景。
"""

import cv2
import numpy as np


def _cluster_pixels(pixels, eps=15, merge_eps=30):
    """对格子内的像素做两步聚类，返回主色 BGR"""
    raw = []
    for pixel in pixels:
        b, g, r = int(pixel[0]), int(pixel[1]), int(pixel[2])
        found = False
        for i, (sb, sg, sr, cnt) in enumerate(raw):
            db = b - sb // cnt
            dg = g - sg // cnt
            dr = r - sr // cnt
            if db * db + dg * dg + dr * dr < eps * eps:
                raw[i] = (sb + b, sg + g, sr + r, cnt + 1)
                found = True
                break
        if not found:
            raw.append((b, g, r, 1))
    centers = []
    for sb, sg, sr, cnt in raw:
        centers.append(((sb // cnt, sg // cnt, sr // cnt), cnt))
    centers.sort(key=lambda x: -x[1])
    merged = []
    for c, cnt in centers:
        found = False
        for i, (mc, mcnt) in enumerate(merged):
            db = c[0] - mc[0]
            dg = c[1] - mc[1]
            dr = c[2] - mc[2]
            if db * db + dg * dg + dr * dr < merge_eps * merge_eps:
                nc = mcnt + cnt
                merged[i] = (
                    ((mc[0] * mcnt + c[0] * cnt) // nc,
                     (mc[1] * mcnt + c[1] * cnt) // nc,
                     (mc[2] * mcnt + c[2] * cnt) // nc),
                    nc,
                )
                found = True
                break
        if not found:
            merged.append((c, cnt))
    merged.sort(key=lambda x: -x[1])
    return merged[0][0] if merged else (200, 200, 200)


def _average_pixels(pixels):
    """对格子内的像素在HSL色彩空间取平均，返回主色 BGR

    在HSL空间做环形色相平均，避免黄+蓝→灰的问题，更接近绘画色彩混合直觉。
    """
    N = pixels.shape[0]
    # BGR → HLS（OpenCV 的 HLS: H∈[0,180), L∈[0,255], S∈[0,255]）
    img = pixels.reshape(1, N, 3).astype(np.uint8)
    hls = cv2.cvtColor(img, cv2.COLOR_BGR2HLS).reshape(N, 3).astype(np.float32)

    H = hls[:, 0]  # 0-180 对应 0°-360°
    L = hls[:, 1]
    S = hls[:, 2]

    # 色相环形平均：将角度转为单位向量，取平均后转回角度
    H_rad = np.deg2rad(H * 2)  # H*2 映射到真实角度 0°-360°
    H_sin = np.sin(H_rad).mean()
    H_cos = np.cos(H_rad).mean()
    H_avg = np.rad2deg(np.arctan2(H_sin, H_cos)) / 2
    if H_avg < 0:
        H_avg += 180

    L_avg = L.mean()
    S_avg = S.mean()

    hls_avg = np.array([[[H_avg, L_avg, S_avg]]], dtype=np.uint8)
    bgr = cv2.cvtColor(hls_avg, cv2.COLOR_HLS2BGR).reshape(3)
    return (int(bgr[0]), int(bgr[1]), int(bgr[2]))


def detect_grid_bounds(img, ref_cell):
    """
    从基准格子向四周扩展，自动识别图纸网格范围

    参数:
        img: numpy array (BGR), 完整图片
        ref_cell: (ref_x, ref_y, cell_size) 参考格子三元组
                  ref_x, ref_y: 基准格子左上角坐标（像素，可为浮点）
                  cell_size: 基准格子边长（像素，可为浮点），格子为正方形

    返回:
        (top, left, bottom, right): 扩展后的网格范围（像素坐标）
    """
    ref_x, ref_y, cell_size = ref_cell
    h_img, w_img = img.shape[:2]

    top = ref_y % cell_size
    left = ref_x % cell_size
    bottom = ref_y + cell_size + ((h_img - ref_y - cell_size) // cell_size) * cell_size
    right = ref_x + cell_size + ((w_img - ref_x - cell_size) // cell_size) * cell_size

    return top, left, bottom, right


def extract(img, ref_cell, color_map, merge_threshold=25, mode="dominant",
            progress_callback=None):
    """
    从拼豆图纸中提取色号

    参数:
        img: numpy array (BGR), 完整图片
        ref_cell: (ref_x, ref_y, cell_size) 参考格子三元组
                  ref_x, ref_y: 基准格子左上角坐标（像素，可为浮点）
                  cell_size: 基准格子边长（像素，可为浮点），格子为正方形
        color_map: dict, 色卡 {色号: (R, G, B)}，从数据库传入
        merge_threshold: int, 全局 RGB 聚类阈值（默认25）
        mode: str, 识别模式
              "dominant" — 主色优先，对格子内像素做两步聚类取主色（默认）
              "average"  — 平均色模式，对格子内像素取HSL平均
        progress_callback: callable(progress, message), 进度回调
                           progress 为 0-100 的整数百分比

    返回:
        color_codes: list[list[str]], rows×cols 的色号二维表
                     空字符串表示透明/未识别
    """
    if mode not in ("dominant", "average"):
        raise ValueError(f"未知识别模式: {mode}，可选值为 'dominant' 或 'average'")

    def _report(progress, message):
        if progress_callback:
            progress_callback(progress, message)

    _, _, cell_size = ref_cell
    top, left, bottom, right = detect_grid_bounds(img, ref_cell)
    rows = int((bottom - top) // cell_size)
    cols = int((right - left) // cell_size)
    color_fn = _cluster_pixels if mode == "dominant" else _average_pixels

    _report(15, f'正在逐格提取主色... (0/{rows})')

    cell_rgbs = [[None for _ in range(cols)] for _ in range(rows)]
    step1_start, step1_end = 15, 85
    step1_range = step1_end - step1_start
    for r in range(rows):
        for c in range(cols):
            x1 = int(round(left + c * cell_size))
            y1 = int(round(top + r * cell_size))
            x2 = int(round(left + (c + 1) * cell_size))
            y2 = int(round(top + (r + 1) * cell_size))
            cell = img[y1:y2, x1:x2]
            if cell.size == 0:
                continue
            inner = cell[3:-3, 3:-3]
            if inner.size == 0:
                inner = cell
            pixels = inner.reshape(-1, 3)
            top_bgr = color_fn(pixels)
            cell_rgbs[r][c] = (int(top_bgr[2]), int(top_bgr[1]), int(top_bgr[0]))

        if progress_callback and rows > 0:
            done = r + 1
            pct = step1_start + int(step1_range * done / rows)
            _report(pct, f'正在逐格提取主色... ({done}/{rows})')

    _report(85, '正在进行全局颜色聚类...')
    all_rgbs = [rgb for row in cell_rgbs for rgb in row if rgb]
    clusters = []
    for rgb in all_rgbs:
        r_val, g, b = rgb
        found = False
        for i, (ra, ga, ba, cnt) in enumerate(clusters):
            dr, dg, db = r_val - ra, g - ga, b - ba
            if dr * dr + dg * dg + db * db < merge_threshold * merge_threshold:
                nc = cnt + 1
                clusters[i] = (
                    (ra * cnt + r_val) // nc,
                    (ga * cnt + g) // nc,
                    (ba * cnt + b) // nc,
                    nc,
                )
                found = True
                break
        if not found:
            clusters.append((r_val, g, b, 1))
    clusters.sort(key=lambda x: -x[3])

    _report(90, '正在匹配色卡...')
    cluster_code = []
    for r_val, g, b, cnt in clusters:
        best_d, best_code = 999999, ""
        for code, (cr, cg, cb) in color_map.items():
            dr, dg, db = r_val - cr, g - cg, b - cb
            d = dr * dr + dg * dg + db * db
            if d < best_d:
                best_d = d
                best_code = code
        cluster_code.append(best_code)

    _report(93, '正在分配格子和色号...')
    color_codes = [["" for _ in range(cols)] for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            rgb = cell_rgbs[r][c]
            if rgb is None:
                continue
            best_i, best_d = 0, 999999
            for i, (cr, cg, cb, cnt) in enumerate(clusters):
                dr, dg, db = rgb[0] - cr, rgb[1] - cg, rgb[2] - cb
                d = dr * dr + dg * dg + db * db
                if d < best_d:
                    best_d = d
                    best_i = i
            color_codes[r][c] = cluster_code[best_i]

    _report(95, '提取完成')
    return color_codes
