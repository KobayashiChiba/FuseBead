<template>
  <div class="et-toolbar">
    <!-- 1. 撤销/恢复 -->
    <div class="et-section">
      <div class="et-btn-row">
        <button class="btn btn-outline btn-sm" :disabled="!canUndo" @click="$emit('undo')">↩ 撤销</button>
        <button class="btn btn-outline btn-sm" :disabled="!canRedo" @click="$emit('redo')">↪ 恢复</button>
      </div>
    </div>

    <!-- 2. 工具选择 -->
    <div class="et-section">
      <div class="et-tool-grid">
        <button
          v-for="tool in tools"
          :key="tool.id"
          :class="['et-tool-btn', { active: tool.id === 'eyedropper' ? eyedropperActive : activeTool === tool.id }]"
          :title="tool.title"
          @click="tool.id === 'eyedropper' ? $emit('toggleEyedropper') : $emit('update:activeTool', tool.id)"
        >
          {{ tool.label }}
          <span v-if="tool.key" class="et-key">{{ tool.key }}</span>
        </button>
      </div>
    </div>

    <!-- 3. 画笔颜色（画笔模式显示） -->
    <div v-if="activeTool === 'brush'" class="et-section">
      <div class="et-label">画笔颜色</div>
      <div class="brush-row">
        <ColorCardPicker
          :colors="colorCardColors"
          :modelValue="brushColor"
          :cardName="cardName"
          showEmpty
          @update:modelValue="$emit('update:brushColor', $event)"
        />
      </div>
    </div>

    <!-- 4. 颜色列表 -->
    <div class="et-section et-stats">
      <div class="et-label">颜色列表</div>
      <div class="stats-list">
        <table class="stats-table">
          <thead>
            <tr>
              <th class="col-swatch"></th>
              <th class="col-code sortable" @click="$emit('toggleSort', 'code')">
                色值 <span class="sort-arrow">{{ sortArrow('code') }}</span>
              </th>
              <th class="col-count sortable" @click="$emit('toggleSort', 'count')">
                数量 <span class="sort-arrow">{{ sortArrow('count') }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="stat in sortedStats"
              :key="stat.code"
              :class="{ 'row-hl': highlightCode === stat.code }"
              @click="$emit(activeTool === 'replace' ? 'replaceColorListClick' : 'highlightColor', stat.code)"
            >
              <td class="col-swatch"><span class="swatch" :style="{ background: stat.hex }"></span></td>
              <td class="col-code">{{ stat.code }}</td>
              <td class="col-count">{{ stat.count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="toolbar-buttons">
        <button class="btn btn-outline btn-sm" @click="$emit('resetView')">居中</button>
        <button class="btn btn-outline btn-sm" @click="$emit('clearHighlight')">清除高亮</button>
        <button class="btn btn-outline btn-sm" @click="$emit('defaultSort')">默认排序</button>
      </div>
    </div>

    <!-- 5. 缩放 -->
    <div class="et-section">
      <div class="zoom-control">
        <span>缩放</span>
        <input type="range" min="0" max="100" :value="zoomPercent" @input="$emit('update:zoomPercent', $event.target.value)" />
        <span class="zoom-value">{{ zoomPercent }}%</span>
      </div>
    </div>

    <!-- 6. 操作按钮 -->
    <div class="et-section et-actions">
      <button class="btn btn-outline btn-sm" @click="$emit('cancel')">取消</button>
      <button class="btn btn-primary btn-sm" @click="$emit('save')">保存</button>
    </div>
  </div>
</template>

<script setup>
import ColorCardPicker from '@/components/ColorCardPicker.vue'

const props = defineProps({
  activeTool: { type: String, default: 'drag' },
  brushColor: { type: String, default: 'H1' },
  colorCardColors: { type: Array, default: () => [] },
  cardName: { type: String, default: '' },
  sortedStats: { type: Array, default: () => [] },
  highlightCode: { type: String, default: null },
  zoomPercent: { type: Number, default: 0 },
  sortField: { type: String, default: 'position' },
  sortDir: { type: String, default: 'asc' },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
  eyedropperActive: { type: Boolean, default: false },
})
defineEmits([
  'undo', 'redo',
  'update:activeTool', 'update:brushColor', 'update:zoomPercent',
  'highlightColor', 'replaceColorListClick',
  'toggleSort', 'resetView', 'clearHighlight', 'defaultSort',
  'cancel', 'save', 'toggleEyedropper',
])

const tools = [
  { id: 'drag', label: '拖拽', key: 'Q', title: '拖拽查看 (Q)' },
  { id: 'brush', label: '画笔', key: 'W', title: '画笔涂色 (W)' },
  { id: 'replace', label: '替换', key: 'E', title: '替换颜色 (E)' },
  { id: 'eyedropper', label: '取色', key: 'R', title: '取色器 (R)' },
]
// [僵尸代码] simplify 工具已移除，功能代码在 useEditorTools.js 中保留

function sortArrow(field) {
  if (props.sortField !== field) return ''
  return props.sortDir === 'asc' ? '▲' : '▼'
}
</script>

<style scoped>
.et-toolbar {
  width: 260px;
  background: #fff;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow: hidden;
  flex-shrink: 0;
  height: 100%;
}
.et-section {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}
.et-section:last-child { border-bottom: none; margin-bottom: 0; }
.et-stats {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.et-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}
.et-btn-row {
  display: flex;
  gap: 8px;
}
.et-tool-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}
.et-tool-btn {
  padding: 6px 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: var(--transition);
}
.et-tool-btn:hover { background: var(--bg-sidebar); }
.et-tool-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.et-key {
  font-size: 10px;
  opacity: 0.6;
}
.et-tool-btn.active .et-key { color: rgba(255,255,255,0.7); }

/* Color list (shared with view toolbar) */
.stats-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.stats-table th {
  position: sticky; top: 0; background: #fff; z-index: 1;
  text-align: left; padding: 4px 4px 6px;
  font-weight: 600; color: var(--text-secondary);
  border-bottom: 2px solid var(--border);
  white-space: nowrap; font-size: 11px;
}
.stats-table th.sortable { cursor: pointer; user-select: none; }
.stats-table th.sortable:hover { color: var(--primary); }
.sort-arrow { font-size: 9px; margin-left: 2px; }
.stats-table td {
  padding: 3px 4px; border-bottom: 1px solid var(--border);
  font-size: 12px; cursor: pointer;
}
.stats-table tr:hover { background: var(--bg-sidebar); }
.stats-table tr.row-hl { background: var(--primary-light); }
.col-swatch { width: 20px; }
.col-code { width: 55px; font-weight: 500; }
.col-count { width: 36px; color: var(--text-secondary); text-align: center; }
.swatch {
  display: inline-block; width: 14px; height: 14px;
  border-radius: 3px; border: 1px solid rgba(0,0,0,0.1);
  vertical-align: middle;
}

.et-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
}
.toolbar-buttons {
  display: flex; gap: 4px; margin-top: 8px; flex-shrink: 0;
}
.toolbar-buttons .btn { font-size: 11px; padding: 4px 8px; }

/* Zoom */
.zoom-control {
  display: flex; align-items: center; gap: 8px; font-size: 13px;
}
.zoom-control input { flex: 1; accent-color: var(--primary); }
.zoom-value { font-size: 12px; color: var(--text-secondary); width: 40px; text-align: right; }

.brush-row { display: flex; align-items: flex-start; gap: 6px; }
.brush-row .ccp-trigger { flex: 1; }
.eyedropper-btn {
  width: 32px; height: 36px;
  border: 2px solid var(--border); border-radius: var(--radius-sm);
  background: #fff; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.eyedropper-btn:hover { border-color: var(--primary); background: var(--primary-light); }
.eyedropper-btn.active { border-color: var(--primary); background: var(--primary); color: #fff; }
</style>
