<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-icon">🧩</div>
      <h1 class="auth-title">FuseBead</h1>
      <p class="auth-subtitle">创建新账号</p>
      <form @submit.prevent>
        <div class="form-group"><input class="form-input auth-input" v-model="form.username" placeholder="用户名" /></div>
        <div class="form-group"><input class="form-input auth-input" v-model="form.nickname" placeholder="昵称" /></div>
        <div class="form-group"><input class="form-input auth-input" v-model="form.password" type="password" placeholder="密码（6位以上）" /></div>
        <div class="form-group"><input class="form-input auth-input" v-model="form.invite_code" placeholder="邀请码" /></div>
        <p class="auth-error" v-if="error">{{ error }}</p>
        <button class="btn btn-primary auth-btn" :disabled="loading" @click="handleRegister">{{ loading ? '注册中...' : '注 册' }}</button>
      </form>
      <p class="auth-footer">
        已有账号？<router-link to="/login">登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ username: '', nickname: '', password: '', invite_code: '' })
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  if (!form.username || !form.nickname || !form.password || !form.invite_code) {
    error.value = '请填写所有字段'
    return
  }
  if (form.password.length < 6) {
    error.value = '密码至少6位'
    return
  }
  loading.value = true
  try {
    await auth.register({ ...form })
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.detail || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); padding: 20px;
}
.auth-card { background: #fff; border-radius: var(--radius); box-shadow: var(--shadow-md); padding: 36px 36px; width: 100%; max-width: 400px; text-align: center; }
.auth-icon { font-size: 48px; margin-bottom: 8px; }
.auth-title { font-size: 24px; font-weight: 700; color: var(--primary); margin-bottom: 4px; }
.auth-subtitle { font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; }
.auth-input { text-align: center; font-size: 15px; padding: 11px; }
.auth-error { font-size: 13px; color: var(--danger); margin-bottom: 8px; }
.auth-btn { width: 100%; justify-content: center; padding: 12px; font-size: 15px; margin-top: 4px; }
.auth-footer { margin-top: 16px; font-size: 13px; color: var(--text-secondary); }
</style>
