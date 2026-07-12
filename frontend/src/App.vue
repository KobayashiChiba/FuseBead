<template>
  <component :is="layoutComponent" v-bind="layoutProps">
    <router-view />
  </component>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MainLayout from '@/components/MainLayout.vue'
import TopNav from '@/components/TopNav.vue'
import api from '@/utils/api'

const route = useRoute()
const auth = useAuthStore()

// Fetch galleries for sidebar
const galleries = ref([])

async function fetchGalleries() {
  if (!auth.isLoggedIn) return
  try {
    const res = await api.get('/folders')
    galleries.value = res.data
  } catch { /* sidebar silently fails */ }
}

const layoutComponent = computed(() => {
  const layout = route.meta.layout || 'main'
  if (layout === 'auth') return 'div'
  if (layout === 'editor') return EditorLayout
  if (layout === 'public') return PublicLayout
  return MainLayout
})

const layoutProps = computed(() => {
  const layout = route.meta.layout || 'main'
  const user = auth.user || {}
  if (layout === 'main') {
    const title = route.name === 'Home' ? '我的图库'
      : route.name === 'Gallery' ? '图库项目'
      : route.name === 'Admin' ? '管理后台'
      : ''
    return {
      title,
      galleries: galleries.value,
      activeId: parseInt(route.params.id) || null,
      user: {
        nickname: user.nickname || '用户',
        username: user.username || '',
        avatar: user.avatar_url || '',
      },
    }
  }
  if (layout === 'editor') {
    return {
      title: route.name === 'ProjectCreate' ? '新建项目' : '项目详情',
      nickname: user.nickname || '',
    }
  }
  return {}
})

// Re-fetch galleries on login change
onMounted(async () => {
  if (auth.isLoggedIn) {
    await auth.fetchMe()
    fetchGalleries()
  }
})
watch(() => auth.isLoggedIn, async (val) => {
  if (val) {
    await auth.fetchMe()
    fetchGalleries()
  }
})
</script>

<script>
import { h } from 'vue'

const EditorLayout = {
  props: ['title', 'nickname'],
  setup(props, { slots }) {
    return () => h('div', [
      h(TopNav, { title: props.title, nickname: props.nickname || '' }),
      h('div', { style: { paddingTop: '60px', minHeight: '100vh' } }, slots.default?.())
    ])
  }
}

const PublicLayout = {
  setup(_, { slots }) {
    return () => h('div', { style: { minHeight: '100vh' } }, slots.default?.())
  }
}
</script>
