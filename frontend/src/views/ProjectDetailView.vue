<template>
  <div class="detail-layout">
    <!-- Left: Workspace -->
    <div class="workspace">
      <div class="workspace-title">拼豆图纸 — {{ projectName }}</div>
      <div class="bead-canvas">
        <div class="bead-grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
          <div
            v-for="(color, idx) in flatGrid"
            :key="idx"
            :class="['bead-cell', { highlighted: color === highlightColor }]"
            :style="{ background: colorMap[color] || '#F5F5F5' }"
            :title="`${color} [${Math.floor(idx/cols)+1},${idx%cols+1}]`"
          >{{ cellSize > 40 ? color : '' }}</div>
        </div>
      </div>
    </div>

    <!-- Right: Toolbar -->
    <div class="toolbar">
      <div class="toolbar-zone">
        <div class="color-stats-label">颜色统计</div>
        <div class="color-stats">
          <div
            v-for="stat in colorStats"
            :key="stat.code"
            class="color-stat-item"
            :class="{ active: highlightColor === stat.code }"
            @click="highlightColor = highlightColor === stat.code ? null : stat.code"
          >
            <span class="stat-swatch" :style="{ background: colorMap[stat.code] || '#ccc' }"></span>
            <span class="stat-code">{{ stat.code }}</span>
            <span class="stat-count">{{ stat.count }}</span>
          </div>
        </div>
      </div>

      <div class="toolbar-zone">
        <div class="zoom-control">
          <span class="zoom-label">缩放</span>
          <input type="range" min="20" max="80" v-model.number="cellSize" class="zoom-slider" />
          <span class="zoom-value">{{ cellSize }}px</span>
        </div>
      </div>

      <div class="toolbar-zone toolbar-actions">
        <button class="btn btn-outline btn-sm">返回首页</button>
        <button class="btn btn-sm" :class="mode==='view'?'btn-outline':'btn-primary'" @click="mode=mode==='view'?'edit':'view'">
          {{ mode === 'view' ? '编辑模式' : '查看模式' }}
        </button>
        <button class="btn btn-success btn-sm">导出图片</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const projectName = ref('皮卡丘')
const cols = ref(4)
const highlightColor = ref(null)
const mode = ref('view')
const cellSize = ref(40)

const mockGrid = [
  ['A1','A2','A3','A4'],
  ['B1','B2','A2','B4'],
  ['C1','C2','B2','C4'],
  ['D1','D2','D3','D4'],
]
const flatGrid = computed(() => mockGrid.flat())

const colorMap = {
  A1:'#FAF4C8', A2:'#F5E6A3', A3:'#FFDD99', A4:'#FDE68A',
  B1:'#FBBF24', B2:'#F59E0B', B3:'#D97706', B4:'#B45309',
  C1:'#F77C31', C2:'#FD543D', C3:'#DC2626', C4:'#991B1B',
  D1:'#FFFFFF', D2:'#E5E7EB', D3:'#9CA3AF', D4:'#4B5563',
}

const colorStats = computed(() => {
  const map = {}
  mockGrid.flat().forEach(c => { map[c] = (map[c]||0) + 1 })
  return Object.entries(map).map(([code, count]) => ({ code, count })).sort((a,b) => b.count - a.count)
})
</script>

<style scoped>
.detail-layout { display: flex; height: calc(100vh - 60px); }
.workspace {
  flex: 1; background: #F0F0F0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; position: relative; overflow: auto;
}
.workspace-title { position: absolute; top: 12px; left: 16px; font-size: 14px; font-weight: 600; }
.bead-canvas { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.bead-grid { display: grid; gap: 2px; background: #D0D0D0; padding: 2px; border-radius: 4px; }
.bead-cell {
  aspect-ratio: 1; border-radius: 2px; cursor: pointer; transition: transform 0.1s;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; color: rgba(0,0,0,0.5);
}
.bead-cell:hover { transform: scale(1.05); z-index: 1; box-shadow: 0 0 0 2px var(--primary); }
.bead-cell.highlighted { box-shadow: 0 0 0 2px var(--primary); transform: scale(1.05); z-index: 1; }

.toolbar {
  width: 260px; background: #fff; border-left: 1px solid var(--border);
  display: flex; flex-direction: column; overflow-y: auto; padding: 16px;
}
.toolbar-zone { margin-bottom: 20px; }
.toolbar-actions { display: flex; flex-direction: column; gap: 8px; margin-top: auto; }

.color-stats-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
.color-stats { display: flex; flex-direction: column; gap: 2px; }
.color-stat-item {
  display: flex; align-items: center; gap: 8px; padding: 4px 8px;
  border-radius: 4px; cursor: pointer; font-size: 13px; transition: var(--transition);
}
.color-stat-item:hover { background: var(--bg-sidebar); }
.color-stat-item.active { background: var(--primary-light); }
.stat-swatch { width: 18px; height: 18px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0; }
.stat-code { flex: 1; font-weight: 500; }
.stat-count { color: var(--text-secondary); font-size: 12px; }

.zoom-control { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.zoom-slider { flex: 1; accent-color: var(--primary); }
.zoom-value { font-size: 12px; color: var(--text-secondary); width: 36px; }
</style>
