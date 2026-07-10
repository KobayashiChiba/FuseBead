<template>
  <div class="view-page" style="display:flex;flex-direction:column;width:100vw;height:100vh;overflow:hidden;">
    <!-- Loading Overlay -->
    <div class="view-overlay" v-if="loading">
      <div class="view-overlay-content">
        <div class="spinner"></div>
        <p>正在加载拼豆图纸...</p>
      </div>
    </div>

    <!-- Error Overlay -->
    <div class="view-overlay" v-if="errorMsg">
      <div class="view-overlay-content">
        <p class="error-msg">{{ errorMsg }}</p>
        <router-link to="/" class="btn btn-primary">返回首页</router-link>
      </div>
    </div>

    <!-- Main Layout -->
    <div class="view-layout" v-if="!loading && !errorMsg">
      <!-- Left: Workspace -->
      <div class="workspace" ref="workspace">
        <div class="workspace-title">拼豆图纸</div>
        <canvas ref="beadCanvas"></canvas>
        <div class="cell-info-panel" :class="{ show: selectedCell }">
          <button class="close-info" @click="closeCellInfo">✕</button>
          <div v-if="selectedCell">
            <div class="info-row">
              <div class="color-swatch" :style="{ background: selectedCell.hex }"></div>
              <div class="info-text">
                <strong>色号:</strong> {{ selectedCell.code }}<br>
                <strong>位置:</strong> 第 {{ selectedCell.row + 1 }} 行, 第 {{ selectedCell.col + 1 }} 列<br>
                <strong>RGB:</strong> ({{ selectedCell.r }}, {{ selectedCell.g }}, {{ selectedCell.b }})<br>
                <strong>Hex:</strong> {{ selectedCell.hex }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Toolbar -->
      <div class="toolbar">
        <div class="toolbar-zone toolbar-zone-1">
          <router-link to="/" class="btn btn-outline btn-sm">返回首页</router-link>
        </div>

        <div class="toolbar-zone toolbar-zone-2">
          <div class="color-stats-label">颜色统计</div>
          <div class="color-stats">
            <button
              v-for="stat in beadStats"
              :key="stat.code"
              class="color-stat-btn"
              :class="{ active: activeHighlightCode === stat.code }"
              @click="toggleHighlight(stat.code)"
            >
              <span class="swatch" :style="{ background: getStatColor(stat.code) }"></span>
              {{ stat.code }} <span class="count">{{ stat.count }}</span>
            </button>
          </div>
          <div class="clear-highlight-wrap">
            <button class="btn btn-outline btn-sm" @click="centerWorkspace">恢复居中</button>
            <button class="btn btn-outline btn-sm" @click="clearHighlights">清除高亮</button>
          </div>
        </div>

        <div class="toolbar-zone toolbar-zone-3">
          <div class="zoom-control">
            <span class="zoom-label">缩放</span>
            <input type="range" min="0" max="100" :value="zoomSliderPercent" @input="onZoomSliderChange" :disabled="baseScale >= MAX_CELL_SIZE">
            <span class="zoom-value">{{ zoomDisplay }}</span>
          </div>
        </div>

        <div class="toolbar-zone toolbar-zone-4">
          <button class="btn btn-primary btn-sm" @click="showSaveDialog">保存项目</button>
          <button class="btn btn-success btn-sm" ref="exportBtn" @click="exportImage">导出图片</button>
        </div>
      </div>
    </div>

    <!-- Save Dialog -->
    <div class="modal-overlay" v-if="saveDialogVisible" @click.self="closeSaveDialog">
      <div class="modal-content" @click.stop>
        <h3 style="margin-bottom:12px;">保存项目</h3>
        <div class="form-group">
          <label for="projectName">项目名称</label>
          <input class="form-input" type="text" v-model="projectName" maxlength="100" placeholder="输入项目名称..." ref="projectNameInput">
        </div>
        <div class="btn-group center">
          <button class="btn btn-outline" @click="closeSaveDialog">取消</button>
          <button class="btn btn-primary" ref="saveConfirmBtn" @click="doSaveProject">保存</button>
        </div>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:8px;text-align:center;">{{ saveStatus }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { toast, showLoading, hideLoading } from '../utils/common.js'

const route = useRoute()

// ── Constants ──
const MAX_CELL_SIZE = 80
const MIN_CODE_FONT = 10
const MAX_SCALE = MAX_CELL_SIZE
const RULER_SIZE = 24
const INNER_PAD = 4
const GRID_LINE_COLOR = '#777'
const GRID_BORDER_COLOR = '#000'
const RULER_BG = '#E0E0E0'
const RULER_TEXT_COLOR = '#555'

// ── State ──
const loading = ref(true)
const errorMsg = ref('')
const taskId = ref(null)
const isProject = ref(false)
const colorData = ref(null)
const beadStats = ref([])
const rows = ref(0)
const cols = ref(0)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const baseScale = ref(1)
const activeHighlightCode = ref(null)
const selectedCellVal = ref(null)
const saveDialogVisible = ref(false)
const projectName = ref('')
const saveStatus = ref('')

// ── Drag state ──
const dragState = reactive({
  isDragging: false,
  startX: 0, startY: 0,
  startOffsetX: 0, startOffsetY: 0,
})

// ── Touch state ──
let touchStartDist = 0
let touchStartScale = 1

// ── Refs ──
const workspace = ref(null)
const beadCanvas = ref(null)
const exportBtn = ref(null)
const saveConfirmBtn = ref(null)
const projectNameInput = ref(null)

// ── Computed ──
const selectedCell = computed(() => selectedCellVal.value)
const zoomSliderPercent = computed(() => {
  if (!baseScale.value || baseScale.value >= MAX_SCALE) return 100
  return Math.round(((scale.value - baseScale.value) / (MAX_SCALE - baseScale.value)) * 100)
})
const zoomDisplay = computed(() => {
  if (!baseScale.value || baseScale.value >= MAX_SCALE) return '已达最大'
  return Math.round((scale.value / baseScale.value) * 100) + '%'
})

// ── Init ──
onMounted(() => {
  const params = new URLSearchParams(window.location.search || route.query)
  const tid = params.get('task_id')
  const pid = params.get('project_id')

  if (tid) {
    taskId.value = tid
    isProject.value = tid.startsWith('project_')
    loadFromTask(tid)
  } else if (pid) {
    taskId.value = 'project_' + pid
    isProject.value = true
    loadFromProject(pid)
  } else {
    loading.value = false
    errorMsg.value = '未指定任务或项目ID。'
  }

  nextTick(() => {
    setupEvents()
  })
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('resize', onResize)
})

// ═══ Data Loading ═══
function loadFromTask(tid) {
  fetch('/api/task/' + tid)
    .then(r => r.json())
    .then(data => {
      if (data.status !== 'complete') {
        errorMsg.value = '任务尚未完成，请返回识别页面重试。'
        loading.value = false
        return
      }
      return fetch('/api/task/' + tid + '/color-codes')
    })
    .then(r => {
      if (!r || !r.ok) throw new Error('获取数据失败')
      return r.json()
    })
    .then(data => {
      colorData.value = data.data
      beadStats.value = data.stats
      rows.value = data.rows
      cols.value = data.cols
      loading.value = false
      nextTick(() => initWorkspace())
      fetch('/api/render/' + tid).catch(() => {})
    })
    .catch(err => {
      loading.value = false
      if (err !== 'incomplete' && err.message !== '获取数据失败') errorMsg.value = '加载失败: ' + err.message
    })
}

function loadFromProject(pid) {
  fetch('/api/projects/' + pid)
    .then(r => {
      if (!r.ok) throw new Error('项目不存在')
      return r.json()
    })
    .then(data => {
      if (data.error) { errorMsg.value = data.error; loading.value = false; return }
      colorData.value = data.color_data.data
      beadStats.value = data.color_data.stats
      rows.value = data.color_data.rows
      cols.value = data.color_data.cols
      loading.value = false
      nextTick(() => initWorkspace())
    })
    .catch(err => {
      loading.value = false
      errorMsg.value = '加载项目失败: ' + err.message
    })
}

// ═══ Grid Helpers ═══
function getGridArea() {
  const canvas = beadCanvas.value
  if (!canvas) return { left: 24, top: 24, w: 800, h: 600 }
  return {
    left: RULER_SIZE + INNER_PAD,
    top: RULER_SIZE + INNER_PAD,
    w: canvas.width - 2 * (RULER_SIZE + INNER_PAD),
    h: canvas.height - 2 * (RULER_SIZE + INNER_PAD),
  }
}

function getGridOrigin() {
  const area = getGridArea()
  const gridW = cols.value * scale.value
  const gridH = rows.value * scale.value
  return {
    x: area.left + (area.w - gridW) / 2 + offsetX.value,
    y: area.top + (area.h - gridH) / 2 + offsetY.value,
    gridW, gridH,
  }
}

// ═══ Workspace ═══
function initWorkspace() {
  const ws = workspace.value
  const canvas = beadCanvas.value
  if (!ws || !canvas) return
  const rect = ws.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height

  const area = getGridArea()
  const fitScaleW = area.w / cols.value
  const fitScaleH = area.h / rows.value
  baseScale.value = Math.min(fitScaleW, fitScaleH)
  scale.value = baseScale.value
  offsetX.value = 0
  offsetY.value = 0

  render()
}

// ═══ Render ═══
function render() {
  const canvas = beadCanvas.value
  if (!canvas || !colorData.value) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#F0F0F0'
  ctx.fillRect(0, 0, w, h)

  // Ruler backgrounds
  ctx.fillStyle = RULER_BG
  ctx.fillRect(0, 0, w, RULER_SIZE)
  ctx.fillRect(0, h - RULER_SIZE, w, RULER_SIZE)
  ctx.fillRect(0, 0, RULER_SIZE, h)
  ctx.fillRect(w - RULER_SIZE, 0, RULER_SIZE, h)

  const a = getGridArea()
  ctx.strokeStyle = '#BBB'
  ctx.lineWidth = 1
  ctx.strokeRect(a.left - INNER_PAD, a.top - INNER_PAD, a.w + INNER_PAD * 2, a.h + INNER_PAD * 2)

  const origin = getGridOrigin()
  ctx.save()
  ctx.beginPath()
  ctx.rect(origin.x, origin.y, origin.gridW, origin.gridH)
  ctx.clip()
  ctx.translate(origin.x, origin.y)

  const data = colorData.value
  const s = scale.value
  const showCodes = s >= MIN_CODE_FONT
  const fontSize = Math.max(6, Math.min(s * 0.55, 14))
  const highlighting = !!activeHighlightCode.value
  const gap = s > 3 ? 1 : 0

  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      const cell = data[r][c]
      const x = c * s
      const y = r * s

      if (cell) {
        ctx.fillStyle = cell.hex
        if (highlighting && cell.code !== activeHighlightCode.value) {
          ctx.globalAlpha = 0.25
        }
        ctx.fillRect(x, y, s - gap, s - gap)
        ctx.globalAlpha = 1

        if (selectedCellVal.value && selectedCellVal.value.row === r && selectedCellVal.value.col === c) {
          ctx.strokeStyle = '#4A90D9'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, s - gap - 2, s - gap - 2)
        }
        if (highlighting && cell.code === activeHighlightCode.value) {
          ctx.strokeStyle = '#FFD700'
          ctx.lineWidth = 2
          ctx.strokeRect(x + 1, y + 1, s - gap - 2, s - gap - 2)
        }

        if (showCodes) {
          ctx.fillStyle = getContrastColor(cell.r, cell.g, cell.b)
          ctx.font = `${fontSize}px -apple-system, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(cell.code, x + s / 2, y + s / 2)
        }
      } else {
        ctx.fillStyle = '#E8E8E8'
        ctx.globalAlpha = 0.3
        ctx.fillRect(x, y, s - gap, s - gap)
        ctx.globalAlpha = 1
      }
    }
  }

  // Grid lines every 5 cells
  ctx.strokeStyle = GRID_LINE_COLOR
  ctx.lineWidth = Math.min(1, s * 0.05)
  ctx.beginPath()
  for (let c = 5; c < cols.value; c += 5) {
    const x = c * s
    ctx.moveTo(x, 0)
    ctx.lineTo(x, rows.value * s)
  }
  for (let r = 5; r < rows.value; r += 5) {
    const y = r * s
    ctx.moveTo(0, y)
    ctx.lineTo(cols.value * s, y)
  }
  ctx.stroke()

  ctx.strokeStyle = GRID_BORDER_COLOR
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, cols.value * s, rows.value * s)
  ctx.restore()

  // Redraw ruler backgrounds on top
  ctx.fillStyle = RULER_BG
  ctx.fillRect(0, 0, w, RULER_SIZE)
  ctx.fillRect(0, h - RULER_SIZE, w, RULER_SIZE)
  ctx.fillRect(0, 0, RULER_SIZE, h)
  ctx.fillRect(w - RULER_SIZE, 0, RULER_SIZE, h)

  const a2 = getGridArea()
  ctx.strokeStyle = '#BBB'
  ctx.lineWidth = 1
  ctx.strokeRect(a2.left - INNER_PAD, a2.top - INNER_PAD, a2.w + INNER_PAD * 2, a2.h + INNER_PAD * 2)

  drawRulers(ctx, w, h, origin)
}

function drawRulers(ctx, w, h, origin) {
  const s = scale.value
  const area = getGridArea()
  const rulerFontSize = 10
  ctx.font = `${rulerFontSize}px -apple-system, sans-serif`
  ctx.fillStyle = RULER_TEXT_COLOR
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const interval = Math.max(1, Math.ceil((rulerFontSize * 3) / s))
  const tickLen = 5
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1

  // Top ruler
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, w, RULER_SIZE); ctx.clip()
  for (let c = 0; c < cols.value; c += interval) {
    const cx = origin.x + c * s + s / 2
    if (cx < area.left || cx > area.left + area.w) continue
    ctx.beginPath(); ctx.moveTo(cx, RULER_SIZE - tickLen); ctx.lineTo(cx, RULER_SIZE); ctx.stroke()
  }
  for (let c = 0; c < cols.value; c += interval) {
    const cx = origin.x + c * s + s / 2
    if (cx < area.left || cx > area.left + area.w) continue
    ctx.fillText(c + 1, cx, (RULER_SIZE - tickLen) / 2)
  }
  ctx.restore()

  // Bottom ruler
  ctx.save()
  ctx.beginPath(); ctx.rect(0, h - RULER_SIZE, w, RULER_SIZE); ctx.clip()
  for (let c = 0; c < cols.value; c += interval) {
    const cx = origin.x + c * s + s / 2
    if (cx < area.left || cx > area.left + area.w) continue
    ctx.beginPath(); ctx.moveTo(cx, h - RULER_SIZE); ctx.lineTo(cx, h - RULER_SIZE + tickLen); ctx.stroke()
  }
  for (let c = 0; c < cols.value; c += interval) {
    const cx = origin.x + c * s + s / 2
    if (cx < area.left || cx > area.left + area.w) continue
    ctx.fillText(c + 1, cx, h - RULER_SIZE + tickLen + (RULER_SIZE - tickLen) / 2)
  }
  ctx.restore()

  // Left ruler
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, RULER_SIZE, h); ctx.clip()
  for (let r = 0; r < rows.value; r += interval) {
    const cy = origin.y + r * s + s / 2
    if (cy < area.top || cy > area.top + area.h) continue
    ctx.beginPath(); ctx.moveTo(RULER_SIZE - tickLen, cy); ctx.lineTo(RULER_SIZE, cy); ctx.stroke()
  }
  for (let r = 0; r < rows.value; r += interval) {
    const cy = origin.y + r * s + s / 2
    if (cy < area.top || cy > area.top + area.h) continue
    ctx.fillText(r + 1, (RULER_SIZE - tickLen) / 2, cy)
  }
  ctx.restore()

  // Right ruler
  ctx.save()
  ctx.beginPath(); ctx.rect(w - RULER_SIZE, 0, RULER_SIZE, h); ctx.clip()
  for (let r = 0; r < rows.value; r += interval) {
    const cy = origin.y + r * s + s / 2
    if (cy < area.top || cy > area.top + area.h) continue
    ctx.beginPath(); ctx.moveTo(w - RULER_SIZE, cy); ctx.lineTo(w - RULER_SIZE + tickLen, cy); ctx.stroke()
  }
  for (let r = 0; r < rows.value; r += interval) {
    const cy = origin.y + r * s + s / 2
    if (cy < area.top || cy > area.top + area.h) continue
    ctx.fillText(r + 1, w - RULER_SIZE + tickLen + (RULER_SIZE - tickLen) / 2, cy)
  }
  ctx.restore()
}

// ═══ Color Utilities ═══
function getContrastColor(r, g, b) {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 140 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'
}

function getStatColor(code) {
  if (!colorData.value) return '#CCC'
  for (const row of colorData.value) {
    for (const cell of row) {
      if (cell && cell.code === code) return cell.hex
    }
  }
  return '#CCC'
}

function canvasToGrid(clientX, clientY) {
  const canvas = beadCanvas.value
  if (!canvas) return { row: -1, col: -1 }
  const rect = canvas.getBoundingClientRect()
  const origin = getGridOrigin()
  const sx = clientX - rect.left - origin.x
  const sy = clientY - rect.top - origin.y
  return { row: Math.floor(sy / scale.value), col: Math.floor(sx / scale.value) }
}

// ═══ Zoom ═══
function centerWorkspace() {
  scale.value = baseScale.value
  offsetX.value = 0
  offsetY.value = 0
  render()
}

function onZoomSliderChange(e) {
  if (!baseScale.value || baseScale.value >= MAX_SCALE) return
  const pct = parseInt(e.target.value) / 100
  scale.value = baseScale.value + (MAX_SCALE - baseScale.value) * pct
  render()
}

// ═══ Events ═══
function setupEvents() {
  const canvas = beadCanvas.value
  if (!canvas) return
  canvas.style.cursor = 'grab'

  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('touchstart', onTouchStart, { passive: false })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd)
  canvas.addEventListener('click', onCanvasClick)

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('resize', onResize)
}

function onWheel(e) {
  e.preventDefault()
  const bs = baseScale.value
  if (!bs || bs >= MAX_SCALE) return

  const zoomSpeed = 0.1
  let newScale = e.deltaY < 0 ? scale.value * (1 + zoomSpeed) : scale.value * (1 - zoomSpeed)
  newScale = Math.max(bs, Math.min(MAX_SCALE, newScale))
  if (newScale === scale.value) return

  const canvas = beadCanvas.value
  const rect = canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const origin = getGridOrigin()
  const gx = mx - origin.x
  const gy = my - origin.y
  const scaleChange = newScale / scale.value

  const area = getGridArea()
  const newGridW = cols.value * newScale
  const newGridH = rows.value * newScale
  const targetOx = mx - gx * scaleChange
  const targetOy = my - gy * scaleChange

  scale.value = newScale
  offsetX.value = targetOx - area.left - (area.w - newGridW) / 2
  offsetY.value = targetOy - area.top - (area.h - newGridH) / 2
  render()
}

function onMouseDown(e) {
  dragState.isDragging = true
  dragState.startX = e.clientX
  dragState.startY = e.clientY
  dragState.startOffsetX = offsetX.value
  dragState.startOffsetY = offsetY.value
  beadCanvas.value.style.cursor = 'grabbing'
}

function onMouseMove(e) {
  if (!dragState.isDragging) return
  offsetX.value = dragState.startOffsetX + (e.clientX - dragState.startX)
  offsetY.value = dragState.startOffsetY + (e.clientY - dragState.startY)
  render()
}

function onMouseUp() {
  if (dragState.isDragging) {
    dragState.isDragging = false
    if (beadCanvas.value) beadCanvas.value.style.cursor = 'grab'
  }
}

function onTouchStart(e) {
  if (e.touches.length === 1) {
    dragState.isDragging = true
    dragState.startX = e.touches[0].clientX
    dragState.startY = e.touches[0].clientY
    dragState.startOffsetX = offsetX.value
    dragState.startOffsetY = offsetY.value
  } else if (e.touches.length === 2) {
    e.preventDefault()
    dragState.isDragging = false
    const t1 = e.touches[0], t2 = e.touches[1]
    touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    touchStartScale = scale.value
  }
}

function onTouchMove(e) {
  if (e.touches.length === 1 && dragState.isDragging) {
    offsetX.value = dragState.startOffsetX + (e.touches[0].clientX - dragState.startX)
    offsetY.value = dragState.startOffsetY + (e.touches[0].clientY - dragState.startY)
    render()
  } else if (e.touches.length === 2) {
    e.preventDefault()
    if (!baseScale.value || baseScale.value >= MAX_SCALE) return
    const t1 = e.touches[0], t2 = e.touches[1]
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    if (touchStartDist === 0) return
    let ns = touchStartScale * (dist / touchStartDist)
    ns = Math.max(baseScale.value, Math.min(MAX_SCALE, ns))
    scale.value = ns
    render()
  }
}

function onTouchEnd() {
  dragState.isDragging = false
}

function onCanvasClick(e) {
  const pos = canvasToGrid(e.clientX, e.clientY)
  if (pos.row < 0 || pos.row >= rows.value || pos.col < 0 || pos.col >= cols.value) {
    closeCellInfo()
    return
  }
  const cell = colorData.value[pos.row][pos.col]
  if (cell) {
    selectedCellVal.value = cell
    render()
  } else {
    closeCellInfo()
  }
}

// ═══ Cell Info ═══
function closeCellInfo() {
  selectedCellVal.value = null
  render()
}

// ═══ Highlight ═══
function toggleHighlight(code) {
  if (activeHighlightCode.value === code) {
    clearHighlights()
  } else {
    activeHighlightCode.value = code
    const stat = beadStats.value.find(s => s.code === code)
    toast('高亮色号 ' + code + '（' + (stat ? stat.count : 0) + ' 个格子）')
  }
  render()
}

function clearHighlights() {
  activeHighlightCode.value = null
  render()
}

// ═══ Export ═══
function exportImage() {
  const btn = exportBtn.value
  showLoading(btn)

  if (isProject.value) {
    const pid = taskId.value.replace('project_', '')
    fetch('/api/projects/' + pid + '/export')
      .then(r => { if (!r.ok) throw Error('导出失败'); return r.blob() })
      .then(blob => {
        downloadBlob(blob, 'bead_project.png')
        hideLoading(btn); toast('图纸已导出')
      })
      .catch(err => { hideLoading(btn); toast('导出失败: ' + err.message) })
    return
  }

  if (!taskId.value) { toast('没有可导出的图纸'); return }

  fetch('/api/render/' + taskId.value)
    .then(r => r.json())
    .then(data => {
      if (data.error) { hideLoading(btn); toast(data.error); return }
      return fetch('/api/export/' + taskId.value)
    })
    .then(r => { if (!r || !r.ok) throw Error(); return r.blob() })
    .then(blob => {
      if (!blob) return
      downloadBlob(blob, 'bead_art_' + taskId.value.slice(0, 8) + '.png')
      hideLoading(btn); toast('图纸已导出')
    })
    .catch(err => { hideLoading(btn); toast('导出失败: ' + err.message) })
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ═══ Save Project ═══
function showSaveDialog() {
  if (isProject.value) { toast('已保存的项目无法再次保存'); return }
  if (!taskId.value) { toast('没有可保存的内容'); return }
  projectName.value = ''
  saveStatus.value = ''
  saveDialogVisible.value = true
  nextTick(() => projectNameInput.value?.focus())
}

function closeSaveDialog() {
  saveDialogVisible.value = false
}

function doSaveProject() {
  const name = projectName.value.trim()
  if (!name) { saveStatus.value = '请输入项目名称'; return }

  const btn = saveConfirmBtn.value
  showLoading(btn)
  saveStatus.value = '保存中...'

  fetch('/api/projects/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, task_id: taskId.value }),
  })
    .then(r => r.json())
    .then(data => {
      hideLoading(btn)
      if (data.error) { saveStatus.value = data.error; return }
      saveStatus.value = '已保存: ' + data.name
      setTimeout(closeSaveDialog, 1000)
    })
    .catch(err => {
      hideLoading(btn)
      saveStatus.value = '保存失败: ' + err.message
    })
}

// ═══ Resize ═══
let resizeTimer
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (!colorData.value) return
    const ws = workspace.value
    const canvas = beadCanvas.value
    if (!ws || !canvas) return
    const rect = ws.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const area = getGridArea()
    const fitScaleW = area.w / cols.value
    const fitScaleH = area.h / rows.value
    const newBase = Math.min(fitScaleW, fitScaleH)
    const ratio = newBase / baseScale.value

    baseScale.value = newBase
    scale.value = Math.max(newBase, Math.min(MAX_SCALE, scale.value * ratio))
    offsetX.value *= ratio
    offsetY.value *= ratio
    render()
  }, 200)
}
</script>
