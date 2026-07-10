<template>
  <div class="main-layout">
    <TopNav :title="title" nickname="小林千叶" />
    <div class="main-body">
      <Sidebar
        :user="user"
        :galleries="galleries"
        :active-id="activeId"
        @select="$emit('select-gallery', $event)"
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
  user: { type: Object, default: () => ({ nickname: '小林千叶', username: 'xiaolin', avatar: '' }) },
  galleries: { type: Array, default: () => [] },
  activeId: { type: Number, default: null },
})
defineEmits(['select-gallery'])
</script>

<style scoped>
.main-body { display: flex; padding-top: 60px; }
.main-content {
  margin-left: 280px; flex: 1; padding: 24px 32px;
  min-height: calc(100vh - 60px);
}
</style>
