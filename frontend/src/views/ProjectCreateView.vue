<template>
  <div class="create-page">
    <!-- Step Indicators -->
    <div class="step-indicators">
      <template v-for="(s, i) in steps" :key="s.key">
        <div :class="['step-dot', { active: current === i, done: current > i }]">
          <span class="circle">{{ current > i ? '✓' : i + 1 }}</span>
          <span class="label">{{ s.label }}</span>
        </div>
        <span v-if="i < steps.length - 1" :class="['step-line', { done: current > i }]"></span>
      </template>
    </div>

    <div class="container">
      <!-- Step 1: Upload -->
      <div :class="['step-card', { active: current === 0 }]">
        <h2>📤 上传图片</h2>
        <p class="step-desc">选择一张拼豆图纸的照片或扫描件</p>
        <div class="upload-zone">
          <div class="icon">📁</div>
          <div class="hint">点击或拖拽图片到此处</div>
          <div class="sub-hint">支持 JPG / PNG / WebP / BMP，最大 50MB</div>
          <input type="file" accept="image/*" />
        </div>
        <div class="preview-wrap"><div class="preview-placeholder">图片预览区域</div></div>
        <div class="btn-group center mt-16">
          <button class="btn btn-primary" @click="current=1">下一步：裁剪</button>
        </div>
      </div>

      <!-- Step 2: Crop -->
      <div :class="['step-card', { active: current === 1 }]">
        <h2>✂️ 裁剪区域</h2>
        <p class="step-desc">裁剪出包含网格的图纸区域</p>
        <div class="crop-area">裁剪区域（Cropper.js 工作区）</div>
        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="current=0">上一步</button>
          <button class="btn btn-primary" @click="current=2">确认裁剪</button>
        </div>
      </div>

      <!-- Step 3: Position -->
      <div :class="['step-card', { active: current === 2 }]">
        <h2>🎯 定位参考格</h2>
        <p class="step-desc">点击图纸上的一个格子来定位网格</p>
        <div class="position-area">
          <div class="grid-visual">
            <div class="grid-visual-inner">
              <div v-for="i in 25" :key="i" class="grid-cell-demo" :style="{ borderColor: current > 2 ? '#93C5FD' : '#D0D7DE' }"></div>
            </div>
            <div class="crosshair">+</div>
          </div>
        </div>
        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="current=1">上一步</button>
          <button class="btn btn-primary" @click="current=3">下一步：识别</button>
        </div>
      </div>

      <!-- Step 4: Identify -->
      <div :class="['step-card', { active: current === 3 }]">
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
          <div class="progress-status">正在识别... {{ progress }}%</div>
          <div class="progress-result" v-if="progress>=100">
            <p>✅ 识别完成！</p>
            <p style="color:var(--text-secondary);font-size:14px;">10×10 网格，识别到 8 种颜色</p>
          </div>
        </div>

        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="current=2">上一步</button>
          <button class="btn btn-primary" @click="startRecog" :disabled="recognizing">
            {{ recognizing ? '识别中...' : '开始识别' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const current = ref(0)
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
  recognizing.value = true
  showProgress.value = true
  progress.value = 0
  const timer = setInterval(() => {
    progress.value += Math.random() * 30 + 5
    if (progress.value >= 100) { progress.value = 100; clearInterval(timer); recognizing.value = false }
  }, 400)
}
</script>

<style scoped>
.create-page { padding-bottom: 40px; }
.upload-zone, .step-card { /* inherited from main.css */ }
.btn-group { display: flex; gap: 12px; }
.btn-group.center { justify-content: center; }
.btn-group.between { justify-content: space-between; }
.mt-16 { margin-top: 16px; }
.preview-wrap { margin-top: 16px; text-align: center; }
.preview-placeholder { background: var(--bg-upload); border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 40px; color: var(--text-secondary); }
.crop-area { background: var(--bg-upload); border: 1px dashed var(--border); border-radius: var(--radius-sm); min-height: 200px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); }
.position-area { text-align: center; }
.grid-visual { position: relative; display: inline-block; }
.grid-visual-inner { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2px; width: 260px; margin: 0 auto; }
.grid-cell-demo { aspect-ratio: 1; border: 1px solid var(--border); border-radius: 2px; background: #FAFBFC; }
.crosshair { position: absolute; top: 52px; left: 52px; font-size: 28px; color: var(--primary); font-weight: bold; pointer-events: none; }

.algo-cards { display: flex; gap: 12px; flex-wrap: wrap; }
.algo-card {
  flex: 1; min-width: 200px; border: 2px solid var(--border); border-radius: var(--radius);
  padding: 16px; cursor: pointer; transition: var(--transition); display: flex; align-items: center; gap: 12px; position: relative;
}
.algo-card:hover { border-color: var(--primary); background: var(--primary-light); }
.algo-card.active { border-color: var(--primary); background: var(--primary-light); }
.algo-icon { font-size: 32px; flex-shrink: 0; }
.algo-title { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
.algo-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.algo-check { position: absolute; top: 8px; right: 12px; color: var(--primary); font-weight: 700; font-size: 16px; }

.progress-wrap { margin-top: 20px; }
.progress-bar-outer { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.progress-bar-inner { height: 100%; background: var(--primary); border-radius: 4px; transition: width 0.3s; }
.progress-status { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.progress-result { text-align: center; }
.progress-result p:first-child { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
</style>
