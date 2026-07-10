<template>
  <div>
    <header class="header">
      <div class="header-inner">
        <h1>🧩 拼豆识别</h1>
        <span class="subtitle">图片 → 拼豆图纸</span>
      </div>
    </header>

    <!-- Step Indicators -->
    <div class="step-indicators">
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

    <div class="container">

      <!-- Step 1: Upload -->
      <div class="step-card" :class="{ active: currentStep === 1 }">
        <h2>📤 上传图片</h2>
        <p class="step-desc">选择一张拼豆图纸的照片或扫描件</p>

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

        <div class="preview-wrap" :style="{ display: imageUrl ? 'block' : 'none' }">
          <img :src="imageUrl" alt="预览">
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
        <p class="step-desc">裁剪出需要转换成拼豆图的区域</p>

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

      <!-- Step 3: Position -->
      <div class="step-card" :class="{ active: currentStep === 3 }">
        <h2>📍 网格定位</h2>
        <p class="step-desc">输入拼豆网格的行列数</p>

        <div class="pos-grid-layout">
          <div class="grid-preview-area">
            <div class="grid-preview-canvas-wrap" ref="gridPreviewWrap">
              <canvas ref="gridPreviewCanvas"></canvas>
            </div>
            <div class="grid-preview-zoom">
              <button class="btn btn-sm btn-outline zoom-btn" @click="zoomPreview(-0.2)">−</button>
              <input type="range" min="0.2" max="10" step="0.1" v-model.number="gridPreviewZoom" @input="onZoomSliderInput">
              <button class="btn btn-sm btn-outline zoom-btn" @click="zoomPreview(0.2)">+</button>
              <span class="zoom-pct">{{ Math.round(gridPreviewZoom * 100) }}%</span>
            </div>
          </div>
          <div class="grid-input-area">
            <div class="form-row">
              <div class="form-group">
                <label for="gridRows">行数 (Rows)</label>
                <input class="form-input" type="number" id="gridRows" min="1" max="500" v-model.number="gridRows" placeholder="输入行数">
              </div>
              <div class="form-group">
                <label for="gridCols">列数 (Cols)</label>
                <input class="form-input" type="number" id="gridCols" min="1" max="500" v-model.number="gridCols" placeholder="输入列数">
              </div>
            </div>
            <div class="form-group">
              <label for="mergeThreshold">颜色合并阈值 (1-100, 默认25)</label>
              <input class="form-input" type="number" id="mergeThreshold" min="1" max="100" v-model.number="mergeThreshold">
            </div>
            <p style="font-size:13px;color:var(--text-secondary);">
              提示：图片外围需要有一圈坐标边框（程序会自动裁剪边框区域）
            </p>
          </div>
        </div>

        <div class="btn-group between">
          <button class="btn btn-outline" @click="goToStep(2)">上一步</button>
          <button class="btn btn-primary" @click="startRecognition">下一步：识别</button>
        </div>
      </div>

      <!-- Step 4: Recognize -->
      <div class="step-card" :class="{ active: currentStep === 4 }">
        <h2>🔍 正在识别</h2>
        <p class="step-desc">后台正在分析图片中的拼豆颜色</p>

        <div class="progress-wrap">
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

        <div class="btn-group between" style="margin-top:0;">
          <button class="btn btn-outline" @click="cancelRecognition">返回</button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast, showLoading, hideLoading } from '../utils/common.js'
import Cropper from 'cropperjs'

const router = useRouter()

// ── State ──
const currentStep = ref(1)
const imageId = ref(null)
const imageUrl = ref('')
const croppedUrl = ref('')
const fileInfo = ref('')
const taskId = ref(null)
const dragOver = ref(false)

// Step 3
const gridRows = ref(null)
const gridCols = ref(null)
const mergeThreshold = ref(25)
const gridPreviewZoom = ref(1)

// Step 4
const progressPercent = ref(0)
const progressStatus = ref('准备中...')
const recognitionDone = ref(false)
const resultSummary = ref('')

// ── Refs ──
const fileInput = ref(null)
const cropImage = ref(null)
const cropBtn = ref(null)
const gridPreviewCanvas = ref(null)
const gridPreviewWrap = ref(null)

// ── Cropper & Preview ──
let cropper = null
let gridPreviewImg = null
let pollTimer = null

function triggerUpload() {
  fileInput.value?.click()
}

function onFileChange() {
  const files = fileInput.value?.files
  if (files && files.length > 0) handleFile(files[0])
}

function onDrop(e) {
  dragOver.value = false
  if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0])
}

// ═══ Step Navigation ═══
function goToStep(n) {
  if (n > currentStep.value) {
    if (n === 2 && !imageId.value) { toast('请先上传图片'); return }
    if (n === 3 && !croppedUrl.value) { toast('请先完成裁剪'); return }
  }
  if (n === 2) nextTick(() => initCrop())
  if (n === 3) nextTick(() => initPosition())
  currentStep.value = n
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goToUsePage() {
  router.push('/view?task_id=' + taskId.value)
}

// ═══ Step 1: Upload ═══
function handleFile(file) {
  if (!file.type.startsWith('image/')) { toast('请选择图片文件'); return }
  const formData = new FormData()
  formData.append('file', file)

  fetch('/api/upload', { method: 'POST', body: formData })
    .then(r => r.json())
    .then(data => {
      if (data.error) { toast(data.error); return }
      imageId.value = data.image_id
      imageUrl.value = data.url
      fileInfo.value = `${file.name} (${data.width}×${data.height})`
    })
    .catch(err => { toast('上传失败: ' + err.message) })
}

function resetUpload() {
  imageId.value = null
  imageUrl.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

// ═══ Step 2: Crop ═══
function initCrop() {
  const img = cropImage.value
  if (!img || img.src === imageUrl.value) return
  if (cropper) { cropper.destroy(); cropper = null }
  img.src = imageUrl.value
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
  if (!cropper) { toast('请等待图片加载完成'); return }
  const data = cropper.getData()
  const btn = cropBtn.value
  showLoading(btn)

  fetch('/api/crop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_id: imageId.value,
      x: Math.round(data.x), y: Math.round(data.y),
      width: Math.round(data.width), height: Math.round(data.height),
    })
  })
    .then(r => r.json())
    .then(res => {
      hideLoading(btn)
      if (res.error) { toast(res.error); return }
      croppedUrl.value = res.cropped_url
      toast(`裁剪完成 (${res.width}×${res.height})`)
      goToStep(3)
    })
    .catch(err => { hideLoading(btn); toast('裁剪失败: ' + err.message) })
}

// ═══ Step 3: Position ═══
function initPosition() {
  if (!croppedUrl.value) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    gridPreviewImg = img
    gridPreviewZoom.value = 1
    renderGridPreview()
    const canvas = gridPreviewCanvas.value
    if (canvas) {
      canvas.onwheel = null
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        zoomPreview(delta)
      }, { passive: false })
    }
  }
  img.src = croppedUrl.value
}

function renderGridPreview() {
  if (!gridPreviewImg) return
  const canvas = gridPreviewCanvas.value
  const wrap = gridPreviewWrap.value
  if (!canvas || !wrap) return

  const wrapW = wrap.clientWidth || 260
  const size = Math.min(wrapW, 280)
  canvas.width = size
  canvas.height = size
  canvas.style.width = size + 'px'
  canvas.style.height = size + 'px'

  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.clearRect(0, 0, size, size)

  const imgW = gridPreviewImg.width
  const imgH = gridPreviewImg.height
  const defaultCropRatio = Math.sqrt(0.05)
  const minDim = Math.min(imgW, imgH)
  const defaultCropW = Math.round(minDim * defaultCropRatio)
  const defaultCropH = Math.round(minDim * defaultCropRatio)

  const baseW = defaultCropW / gridPreviewZoom.value
  const baseH = defaultCropH / gridPreviewZoom.value
  const sx = Math.max(0, imgW - baseW)
  const sy = Math.max(0, imgH - baseH)
  const sw = Math.min(baseW, imgW)
  const sh = Math.min(baseH, imgH)

  ctx.drawImage(gridPreviewImg, sx, sy, sw, sh, 0, 0, size, size)
}

function zoomPreview(delta) {
  gridPreviewZoom.value = Math.max(0.2, Math.min(10, gridPreviewZoom.value + delta))
  gridPreviewZoom.value = Math.round(gridPreviewZoom.value * 10) / 10
  renderGridPreview()
}

function onZoomSliderInput() {
  gridPreviewZoom.value = Math.round(gridPreviewZoom.value * 10) / 10
  renderGridPreview()
}

// ═══ Step 4: Recognition ═══
function startRecognition() {
  const rows = gridRows.value
  const cols = gridCols.value
  if (!rows || !cols || rows < 1 || cols < 1) { toast('请输入有效的行数和列数'); return }
  const body = { image_id: imageId.value, method: 'grid', rows, cols, merge_threshold: mergeThreshold.value || 25 }

  goToStep(4)
  progressPercent.value = 0
  progressStatus.value = '正在提交任务...'
  recognitionDone.value = false

  fetch('/api/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
    .then(r => r.json())
    .then(data => {
      if (data.error) { toast(data.error); progressStatus.value = '提交失败: ' + data.error; return }
      taskId.value = data.task_id
      pollTask(data.task_id)
    })
    .catch(err => { toast('提交失败: ' + err.message); progressStatus.value = '提交失败' })
}

function pollTask(id) {
  let retries = 0
  function poll() {
    fetch(`/api/task/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { progressStatus.value = '查询失败: ' + data.error; return }
        progressPercent.value = data.progress
        progressStatus.value = data.message || `处理中 ${data.progress}%`
        if (data.status === 'complete') onRecognitionComplete(id, data.result)
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

function onRecognitionComplete(id, result) {
  fetch(`/api/task/${id}/color-codes`)
    .then(r => r.json())
    .then(data => {
      resultSummary.value = `共 ${data.rows} 行 × ${data.cols} 列，${result.total_cells} 个格子，${result.stats.length} 种颜色`
      recognitionDone.value = true
      fetch(`/api/render/${id}`).catch(() => {})
    })
    .catch(err => { toast('获取颜色数据失败: ' + err.message) })
}

function cancelRecognition() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }
  goToStep(3)
}

onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer)
  if (cropper) cropper.destroy()
})
</script>
