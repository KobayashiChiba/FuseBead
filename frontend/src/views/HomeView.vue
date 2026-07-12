<template>
  <div class="home">
    <!-- Page Title -->
    <h2 class="page-title">📁 首页</h2>

    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-primary" @click="showNewFolder = true">+ 新建图库</button>
      <span class="spacer"></span>
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'card' }" @click="viewMode = 'card'">▦</button>
        <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">☰</button>
      </div>
      <div class="divider"></div>
      <button class="btn btn-outline" @click="manageMode = !manageMode">{{ manageMode ? '✓ 完成' : '☐ 管理' }}</button>
    </div>

    <!-- Loading / Error / Empty -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="loadError" class="empty">
      <div class="empty-icon">⚠️</div>
      <div>{{ loadError }}</div>
      <button class="btn btn-primary" style="margin-top:12px" @click="fetchGalleries">重试</button>
    </div>
    <div v-else-if="!galleries.length" class="empty">
      <div class="empty-icon">📂</div>
      <div>还没有图库，点击"+ 新建图库"开始</div>
    </div>

    <!-- Card View -->
    <template v-else-if="viewMode === 'card'">
      <div class="card-grid">
        <div v-for="g in pagedGalleries" :key="g.id" class="card" @click="manageMode ? null : goGallery(g.id)">
          <div class="card-thumb">{{ folderIcon(g) }}</div>
          <div class="card-body">
            <div class="card-name">{{ g.name }}</div>
            <div class="card-meta">{{ g.project_count }} 个项目{{ g.is_default ? '' : ' · ' + (g.is_public ? '公开' : '私有') }}</div>
            <div v-if="manageMode" class="card-actions">
              <button class="btn btn-outline btn-xs" @click.stop="editGallery(g)">✎</button>
              <button v-if="!g.is_default" class="btn btn-danger btn-xs" @click.stop="confirmDelete(g)">✕</button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- List View -->
    <table v-else class="list-table">
      <thead>
        <tr>
          <th></th>
          <th style="width:190px">名称</th>
          <th>简介</th>
          <th v-if="manageMode" class="col-actions">操作</th>
          <th style="width:80px">项目数</th>
          <th style="width:60px">公开</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="g in pagedGalleries" :key="g.id" @click="manageMode ? null : goGallery(g.id)">
          <td style="width:44px"><span class="folder-icon">{{ folderIcon(g) }}</span></td>
          <td class="list-name">{{ g.name }}<span v-if="g.is_default" class="default-tag">默认</span></td>
          <td class="cell-desc">{{ g.description || '-' }}</td>
          <td v-if="manageMode" class="col-actions">
            <div class="list-actions">
              <button class="btn btn-outline btn-xs" @click.stop="editGallery(g)">✎ 编辑</button>
              <button v-if="!g.is_default" class="btn btn-danger btn-xs" @click.stop="confirmDelete(g)">✕ 删除</button>
            </div>
          </td>
          <td class="cell-secondary">{{ g.project_count }}</td>
          <td class="cell-secondary">{{ g.is_public ? '是' : '-' }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Pagination -->
    <div v-if="galleries.length > pageSize" class="pagination">
      <button class="pg-btn" :disabled="page <= 1" @click="page--">← 上一页</button>
      <template v-for="p in pages" :key="p">
        <span v-if="p === '...'" class="pg-ellipsis">...</span>
        <button v-else :class="['pg-btn', { active: p === page }]" @click="page = p">{{ p }}</button>
      </template>
      <button class="pg-btn" :disabled="page >= totalPages" @click="page++">下一页 →</button>
      <span class="pg-info">共 {{ galleries.length }} 个图库</span>
      <span class="pg-jump">跳至 <input v-model="pageJump" @keyup.enter="page = clampPage(+pageJump)"> 页</span>
    </div>

    <!-- New Folder Dialog -->
    <div v-if="showNewFolder" class="modal-overlay" @click.self="showNewFolder = false">
      <div class="modal-card">
        <h3>新建图库</h3>
        <div class="form-group"><label>名称</label><input class="form-input" v-model="newFolderName" placeholder="图库名称" maxlength="12" ref="newFolderInput" @keyup.enter="createFolder" /></div>
        <div class="form-group"><label>简介</label><textarea v-model="newFolderDesc" placeholder="图库简介（选填）" maxlength="50"></textarea></div>
        <div class="form-group">
          <label class="checkbox-label"><input type="checkbox" v-model="newFolderPublic" /> 公开图库</label>
        </div>
        <p class="auth-error" v-if="newFolderError">{{ newFolderError }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="showNewFolder = false">取消</button>
          <button class="btn btn-primary" :disabled="creating" @click="createFolder">{{ creating ? '创建中...' : '创建' }}</button>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <div class="modal-card" style="width:480px">
        <h3>编辑图库「{{ editing.name }}」</h3>
        <div class="form-group"><label>名称</label><input class="form-input" v-model="editForm.name" maxlength="12" /></div>
        <div class="form-group"><label>简介</label><textarea v-model="editForm.description" placeholder="图库简介（选填）" maxlength="50"></textarea></div>

        <!-- Cover -->
        <div class="form-group">
          <label>封面</label>
          <div class="cover-row">
            <div class="cover-preview">
              <img v-if="editCoverCustom && coverProjects.find(p => p.id === editCoverCustom)" src="" class="cover-img" />
              <span v-else class="cover-folder">📂</span>
            </div>
            <div class="cover-info">
              <span v-if="editCoverCustom" class="cover-text">自定义封面（项目 #{{ editCoverCustom }}）</span>
              <span v-else class="cover-text">默认（自动选择第一张图）</span>
              <button class="btn btn-outline btn-sm" @click="showCoverPicker = !showCoverPicker">{{ showCoverPicker ? '收起' : '修改封面' }}</button>
            </div>
          </div>
          <div v-if="showCoverPicker" class="cover-picker">
            <div :class="['cover-option', { selected: !editCoverCustom }]" @click="editCoverCustom = null; showCoverPicker = false">
              <span class="cover-option-label">📂<br>自动</span>
            </div>
            <div v-for="p in coverProjects" :key="p.id"
              :class="['cover-option', { selected: editCoverCustom === p.id }]"
              @click="editCoverCustom = p.id; showCoverPicker = false">
              <span class="cover-option-icon">🧩</span>
              <span class="cover-option-name">{{ p.name }}</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="checkbox-label"><input type="checkbox" v-model="editForm.is_public" /> 公开图库</label>
        </div>
        <p class="auth-error" v-if="editError">{{ editError }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="editing = null">取消</button>
          <button class="btn btn-primary" :disabled="saving" @click="saveEdit">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm Dialog -->
    <div v-if="deleting" class="modal-overlay" @click.self="deleting = null; deleteConfirmName = ''">
      <div class="modal-card">
        <h3>删除图库</h3>
        <div class="delete-warning">
          <strong>⚠ 此操作不可撤销</strong>
          将永久删除图库「{{ deleting.name }}」。请输入图库名称确认删除。
        </div>
        <div class="form-group">
          <label>请输入图库名称</label>
          <input class="form-input" v-model="deleteConfirmName" :placeholder="deleting.name" @keyup.enter="doDelete" />
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="deleteTransferProjects" /> 将图库内的拼豆项目转移到「默认图库」
          </label>
        </div>
        <p class="auth-error" v-if="deleteError">{{ deleteError }}</p>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="deleting = null; deleteConfirmName = ''">取消</button>
          <button class="btn btn-danger" :disabled="deleteConfirmName !== deleting.name || deleting2" @click="doDelete">{{ deleting2 ? '删除中...' : '确认删除' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()
const galleries = ref([])
const loading = ref(true)
const loadError = ref('')
const manageMode = ref(false)
const viewMode = ref('card')

// Pagination
const pageSize = 20
const page = ref(1)
const pageJump = ref('1')
const totalPages = computed(() => Math.ceil(galleries.value.length / pageSize))
const pagedGalleries = computed(() => {
  const s = (page.value - 1) * pageSize
  return galleries.value.slice(s, s + pageSize)
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

// Folder icon mapping
function folderIcon(g) { return '📂' }

// New folder
const showNewFolder = ref(false)
const newFolderName = ref('')
const newFolderDesc = ref('')
const newFolderPublic = ref(false)
const newFolderError = ref('')
const creating = ref(false)
const newFolderInput = ref(null)

// Edit
const editing = ref(null)
const editForm = reactive({ name: '', description: '', is_public: false })
const editError = ref('')
const saving = ref(false)
const showCoverPicker = ref(false)
const editCoverCustom = ref(null)
const coverProjects = ref([])

// Delete
const deleting = ref(null)
const deleteConfirmName = ref('')
const deleteTransferProjects = ref(true)
const deleteError = ref('')
const deleting2 = ref(false)

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
  if (!newFolderName.value.trim()) { newFolderError.value = '请输入图库名称'; return }
  creating.value = true
  try {
    await api.post('/folders', {
      name: newFolderName.value.trim(),
      description: newFolderDesc.value.trim() || null,
      is_public: newFolderPublic.value,
    })
    showNewFolder.value = false
    newFolderName.value = ''
    newFolderDesc.value = ''
    newFolderPublic.value = false
    await fetchGalleries()
  } catch (e) {
    newFolderError.value = e.response?.data?.detail || '创建失败'
  } finally {
    creating.value = false
  }
}

async function editGallery(g) {
  editForm.name = g.name
  editForm.description = g.description || ''
  editForm.is_public = g.is_public || false
  editError.value = ''
  showCoverPicker.value = false
  editCoverCustom.value = g.thumbnail_project_id || null
  coverProjects.value = []
  editing.value = g

  // Fetch projects for cover picker
  try {
    const res = await api.get('/projects', { params: { folder_id: g.id } })
    coverProjects.value = res.data
  } catch { /* silently fail */ }
}

async function saveEdit() {
  if (!editForm.name.trim()) return
  saving.value = true
  editError.value = ''
  try {
    await api.patch(`/folders/${editing.value.id}`, {
      name: editForm.name.trim(),
      description: editForm.description || null,
      is_public: editForm.is_public,
      thumbnail_project_id: editCoverCustom.value,
    })
    editing.value = null
    await fetchGalleries()
  } catch (e) {
    editError.value = e.response?.data?.detail || '保存失败'
  } finally {
    saving.value = false
  }
}

function confirmDelete(g) {
  deleting.value = g
  deleteConfirmName.value = ''
  deleteTransferProjects.value = true
  deleteError.value = ''
}

async function doDelete() {
  if (deleteConfirmName.value !== deleting.value.name) return
  deleting2.value = true
  deleteError.value = ''
  try {
    await api.delete(`/folders/${deleting.value.id}`)
    deleting.value = null
    deleteConfirmName.value = ''
    await fetchGalleries()
  } catch (e) {
    deleteError.value = e.response?.data?.detail || '删除失败'
  } finally {
    deleting2.value = false
  }
}

function goGallery(id) { router.push(`/gallery/${id}`) }

onMounted(fetchGalleries)
</script>

<style scoped>
/* Action Bar */
.action-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; padding: 12px 16px; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); }
.action-bar .spacer { flex: 1; }
.action-bar .divider { width: 1px; height: 24px; background: var(--border); margin: 0 4px; }

.btn { padding: 7px 16px; border-radius: var(--radius-sm); font-size: 13px; cursor: pointer; border: none; transition: var(--transition); white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; font-family: inherit; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }
.btn-danger { background: var(--danger); color: #fff; }
.btn-danger:hover { background: #DC2626; }
.btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-xs { padding: 4px 10px; font-size: 11px; }

.view-toggle { display: flex; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.view-toggle button { padding: 6px 10px; border: none; background: #fff; cursor: pointer; font-size: 15px; transition: var(--transition); line-height: 1; }
.view-toggle button.active { background: var(--primary-light); color: var(--primary); }
.view-toggle button:not(.active):hover { background: var(--bg-sidebar); }

/* Cards */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; transition: var(--transition); position: relative; }
.card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.card-thumb { width: 100%; aspect-ratio: 1; background: var(--bg-sidebar); display: flex; align-items: center; justify-content: center; font-size: 48px; }
.card-body { padding: 10px 14px; position: relative; min-height: 50px; }
.card-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.card-meta { font-size: 11px; color: var(--text-secondary); }
.card-actions { position: absolute; bottom: 8px; right: 8px; display: flex; gap: 8px; }

/* List Table */
.list-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: var(--radius); overflow: hidden; border: 1px solid var(--border); }
.list-table th { text-align: left; padding: 10px 14px; font-size: 12px; color: var(--text-secondary); font-weight: 600; background: var(--bg-sidebar); border-bottom: 1px solid var(--border); white-space: nowrap; }
.list-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid var(--border); }
.list-table tr:last-child td { border-bottom: none; }
.list-table tbody tr { transition: var(--transition); cursor: pointer; }
.list-table tbody tr:hover { background: #F8FAFC; }
.list-table .col-actions { width: 110px; white-space: nowrap; }
.list-actions { display: flex; gap: 8px; }
.list-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-secondary { color: var(--text-secondary); }
.cell-desc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); font-size: 12px; }
.default-tag { font-size: 11px; color: var(--text-secondary); margin-left: 6px; }
.folder-icon { font-size: 24px; margin-right: 8px; vertical-align: middle; }

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
.modal-card .form-group { margin-bottom: 14px; }
.modal-card label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.modal-card .form-input, .modal-card textarea { width: 100%; padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 14px; outline: none; font-family: inherit; box-sizing: border-box; }
.modal-card .form-input:focus, .modal-card textarea:focus { border-color: var(--primary); }
.modal-card textarea { resize: vertical; min-height: 60px; }
.modal-card .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.modal-card .checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; }
.modal-card .hint { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.delete-warning { font-size: 13px; color: var(--danger); background: var(--danger-light); padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 14px; line-height: 1.5; }
.delete-warning strong { display: block; margin-bottom: 2px; }
.auth-error { font-size: 13px; color: var(--danger); margin-top: 8px; }

.form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 14px; outline: none; box-sizing: border-box; }
.form-input:focus { border-color: var(--primary); }

.loading { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty-icon { font-size: 48px; margin-bottom: 16px; }

.page-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; }

/* Cover picker */
.cover-row { display: flex; align-items: center; gap: 12px; }
.cover-preview { width: 64px; height: 64px; border-radius: var(--radius-sm); border: 2px solid var(--border); overflow: hidden; background: var(--bg-sidebar); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cover-preview .cover-folder { font-size: 32px; }
.cover-preview .cover-img { width: 100%; height: 100%; object-fit: cover; }
.cover-info { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.cover-text { font-size: 12px; color: var(--text-secondary); }
.cover-picker { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; padding: 8px; background: var(--bg-sidebar); border-radius: var(--radius-sm); max-height: 180px; overflow-y: auto; }
.cover-option { aspect-ratio: 1; border-radius: var(--radius-sm); border: 2px solid var(--border); overflow: hidden; cursor: pointer; transition: var(--transition); background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.cover-option:hover { border-color: var(--primary); }
.cover-option.selected { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.cover-option.selected::after { content: '✓'; position: absolute; top: 4px; right: 6px; background: var(--primary); color: #fff; width: 18px; height: 18px; border-radius: 9px; font-size: 11px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.cover-option-label { font-size: 11px; color: var(--text-secondary); text-align: center; }
.cover-option-icon { font-size: 24px; }
.cover-option-name { font-size: 10px; color: var(--text-secondary); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%; }
</style>
