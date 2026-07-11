<template>
  <div class="recognize-page">
    <div class="container">
      <h2 v-if="!submitting">🔍 重新识别</h2>
      <p class="step-desc" v-if="!submitting">调整识别参数后重新生成图纸</p>
      <h2 v-if="submitting && !done">⏳ 正在识别</h2>
      <h2 v-if="done">✅ 识别完成</h2>

      <div v-if="loading" class="loading">加载项目信息...</div>
      <div v-else-if="loadError" class="empty">
        <div>{{ loadError }}</div>
        <button class="btn btn-primary" style="margin-top:12px" @click="$router.back()">返回</button>
      </div>

      <template v-else-if="!submitting">
        <!-- Preview -->
        <div class="preview-section">
          <div class="preview-label">当前图纸预览</div>
          <img v-if="previewUrl" :src="previewUrl" class="preview-img" alt="预览" />
          <div v-else class="preview-placeholder">加载预览...</div>
        </div>

        <!-- Current Info -->
        <div class="info-row">
          <span>{{ project.name }}</span>
          <span>{{ project.grid_rows }}×{{ project.grid_cols }}</span>
        </div>

        <!-- Crop Params -->
        <div class="param-section">
          <h3>裁剪参数</h3>
          <div class="param-grid">
            <div class="form-group"><label>X</label><input class="form-input" v-model.number="crop.x" type="number" min="0" /></div>
            <div class="form-group"><label>Y</label><input class="form-input" v-model.number="crop.y" type="number" min="0" /></div>
            <div class="form-group"><label>宽度</label><input class="form-input" v-model.number="crop.w" type="number" min="0" placeholder="0=不裁剪" /></div>
            <div class="form-group"><label>高度</label><input class="form-input" v-model.number="crop.h" type="number" min="0" placeholder="0=不裁剪" /></div>
          </div>
        </div>

        <!-- Position Params -->
        <div class="param-section">
          <h3>定位参数</h3>
          <div class="param-grid">
            <div class="form-group"><label>单元格大小 (px)</label><input class="form-input" v-model.number="cellSize" type="number" min="5" max="100" /></div>
            <div class="form-group"><label>参考点 X</label><input class="form-input" v-model.number="refX" type="number" /></div>
            <div class="form-group"><label>参考点 Y</label><input class="form-input" v-model.number="refY" type="number" /></div>
          </div>
        </div>

        <!-- Recognize Params -->
        <div class="param-section">
          <h3>识别参数</h3>
          <div class="algo-cards">
            <div :class="['algo-card', { active: mode === 'dominant' }]" @click="mode = 'dominant'">
              <img src="/image/color_main.png" class="algo-icon" alt="主色识别" />
              <div class="algo-info">
                <div class="algo-title">主色识别模式</div>
                <div class="algo-desc">提取每个格子中最主要的颜色</div>
              </div>
              <span class="algo-check" v-if="mode === 'dominant'">✓</span>
            </div>
            <div :class="['algo-card', { active: mode === 'average' }]" @click="mode = 'average'">
              <img src="/image/color_avg.png" class="algo-icon" alt="色彩平均" />
              <div class="algo-info">
                <div class="algo-title">色彩平均模式</div>
                <div class="algo-desc">在 HSL 色域取平均颜色</div>
              </div>
              <span class="algo-check" v-if="mode === 'average'">✓</span>
            </div>
          </div>
          <div class="form-group mt-16"><label>颜色合并阈值</label><input type="number" class="form-input" v-model.number="mergeThreshold" min="0" max="100" /></div>
          <div class="form-group mt-16"><label>项目名称</label><input class="form-input" v-model="projectName" maxlength="100" /></div>
          <div class="form-group mt-16"><label>色卡</label><select class="form-input" v-model="colorCardId"><option v-for="c in colorCards" :key="c.id" :value="c.id">{{ c.name }} ({{ c.color_count }}色)</option></select></div>
          <div class="form-group mt-16">
            <label class="checkbox-label">
              <input type="checkbox" v-model="createNew" />
              创建为新项目（不覆盖当前项目）
            </label>
          </div>
        </div>

        <!-- Error -->
        <p class="auth-error" v-if="submitError">{{ submitError }}</p>

        <!-- Actions -->
        <div class="btn-group between mt-16">
          <button class="btn btn-outline" @click="$router.back()">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="doRecognize">
            {{ submitting ? '识别中...' : '开始识别' }}
          </button>
        </div>
      </template>

      <!-- Done -->
      <div v-if="done" class="result-card">
        <div class="result-circle">✓</div>
        <div class="result-title">识别完成</div>
        <div class="btn-group center mt-16">
          <button class="btn btn-primary" @click="goResult">查看图纸</button>
        </div>
      </div>

      <div v-if="submitting && !done" class="progress-wrap">
        <div class="progress-status">正在处理，请稍候...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

const project = ref({})
const previewUrl = ref('')
const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const done = ref(false)
const submitError = ref('')

// Params
const crop = reactive({ x: 0, y: 0, w: 0, h: 0 })
const cellSize = ref(20)
const refX = ref(0)
const refY = ref(0)
const mode = ref('dominant')
const mergeThreshold = ref(15)
const projectName = ref('')
const colorCardId = ref(null)
const createNew = ref(false)
const colorCards = ref([])

onMounted(async () => {
  try {
    const [projRes, cardsRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get('/color-cards'),
    ])
    project.value = projRes.data
    projectName.value = projRes.data.name || ''
    colorCardId.value = projRes.data.color_card_id
    colorCards.value = cardsRes.data
    previewUrl.value = `/api/projects/${projectId}/render?t=${Date.now()}`
  } catch (e) {
    loadError.value = e.response?.data?.detail || '加载项目失败'
  } finally {
    loading.value = false
  }
})

async function doRecognize() {
  submitError.value = ''
  if (!colorCardId.value) { submitError.value = '请选择色卡'; return }
  submitting.value = true
  try {
    const body = {
      ref_x: refX.value,
      ref_y: refY.value,
      cell_size: cellSize.value,
      color_card_id: colorCardId.value,
      mode: mode.value,
      merge_threshold: mergeThreshold.value,
      create_new: createNew.value,
    }
    if (crop.w > 0 && crop.h > 0) {
      body.crop = { x: crop.x, y: crop.y, w: crop.w, h: crop.h }
    }
    if (projectName.value) body.name = projectName.value
    await api.post(`/projects/${projectId}/recognize`, body)
    done.value = true
  } catch (e) {
    submitError.value = e.response?.data?.detail || '识别失败'
  } finally {
    submitting.value = false
  }
}

function goResult() {
  router.push(`/project/${projectId}`)
}
</script>

<style scoped>
.recognize-page { padding: 40px; min-height: 100vh; max-width: 800px; margin: 0 auto; }
.container { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 32px; }
.mt-16 { margin-top: 16px; }
.step-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
.btn-group { display: flex; gap: 12px; }
.btn-group.center { justify-content: center; }
.btn-group.between { justify-content: space-between; }
.btn {
  padding: 8px 20px; border-radius: var(--radius-sm); font-size: 14px;
  cursor: pointer; border: none; transition: var(--transition);
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }
.form-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); font-size: 14px; outline: none;
  box-sizing: border-box;
}
.form-input:focus { border-color: var(--primary); }
.form-group { margin-bottom: 4px; }
.form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.auth-error { font-size: 13px; color: var(--danger); margin-top: 8px; }
.loading, .empty { text-align: center; padding: 40px 0; color: var(--text-secondary); }

.preview-section { margin-bottom: 16px; }
.preview-label { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.preview-img { max-width: 100%; max-height: 300px; border-radius: var(--radius-sm); border: 1px solid var(--border); }
.preview-placeholder { height: 200px; background: var(--bg-sidebar); display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); color: var(--text-secondary); }

.info-row { display: flex; gap: 16px; font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }

.param-section { border-top: 1px solid var(--border); padding-top: 16px; margin-bottom: 8px; }
.param-section h3 { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.param-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.algo-cards { display: flex; gap: 12px; flex-wrap: wrap; }
.algo-card { flex:1; min-width:200px; border:2px solid var(--border); border-radius:var(--radius); padding:16px; cursor:pointer; transition:var(--transition); display:flex; align-items:center; gap:12px; position:relative; }
.algo-card:hover, .algo-card.active { border-color:var(--primary); background:var(--primary-light); }
.algo-icon { width:48px; height:48px; flex-shrink:0; object-fit:contain; }
.algo-title { font-weight:600; font-size:14px; margin-bottom:2px; }
.algo-desc { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.algo-check { position:absolute; top:8px; right:12px; color:var(--primary); font-weight:700; font-size:16px; }

.checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; }

.result-card { display:flex; flex-direction:column; align-items:center; gap:12px; padding:28px 24px; }
.result-circle { width:56px; height:56px; border-radius:50%; background:#52c41a; color:#fff; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:700; }
.result-title { font-size:18px; font-weight:600; }

.progress-wrap { text-align: center; padding: 24px; }
.progress-status { font-size: 14px; color: var(--text-secondary); }
</style>
