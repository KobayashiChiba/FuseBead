import { ref, watch } from 'vue'

export const RULER = 24
export const PAD = 4
export const MAX_CELL = 80

/**
 * Shared Canvas 渲染逻辑 — view 和 edit 页面共用
 *
 * @param {Ref} canvasRef — canvas 元素 ref
 * @param {Ref} project — { grid_rows, grid_cols }
 * @param {Ref} gridData — 二维色号表
 * @param {Ref} colorMap — { code: '#hex' }
 * @param {Ref} highlightCode — 当前高亮色号
 * @param {Object} opts — { showCounts, showHighlightBorder, showHighlightCounts }
 * @param {Ref} selectedCell — {row, col} 单格选中
 */
export function useCanvasRenderer(canvasRef, project, gridData, colorMap, highlightCode, opts = {}) {
  const zoomPercent = ref(0)
  const fitScale = ref(1)
  const cellSize = ref(1)
  const panX = ref(0)
  const panY = ref(0)

  const showCounts = opts.showCounts ?? true
  const showHighlightBorder = opts.showHighlightBorder ?? true
  const showHighlightCounts = opts.showHighlightCounts ?? true
  const render = opts.renderHook ? () => { opts.renderHook(); doRender() } : doRender

  // ── 缩放 watch ──
  watch(zoomPercent, (val) => {
    const oldS = cellSize.value
    const newS = fitScale.value + (MAX_CELL - fitScale.value) * (val / 100)
    if (newS === oldS) { cellSize.value = newS; return }

    const canvas = canvasRef.value
    const cols = project.value.grid_cols
    const rows = project.value.grid_rows
    const area = {
      left: RULER + PAD, top: RULER + PAD,
      width: canvas.width - 2 * (RULER + PAD),
      height: canvas.height - 2 * (RULER + PAD),
    }
    const cx = canvas.width / 2, cy = canvas.height / 2
    const oldGridW = cols * oldS, oldGridH = rows * oldS
    const ox = area.left + (area.width - oldGridW) / 2 + panX.value
    const oy = area.top + (area.height - oldGridH) / 2 + panY.value
    const gx = cx - ox, gy = cy - oy

    const ratio = newS / oldS
    cellSize.value = newS
    panX.value = cx - gx * ratio - area.left - (area.width - cols * newS) / 2
    panY.value = cy - gy * ratio - area.top - (area.height - rows * newS) / 2
    doRender()
  })

  function doRender() {
    const canvas = canvasRef.value
    if (!canvas || !gridData.value.length) return

    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    const rows = project.value.grid_rows
    const cols = project.value.grid_cols
    const s = cellSize.value

    // 清空背景
    ctx.fillStyle = '#F0F0F0'
    ctx.fillRect(0, 0, w, h)

    // 标尺背景
    ctx.fillStyle = '#E0E0E0'
    ctx.fillRect(0, 0, w, RULER)
    ctx.fillRect(0, h - RULER, w, RULER)
    ctx.fillRect(0, 0, RULER, h)
    ctx.fillRect(w - RULER, 0, RULER, h)

    const area = {
      left: RULER + PAD, top: RULER + PAD,
      width: w - 2 * (RULER + PAD),
      height: h - 2 * (RULER + PAD),
    }

    const gridW = cols * s
    const gridH = rows * s
    const originX = area.left + (area.width - gridW) / 2 + panX.value
    const originY = area.top + (area.height - gridH) / 2 + panY.value

    ctx.strokeStyle = '#BBB'
    ctx.lineWidth = 1
    ctx.strokeRect(area.left - PAD, area.top - PAD, area.width + PAD * 2, area.height + PAD * 2)

    ctx.save()
    ctx.beginPath()
    ctx.rect(originX, originY, gridW, gridH)
    ctx.clip()
    ctx.translate(originX, originY)

    const gap = s > 3 ? 1 : 0

    // 色块
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const code = gridData.value[r]?.[c]
        const x = c * s, y = r * s, size = s - gap
        if (code) {
          ctx.fillStyle = colorMap.value[code] || '#F0F0F0'
          if (highlightCode.value && code !== highlightCode.value) ctx.globalAlpha = 0.25
          ctx.fillRect(x, y, size, size)
          ctx.globalAlpha = 1
        } else {
          // 棋盘格（空格子）
          const sq = Math.max(2, Math.ceil(s / 5))
          for (let sr = 0; sr < size; sr += sq) {
            for (let sc = 0; sc < size; sc += sq) {
              const isLight = ((sr / sq | 0) + (sc / sq | 0)) % 2 === 0
              ctx.fillStyle = isLight ? '#F8F8F8' : '#DCDCDC'
              ctx.globalAlpha = 0.8
              ctx.fillRect(x + sc, y + sr, Math.min(sq, size - sc), Math.min(sq, size - sr))
            }
          }
          ctx.globalAlpha = 1
        }
      }
    }

    // 每5格网格线
    ctx.strokeStyle = '#777'; ctx.lineWidth = Math.min(1, s * 0.05)
    ctx.beginPath()
    for (let c = 5; c < cols; c += 5) { ctx.moveTo(c * s, 0); ctx.lineTo(c * s, rows * s) }
    for (let r = 5; r < rows; r += 5) { ctx.moveTo(0, r * s); ctx.lineTo(cols * s, r * s) }
    ctx.stroke()

    // 外边框
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2
    ctx.strokeRect(0, 0, cols * s, rows * s)

    // 色号文字
    if (s >= 20) {
      const fontSize = Math.max(6, Math.min(s * 0.4, 16))
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const code = gridData.value[r]?.[c]
          if (!code) continue
          if (highlightCode.value && code !== highlightCode.value) continue
          if (showCounts && highlightCode.value && code === highlightCode.value) continue
          const hex = colorMap.value[code] || '#F0F0F0'
          const rr = parseInt(hex.slice(1, 3), 16)
          const gg = parseInt(hex.slice(3, 5), 16)
          const bb = parseInt(hex.slice(5, 7), 16)
          const lum = 0.299 * rr + 0.587 * gg + 0.114 * bb
          ctx.fillStyle = lum > 140 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'
          ctx.fillText(code, c * s + s / 2, r * s + s / 2)
        }
      }
    }

    // 高亮描边（整体轮廓）
    if (highlightCode.value && showHighlightBorder) {
      const target = highlightCode.value
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (gridData.value[r]?.[c] !== target) continue
          const x = c * s, y = r * s
          const top = r === 0 || gridData.value[r - 1]?.[c] !== target
          const bottom = r === rows - 1 || gridData.value[r + 1]?.[c] !== target
          const left = c === 0 || gridData.value[r]?.[c - 1] !== target
          const right = c === cols - 1 || gridData.value[r]?.[c + 1] !== target
          if (top) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.stroke() }
          if (bottom) { ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s, y + s); ctx.stroke() }
          if (left) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + s); ctx.stroke() }
          if (right) { ctx.beginPath(); ctx.moveTo(x + s, y); ctx.lineTo(x + s, y + s); ctx.stroke() }
        }
      }
    }

    // 行内编号（仅 view 模式）
    if (highlightCode.value && showHighlightCounts) {
      const target = highlightCode.value
      if (s >= 10) {
        const nFontSize = Math.max(8, Math.min(s * 0.6, 16))
        ctx.font = `bold ${nFontSize}px sans-serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        for (let r = 0; r < rows; r++) {
          let num = 0
          for (let c = 0; c < cols; c++) {
            if (gridData.value[r]?.[c] === target) {
              num++
              const hex = colorMap.value[target] || '#F0F0F0'
              const rr = parseInt(hex.slice(1, 3), 16)
              const gg = parseInt(hex.slice(3, 5), 16)
              const bb = parseInt(hex.slice(5, 7), 16)
              const lum = 0.299 * rr + 0.587 * gg + 0.114 * bb
              ctx.fillStyle = lum > 140 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)'
              ctx.fillText(num, c * s + s / 2, r * s + s / 2)
            } else { num = 0 }
          }
        }
      }
    }

    ctx.restore()

    // 标尺覆盖层
    ctx.fillStyle = '#E0E0E0'
    ctx.fillRect(0, 0, w, RULER); ctx.fillRect(0, h - RULER, w, RULER)
    ctx.fillRect(0, 0, RULER, h); ctx.fillRect(w - RULER, 0, RULER, h)
    ctx.strokeStyle = '#BBB'; ctx.lineWidth = 1
    ctx.strokeRect(area.left - PAD, area.top - PAD, area.width + PAD * 2, area.height + PAD * 2)

    drawRulers(ctx, w, h, rows, cols, s, originX, originY)

    // 单格高亮（替换工具点击画面时）
    if (opts.selectedCell && opts.selectedCell.value) {
      const sc = opts.selectedCell.value
      if (sc.row >= 0 && sc.row < rows && sc.col >= 0 && sc.col < cols) {
        const x = originX + sc.col * s, y = originY + sc.row * s
        ctx.strokeStyle = '#3B82F6'; ctx.lineWidth = 3
        ctx.strokeRect(x + 1, y + 1, s - 2, s - 2)
      }
    }

    // 悬停预览（替换工具鼠标移动时）
    if (opts.hoverCell && opts.hoverCell.value) {
      const hc = opts.hoverCell.value
      if (hc.row >= 0 && hc.row < rows && hc.col >= 0 && hc.col < cols) {
        const x = originX + hc.col * s, y = originY + hc.row * s
        ctx.strokeStyle = '#93C5FD'; ctx.lineWidth = 2
        ctx.strokeRect(x + 1, y + 1, s - 2, s - 2)
      }
    }
  }

  function drawRulers(ctx, w, h, rows, cols, s, originX, originY) {
    const area = {
      left: RULER + PAD, top: RULER + PAD,
      width: w - 2 * (RULER + PAD),
      height: h - 2 * (RULER + PAD),
    }
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#555'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1
    const interval = Math.max(1, Math.ceil(30 / s))

    // 上
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, RULER); ctx.clip()
    for (let c = 0; c < cols; c += interval) {
      const cx = originX + c * s + s / 2
      if (cx < area.left || cx > area.left + area.width) continue
      ctx.beginPath(); ctx.moveTo(cx, RULER - 5); ctx.lineTo(cx, RULER); ctx.stroke()
      ctx.fillText(c + 1, cx, (RULER - 5) / 2)
    }
    ctx.restore()

    // 下
    ctx.save(); ctx.beginPath(); ctx.rect(0, h - RULER, w, RULER); ctx.clip()
    for (let c = 0; c < cols; c += interval) {
      const cx = originX + c * s + s / 2
      if (cx < area.left || cx > area.left + area.width) continue
      ctx.beginPath(); ctx.moveTo(cx, h - RULER); ctx.lineTo(cx, h - RULER + 5); ctx.stroke()
      ctx.fillText(c + 1, cx, h - RULER + 5 + (RULER - 5) / 2)
    }
    ctx.restore()

    // 左
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, RULER, h); ctx.clip()
    for (let r = 0; r < rows; r += interval) {
      const cy = originY + r * s + s / 2
      if (cy < area.top || cy > area.top + area.height) continue
      ctx.beginPath(); ctx.moveTo(RULER - 5, cy); ctx.lineTo(RULER, cy); ctx.stroke()
      ctx.fillText(r + 1, (RULER - 5) / 2, cy)
    }
    ctx.restore()

    // 右
    ctx.save(); ctx.beginPath(); ctx.rect(w - RULER, 0, RULER, h); ctx.clip()
    for (let r = 0; r < rows; r += interval) {
      const cy = originY + r * s + s / 2
      if (cy < area.top || cy > area.top + area.height) continue
      ctx.beginPath(); ctx.moveTo(w - RULER, cy); ctx.lineTo(w - RULER + 5, cy); ctx.stroke()
      ctx.fillText(r + 1, w - RULER + 5 + (RULER - 5) / 2, cy)
    }
    ctx.restore()
  }

  function initWorkspace(workspaceRef) {
    const workspace = workspaceRef.value
    const canvas = canvasRef.value
    if (!workspace || !canvas || !gridData.value.length) return
    const rect = workspace.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const areaW = rect.width - 2 * (RULER + PAD)
    const areaH = rect.height - 2 * (RULER + PAD)
    const scaleW = areaW / project.value.grid_cols
    const scaleH = areaH / project.value.grid_rows
    fitScale.value = Math.max(1, Math.min(scaleW, scaleH, MAX_CELL))
    cellSize.value = fitScale.value
    zoomPercent.value = 0
    panX.value = 0
    panY.value = 0
    doRender()
  }

  function resetView() {
    cellSize.value = fitScale.value
    zoomPercent.value = 0
    panX.value = 0
    panY.value = 0
  }

  function handleWheel(e) {
    const baseS = fitScale.value
    if (baseS >= MAX_CELL) return
    let newScale = e.deltaY < 0 ? cellSize.value * 1.1 : cellSize.value * 0.9
    newScale = Math.max(baseS, Math.min(MAX_CELL, newScale))
    if (newScale === cellSize.value) return

    const canvas = canvasRef.value
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cols = project.value.grid_cols
    const rows = project.value.grid_rows
    const area = {
      left: RULER + PAD, top: RULER + PAD,
      width: canvas.width - 2 * (RULER + PAD),
      height: canvas.height - 2 * (RULER + PAD),
    }
    const oldGridW = cols * cellSize.value
    const oldGridH = rows * cellSize.value
    const originX = area.left + (area.width - oldGridW) / 2 + panX.value
    const originY = area.top + (area.height - oldGridH) / 2 + panY.value
    const gx = mx - originX
    const gy = my - originY

    const ratio = newScale / cellSize.value
    cellSize.value = newScale
    zoomPercent.value = Math.round((newScale - baseS) / (MAX_CELL - baseS) * 100)
    const newGridW = cols * newScale
    const newGridH = rows * newScale
    panX.value = (mx - gx * ratio) - area.left - (area.width - newGridW) / 2
    panY.value = (my - gy * ratio) - area.top - (area.height - newGridH) / 2
    doRender()
  }

  function getCellFromEvent(e) {
    const canvas = canvasRef.value
    const rect = canvas.getBoundingClientRect()
    const s = cellSize.value
    const cols = project.value.grid_cols
    const gridW = cols * s
    const gridH = project.value.grid_rows * s
    const area = {
      left: RULER + PAD, top: RULER + PAD,
      width: canvas.width - 2 * (RULER + PAD),
      height: canvas.height - 2 * (RULER + PAD),
    }
    const originX = area.left + (area.width - gridW) / 2 + panX.value
    const originY = area.top + (area.height - gridH) / 2 + panY.value
    const col = Math.floor((e.clientX - rect.left - originX) / s)
    const row = Math.floor((e.clientY - rect.top - originY) / s)
    return { row, col }
  }

  return {
    zoomPercent, fitScale, cellSize, panX, panY,
    render, doRender, initWorkspace, resetView, handleWheel, getCellFromEvent,
  }
}
