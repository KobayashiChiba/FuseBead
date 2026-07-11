<template>
  <div class="home">
    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-primary" @click="showNewFolder = true">+ 新建图库</button>
      <button class="btn btn-outline" v-if="false">{{ manageMode ? '完成' : '☐ 管理' }}</button>
    </div>

    <!-- Gallery Cards -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="gallery-grid">
      <div
        v-for="g in galleries"
        :key="g.id"
        :class="['gallery-card', { selected: selected.has(g.id) }]"
        @click="manageMode ? toggleSelect(g.id) : goGallery(g.id)"
      >
        <div v-if="manageMode" class="card-check">
          <input type="checkbox" :checked="selected.has(g.id)" />
        </div>
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
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !galleries.length" class="empty">
      <div class="empty-icon">📂</div>
      <div>还没有图库，点击"+ 新建图库"开始</div>
    </div>

    <!-- Error State -->
    <div v-if="loadError" class="empty">
      <div class="empty-icon">⚠️</div>
      <div>{{ loadError }}</div>
      <button class="btn btn-primary" style="margin-top:12px" @click="fetchGalleries">重试</button>
    </div>

    <!-- New Folder Dialog -->
    <div v-if="showNewFolder" class="modal-overlay" @click.self="showNewFolder = false">
      <div class="modal-card">
        <h3>新建图库</h3>
        <input
          class="form-input"
          v-model="newFolderName"
          placeholder="图库名称"
          @keyup.enter="createFolder"
          ref="newFolderInput"
        />
        <p class="auth-error" v-if="newFolderError">{{ newFolderError }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showNewFolder = false">取消</button>
          <button class="btn btn-primary" :disabled="creating" @click="createFolder">
            {{ creating ? '创建中...' : '创建' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const manageMode = ref(false)
const selected = reactive(new Set())
const galleries = ref([])
const loading = ref(true)
const loadError = ref('')

// New folder dialog
const showNewFolder = ref(false)
const newFolderName = ref('')
const newFolderError = ref('')
const creating = ref(false)
const newFolderInput = ref(null)

const dotColors = ['#E8F0FE','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6']

async function fetchGalleries() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.get('/folders')
    galleries.value = res.data
  } catch (e) {
    loadError.value = e.response?.data?.detail || '加载失败'
  } finally {
    loading.value = false
  }
}

async function createFolder() {
  newFolderError.value = ''
  if (!newFolderName.value.trim()) {
    newFolderError.value = '请输入图库名称'
    return
  }
  creating.value = true
  try {
    await api.post('/folders', { name: newFolderName.value.trim() })
    showNewFolder.value = false
    newFolderName.value = ''
    await fetchGalleries()
  } catch (e) {
    newFolderError.value = e.response?.data?.detail || '创建失败'
  } finally {
    creating.value = false
  }
}

function goGallery(id) { router.push(`/gallery/${id}`) }
function toggleSelect(id) {
  if (selected.has(id)) selected.delete(id)
  else selected.add(id)
}

onMounted(fetchGalleries)
</script>

<style scoped>
.action-bar {
  display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
}
.btn {
  padding: 8px 20px; border-radius: var(--radius-sm); font-size: 14px;
  cursor: pointer; border: none; transition: var(--transition);
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }

.gallery-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.gallery-card {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; cursor: pointer; transition: var(--transition);
  position: relative;
}
.gallery-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.gallery-card.selected { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.card-check {
  position: absolute; top: 8px; left: 8px; z-index: 1;
  width: 22px; height: 22px; background: #fff; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
.card-preview {
  height: 120px; background: var(--bg-sidebar);
  display: flex; align-items: center; justify-content: center;
}
.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 60px; height: 60px; }
.card-dot { border-radius: 2px; }
.card-body { padding: 12px 16px; }
.card-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.card-meta { font-size: 12px; color: var(--text-secondary); }

.loading { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty-icon { font-size: 48px; margin-bottom: 16px; }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3); display: flex; align-items: center;
  justify-content: center; z-index: 200;
}
.modal-card {
  background: #fff; border-radius: var(--radius); padding: 24px;
  width: 360px; box-shadow: var(--shadow-lg);
}
.modal-card h3 { margin-bottom: 16px; font-size: 16px; }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.form-input {
  width: 100%; padding: 10px 12px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); font-size: 14px; outline: none;
  box-sizing: border-box;
}
.form-input:focus { border-color: var(--primary); }
.auth-error { font-size: 13px; color: var(--danger); margin-top: 8px; }
</style>
