<template>
  <div class="sd-overlay" @click.self="$emit('close')">
    <div class="sd-card">
      <h3>颜色简化</h3>
      <p class="sd-desc">HSL 距离小于阈值的颜色将合并，保留出现次数最多的颜色。</p>

      <div class="sd-field">
        <label>HSL 阈值</label>
        <div class="sd-slider-row">
          <input type="range" min="5" max="80" v-model.number="threshold" />
          <span class="sd-val">{{ threshold }}</span>
        </div>
      </div>

      <div class="sd-actions">
        <button class="btn btn-outline btn-sm" @click="$emit('close')">取消</button>
        <button class="btn btn-primary btn-sm" @click="confirm">开始简化</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['close', 'confirm'])
const threshold = ref(25)

function confirm() {
  emit('confirm', threshold.value)
}
</script>

<style scoped>
.sd-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 500;
}
.sd-card {
  background: #fff; border-radius: var(--radius);
  padding: 24px; max-width: 360px; width: 100%;
  box-shadow: var(--shadow-md);
}
.sd-card h3 { font-size: 16px; margin-bottom: 8px; }
.sd-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
.sd-field { margin-bottom: 20px; }
.sd-field label { display: block; font-size: 13px; margin-bottom: 8px; font-weight: 500; }
.sd-slider-row {
  display: flex; align-items: center; gap: 12px;
}
.sd-slider-row input { flex: 1; accent-color: var(--primary); }
.sd-val { font-size: 14px; font-weight: 600; color: var(--primary); width: 30px; }
.sd-actions {
  display: flex; gap: 8px; justify-content: flex-end;
}
</style>
