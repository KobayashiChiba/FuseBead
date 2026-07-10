<template>
  <div class="create-page">
    <div :class="['toast', { show: toastMsg }]" v-if="toastMsg">{{ toastMsg }}</div>

    <div class="step-indicators" v-show="!(currentStep === 2 || (currentStep === 3 && showProgress))">
      <template v-for="(s, i) in steps" :key="s.key">
        <div :class="['step-dot', { active: currentStep === i, done: currentStep > i }]" @click="goStep(i)">
          <span class="circle">{{ currentStep > i ? '✓' : i + 1 }}</span>
          <span class="label">{{ s.label }}</span>
        </div>
        <span v-if="i < steps.length - 1" :class="['step-line', { done: currentStep > i }]"></span>
      </template>
    </div>

    <div class="container" v-show="currentStep !== 3">

      <!-- ═══════ Step 1: Upload ═══════ -->
      <div :class="['step-card', { active: currentStep === 0 }]">
        <h2>📤 上传图片</h2>
        <p class="step-desc">选择一张拼豆图纸的照片或扫描件</p>
        <div class="upload-zone" v-if="!state.originalSrc" @click="triggerUpload" @dragover.prevent @drop.prevent="onDrop">
          <div class="icon">📁</div>
          <div class="hint">点击或拖拽图片到此处</div>
          <div class="sub-hint">支持 JPG / PNG / WebP / BMP</div>
          <input type="file" ref="fileInputRef" accept="image/*" @change="onFileSelect" hidden />
        </div>
        <div class="preview-wrap" v-else>
          <img :src="state.originalSrc" class="preview-img" />
          <div class="file-info">{{ state.fileName }} ({{ state.origW }}×{{ state.origH }})</div>
          <div class="btn-group center mt-16">
            <button class="btn btn-outline" @click="resetUpload">重新选择</button>
            <button class="btn btn-primary" @click="goStep(1)">下一步：裁剪</button>
          </div>
        </div>
      </div>

      <!-- ═══════ Step 2: Crop ═══════ -->
      <div :class="['step-card', { active: currentStep === 1 }]">
        <h2>✂️ 裁剪区域</h2>
        <p class="step-desc">拖拽裁剪框选择包含网格的图纸区域</p>
        <div class="crop-container" v-show="currentStep === 1">
          <vue-cropper
            v-if="cropSrc"
            ref="cropperRef"
            :src="cropSrc"
            :viewMode="1"
            dragMode="crop"
            :autoCropArea="0.8"
            :cropBoxMovable="true"
            :cropBoxResizable="true"
            style="height: 600px"
          />
        </div>
        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="goStep(0)">上一步</button>
          <div>
            <button class="btn btn-outline btn-sm" @click="resetCrop" style="margin-right:8px">重置</button>
            <button class="btn btn-primary" @click="doCrop">确认裁剪</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════ Step 3: Position ═══════ -->
    <TopNav title="创建项目" nickname="小林千叶" />
    <div class="position-overlay" v-show="currentStep === 2">
      <div class="pos-layout">
        <div class="pos-workspace" ref="workspaceRef">
          <div class="pos-workspace-title">
            <div class="step-indicators">
              <template v-for="(s, i) in steps" :key="s.key">
                <div :class="['step-dot', { active: currentStep === i, done: currentStep > i }]" @click="goStep(i)">
                  <span class="circle">{{ currentStep > i ? '✓' : i + 1 }}</span>
                  <span class="label">{{ s.label }}</span>
                </div>
                <span v-if="i < steps.length - 1" :class="['step-line', { done: currentStep > i }]"></span>
              </template>
            </div>
          </div>
          <canvas ref="posCanvasRef" @mousedown="posMouseDown" @mousemove="posMouseMove" @mouseup="posMouseUp" @mouseleave="posMouseUp"></canvas>
          <div class="pos-info-panel">
            <strong>{{ gridMode ? '网格模式' : '九宫格' }}</strong><br />
            参考点: ({{ Math.round(state.refX) }}, {{ Math.round(state.refY) }})<br />
            格子: {{ state.cellSize }}px · 网格: {{ state.gridRows }}×{{ state.gridCols }}
          </div>
        </div>
        <div class="pos-toolbar">
          <div class="pos-zone size-control">
            <div class="size-input-area"><input type="number" class="size-input" v-model.number="state.cellSize" min="5" max="100" step="1" /></div>
            <div class="size-btns"><button class="size-btn" @click="state.cellSize++">+</button><button class="size-btn" @click="state.cellSize>5 && state.cellSize--">−</button></div>
          </div>
          <div class="pos-zone mode-toggle">
            <span :class="{ active: !gridMode }">九宫格</span>
            <label class="switch"><input type="checkbox" v-model="gridMode" /><span class="slider"></span></label>
            <span :class="{ active: gridMode }">网格</span>
          </div>
          <div class="pos-zone nudge-zone">
            <div class="nudge-cross">
              <button class="nudge-btn" @click="state.gridY--">▲</button>
              <div class="nudge-row"><button class="nudge-btn" @click="state.gridX--">◀</button><span class="nudge-label">微调</span><button class="nudge-btn" @click="state.gridX++">▶</button></div>
              <button class="nudge-btn" @click="state.gridY++">▼</button>
            </div>
          </div>
          <div class="pos-zone magnifier-zone">
            <div class="magnifier-label">🔍 放大镜</div>
            <canvas ref="magnifierCanvasRef" class="magnifier-canvas"></canvas>
          </div>
          <div class="pos-zone pos-actions">
            <div class="btn-group">
              <button class="btn btn-outline" @click="goStep(1)">上一步</button>
              <button class="btn btn-primary" @click="goStep(3)">下一步</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════ Step 4: Identify ═══════ -->
    <div class="container" v-show="currentStep === 3">
      <div :class="['step-card', { active: currentStep === 3 }]">
        <h2 v-if="!showProgress">🔍 选择识别方式</h2>
        <p class="step-desc" v-if="!showProgress">选择识别算法并给项目起名</p>
        <h2 v-if="showProgress && progress < 100">⏳ 正在识别</h2>
        <p class="step-desc" v-if="showProgress && progress < 100">正在分析图片并提取色号，请稍候</p>
        <h2 v-if="showProgress && progress >= 100">✅ 识别完成</h2>
        <p class="step-desc" v-if="showProgress && progress >= 100">图纸已生成，可以查看详情</p>
        <div class="algo-cards" v-show="!showProgress">
          <div :class="['algo-card', { active: algo === 'dominant' }]" @click="algo='dominant'">
            <img src="/image/color_main.png" class="algo-icon" alt="主色识别" />
            <div class="algo-info"><div class="algo-title">主色识别模式</div><div class="algo-desc">提取每个格子中最主要的颜色，适合网格图片</div></div>
            <span class="algo-check" v-if="algo==='dominant'">✓</span>
          </div>
          <div :class="['algo-card', { active: algo === 'average' }]" @click="algo='average'">
            <img src="/image/color_avg.png" class="algo-icon" alt="色彩平均" />
            <div class="algo-info"><div class="algo-title">色彩平均模式</div><div class="algo-desc">在 HSL 色域取平均颜色，适合普通图片</div></div>
            <span class="algo-check" v-if="algo==='average'">✓</span>
          </div>
        </div>
        <div class="form-group mt-16" v-show="!showProgress"><label>颜色合并阈值</label><input type="number" class="form-input" v-model.number="mergeThreshold" min="0" max="100" placeholder="15" /></div>
        <div class="form-group mt-16" v-show="!showProgress"><label>项目名称</label><input class="form-input" v-model="projectName" placeholder="未命名拼豆图" maxlength="100" /></div>
        <div class="form-group mt-16" v-show="!showProgress"><label>色卡</label><select class="form-input" v-model="colorCardId"><option v-for="c in colorCards" :key="c.id" :value="c.id">{{ c.name }} ({{ c.color_count }}色)</option></select></div>
        <div class="progress-wrap" v-if="showProgress">
          <div class="progress-bar-outer">
            <div class="progress-bar-inner" :style="{width: progress+'%'}">
              <div class="progress-bar-shine"></div>
            </div>
          </div>
          <div class="progress-status">
            <span>{{ progressMessage }}</span>
            <span class="progress-percent">{{ Math.round(progress) }}%</span>
          </div>
          <div class="progress-result" :class="{ show: progress >= 100 }">
            <div class="result-card">
              <div class="result-circle">✓</div>
              <div class="result-title">识别完成</div>
              <div class="result-summary">{{ resultSummary }}</div>
            </div>
            <div class="btn-group center mt-16" v-if="progress >= 100">
              <button class="btn btn-primary" @click="goToResult">查看图纸</button>
            </div>
          </div>
        </div>
        <div class="btn-group between mt-16" v-show="!showProgress">
          <button class="btn btn-outline" @click="goStep(2)">上一步</button>
          <button class="btn btn-primary" @click="startRecog" :disabled="recognizing">{{ recognizing ? '识别中...' : '开始识别' }}</button>
        </div>
        <div class="btn-group between mt-16" v-if="showProgress && progress < 100">
          <button class="btn btn-outline" @click="cancelRecog">上一步</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, nextTick } from 'vue'
import api from '@/utils/api'

const state = reactive({
  fileName: '', originalSrc: '', origW: 0, origH: 0, originalImg: null,
  originalFile: null,
  croppedSrc: '', croppedImg: null, cropX: 0, cropY: 0, cropW: 0, cropH: 0,
  gridX: 0, gridY: 0, gridW: 0, gridH: 0, cellSize: 20,
  refX: 0, refY: 0, gridRows: 0, gridCols: 0,
  projectId: null,
})

const currentStep = ref(0)
const algo = ref('dominant')
const gridMode = ref(false)
const projectName = ref('')
const mergeThreshold = ref(15)
const colorCardId = ref(null)
const colorCards = ref([])
const recognizing = ref(false)
const showProgress = ref(false)
const progress = ref(0)
const progressMessage = ref('')
const resultSummary = ref('')
const toastMsg = ref('')
let toastTimer = null
const steps = [{ key:'upload',label:'上传' },{ key:'crop',label:'裁剪' },{ key:'position',label:'定位' },{ key:'identify',label:'识别' }]

function toast(msg) { toastMsg.value = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500) }

function goStep(n) {
  if (n > currentStep.value) {
    if (n >= 1 && !state.originalSrc) { toast('请先上传图片'); return }
    if (n >= 2 && !state.croppedSrc) { toast('请先完成裁剪'); return }
  }
  currentStep.value = n
  if (n === 1) nextTick(() => setTimeout(initCrop, 100))
  if (n === 2) nextTick(() => setTimeout(initPosition, 100))
}

// ═══════ Step 1 ═══════
const fileInputRef = ref(null)
function triggerUpload() { fileInputRef.value?.click() }
function loadImage(file) {
  if (!file.type.startsWith('image/')) { toast('请选择图片文件'); return }
  state.fileName = file.name
  state.originalFile = file

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      state.originalSrc = e.target.result
      state.origW = img.width
      state.origH = img.height
      state.originalImg = img
      state.croppedSrc = ''
      state.croppedImg = null
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}
function onFileSelect(e) { if (e.target.files[0]) loadImage(e.target.files[0]) }
function onDrop(e) { if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]) }
function resetUpload() { state.originalSrc = ''; state.originalImg = null; state.fileName = ''; state.originalFile = null; state.croppedSrc = ''; state.croppedImg = null; fileInputRef.value.value = '' }

// ═══════ Step 2: Crop ═══════
import VueCropper from 'vue-cropperjs'
import TopNav from '@/components/TopNav.vue'
const cropperRef = ref(null)
const cropSrc = ref('')

function initCrop() {
  cropSrc.value = state.originalSrc
}

function resetCrop() {
  cropperRef.value?.cropper?.reset()
}

function doCrop() {
  const cropper = cropperRef.value?.cropper
  if (!cropper) { toast('请等待图片加载完成'); return }
  const data = cropper.getData()
  const x = Math.round(data.x), y = Math.round(data.y)
  const w = Math.round(data.width), h = Math.round(data.height)
  state.cropX = x; state.cropY = y; state.cropW = w; state.cropH = h

  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d').drawImage(state.originalImg, x, y, w, h, 0, 0, w, h)
  state.croppedSrc = c.toDataURL()
  const img = new Image()
  img.onload = () => { state.croppedImg = img; goStep(2) }
  img.src = state.croppedSrc
}

// ═══════ Step 3: Position ═══════
const workspaceRef = ref(null), posCanvasRef = ref(null), magnifierCanvasRef = ref(null)
let posDragging = false, posResizeHandle = -1, posStart = {}, posImg = null, posScale = 1, posOffX = 0, posOffY = 0
let posHandleImg = []

function initPosition() {
  if (!state.croppedImg) return
  posImg = state.croppedImg
  const cs = state.cellSize
  state.gridW = cs * 3; state.gridH = cs * 3
  state.gridX = Math.max(0, Math.round((posImg.width - state.gridW) / 2))
  state.gridY = Math.max(0, Math.round((posImg.height - state.gridH) / 2))
  state.refX = state.gridX + cs; state.refY = state.gridY + cs
  gridMode.value = false
  drawPos()
}

function drawPos() {
  const canvas = posCanvasRef.value; const ws = workspaceRef.value
  if (!canvas || !ws || !posImg) return
  const rect = ws.getBoundingClientRect()
  canvas.width = rect.width; canvas.height = rect.height
  const ctx = canvas.getContext('2d'); const cw = canvas.width; const ch = canvas.height
  ctx.fillStyle = '#3A3A3A'; ctx.fillRect(0, 0, cw, ch)
  posScale = Math.min((cw - 40) / posImg.width, (ch - 40) / posImg.height)
  const iw = posImg.width * posScale; const ih = posImg.height * posScale
  posOffX = (cw - iw) / 2; posOffY = (ch - ih) / 2
  ctx.fillStyle = '#FFF'; ctx.fillRect(posOffX - 2, posOffY - 2, iw + 4, ih + 4)
  ctx.drawImage(posImg, 0, 0, posImg.width, posImg.height, posOffX, posOffY, iw, ih)
  if (!gridMode.value) {
    const gx = posOffX + state.gridX * posScale, gy = posOffY + state.gridY * posScale
    const gw = state.gridW * posScale, gh = state.gridH * posScale
    ctx.strokeStyle = '#00D4AA'; ctx.lineWidth = 2; ctx.strokeRect(gx, gy, gw, gh); ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    for (let i = 1; i < 3; i++) {
      const lx = gx + gw / 3 * i; ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(lx, gy + gh); ctx.stroke()
      const ly = gy + gh / 3 * i; ctx.beginPath(); ctx.moveTo(gx, ly); ctx.lineTo(gx + gw, ly); ctx.stroke()
    }
    ctx.setLineDash([])
    if (!posDragging) {
      const hs = 10; ctx.fillStyle = '#00D4AA'
      const h = [{ x: gx, y: gy }, { x: gx + gw / 2, y: gy }, { x: gx + gw, y: gy }, { x: gx + gw, y: gy + gh / 2 }, { x: gx + gw, y: gy + gh }, { x: gx + gw / 2, y: gy + gh }, { x: gx, y: gy + gh }, { x: gx, y: gy + gh / 2 }]
      h.forEach(p => { ctx.fillRect(p.x - hs / 2, p.y - hs / 2, hs, hs) })
      posHandleImg = [
        { x: state.gridX, y: state.gridY },
        { x: state.gridX + state.gridW / 2, y: state.gridY },
        { x: state.gridX + state.gridW, y: state.gridY },
        { x: state.gridX + state.gridW, y: state.gridY + state.gridH / 2 },
        { x: state.gridX + state.gridW, y: state.gridY + state.gridH },
        { x: state.gridX + state.gridW / 2, y: state.gridY + state.gridH },
        { x: state.gridX, y: state.gridY + state.gridH },
        { x: state.gridX, y: state.gridY + state.gridH / 2 },
      ]
    }
  } else {
    const cs = state.cellSize; const gx = posOffX + state.gridX * posScale; const gy = posOffY + state.gridY * posScale; const cds = cs * posScale
    const top = state.gridY % cs; const left = state.gridX % cs
    const rows = Math.floor((posImg.height - top) / cs); const cols = Math.floor((posImg.width - left) / cs)
    state.gridRows = rows; state.gridCols = cols
    const gL = posOffX + left * posScale; const gT = posOffY + top * posScale
    ctx.strokeStyle = '#00D4AA'; ctx.lineWidth = 1
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(gL, gT + r * cds); ctx.lineTo(gL + cols * cds, gT + r * cds); ctx.stroke() }
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(gL + c * cds, gT); ctx.lineTo(gL + c * cds, gT + rows * cds); ctx.stroke() }
    const rx = posOffX + state.refX * posScale, ry = posOffY + state.refY * posScale
    ctx.strokeStyle = '#FF4500'; ctx.lineWidth = 2; ctx.strokeRect(rx, ry, cds, cds)
    ctx.fillStyle = 'rgba(255,69,0,0.15)'; ctx.fillRect(rx, ry, cds, cds)
  }
  drawMagnifier()
}
function drawMagnifier() {
  const canvas = magnifierCanvasRef.value
  if (!canvas || !posImg) return
  const size = 200
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#3A3A3A'
  ctx.fillRect(0, 0, size, size)
  const cs = state.cellSize
  const refCX = state.refX + cs / 2
  const refCY = state.refY + cs / 2
  const halfSize = cs * 2
  let sx = refCX - halfSize
  let sy = refCY - halfSize
  const sw = cs * 4
  const sh = cs * 4
  const dx = sx < 0 ? -sx : 0
  const dy = sy < 0 ? -sy : 0
  sx = Math.max(0, sx)
  sy = Math.max(0, sy)
  const dw = Math.min(sw, posImg.width - sx)
  const dh = Math.min(sh, posImg.height - sy)
  const dstX = (dx / sw) * size
  const dstY = (dy / sh) * size
  const dstW = (dw / sw) * size
  const dstH = (dh / sh) * size
  ctx.drawImage(posImg, sx, sy, dw, dh, dstX, dstY, dstW, dstH)
  ctx.strokeStyle = '#00D4AA'
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeRect(size / 8, size / 8, size * 3 / 4, size * 3 / 4)
  ctx.setLineDash([4, 4])
  for (let i = 1; i < 3; i++) {
    const lx = size / 8 + size * 3 / 4 / 3 * i
    ctx.beginPath()
    ctx.moveTo(lx, size / 8)
    ctx.lineTo(lx, size * 7 / 8)
    ctx.stroke()
    const ly = size / 8 + size * 3 / 4 / 3 * i
    ctx.beginPath()
    ctx.moveTo(size / 8, ly)
    ctx.lineTo(size * 7 / 8, ly)
    ctx.stroke()
  }
  ctx.setLineDash([])
}
function posMouseDown(e) {
  const rect = posCanvasRef.value.getBoundingClientRect()
  const mx = (e.clientX - rect.left - posOffX) / posScale
  const my = (e.clientY - rect.top - posOffY) / posScale
  posResizeHandle = -1
  if (posHandleImg.length) {
    const hitR = 8 / posScale
    for (let i = 0; i < posHandleImg.length; i++) {
      const h = posHandleImg[i]
      if (Math.abs(mx - h.x) < hitR && Math.abs(my - h.y) < hitR) {
        posResizeHandle = i
        break
      }
    }
  }
  posDragging = true
  posStart = { x: mx, y: my, gx: state.gridX, gy: state.gridY, cellSize: state.cellSize }
}
function posMouseMove(e) {
  if (!posDragging) return; const rect = posCanvasRef.value.getBoundingClientRect()
  const mx = (e.clientX - rect.left - posOffX) / posScale
  const my = (e.clientY - rect.top - posOffY) / posScale
  if (posResizeHandle >= 0) {
    const refX = posStart.gx + posStart.cellSize
    const refY = posStart.gy + posStart.cellSize
    let cs = posStart.cellSize
    switch (posResizeHandle) {
      case 0: cs = Math.min(refX - mx, refY - my); break
      case 1: cs = refY - my; break
      case 2: cs = Math.min((mx - refX) / 2, refY - my); break
      case 3: cs = (mx - refX) / 2; break
      case 4: cs = Math.min((mx - refX) / 2, (my - refY) / 2); break
      case 5: cs = (my - refY) / 2; break
      case 6: cs = Math.min(refX - mx, (my - refY) / 2); break
      case 7: cs = refX - mx; break
    }
    cs = Math.round(Math.max(5, Math.min(100, cs)))
    state.cellSize = cs
    state.gridW = cs * 3; state.gridH = cs * 3
    drawPos()
  } else {
    state.gridX = Math.max(0, posStart.gx + mx - posStart.x)
    state.gridY = Math.max(0, posStart.gy + my - posStart.y)
    state.refX = state.gridX + state.cellSize; state.refY = state.gridY + state.cellSize; drawPos()
  }
}
function posMouseUp() { posDragging = false; posResizeHandle = -1; drawPos() }
let prevCellSize = state.cellSize
watch([() => state.cellSize, () => state.gridX, () => state.gridY, gridMode], (newVals) => {
  if (currentStep.value === 2) {
    const [newCellSize] = newVals
    if (prevCellSize !== newCellSize) {
      state.gridX += prevCellSize - newCellSize
      state.gridY += prevCellSize - newCellSize
      prevCellSize = newCellSize
    }
    state.gridW = state.cellSize * 3; state.gridH = state.cellSize * 3
    state.refX = state.gridX + state.cellSize; state.refY = state.gridY + state.cellSize
    drawPos()
  }
})

// ═══════ Step 4 ═══════
function startRecog() {
  if (!state.originalFile) { toast('请先上传图片'); return }
  if (!colorCardId.value) { toast('请选择色卡'); return }

  recognizing.value = true
  showProgress.value = true
  progress.value = 0
  progressMessage.value = '正在上传图片...'

  const formData = new FormData()
  formData.append('image', state.originalFile)
  formData.append('name', projectName.value || '未命名拼豆图')
  formData.append('color_card_id', colorCardId.value)
  formData.append('ref_x', state.refX)
  formData.append('ref_y', state.refY)
  formData.append('cell_size', state.cellSize)
  formData.append('mode', algo.value)
  formData.append('merge_threshold', mergeThreshold.value)
  if (state.cropW > 0 && state.cropH > 0) {
    formData.append('crop_x', state.cropX)
    formData.append('crop_y', state.cropY)
    formData.append('crop_w', state.cropW)
    formData.append('crop_h', state.cropH)
  }

  // 用 fetch 流式读取 SSE 事件
  const token = localStorage.getItem('token') || ''
  fetch('/api/projects/stream', {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then(async res => {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = JSON.parse(line.slice(6))

          if (json.error) {
            progressMessage.value = '✗ 识别失败: ' + json.error
            toast('识别失败: ' + json.error)
            recognizing.value = false
            return
          }

          progress.value = json.progress
          progressMessage.value = json.message || ''

          if (json.done && json.project) {
            recognizing.value = false
            state.projectId = json.project.id
            resultSummary.value =
              '共 ' + json.project.grid_rows + ' 行 × ' + json.project.grid_cols + ' 列'
          }
        }
      }
    })
    .catch(err => {
      recognizing.value = false
      const msg = err.message || '网络错误'
      progressMessage.value = '✗ 识别失败: ' + msg
      toast('识别失败: ' + msg)
    })
}

function cancelRecog() {
  showProgress.value = false
  progress.value = 0
  progressMessage.value = ''
  recognizing.value = false
  goStep(2)
}

function goToResult() {
  if (state.projectId) {
    window.location.href = '/project/' + state.projectId
  }
}

// ═══════ 色卡列表 ═══════
onMounted(() => {
  api.get('/color-cards').then(res => {
    colorCards.value = res.data
    if (colorCards.value.length > 0 && !colorCardId.value) {
      colorCardId.value = colorCards.value[0].id
    }
  }).catch(() => {})
})

</script>

<style scoped>
.create-page { padding-bottom: 40px; min-height: 100vh; }
.mt-16 { margin-top: 16px; }
.preview-wrap { margin-top: 16px; text-align: center; }
.preview-img { max-width: 100%; max-height: 300px; border-radius: var(--radius-sm); }
.file-info { font-size: 13px; color: var(--text-secondary); margin-top: 8px; }
.crop-container { max-width: 100%;}
.algo-cards { display: flex; gap: 12px; flex-wrap: wrap; }
.algo-card { flex:1; min-width:200px; border:2px solid var(--border); border-radius:var(--radius); padding:16px; cursor:pointer; transition:var(--transition); display:flex; align-items:center; gap:12px; position:relative; }
.algo-card:hover, .algo-card.active { border-color:var(--primary); background:var(--primary-light); }
.algo-icon { width:48px; height:48px; flex-shrink:0; object-fit:contain; }
.algo-title { font-weight:600; font-size:14px; margin-bottom:2px; }
.algo-desc { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.algo-check { position:absolute; top:8px; right:12px; color:var(--primary); font-weight:700; font-size:16px; }
.progress-wrap { margin-top:20px; }
.progress-bar-outer { height:24px; background:var(--border); border-radius:12px; overflow:hidden; margin-bottom:8px; position:relative; }
.progress-bar-inner { height:100%; background:linear-gradient(90deg, var(--primary), #6cb7ff); border-radius:12px; transition:width 0.4s ease-out; position:relative; overflow:hidden; }
.progress-bar-shine { position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation:shine 1.5s infinite; }
@keyframes shine { 0% { transform:translateX(-100%); } 100% { transform:translateX(100%); } }
.progress-status { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:var(--text-secondary); margin-bottom:12px; }
.progress-percent { font-weight:600; color:var(--primary); font-size:19.5px; }
.progress-result { opacity:0; max-height:0; overflow:hidden; transition:all 0.4s ease; padding:0; }
.progress-result.show { opacity:1; max-height:300px; padding-top:20px; }
.result-card { display:flex; flex-direction:column; align-items:center; gap:12px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius); padding:28px 24px; }
.result-circle { width:56px; height:56px; border-radius:50%; background:#52c41a; color:#fff; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:700; }
.result-title { font-size:18px; font-weight:600; color:var(--text); }
.result-summary { font-size:14px; color:var(--text-secondary); }
.progress-wrap .btn-group.center { justify-content:center; }
.btn-group { display:flex; gap:12px; }
.btn-group.center { justify-content:center; }
.btn-group.between { justify-content:space-between; }

.position-overlay { position:fixed; top:60px; left:0; right:0; bottom:0; z-index:200; background:var(--bg); display:flex; flex-direction:column; }
.pos-layout { display:flex; flex:1; overflow:hidden; }
.pos-workspace { flex:1; position:relative; overflow:hidden; background:#3A3A3A; }
.pos-workspace canvas { display:block; width:100%; height:100%; }
.pos-workspace-title { position:absolute; top:12px; left:16px; z-index:1; background:#fff; padding:12px 16px; border-radius:var(--radius); border:2px solid var(--border); display:flex; justify-content:center; align-items:center; }
.pos-workspace-title .step-indicators { padding: 0; max-width: none; margin: 0; }
.pos-info-panel { position:absolute; bottom:16px; left:16px; background:rgba(30,41,59,0.88); color:#fff; padding:10px 14px; border-radius:var(--radius-sm); font-size:12px; line-height:1.6; }
.pos-toolbar { width:260px; background:#fff; border-left:1px solid var(--border); display:flex; flex-direction:column; padding:16px; gap:0; overflow-y:auto; }
.pos-zone { border-bottom: 1px solid var(--border); padding: 10px 0; }
.pos-zone:last-child { border-bottom: none; }
.pos-actions { margin-top:auto; display:flex; justify-content:flex-end; }
.size-control { display:flex; gap:8px; align-items:center; }
.size-input-area { flex:1; }
.size-input { width:100%; padding:8px; border:1px solid var(--border); border-radius:var(--radius-sm); text-align:center; font-size:18px; font-weight:600; }
.size-btns { display:flex; flex-direction:column; gap:2px; }
.size-btn { width:28px; height:22px; border:1px solid var(--border); border-radius:4px; background:#fff; cursor:pointer; font-size:14px; line-height:1; display:flex; align-items:center; justify-content:center; }
.size-btn:hover { background:var(--primary-light); }
.mode-toggle { display:flex; align-items:center; justify-content:center; gap:10px; font-size:13px; color:var(--text-secondary); }
.mode-toggle span.active { color:var(--primary); font-weight:600; }
.switch { position:relative; display:inline-block; width:44px; height:24px; }
.switch input { opacity:0; width:0; height:0; }
.slider { position:absolute; inset:0; background:var(--border); border-radius:24px; cursor:pointer; transition:var(--transition); }
.slider::before { content:''; position:absolute; height:18px; width:18px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:var(--transition); }
.switch input:checked+.slider { background:var(--primary); }
.switch input:checked+.slider::before { transform:translateX(20px); }
.nudge-cross { display:flex; flex-direction:column; align-items:center; gap:2px; }
.nudge-row { display:flex; align-items:center; gap:8px; }
.nudge-btn { width:40px; height:40px; border:1px solid var(--border); border-radius:4px; background:#fff; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; }
.nudge-btn:hover { background:var(--primary-light); }
.nudge-label { font-size:11px; color:var(--text-secondary); width:40px; height:40px; display:flex; align-items:center; justify-content:center; }
.magnifier-zone { display:flex; flex-direction:column; align-items:center; gap:8px; }
.magnifier-label { font-size:13px; color:var(--text-secondary); }
.magnifier-canvas { width:200px; height:200px; border:1px solid var(--border); border-radius:var(--radius-sm); background:#3A3A3A; }
</style>
