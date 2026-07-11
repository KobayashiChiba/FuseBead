<template>
  <div class="gallery-view">
    <div class="action-bar">
      <button class="btn btn-primary" @click="$router.push('/project/new')">+ 创建项目</button>
      <button class="btn btn-outline" v-if="false">{{ manageMode ? '完成' : '☐ 管理' }}</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="project-grid">
      <div
        v-for="p in projects"
        :key="p.id"
        :class="['project-card', { selected: selected.has(p.id) }]"
        @click="manageMode ? toggle(p.id) : goDetail(p.id)"
      >
        <div v-if="manageMode" class="card-check"><input type="checkbox" :checked="selected.has(p.id)" /></div>
        <div class="card-thumb">
          <div class="mini-grid" :style="{ gridTemplateColumns: `repeat(${Math.min(p.grid_cols, 5)}, 1fr)` }">
            <div v-for="i in Math.min(p.grid_cols * 3, 15)" :key="i" class="mini-cell"
              :style="{ background: dotColors[i % dotColors.length] }"></div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-name">{{ p.name }}</div>
          <div class="card-meta">{{ p.grid_rows }}×{{ p.grid_cols }} · {{ colorCount(p) }}色</div>
          <div class="card-progress"><div class="card-progress-bar" :style="{ width: progress(p) + '%' }"></div></div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !projects.length" class="empty">
      <div class="empty-icon">📭</div>
      <div>此图库还没有项目</div>
    </div>

    <div v-if="loadError" class="empty">
      <div class="empty-icon">⚠️</div>
      <div>{{ loadError }}</div>
      <button class="btn btn-primary" style="margin-top:12px" @click="fetchProjects">重试</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()
const manageMode = ref(false)
const selected = reactive(new Set())
const projects = ref([])
const loading = ref(true)
const loadError = ref('')

const dotColors = ['#E8F0FE','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#FDE68A','#FBBF24','#F59E0B','#EF4444','#DC2626','#16A34A','#22C55E','#8B5CF6','#EC4899']

function colorCount(p) {
  // Use a rough estimate if grid_data is not loaded in list endpoint
  return p.color_count || Math.max(1, Math.floor(p.grid_rows * p.grid_cols / 50))
}

function progress(p) {
  return p.status === 'completed' ? 100 : p.status === 'processing' ? 50 : 0
}

async function fetchProjects() {
  loading.value = true
  loadError.value = ''
  try {
    const folderId = route.params.id
    const res = await api.get('/projects', { params: { folder_id: folderId } })
    projects.value = res.data
  } catch (e) {
    loadError.value = e.response?.data?.detail || '加载失败'
  } finally {
    loading.value = false
  }
}

function goDetail(id) { router.push(`/project/${id}`) }
function toggle(id) { selected.has(id) ? selected.delete(id) : selected.add(id) }

onMounted(fetchProjects)
watch(() => route.params.id, fetchProjects)
</script>

<style scoped>
.action-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.btn {
  padding: 8px 20px; border-radius: var(--radius-sm); font-size: 14px;
  cursor: pointer; border: none; transition: var(--transition);
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }
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

.loading { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
</style>
