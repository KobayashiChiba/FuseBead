<template>
  <div class="gallery-view">
    <div class="action-bar">
      <button class="btn btn-primary">+ 创建项目</button>
      <button class="btn btn-outline">{{ manageMode ? '完成' : '☐ 管理' }}</button>
    </div>

    <div class="project-grid">
      <div
        v-for="p in projects"
        :key="p.id"
        :class="['project-card', { selected: selected.has(p.id) }]"
        @click="manageMode ? toggle(p.id) : goDetail(p.id)"
      >
        <div v-if="manageMode" class="card-check"><input type="checkbox" :checked="selected.has(p.id)" /></div>
        <div class="card-thumb">
          <div class="mini-grid" :style="{ gridTemplateColumns: `repeat(${p.cols}, 1fr)` }">
            <div v-for="(c, i) in p.colors?.slice(0, Math.min(p.cols*3, p.colors?.length||9))" :key="i" class="mini-cell" :style="{ background: c }"></div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-name">{{ p.name }}</div>
          <div class="card-meta">{{ p.rows }}×{{ p.cols }} · {{ p.colors?.length || 0 }}色</div>
          <div class="card-progress"><div class="card-progress-bar" :style="{ width: p.progress + '%' }"></div></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const manageMode = ref(false)
const selected = reactive(new Set())

const projects = [
  { id:1, name:'皮卡丘', rows:30, cols:30, colors:['#FAF4C8','#F5E6A3','#FBBF24','#F59E0B','#DC2626','#991B1B'], progress:45 },
  { id:2, name:'伊布', rows:25, cols:25, colors:['#E5E7EB','#9CA3AF','#FDE68A','#D97706'], progress:100 },
  { id:3, name:'梦幻', rows:40, cols:40, colors:['#FFDD99','#F77C31','#FD543D','#FFFFFF','#93C5FD'], progress:20 },
  { id:4, name:'妙蛙种子', rows:28, cols:28, colors:['#16A34A','#22C55E','#86EFAC','#FBBF24','#DC2626'], progress:0 },
]

function goDetail(id) { router.push(`/project/${id}`) }
function toggle(id) { selected.has(id) ? selected.delete(id) : selected.add(id) }
</script>

<style scoped>
.action-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.project-card {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; cursor: pointer; transition: var(--transition); position: relative;
}
.project-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.project-card.selected { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.card-check { position: absolute; top: 8px; left: 8px; z-index: 1; width: 22px; height: 22px; background: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.card-thumb { height: 120px; background: var(--bg-sidebar); display: flex; align-items: center; justify-content: center; }
.mini-grid { display: grid; gap: 1px; background: #D0D0D0; padding: 1px; border-radius: 2px; }
.mini-cell { aspect-ratio: 1; border-radius: 1px; min-width: 12px; min-height: 12px; }
.card-body { padding: 12px 16px; }
.card-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.card-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
.card-progress { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.card-progress-bar { height: 100%; background: var(--primary); border-radius: 2px; transition: width 0.3s; }
</style>
