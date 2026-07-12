<template>
  <div>
    <div class="ccp-trigger" ref="triggerRef" @click="toggle">
      <span class="ccp-swatch" :class="{ 'ccp-empty-swatch': modelValue === '' }" :style="modelValue === '' ? {} : { background: selectedHex }"></span>
      <span class="ccp-label">{{ modelValue === '' ? '空格' : modelValue || '选择颜色' }}</span>
      <span class="ccp-arrow">▾</span>
    </div>
    <Teleport to="body">
      <div v-if="open" class="ccp-backdrop" @click="open = false"></div>
      <ColorCard
        v-if="open"
        :colors="colors"
        :modelValue="modelValue"
        :cardName="cardName"
        :showEmpty="showEmpty"
        :style="panelStyle"
        class="ccp-floating"
        @select="onSelect"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import ColorCard from '@/components/ColorCard.vue'

const props = defineProps({
  colors: { type: Array, required: true },
  modelValue: { type: String, default: 'H1' },
  cardName: { type: String, default: '' },
  showEmpty: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const triggerRef = ref(null)
const panelStyle = ref({})

function toggle() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => {
      const el = triggerRef.value
      if (!el) return
      const r = el.getBoundingClientRect()
      panelStyle.value = {
        position: 'fixed',
        top: r.top + 'px',
        left: (r.left - 8) + 'px',
        transform: 'translate(-100%, 0)',
      }
    })
  }
}

function onSelect(code) {
  emit('update:modelValue', code)
  open.value = false
}

const selectedHex = computed(() => {
  const c = props.colors.find(c => c.code === props.modelValue)
  return c ? '#' + c.hex : '#ccc'
})
</script>

<style scoped>
.ccp-trigger {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer; background: #fff; font-size: 13px;
}
.ccp-trigger:hover { border-color: var(--primary); }
.ccp-swatch {
  width: 24px; height: 24px; border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0;
}
.ccp-label { flex: 1; font-weight: 500; }
.ccp-empty-swatch {
  background-image: repeating-conic-gradient(#ddd 0% 25%, #f8f8f8 0% 50%);
  background-size: 8px 8px;
}
.ccp-arrow { color: var(--text-secondary); font-size: 11px; }
</style>

<style>
.ccp-backdrop { position: fixed; inset: 0; z-index: 999; }
.ccp-floating { z-index: 1000; }
</style>
