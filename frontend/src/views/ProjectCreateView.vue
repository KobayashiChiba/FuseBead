<template>
  <div class="create-page">
    <div :class="['toast', { show: toastMsg }]" v-if="toastMsg">{{ toastMsg }}</div>

    <div class="step-indicators" v-show="currentStep !== 3">
      <template v-for="(s, i) in steps" :key="s.key">
        <div :class="['step-dot', { active: currentStep === i, done: currentStep > i }]">
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
        <div class="crop-container">
          <img ref="cropImgRef" alt="裁剪" style="max-width:100%;display:block;" />
        </div>
        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="goStep(0)">上一步</button>
          <div>
            <button class="btn btn-outline btn-sm" @click="resetCrop" style="margin-right:8px">重置</button>
            <button class="btn btn-primary" @click="doCrop">确认裁剪</button>
          </div>
        </div>
      </div>

      <!-- ═══════ Step 4: Identify ═══════ -->
      <div :class="['step-card', { active: currentStep === 3 }]">
        <h2>🔍 选择识别方式</h2>
        <p class="step-desc">选择识别算法并给项目起名</p>
        <div class="algo-cards">
          <div :class="['algo-card', { active: algo === 'dominant' }]" @click="algo='dominant'">
            <div class="algo-icon">🎨</div>
            <div class="algo-info"><div class="algo-title">主色识别模式</div><div class="algo-desc">提取每个格子中最主要的颜色，适合网格图片</div></div>
            <span class="algo-check" v-if="algo==='dominant'">✓</span>
          </div>
          <div :class="['algo-card', { active: algo === 'average' }]" @click="algo='average'">
            <div class="algo-icon">🌈</div>
            <div class="algo-info"><div class="algo-title">色彩平均模式</div><div class="algo-desc">在 HSL 色域取平均颜色，适合普通图片</div></div>
            <span class="algo-check" v-if="algo==='average'">✓</span>
          </div>
        </div>
        <div class="form-group mt-16"><label>项目名称</label><input class="form-input" v-model="projectName" placeholder="未命名拼豆图" maxlength="100" /></div>
        <div class="progress-wrap" v-if="showProgress">
          <div class="progress-bar-outer"><div class="progress-bar-inner" :style="{width: progress+'%'}"></div></div>
          <div class="progress-status">正在识别... {{ Math.floor(progress) }}%</div>
          <div class="progress-result" v-if="progress>=100"><p style="font-size:16px;font-weight:500;margin-bottom:4px;">✅ 识别完成！</p><p style="color:var(--text-secondary);font-size:14px;">{{ resultSummary }}</p></div>
        </div>
        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="goStep(2)">上一步</button>
          <button class="btn btn-primary" @click="startRecog" :disabled="recognizing">{{ recognizing ? '识别中...' : '开始识别' }}</button>
        </div>
      </div>
    </div>

    <!-- ═══════ Step 3: Position ═══════ -->
    <div class="position-overlay" v-show="currentStep === 2">
      <div class="pos-layout">
        <div class="pos-workspace" ref="workspaceRef">
          <div class="pos-workspace-title">图片定位 — 拖动九宫格对齐格子</div>
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
          <div class="pos-zone pos-actions">
            <button class="btn btn-outline" @click="goStep(1)">上一步</button>
            <button class="btn btn-primary" @click="goStep(3)">下一步</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, nextTick } from 'vue'

const state = reactive({
  fileName: '', originalSrc: '', origW: 0, origH: 0, originalImg: null,
  croppedSrc: '', croppedImg: null, cropX: 0, cropY: 0, cropW: 0, cropH: 0,
  gridX: 0, gridY: 0, gridW: 0, gridH: 0, cellSize: 20,
  refX: 0, refY: 0, gridRows: 0, gridCols: 0,
})

const currentStep = ref(0)
const algo = ref('dominant')
const gridMode = ref(false)
const projectName = ref('')
const recognizing = ref(false)
const showProgress = ref(false)
const progress = ref(0)
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
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => { state.originalSrc = e.target.result; state.origW = img.width; state.origH = img.height; state.originalImg = img; state.croppedSrc = ''; state.croppedImg = null }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}
function onFileSelect(e) { if (e.target.files[0]) loadImage(e.target.files[0]) }
function onDrop(e) { if (e.dataTransfer.files[0]) loadImage(e.dataTransfer.files[0]) }
function resetUpload() { state.originalSrc = ''; state.originalImg = null; state.fileName = ''; state.croppedSrc = ''; state.croppedImg = null; fileInputRef.value.value = '' }

// ═══════ Step 2: Crop (Cropper.js — 和旧代码完全一致) ═══════
import Cropper from 'cropperjs'
const cropImgRef = ref(null)
let cropper = null

function initCrop() {
  const img = cropImgRef.value
  if (!img || !state.originalSrc) return
  if (cropper) { cropper.destroy(); cropper = null }
  img.src = state.originalSrc
  img.onload = () => {
    cropper = new Cropper(img, {
      viewMode: 1,
      dragMode: 'crop',
      aspectRatio: NaN,
      autoCropArea: 0.8,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      minCropBoxWidth: 10,
      minCropBoxHeight: 10,
    })
  }
}

function resetCrop() { if (cropper) cropper.reset() }

function doCrop() {
  if (!cropper) { toast('请等待图片加载完成'); return }
  const data = cropper.getData()
  const x = Math.round(data.x), y = Math.round(data.y)
  const w = Math.round(data.width), h = Math.round(data.height)
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  c.getContext('2d').drawImage(state.originalImg, x, y, w, h, 0, 0, w, h)
  state.croppedSrc = c.toDataURL()
  state.cropX = x; state.cropY = y; state.cropW = w; state.cropH = h
  const img = new Image()
  img.onload = () => { state.croppedImg = img; goStep(2) }
  img.src = state.croppedSrc
}

// ═══════ Step 3: Position ═══════
const workspaceRef = ref(null), posCanvasRef = ref(null)
let posDragging = false, posStart = {}, posImg = null, posScale = 1, posOffX = 0, posOffY = 0

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
    for (let i = 1; i < 3; i++) {
      const lx = gx + gw / 3 * i; ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(lx, gy + gh); ctx.stroke()
      const ly = gy + gh / 3 * i; ctx.beginPath(); ctx.moveTo(gx, ly); ctx.lineTo(gx + gw, ly); ctx.stroke()
    }
    if (!posDragging) {
      const hs = 10; ctx.fillStyle = '#00D4AA'
      const h = [{ x: gx, y: gy }, { x: gx + gw / 2, y: gy }, { x: gx + gw, y: gy }, { x: gx + gw, y: gy + gh / 2 }, { x: gx + gw, y: gy + gh }, { x: gx + gw / 2, y: gy + gh }, { x: gx, y: gy + gh }, { x: gx, y: gy + gh / 2 }]
      h.forEach(p => { ctx.fillRect(p.x - hs / 2, p.y - hs / 2, hs, hs) })
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
}
function posMouseDown(e) {
  posDragging = true; const rect = posCanvasRef.value.getBoundingClientRect()
  posStart = { x: (e.clientX - rect.left - posOffX) / posScale, y: (e.clientY - rect.top - posOffY) / posScale, gx: state.gridX, gy: state.gridY }
}
function posMouseMove(e) {
  if (!posDragging) return; const rect = posCanvasRef.value.getBoundingClientRect()
  state.gridX = Math.max(0, posStart.gx + (e.clientX - rect.left - posOffX) / posScale - posStart.x)
  state.gridY = Math.max(0, posStart.gy + (e.clientY - rect.top - posOffY) / posScale - posStart.y)
  state.refX = state.gridX + state.cellSize; state.refY = state.gridY + state.cellSize; drawPos()
}
function posMouseUp() { posDragging = false; drawPos() }
watch([() => state.cellSize, () => state.gridX, () => state.gridY, gridMode], () => { if (currentStep.value === 2) { state.gridW = state.cellSize * 3; state.gridH = state.cellSize * 3; state.refX = state.gridX + state.cellSize; state.refY = state.gridY + state.cellSize; drawPos() } })

// ═══════ Step 4 ═══════
function startRecog() {
  recognizing.value = true; showProgress.value = true; progress.value = 0
  const timer = setInterval(() => { progress.value += Math.random() * 25 + 5; if (progress.value >= 100) { progress.value = 100; clearInterval(timer); recognizing.value = false } }, 400)
}
</script>

<style scoped>
.create-page { padding-bottom: 40px; min-height: 100vh; }
.mt-16 { margin-top: 16px; }
.preview-wrap { margin-top: 16px; text-align: center; }
.preview-img { max-width: 100%; max-height: 300px; border-radius: var(--radius-sm); }
.file-info { font-size: 13px; color: var(--text-secondary); margin-top: 8px; }
.crop-wrap { position: relative; }
.crop-stage canvas { display: block; width: 100%; cursor: crosshair; border-radius: var(--radius-sm); }
.algo-cards { display: flex; gap: 12px; flex-wrap: wrap; }
.algo-card { flex:1; min-width:200px; border:2px solid var(--border); border-radius:var(--radius); padding:16px; cursor:pointer; transition:var(--transition); display:flex; align-items:center; gap:12px; position:relative; }
.algo-card:hover, .algo-card.active { border-color:var(--primary); background:var(--primary-light); }
.algo-icon { font-size:32px; flex-shrink:0; }
.algo-title { font-weight:600; font-size:14px; margin-bottom:2px; }
.algo-desc { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.algo-check { position:absolute; top:8px; right:12px; color:var(--primary); font-weight:700; font-size:16px; }
.progress-wrap { margin-top:20px; }
.progress-bar-outer { height:8px; background:var(--border); border-radius:4px; overflow:hidden; margin-bottom:8px; }
.progress-bar-inner { height:100%; background:var(--primary); border-radius:4px; transition:width 0.3s; }
.progress-status { font-size:13px; color:var(--text-secondary); margin-bottom:12px; }
.btn-group { display:flex; gap:12px; }
.btn-group.center { justify-content:center; }
.btn-group.between { justify-content:space-between; }

.position-overlay { position:fixed; top:0; left:0; right:0; bottom:0; z-index:200; background:var(--bg); display:flex; flex-direction:column; }
.pos-layout { display:flex; flex:1; overflow:hidden; }
.pos-workspace { flex:1; position:relative; overflow:hidden; background:#3A3A3A; }
.pos-workspace canvas { display:block; width:100%; height:100%; }
.pos-workspace-title { position:absolute; top:12px; left:16px; font-size:14px; font-weight:600; color:#fff; z-index:1; }
.pos-info-panel { position:absolute; bottom:16px; left:16px; background:rgba(30,41,59,0.88); color:#fff; padding:10px 14px; border-radius:var(--radius-sm); font-size:12px; line-height:1.6; }
.pos-toolbar { width:260px; background:#fff; border-left:1px solid var(--border); display:flex; flex-direction:column; padding:16px; gap:20px; overflow-y:auto; }
.pos-actions { display:flex; flex-direction:column; gap:8px; margin-top:auto; }
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
.nudge-btn { width:36px; height:28px; border:1px solid var(--border); border-radius:4px; background:#fff; cursor:pointer; font-size:13px; display:flex; align-items:center; justify-content:center; }
.nudge-btn:hover { background:var(--primary-light); }
.nudge-label { font-size:11px; color:var(--text-secondary); width:28px; text-align:center; }
</style>
