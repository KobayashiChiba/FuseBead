<template>
  <aside class="sidebar">
    <div class="sidebar-user">
      <img :src="user.avatar" class="sidebar-avatar" alt="" />
      <div class="sidebar-nickname">{{ user.nickname }}</div>
      <div class="sidebar-username">@{{ user.username }}</div>
    </div>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section">
      <div class="sidebar-label">我的图库</div>
      <ul class="sidebar-list">
        <li
          v-for="g in galleries"
          :key="g.id"
          :class="['sidebar-item', { active: activeId === g.id }]"
          @click="$emit('select', g.id)"
        >
          <span class="sidebar-item-name">{{ g.name }}</span>
          <span class="sidebar-item-count">{{ g.project_count }}</span>
        </li>
      </ul>
      <button class="sidebar-add">+ 新建图库</button>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  user: { type: Object, default: () => ({ nickname: '', username: '', avatar: '' }) },
  galleries: { type: Array, default: () => [] },
  activeId: { type: Number, default: null },
})
defineEmits(['select'])
</script>

<style scoped>
.sidebar {
  width: 280px; min-height: calc(100vh - 60px);
  background: var(--bg-sidebar); border-right: 1px solid var(--border);
  padding: 24px 16px; position: fixed; top: 60px; left: 0;
  overflow-y: auto;
}
.sidebar-user { text-align: center; margin-bottom: 20px; }
.sidebar-avatar {
  width: 72px; height: 72px; border-radius: 50%; background: var(--primary-light);
  margin-bottom: 12px;
}
.sidebar-nickname { font-size: 16px; font-weight: 600; }
.sidebar-username { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
.sidebar-divider { height: 1px; background: var(--border); margin-bottom: 16px; }
.sidebar-label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
.sidebar-list { list-style: none; }
.sidebar-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer;
  font-size: 14px; transition: var(--transition);
}
.sidebar-item:hover { background: #EEF2FF; }
.sidebar-item.active { background: var(--primary-light); color: var(--primary); font-weight: 500; }
.sidebar-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-item-count { font-size: 12px; color: var(--text-secondary); }
.sidebar-add {
  margin-top: 8px; background: none; border: 1px dashed var(--border);
  color: var(--primary); font-size: 13px; padding: 6px 12px;
  border-radius: var(--radius-sm); cursor: pointer; width: 100%; text-align: center;
}
.sidebar-add:hover { background: var(--primary-light); }
</style>
