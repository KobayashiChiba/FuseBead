<template>
  <div class="rd-overlay" @click.self="$emit('close')">
    <div class="rd-card">
      <h3>替换颜色 — {{ oldCode }}</h3>

      <div class="rd-top-row">
        <div class="rd-compare">
          <div class="rd-swatch-group">
            <span class="rd-label">当前</span>
            <span class="rd-swatch" :style="{ background: oldHex }"></span>
            <span>{{ oldCode }}</span>
          </div>
          <span class="rd-arrow">→</span>
          <div class="rd-swatch-group">
            <span class="rd-label">替换为</span>
            <span class="rd-swatch" :style="{ background: newHex }"></span>
            <span>{{ newCode || '—' }}</span>
          </div>
          <div class="rd-all-btn-wrap">
            <button class="btn btn-outline btn-sm" @click="showColorCard = !showColorCard">
              {{ showColorCard ? '收起' : '全部颜色' }}
            </button>
          </div>
        </div>
      </div>

      <Teleport to="body">
        <div v-if="showColorCard" class="rd-card-backdrop" @click="showColorCard = false"></div>
        <ColorCard
          v-if="showColorCard"
          :colors="colorCardColors"
          :modelValue="newCode"
          :cardName="cardName"
          class="rd-floating-card"
          @select="onColorCardSelect"
        />
      </Teleport>

      <div class="rd-section">
        <div class="rd-section-title">最近颜色 (RGB)</div>
        <div class="rd-nearest-grid">
          <div
            v-for="item in nearestColors"
            :key="item.code"
            class="rd-nearest-item"
            :class="{ selected: newCode === item.code }"
            @click="newCode = item.code"
          >
            <span class="rd-swatch" :style="{ background: getHex(item.code) }"></span>
            <span>{{ item.code }}</span>
          </div>
        </div>
      </div>

      <div class="rd-actions">
        <button class="btn btn-outline btn-sm" @click="$emit('close')">取消</button>
        <button class="btn btn-primary btn-sm" :disabled="!newCode" @click="confirm">确认替换</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ColorCard from '@/components/ColorCard.vue'

const props = defineProps({
  oldCode: { type: String, required: true },
  oldHex: { type: String, required: true },
  colorMap: { type: Object, required: true },
  colorCardColors: { type: Array, default: () => [] },
  cardName: { type: String, default: '' },
})
const emit = defineEmits(['close', 'confirm'])

const newCode = ref(props.oldCode)
const showColorCard = ref(false)

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) }
}
function rgbDist(a, b) { const dr=a.r-b.r, dg=a.g-b.g, db=a.b-b.b; return dr*dr+dg*dg+db*db }

const nearestColors = computed(() => {
  const oldRgb = hexToRgb(props.oldHex)
  const others = Object.keys(props.colorMap)
    .filter(c => c !== props.oldCode)
    .map(c => ({ code: c, dist: rgbDist(oldRgb, hexToRgb(props.colorMap[c])) }))
  others.sort((a, b) => a.dist - b.dist)
  return others.slice(0, 10)
})

const newHex = computed(() => getHex(newCode.value))
function getHex(code) { return props.colorMap[code] || '#ccc' }
function onColorCardSelect(code) { newCode.value = code; showColorCard.value = false }
function confirm() { emit('confirm', { newCode: newCode.value }) }
</script>

<style scoped>
.rd-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 500; }
.rd-card { background: #fff; border-radius: var(--radius); padding: 24px; max-width: 420px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: var(--shadow-md); }
.rd-card h3 { font-size: 16px; margin-bottom: 16px; }
.rd-top-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.rd-compare { display: flex; align-items: center; gap: 16px; padding: 12px; background: var(--bg-sidebar); border-radius: var(--radius-sm); flex: 1; }
.rd-swatch-group { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; }
.rd-swatch { width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.1); }
.rd-arrow { font-size: 20px; color: var(--text-secondary); }
.rd-label { font-size: 10px; color: var(--text-secondary); }
.rd-all-btn-wrap { flex-shrink: 0; }
.rd-section { margin-bottom: 16px; }
.rd-section-title { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
.rd-nearest-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.rd-nearest-item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px; border-radius: 6px; cursor: pointer; font-size: 10px; border: 2px solid transparent; }
.rd-nearest-item:hover { background: var(--bg-sidebar); }
.rd-nearest-item.selected { border-color: var(--primary); background: var(--primary-light); }
.rd-nearest-item .rd-swatch { width: 24px; height: 24px; border-radius: 4px; }
.rd-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
</style>

<style>
.rd-card-backdrop { position: fixed; inset: 0; z-index: 999; }
.rd-floating-card { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; }
</style>
