<template>
  <div class="user-gallery">
    <div class="user-header">
      <div class="user-avatar">🧩</div>
      <h2>{{ username }} 的公开图库</h2>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="loadError" class="empty">
      <div>{{ loadError }}</div>
      <button class="btn btn-primary" style="margin-top:12px" @click="fetchGalleries">重试</button>
    </div>

    <!-- Gallery List -->
    <div v-else-if="!selectedGallery" class="gallery-grid">
      <div
        v-for="g in galleries"
        :key="g.id"
        class="gallery-card"
        @click="selectGallery(g)"
      >
        <div class="card-preview">
          <div class="card-grid">
            <div v-for="i in 4" :key="i" class="card-dot"
              :style="{ background: dotColors[(g.id * 4 + i) % dotColors.length] }"
            ></div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-name">{{ g.name }}</div>
          <div class="card-meta">{{ g.project_count }} 个项目</div>
        </div>
      </div>
      <div v-if="!galleries.length" class="empty" style="grid-column:1/-1">该用户暂无公开图库</div>
    </div>

    <!-- Project List (inside a gallery) -->
    <div v-else>
      <div class="back-row">
        <button class="btn btn-outline" @click="selectedGallery = null">← 返回图库列表</button>
        <span class="gallery-title">{{ selectedGallery.name }}</span>
      </div>
      <div v-if="projectsLoading" class="loading">加载中...</div>
      <div v-else-if="projectsError" class="empty">
        <div>{{ projectsError }}</div>
        <button class="btn btn-primary" style="margin-top:12px" @click="fetchProjects">重试</button>
      </div>
      <div v-else class="project-grid">
        <div
          v-for="p in projects"
          :key="p.id"
          class="project-card"
          @click="goProject(p.id)"
        >
          <div class="card-thumb">
            <div class="mini-grid" :style="{ gridTemplateColumns: `repeat(${Math.min(p.grid_cols, 5)}, 1fr)` }">
              <div v-for="i in Math.min(p.grid_cols * 3, 15)" :key="i" class="mini-cell"
                :style="{ background: dotColors[i % dotColors.length] }"></div>
            </div>
          </div>
          <div class="card-body">
            <div class="card-name">{{ p.name }}</div>
            <div class="card-meta">{{ p.grid_rows }}×{{ p.grid_cols }}</div>
          </div>
        </div>
        <div v-if="!projects.length" class="empty" style="grid-column:1/-1">此图库暂无项目</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const router = useRouter()
const username = route.params.username

const galleries = ref([])
const loading = ref(true)
const loadError = ref('')

const selectedGallery = ref(null)
const projects = ref([])
const projectsLoading = ref(false)
const projectsError = ref('')

const dotColors = ['#E8F0FE','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#FDE68A','#FBBF24','#F59E0B','#EF4444','#DC2626','#16A34A','#22C55E','#8B5CF6','#EC4899']

async function fetchGalleries() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.get(`/users/${username}/galleries`)
    galleries.value = res.data
  } catch (e) {
    loadError.value = e.response?.data?.detail || '加载失败'
  } finally {
    loading.value = false
  }
}

async function selectGallery(g) {
  selectedGallery.value = g
  await fetchProjects()
}

async function fetchProjects() {
  projectsLoading.value = true
  projectsError.value = ''
  try {
    const res = await api.get(`/galleries/${selectedGallery.value.id}/projects`)
    projects.value = res.data
  } catch (e) {
    projectsError.value = e.response?.data?.detail || '加载失败'
  } finally {
    projectsLoading.value = false
  }
}

function goProject(id) {
  router.push(`/project/${id}`)
}

onMounted(fetchGalleries)
</script>

<style scoped>
.user-gallery { max-width: 960px; margin: 0 auto; padding: 24px; }
.user-header {
  display: flex; align-items: center; gap: 16px; margin-bottom: 32px;
}
.user-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--primary-light); display: flex; align-items: center;
  justify-content: center; font-size: 28px;
}
.user-header h2 { font-size: 20px; font-weight: 700; }

.back-row {
  display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
}
.gallery-title { font-size: 16px; font-weight: 600; color: var(--text-secondary); }

.btn {
  padding: 8px 20px; border-radius: var(--radius-sm); font-size: 14px;
  cursor: pointer; border: none; transition: var(--transition);
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }

.gallery-grid, .project-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.gallery-card, .project-card {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; cursor: pointer; transition: var(--transition);
}
.gallery-card:hover, .project-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.card-preview, .card-thumb {
  height: 120px; background: var(--bg-sidebar);
  display: flex; align-items: center; justify-content: center;
}
.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 60px; height: 60px; }
.card-dot { border-radius: 2px; }
.mini-grid { display: grid; gap: 1px; background: #D0D0D0; padding: 1px; border-radius: 2px; }
.mini-cell { aspect-ratio: 1; border-radius: 1px; min-width: 12px; min-height: 12px; }
.card-body { padding: 12px 16px; }
.card-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.card-meta { font-size: 12px; color: var(--text-secondary); }

.loading { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty { text-align: center; padding: 80px 0; color: var(--text-secondary); }
</style>
