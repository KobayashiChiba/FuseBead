<template>
  <div class="cp-wrapper">
    <div class="cp-trigger" @click="open = !open">
      <span class="cp-swatch" :style="{ background: selectedHex }"></span>
      <span class="cp-label">{{ selectedCode }}</span>
      <span class="cp-arrow">▾</span>
    </div>
    <div v-if="open" class="cp-dropdown">
      <div class="cp-grid">
        <div
          v-for="c in colors"
          :key="c.code"
          class="cp-item"
          :class="{ selected: c.code === selectedCode }"
          :title="c.code"
          @click="select(c)"
        >
          <span class="cp-item-swatch" :style="{ background: '#' + c.hex }"></span>
          <span class="cp-item-label">{{ c.code }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  colors: { type: Array, required: true },
  modelValue: { type: String, default: 'H1' },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const selectedCode = computed(() => props.modelValue)
const selectedHex = computed(() => {
  const c = props.colors.find(c => c.code === selectedCode.value)
  return c ? '#' + c.hex : '#ccc'
})

function select(c) {
  emit('update:modelValue', c.code)
  open.value = false
}
</script>

<style scoped>
.cp-wrapper { position: relative; }
.cp-trigger {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  background: #fff;
  font-size: 13px;
}
.cp-trigger:hover { border-color: var(--primary); }
.cp-swatch {
  width: 18px; height: 18px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.1);
  flex-shrink: 0;
}
.cp-label { flex: 1; font-weight: 500; }
.cp-arrow { color: var(--text-secondary); font-size: 11px; }
.cp-dropdown {
  position: absolute; top: 100%; left: 0; z-index: 400;
  background: #fff; border: 1px solid var(--border);
  border-radius: var(--radius-sm); box-shadow: var(--shadow-md);
  max-height: 300px; overflow-y: auto; min-width: 220px;
  margin-top: 4px;
}
.cp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 2px; padding: 4px;
}
.cp-item {
  display: flex; align-items: center; gap: 4px;
  padding: 3px 6px; border-radius: 4px; cursor: pointer;
  font-size: 12px;
}
.cp-item:hover { background: var(--bg-sidebar); }
.cp-item.selected { background: var(--primary-light); }
.cp-item-swatch {
  width: 14px; height: 14px;
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.1);
  flex-shrink: 0;
}
.cp-item-label { white-space: nowrap; }
</style>
