// ══════════════════════════════════════════════
//  Authentication Utilities
// ══════════════════════════════════════════════

const AUTH_KEY = 'fbead_auth';
const AUTH_PASSWORD = 'KC2026';

/** 检查是否已登录 */
function isLoggedIn() {
    return localStorage.getItem(AUTH_KEY) === '1';
}

/** 执行登录验证，成功返回 true */
function doLogin(password) {
    if (password === AUTH_PASSWORD) {
        localStorage.setItem(AUTH_KEY, '1');
        return true;
    }
    return false;
}

/** 退出登录 */
function doLogout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '/login';
}

/** 页面加载时验证登录状态，未登录则跳转 */
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/login';
    }
}
