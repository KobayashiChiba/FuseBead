// ══════════════════════════════════════════════
//  认证工具（纯前端 localStorage 方案）
// ══════════════════════════════════════════════

const AUTH_KEY = 'fbead_auth'
const AUTH_PASSWORD = 'KC2026'

export function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === '1'
}

export function doLogin(password) {
  if (password === AUTH_PASSWORD) {
    localStorage.setItem(AUTH_KEY, '1')
    return true
  }
  return false
}

export function doLogout() {
  localStorage.removeItem(AUTH_KEY)
}

export function requireAuth() {
  return isLoggedIn()
}
