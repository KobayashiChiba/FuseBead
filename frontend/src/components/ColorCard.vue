<template>
  <div class="cc-panel">
    <div class="cc-title">{{ cardName || '色卡' }}</div>
    <div class="cc-grid">
      <div v-for="group in groups" :key="group.letter" class="cc-group">
        <span class="cc-group-label">{{ group.letter }}</span>
        <div class="cc-group-cols">
          <div v-for="(col, ci) in group.columns" :key="ci" class="cc-col">
            <div
              v-for="c in col"
              :key="c.code"
              class="cc-item"
              :class="{ selected: modelValue === c.code, clickable: selectable }"
              @click="selectable && $emit('select', c.code)"
            >
              <div class="cc-swatch" :style="{ background: '#' + c.hex, color: textColor(c.hex) }">
                <span class="cc-code">{{ c.code }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="cc-empty-row" v-if="showEmpty && selectable"
      :class="{ selected: modelValue === '' }"
      @click="$emit('select', '')"
    >
      <div class="cc-swatch cc-empty-swatch"></div>
      <span class="cc-empty-label">空格</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  colors: { type: Array, required: true },
  modelValue: { type: String, default: 'H1' },
  cardName: { type: String, default: '' },
  selectable: { type: Boolean, default: true },
  showEmpty: { type: Boolean, default: false },
})
defineEmits(['select'])

const MAX = 16
const groups = computed(() => {
  const map = {}
  for (const c of props.colors) {
    const letter = c.code.match(/^[A-Z]+/)?.[0] || '?'
    if (!map[letter]) map[letter] = []
    map[letter].push(c)
  }
  return ['A','B','C','D','E','F','G','H','M']
    .filter(l => map[l])
    .map(l => {
      const list = map[l]
      list.sort((a, b) => {
        const ma = a.code.match(/^([A-Z]+)(\d+)$/)
        const mb = b.code.match(/^([A-Z]+)(\d+)$/)
        if (ma && mb) {
          if (ma[1] !== mb[1]) return ma[1].localeCompare(mb[1])
          return parseInt(ma[2]) - parseInt(mb[2])
        }
        return a.code.localeCompare(b.code)
      })
      const cols = []
      for (let i = 0; i < list.length; i += MAX) cols.push(list.slice(i, i + MAX))
      return { letter: l, columns: cols }
    })
})

function lum(hex) {
  const r = parseInt(hex.slice(0,2), 16) / 255
  const g = parseInt(hex.slice(2,4), 16) / 255
  const b = parseInt(hex.slice(4,6), 16) / 255
  return 0.299*r + 0.587*g + 0.114*b
}
function textColor(hex) { return lum(hex) > 0.5 ? '#1e293b' : '#fff' }
</script>

<style scoped>
.cc-panel {
  background: #fff; border: 1px solid #e2e8f0;
  border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  max-height: 80vh; overflow: auto;
  padding: 10px 8px 8px;
  display: inline-block;
}
.cc-title {
  font-size: 18px; font-weight: 600; color: #1e293b;
  margin-bottom: 8px; text-align: center;
}
.cc-grid { display: flex; gap: 10px; }
.cc-group {
  border: 1px solid #e8ecf0; border-radius: 8px;
  padding: 6px 4px 4px; position: relative;
  flex-shrink: 0;
}
.cc-group-label {
  position: absolute; top: -9px; left: 6px;
  background: #fff; padding: 0 4px;
  font-size: 11px; font-weight: 700;
  color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;
  line-height: 1;
}
.cc-group-cols { display: flex; gap: 0; }
.cc-col { display: flex; flex-direction: column; }

.cc-item {
  display: flex; padding: 1px 4px; border-radius: 4px;
  transition: background 0.1s;
}
.cc-item.clickable { cursor: pointer; }
.cc-item.clickable:hover { background: #f1f5f9; }
.cc-item.selected .cc-swatch {
  outline: 2px solid #2563EB; outline-offset: 1px;
}
.cc-swatch {
  width: 40px; height: 26px; border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.08);
  display: flex; align-items: center; justify-content: center;
  transition: outline 0.1s;
}
.cc-item.clickable .cc-swatch:hover {
  outline: 2px solid #93c5fd; outline-offset: 1px;
}
.cc-item.selected .cc-swatch:hover { outline-color: #2563EB; }
.cc-code {
  font-size: 10px; font-weight: 600; line-height: 1;
  text-align: center; pointer-events: none;
}
/* 空格选项 */
.cc-empty-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; margin-top: 8px;
  border: 1px solid #e8ecf0; border-radius: 8px;
  cursor: pointer; transition: background 0.1s;
}
.cc-empty-row:hover { background: #f1f5f9; }
.cc-empty-row.selected { border-color: #2563EB; background: #eff6ff; }
.cc-empty-swatch {
  width: 40px; height: 26px; border-radius: 4px;
  background-image: repeating-conic-gradient(#ddd 0% 25%, #f8f8f8 0% 50%);
  background-size: 8px 8px;
  border: 1px solid rgba(0,0,0,0.08);
}
.cc-empty-label {
  font-size: 12px; color: #64748b; font-weight: 500;
}
</style>
