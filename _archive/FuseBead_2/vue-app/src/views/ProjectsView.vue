<template>
  <div>
    <header class="header">
      <div class="header-inner">
        <h1>🧩 拼豆识别</h1>
        <span class="subtitle">图片 → 拼豆图纸</span>
      </div>
    </header>

    <div class="container">
      <div class="step-card active">
        <div class="projects-header">
          <div>
            <h2>📂 已保存的项目</h2>
            <p class="step-desc" style="margin-bottom:0;">选择要加载的拼豆项目</p>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-outline btn-sm" @click="loadProjects">刷新</button>
            <router-link to="/" class="btn btn-outline btn-sm">返回首页</router-link>
          </div>
        </div>

        <div class="projects-grid" v-if="projects.length > 0">
          <div
            v-for="p in projects"
            :key="p.id"
            class="project-item"
          >
            <img
              class="thumb"
              :src="p.has_thumbnail ? `/api/projects/${p.id}/thumbnail` : ''"
              :alt="p.name"
              @error="onThumbError"
            >
            <div class="info">
              <div class="name">{{ p.name }}</div>
              <div class="meta">{{ p.rows }}×{{ p.cols }} | {{ p.total_cells }} 格 | {{ p.color_count }} 色 | {{ p.created_at }}</div>
            </div>
            <div class="actions">
              <button class="btn btn-primary btn-sm" @click="loadProject(p.id)">加载</button>
              <button class="btn btn-danger btn-sm" @click="deleteProject(p.id)">删除</button>
            </div>
          </div>
        </div>

        <p v-if="loading" style="text-align:center;color:var(--text-secondary);padding:40px 0;">
          加载中...
        </p>
        <p v-else-if="projects.length === 0" style="text-align:center;color:var(--text-secondary);padding:40px 0;">
          暂无保存的项目
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toast, escHtml } from '../utils/common.js'

const router = useRouter()
const projects = ref([])
const loading = ref(true)

function onThumbError(e) {
  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect fill='%23eee' width='80' height='80'/%3E%3Ctext x='40' y='40' text-anchor='middle' fill='%23999' font-size='24'%3E📄%3C/text%3E%3C/svg%3E"
}

async function loadProjects() {
  loading.value = true
  projects.value = []
  try {
    const res = await fetch('/api/projects')
    const data = await res.json()
    loading.value = false
    if (data.projects && data.projects.length > 0) {
      projects.value = data.projects
    }
  } catch (err) {
    loading.value = false
    toast('加载失败: ' + err.message)
  }
}

function loadProject(projectId) {
  router.push('/view?project_id=' + projectId)
}

async function deleteProject(projectId) {
  if (!confirm('确定要删除这个项目吗？')) return
  try {
    const res = await fetch('/api/projects/' + projectId, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      toast('项目已删除')
      loadProjects()
    } else {
      toast('删除失败')
    }
  } catch (err) {
    toast('删除失败: ' + err.message)
  }
}

onMounted(() => {
  loadProjects()
})
</script>
