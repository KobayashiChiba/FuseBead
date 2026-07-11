<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-icon">🧩</div>
      <h1 class="auth-title">FuseBead</h1>
      <p class="auth-subtitle">登录以继续</p>
      <form @submit.prevent>
        <div class="form-group">
          <input class="form-input auth-input" v-model="username" placeholder="用户名" />
        </div>
        <div class="form-group">
          <input class="form-input auth-input" v-model="password" type="password" placeholder="密码" />
        </div>
        <p class="auth-error" v-if="error">{{ error }}</p>
        <button class="btn btn-primary auth-btn" :disabled="loading" @click="handleLogin">{{ loading ? '登录中...' : '登 录' }}</button>
      </form>
      <p class="auth-footer">
        还没有账号？<router-link to="/register">注册</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  if (!username.value || !password.value) { error.value = '请填写用户名和密码'; return }
  loading.value = true
  try {
    await auth.login(username.value, password.value)
    await auth.fetchMe()
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.detail || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  padding: 20px;
}
.auth-card {
  background: #fff; border-radius: var(--radius); box-shadow: var(--shadow-md);
  padding: 40px 36px; width: 100%; max-width: 400px; text-align: center;
}
.auth-icon { font-size: 48px; margin-bottom: 8px; }
.auth-title { font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
.auth-subtitle { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
.auth-input { text-align: center; font-size: 15px; padding: 12px; }
.auth-error { font-size: 13px; color: var(--danger); margin-bottom: 8px; }
.auth-btn { width: 100%; justify-content: center; padding: 12px; font-size: 15px; margin-top: 4px; }
.auth-footer { margin-top: 16px; font-size: 13px; color: var(--text-secondary); }
</style>
