<template>
  <div class="gallery-view">
    <!-- Page Title -->
    <h2 class="page-title">📂 {{ galleryName }}</h2>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="back-btn" @click="$router.push('/')">← 返回</button>
      <div class="divider"></div>
      <button class="btn btn-primary" @click="$router.push(`/project/new?folder_id=${route.params.id}`)">+ 创建项目</button>
      <span class="spacer"></span>
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'card' }" @click="viewMode = 'card'">▦</button>
        <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">☰</button>
      </div>
      <div class="divider"></div>
      <button class="btn btn-outline" @click="toggleManage">{{ manageMode ? '✓ 完成' : '☐ 管理' }}</button>
    </div>

    <!-- Batch Action Bar -->
    <div v-if="manageMode" class="batch-slide">
      <span class="count">已选 {{ selected.size }} / {{ pagedProjects.length }}</span>
      <button class="btn btn-outline btn-sm btn-w4" @click="toggleSelectAll">{{ allSelected ? '取消全选' : '全选' }}</button>
      <button class="btn btn-danger btn-sm" :disabled="!selected.size" @click="showDeleteConfirm = true">🗑 删除选中</button>
      <button class="btn btn-outline btn-sm" :disabled="!selected.size" @click="openMove">📁 移动到...</button>
      <span class="spacer"></span>
    </div>

    <!-- Loading / Error / Empty -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="loadError" class="empty">
      <div class="empty-icon">⚠️</div>
      <div>{{ loadError }}</div>
      <button class="btn btn-primary" style="margin-top:12px" @click="fetchProjects">重试</button>
    </div>
    <div v-else-if="!projects.length" class="empty">
      <div class="empty-icon">📭</div>
      <div>此图库还没有项目</div>
    </div>

    <!-- Card View -->
    <template v-else-if="viewMode === 'card'">
      <div class="card-grid">
        <div v-for="p in pagedProjects" :key="p.id"
          :class="['card', { selected: manageMode && selected.has(p.id) }]"
          @click="manageMode ? toggleSelect(p.id) : goDetail(p.id)">
          <div v-if="manageMode" class="card-check"></div>
          <div class="card-thumb">
            <img v-if="p.thumbnail" :src="p.thumbnail" class="card-thumb-img" />
            <span v-else class="card-thumb-placeholder">🧩</span>
          </div>
          <div class="card-body">
            <div class="card-name">{{ p.name }}</div>
            <div class="card-meta">{{ p.grid_rows }}×{{ p.grid_cols }} · {{ colorCount(p) }}色</div>
            <div class="card-progress"><div class="card-progress-bar" :style="{ width: progress(p) + '%' }"></div></div>
          </div>
        </div>
      </div>
    </template>

    <!-- List View -->
    <table v-else class="list-table">
      <thead>
        <tr>
          <th v-if="manageMode" class="col-check"></th>
          <th>预览</th>
          <th>名称</th>
          <th style="width:90px">尺寸</th>
          <th style="width:60px">色数</th>
          <th style="width:80px">状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in pagedProjects" :key="p.id"
          :class="{ selected: manageMode && selected.has(p.id) }"
          @click="manageMode ? toggleSelect(p.id) : goDetail(p.id)">
          <td v-if="manageMode" class="col-check"><input type="checkbox" :checked="selected.has(p.id)" /></td>
          <td style="width:44px">
            <img v-if="p.thumbnail" :src="p.thumbnail" class="list-thumb" />
            <span v-else class="list-icon">🧩</span>
          </td>
          <td class="list-name">{{ p.name }}</td>
          <td class="cell-secondary">{{ p.grid_rows }}×{{ p.grid_cols }}</td>
          <td class="cell-secondary">{{ colorCount(p) }}</td>
          <td><span :class="['status-badge', p.status]">{{ statusLabel(p.status) }}</span></td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div v-if="projects.length > pageSize" class="pagination">
      <button class="pg-btn" :disabled="page <= 1" @click="page--">← 上一页</button>
      <template v-for="p in pages" :key="p">
        <span v-if="p === '...'" class="pg-ellipsis">...</span>
        <button v-else :class="['pg-btn', { active: p === page }]" @click="page = p">{{ p }}</button>
      </template>
      <button class="pg-btn" :disabled="page >= totalPages" @click="page++">下一页 →</button>
      <span class="pg-info">共 {{ projects.length }} 个项目</span>
      <span class="pg-jump">跳至 <input v-model="pageJump" @keyup.enter="page = clampPage(+pageJump)"> 页</span>
    </div>

    <!-- Delete Confirm Dialog -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="modal-card">
        <h3>确认删除</h3>
        <div class="delete-warning">
          <strong>⚠ 将删除 {{ selected.size }} 个项目</strong>
          删除后数据将永久丢失，不可恢复。
        </div>
        <p class="auth-error" v-if="deleteError">{{ deleteError }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showDeleteConfirm = false">取消</button>
          <button class="btn btn-danger" :disabled="batchDeleting" @click="doBatchDelete">{{ batchDeleting ? '删除中...' : '确认删除' }}</button>
        </div>
      </div>
    </div>

    <!-- Move Dialog -->
    <div v-if="showMoveDialog" class="modal-overlay" @click.self="showMoveDialog = false">
      <div class="modal-card">
        <h3>移动到...</h3>
        <p class="move-hint">将 {{ selected.size }} 个项目移动到：</p>
        <div class="gallery-list">
          <div v-for="f in folderList" :key="f.id" class="gallery-list-item" @click="doMove(f.id)">
            <span class="list-icon">{{ folderIcon(f) }}</span> {{ f.name }}
          </div>
        </div>
        <p class="auth-error" v-if="moveError">{{ moveError }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showMoveDialog = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const route = useRoute()
const projects = ref([])
const loading = ref(true)
const loadError = ref('')
const manageMode = ref(false)
const viewMode = ref('card')
const selected = reactive(new Set())
const galleryName = ref('')

// Pagination
const pageSize = 20
const page = ref(1)
const pageJump = ref('1')
const totalPages = computed(() => Math.ceil(projects.value.length / pageSize))
const pagedProjects = computed(() => {
  const s = (page.value - 1) * pageSize
  return projects.value.slice(s, s + pageSize)
})
const pages = computed(() => {
  const cur = page.value, total = totalPages.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const arr = [1]
  if (cur > 3) arr.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) arr.push(i)
  if (cur < total - 2) arr.push('...')
  arr.push(total)
  return arr
})
function clampPage(v) { return Math.max(1, Math.min(totalPages.value, Math.floor(v) || 1)) }

const allSelected = computed(() => pagedProjects.value.length > 0 && pagedProjects.value.every(p => selected.has(p.id)))

function toggleManage() {
  manageMode.value = !manageMode.value
  if (!manageMode.value) selected.clear()
}
function toggleSelect(id) {
  if (selected.has(id)) selected.delete(id)
  else selected.add(id)
}
function toggleSelectAll() {
  if (allSelected.value) pagedProjects.value.forEach(p => selected.delete(p.id))
  else pagedProjects.value.forEach(p => selected.add(p.id))
}

function colorCount(p) {
  return p.color_count || '—'
}
function progress(p) {
  return p.status === 'completed' ? 100 : p.status === 'processing' ? 50 : 0
}
function statusLabel(s) {
  return s === 'completed' ? '已完成' : s === 'processing' ? '进行中' : '未开始'
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

async function fetchGalleryName() {
  try {
    const res = await api.get('/folders')
    const f = res.data.find(f => f.id === +route.params.id)
    if (f) galleryName.value = f.name
  } catch { /* silently fail */ }
}

// Batch delete
const showDeleteConfirm = ref(false)
const batchDeleting = ref(false)
const deleteError = ref('')
async function doBatchDelete() {
  batchDeleting.value = true
  deleteError.value = ''
  try {
    const ids = [...selected]
    await Promise.all(ids.map(id => api.delete(`/projects/${id}`)))
    selected.clear()
    showDeleteConfirm.value = false
    await fetchProjects()
  } catch (e) {
    deleteError.value = e.response?.data?.detail || '删除失败'
  } finally {
    batchDeleting.value = false
  }
}

// Move
const showMoveDialog = ref(false)
const folderList = ref([])
const moveError = ref('')
const folderIcons = ['📂', '⚡', '🏔️', '🏛️', '🎨', '🎮', '🌸', '🌊', '🔥', '💎']
function folderIcon(f) { return folderIcons[f.id % folderIcons.length] }

async function openMove() {
  moveError.value = ''
  showMoveDialog.value = true
  try {
    const res = await api.get('/folders')
    folderList.value = res.data.filter(f => f.id !== +route.params.id)
  } catch { /* silently fail */ }
}

async function doMove(targetId) {
  moveError.value = ''
  try {
    const ids = [...selected]
    await Promise.all(ids.map(id => api.patch(`/projects/${id}`, { folder_id: targetId })))
    selected.clear()
    showMoveDialog.value = false
    await fetchProjects()
  } catch (e) {
    moveError.value = e.response?.data?.detail || '移动失败'
  }
}

onMounted(() => { fetchGalleryName(); fetchProjects() })
watch(() => route.params.id, () => { page.value = 1; fetchGalleryName(); fetchProjects() })
</script>

<style scoped>
/* Action Bar */
.action-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 0; padding: 12px 16px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius) var(--radius) 0 0; position: relative; z-index: 10; }
.action-bar .spacer { flex: 1; }
.action-bar .divider { width: 1px; height: 24px; background: var(--border); margin: 0 4px; }

.back-btn { display: flex; align-items: center; gap: 2px; font-size: 13px; color: var(--text-secondary); cursor: pointer; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid transparent; background: transparent; font-family: inherit; transition: var(--transition); }
.back-btn:hover { background: var(--bg-sidebar); border-color: var(--border); color: var(--primary); }

.btn { padding: 7px 16px; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; border: none; transition: var(--transition); white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; font-family: inherit; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { background: #DC2626; }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-w4 { width: 72px; text-align: center; justify-content: center; }

.view-toggle { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.view-toggle button { padding: 6px 10px; border: none; background: #fff; cursor: pointer; font-size: 15px; transition: var(--transition); line-height: 1; }
.view-toggle button.active { background: var(--primary-light); color: var(--primary); }
.view-toggle button:not(.active):hover { background: var(--bg-sidebar); }

/* Batch bar */
.batch-slide { background: var(--primary-light); border: 1px solid var(--primary); border-top: none; border-radius: 0 0 var(--radius) var(--radius); padding: 10px 16px; display: flex; align-items: center; gap: 10px; margin-bottom: 16px; animation: slideDown 0.2s ease; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.batch-slide .count { color: var(--primary); font-size: 13px; font-weight: 600; white-space: nowrap; }
.batch-slide .spacer { flex: 1; }

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: var(--transition); position: relative; }
.card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.card.selected { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.card-check { position: absolute; top: 8px; left: 8px; z-index: 2; width: 20px; height: 20px; background: rgba(255,255,255,0.95); border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--border); }
.card.selected .card-check { border-color: var(--primary); background: var(--primary); }
.card.selected .card-check::after { content: '✓'; color: #fff; font-size: 12px; font-weight: 700; }
.card-thumb { width: 100%; aspect-ratio: 1; background: var(--bg-sidebar); display: flex; align-items: center; justify-content: center; font-size: 48px; position: relative; overflow: hidden; }
.card-thumb-img { width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0; }
.card-thumb-placeholder { position: relative; z-index: 1; }
.card-body { padding: 10px 14px; }
.card-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.card-meta { font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; }
.card-progress { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.card-progress-bar { height: 100%; background: var(--primary); border-radius: 2px; transition: width 0.3s; }

/* List Table */
.list-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
.list-table th { text-align: left; padding: 10px 14px; font-size: 12px; color: var(--text-secondary); font-weight: 600; background: var(--bg-sidebar); border-bottom: 1px solid var(--border); white-space: nowrap; }
.list-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--border); }
.list-table tr:last-child td { border-bottom: none; }
.list-table tbody tr { transition: var(--transition); cursor: pointer; }
.list-table tbody tr:hover { background: #F8FAFC; }
.list-table tr.selected { background: var(--primary-light); }
.list-table .col-check { width: 36px; }
.list-name { font-weight: 500; }
.cell-secondary { color: var(--text-secondary); }
.list-icon { font-size: 20px; }
.list-thumb { width: 32px; height: 32px; object-fit: cover; border-radius: 4px; }

.status-badge { font-size: 11px; padding: 1px 6px; border-radius: 8px; }
.status-badge.completed, .status-badge.done { background: #DCFCE7; color: #166534; }
.status-badge.processing, .status-badge.doing { background: #FEF9C3; color: #854D0E; }
.status-badge:not(.completed):not(.done):not(.processing):not(.doing) { background: #F3F4F6; color: #6B7280; }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 24px; padding: 12px 0; }
.pg-btn { min-width: 34px; height: 34px; padding: 0 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: #fff; cursor: pointer; font-size: 13px; color: var(--text-secondary); transition: var(--transition); display: inline-flex; align-items: center; justify-content: center; font-family: inherit; }
.pg-btn:hover:not(.active):not(:disabled) { background: var(--bg-sidebar); border-color: #94A3B8; }
.pg-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 600; }
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-ellipsis { width: 34px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.pg-info { font-size: 12px; color: var(--text-secondary); margin-left: 12px; }
.pg-jump { display: flex; align-items: center; gap: 6px; margin-left: 12px; font-size: 12px; color: var(--text-secondary); }
.pg-jump input { width: 44px; height: 30px; text-align: center; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; outline: none; font-family: inherit; }
.pg-jump input:focus { border-color: var(--primary); }

/* Modals */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 500; }
.modal-card { background: #fff; border-radius: var(--radius); padding: 28px; width: 420px; box-shadow: var(--shadow-lg); }
.modal-card h3 { font-size: 16px; margin-bottom: 16px; }
.modal-card .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.move-hint { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.delete-warning { font-size: 13px; color: var(--danger); background: var(--danger-light); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 14px; line-height: 1.5; }
.delete-warning strong { display: block; margin-bottom: 2px; }
.auth-error { font-size: 13px; color: var(--danger); margin-top: 8px; }

.gallery-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius-sm); }
.gallery-list-item { padding: 10px 14px; cursor: pointer; font-size: 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; transition: var(--transition); }
.gallery-list-item:last-child { border-bottom: none; }
.gallery-list-item:hover { background: var(--primary-light); color: var(--primary); }

.loading { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty-icon { font-size: 48px; margin-bottom: 16px; }

.page-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
</style>
