<template>
  <div class="main-layout">
    <TopNav :title="title" :nickname="user.nickname" :avatar="user.avatar" />
    <div class="main-body">
      <Sidebar
        :user="user"
        :galleries="galleries"
        :active-id="activeId"
      />
      <main class="main-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import TopNav from './TopNav.vue'
import Sidebar from './Sidebar.vue'

defineProps({
  title: { type: String, default: '我的图库' },
  user: { type: Object, default: () => ({ nickname: '用户', username: '', avatar: '' }) },
  galleries: { type: Array, default: () => [] },
  activeId: { type: Number, default: null },
})
</script>

<style scoped>
.main-body { display: flex; padding-top: 60px; }
.main-content {
  margin-left: 280px; flex: 1; padding: 24px 32px;
  min-height: calc(100vh - 60px);
}
</style>
