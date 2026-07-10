// ══════════════════════════════════════════════
//  Common Utility Functions
// ══════════════════════════════════════════════

function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}

function $(id) { return document.getElementById(id); }

function showLoading(btn) {
    btn.disabled = true;
    btn.dataset.origText = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span>';
}

function hideLoading(btn) {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.origText || btn.textContent;
}

function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}
