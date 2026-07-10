<template>
  <div>
    <!-- Toast for main page -->
    <div class="toast" id="convertToast" ref="mainToast"></div>

    <!-- Header (hidden during position step) -->
    <header class="header" v-show="currentStep !== 3" ref="pageHeader">
      <div class="header-inner">
        <h1>🧩 拼豆识别</h1>
        <span class="subtitle">图片转换</span>
      </div>
    </header>

    <!-- Step Indicators (hidden during position step) -->
    <div class="step-indicators" v-show="currentStep !== 3" ref="stepIndicators">
      <div class="step-dot" :class="{ active: currentStep === 1, done: currentStep > 1 }" @click="currentStep > 1 ? goToStep(1) : null">
        <span class="circle">1</span>
        <span class="label">上传</span>
      </div>
      <span class="step-line" :class="{ done: currentStep > 1 }"></span>
      <div class="step-dot" :class="{ active: currentStep === 2, done: currentStep > 2 }" @click="currentStep > 2 ? goToStep(2) : null">
        <span class="circle">2</span>
        <span class="label">裁剪</span>
      </div>
      <span class="step-line" :class="{ done: currentStep > 2 }"></span>
      <div class="step-dot" :class="{ active: currentStep === 3, done: currentStep > 3 }" @click="currentStep > 3 ? goToStep(3) : null">
        <span class="circle">3</span>
        <span class="label">定位</span>
      </div>
      <span class="step-line" :class="{ done: currentStep > 3 }"></span>
      <div class="step-dot" :class="{ active: currentStep === 4, done: currentStep > 4 }">
        <span class="circle">4</span>
        <span class="label">识别</span>
      </div>
    </div>

    <!-- Main Container (Steps 1, 2, 4) -->
    <div class="container" v-show="currentStep !== 3" ref="mainContainer">
      <!-- Step 1: Upload -->
      <div class="step-card" :class="{ active: currentStep === 1 }">
        <h2>📤 上传图片</h2>
        <p class="step-desc">选择一张需要转换的图片</p>
        <div
          class="upload-zone"
          :class="{ dragover: dragOver }"
          @click="triggerUpload"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="onDrop"
        >
          <div class="icon">📁</div>
          <div class="hint">点击或拖拽图片到此处</div>
          <div class="sub-hint">支持 JPG / PNG / WebP / BMP，最大 50MB</div>
          <input type="file" ref="fileInput" accept="image/*" @change="onFileChange">
        </div>
        <div class="preview-wrap" :style="{ display: state.imageUrl ? 'block' : 'none' }">
          <img :src="state.imageUrl" alt="预览">
          <div class="file-info">{{ fileInfo }}</div>
          <div class="btn-group center">
            <button class="btn btn-outline" @click="resetUpload">重新选择</button>
            <button class="btn btn-primary" @click="goToStep(2)">下一步：裁剪</button>
          </div>
        </div>
      </div>

      <!-- Step 2: Crop -->
      <div class="step-card" :class="{ active: currentStep === 2 }">
        <h2>✂️ 裁剪区域</h2>
        <p class="step-desc">裁剪出需要转换的图片区域</p>
        <div class="crop-container">
          <img ref="cropImage" alt="裁剪">
        </div>
        <div class="btn-group between">
          <button class="btn btn-outline" @click="goToStep(1)">上一步</button>
          <div>
            <button class="btn btn-outline btn-sm" style="margin-right:8px;" @click="resetCrop">重置</button>
            <button class="btn btn-primary" ref="cropBtn" @click="doCrop">确认裁剪</button>
          </div>
        </div>
      </div>

      <!-- Step 4: Identify -->
      <div class="step-card" :class="{ active: currentStep === 4 }">
        <h2>🔍 正在识别</h2>
        <p class="step-desc">选择识别算法并开始转换</p>

        <!-- Algorithm Selection -->
        <div class="algo-select" v-show="!showProgress">
          <div class="algo-card" :class="{ active: state.recogMode === 'dominant' }" @click="selectAlgo('dominant')">
            <img class="algo-icon" src="/image/color_main.png" alt="主色识别">
            <div class="algo-info">
              <div class="algo-title">主色识别模式</div>
              <div class="algo-desc">提取每个格子中最主要的颜色，适合像素网格图片</div>
            </div>
            <span class="algo-check">✓</span>
          </div>
          <div class="algo-card" :class="{ active: state.recogMode === 'average' }" @click="selectAlgo('average')">
            <img class="algo-icon" src="/image/color_avg.png" alt="色彩平均">
            <div class="algo-info">
              <div class="algo-title">色彩平均模式</div>
              <div class="algo-desc">在HSL色域计算每个格子内所有像素的平均颜色，适合普通图片</div>
            </div>
            <span class="algo-check">✓</span>
          </div>
        </div>

        <div class="btn-group between" v-show="!showProgress">
          <button class="btn btn-outline" @click="cancelRecognition">上一步</button>
          <button class="btn btn-primary" @click="startRecognition">开始识别</button>
        </div>

        <!-- Progress -->
        <div class="progress-wrap" v-show="showProgress">
          <div class="progress-bar-outer">
            <div class="progress-bar-inner" :style="{ width: progressPercent + '%' }"></div>
          </div>
          <div class="progress-status">{{ progressStatus }}</div>
          <div class="progress-result" :class="{ show: recognitionDone }">
            <p style="font-size:16px;font-weight:500;margin-bottom:8px;">✅ 识别完成！</p>
            <p style="font-size:14px;color:var(--text-secondary);">{{ resultSummary }}</p>
            <div class="btn-group center mt-16" v-if="recognitionDone">
              <button class="btn btn-primary" @click="goToUsePage">查看图纸</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════
         Step 3: Position — Full Viewport Overlay
         ═══════════════════════════════════════════ -->
    <div class="convert-position-overlay" v-show="currentStep === 3" ref="positionOverlay">
      <!-- Position Toast -->
      <div class="toast" id="posToast" ref="posToast"></div>

      <div class="view-layout">
        <!-- Left: Workspace -->
        <div class="workspace" ref="convertWorkspace">
          <div class="workspace-title">图片定位</div>
          <canvas ref="positionCanvas"></canvas>
          <div class="cell-info-panel" :class="{ show: posInfoPanelVisible }" ref="posInfoPanel">
            <div ref="posInfoContent"></div>
          </div>
        </div>

        <!-- Right: Toolbar -->
        <div class="toolbar" ref="positionToolbar">
          <!-- Zone 1: Size Control -->
          <div class="toolbar-zone pos-zone-size">
            <div class="size-control-wrap">
              <div class="size-input-area">
                <input type="number" class="size-input" v-model.number="state.cellSize"
                  min="5" max="100" step="1"
                  @input="onCellSizeInput" @change="onCellSizeChange">
              </div>
              <div class="size-btn-area">
                <button class="size-btn size-btn-plus" :disabled="state.cellSize >= 100" @click="setCellSize(state.cellSize + 1)">+</button>
                <button class="size-btn size-btn-minus" :disabled="state.cellSize <= 5" @click="setCellSize(state.cellSize - 1)">−</button>
              </div>
            </div>
          </div>

          <!-- Zone 2: Mode Toggle -->
          <div class="toolbar-zone pos-zone-mode">
            <div class="mode-toggle-wrap">
              <span class="mode-label" :class="{ active: !state.gridMode }">九宫格</span>
              <label class="switch">
                <input type="checkbox" v-model="state.gridMode" @change="onModeSwitch">
                <span class="slider"></span>
              </label>
              <span class="mode-label" :class="{ active: state.gridMode }">网格</span>
            </div>
          </div>

          <!-- Zone 3: Nudge -->
          <div class="toolbar-zone pos-zone-nudge">
            <div class="nudge-cross">
              <button class="nudge-btn nudge-up" @mousedown.prevent="startNudge(0, -1, $event)" @mouseup="stopNudge" @mouseleave="stopNudge" @touchstart.prevent="startNudge(0, -1, $event)" @touchend="stopNudge">▲</button>
              <div class="nudge-row">
                <button class="nudge-btn nudge-left" @mousedown.prevent="startNudge(-1, 0, $event)" @mouseup="stopNudge" @mouseleave="stopNudge" @touchstart.prevent="startNudge(-1, 0, $event)" @touchend="stopNudge">◀</button>
                <span class="nudge-label">微调</span>
                <button class="nudge-btn nudge-right" @mousedown.prevent="startNudge(1, 0, $event)" @mouseup="stopNudge" @mouseleave="stopNudge" @touchstart.prevent="startNudge(1, 0, $event)" @touchend="stopNudge">▶</button>
              </div>
              <button class="nudge-btn nudge-down" @mousedown.prevent="startNudge(0, 1, $event)" @mouseup="stopNudge" @mouseleave="stopNudge" @touchstart.prevent="startNudge(0, 1, $event)" @touchend="stopNudge">▼</button>
            </div>
          </div>

          <!-- Zone 4: Magnifier -->
          <div class="toolbar-zone pos-zone-magnifier">
            <div class="magnifier-wrap">
              <canvas ref="magnifierCanvas"></canvas>
            </div>
          </div>

          <!-- Zone 5: Spacer -->
          <div class="toolbar-zone pos-zone-spacer"></div>

          <!-- Zone 6: Actions -->
          <div class="toolbar-zone pos-zone-actions">
            <button class="btn btn-outline pos-action-btn" @click="goToStep(2)">上一步</button>
            <button class="btn btn-primary pos-action-btn" @click="goToStep(4)">下一步</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast as baseToast, showLoading, hideLoading } from '../utils/common.js'
import Cropper from 'cropperjs'

const router = useRouter()

// ── State ──
const state = reactive({
  imageId: null,
  imageUrl: null,
  croppedUrl: null,
  taskId: null,
  posImg: null,
  cellSize: 20,
  gridMode: false,
  gridX: 0,
  gridY: 0,
  gridTotalW: 0,
  gridTotalH: 0,
  detectedRows: 0,
  detectedCols: 0,
  detectedGridX: 0,
  detectedGridY: 0,
  detectedGridW: 0,
  detectedGridH: 0,
  recogMode: 'dominant',
})

const currentStep = ref(1)
const dragOver = ref(false)
const fileInfo = ref('')
const showProgress = ref(false)
const progressPercent = ref(0)
const progressStatus = ref('准备中...')
const recognitionDone = ref(false)
const resultSummary = ref('')
const posInfoPanelVisible = ref(false)

// ── Canvas refs ──
const fileInput = ref(null)
const cropImage = ref(null)
const cropBtn = ref(null)
const positionCanvas = ref(null)
const magnifierCanvas = ref(null)
const convertWorkspace = ref(null)
const posToast = ref(null)

let cropper = null
let pollTimer = null
let posCtx = null
let magCtx = null
let workspaceRect = null
let rafId = null
let renderPending = false

// ── Interaction state ──
let dragging = false
let resizing = false
let resizeHandle = null
let dragStartMouse = { x: 0, y: 0 }
let dragStartGrid = { x: 0, y: 0, w: 0, h: 0 }
let hoveredHandle = null
const HANDLE_SIZE = 10
const MIN_CELL_SIZE = 3

let nudgeInterval = null
let nudgeTimeout = null

// ── Toast wrapper ──
function posToastMsg(msg) {
  const el = posToast.value
  if (!el) { baseToast(msg); return }
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(el._timer)
  el._timer = setTimeout(() => el.classList.remove('show'), 2500)
}

// ═══ Step Navigation ═══
function goToStep(n) {
  if (n > currentStep.value) {
    if (n === 2 && !state.imageId) { baseToast('请先上传图片'); return }
    if (n === 3 && !state.croppedUrl) { baseToast('请先完成裁剪'); return }
  }
  if (n === 2) nextTick(() => initCrop())

  if (n === 4) {
    showProgress.value = false
    recognitionDone.value = false
  }

  currentStep.value = n
  if (n !== 3) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  if (n === 3) nextTick(() => initPosition())
}

function goToUsePage() {
  router.push('/view?task_id=' + state.taskId)
}

// ═══ Step 1: Upload ═══
function triggerUpload() { fileInput.value?.click() }

function onFileChange() {
  if (fileInput.value?.files.length > 0) handleFile(fileInput.value.files[0])
}

function onDrop(e) {
  dragOver.value = false
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0])
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) { baseToast('请选择图片文件'); return }
  const formData = new FormData()
  formData.append('file', file)
  fetch('/api/upload', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
      if (data.error) { baseToast(data.error); return }
      state.imageId = data.image_id
      state.imageUrl = data.url
      fileInfo.value = `${file.name} (${data.width}×${data.height})`
    })
    .catch(err => { baseToast('上传失败: ' + err.message) })
}

function resetUpload() {
  state.imageId = null
  state.imageUrl = null
  if (fileInput.value) fileInput.value.value = ''
}

// ═══ Step 2: Crop ═══
function initCrop() {
  const img = cropImage.value
  if (!img || img.src === state.imageUrl) return
  if (cropper) { cropper.destroy(); cropper = null }
  img.src = state.imageUrl
  img.onload = () => {
    cropper = new Cropper(img, {
      viewMode: 1, dragMode: 'crop', aspectRatio: NaN,
      autoCropArea: 0.8, cropBoxMovable: true, cropBoxResizable: true,
      toggleDragModeOnDblclick: false, minCropBoxWidth: 10, minCropBoxHeight: 10,
    })
  }
}

function resetCrop() { if (cropper) cropper.reset() }

function doCrop() {
  if (!cropper) { baseToast('请等待图片加载完成'); return }
  const data = cropper.getData()
  const btn = cropBtn.value
  showLoading(btn)
  fetch('/api/crop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_id: state.imageId,
      x: Math.round(data.x), y: Math.round(data.y),
      width: Math.round(data.width), height: Math.round(data.height),
    })
  })
    .then(r => r.json())
    .then(res => {
      hideLoading(btn)
      if (res.error) { baseToast(res.error); return }
      state.croppedUrl = res.cropped_url
      baseToast(`裁剪完成 (${res.width}×${res.height})`)
      goToStep(3)
    })
    .catch(err => { hideLoading(btn); baseToast('裁剪失败: ' + err.message) })
}

// ═══ Step 3: Position ═══
function initPosition() {
  if (!state.croppedUrl) return
  setupPositionCanvas()
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    state.posImg = img
    state.cellSize = 20
    state.gridTotalW = state.cellSize * 3
    state.gridTotalH = state.cellSize * 3
    state.gridX = Math.max(0, Math.round((img.width - state.gridTotalW) / 2))
    state.gridY = Math.max(0, Math.round((img.height - state.gridTotalH) / 2))
    state.gridMode = false
    resizeCanvas()
    scheduleRender()
  }
  img.src = state.croppedUrl
}

function setupPositionCanvas() {
  const pCanvas = positionCanvas.value
  const mCanvas = magnifierCanvas.value
  if (!pCanvas || !mCanvas) return

  posCtx = pCanvas.getContext('2d')
  magCtx = mCanvas.getContext('2d')
  mCanvas.width = 160
  mCanvas.height = 160

  pCanvas.addEventListener('mousedown', onPosMouseDown)
  pCanvas.style.cursor = 'grab'

  window.addEventListener('mousemove', onPosMouseMove)
  window.addEventListener('mouseup', onPosMouseUp)
  window.addEventListener('keydown', onPosKeyDown)
  window.addEventListener('resize', onPosResize)
}

function resizeCanvas() {
  const ws = convertWorkspace.value
  const pCanvas = positionCanvas.value
  if (!ws || !pCanvas) return
  const rect = ws.getBoundingClientRect()
  workspaceRect = rect
  pCanvas.width = rect.width
  pCanvas.height = rect.height
}

// ═══ Render ═══
function scheduleRender() {
  if (renderPending) return
  renderPending = true
  rafId = requestAnimationFrame(() => {
    renderPending = false
    rafId = null
    render()
  })
}

function render() {
  if (!state.posImg || !posCtx) return
  const img = state.posImg
  const pCanvas = positionCanvas.value
  const cw = pCanvas.width
  const ch = pCanvas.height

  posCtx.clearRect(0, 0, cw, ch)
  posCtx.fillStyle = '#E0E0E0'
  posCtx.fillRect(0, 0, cw, ch)

  const pad = 40
  const availW = cw - pad * 2
  const availH = ch - pad * 2
  const sc = Math.min(availW / img.width, availH / img.height, 1)
  const imgDrawW = img.width * sc
  const imgDrawH = img.height * sc
  const imgDrawX = (cw - imgDrawW) / 2
  const imgDrawY = (ch - imgDrawH) / 2

  posCtx.fillStyle = '#FFFFFF'
  posCtx.fillRect(imgDrawX - 2, imgDrawY - 2, imgDrawW + 4, imgDrawH + 4)
  posCtx.imageSmoothingEnabled = true
  posCtx.imageSmoothingQuality = 'high'
  posCtx.drawImage(img, 0, 0, img.width, img.height, imgDrawX, imgDrawY, imgDrawW, imgDrawH)

  const dp = { imgDrawX, imgDrawY, scale: sc }

  if (state.gridMode) {
    renderGridMode(dp)
  } else {
    renderNinePalace(dp)
  }

  renderPositionInfo(dp)
  renderMagnifier(dp)
}

function imgToCanvas(ix, iy, dp) {
  return { x: dp.imgDrawX + ix * dp.scale, y: dp.imgDrawY + iy * dp.scale }
}

function canvasToImg(cx, cy, dp) {
  return { x: (cx - dp.imgDrawX) / dp.scale, y: (cy - dp.imgDrawY) / dp.scale }
}

// ═══ Nine Palace ═══
function renderNinePalace(dp) {
  const gx = state.gridX, gy = state.gridY
  const gw = state.gridTotalW, gh = state.gridTotalH
  const p1 = imgToCanvas(gx, gy, dp)
  const p2 = imgToCanvas(gx + gw, gy + gh, dp)
  const gdx = p1.x, gdy = p1.y, gdw = p2.x - p1.x, gdh = p2.y - p1.y

  posCtx.strokeStyle = '#666666'
  posCtx.lineWidth = 1
  posCtx.strokeRect(gdx, gdy, gdw, gdh)

  for (let i = 1; i < 3; i++) {
    const lx = gdx + (gdw / 3) * i
    posCtx.beginPath(); posCtx.moveTo(lx, gdy); posCtx.lineTo(lx, gdy + gdh); posCtx.stroke()
    const ly = gdy + (gdh / 3) * i
    posCtx.beginPath(); posCtx.moveTo(gdx, ly); posCtx.lineTo(gdx + gdw, ly); posCtx.stroke()
  }

  drawHandles(gdx, gdy, gdw, gdh)
}

function drawHandles(gdx, gdy, gdw, gdh) {
  if (dragging || resizing) return
  const hs = HANDLE_SIZE
  const handles = [
    { x: gdx, y: gdy }, { x: gdx + gdw / 2, y: gdy },
    { x: gdx + gdw, y: gdy }, { x: gdx + gdw, y: gdy + gdh / 2 },
    { x: gdx + gdw, y: gdy + gdh }, { x: gdx + gdw / 2, y: gdy + gdh },
    { x: gdx, y: gdy + gdh }, { x: gdx, y: gdy + gdh / 2 },
  ]
  posCtx.fillStyle = '#FFFFFF'
  posCtx.strokeStyle = '#666666'
  posCtx.lineWidth = 1
  handles.forEach(h => {
    posCtx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs)
    posCtx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs)
  })
}

// ═══ Grid Mode ═══
function renderGridMode(dp) {
  const cs = state.cellSize
  const gx = state.gridX, gy = state.gridY
  if (!state.posImg) return

  const result = detectGridBounds(state.posImg, gx + cs, gy + cs, cs)
  Object.assign(state, {
    detectedRows: result.rows, detectedCols: result.cols,
    detectedGridX: result.gridX, detectedGridY: result.gridY,
    detectedGridW: result.gridW, detectedGridH: result.gridH,
  })

  if (result.rows === 0 || result.cols === 0) {
    posCtx.fillStyle = 'rgba(255, 0, 0, 0.7)'
    posCtx.font = '16px sans-serif'
    posCtx.textAlign = 'center'
    posCtx.fillText('无法检测到网格边界，请调整位置或单元格尺寸', positionCanvas.value.width / 2, positionCanvas.value.height - 20)
    return
  }

  const { rows, cols, gridX: gImgX, gridY: gImgY, gridW: gImgW, gridH: gImgH } = result
  const p1 = imgToCanvas(gImgX, gImgY, dp)
  const gdx = p1.x, gdy = p1.y
  const gdw = gImgW * dp.scale, gdh = gImgH * dp.scale
  const cellDrawW = cs * dp.scale, cellDrawH = cs * dp.scale

  posCtx.strokeStyle = '#666666'
  posCtx.lineWidth = 1

  for (let r = 0; r <= rows; r++) {
    const ly = gdy + r * cellDrawH
    posCtx.beginPath(); posCtx.moveTo(gdx, ly); posCtx.lineTo(gdx + gdw, ly)
    if (r === 0 || r === rows) { posCtx.lineWidth = 2; posCtx.stroke(); posCtx.lineWidth = 1 }
    else posCtx.stroke()
  }
  for (let c = 0; c <= cols; c++) {
    const lx = gdx + c * cellDrawW
    posCtx.beginPath(); posCtx.moveTo(lx, gdy); posCtx.lineTo(lx, gdy + gdh)
    if (c === 0 || c === cols) { posCtx.lineWidth = 2; posCtx.stroke(); posCtx.lineWidth = 1 }
    else posCtx.stroke()
  }

  // Highlight reference cell
  const refCellImgX = gx + cs, refCellImgY = gy + cs
  const refCol = Math.round((refCellImgX - gImgX) / cs)
  const refRow = Math.round((refCellImgY - gImgY) / cs)
  const rhx = gdx + refCol * cellDrawW, rhy = gdy + refRow * cellDrawH
  posCtx.strokeStyle = '#FF4500'
  posCtx.lineWidth = 2
  posCtx.strokeRect(rhx, rhy, cellDrawW, cellDrawH)
  posCtx.fillStyle = 'rgba(255, 69, 0, 0.15)'
  posCtx.fillRect(rhx, rhy, cellDrawW, cellDrawH)
}

function detectGridBounds(img, refX, refY, cellSize) {
  const imgW = img.width, imgH = img.height
  const top = refY % cellSize
  const left = refX % cellSize
  const bottom = refY + cellSize + Math.floor((imgH - refY - cellSize) / cellSize) * cellSize
  const right = refX + cellSize + Math.floor((imgW - refX - cellSize) / cellSize) * cellSize
  const rows = Math.round((bottom - top) / cellSize)
  const cols = Math.round((right - left) / cellSize)
  return {
    rows: Math.max(0, rows), cols: Math.max(0, cols),
    gridX: left, gridY: top,
    gridW: cols * cellSize, gridH: rows * cellSize,
  }
}

// ═══ Position Info & Magnifier ═══
function renderPositionInfo(dp) {
  const gx = state.gridX, gy = state.gridY
  const gw = state.gridTotalW, gh = state.gridTotalH
  const cs = state.cellSize
  const centerCellX = gx + cs, centerCellY = gy + cs

  let infoHTML
  if (state.gridMode) {
    infoHTML = `<strong>网格模式</strong><br>行数: ${state.detectedRows} × 列数: ${state.detectedCols}<br>中心参考点: (${centerCellX}, ${centerCellY})<br>单元格: ${cs}px`
  } else {
    infoHTML = `<strong>九宫格</strong><br>位置: (${gx}, ${gy})<br>尺寸: ${gw}×${gh}px<br>单元格: ${cs}px<br>中心点: (${centerCellX}, ${centerCellY})`
  }
  const contentEl = document.querySelector('#posInfoContent') || (convertWorkspace.value?.querySelector?.('.cell-info-panel'))
  if (contentEl) contentEl.innerHTML = `<div class="info-row"><div class="info-text">${infoHTML}</div></div>`
  posInfoPanelVisible.value = true
}

function renderMagnifier(dp) {
  if (!magCtx || !state.posImg) return
  const cs = state.cellSize
  const mgCanvas = magnifierCanvas.value
  const mgSize = mgCanvas.width
  magCtx.clearRect(0, 0, mgSize, mgSize)

  const centerImgX = state.gridX + cs * 1.5
  const centerImgY = state.gridY + cs * 1.5
  const viewSize = cs * 4
  const sx = centerImgX - viewSize / 2
  const sy = centerImgY - viewSize / 2
  const imgW = state.posImg.width, imgH = state.posImg.height
  const srcX = Math.max(0, sx), srcY = Math.max(0, sy)
  const srcW = Math.min(viewSize, imgW - srcX), srcH = Math.min(viewSize, imgH - srcY)

  if (srcW <= 0 || srcH <= 0) {
    magCtx.fillStyle = '#E0E0E0'; magCtx.fillRect(0, 0, mgSize, mgSize)
    magCtx.fillStyle = '#999'; magCtx.font = '12px sans-serif'
    magCtx.textAlign = 'center'; magCtx.fillText('超出边界', mgSize / 2, mgSize / 2)
    return
  }

  magCtx.fillStyle = '#E0E0E0'; magCtx.fillRect(0, 0, mgSize, mgSize)

  const scaleMg = mgSize / viewSize
  const dstX = (srcX - sx) * scaleMg, dstY = (srcY - sy) * scaleMg
  const dstW = srcW * scaleMg, dstH = srcH * scaleMg
  magCtx.imageSmoothingEnabled = false
  magCtx.drawImage(state.posImg, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH)

  const cx = mgSize / 2, cy = mgSize / 2
  magCtx.strokeStyle = 'rgba(255, 69, 0, 0.6)'
  magCtx.lineWidth = 1; magCtx.setLineDash([4, 4])
  magCtx.beginPath(); magCtx.moveTo(cx, 0); magCtx.lineTo(cx, mgSize); magCtx.moveTo(0, cy); magCtx.lineTo(mgSize, cy); magCtx.stroke()
  magCtx.setLineDash([])

  const cellScale = cs * scaleMg
  const gridX = cx - cellScale * 1.5, gridY = cy - cellScale * 1.5
  const gridW = cellScale * 3, gridH = cellScale * 3
  magCtx.strokeStyle = '#666666'; magCtx.lineWidth = 2
  magCtx.strokeRect(gridX, gridY, gridW, gridH)
  for (let i = 1; i < 3; i++) {
    const lx = gridX + (gridW / 3) * i
    magCtx.beginPath(); magCtx.moveTo(lx, gridY); magCtx.lineTo(lx, gridY + gridH); magCtx.stroke()
    const ly = gridY + (gridH / 3) * i
    magCtx.beginPath(); magCtx.moveTo(gridX, ly); magCtx.lineTo(gridX + gridW, ly); magCtx.stroke()
  }
}

// ═══ Mouse/Touch Interaction ═══
function getDrawParams() {
  if (!state.posImg || !positionCanvas.value) return null
  const pCanvas = positionCanvas.value
  const cw = pCanvas.width, ch = pCanvas.height
  const pad = 40
  const availW = cw - pad * 2, availH = ch - pad * 2
  const sc = Math.min(availW / state.posImg.width, availH / state.posImg.height, 1)
  return {
    imgDrawX: (cw - state.posImg.width * sc) / 2,
    imgDrawY: (ch - state.posImg.height * sc) / 2,
    imgDrawW: state.posImg.width * sc,
    imgDrawH: state.posImg.height * sc,
    scale: sc,
  }
}

function onPosMouseDown(e) {
  if (state.gridMode) return
  const dp = getDrawParams()
  if (!dp) return
  const pCanvas = positionCanvas.value
  const rect = pCanvas.getBoundingClientRect()
  const mx = e.clientX - rect.left, my = e.clientY - rect.top

  const handle = hitTestHandle(mx, my, dp)
  if (handle) {
    resizing = true; resizeHandle = handle
    dragStartMouse = { x: e.clientX, y: e.clientY }
    dragStartGrid = { x: state.gridX, y: state.gridY, w: state.gridTotalW, h: state.gridTotalH }
    pCanvas.style.cursor = handleToCursor(handle)
    e.preventDefault(); return
  }
  if (pointInGrid(mx, my, dp)) {
    dragging = true
    dragStartMouse = { x: e.clientX, y: e.clientY }
    dragStartGrid = { x: state.gridX, y: state.gridY, w: state.gridTotalW, h: state.gridTotalH }
    pCanvas.style.cursor = 'grabbing'; e.preventDefault()
  }
}

function onPosMouseMove(e) {
  const dp = getDrawParams()
  if (!dp) return
  const pCanvas = positionCanvas.value
  const rect = pCanvas.getBoundingClientRect()
  const mx = e.clientX - rect.left, my = e.clientY - rect.top

  if (resizing) {
    const dx = (e.clientX - dragStartMouse.x) / dp.scale
    const dy = (e.clientY - dragStartMouse.y) / dp.scale
    handleResize(dx, dy); scheduleRender(); return
  }
  if (dragging) {
    const dx = (e.clientX - dragStartMouse.x) / dp.scale
    const dy = (e.clientY - dragStartMouse.y) / dp.scale
    state.gridX = dragStartGrid.x + dx; state.gridY = dragStartGrid.y + dy
    state.gridX = Math.max(0, Math.min(state.posImg.width - state.gridTotalW, state.gridX))
    state.gridY = Math.max(0, Math.min(state.posImg.height - state.gridTotalH, state.gridY))
    scheduleRender(); return
  }
  if (!state.gridMode) {
    const handle = hitTestHandle(mx, my, dp)
    if (handle !== hoveredHandle) {
      hoveredHandle = handle
      pCanvas.style.cursor = handle ? handleToCursor(handle) : (pointInGrid(mx, my, dp) ? 'grab' : 'default')
    }
  }
}

function onPosMouseUp() {
  if (dragging || resizing) {
    dragging = false; resizing = false; resizeHandle = null; hoveredHandle = null
    if (positionCanvas.value) positionCanvas.value.style.cursor = 'default'
    scheduleRender()
  }
}

function hitTestHandle(mx, my, dp) {
  const gx = state.gridX, gy = state.gridY, gw = state.gridTotalW, gh = state.gridTotalH
  const p1 = imgToCanvas(gx, gy, dp)
  const gdx = p1.x, gdy = p1.y
  const gdw = (gx + gw) * dp.scale + dp.imgDrawX - gdx
  const gdh = (gy + gh) * dp.scale + dp.imgDrawY - gdy
  const hs = HANDLE_SIZE
  const handles = [
    { x: gdx, y: gdy, id: 'tl' }, { x: gdx + gdw / 2, y: gdy, id: 'top' },
    { x: gdx + gdw, y: gdy, id: 'tr' }, { x: gdx + gdw, y: gdy + gdh / 2, id: 'right' },
    { x: gdx + gdw, y: gdy + gdh, id: 'br' }, { x: gdx + gdw / 2, y: gdy + gdh, id: 'bottom' },
    { x: gdx, y: gdy + gdh, id: 'bl' }, { x: gdx, y: gdy + gdh / 2, id: 'left' },
  ]
  for (const h of handles) {
    if (mx >= h.x - hs && mx <= h.x + hs && my >= h.y - hs && my <= h.y + hs) return h.id
  }
  return null
}

function pointInGrid(mx, my, dp) {
  const gx = state.gridX, gy = state.gridY, gw = state.gridTotalW, gh = state.gridTotalH
  const p1 = imgToCanvas(gx, gy, dp), p2 = imgToCanvas(gx + gw, gy + gh, dp)
  return mx >= p1.x && mx <= p2.x && my >= p1.y && my <= p2.y
}

function handleToCursor(h) {
  const map = { tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize', top: 'n-resize', bottom: 's-resize', left: 'w-resize', right: 'e-resize' }
  return map[h] || 'default'
}

function handleResize(dx, dy) {
  const minW = MIN_CELL_SIZE * 3, minH = MIN_CELL_SIZE * 3
  let { x, y, w, h } = dragStartGrid
  const maxW = state.posImg.width - x, maxH = state.posImg.height - y

  switch (resizeHandle) {
    case 'tl': x += dx; y += dy; w -= dx; h -= dy; break
    case 'tr': y += dy; w += dx; h -= dy; break
    case 'bl': x += dx; w -= dx; h += dy; break
    case 'br': w += dx; h += dy; break
    case 'top': y += dy; h -= dy; break
    case 'bottom': h += dy; break
    case 'left': x += dx; w -= dx; break
    case 'right': w += dx; break
  }
  x = Math.max(0, x); y = Math.max(0, y)
  w = Math.max(minW, Math.min(maxW, w)); h = Math.max(minH, Math.min(maxH, h))
  if (x + w > state.posImg.width) w = state.posImg.width - x
  if (y + h > state.posImg.height) h = state.posImg.height - y

  state.gridX = Math.round(x); state.gridY = Math.round(y)
  state.gridTotalW = Math.round(w); state.gridTotalH = Math.round(h)
  state.cellSize = Math.round(Math.min(w / 3, h / 3))
  state.gridTotalW = state.cellSize * 3; state.gridTotalH = state.cellSize * 3
}

// ═══ Nudge ═══
function startNudge(dx, dy, e) {
  applyNudge(dx, dy)
  nudgeTimeout = setTimeout(() => { nudgeInterval = setInterval(() => applyNudge(dx, dy), 50) }, 200)
}

function stopNudge() {
  clearTimeout(nudgeTimeout); clearInterval(nudgeInterval)
  nudgeTimeout = null; nudgeInterval = null
}

function applyNudge(dx, dy) {
  state.gridX += dx; state.gridY += dy
  state.gridX = Math.max(0, Math.min(state.posImg.width - state.gridTotalW, state.gridX))
  state.gridY = Math.max(0, Math.min(state.posImg.height - state.gridTotalH, state.gridY))
  state.gridX = Math.round(state.gridX); state.gridY = Math.round(state.gridY)
  scheduleRender()
}

// ═══ Keyboard ═══
function onPosKeyDown(e) {
  if (currentStep.value !== 3 || !state.posImg) return
  switch (e.key) {
    case 'ArrowUp': e.preventDefault(); applyNudge(0, -1); break
    case 'ArrowDown': e.preventDefault(); applyNudge(0, 1); break
    case 'ArrowLeft': e.preventDefault(); applyNudge(-1, 0); break
    case 'ArrowRight': e.preventDefault(); applyNudge(1, 0); break
  }
}

// ═══ Resize ═══
let resizeTimerPos
function onPosResize() {
  clearTimeout(resizeTimerPos)
  resizeTimerPos = setTimeout(() => {
    if (currentStep.value === 3 && state.posImg) { resizeCanvas(); scheduleRender() }
  }, 200)
}

// ═══ Size Control ═══
function setCellSize(newSize) {
  if (!state.posImg) return
  const oldSize = state.cellSize
  newSize = Math.max(5, Math.min(100, Math.round(newSize)))
  if (newSize === oldSize) return
  const centerCellX = state.gridX + oldSize, centerCellY = state.gridY + oldSize
  state.cellSize = newSize
  state.gridTotalW = newSize * 3; state.gridTotalH = newSize * 3
  state.gridX = centerCellX - newSize; state.gridY = centerCellY - newSize
  state.gridX = Math.max(0, Math.min(Math.round(state.posImg.width - state.gridTotalW), Math.round(state.gridX)))
  state.gridY = Math.max(0, Math.min(Math.round(state.posImg.height - state.gridTotalH), Math.round(state.gridY)))
  scheduleRender()
}

function onCellSizeInput() {
  const val = state.cellSize
  if (!isNaN(val) && val >= 5 && val <= 100) setCellSize(val)
}

function onCellSizeChange() {
  let val = state.cellSize
  if (isNaN(val) || val < 5) val = 5
  if (val > 100) val = 100
  setCellSize(val)
}

// ═══ Mode Switch ═══
function onModeSwitch() {
  const pCanvas = positionCanvas.value
  if (state.gridMode) {
    pCanvas.style.cursor = 'default'
    pCanvas.title = '网格模式：请使用微调按钮调整位置'
  } else {
    pCanvas.style.cursor = 'grab'
    pCanvas.title = '九宫格模式：可拖拽调整位置和尺寸'
  }
  scheduleRender()
}

// ═══ Step 4: Recognition ═══
function startRecognition() {
  if (!state.croppedUrl) { posToastMsg('请先完成裁剪'); return }
  const refX = state.gridX + state.cellSize
  const refY = state.gridY + state.cellSize

  const body = {
    image_id: state.imageId,
    method: 'reference',
    ref_x: refX,
    ref_y: refY,
    ref_w: state.cellSize,
    merge_threshold: 25,
    mode: state.recogMode,
  }

  showProgress.value = true
  progressPercent.value = 0
  progressStatus.value = '正在提交任务...'
  recognitionDone.value = false

  fetch('/api/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) { baseToast(data.error); progressStatus.value = '提交失败: ' + data.error; return }
      state.taskId = data.task_id
      pollTask(data.task_id)
    })
    .catch(err => { baseToast('提交失败: ' + err.message); progressStatus.value = '提交失败' })
}

function pollTask(taskId) {
  let retries = 0
  function poll() {
    fetch(`/api/task/${taskId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { progressStatus.value = '查询失败: ' + data.error; return }
        progressPercent.value = data.progress
        progressStatus.value = data.message || `处理中 ${data.progress}%`
        if (data.status === 'complete') onRecognitionComplete(taskId, data.result)
        else if (data.status === 'error') { progressStatus.value = '❌ ' + (data.error || '识别失败') }
        else pollTimer = setTimeout(poll, 500)
      })
      .catch(() => {
        retries++
        if (retries < 5) pollTimer = setTimeout(poll, 1000)
        else progressStatus.value = '连接失败，请重试'
      })
  }
  poll()
}

function onRecognitionComplete(taskId, result) {
  fetch(`/api/task/${taskId}/color-codes`)
    .then(r => r.json())
    .then(data => {
      resultSummary.value = `共 ${data.rows} 行 × ${data.cols} 列，${result.total_cells} 个格子，${result.stats.length} 种颜色`
      recognitionDone.value = true
      fetch(`/api/render/${taskId}`).catch(() => {})
    })
    .catch(err => { baseToast('获取颜色数据失败: ' + err.message) })
}

function cancelRecognition() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
  showProgress.value = false
  goToStep(3)
}

// ═══ Algorithm Selection ═══
function selectAlgo(mode) {
  state.recogMode = mode
}

// ═══ Cleanup ═══
onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer)
  if (cropper) cropper.destroy()
  if (rafId) cancelAnimationFrame(rafId)
  stopNudge()
  window.removeEventListener('mousemove', onPosMouseMove)
  window.removeEventListener('mouseup', onPosMouseUp)
  window.removeEventListener('keydown', onPosKeyDown)
  window.removeEventListener('resize', onPosResize)
})
</script>
