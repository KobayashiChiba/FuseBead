<template>
  <div class="view-page">
    <div v-if="loading" class="view-overlay">
      <div class="spinner"></div>
      <p>正在加载拼豆图纸...</p>
    </div>

    <div v-else-if="loadError" class="view-overlay">
      <p class="error-msg">{{ loadError }}</p>
      <button class="btn btn-primary" @click="$router.push('/')">返回首页</button>
    </div>

    <div v-else class="view-layout">
      <div class="workspace" ref="workspaceRef">
        <div class="workspace-title">拼豆图纸 — {{ project.name }}</div>
        <canvas ref="canvasRef"
          @wheel.prevent="canvas.handleWheel"
          @mousedown="handleMouseDown"
          @click="handleClick"
        ></canvas>

        <div class="mark-btns">
          <button class="mark-btn" title="◀ 撤销" @click.stop="markPrev">◀ 撤销</button>
          <button class="mark-btn" title="完成 ▶" @click.stop="markNext">完成 ▶</button>
        </div>

        <div v-if="selectedCell" class="cell-info">
          <button class="cell-info-close" @click="selectedCell = null">✕</button>
          <div class="cell-info-body">
            <span class="cell-swatch" :style="{ background: selectedCell.hex }"></span>
            <div>
              <strong>色号:</strong> {{ selectedCell.code }}<br/>
              <strong>位置:</strong> {{ selectedCell.pos }}<br/>
              <strong>Hex:</strong> {{ selectedCell.hex }}
            </div>
          </div>
        </div>
      </div>

      <div class="toolbar">
        <div class="toolbar-section tz-fixed">
          <button class="btn btn-outline btn-sm" @click="goBack">← 返回图库</button>
        </div>

        <div class="toolbar-section tz-stats">
          <div class="section-label">颜色统计</div>
          <div class="stats-list">
            <table class="stats-table">
              <thead>
                <tr>
                  <th class="col-swatch"></th>
                  <th class="col-code sortable" @click="toggleSort('code')">色值 <span class="sort-arrow">{{ sortArrow('code') }}</span></th>
                  <th class="col-count sortable" @click="toggleSort('count')">数量 <span class="sort-arrow">{{ sortArrow('count') }}</span></th>
                  <th class="col-done sortable" @click="toggleSort('done')">✓ <span class="sort-arrow">{{ sortArrow('done') }}</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stat in sortedStats" :key="stat.code"
                  :class="{ 'row-done': colorProgress[stat.code], 'row-hl': highlightCode === stat.code }"
                  @click="highlightCode = highlightCode === stat.code ? null : stat.code; canvas.render()">
                  <td class="col-swatch"><span class="swatch" :style="{ background: stat.hex }"></span></td>
                  <td class="col-code">{{ stat.code }}</td>
                  <td class="col-count">{{ stat.count }}</td>
                  <td class="col-done">
                    <button class="done-btn" :class="{ checked: colorProgress[stat.code] }"
                      @click.stop="toggleColorDone(stat.code)"></button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="toolbar-section tz-fixed">
          <div class="toolbar-buttons">
            <button class="btn btn-outline btn-sm" @click="canvas.resetView(); canvas.render()">居中</button>
            <button class="btn btn-outline btn-sm" @click="highlightCode = null; canvas.render()">清除高亮</button>
            <button class="btn btn-outline btn-sm" @click="sortField = 'position'; sortDir = 'asc'">默认排序</button>
          </div>
        </div>

        <div class="toolbar-section tz-fixed">
          <div class="zoom-control">
            <span>缩放</span>
            <input type="range" min="0" max="100" v-model.number="canvas.zoomPercent.value" />
            <span class="zoom-value">{{ canvas.zoomPercent.value }}%</span>
          </div>
        </div>

        <div class="toolbar-section toolbar-actions tz-fixed">
          <button class="btn btn-outline btn-sm" @click="$router.push(`/project/new?re_recognize=${projectId}`)">🔄 重新识别</button>
          <button class="btn btn-outline btn-sm" @click="$router.push(`/project/${projectId}/edit`)">✎ 编辑图纸</button>
          <button class="btn btn-primary btn-sm" @click="exportImage">⬇ 导出图片</button>
        </div>
      </div>
    </div>

    <div :class="['view-toast', { show: toastMsg }]" v-if="toastMsg">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

// ── Data ──
const project = ref({})
const gridData = ref([])
const colorMap = ref({})
const colorStats = ref([])
const colorProgress = reactive({})
const loading = ref(true)
const loadError = ref('')

// ── Sort ──
const sortField = ref('position')
const sortDir = ref('asc')

const firstPositions = computed(() => {
  const map = {}
  gridData.value.forEach((row, r) => {
    row.forEach((code, c) => { if (code && !(code in map)) map[code] = r * project.value.grid_cols + c })
  })
  return map
})

const sortedStats = computed(() => {
  const arr = [...colorStats.value]
  if (sortField.value === 'position') {
    const pos = firstPositions.value
    arr.sort((a, b) => (pos[a.code] ?? Infinity) - (pos[b.code] ?? Infinity))
  } else if (sortField.value === 'done') {
    const da = colorProgress[a.code] ? 1 : 0; const db = colorProgress[b.code] ? 1 : 0
    arr.sort((a, b) => sortDir.value === 'asc' ? da - db : db - da)
  } else if (sortField.value === 'count') {
    arr.sort((a, b) => sortDir.value === 'asc' ? a.count - b.count : b.count - a.count)
  } else {
    arr.sort((a, b) => sortDir.value === 'asc' ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code))
  }
  return arr
})

function toggleSort(field) {
  if (sortField.value === field) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortField.value = field; sortDir.value = 'asc' }
}
function sortArrow(field) {
  if (sortField.value !== field) return ''
  return sortDir.value === 'asc' ? '▲' : '▼'
}

// ── Progress ──
function goBack() {
  if (project.value.folder_id) {
    router.push(`/gallery/${project.value.folder_id}`)
  } else {
    router.push('/')
  }
}

function toggleColorDone(code) {
  if (colorProgress[code]) delete colorProgress[code]
  else colorProgress[code] = true
  api.put(`/projects/${projectId}/progress`, { color_progress: { ...colorProgress } })
    .catch(e => console.error('保存进度失败', e))
}

function saveProgress() {
  api.put(`/projects/${projectId}/progress`, { color_progress: { ...colorProgress } })
    .catch(e => console.error('保存进度失败', e))
}

function markNext() {
  const list = sortedStats.value; if (!list.length) return
  if (highlightCode.value) {
    colorProgress[highlightCode.value] = true; saveProgress()
    const idx = list.findIndex(s => s.code === highlightCode.value)
    for (let i = idx + 1; i < list.length; i++) {
      if (!colorProgress[list[i].code]) { highlightCode.value = list[i].code; canvas.render(); return }
    }
    highlightCode.value = null; canvas.render(); toast('🎉 恭喜你全部拼完！')
  } else {
    for (let i = 0; i < list.length; i++) {
      if (!colorProgress[list[i].code]) { highlightCode.value = list[i].code; canvas.render(); return }
    }
    toast('🎉 恭喜你全部拼完！')
  }
}

function markPrev() {
  const list = sortedStats.value; if (!list.length) return
  if (highlightCode.value) {
    delete colorProgress[highlightCode.value]; saveProgress()
    const idx = list.findIndex(s => s.code === highlightCode.value)
    for (let i = idx - 1; i >= 0; i--) {
      if (colorProgress[list[i].code]) { highlightCode.value = list[i].code; canvas.render(); return }
    }
    highlightCode.value = null; canvas.render(); toast('🧩 还没开始拼呢！')
  } else {
    for (let i = list.length - 1; i >= 0; i--) {
      if (colorProgress[list[i].code]) { highlightCode.value = list[i].code; canvas.render(); return }
    }
    toast('🧩 还没开始拼呢！')
  }
}

// ── Interaction ──
const highlightCode = ref(null)
const selectedCell = ref(null)
const toastMsg = ref('')
let toastTimer = null
function toast(msg) { toastMsg.value = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500) }

// ── Canvas (view mode: showCounts + showHighlightCode) ──
const workspaceRef = ref(null)
const canvasRef = ref(null)
const canvas = useCanvasRenderer(canvasRef, project, gridData, colorMap, highlightCode, {
  showCounts: true,
  showHighlightBorder: true,
  showHighlightCounts: true,
})

// ── Drag ──
let dragging = false, dragged = false
let dragStartX = 0, dragStartY = 0, dragStartPanX = 0, dragStartPanY = 0

function handleMouseDown(e) {
  if (e.button !== 0) return
  dragging = true; dragged = false
  dragStartX = e.clientX; dragStartY = e.clientY
  dragStartPanX = canvas.panX.value; dragStartPanY = canvas.panY.value
  canvasRef.value.style.cursor = 'grabbing'
}
function handleMouseMove(e) {
  if (!dragging) return
  dragged = true
  canvas.panX.value = dragStartPanX + e.clientX - dragStartX
  canvas.panY.value = dragStartPanY + e.clientY - dragStartY
  canvas.render()
}
function handleMouseUp() {
  if (dragging) { dragging = false; canvasRef.value.style.cursor = 'grab' }
}
function handleClick(e) {
  if (dragged) return
  const cell = canvas.getCellFromEvent(e)
  if (!cell || cell.row < 0 || cell.row >= project.value.grid_rows || cell.col < 0 || cell.col >= project.value.grid_cols) {
    highlightCode.value = null; selectedCell.value = null; canvas.render(); return
  }
  const code = gridData.value[cell.row]?.[cell.col]
  if (code) {
    if (highlightCode.value && code !== highlightCode.value) {
      highlightCode.value = null; selectedCell.value = null; canvas.render(); return
    }
    if (canvas.cellSize.value > 20) {
      highlightCode.value = code
      selectedCell.value = { code, hex: colorMap.value[code] || '#ccc', pos: `第 ${cell.row + 1} 行, 第 ${cell.col + 1} 列` }
      canvas.render()
    }
  } else {
    highlightCode.value = null; selectedCell.value = null
  }
}

// ── Export ──
async function exportImage() {
  try {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`/api/projects/${projectId}/render`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('导出失败')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `${project.value.name || '拼豆图'}.png`; a.click()
    URL.revokeObjectURL(url)
  } catch {}
}

// ── Load ──
async function loadProject() {
  loading.value = true; loadError.value = ''
  try {
    const res = await api.get(`/projects/${projectId}`)
    project.value = res.data; gridData.value = res.data.grid_data || []
    try {
      const p = await api.get(`/projects/${projectId}/progress`)
      // Clear old keys before merging (prevents cross-project contamination)
      Object.keys(colorProgress).forEach(k => delete colorProgress[k])
      if (p.data?.color_progress) Object.assign(colorProgress, p.data.color_progress)
    } catch {}
    if (res.data.color_card_id) {
      try {
        const card = await api.get(`/color-cards/${res.data.color_card_id}`)
        card.data?.colors?.forEach(c => { colorMap.value[c.code] = '#' + c.hex })
      } catch {}
    }
    buildColorStats()
    await nextTick()
    requestAnimationFrame(() => requestAnimationFrame(() => canvas.initWorkspace(workspaceRef)))
  } catch (e) {
    loadError.value = e.response?.data?.detail || '加载项目失败'
  } finally { loading.value = false }
}

function buildColorStats() {
  const countMap = {}
  gridData.value.flat().forEach(code => { countMap[code] = (countMap[code] || 0) + 1 })
  colorStats.value = Object.entries(countMap).map(([code, count]) => ({ code, count, hex: colorMap.value[code] || '#ccc' })).sort((a, b) => b.count - a.count)
}

// ── Resize ──
let resizeTimer
function handleResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (gridData.value.length) canvas.initWorkspace(workspaceRef) }, 200) }

onMounted(async () => {
  await loadProject()
  canvasRef.value.style.cursor = 'grab'
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.view-page { height: calc(100vh - 60px); background: #3A3A3A; overflow: hidden; }
.view-layout { display: flex; height: 100%; }
.workspace { flex: 1; position: relative; overflow: hidden; }
.workspace-title { position: absolute; top: 28px; left: 28px; font-size: 21px; font-weight: 600; color: #fff; z-index: 5; border: 2px solid #999; padding: 4px 10px; border-radius: 4px; background: rgba(58, 58, 58, 0.6); }
.workspace canvas { display: block; width: 100%; height: 100%; }
.toolbar { width: 260px; background: #fff; border-left: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px; overflow: hidden; flex-shrink: 0; }
.toolbar-section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.toolbar-section:last-child { border-bottom: none; margin-bottom: 0; }
.tz-fixed { flex-shrink: 0; }
.tz-stats { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.section-label { flex-shrink: 0; font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
.stats-list { flex: 1; overflow-y: auto; min-height: 0; }
.stats-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.stats-table th { position: sticky; top: 0; background: #fff; z-index: 1; text-align: left; padding: 4px 4px 6px; font-weight: 600; color: var(--text-secondary); border-bottom: 2px solid var(--border); white-space: nowrap; font-size: 11px; }
.stats-table th.sortable { cursor: pointer; user-select: none; }
.stats-table th.sortable:hover { color: var(--primary); }
.sort-arrow { font-size: 9px; margin-left: 2px; }
.stats-table td { padding: 3px 4px; border-bottom: 1px solid var(--border); font-size: 12px; cursor: pointer; }
.stats-table tr:hover { background: var(--bg-sidebar); }
.stats-table tr.row-hl { background: var(--primary-light); }
.stats-table tr.row-done td { text-decoration: line-through; color: #999; }
.col-swatch { width: 20px; }
.col-code { width: 55px; font-weight: 500; }
.col-count { width: 36px; color: var(--text-secondary); text-align: center; }
.col-done { width: 28px; text-align: center; }
.swatch { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.1); vertical-align: middle; }
.done-btn { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--border); background: #fff; cursor: pointer; padding: 0; transition: var(--transition); }
.done-btn:hover { border-color: var(--primary); }
.done-btn.checked { background: var(--primary); border-color: var(--primary); }
.done-btn.checked::after { content: '✓'; color: #fff; font-size: 10px; font-weight: 700; }
.toolbar-actions { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
.toolbar-buttons { display: flex; gap: 8px; margin-top: 8px; }
.zoom-control { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.zoom-control input { flex: 1; accent-color: var(--primary); }
.zoom-value { font-size: 12px; color: var(--text-secondary); width: 40px; text-align: right; }
.cell-info { position: absolute; bottom: 28px; left: 28px; background: rgba(30, 41, 59, 0.88); color: #fff; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12px; line-height: 1.6; z-index: 200; }
.cell-info-close { float: right; background: none; border: none; font-size: 14px; cursor: pointer; color: rgba(255, 255, 255, 0.6); padding: 0 2px; }
.cell-info-body { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.cell-info-body strong { color: #93C5FD; }
.cell-swatch { width: 30px; height: 30px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.2); flex-shrink: 0; }
.view-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 300; }
.view-overlay p { margin-top: 16px; font-size: 16px; color: #fff; }
.error-msg { color: var(--danger); font-size: 14px; }
.spinner { width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.mark-btns { position: absolute; right: 28px; bottom: 28px; z-index: 100; display: flex; flex-direction: row; gap: 2px; }
.mark-btn { padding: 5px 12px; font-size: 16px; border: none; border-radius: 4px; background: rgba(30, 41, 59, 0.82); color: #fff; cursor: pointer; font-family: inherit; white-space: nowrap; transition: background 0.15s; }
.mark-btn:hover { background: rgba(30, 41, 59, 0.95); }
.view-toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(30, 41, 59, 0.9); color: #fff; padding: 10px 24px; border-radius: 8px; font-size: 14px; z-index: 1000; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.view-toast.show { opacity: 1; }
.btn { padding: 7px 16px; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; border: none; transition: var(--transition); white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-family: inherit; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }
.btn-sm { padding: 6px 12px; font-size: 12px; }
</style>
