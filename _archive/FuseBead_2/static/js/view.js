// ══════════════════════════════════════════════
//  View Page - Canvas-based bead grid workspace
//  Left: workspace (zoom/pan), Right: toolbar
//  Features: rulers, grid lines, auto color codes
// ══════════════════════════════════════════════

// ── Constants ──
const MAX_CELL_SIZE = 80;       // 单个网格边长最大值（px）
const MIN_CODE_FONT = 10;       // 显示色号/坐标的最小字号阈值
const MAX_SCALE = MAX_CELL_SIZE; // 最大缩放比例 = 单格40px
const RULER_SIZE = 24;          // 坐标尺宽度（px）
const INNER_PAD = 4;            // 坐标尺与网格间距（px）
const GRID_LINE_COLOR = '#777'; // 每5格网格线颜色
const GRID_BORDER_COLOR = '#000'; // 网格外边框颜色
const RULER_BG = '#E0E0E0';     // 坐标尺背景色
const RULER_TEXT_COLOR = '#555'; // 坐标尺文字颜色

// ── State ──
const State = {
    taskId: null,
    isProject: false,
    colorData: null,        // 2D array [row][col] -> {code, r, g, b, hex, row, col} | null
    beadStats: null,        // [{code, count}, ...]
    rows: 0,
    cols: 0,

    // View transform
    scale: 1,               // current zoom scale
    offsetX: 0,             // pan offset X (canvas coords)
    offsetY: 0,             // pan offset Y (canvas coords)
    baseScale: 1,           // scale that fits whole grid in workspace

    // Interaction state
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartOffsetX: 0,
    dragStartOffsetY: 0,

    activeHighlightCode: null,
    selectedCell: null,     // {row, col, ...cell}
};

// ── Canvas & Context ──
const canvas = $('beadCanvas');
const ctx = canvas.getContext('2d');

// ── Init ──
function init() {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get('task_id');
    const projectId = params.get('project_id');

    if (taskId) {
        State.taskId = taskId;
        State.isProject = taskId.startsWith('project_');
        loadFromTask(taskId);
    } else if (projectId) {
        State.taskId = 'project_' + projectId;
        State.isProject = true;
        loadFromProject(projectId);
    } else {
        showError('未指定任务或项目ID。');
    }

    setupEvents();
}

// ── Data Loading ──
function loadFromTask(taskId) {
    showPageOverlay(true);

    fetch('/api/task/' + taskId)
        .then(r => r.json())
        .then(data => {
            if (data.status !== 'complete') {
                showError('任务尚未完成，请返回识别页面重试。');
                return Promise.reject('incomplete');
            }
            return fetch('/api/task/' + taskId + '/color-codes');
        })
        .then(r => {
            if (!r || !r.ok) throw new Error('获取数据失败');
            return r.json();
        })
        .then(data => {
            State.colorData = data.data;
            State.beadStats = data.stats;
            State.rows = data.rows;
            State.cols = data.cols;
            showPageOverlay(false);
            initWorkspace();
            buildColorStats();
            fetch('/api/render/' + taskId).catch(() => {});
        })
        .catch(err => {
            if (err !== 'incomplete') showError('加载失败: ' + err.message);
        });
}

function loadFromProject(projectId) {
    showPageOverlay(true);

    fetch('/api/projects/' + projectId)
        .then(r => {
            if (!r.ok) throw new Error('项目不存在');
            return r.json();
        })
        .then(data => {
            if (data.error) { showError(data.error); return; }
            State.colorData = data.color_data.data;
            State.beadStats = data.color_data.stats;
            State.rows = data.color_data.rows;
            State.cols = data.color_data.cols;
            showPageOverlay(false);
            initWorkspace();
            buildColorStats();
        })
        .catch(err => showError('加载项目失败: ' + err.message));
}

function showPageOverlay(show) {
    $('loadingOverlay').style.display = show ? 'flex' : 'none';
    $('errorOverlay').style.display = 'none';
}

function showError(msg) {
    $('loadingOverlay').style.display = 'none';
    $('errorOverlay').style.display = 'flex';
    $('errorMsg').textContent = msg;
}

// ══════════════════════════════════════════════
//  Grid origin & layout helpers
// ══════════════════════════════════════════════

/** 计算网格可用区域边界 */
function getGridArea() {
    return {
        left: RULER_SIZE + INNER_PAD,
        top: RULER_SIZE + INNER_PAD,
        w: canvas.width - 2 * (RULER_SIZE + INNER_PAD),
        h: canvas.height - 2 * (RULER_SIZE + INNER_PAD),
    };
}

/** 计算当前网格绘制原点（左上角）*/
function getGridOrigin() {
    const area = getGridArea();
    const gridW = State.cols * State.scale;
    const gridH = State.rows * State.scale;
    return {
        x: area.left + (area.w - gridW) / 2 + State.offsetX,
        y: area.top + (area.h - gridH) / 2 + State.offsetY,
        gridW: gridW,
        gridH: gridH,
    };
}

// ══════════════════════════════════════════════
//  Workspace Initialization
// ══════════════════════════════════════════════
function initWorkspace() {
    const workspace = $('workspace');
    const rect = workspace.getBoundingClientRect();

    // Canvas 尺寸 = 工作区尺寸
    canvas.width = rect.width;
    canvas.height = rect.height;

    // 基础缩放：网格完整显示在可用区域内
    const area = getGridArea();
    const fitScaleW = area.w / State.cols;
    const fitScaleH = area.h / State.rows;
    State.baseScale = Math.min(fitScaleW, fitScaleH);

    // 初始状态
    State.scale = State.baseScale;
    State.offsetX = 0;
    State.offsetY = 0;

    updateZoomSlider();
    updateZoomDisplay();
    render();
}

// ══════════════════════════════════════════════
//  Render
// ══════════════════════════════════════════════
function render() {
    if (!State.colorData) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 整体背景
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, w, h);

    // 坐标尺背景
    ctx.fillStyle = RULER_BG;
    // 顶部坐标尺
    ctx.fillRect(0, 0, w, RULER_SIZE);
    // 底部坐标尺
    ctx.fillRect(0, h - RULER_SIZE, w, RULER_SIZE);
    // 左侧坐标尺
    ctx.fillRect(0, 0, RULER_SIZE, h);
    // 右侧坐标尺
    ctx.fillRect(w - RULER_SIZE, 0, RULER_SIZE, h);

    // 坐标尺内边线
    ctx.strokeStyle = '#BBB';
    ctx.lineWidth = 1;
    const a = getGridArea();
    ctx.strokeRect(a.left - INNER_PAD, a.top - INNER_PAD, a.w + INNER_PAD * 2, a.h + INNER_PAD * 2);

    // ── 绘制网格 ──
    const origin = getGridOrigin();
    ctx.save();
    ctx.beginPath();
    ctx.rect(origin.x, origin.y, origin.gridW, origin.gridH);
    ctx.clip();
    ctx.translate(origin.x, origin.y);

    const data = State.colorData;
    const scale = State.scale;
    const showCodes = scale >= MIN_CODE_FONT;
    const fontSize = Math.max(6, Math.min(scale * 0.55, 14));
    const highlighting = !!State.activeHighlightCode;
    const gap = scale > 3 ? 1 : 0;

    // 绘制所有色块
    for (let r = 0; r < State.rows; r++) {
        for (let c = 0; c < State.cols; c++) {
            const cell = data[r][c];
            const x = c * scale;
            const y = r * scale;

            if (cell) {
                ctx.fillStyle = cell.hex;

                if (highlighting && cell.code !== State.activeHighlightCode) {
                    ctx.globalAlpha = 0.25;
                }
                ctx.fillRect(x, y, scale - gap, scale - gap);
                ctx.globalAlpha = 1;

                // 选中/高亮格子边框
                if (State.selectedCell && State.selectedCell.row === r && State.selectedCell.col === c) {
                    ctx.strokeStyle = '#4A90D9';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 1, y + 1, scale - gap - 2, scale - gap - 2);
                }
                if (highlighting && cell.code === State.activeHighlightCode) {
                    ctx.strokeStyle = '#FFD700';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 1, y + 1, scale - gap - 2, scale - gap - 2);
                }

                // 色号文字
                if (showCodes) {
                    ctx.fillStyle = getContrastColor(cell.r, cell.g, cell.b);
                    ctx.font = `${fontSize}px -apple-system, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(cell.code, x + scale / 2, y + scale / 2);
                }
            } else {
                ctx.fillStyle = '#E8E8E8';
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, y, scale - gap, scale - gap);
                ctx.globalAlpha = 1;
            }
        }
    }

    // ── 每5格网格线 ──
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = Math.min(1, scale * 0.05);
    ctx.beginPath();
    // 垂直线：每5列一条
    for (let c = 5; c < State.cols; c += 5) {
        const x = c * scale;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, State.rows * scale);
    }
    // 水平线：每5行一条
    for (let r = 5; r < State.rows; r += 5) {
        const y = r * scale;
        ctx.moveTo(0, y);
        ctx.lineTo(State.cols * scale, y);
    }
    ctx.stroke();

    // ── 黑色外边框 ──
    ctx.strokeStyle = GRID_BORDER_COLOR;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, State.cols * scale, State.rows * scale);

    ctx.restore();

    // ── 重新绘制坐标尺背景（确保100%不透明，置于最顶层） ──
    ctx.fillStyle = RULER_BG;
    ctx.fillRect(0, 0, w, RULER_SIZE);
    ctx.fillRect(0, h - RULER_SIZE, w, RULER_SIZE);
    ctx.fillRect(0, 0, RULER_SIZE, h);
    ctx.fillRect(w - RULER_SIZE, 0, RULER_SIZE, h);

    // 坐标尺内边线（重绘确保可见）
    const a2 = getGridArea();
    ctx.strokeStyle = '#BBB';
    ctx.lineWidth = 1;
    ctx.strokeRect(a2.left - INNER_PAD, a2.top - INNER_PAD, a2.w + INNER_PAD * 2, a2.h + INNER_PAD * 2);

    // ── 绘制坐标尺数字和刻度 ──
    drawRulers(origin);
}

// ══════════════════════════════════════════════
//  Coordinate Rulers
// ══════════════════════════════════════════════
function drawRulers(origin) {
    const scale = State.scale;
    const w = canvas.width;
    const h = canvas.height;
    const area = getGridArea();

    const rulerFontSize = 10;
    ctx.font = `${rulerFontSize}px -apple-system, sans-serif`;
    ctx.fillStyle = RULER_TEXT_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 坐标数字显示间隔：至少保证数字不重叠
    const interval = Math.max(1, Math.ceil((rulerFontSize * 3) / scale));

    // 刻度线长度
    const tickLen = 5;
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;

    // ── 顶部坐标尺（列号 + 刻度） ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, RULER_SIZE);
    ctx.clip();

    // 刻度线
    for (let c = 0; c < State.cols; c += interval) {
        const cx = origin.x + c * scale + scale / 2;
        if (cx < area.left || cx > area.left + area.w) continue;
        ctx.beginPath();
        ctx.moveTo(cx, RULER_SIZE - tickLen);
        ctx.lineTo(cx, RULER_SIZE);
        ctx.stroke();
    }
    // 数字
    for (let c = 0; c < State.cols; c += interval) {
        const cx = origin.x + c * scale + scale / 2;
        if (cx < area.left || cx > area.left + area.w) continue;
        ctx.fillText(c + 1, cx, (RULER_SIZE - tickLen) / 2);
    }
    ctx.restore();

    // ── 底部坐标尺（列号 + 刻度） ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, h - RULER_SIZE, w, RULER_SIZE);
    ctx.clip();

    for (let c = 0; c < State.cols; c += interval) {
        const cx = origin.x + c * scale + scale / 2;
        if (cx < area.left || cx > area.left + area.w) continue;
        ctx.beginPath();
        ctx.moveTo(cx, h - RULER_SIZE);
        ctx.lineTo(cx, h - RULER_SIZE + tickLen);
        ctx.stroke();
    }
    for (let c = 0; c < State.cols; c += interval) {
        const cx = origin.x + c * scale + scale / 2;
        if (cx < area.left || cx > area.left + area.w) continue;
        ctx.fillText(c + 1, cx, h - RULER_SIZE + tickLen + (RULER_SIZE - tickLen) / 2);
    }
    ctx.restore();

    // ── 左侧坐标尺（行号 + 刻度） ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, RULER_SIZE, h);
    ctx.clip();

    for (let r = 0; r < State.rows; r += interval) {
        const cy = origin.y + r * scale + scale / 2;
        if (cy < area.top || cy > area.top + area.h) continue;
        ctx.beginPath();
        ctx.moveTo(RULER_SIZE - tickLen, cy);
        ctx.lineTo(RULER_SIZE, cy);
        ctx.stroke();
    }
    for (let r = 0; r < State.rows; r += interval) {
        const cy = origin.y + r * scale + scale / 2;
        if (cy < area.top || cy > area.top + area.h) continue;
        ctx.fillText(r + 1, (RULER_SIZE - tickLen) / 2, cy);
    }
    ctx.restore();

    // ── 右侧坐标尺（行号 + 刻度） ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(w - RULER_SIZE, 0, RULER_SIZE, h);
    ctx.clip();

    for (let r = 0; r < State.rows; r += interval) {
        const cy = origin.y + r * scale + scale / 2;
        if (cy < area.top || cy > area.top + area.h) continue;
        ctx.beginPath();
        ctx.moveTo(w - RULER_SIZE, cy);
        ctx.lineTo(w - RULER_SIZE + tickLen, cy);
        ctx.stroke();
    }
    for (let r = 0; r < State.rows; r += interval) {
        const cy = origin.y + r * scale + scale / 2;
        if (cy < area.top || cy > area.top + area.h) continue;
        ctx.fillText(r + 1, w - RULER_SIZE + tickLen + (RULER_SIZE - tickLen) / 2, cy);
    }
    ctx.restore();
}

// ══════════════════════════════════════════════
//  Color Utilities
// ══════════════════════════════════════════════
function getContrastColor(r, g, b) {
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 140 ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)';
}

// ══════════════════════════════════════════════
//  View Helpers
// ══════════════════════════════════════════════
function canvasToGrid(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const origin = getGridOrigin();
    const sx = clientX - rect.left - origin.x;
    const sy = clientY - rect.top - origin.y;
    return {
        row: Math.floor(sy / State.scale),
        col: Math.floor(sx / State.scale),
    };
}

/** 恢复居中：重置缩放和平移到默认状态 */
function centerWorkspace() {
    State.scale = State.baseScale;
    State.offsetX = 0;
    State.offsetY = 0;
    updateZoomSlider();
    updateZoomDisplay();
    render();
}

// ══════════════════════════════════════════════
//  Zoom Slider
// ══════════════════════════════════════════════
function updateZoomSlider() {
    const slider = $('zoomSlider');
    const baseS = State.baseScale;

    if (baseS >= MAX_SCALE) {
        slider.disabled = true;
        slider.value = 100;
        slider.style.opacity = '0.4';
        State.scale = baseS;
        return;
    }

    slider.disabled = false;
    slider.style.opacity = '1';

    const percent = ((State.scale - baseS) / (MAX_SCALE - baseS)) * 100;
    slider.value = Math.round(Math.max(0, Math.min(100, percent)));
}

function updateZoomDisplay() {
    const baseS = State.baseScale;
    if (baseS >= MAX_SCALE) {
        $('zoomValue').textContent = '已达最大';
    } else {
        const pct = Math.round((State.scale / baseS) * 100);
        $('zoomValue').textContent = pct + '%';
    }
}

function onZoomSliderChange() {
    const slider = $('zoomSlider');
    const baseS = State.baseScale;
    if (baseS >= MAX_SCALE) return;

    const percent = parseInt(slider.value) / 100;
    State.scale = baseS + (MAX_SCALE - baseS) * percent;
    updateZoomDisplay();
    render();
}

// ══════════════════════════════════════════════
//  Event Setup
// ══════════════════════════════════════════════
function setupEvents() {
    $('zoomSlider').addEventListener('input', onZoomSliderChange);

    canvas.addEventListener('wheel', onWheel, { passive: false });

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    canvas.addEventListener('click', onCanvasClick);

    window.addEventListener('resize', onResize);
}

// ══════════════════════════════════════════════
//  Mouse Wheel Zoom
// ══════════════════════════════════════════════
function onWheel(e) {
    e.preventDefault();
    const baseS = State.baseScale;
    if (baseS >= MAX_SCALE) return;

    const zoomSpeed = 0.1;
    let newScale = e.deltaY < 0
        ? State.scale * (1 + zoomSpeed)
        : State.scale * (1 - zoomSpeed);

    newScale = Math.max(baseS, Math.min(MAX_SCALE, newScale));
    if (newScale === State.scale) return;

    // 以鼠标位置为中心缩放
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const origin = getGridOrigin();
    const gx = mx - origin.x;
    const gy = my - origin.y;
    const scaleChange = newScale / State.scale;

    // 计算新偏移，保持鼠标下方网格点不变
    const area = getGridArea();
    const newGridW = State.cols * newScale;
    const newGridH = State.rows * newScale;
    const targetOx = mx - gx * scaleChange;
    const targetOy = my - gy * scaleChange;

    State.scale = newScale;
    State.offsetX = targetOx - area.left - (area.w - newGridW) / 2;
    State.offsetY = targetOy - area.top - (area.h - newGridH) / 2;

    updateZoomSlider();
    updateZoomDisplay();
    render();
}

// ══════════════════════════════════════════════
//  Mouse Drag Pan
// ══════════════════════════════════════════════
function onMouseDown(e) {
    State.isDragging = true;
    State.dragStartX = e.clientX;
    State.dragStartY = e.clientY;
    State.dragStartOffsetX = State.offsetX;
    State.dragStartOffsetY = State.offsetY;
    canvas.style.cursor = 'grabbing';
}

function onMouseMove(e) {
    if (!State.isDragging) return;
    const dx = e.clientX - State.dragStartX;
    const dy = e.clientY - State.dragStartY;
    State.offsetX = State.dragStartOffsetX + dx;
    State.offsetY = State.dragStartOffsetY + dy;
    render();
}

function onMouseUp() {
    if (State.isDragging) {
        State.isDragging = false;
        canvas.style.cursor = 'grab';
    }
}

// ══════════════════════════════════════════════
//  Touch Events
// ══════════════════════════════════════════════
let touchStartDist = 0;
let touchStartScale = 1;

function onTouchStart(e) {
    if (e.touches.length === 1) {
        State.isDragging = true;
        State.dragStartX = e.touches[0].clientX;
        State.dragStartY = e.touches[0].clientY;
        State.dragStartOffsetX = State.offsetX;
        State.dragStartOffsetY = State.offsetY;
    } else if (e.touches.length === 2) {
        e.preventDefault();
        State.isDragging = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        touchStartScale = State.scale;
    }
}

function onTouchMove(e) {
    if (e.touches.length === 1 && State.isDragging) {
        const dx = e.touches[0].clientX - State.dragStartX;
        const dy = e.touches[0].clientY - State.dragStartY;
        State.offsetX = State.dragStartOffsetX + dx;
        State.offsetY = State.dragStartOffsetY + dy;
        render();
    } else if (e.touches.length === 2) {
        e.preventDefault();
        if (State.baseScale >= MAX_SCALE) return;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (touchStartDist === 0) return;
        let newScale = touchStartScale * (dist / touchStartDist);
        newScale = Math.max(State.baseScale, Math.min(MAX_SCALE, newScale));
        State.scale = newScale;
        updateZoomSlider();
        updateZoomDisplay();
        render();
    }
}

function onTouchEnd() {
    State.isDragging = false;
}

// ══════════════════════════════════════════════
//  Canvas Click
// ══════════════════════════════════════════════
function onCanvasClick(e) {
    const pos = canvasToGrid(e.clientX, e.clientY);
    if (pos.row < 0 || pos.row >= State.rows || pos.col < 0 || pos.col >= State.cols) {
        closeCellInfo();
        return;
    }
    const cell = State.colorData[pos.row][pos.col];
    if (cell) {
        showCellInfo(cell);
    } else {
        closeCellInfo();
    }
}

// ══════════════════════════════════════════════
//  Cell Info
// ══════════════════════════════════════════════
function showCellInfo(cell) {
    State.selectedCell = cell;
    $('cellInfoContent').innerHTML = `
        <div class="info-row">
            <div class="color-swatch" style="background:${cell.hex}"></div>
            <div class="info-text">
                <strong>色号:</strong> ${cell.code}<br>
                <strong>位置:</strong> 第 ${cell.row + 1} 行, 第 ${cell.col + 1} 列<br>
                <strong>RGB:</strong> (${cell.r}, ${cell.g}, ${cell.b})<br>
                <strong>Hex:</strong> ${cell.hex}
            </div>
        </div>`;
    $('cellInfoPanel').classList.add('show');
    render();
}

function closeCellInfo() {
    State.selectedCell = null;
    $('cellInfoPanel').classList.remove('show');
    render();
}

// ══════════════════════════════════════════════
//  Color Stats
// ══════════════════════════════════════════════
function buildColorStats() {
    const container = $('colorStats');
    container.innerHTML = '';
    if (!State.beadStats) return;

    State.beadStats.forEach(stat => {
        let hex = '#CCC';
        for (const row of State.colorData) {
            for (const cell of row) {
                if (cell && cell.code === stat.code) { hex = cell.hex; break; }
            }
            if (hex !== '#CCC') break;
        }

        const btn = document.createElement('button');
        btn.className = 'color-stat-btn';
        btn.dataset.code = stat.code;
        btn.innerHTML = `<span class="swatch" style="background:${hex}"></span> ${stat.code} <span class="count">${stat.count}</span>`;
        btn.addEventListener('click', () => {
            btn.classList.contains('active') ? clearHighlights() : highlightColor(stat.code);
        });
        container.appendChild(btn);
    });
}

function highlightColor(code) {
    clearHighlights();
    State.activeHighlightCode = code;
    document.querySelectorAll('.color-stat-btn').forEach(btn => {
        if (btn.dataset.code === code) btn.classList.add('active');
    });
    render();
    const stat = State.beadStats.find(s => s.code === code);
    toast('高亮色号 ' + code + '（' + (stat ? stat.count : 0) + ' 个格子）');
}

function clearHighlights() {
    State.activeHighlightCode = null;
    document.querySelectorAll('.color-stat-btn.active').forEach(el => el.classList.remove('active'));
    render();
}

// ══════════════════════════════════════════════
//  Export
// ══════════════════════════════════════════════
function exportImage() {
    const btn = $('exportBtn');
    showLoading(btn);

    // 项目模式：直接导出（后端从磁盘读取项目数据渲染）
    if (State.isProject) {
        const projectId = State.taskId.replace('project_', '');
        fetch('/api/projects/' + projectId + '/export')
            .then(r => { if (!r.ok) throw Error('导出失败'); return r.blob(); })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'bead_project.png';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                hideLoading(btn); toast('图纸已导出');
            })
            .catch(err => { hideLoading(btn); toast('导出失败: ' + err.message); });
        return;
    }

    // 任务模式：先渲染再导出
    if (!State.taskId) { toast('没有可导出的图纸'); return; }

    fetch('/api/render/' + State.taskId)
        .then(r => r.json())
        .then(data => {
            if (data.error) { hideLoading(btn); toast(data.error); return; }
            return fetch('/api/export/' + State.taskId);
        })
        .then(r => { if (!r) return; if (!r.ok) throw Error(); return r.blob(); })
        .then(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'bead_art_' + State.taskId.slice(0, 8) + '.png';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            hideLoading(btn); toast('图纸已导出');
        })
        .catch(err => { hideLoading(btn); toast('导出失败: ' + err.message); });
}

// ══════════════════════════════════════════════
//  Save Project
// ══════════════════════════════════════════════
function showSaveDialog() {
    if (State.isProject) {
        toast('已保存的项目无法再次保存');
        return;
    }
    if (!State.taskId) {
        toast('没有可保存的内容');
        return;
    }
    $('projectName').value = '';
    $('saveStatus').textContent = '';
    $('saveDialog').style.display = 'flex';
    setTimeout(() => $('projectName').focus(), 100);
}

function closeSaveDialog() {
    $('saveDialog').style.display = 'none';
}

function doSaveProject() {
    const name = $('projectName').value.trim();
    if (!name) { $('saveStatus').textContent = '请输入项目名称'; return; }

    const btn = $('saveConfirmBtn');
    showLoading(btn);
    $('saveStatus').textContent = '保存中...';

    fetch('/api/projects/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, task_id: State.taskId }),
    })
    .then(r => r.json())
    .then(data => {
        hideLoading(btn);
        if (data.error) { $('saveStatus').textContent = data.error; return; }
        $('saveStatus').textContent = '已保存: ' + data.name;
        setTimeout(closeSaveDialog, 1000);
    })
    .catch(err => {
        hideLoading(btn);
        $('saveStatus').textContent = '保存失败: ' + err.message;
    });
}

// ══════════════════════════════════════════════
//  Resize Handler
// ══════════════════════════════════════════════
let resizeTimer;
function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (!State.colorData) return;
        const workspace = $('workspace');
        const rect = workspace.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        // 重新计算 baseScale
        const area = getGridArea();
        const fitScaleW = area.w / State.cols;
        const fitScaleH = area.h / State.rows;
        const newBase = Math.min(fitScaleW, fitScaleH);
        const ratio = newBase / State.baseScale;

        State.baseScale = newBase;
        State.scale = Math.max(newBase, Math.min(MAX_SCALE, State.scale * ratio));
        State.offsetX *= ratio;
        State.offsetY *= ratio;

        updateZoomSlider();
        updateZoomDisplay();
        render();
    }, 200);
}

// ── Init ──
canvas.style.cursor = 'grab';
init();
console.log('FuseBead 查看页面已加载');
