<template>
  <div>
    <header class="header">
      <div class="header-inner">
        <h1>🧩 拼豆识别</h1>
        <span class="subtitle">图片 → 拼豆图纸</span>
        <div class="header-right">
          <button class="btn btn-outline btn-sm" @click="handleLogout">退出</button>
        </div>
      </div>
    </header>

    <div class="container">
      <div class="step-card active">
        <h2>选择功能</h2>
        <p class="step-desc">请选择您需要的功能</p>

        <div class="index-cards">
          <router-link to="/recognize" class="func-card">
            <span class="card-icon">🧩</span>
            <div class="card-title">拼豆识别</div>
            <div class="card-desc">上传拼豆图片，自动识别网格中的每个色块，生成拼豆图纸</div>
          </router-link>
          <router-link to="/convert" class="func-card">
            <span class="card-icon">🖼️</span>
            <div class="card-title">图片转换</div>
            <div class="card-desc">将普通图片自动转换为拼豆图纸</div>
          </router-link>
          <router-link to="/projects" class="func-card">
            <span class="card-icon">📂</span>
            <div class="card-title">加载项目</div>
            <div class="card-desc">打开之前已保存的拼豆项目，继续查看或编辑</div>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { doLogout } from '../utils/auth.js'

const router = useRouter()

function handleLogout() {
  doLogout()
  router.replace('/login')
}
</script>
