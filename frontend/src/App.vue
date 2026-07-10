<template>
  <component :is="layoutComponent" v-bind="layoutProps">
    <router-view />
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/components/MainLayout.vue'
import TopNav from '@/components/TopNav.vue'

const route = useRoute()

// Mock data shared across layouts
const galleries = [
  { id: 1, name: '默认图库', project_count: 3 },
  { id: 2, name: '分享区', project_count: 2 },
  { id: 3, name: '宝可梦', project_count: 5 },
  { id: 4, name: '风景', project_count: 7 },
  { id: 5, name: '建筑', project_count: 0 },
]

const layoutComponent = computed(() => {
  const layout = route.meta.layout || 'main'
  if (layout === 'auth') return 'div'  // auth pages are standalone
  if (layout === 'editor') return EditorLayout
  return MainLayout
})

const layoutProps = computed(() => {
  const layout = route.meta.layout || 'main'
  if (layout === 'main') {
    return {
      title: '我的图库',
      galleries,
      activeId: parseInt(route.params.id) || 1,
      user: { nickname: '小林千叶', username: 'xiaolin', avatar: '' },
    }
  }
  if (layout === 'editor') return { title: route.name === 'ProjectCreate' ? '新建项目' : '项目详情' }
  return {}
})
</script>

<script>
import { h } from 'vue'
const EditorLayout = {
  props: ['title'],
  setup(props, { slots }) {
    return () => h('div', [
      h(TopNav, { title: props.title, nickname: '小林千叶' }),
      h('div', { style: { paddingTop: '60px', minHeight: '100vh' } }, slots.default?.())
    ])
  }
}
</script>
