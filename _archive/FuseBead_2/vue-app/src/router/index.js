import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '../utils/auth.js'
import LoginView from '../views/LoginView.vue'
import IndexView from '../views/IndexView.vue'
import RecognizeView from '../views/RecognizeView.vue'
import ConvertView from '../views/ConvertView.vue'
import EditView from '../views/EditView.vue'
import BeadView from '../views/BeadView.vue'
import ProjectsView from '../views/ProjectsView.vue'

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/', name: 'index', component: IndexView, meta: { requiresAuth: true } },
  { path: '/recognize', name: 'recognize', component: RecognizeView, meta: { requiresAuth: true } },
  { path: '/convert', name: 'convert', component: ConvertView, meta: { requiresAuth: true } },
  { path: '/edit', name: 'edit', component: EditView, meta: { requiresAuth: true } },
  { path: '/view', name: 'view', component: BeadView, meta: { requiresAuth: true } },
  { path: '/projects', name: 'projects', component: ProjectsView, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next('/login')
  } else if (to.path === '/login' && isLoggedIn()) {
    next('/')
  } else {
    next()
  }
})

export default router
