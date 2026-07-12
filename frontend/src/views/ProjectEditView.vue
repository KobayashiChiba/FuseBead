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
        <div class="workspace-title">编辑图纸 — {{ project.name }}</div>
        <canvas ref="canvasRef"
          @wheel.prevent="canvas.handleWheel"
          @mousedown="handleMouseDown"
          @click="handleClick"
        ></canvas>
      </div>

      <EditorToolbar
        :activeTool="activeTool"
        :brushColor="brushColor"
        :colorCardColors="colorCardColors"
        :cardName="colorCardName"
        :sortedStats="sortedStats"
        :highlightCode="highlightCode"
        :zoomPercent="canvas.zoomPercent.value"
        :sortField="sortField"
        :sortDir="sortDir"
        :canUndo="editorTools.canUndo.value"
        :canRedo="editorTools.canRedo.value"
        @undo="editorTools.undo()"
        @redo="editorTools.redo()"
        @update:activeTool="onToolChange"
        @update:brushColor="brushColor = $event"
        @update:zoomPercent="canvas.zoomPercent.value = $event"
        @highlightColor="onHighlightColor"
        @replaceColorListClick="onReplaceColorListClick"
        @toggleSort="toggleSort"
        @resetView="canvas.resetView(); canvas.render()"
        @clearHighlight="highlightCode = null; canvas.render()"
        @defaultSort="sortField = 'position'; sortDir = 'asc'"
        @cancel="$router.back()"
        @save="onSave"
      />
    </div>

    <!-- ReplaceDialog -->
    <ReplaceDialog
      v-if="replaceDialog.oldCode"
      :oldCode="replaceDialog.oldCode"
      :oldHex="replaceDialog.oldHex"
      :colorMap="colorMap"
      :colorCardColors="colorCardColors"
      :cardName="colorCardName"
      @close="onReplaceClose"
      @confirm="onReplaceConfirm"
    />

    <div :class="['view-toast', { show: toastMsg }]" v-if="toastMsg">{{ toastMsg }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'
import EditorToolbar from '@/components/EditorToolbar.vue'
import ReplaceDialog from '@/components/ReplaceDialog.vue'
import { useCanvasRenderer } from '@/composables/useCanvasRenderer'
import { useEditorTools } from '@/composables/useEditorTools'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

// ── Data ──
const project = ref({})
const gridData = ref([])
const colorMap = ref({})
const colorStats = ref([])
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

// ── Interaction ──
const highlightCode = ref(null)
const toastMsg = ref('')
let toastTimer = null
function toast(msg) { toastMsg.value = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastMsg.value = '' }, 2500) }
const selectedCell = ref(null)  // { row, col } — single-cell highlight for replace tool
const hoverCell = ref(null)      // { row, col } — hover highlight for replace tool

const workspaceRef = ref(null)
const canvasRef = ref(null)
const canvas = useCanvasRenderer(canvasRef, project, gridData, colorMap, highlightCode, {
  showCounts: false,
  showHighlightBorder: true,
  showHighlightCounts: false,
  selectedCell,
  hoverCell,
})

// ── Editor ──
const editorTools = useEditorTools(gridData, colorMap, colorStats, canvas.render, buildColorStats)

// ── Edit state ──
const activeTool = ref('drag')
const brushColor = ref('H1')
const colorCardColors = ref([])
const colorCardName = ref('')
const replaceDialog = reactive({ oldCode: null, oldHex: '', scope: 'cell', row: 0, col: 0 })
// const eyedropperActive = ref(false) — 已合并到 activeTool

let lastBrushedCell = null

// ── Drag ──
let dragging = false, dragged = false
let dragStartX = 0, dragStartY = 0, dragStartPanX = 0, dragStartPanY = 0

function handleMouseDown(e) {
  if (e.button !== 0) return

  if (activeTool.value !== 'drag') {
    dragging = true; dragged = false
    dragStartX = e.clientX; dragStartY = e.clientY
    return
  }
  dragging = true; dragged = false
  dragStartX = e.clientX; dragStartY = e.clientY
  dragStartPanX = canvas.panX.value; dragStartPanY = canvas.panY.value
  canvasRef.value.style.cursor = 'grabbing'
}
function handleMouseMove(e) {
  // ── Replace tool hover ──
  if (!dragging && activeTool.value === 'replace') {
    const cell = canvas.getCellFromEvent(e)
    const valid = cell && cell.row >= 0 && cell.row < (project.value.grid_rows || 0) && cell.col >= 0 && cell.col < (project.value.grid_cols || 0)
    const newVal = valid ? { row: cell.row, col: cell.col } : null
    if (hoverCell.value?.row !== newVal?.row || hoverCell.value?.col !== newVal?.col) {
      hoverCell.value = newVal
      canvas.render()
    }
    return
  }

  if (!dragging) return

  if (activeTool.value !== 'drag') {
    const dx = Math.abs(e.clientX - dragStartX), dy = Math.abs(e.clientY - dragStartY)
    if (dx > 3 || dy > 3) dragged = true
    if (activeTool.value === 'brush' && !dragged) {
      const cell = canvas.getCellFromEvent(e)
      if (cell && cell.row >= 0 && cell.row < project.value.grid_rows && cell.col >= 0 && cell.col < project.value.grid_cols) {
        const code = gridData.value[cell.row]?.[cell.col]
        if (highlightCode.value && code !== highlightCode.value) return  // 高亮时只涂高亮色
        const key = `${cell.row},${cell.col}`
        if (key !== lastBrushedCell) {
          lastBrushedCell = key
          editorTools.brushCell(cell.row, cell.col, brushColor.value)
        }
      }
    }
    return
  }
  dragged = true
  canvas.panX.value = dragStartPanX + e.clientX - dragStartX
  canvas.panY.value = dragStartPanY + e.clientY - dragStartY
  canvas.render()
}
function handleMouseUp() {
  if (dragging) {
    dragging = false
    canvasRef.value.style.cursor = activeTool.value === 'drag' ? 'grab' : 'crosshair'
  }
}
function handleClick(e) {
  if (dragged) return
  const cell = canvas.getCellFromEvent(e)
  const code = gridData.value[cell.row]?.[cell.col]

  // 取色器
  if (activeTool.value === 'eyedropper') {
    const picked = (code && !colorMap.value[code]) ? '' : (code || '')
    brushColor.value = picked
    return
  }

  if (activeTool.value === 'brush') {
    if (canvas.cellSize.value < 20) { toast('请放大到 20px 以上再涂色'); return }
    if (highlightCode.value && code !== highlightCode.value) return  // 高亮时只涂高亮色
    editorTools.brushCell(cell.row, cell.col, brushColor.value)
    lastBrushedCell = `${cell.row},${cell.col}`
    return
  }
  if (activeTool.value === 'replace') {
    if (canvas.cellSize.value < 20) { toast('请放大到 20px 以上再替换'); return }
    replaceDialog.oldCode = code
    replaceDialog.oldHex = colorMap.value[code] || '#ccc'
    replaceDialog.scope = 'cell'
    replaceDialog.row = cell.row
    replaceDialog.col = cell.col
    selectedCell.value = { row: cell.row, col: cell.col }
    canvas.render()
    return
  }
}

// ── Tools ──
async function onToolChange(tool) {
  highlightCode.value = null
  selectedCell.value = null
  hoverCell.value = null
  if (tool === 'simplify') return  // 已移除
  activeTool.value = tool
  canvasRef.value.style.cursor = tool === 'drag' ? 'grab' : 'crosshair'
  canvas.render()
}
function onHighlightColor(code) {
  highlightCode.value = highlightCode.value === code ? null : code
  canvas.render()
}

function onReplaceColorListClick(code) {
  replaceDialog.oldCode = code
  replaceDialog.oldHex = colorMap.value[code] || '#ccc'
  replaceDialog.scope = 'all'
  highlightCode.value = code
  canvas.render()
}

function onReplaceClose() {
  replaceDialog.oldCode = null
  highlightCode.value = null
  selectedCell.value = null
  canvas.render()
}

function onReplaceConfirm({ newCode }) {
  if (replaceDialog.scope === 'cell') {
    editorTools.replaceCell(replaceDialog.row, replaceDialog.col, newCode)
  } else {
    editorTools.replaceAll(replaceDialog.oldCode, newCode)
  }
  replaceDialog.oldCode = null
  highlightCode.value = null
  selectedCell.value = null
  canvas.render()
}

// ── Keyboard ──
function handleKeydown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  const key = e.key.toLowerCase()
  if (e.ctrlKey && key === 'z') { e.preventDefault(); editorTools.undo(); return }
  if (e.ctrlKey && key === 'y') { e.preventDefault(); editorTools.redo(); return }
  if (key === 'q') { onToolChange('drag') }
  if (key === 'w') { onToolChange('brush') }
  if (key === 'e') { onToolChange('replace') }
  if (key === 'r') { onToolChange('eyedropper') }
}

// ── Save ──
async function onSave() {
  try {
    await api.patch(`/projects/${projectId}`, { grid_data: gridData.value })
    toast('已保存')
    router.back()
  } catch (e) {
    toast('保存失败: ' + (e.response?.data?.detail || '未知错误'))
  }
}

// ── Load ──
async function loadProject() {
  loading.value = true; loadError.value = ''
  try {
    const res = await api.get(`/projects/${projectId}`)
    project.value = res.data; gridData.value = res.data.grid_data || []

    if (res.data.color_card_id) {
      try {
        const card = await api.get(`/color-cards/${res.data.color_card_id}`)
        if (card.data?.colors) {
          card.data.colors.forEach(c => { colorMap.value[c.code] = '#' + c.hex })
          colorCardColors.value = card.data.colors
          colorCardName.value = card.data.name || ''
          if (!colorCardColors.value.find(c => c.code === brushColor.value)) {
            brushColor.value = colorCardColors.value[0]?.code || 'H1'
          }
        }
      } catch {}
    }

    buildColorStats()
    editorTools.initHistory()
    await nextTick()
    requestAnimationFrame(() => requestAnimationFrame(() => canvas.initWorkspace(workspaceRef)))
  } catch (e) {
    loadError.value = e.response?.data?.detail || '加载项目失败'
  } finally { loading.value = false }
}

function buildColorStats() {
  const countMap = {}
  gridData.value.flat().forEach(code => {
    if (!code) return
    const key = colorMap.value[code] ? code : 'ZZ'
    countMap[key] = (countMap[key] || 0) + 1
  })
  colorStats.value = Object.entries(countMap).map(([code, count]) => ({ code, count, hex: code === 'ZZ' ? '#9B30FF' : (colorMap.value[code] || '#ccc') })).sort((a, b) => b.count - a.count)
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
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.view-page { height: calc(100vh - 60px); background: #3A3A3A; overflow: hidden; }
.view-layout { display: flex; height: 100%; }
.workspace { flex: 1; position: relative; overflow: hidden; }
.workspace-title { position: absolute; top: 28px; left: 28px; font-size: 21px; font-weight: 600; color: #fff; z-index: 5; border: 2px solid #999; padding: 4px 10px; border-radius: 4px; background: rgba(58, 58, 58, 0.6); }
.workspace canvas { display: block; width: 100%; height: 100%; }
.view-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 300; }
.view-overlay p { margin-top: 16px; font-size: 16px; color: #fff; }
.error-msg { color: var(--danger); font-size: 14px; }
.spinner { width: 40px; height: 40px; border: 3px solid rgba(255, 255, 255, 0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
@keyframes spin { to { transform: rotate(360deg); } }
.view-toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: rgba(30, 41, 59, 0.9); color: #fff; padding: 10px 24px; border-radius: 8px; font-size: 14px; z-index: 1000; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
.view-toast.show { opacity: 1; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 500; }
.modal-card { background: #fff; border-radius: var(--radius); padding: 28px; max-width: 400px; width: 100%; box-shadow: var(--shadow-md); }
.modal-card h3 { font-size: 16px; margin-bottom: 16px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.btn { padding: 7px 16px; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; border: none; transition: var(--transition); white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-family: inherit; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }
.btn-sm { padding: 6px 12px; font-size: 12px; }
</style>
