import { ref, reactive, computed } from 'vue'

// ── HSL conversion ──
function hexToRgb(hex) {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return { r, g, b }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslDistance(h1, s1, l1, h2, s2, l2) {
  const dh = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2))
  const ds = s1 - s2
  const dl = l1 - l2
  return Math.sqrt(dh * dh * 0.5 + ds * ds * 0.3 + dl * dl * 0.2)
}

// ── Precompute HSL for all colors ──
function buildColorHslMap(colors) {
  const map = {}
  for (const c of colors) {
    const { r, g, b } = hexToRgb(c.hex)
    map[c.code] = rgbToHsl(r, g, b)
  }
  return map
}

// ── Find N nearest colors to a given code ──
function findNearest(targetCode, allCodes, hslMap, n = 10) {
  const t = hslMap[targetCode]
  if (!t) return []
  const distances = allCodes
    .filter(c => c !== targetCode)
    .map(c => {
      const o = hslMap[c]
      return { code: c, dist: o ? hslDistance(t.h, t.s, t.l, o.h, o.s, o.l) : Infinity }
    })
  distances.sort((a, b) => a.dist - b.dist)
  return distances.slice(0, n).map(d => d.code)
}

/**
 * @param {Ref[]} gridData - the mutable grid ref
 * @param {Ref} colorMap - { code: "#hex" }
 * @param {Ref} colorStats - [{ code, count, hex }]
 * @param {Function} renderFn - callback to re-render canvas
 * @param {Function} onEdit - callback after each edit (rebuild stats, etc)
 * @returns editor tools state & functions
 */
export function useEditorTools(gridData, colorMap, colorStats, renderFn, onEdit) {
  // ── History ──
  const historyStack = reactive([])
  const historyIndex = ref(-1)
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < historyStack.length - 1)

  function pushHistory() {
    const snapshot = gridData.value.map(row => [...row])
    if (historyIndex.value < historyStack.length - 1) {
      historyStack.splice(historyIndex.value + 1)
    }
    historyStack.push(snapshot)
    historyIndex.value = historyStack.length - 1
    if (historyStack.length > 50) {
      historyStack.shift()
      historyIndex.value--
    }
    if (onEdit) onEdit()
  }

  function undo() {
    if (!canUndo.value) return
    historyIndex.value--
    gridData.value = historyStack[historyIndex.value].map(row => [...row])
    if (onEdit) onEdit()
    renderFn()
  }

  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    gridData.value = historyStack[historyIndex.value].map(row => [...row])
    if (onEdit) onEdit()
    renderFn()
  }

  function initHistory() {
    historyStack.splice(0)
    // Push initial state as baseline
    historyStack.push(gridData.value.map(row => [...row]))
    historyIndex.value = 0
  }

  // ── HSL nearest precompute ──
  const nearestMap = reactive({})
  function buildNearestMap() {
    Object.keys(nearestMap).forEach(k => delete nearestMap[k])
    const codes = Object.keys(colorMap.value)
    if (!codes.length) return
    const hslMap = buildColorHslMap(
      codes.map(code => ({ code, hex: colorMap.value[code].replace('#', '') }))
    )
    for (const code of codes) {
      nearestMap[code] = findNearest(code, codes, hslMap, 10)
    }
  }

  // ── Brush ──
  function brushCell(row, col, newCode) {
    if (!gridData.value[row] || !gridData.value[row][col]) return
    const oldCode = gridData.value[row][col]
    if (oldCode === newCode) return
    gridData.value[row][col] = newCode
    pushHistory()
    renderFn()
  }

  function brushAll(oldCode, newCode) {
    for (let r = 0; r < gridData.value.length; r++) {
      for (let c = 0; c < gridData.value[r].length; c++) {
        if (gridData.value[r][c] === oldCode) {
          gridData.value[r][c] = newCode
        }
      }
    }
    pushHistory()
    renderFn()
  }

  // ── Replace ──
  function replaceCell(row, col, newCode) {
    gridData.value[row][col] = newCode
    pushHistory()
    renderFn()
  }

  function replaceAll(oldCode, newCode) {
    for (let r = 0; r < gridData.value.length; r++) {
      for (let c = 0; c < gridData.value[r].length; c++) {
        if (gridData.value[r][c] === oldCode) {
          gridData.value[r][c] = newCode
        }
      }
    }
    pushHistory()
    renderFn()
  }

  // ── Simplify ──
  function simplifyColors(threshold) {
    const codes = [...new Set(gridData.value.flat().filter(Boolean))]
    if (codes.length <= 1) return

    const hslMap = buildColorHslMap(
      codes.map(code => ({ code, hex: (colorMap.value[code] || '#cccccc').replace('#', '') }))
    )
    // Count occurrences
    const counts = {}
    gridData.value.flat().forEach(c => { if (c) counts[c] = (counts[c] || 0) + 1 })

    // Build merge groups by HSL distance < threshold
    const merged = {}  // code → representative code
    const grouped = []  // [{ codes: [...], rep: string }]

    for (const c1 of codes) {
      if (merged[c1]) continue
      const group = [c1]
      for (const c2 of codes) {
        if (c2 === c1 || merged[c2]) continue
        const d = hslDistance(
          hslMap[c1].h, hslMap[c1].s, hslMap[c1].l,
          hslMap[c2].h, hslMap[c2].s, hslMap[c2].l
        )
        if (d < threshold) {
          group.push(c2)
          merged[c2] = true  // mark for merge
        }
      }
      // Pick representative: most occurrences, ties broken by code sort
      group.sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b))
      const rep = group[0]
      if (group.length > 1) {
        for (const c of group) merged[c] = rep
        grouped.push({ codes: group, rep })
      }
    }

    if (!grouped.length) return 0  // nothing to merge

    for (const { codes, rep } of grouped) {
      for (const c of codes) {
        if (c === rep) continue
        for (let r = 0; r < gridData.value.length; r++) {
          for (let col = 0; col < gridData.value[r].length; col++) {
            if (gridData.value[r][col] === c) {
              gridData.value[r][col] = rep
            }
          }
        }
      }
    }
    pushHistory()
    renderFn()
    return grouped.length
  }

  return {
    // History
    canUndo, canRedo, undo, redo, initHistory,
    // Nearest
    nearestMap, buildNearestMap,
    // Brush
    brushCell, brushAll,
    // Replace
    replaceCell, replaceAll,
    // Simplify
    simplifyColors,
  }
}
