<template>
  <div class="settings-page">
    <h2 class="page-title">
      ⚙️ 设置
      <button class="back-btn" @click="$router.push('/')">← 返回</button>
    </h2>

    <div class="settings-layout">
      <!-- 子导航 -->
      <nav class="settings-nav">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['nav-item', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </nav>

      <!-- 内容区 -->
      <div class="settings-content">
        <!-- ===== 基础信息 ===== -->
        <section v-if="activeTab === 'profile'" class="section">
          <h3 class="section-title">👤 基础信息</h3>

          <div class="field-group">
            <label class="field-label">头像</label>
            <div class="avatar-row">
              <img
                :src="avatarPreview"
                class="settings-avatar"
                alt=""
                @click="triggerAvatar"
                @error="avatarPreview = '/default-avatar.png'"
              />
              <div class="avatar-actions">
                <button class="btn btn-outline btn-sm" @click="triggerAvatar">更换头像</button>
                <span class="field-hint">支持 PNG / JPG / GIF / WebP，最大 5MB</span>
              </div>
              <input
                ref="avatarInput"
                type="file"
                accept="image/*"
                hidden
                @change="onAvatarChange"
              />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">用户名</label>
            <input class="field-input" :value="auth.user?.username || ''" disabled />
            <span class="field-hint">用户名不可修改</span>
          </div>

          <div class="field-group">
            <label class="field-label">昵称</label>
            <div class="field-row">
              <input
                v-model="profileForm.nickname"
                class="field-input"
                placeholder="设置昵称"
                maxlength="64"
              />
              <button
                class="btn btn-primary"
                :disabled="profileSaving || !profileForm.nickname"
                @click="saveProfile"
              >
                {{ profileSaving ? '保存中...' : '保存' }}
              </button>
            </div>
            <span v-if="profileMsg" class="field-msg" :class="profileMsgType">{{ profileMsg }}</span>
          </div>

          <div class="field-group">
            <label class="field-label">注册时间</label>
            <input
              class="field-input"
              :value="formatDate(auth.user?.created_at)"
              disabled
            />
          </div>
        </section>

        <!-- ===== 安全 ===== -->
        <section v-if="activeTab === 'security'" class="section">
          <h3 class="section-title">🔒 安全</h3>

          <div v-if="!pwMode" class="subsection">
            <button class="btn btn-primary" @click="pwMode = 'choose'">修改密码</button>
          </div>

          <!-- 选择修改方式 -->
          <div v-else-if="pwMode === 'choose'" class="subsection">
            <h4 class="subsection-title">修改密码</h4>
            <div class="mode-buttons">
              <button
                :class="['mode-btn', { active: pwMethod === 'current' }]"
                @click="pwMethod = 'current'"
              >输入当前密码</button>
              <button
                :class="['mode-btn', { active: pwMethod === 'reset' }]"
                @click="pwMethod = 'reset'"
              >使用重置验证码</button>
            </div>

            <!-- 方式一：当前密码 -->
            <template v-if="pwMethod === 'current'">
              <div class="field-group">
                <label class="field-label">当前密码</label>
                <input v-model="pwForm.oldPassword" class="field-input" type="password" placeholder="输入当前密码" />
              </div>
              <div class="field-group">
                <label class="field-label">新密码</label>
                <input v-model="pwForm.newPassword" class="field-input" type="password" placeholder="至少 6 位" minlength="6" />
              </div>
              <div class="field-group">
                <label class="field-label">确认新密码</label>
                <input v-model="pwForm.confirmPassword" class="field-input" type="password" placeholder="再次输入新密码" />
              </div>
              <div class="field-group">
                <button class="btn btn-primary" :disabled="pwSaving || !canChangePassword" @click="savePassword">
                  {{ pwSaving ? '修改中...' : '确认修改' }}
                </button>
                <button class="btn btn-outline" style="margin-left:8px" @click="cancelPw">取消</button>
                <span v-if="pwMsg" class="field-msg" :class="pwMsgType">{{ pwMsg }}</span>
              </div>
            </template>

            <!-- 方式二：重置验证码 -->
            <template v-if="pwMethod === 'reset'">
              <p class="subsection-desc">请联系管理员获取密码重置码</p>
              <div class="field-group">
                <label class="field-label">重置验证码</label>
                <input v-model="resetForm.verifyCode" class="field-input" placeholder="管理员提供的验证码" />
              </div>
              <div class="field-group">
                <label class="field-label">新密码</label>
                <input v-model="resetForm.newPassword" class="field-input" type="password" placeholder="至少 6 位" minlength="6" />
              </div>
              <div class="field-group">
                <label class="field-label">确认新密码</label>
                <input v-model="resetForm.confirmPassword" class="field-input" type="password" placeholder="再次输入新密码" />
              </div>
              <div class="field-group">
                <button class="btn btn-primary" :disabled="resetSaving || !canReset" @click="saveReset">
                  {{ resetSaving ? '重置中...' : '确认重置' }}
                </button>
                <button class="btn btn-outline" style="margin-left:8px" @click="cancelPw">取消</button>
                <span v-if="resetMsg" class="field-msg" :class="resetMsgType">{{ resetMsg }}</span>
              </div>
            </template>
          </div>
        </section>

        <!-- ===== 默认色卡 ===== -->
        <section v-if="activeTab === 'colorcard'" class="section">
          <h3 class="section-title">🎨 默认色卡</h3>
          <p class="subsection-desc">选择一张色卡作为新建项目时的默认色卡</p>

          <div v-if="cardsLoading" class="loading">加载中...</div>
          <div v-else-if="cardsError" class="empty">
            <div class="empty-icon">⚠️</div>
            <div>{{ cardsError }}</div>
            <button class="btn btn-outline" style="margin-top:8px" @click="loadCards">重试</button>
          </div>
          <div v-else class="cards-grid">
            <div
              v-for="card in cards"
              :key="card.id"
              :class="['card-item', { selected: selectedCardId === card.id }]"
              @click="selectCard(card.id)"
            >
              <div class="card-header">
                <span class="card-name">{{ card.name }}</span>
                <span v-if="card.is_system" class="card-badge">系统</span>
                <span class="card-count">{{ card.color_count }} 色</span>
              </div>
              <ColorCard
                :colors="card.colors || []"
                :model-value="''"
                :selectable="false"
                :card-name="''"
                :show-empty="false"
              />
              <div v-if="selectedCardId === card.id" class="card-check">✓ 当前默认</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/api'
import ColorCard from '@/components/ColorCard.vue'

const auth = useAuthStore()

// ── 子导航 ──
const tabs = [
  { key: 'profile', icon: '👤', label: '基础信息' },
  { key: 'security', icon: '🔒', label: '安全' },
  { key: 'colorcard', icon: '🎨', label: '默认色卡' },
]
const activeTab = ref('profile')

// ── 基础信息 ──
const avatarInput = ref(null)
const avatarPreview = ref(auth.user?.avatar_url || '/default-avatar.png')
const profileForm = ref({ nickname: '' })
const profileSaving = ref(false)
const profileMsg = ref('')
const profileMsgType = ref('')

function triggerAvatar() {
  avatarInput.value?.click()
}

async function onAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  // 本地预览
  avatarPreview.value = URL.createObjectURL(file)
  // 上传
  const form = new FormData()
  form.append('file', file)
  try {
    const res = await api.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    auth.user.avatar_url = res.data.avatar_url
    avatarPreview.value = res.data.avatar_url
    profileMsg.value = '头像已更新'
    profileMsgType.value = 'success'
  } catch (e) {
    avatarPreview.value = auth.user?.avatar_url || '/default-avatar.png'
    profileMsg.value = e.response?.data?.detail || '上传失败'
    profileMsgType.value = 'error'
  }
}

onMounted(() => {
  if (auth.user) {
    profileForm.value.nickname = auth.user.nickname
  }
})

async function saveProfile() {
  profileSaving.value = true
  profileMsg.value = ''
  try {
    await auth.updateProfile({ nickname: profileForm.value.nickname })
    profileMsg.value = '昵称已更新'
    profileMsgType.value = 'success'
  } catch (e) {
    profileMsg.value = e.response?.data?.detail || '保存失败'
    profileMsgType.value = 'error'
  } finally {
    profileSaving.value = false
  }
}

// ── 安全 ──
const pwMode = ref('')     // '' | 'choose'
const pwMethod = ref('current')  // 'current' | 'reset'
const pwForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwSaving = ref(false)
const pwMsg = ref('')
const pwMsgType = ref('')

const canChangePassword = computed(() => {
  const f = pwForm.value
  return f.oldPassword && f.newPassword.length >= 6 && f.newPassword === f.confirmPassword
})

function cancelPw() {
  pwMode.value = ''
  pwMethod.value = 'current'
  pwForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  resetForm.value = { verifyCode: '', newPassword: '', confirmPassword: '' }
  pwMsg.value = ''
  resetMsg.value = ''
}

async function savePassword() {
  if (!canChangePassword.value) return
  pwSaving.value = true
  pwMsg.value = ''
  try {
    await auth.changePassword(pwForm.value.oldPassword, pwForm.value.newPassword)
    cancelPw()
    pwMsg.value = '密码已修改'
    pwMsgType.value = 'success'
  } catch (e) {
    pwMsg.value = e.response?.data?.detail || '修改失败'
    pwMsgType.value = 'error'
  } finally {
    pwSaving.value = false
  }
}

// ── 忘记密码 ──
const resetForm = ref({ verifyCode: '', newPassword: '', confirmPassword: '' })
const resetSaving = ref(false)
const resetMsg = ref('')
const resetMsgType = ref('')

const canReset = computed(() => {
  const f = resetForm.value
  return f.verifyCode && f.newPassword.length >= 6 && f.newPassword === f.confirmPassword
})

async function saveReset() {
  if (!canReset.value) return
  resetSaving.value = true
  resetMsg.value = ''
  try {
    await api.post('/auth/reset-password', {
      username: auth.user?.username,
      verify_code: resetForm.value.verifyCode,
      new_password: resetForm.value.newPassword,
    })
    cancelPw()
    resetMsg.value = '密码已重置'
    resetMsgType.value = 'success'
  } catch (e) {
    resetMsg.value = e.response?.data?.detail || '重置失败'
    resetMsgType.value = 'error'
  } finally {
    resetSaving.value = false
  }
}

// ── 默认色卡 ──
const cards = ref([])
const cardsLoading = ref(false)
const cardsError = ref('')
const selectedCardId = ref(null)
const cardSaving = ref(false)

async function loadCards() {
  cardsLoading.value = true
  cardsError.value = ''
  try {
    const res = await api.get('/color-cards')
    const summaries = res.data
    // 逐个加载详情（含颜色数据）
    const details = await Promise.all(
      summaries.map(c => api.get(`/color-cards/${c.id}`))
    )
    cards.value = details.map(r => ({
      ...r.data,
      is_system: r.data.is_system ?? false,
    }))
  } catch (e) {
    cardsError.value = '加载色卡失败'
  } finally {
    cardsLoading.value = false
  }
}

async function selectCard(cardId) {
  if (cardSaving.value) return
  cardSaving.value = true
  try {
    await auth.updateSettings({ default_color_card_id: cardId })
    selectedCardId.value = cardId
  } catch (e) {
    console.error('保存默认色卡失败', e)
  } finally {
    cardSaving.value = false
  }
}

async function loadSettings() {
  try {
    const s = await auth.fetchSettings()
    if (s) selectedCardId.value = s.default_color_card_id
  } catch { /* ignore */ }
}

onMounted(() => {
  loadSettings()
  loadCards()
})

// ── 工具 ──
function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}
</script>

<style scoped>
.settings-page {
}
.page-title {
  font-size: 22px; font-weight: 700; margin-bottom: 24px; color: var(--text);
  display: flex; align-items: center; justify-content: space-between;
}
.back-btn {
  background: none; border: 1px solid var(--border); border-radius: 6px;
  padding: 4px 12px; font-size: 13px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s;
}
.back-btn:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
.settings-layout {
  display: flex; gap: 32px;
}

/* 子导航 */
.settings-nav {
  width: 160px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.nav-item {
  text-align: left; padding: 10px 14px;
  border: none; border-radius: 8px;
  background: transparent; color: var(--text-secondary);
  font-size: 14px; cursor: pointer; transition: all 0.15s;
}
.nav-item:hover { background: #f1f5f9; color: var(--text); }
.nav-item.active {
  background: var(--primary-light); color: var(--primary); font-weight: 600;
}

/* 内容 */
.settings-content {
  flex: 1; min-width: 0;
}
.section {
  background: #fff; border: 1px solid var(--border);
  border-radius: 12px; padding: 24px;
}
.section-title {
  font-size: 18px; font-weight: 600; margin-bottom: 20px; color: var(--text);
}
.subsection {
  margin-bottom: 16px;
}
.subsection-title {
  font-size: 15px; font-weight: 600; margin-bottom: 12px; color: var(--text);
}
.subsection-desc {
  font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5;
}

/* 模式切换按钮 */
.mode-buttons {
  display: flex; gap: 8px; margin-bottom: 20px;
}
.mode-btn {
  padding: 8px 20px; border: 1px solid var(--border);
  border-radius: 8px; background: #fff; color: var(--text-secondary);
  font-size: 14px; cursor: pointer; transition: all 0.15s;
}
.mode-btn:hover { border-color: #93c5fd; color: var(--primary); }
.mode-btn.active {
  border-color: var(--primary); background: var(--primary-light);
  color: var(--primary); font-weight: 600;
}
.section-divider {
  border: none; border-top: 1px solid var(--border);
  margin: 24px 0;
}

/* 字段 */
.field-group {
  margin-bottom: 16px;
}
.field-label {
  display: block; font-size: 13px; font-weight: 600;
  color: var(--text-secondary); margin-bottom: 6px;
}
.field-input {
  width: 100%; max-width: 360px; padding: 8px 12px;
  border: 1px solid var(--border); border-radius: 6px;
  font-size: 14px; color: var(--text); background: #fff;
  transition: border-color 0.15s;
}
.field-input:focus { outline: none; border-color: var(--primary); }
.field-input:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
.field-row {
  display: flex; align-items: center; gap: 12px;
}
.field-row .field-input { flex: 1; }
.field-hint {
  font-size: 12px; color: #94a3b8; margin-top: 4px; margin-left: 4px;
}
.field-msg {
  display: inline-block; font-size: 13px; margin-top: 4px;
}
.field-msg.success { color: #16a34a; }
.field-msg.error { color: #dc2626; }

/* 头像 */
.avatar-row {
  display: flex; align-items: center; gap: 16px; margin-bottom: 4px;
}
.settings-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--primary-light); object-fit: cover; cursor: pointer;
  transition: opacity 0.15s;
}
.settings-avatar:hover { opacity: 0.85; }
.avatar-actions {
  display: flex; flex-direction: column; gap: 4px;
}

/* 色卡列表 */
.cards-grid {
  display: flex; flex-direction: column; gap: 16px;
}
.card-item {
  border: 2px solid var(--border); border-radius: 12px;
  padding: 16px; cursor: pointer; transition: border-color 0.15s;
  overflow: auto;
}
.card-item:hover { border-color: #93c5fd; }
.card-item.selected { border-color: var(--primary); background: #eff6ff; }
.card-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
}
.card-name {
  font-size: 15px; font-weight: 600; color: var(--text);
}
.card-badge {
  font-size: 11px; background: #e2e8f0; color: #64748b;
  padding: 2px 8px; border-radius: 10px;
}
.card-count {
  font-size: 12px; color: var(--text-secondary);
  margin-left: auto;
}
.card-check {
  margin-top: 8px; font-size: 13px; font-weight: 600; color: var(--primary);
}

/* 通用 */
.loading { padding: 24px; text-align: center; color: var(--text-secondary); }
.empty { padding: 24px; text-align: center; color: var(--text-secondary); }
.empty-icon { font-size: 32px; margin-bottom: 8px; }

.btn { padding: 8px 20px; border-radius: 6px; font-size: 14px; cursor: pointer; border: none; font-weight: 500; transition: all 0.15s; }
.btn-sm { padding: 4px 14px; font-size: 13px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover:not(:disabled) { background: #1d4ed8; }
.btn-outline { background: #fff; color: var(--primary); border: 1px solid var(--primary); }
.btn-outline:hover:not(:disabled) { background: var(--primary-light); }
</style>
