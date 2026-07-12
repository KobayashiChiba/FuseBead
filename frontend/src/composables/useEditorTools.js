import { ref, reactive, computed } from 'vue'

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

  // ── Brush ──
  function brushCell(row, col, newCode) {
    if (!gridData.value[row]) return
    const oldCode = gridData.value[row][col]
    if (oldCode === newCode) return
    gridData.value[row][col] = newCode
    pushHistory()
    renderFn()
  }

  function _match(oldCode, code) {
    if (oldCode === 'ZZ') return code && !colorMap.value[code]  // 匹配所有未知色号
    return code === oldCode
  }

  function brushAll(oldCode, newCode) {
    for (let r = 0; r < gridData.value.length; r++) {
      for (let c = 0; c < gridData.value[r].length; c++) {
        if (_match(oldCode, gridData.value[r][c])) {
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
        if (_match(oldCode, gridData.value[r][c])) {
          gridData.value[r][c] = newCode
        }
      }
    }
    pushHistory()
    renderFn()
  }

  return {
    // History
    canUndo, canRedo, undo, redo, initHistory,
    // Brush
    brushCell, brushAll,
    // Replace
    replaceCell, replaceAll,
  }
}
