<template>
  <div class="create-page">
    <!-- Step Indicators -->
    <div class="step-indicators" v-show="currentStep !== 3">
      <template v-for="(s, i) in steps" :key="s.key">
        <div :class="['step-dot', { active: currentStep === i, done: currentStep > i }]">
          <span class="circle">{{ currentStep > i ? '✓' : i + 1 }}</span>
          <span class="label">{{ s.label }}</span>
        </div>
        <span v-if="i < steps.length - 1" :class="['step-line', { done: currentStep > i }]"></span>
      </template>
    </div>

    <!-- Steps 1, 2, 4 — normal cards -->
    <div class="container" v-show="currentStep !== 3">
      <!-- Step 1: Upload -->
      <div :class="['step-card', { active: currentStep === 0 }]">
        <h2>📤 上传图片</h2>
        <p class="step-desc">选择一张拼豆图纸的照片或扫描件</p>
        <div class="upload-zone">
          <div class="icon">📁</div>
          <div class="hint">点击或拖拽图片到此处</div>
          <div class="sub-hint">支持 JPG / PNG / WebP / BMP，最大 50MB</div>
        </div>
        <div class="mt-16 center"><button class="btn btn-primary" @click="currentStep=1">下一步：裁剪</button></div>
      </div>

      <!-- Step 2: Crop -->
      <div :class="['step-card', { active: currentStep === 1 }]">
        <h2>✂️ 裁剪区域</h2>
        <p class="step-desc">裁剪出包含网格的图纸区域</p>
        <div class="crop-area">裁剪区域（Cropper.js 工作区）</div>
        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="currentStep=0">上一步</button>
          <button class="btn btn-primary" @click="currentStep=2">确认裁剪</button>
        </div>
      </div>

      <!-- Step 4: Identify -->
      <div :class="['step-card', { active: currentStep === 3 }]">
        <h2>🔍 选择识别方式</h2>
        <p class="step-desc">选择识别算法并开始转换</p>

        <div class="algo-cards">
          <div :class="['algo-card', { active: algo === 'dominant' }]" @click="algo='dominant'">
            <div class="algo-icon">🎨</div>
            <div class="algo-info">
              <div class="algo-title">主色识别模式</div>
              <div class="algo-desc">提取每个格子中最主要的颜色，适合网格图片</div>
            </div>
            <span class="algo-check" v-if="algo==='dominant'">✓</span>
          </div>
          <div :class="['algo-card', { active: algo === 'average' }]" @click="algo='average'">
            <div class="algo-icon">🌈</div>
            <div class="algo-info">
              <div class="algo-title">色彩平均模式</div>
              <div class="algo-desc">在 HSL 色域取平均颜色，适合普通图片</div>
            </div>
            <span class="algo-check" v-if="algo==='average'">✓</span>
          </div>
        </div>

        <div class="progress-wrap" v-if="showProgress">
          <div class="progress-bar-outer"><div class="progress-bar-inner" :style="{width: progress+'%'}"></div></div>
          <div class="progress-status">正在识别... {{ Math.floor(progress) }}%</div>
          <div class="progress-result" v-if="progress>=100">
            <p style="font-size:16px;font-weight:500;margin-bottom:4px;">✅ 识别完成！</p>
            <p style="color:var(--text-secondary);font-size:14px;">10×10 网格，识别到 8 种颜色</p>
          </div>
        </div>

        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="currentStep=2">上一步</button>
          <button class="btn btn-primary" @click="startRecog" :disabled="recognizing">
            {{ recognizing ? '识别中...' : '开始识别' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ Step 3: Position — Full Viewport Overlay ═══════ -->
    <div class="position-overlay" v-show="currentStep === 2">
      <div class="pos-layout">
        <!-- Left: Workspace -->
        <div class="pos-workspace" ref="workspaceRef">
          <div class="pos-workspace-title">图片定位</div>
          <canvas ref="canvasRef"></canvas>
          <div class="pos-info-panel">
            <strong>{{ gridMode ? '网格模式' : '九宫格' }}</strong><br />
            位置: ({{ Math.round(grid.x) }}, {{ Math.round(grid.y) }})<br />
            尺寸: {{ Math.round(grid.w) }}×{{ Math.round(grid.h) }}px<br />
            单元格: {{ cellSize }}px<br />
            中心参考点: ({{ Math.round(grid.x + cellSize) }}, {{ Math.round(grid.y + cellSize) }})
          </div>
        </div>

        <!-- Right: Toolbar -->
        <div class="pos-toolbar">
          <!-- Cell Size -->
          <div class="pos-zone size-control">
            <div class="size-input-area">
              <input type="number" class="size-input" v-model.number="cellSize" min="5" max="100" step="1" />
            </div>
            <div class="size-btns">
              <button class="size-btn" @click="cellSize++">+</button>
              <button class="size-btn" @click="cellSize>5 && cellSize--">−</button>
            </div>
          </div>

          <!-- Mode Toggle -->
          <div class="pos-zone mode-toggle">
            <span :class="{ active: !gridMode }">九宫格</span>
            <label class="switch"><input type="checkbox" v-model="gridMode" /><span class="slider"></span></label>
            <span :class="{ active: gridMode }">网格</span>
          </div>

          <!-- Nudge -->
          <div class="pos-zone nudge-zone">
            <div class="nudge-cross">
              <button class="nudge-btn" @click="grid.y--">▲</button>
              <div class="nudge-row">
                <button class="nudge-btn" @click="grid.x--">◀</button>
                <span class="nudge-label">微调</span>
                <button class="nudge-btn" @click="grid.x++">▶</button>
              </div>
              <button class="nudge-btn" @click="grid.y++">▼</button>
            </div>
          </div>

          <!-- Actions -->
          <div class="pos-zone pos-actions">
            <button class="btn btn-outline" @click="currentStep=1">上一步</button>
            <button class="btn btn-primary" @click="currentStep=3">下一步</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'

const currentStep = ref(0)
const algo = ref('dominant')
const recognizing = ref(false)
const showProgress = ref(false)
const progress = ref(0)

const steps = [
  { key: 'upload', label: '上传' },
  { key: 'crop', label: '裁剪' },
  { key: 'position', label: '定位' },
  { key: 'identify', label: '识别' },
]

function startRecog() {
  recognizing.value = true; showProgress.value = true; progress.value = 0
  const timer = setInterval(() => {
    progress.value += Math.random() * 30 + 5
    if (progress.value >= 100) { progress.value = 100; clearInterval(timer); recognizing.value = false }
  }, 400)
}

// ═══════ Step 3: Position Canvas ═══════
const workspaceRef = ref(null)
const canvasRef = ref(null)
const cellSize = ref(20)
const gridMode = ref(false)
const grid = reactive({ x: 100, y: 100, w: 60, h: 60 })

let mockImg = null
let dragging = false
let resizing = false
let resizeHandle = null
let dragStart = {}

const HANDLE_SIZE = 10

// Load a mock image for preview
onMounted(() => {
  mockImg = new Image()
  mockImg.crossOrigin = 'anonymous'
  mockImg.onload = () => { if (currentStep.value === 2) draw() }
  // Use a simple colored canvas as mock image for preview
  const c = document.createElement('canvas')
  c.width = 300; c.height = 200
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#FFF8DC'; ctx.fillRect(0, 0, 300, 200)
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 9; c++) {
      ctx.fillStyle = ['#FAF4C8','#F5E6A3','#FDE68A','#FBBF24','#FFDD99','#C4B5FD'][(r+c)%6]
      ctx.fillRect(c*32+2, r*32+2, 28, 28)
    }
  }
  mockImg.src = c.toDataURL()
  watch(currentStep, (v) => { if (v === 2) nextTick(() => draw()) })
  watch([cellSize, gridMode], () => { if (currentStep.value === 2) draw() })
  watch([() => grid.x, () => grid.y, () => grid.w, () => grid.h], () => { if (currentStep.value === 2) draw() })
})

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !mockImg) return
  const ws = workspaceRef.value
  if (!ws) return
  const rect = ws.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  const ctx = canvas.getContext('2d')
  const cw = canvas.width; const ch = canvas.height

  // Background
  ctx.fillStyle = '#E8E8E8'; ctx.fillRect(0, 0, cw, ch)

  // Fit image
  const pad = 40
  const availW = cw - pad*2; const availH = ch - pad*2
  const scale = Math.min(availW / mockImg.width, availH / mockImg.height, 1)
  const iw = mockImg.width * scale; const ih = mockImg.height * scale
  const ix = (cw - iw) / 2; const iy = (ch - ih) / 2

  ctx.fillStyle = '#FFF'; ctx.fillRect(ix-2, iy-2, iw+4, ih+4)
  ctx.drawImage(mockImg, 0, 0, mockImg.width, mockImg.height, ix, iy, iw, ih)

  if (!gridMode.value) {
    // 九宫格 (3×3)
    const gx = ix + grid.x * scale; const gy = iy + grid.y * scale
    const gw = grid.w * scale; const gh = grid.h * scale
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1
    ctx.strokeRect(gx, gy, gw, gh)
    for (let i = 1; i < 3; i++) {
      const lx = gx + (gw/3) * i; ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(lx, gy+gh); ctx.stroke()
      const ly = gy + (gh/3) * i; ctx.beginPath(); ctx.moveTo(gx, ly); ctx.lineTo(gx+gw, ly); ctx.stroke()
    }
    // Handles
    if (!dragging && !resizing) {
      const hs = HANDLE_SIZE
      const handles = [
        {x:gx,y:gy},{x:gx+gw/2,y:gy},{x:gx+gw,y:gy},
        {x:gx+gw,y:gy+gh/2},{x:gx+gw,y:gy+gh},{x:gx+gw/2,y:gy+gh},
        {x:gx,y:gy+gh},{x:gx,y:gy+gh/2},
      ]
      ctx.fillStyle = '#FFF'; ctx.strokeStyle = '#666'; ctx.lineWidth = 1
      handles.forEach(h => { ctx.fillRect(h.x-hs/2, h.y-hs/2, hs, hs); ctx.strokeRect(h.x-hs/2, h.y-hs/2, hs, hs) })
    }
  } else {
    // Grid mode
    const gx = ix + grid.x * scale; const gy = iy + grid.y * scale
    const cs = cellSize.value * scale
    const rows = Math.floor(grid.h / cellSize.value)
    const cols = Math.floor(grid.w / cellSize.value)
    ctx.strokeStyle = '#666'; ctx.lineWidth = 1
    for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(gx, gy+r*cs); ctx.lineTo(gx+cols*cs, gy+r*cs); ctx.stroke() }
    for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(gx+c*cs, gy); ctx.lineTo(gx+c*cs, gy+rows*cs); ctx.stroke() }
    // Highlight center reference cell
    const refX = gx + cs; const refY = gy + cs
    ctx.strokeStyle = '#FF4500'; ctx.lineWidth = 2; ctx.strokeRect(refX, refY, cs, cs)
    ctx.fillStyle = 'rgba(255,69,0,0.15)'; ctx.fillRect(refX, refY, cs, cs)
  }
}

// Mouse events for drag/resize (simplified for preview)
function setEvents() {
  const canvas = canvasRef.value
  if (!canvas) return
  canvas.onmousedown = (e) => { dragging = true; dragStart = { x: e.offsetX, y: e.offsetY, gx: grid.x, gy: grid.y } }
  canvas.onmousemove = (e) => {
    if (!dragging || !canvasRef.value) return
    const ws = workspaceRef.value
    if (!ws) return
    const rect = ws.getBoundingClientRect()
    const scale = Math.min((rect.width-80) / mockImg.width, (rect.height-80) / mockImg.height, 1)
    grid.x = dragStart.gx + (e.offsetX - dragStart.x) / scale
    grid.y = dragStart.gy + (e.offsetY - dragStart.y) / scale
  }
  canvas.onmouseup = () => { dragging = false }
  canvas.onmouseleave = () => { dragging = false }
}

watch(currentStep, (v) => { if (v === 2) { nextTick(() => { draw(); setEvents() }) } })
onMounted(() => { nextTick(() => setEvents()) })
</script>

<style scoped>
.create-page { padding-bottom: 40px; min-height: 100vh; }
.mt-16 { margin-top: 16px; }
.center { text-align: center; }

/* ── Steps 1,2,4 ── */
.crop-area { background: var(--bg-upload); border: 1px dashed var(--border); border-radius: var(--radius-sm); min-height: 200px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
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
.btn-group.between { justify-content:space-between; }

/* ── Step 3: Position Overlay ── */
.position-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 200;
  background: var(--bg); display: flex; flex-direction: column;
}
.pos-layout { display: flex; flex: 1; overflow: hidden; }
.pos-workspace { flex: 1; position: relative; overflow: hidden; background: #E8E8E8; }
.pos-workspace canvas { display: block; width: 100%; height: 100%; }
.pos-workspace-title { position: absolute; top: 12px; left: 16px; font-size: 14px; font-weight: 600; z-index: 1; }
.pos-info-panel {
  position: absolute; bottom: 16px; left: 16px;
  background: rgba(30,41,59,0.85); color: #fff; padding: 10px 14px;
  border-radius: var(--radius-sm); font-size: 12px; line-height: 1.6;
}

.pos-toolbar {
  width: 260px; background: #fff; border-left: 1px solid var(--border);
  display: flex; flex-direction: column; padding: 16px; gap: 20px;
  overflow-y: auto;
}
.pos-zone { }
.pos-actions { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }

/* Cell Size */
.size-control { display: flex; gap: 8px; align-items: center; }
.size-input-area { flex: 1; }
.size-input { width: 100%; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); text-align: center; font-size: 18px; font-weight: 600; }
.size-btns { display: flex; flex-direction: column; gap: 2px; }
.size-btn {
  width: 28px; height: 22px; border: 1px solid var(--border); border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center;
}
.size-btn:hover { background: var(--primary-light); }

/* Mode Toggle */
.mode-toggle {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  font-size: 13px; color: var(--text-secondary);
}
.mode-toggle span.active { color: var(--primary); font-weight: 600; }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; inset: 0; background: var(--border); border-radius: 24px;
  cursor: pointer; transition: var(--transition);
}
.slider::before {
  content: ''; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px;
  background: #fff; border-radius: 50%; transition: var(--transition);
}
.switch input:checked + .slider { background: var(--primary); }
.switch input:checked + .slider::before { transform: translateX(20px); }

/* Nudge */
.nudge-cross { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.nudge-row { display: flex; align-items: center; gap: 8px; }
.nudge-btn {
  width: 36px; height: 28px; border: 1px solid var(--border); border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center;
}
.nudge-btn:hover { background: var(--primary-light); }
.nudge-label { font-size: 11px; color: var(--text-secondary); width: 28px; text-align: center; }
</style>
