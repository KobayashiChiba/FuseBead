import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  // Auth
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { layout: 'auth' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { layout: 'auth' },
  },

  // Main (with sidebar + topnav)
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { layout: 'main', requireAuth: true },
  },
  {
    path: '/gallery/:id',
    name: 'Gallery',
    component: () => import('@/views/GalleryView.vue'),
    meta: { layout: 'main', requireAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { layout: 'main', requireAuth: true, requireAdmin: true },
  },

  // Editor (topnav only, no sidebar)
  {
    path: '/project/new',
    name: 'ProjectCreate',
    component: () => import('@/views/ProjectCreateView.vue'),
    meta: { layout: 'editor', requireAuth: true },
  },
  {
    path: '/project/:id',
    name: 'ProjectDetail',
    component: () => import('@/views/ProjectDetailView.vue'),
    meta: { layout: 'editor', requireAuth: true },
  },

  {
    path: '/project/:id/edit',
    name: 'ProjectEdit',
    component: () => import('@/views/ProjectEditView.vue'),
    meta: { layout: 'editor', requireAuth: true },
  },

  // Public
  {
    path: '/user/:username',
    name: 'UserGallery',
    component: () => import('@/views/UserGalleryView.vue'),
    meta: { layout: 'public' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requireAuth && !auth.isLoggedIn) {
    return next('/login')
  }
  if (to.meta.requireAdmin && !auth.isAdmin) {
    return next('/')
  }
  next()
})

export default router
