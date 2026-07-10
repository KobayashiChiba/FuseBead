<template>
  <div class="home">
    <!-- Action Bar -->
    <div class="action-bar">
      <button class="btn btn-primary">+ 创建项目</button>
      <button class="btn btn-outline">{{ manageMode ? '完成' : '☐ 管理' }}</button>
    </div>

    <!-- Gallery Cards -->
    <div class="gallery-grid">
      <div
        v-for="g in galleries"
        :key="g.id"
        :class="['gallery-card', { selected: selected.has(g.id) }]"
        @click="manageMode ? toggleSelect(g.id) : goGallery(g.id)"
      >
        <div v-if="manageMode" class="card-check">
          <input type="checkbox" :checked="selected.has(g.id)" />
        </div>
        <div class="card-preview">
          <div class="card-grid">
            <div v-for="i in 4" :key="i" class="card-dot"
              :style="{ background: dotColors[(g.id * 4 + i) % dotColors.length] }"
            ></div>
          </div>
        </div>
        <div class="card-body">
          <div class="card-name">{{ g.name }}</div>
          <div class="card-meta">{{ g.project_count }} 个项目</div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!galleries.length" class="empty">
      <div class="empty-icon">📂</div>
      <div>还没有图库，点击"+ 创建项目"开始</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const manageMode = ref(false)
const selected = reactive(new Set())

const galleries = [
  { id: 1, name: '默认图库', project_count: 3 },
  { id: 2, name: '分享区', project_count: 2 },
  { id: 3, name: '宝可梦', project_count: 5 },
  { id: 4, name: '风景', project_count: 7 },
  { id: 5, name: '建筑', project_count: 0 },
]

const dotColors = ['#E8F0FE','#DBEAFE','#BFDBFE','#93C5FD','#60A5FA','#3B82F6']

function goGallery(id) { router.push(`/gallery/${id}`) }
function toggleSelect(id) {
  if (selected.has(id)) selected.delete(id)
  else selected.add(id)
}
</script>

<style scoped>
.action-bar {
  display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
}
.btn {
  padding: 8px 20px; border-radius: var(--radius-sm); font-size: 14px;
  cursor: pointer; border: none; transition: var(--transition);
}
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-dark); }
.btn-outline { background: #fff; color: var(--text-secondary); border: 1px solid var(--border); }
.btn-outline:hover { background: var(--bg-sidebar); }

.gallery-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}
.gallery-card {
  background: #fff; border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; cursor: pointer; transition: var(--transition);
  position: relative;
}
.gallery-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.gallery-card.selected { border-color: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.card-check {
  position: absolute; top: 8px; left: 8px; z-index: 1;
  width: 22px; height: 22px; background: #fff; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
.card-preview {
  height: 120px; background: var(--bg-sidebar);
  display: flex; align-items: center; justify-content: center;
}
.card-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; width: 60px; height: 60px; }
.card-dot { border-radius: 2px; }
.card-body { padding: 12px 16px; }
.card-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.card-meta { font-size: 12px; color: var(--text-secondary); }

.empty { text-align: center; padding: 80px 0; color: var(--text-secondary); }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
</style>
