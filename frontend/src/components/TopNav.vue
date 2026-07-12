<template>
  <header class="topnav">
    <div class="topnav-left">
      <router-link to="/" class="topnav-logo">🧩 FuseBead</router-link>
      <span class="topnav-sep">|</span>
      <span class="topnav-title">{{ title }}</span>
    </div>
    <div class="topnav-right">
      <div class="topnav-user" @click="$router.push('/settings')">
        <img :src="avatar || '/default-avatar.png'" class="topnav-avatar" alt="" />
        <span class="topnav-name">{{ nickname || '用户' }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  nickname: { type: String, default: '用户' },
  avatar: { type: String, default: '' },
})
</script>

<style scoped>
.topnav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 60px; background: #fff; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
}
.topnav-left { display: flex; align-items: center; gap: 12px; }
.topnav-logo { font-size: 18px; font-weight: 700; color: var(--primary); text-decoration: none; }
.topnav-sep { color: var(--border); }
.topnav-title { font-size: 14px; color: var(--text-secondary); }
.topnav-right { display: flex; align-items: center; gap: 16px; }
.topnav-user { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.topnav-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--primary-light); object-fit: cover; }
.topnav-name { font-size: 14px; color: var(--text); }
</style>
