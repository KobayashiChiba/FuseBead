<template>
  <div class="login-body">
    <div class="login-wrap">
      <div class="login-card">
        <div class="login-icon">🧩</div>
        <h1 class="login-title">拼豆识别</h1>
        <p class="login-subtitle">请输入密码以继续</p>

        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <input
              class="form-input login-input"
              type="password"
              v-model="password"
              placeholder="请输入密码"
              autocomplete="off"
              ref="passwordInput"
            >
          </div>
          <p class="login-error">{{ errorMsg }}</p>
          <button class="btn btn-primary login-btn" type="submit">登 录</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { isLoggedIn, doLogin } from '../utils/auth.js'

const router = useRouter()
const password = ref('')
const errorMsg = ref('')
const passwordInput = ref(null)

onMounted(() => {
  if (isLoggedIn()) {
    router.replace('/')
  }
})

function handleLogin() {
  const pwd = password.value.trim()
  if (!pwd) {
    errorMsg.value = '请输入密码'
    return
  }
  if (doLogin(pwd)) {
    router.replace('/')
  } else {
    errorMsg.value = '密码错误，请重试'
    password.value = ''
    passwordInput.value?.focus()
  }
}
</script>
