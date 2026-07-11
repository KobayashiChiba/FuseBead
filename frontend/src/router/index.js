import { createRouter, createWebHistory } from 'vue-router'

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
    meta: { layout: 'main' },
  },
  {
    path: '/gallery/:id',
    name: 'Gallery',
    component: () => import('@/views/GalleryView.vue'),
    meta: { layout: 'main' },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { layout: 'main' },
  },

  // Editor (topnav only, no sidebar)
  {
    path: '/project/new',
    name: 'ProjectCreate',
    component: () => import('@/views/ProjectCreateView.vue'),
    meta: { layout: 'editor' },
  },
  {
    path: '/project/:id/recognize',
    name: 'Recognize',
    component: () => import('@/views/RecognizeView.vue'),
    meta: { layout: 'editor' },
  },
  {
    path: '/project/:id',
    name: 'ProjectDetail',
    component: () => import('@/views/ProjectDetailView.vue'),
    meta: { layout: 'editor' },
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

export default router
