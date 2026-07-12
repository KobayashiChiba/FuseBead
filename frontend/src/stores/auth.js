import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)
  const settings = ref(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.is_admin ?? false)

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password })
    token.value = res.data.access_token
    user.value = res.data.user
    localStorage.setItem('token', token.value)
    return res.data
  }

  async function register(data) {
    const res = await api.post('/auth/register', data)
    token.value = res.data.access_token
    user.value = res.data.user
    localStorage.setItem('token', token.value)
    return res.data
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await api.get('/auth/me')
      user.value = res.data
    } catch {
      logout()
    }
  }

  async function updateProfile(data) {
    const res = await api.patch('/users/me', data)
    user.value = res.data
    return res.data
  }

  async function changePassword(oldPassword, newPassword) {
    const res = await api.patch('/auth/password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
    return res.data
  }

  async function fetchSettings() {
    if (!token.value) return
    try {
      const res = await api.get('/users/me/settings')
      settings.value = res.data
      return res.data
    } catch {
      settings.value = { default_color_card_id: null }
    }
  }

  async function updateSettings(data) {
    const res = await api.patch('/users/me/settings', data)
    settings.value = res.data
    return res.data
  }

  function logout() {
    token.value = ''
    user.value = null
    settings.value = null
    localStorage.removeItem('token')
  }

  return {
    token, user, settings,
    isLoggedIn, isAdmin,
    login, register, fetchMe, logout,
    updateProfile, changePassword,
    fetchSettings, updateSettings,
  }
})
