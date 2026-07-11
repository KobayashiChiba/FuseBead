<template>
  <div class="admin">
    <h2>管理后台</h2>

    <!-- Invite Codes Section -->
    <section class="admin-section">
      <div class="section-header">
        <h3>邀请码管理</h3>
        <div class="section-actions">
          <input
            class="form-input count-input"
            v-model.number="generateCount"
            type="number"
            min="1"
            max="20"
            placeholder="数量"
          />
          <button class="btn btn-primary" :disabled="generating" @click="generateCodes">
            {{ generating ? '生成中...' : '生成邀请码' }}
          </button>
        </div>
      </div>

      <p class="auth-error" v-if="genError">{{ genError }}</p>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="loadError" class="empty">
        <div>{{ loadError }}</div>
        <button class="btn btn-primary" style="margin-top:12px" @click="fetchCodes">重试</button>
      </div>
      <table v-else-if="codes.length" class="admin-table">
        <thead>
          <tr>
            <th>邀请码</th>
            <th>创建者</th>
            <th>使用者</th>
            <th>使用时间</th>
            <th>创建时间</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in codes" :key="c.id">
            <td><code>{{ c.code }}</code></td>
            <td>{{ c.created_by }}</td>
            <td>{{ c.used_by || '-' }}</td>
            <td>{{ c.used_at ? formatTime(c.used_at) : '-' }}</td>
            <td>{{ formatTime(c.created_at) }}</td>
            <td>
              <span :class="['status-badge', c.used_by ? 'used' : 'available']">
                {{ c.used_by ? '已使用' : '可用' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无邀请码</div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/api'

const codes = ref([])
const loading = ref(true)
const loadError = ref('')

const generateCount = ref(5)
const generating = ref(false)
const genError = ref('')

async function fetchCodes() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await api.get('/admin/invite-codes')
    codes.value = res.data
  } catch (e) {
    loadError.value = e.response?.data?.detail || '加载失败'
  } finally {
    loading.value = false
  }
}

async function generateCodes() {
  genError.value = ''
  if (!generateCount.value || generateCount.value < 1 || generateCount.value > 20) {
    genError.value = '数量需在 1-20 之间'
    return
  }
  generating.value = true
  try {
    await api.post('/admin/invite-codes', { count: generateCount.value })
    await fetchCodes()
  } catch (e) {
    genError.value = e.response?.data?.detail || '生成失败'
  } finally {
    generating.value = false
  }
}

function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(fetchCodes)
</script>

<style scoped>
.admin { max-width: 900px; }
.admin h2 { font-size: 20px; font-weight: 700; margin-bottom: 24px; }
.admin-section {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  padding: 24px;
}
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.section-header h3 { font-size: 16px; font-weight: 600; }
.section-actions { display: flex; align-items: center; gap: 8px; }
.count-input { width: 80px; padding: 6px 8px; }

.btn {
  padding: 8px 20px; border-radius: var(--radius-sm); font-size: 14px;
  cursor: pointer; border: none; transition: var(--transition);
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.form-input {
  padding: 8px 12px; border: 1px solid var(--border);
  border-radius: var(--radius-sm); font-size: 14px; outline: none;
}
.form-input:focus { border-color: var(--primary); }

.admin-table {
  width: 100%; border-collapse: collapse; font-size: 14px;
}
.admin-table th, .admin-table td {
  padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border);
}
.admin-table th { font-weight: 600; color: var(--text-secondary); font-size: 13px; }
.admin-table code { background: var(--bg-sidebar); padding: 2px 6px; border-radius: 3px; font-size: 13px; }

.status-badge {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 12px; font-weight: 500;
}
.status-badge.available { background: #DCFCE7; color: #166534; }
.status-badge.used { background: #F3F4F6; color: #6B7280; }

.loading { text-align: center; padding: 40px 0; color: var(--text-secondary); }
.empty { text-align: center; padding: 40px 0; color: var(--text-secondary); }
.auth-error { font-size: 13px; color: var(--danger); margin-bottom: 8px; }
</style>
