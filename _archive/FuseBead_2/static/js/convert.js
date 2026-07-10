// ══════════════════════════════════════════════
//  Convert Page - 图片转换 四步骤流程
//  Upload → Crop → Position → Identify
// ══════════════════════════════════════════════

// ── State ──
const State = {
    imageId: null,
    imageUrl: null,
    croppedUrl: null,
    taskId: null,

    // Position state
    posImg: null,           // cropped Image element
    cellSize: 20,           // grid cell pixel size
    gridMode: false,        // false=九宫格, true=网格
    gridX: 0,               // 九宫格左上角 X (image coords)
    gridY: 0,               // 九宫格左上角 Y (image coords)
    gridTotalW: 0,          // 九宫格总宽 = cellSize * 3
    gridTotalH: 0,          // 九宫格总高 = cellSize * 3

    // Grid detection result (网格模式)
    detectedRows: 0,
    detectedCols: 0,
    detectedGridX: 0,
    detectedGridY: 0,
    detectedGridW: 0,
    detectedGridH: 0,

    // Recognition mode
    recogMode: 'dominant',   // 'dominant' | 'average'
};

let cropper = null;
let currentStep = 1;
let pollTimer = null;

// ══════════════════════════════════════════════
//  Step Navigation
// ══════════════════════════════════════════════
function goToStep(n) {
    if (n > currentStep) {
        if (n === 2 && !State.imageId) { toast('请先上传图片'); return; }
        if (n === 3 && !State.croppedUrl) { toast('请先完成裁剪'); return; }
    }

    // Entering position step
    if (n === 3) {
        $('positionOverlay').style.display = 'flex';
        $('pageHeader').style.display = 'none';
        $('stepIndicators').style.display = 'none';
        $('mainContainer').style.display = 'none';
        initPosition();
    }
    // Leaving position step
    if (currentStep === 3 && n !== 3) {
        $('positionOverlay').style.display = 'none';
        $('pageHeader').style.display = '';
        $('stepIndicators').style.display = '';
        $('mainContainer').style.display = '';
    }

    // Update standard step cards (match by ID since step3 is not a .step-card)
    if (n !== 3) {
        document.querySelectorAll('.step-card').forEach((el) => {
            el.classList.toggle('active', el.id === 'step' + n);
        });
    }

    // Entering step 4: reset to show algorithm selection
    if (n === 4) {
        $('algoSelect').style.display = '';
        $('startRecogBtn').style.display = '';
        $('progressWrap').style.display = 'none';
        $('cancelRecogBtn').style.display = '';
        $('progressResult').classList.remove('show');
        $('resultBtnGroup').style.display = 'none';
    }

    // Update step indicators
    document.querySelectorAll('.step-dot').forEach((el, i) => {
        const idx = i + 1;
        el.classList.remove('active', 'done');
        if (idx === n) el.classList.add('active');
        else if (idx < n) el.classList.add('done');
    });
    document.querySelectorAll('.step-line').forEach((el) => {
        const [a, b] = el.dataset.between.split('-').map(Number);
        el.classList.toggle('done', b <= n);
    });

    if (n === 2) initCrop();
    if (n !== 3) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    currentStep = n;
}

function goToUsePage() {
    window.location.href = '/view?task_id=' + State.taskId;
}

// ══════════════════════════════════════════════
//  Step 1: Upload
// ══════════════════════════════════════════════
const uploadZone = $('uploadZone');
const fileInput = $('fileInput');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('dragover'); });
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) { toast('请选择图片文件'); return; }
    const formData = new FormData();
    formData.append('file', file);
    const btn = document.querySelector('#step1 .btn-primary');
    showLoading(btn);

    fetch('/api/upload', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            hideLoading(btn);
            if (data.error) { toast(data.error); return; }
            State.imageId = data.image_id;
            State.imageUrl = data.url;
            $('previewImg').src = data.url;
            $('fileInfo').textContent = file.name + ' (' + data.width + '\u00d7' + data.height + ')';
            $('previewWrap').style.display = 'block';
            uploadZone.style.display = 'none';
        })
        .catch(err => { hideLoading(btn); toast('上传失败: ' + err.message); });
}

function resetUpload() {
    State.imageId = null;
    State.imageUrl = null;
    $('previewWrap').style.display = 'none';
    uploadZone.style.display = 'block';
    fileInput.value = '';
}

// ══════════════════════════════════════════════
//  Step 2: Crop
// ══════════════════════════════════════════════
function initCrop() {
    const img = $('cropImage');
    if (img.src === State.imageUrl) return;
    if (cropper) { cropper.destroy(); cropper = null; }
    img.src = State.imageUrl;
    img.onload = () => {
        cropper = new Cropper(img, {
            viewMode: 1, dragMode: 'crop', aspectRatio: NaN,
            autoCropArea: 0.8, cropBoxMovable: true, cropBoxResizable: true,
            toggleDragModeOnDblclick: false, minCropBoxWidth: 10, minCropBoxHeight: 10,
        });
    };
}

function resetCrop() { if (cropper) cropper.reset(); }

function doCrop() {
    if (!cropper) { toast('请等待图片加载完成'); return; }
    const data = cropper.getData();
    const btn = $('cropBtn');
    showLoading(btn);

    fetch('/api/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            image_id: State.imageId,
            x: Math.round(data.x), y: Math.round(data.y),
            width: Math.round(data.width), height: Math.round(data.height),
        })
    })
    .then(r => r.json())
    .then(res => {
        hideLoading(btn);
        if (res.error) { toast(res.error); return; }
        State.croppedUrl = res.cropped_url;
        toast('裁剪完成 (' + res.width + '\u00d7' + res.height + ')');
        goToStep(3);
    })
    .catch(err => { hideLoading(btn); toast('裁剪失败: ' + err.message); });
}

// ══════════════════════════════════════════════
//  Step 3: Position — Workspace + Toolbar
// ══════════════════════════════════════════════

// ── Canvas ──
let posCanvas, posCtx;
let magCanvas, magCtx;
let workspaceRect = null;
let rafId = null;
let renderPending = false;

/** 使用 requestAnimationFrame 调度渲染（避免重复调用，保证60fps） */
function scheduleRender() {
    if (renderPending) return;
    renderPending = true;
    rafId = requestAnimationFrame(() => {
        renderPending = false;
        rafId = null;
        render();
    });
}

// ── Interaction state ──
let dragging = false;           // 整体拖拽
let resizing = false;           // 边界缩放
let resizeHandle = null;        // 'tl','tr','bl','br','top','bottom','left','right'
let dragStartMouse = { x: 0, y: 0 };
let dragStartGrid = { x: 0, y: 0, w: 0, h: 0 };
let hoveredHandle = null;

const HANDLE_SIZE = 10;         // 拖拽手柄尺寸（屏幕像素）
const MIN_CELL_SIZE = 3;        // 最小单元格尺寸（图片像素）

// ── Init Position ──
function initPosition() {
    if (!State.croppedUrl) return;

    setupPositionEvents();

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        State.posImg = img;

        // 默认 cellSize=20
        State.cellSize = 20;
        State.gridTotalW = State.cellSize * 3;
        State.gridTotalH = State.cellSize * 3;

        // 九宫格居中
        State.gridX = Math.max(0, Math.round((img.width - State.gridTotalW) / 2));
        State.gridY = Math.max(0, Math.round((img.height - State.gridTotalH) / 2));

        // Reset grid mode
        State.gridMode = false;
        $('modeSwitch').checked = false;
        updateModeLabels();
        updateCellSizeInput();

        resizeCanvas();
        render();
    };
    img.src = State.croppedUrl;
}

function resizeCanvas() {
    const ws = $('convertWorkspace');
    const rect = ws.getBoundingClientRect();
    workspaceRect = rect;
    posCanvas.width = rect.width;
    posCanvas.height = rect.height;
}

// ══════════════════════════════════════════════
//  Render
// ══════════════════════════════════════════════
function render() {
    if (!State.posImg || !posCtx) return;

    const img = State.posImg;
    const cw = posCanvas.width;
    const ch = posCanvas.height;

    posCtx.clearRect(0, 0, cw, ch);

    // 背景
    posCtx.fillStyle = '#E0E0E0';
    posCtx.fillRect(0, 0, cw, ch);

    // 计算图片适配
    const pad = 40;
    const availW = cw - pad * 2;
    const availH = ch - pad * 2;
    const scale = Math.min(availW / img.width, availH / img.height, 1);
    const imgDrawW = img.width * scale;
    const imgDrawH = img.height * scale;
    const imgDrawX = (cw - imgDrawW) / 2;
    const imgDrawY = (ch - imgDrawH) / 2;

    // 图片白底
    posCtx.fillStyle = '#FFFFFF';
    posCtx.fillRect(imgDrawX - 2, imgDrawY - 2, imgDrawW + 4, imgDrawH + 4);

    // 绘制图片
    posCtx.imageSmoothingEnabled = true;
    posCtx.imageSmoothingQuality = 'high';
    posCtx.drawImage(img, 0, 0, img.width, img.height,
        imgDrawX, imgDrawY, imgDrawW, imgDrawH);

    // 保存变换参数供后续使用
    const drawParams = { imgDrawX, imgDrawY, scale };

    if (State.gridMode) {
        renderGridMode(drawParams);
    } else {
        renderNinePalace(drawParams);
    }

    // 绘制位置信息
    renderPositionInfo(drawParams);

    // 绘制放大镜
    renderMagnifier(drawParams);
}

/** 坐标转换：图片坐标 → 画布坐标 */
function imgToCanvas(ix, iy, dp) {
    return {
        x: dp.imgDrawX + ix * dp.scale,
        y: dp.imgDrawY + iy * dp.scale,
    };
}

/** 坐标转换：画布坐标 → 图片坐标 */
function canvasToImg(cx, cy, dp) {
    return {
        x: (cx - dp.imgDrawX) / dp.scale,
        y: (cy - dp.imgDrawY) / dp.scale,
    };
}

// ══════════════════════════════════════════════
//  九宫格模式渲染
// ══════════════════════════════════════════════
function renderNinePalace(dp) {
    const gx = State.gridX;
    const gy = State.gridY;
    const gw = State.gridTotalW;
    const gh = State.gridTotalH;

    const p1 = imgToCanvas(gx, gy, dp);
    const p2 = imgToCanvas(gx + gw, gy + gh, dp);
    const gdx = p1.x, gdy = p1.y, gdw = p2.x - p1.x, gdh = p2.y - p1.y;

    // 九宫格线条 (#666666, 1px) — 透明，不覆盖画面
    posCtx.strokeStyle = '#666666';
    posCtx.lineWidth = 1;

    // 外框
    posCtx.strokeRect(gdx, gdy, gdw, gdh);

    // 内部线条
    for (let i = 1; i < 3; i++) {
        const lx = gdx + (gdw / 3) * i;
        posCtx.beginPath();
        posCtx.moveTo(lx, gdy);
        posCtx.lineTo(lx, gdy + gdh);
        posCtx.stroke();

        const ly = gdy + (gdh / 3) * i;
        posCtx.beginPath();
        posCtx.moveTo(gdx, ly);
        posCtx.lineTo(gdx + gdw, ly);
        posCtx.stroke();
    }

    // 拖拽手柄（四角 + 四边中点）
    drawHandles(gdx, gdy, gdw, gdh);
}

/** 绘制8个拖拽/缩放手柄 */
function drawHandles(gdx, gdy, gdw, gdh) {
    if (dragging || resizing) return; // 拖拽时隐藏手柄

    const hs = HANDLE_SIZE;
    const handles = [
        { x: gdx, y: gdy, cursor: 'nw-resize', id: 'tl' },
        { x: gdx + gdw / 2, y: gdy, cursor: 'n-resize', id: 'top' },
        { x: gdx + gdw, y: gdy, cursor: 'ne-resize', id: 'tr' },
        { x: gdx + gdw, y: gdy + gdh / 2, cursor: 'e-resize', id: 'right' },
        { x: gdx + gdw, y: gdy + gdh, cursor: 'se-resize', id: 'br' },
        { x: gdx + gdw / 2, y: gdy + gdh, cursor: 's-resize', id: 'bottom' },
        { x: gdx, y: gdy + gdh, cursor: 'sw-resize', id: 'bl' },
        { x: gdx, y: gdy + gdh / 2, cursor: 'w-resize', id: 'left' },
    ];

    posCtx.fillStyle = '#FFFFFF';
    posCtx.strokeStyle = '#666666';
    posCtx.lineWidth = 1;

    handles.forEach(h => {
        posCtx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        posCtx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
    });
}

/** 检测鼠标在哪个手柄上 */
function hitTestHandle(mx, my, dp) {
    const gx = State.gridX;
    const gy = State.gridY;
    const gw = State.gridTotalW;
    const gh = State.gridTotalH;
    const p1 = imgToCanvas(gx, gy, dp);
    const gdx = p1.x, gdy = p1.y, gdw = (gx + gw) * dp.scale + dp.imgDrawX - gdx;
    const gdh = (gy + gh) * dp.scale + dp.imgDrawY - gdy;
    const hs = HANDLE_SIZE;

    const handles = [
        { x: gdx, y: gdy, id: 'tl' },
        { x: gdx + gdw / 2, y: gdy, id: 'top' },
        { x: gdx + gdw, y: gdy, id: 'tr' },
        { x: gdx + gdw, y: gdy + gdh / 2, id: 'right' },
        { x: gdx + gdw, y: gdy + gdh, id: 'br' },
        { x: gdx + gdw / 2, y: gdy + gdh, id: 'bottom' },
        { x: gdx, y: gdy + gdh, id: 'bl' },
        { x: gdx, y: gdy + gdh / 2, id: 'left' },
    ];

    for (const h of handles) {
        if (mx >= h.x - hs && mx <= h.x + hs &&
            my >= h.y - hs && my <= h.y + hs) {
            return h.id;
        }
    }
    return null;
}

/** 判断点是否在九宫格区域内 */
function pointInGrid(mx, my, dp) {
    const gx = State.gridX;
    const gy = State.gridY;
    const gw = State.gridTotalW;
    const gh = State.gridTotalH;
    const p1 = imgToCanvas(gx, gy, dp);
    const p2 = imgToCanvas(gx + gw, gy + gh, dp);
    return mx >= p1.x && mx <= p2.x && my >= p1.y && my <= p2.y;
}

/** 渲染位置信息浮层 */
function renderPositionInfo(dp) {
    const gx = State.gridX;
    const gy = State.gridY;
    const gw = State.gridTotalW;
    const gh = State.gridTotalH;
    const cs = State.cellSize;

    const centerCellX = gx + cs;  // 中心格左上角
    const centerCellY = gy + cs;

    let infoHTML = '';
    if (State.gridMode) {
        infoHTML =
            '<strong>网格模式</strong><br>' +
            '行数: ' + State.detectedRows + ' × 列数: ' + State.detectedCols + '<br>' +
            '中心参考点: (' + centerCellX + ', ' + centerCellY + ')<br>' +
            '单元格: ' + cs + 'px';
    } else {
        infoHTML =
            '<strong>九宫格</strong><br>' +
            '位置: (' + gx + ', ' + gy + ')<br>' +
            '尺寸: ' + gw + '×' + gh + 'px<br>' +
            '单元格: ' + cs + 'px<br>' +
            '中心点: (' + centerCellX + ', ' + centerCellY + ')';
    }

    $('posInfoContent').innerHTML = '<div class="info-row"><div class="info-text">' + infoHTML + '</div></div>';
    $('posInfoPanel').classList.add('show');
}

// ══════════════════════════════════════════════
//  放大镜渲染（4倍基准格区域，固定160×160px）
// ══════════════════════════════════════════════
function renderMagnifier(dp) {
    if (!magCtx || !State.posImg) return;

    const cs = State.cellSize;
    const mgSize = magCanvas.width;
    magCtx.clearRect(0, 0, mgSize, mgSize);

    // 放大镜中心 = 九宫格中心格中心
    const centerImgX = State.gridX + cs * 1.5;
    const centerImgY = State.gridY + cs * 1.5;

    // 显示区域：中心格4倍边长 = 4 * cs
    const viewSize = cs * 4;
    const sx = centerImgX - viewSize / 2;
    const sy = centerImgY - viewSize / 2;

    // 边界裁剪
    const imgW = State.posImg.width;
    const imgH = State.posImg.height;
    const srcX = Math.max(0, sx);
    const srcY = Math.max(0, sy);
    const srcW = Math.min(viewSize, imgW - srcX);
    const srcH = Math.min(viewSize, imgH - srcY);

    if (srcW <= 0 || srcH <= 0) {
        magCtx.fillStyle = '#E0E0E0';
        magCtx.fillRect(0, 0, mgSize, mgSize);
        magCtx.fillStyle = '#999';
        magCtx.font = '12px sans-serif';
        magCtx.textAlign = 'center';
        magCtx.fillText('超出边界', mgSize / 2, mgSize / 2);
        return;
    }

    // 背景
    magCtx.fillStyle = '#E0E0E0';
    magCtx.fillRect(0, 0, mgSize, mgSize);

    // 计算目标绘制区域（保持比例居中）
    const scale = mgSize / viewSize;
    const dstX = (srcX - sx) * scale;
    const dstY = (srcY - sy) * scale;
    const dstW = srcW * scale;
    const dstH = srcH * scale;

    magCtx.imageSmoothingEnabled = false;
    magCtx.drawImage(State.posImg, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);

    // 中心十字线
    const cx = mgSize / 2;
    const cy = mgSize / 2;
    magCtx.strokeStyle = 'rgba(255, 69, 0, 0.6)';
    magCtx.lineWidth = 1;
    magCtx.setLineDash([4, 4]);
    magCtx.beginPath();
    magCtx.moveTo(cx, 0);
    magCtx.lineTo(cx, mgSize);
    magCtx.moveTo(0, cy);
    magCtx.lineTo(mgSize, cy);
    magCtx.stroke();
    magCtx.setLineDash([]);

    // 九宫格叠加（3×3，以基准格为中心，线宽2px）
    const cellScale = cs * scale;
    const gridX = cx - cellScale * 1.5;
    const gridY = cy - cellScale * 1.5;
    const gridW = cellScale * 3;
    const gridH = cellScale * 3;

    magCtx.strokeStyle = '#666666';
    magCtx.lineWidth = 2;

    // 外框
    magCtx.strokeRect(gridX, gridY, gridW, gridH);

    // 内部线条
    for (let i = 1; i < 3; i++) {
        const lx = gridX + (gridW / 3) * i;
        magCtx.beginPath();
        magCtx.moveTo(lx, gridY);
        magCtx.lineTo(lx, gridY + gridH);
        magCtx.stroke();

        const ly = gridY + (gridH / 3) * i;
        magCtx.beginPath();
        magCtx.moveTo(gridX, ly);
        magCtx.lineTo(gridX + gridW, ly);
        magCtx.stroke();
    }
}

// ══════════════════════════════════════════════
//  网格模式渲染
// ══════════════════════════════════════════════
function renderGridMode(dp) {
    const cs = State.cellSize;
    const gx = State.gridX;  // 九宫格参考位置（中心格左上角）
    const gy = State.gridY;

    if (!State.posImg) return;

    // 运行网格检测算法
    const result = detectGridBounds(
        State.posImg,
        gx + cs,   // ref_x = 中心格左上角 X
        gy + cs,   // ref_y = 中心格左上角 Y
        cs         // cell_size
    );

    State.detectedRows = result.rows;
    State.detectedCols = result.cols;
    State.detectedGridX = result.gridX;
    State.detectedGridY = result.gridY;
    State.detectedGridW = result.gridW;
    State.detectedGridH = result.gridH;

    if (result.rows === 0 || result.cols === 0) {
        posCtx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        posCtx.font = '16px sans-serif';
        posCtx.textAlign = 'center';
        posCtx.fillText('无法检测到网格边界，请调整位置或单元格尺寸',
            posCanvas.width / 2, posCanvas.height - 20);
        return;
    }

    const rows = result.rows;
    const cols = result.cols;
    const gridImgX = result.gridX;
    const gridImgY = result.gridY;
    const gridImgW = result.gridW;
    const gridImgH = result.gridH;

    const p1 = imgToCanvas(gridImgX, gridImgY, dp);
    const gdx = p1.x, gdy = p1.y;
    const gdw = gridImgW * dp.scale;
    const gdh = gridImgH * dp.scale;

    const cellDrawW = cs * dp.scale;
    const cellDrawH = cs * dp.scale;

    // 绘制所有网格线
    posCtx.strokeStyle = '#666666';
    posCtx.lineWidth = 1;

    // 水平线
    for (let r = 0; r <= rows; r++) {
        const ly = gdy + r * cellDrawH;
        posCtx.beginPath();
        posCtx.moveTo(gdx, ly);
        posCtx.lineTo(gdx + gdw, ly);
        // 边缘加粗
        if (r === 0 || r === rows) {
            posCtx.lineWidth = 2;
            posCtx.stroke();
            posCtx.lineWidth = 1;
        } else {
            posCtx.stroke();
        }
    }

    // 垂直线
    for (let c = 0; c <= cols; c++) {
        const lx = gdx + c * cellDrawW;
        posCtx.beginPath();
        posCtx.moveTo(lx, gdy);
        posCtx.lineTo(lx, gdy + gdh);
        if (c === 0 || c === cols) {
            posCtx.lineWidth = 2;
            posCtx.stroke();
            posCtx.lineWidth = 1;
        } else {
            posCtx.stroke();
        }
    }

    // 基准格高亮（九宫格中心格在检测网格中对应的格子）
    const refCellImgX = gx + cs;  // 九宫格中心格在图片上的 X
    const refCellImgY = gy + cs;  // 九宫格中心格在图片上的 Y
    const refCol = Math.round((refCellImgX - gridImgX) / cs);
    const refRow = Math.round((refCellImgY - gridImgY) / cs);
    const rhx = gdx + refCol * cellDrawW;
    const rhy = gdy + refRow * cellDrawH;

    posCtx.strokeStyle = '#FF4500';
    posCtx.lineWidth = 2;
    posCtx.strokeRect(rhx, rhy, cellDrawW, cellDrawH);

    // 基准格半透明填充
    posCtx.fillStyle = 'rgba(255, 69, 0, 0.15)';
    posCtx.fillRect(rhx, rhy, cellDrawW, cellDrawH);
}

// ══════════════════════════════════════════════
//  网格边界检测算法（JavaScript 移植）
//  Python: beadextract.py -> detect_grid_bounds()
//  从基准格子向四周扩展，自动识别图纸网格范围
// ══════════════════════════════════════════════
function detectGridBounds(img, refX, refY, cellSize) {
    const imgW = img.width;
    const imgH = img.height;

    const top = refY % cellSize;
    const left = refX % cellSize;
    const bottom = refY + cellSize + Math.floor((imgH - refY - cellSize) / cellSize) * cellSize;
    const right = refX + cellSize + Math.floor((imgW - refX - cellSize) / cellSize) * cellSize;

    const rows = Math.round((bottom - top) / cellSize);
    const cols = Math.round((right - left) / cellSize);

    return {
        rows: Math.max(0, rows),
        cols: Math.max(0, cols),
        gridX: left,
        gridY: top,
        gridW: cols * cellSize,
        gridH: rows * cellSize,
    };
}

// ══════════════════════════════════════════════
//  Event Handlers — Mouse
// ══════════════════════════════════════════════
function getDrawParams() {
    if (!State.posImg || !posCanvas) return null;
    const cw = posCanvas.width;
    const ch = posCanvas.height;
    const pad = 40;
    const availW = cw - pad * 2;
    const availH = ch - pad * 2;
    const scale = Math.min(availW / State.posImg.width, availH / State.posImg.height, 1);
    const imgDrawW = State.posImg.width * scale;
    const imgDrawH = State.posImg.height * scale;
    const imgDrawX = (cw - imgDrawW) / 2;
    const imgDrawY = (ch - imgDrawH) / 2;
    return { imgDrawX, imgDrawY, imgDrawW, imgDrawH, scale };
}

/** 初始化定位步骤的事件监听（Canvas 交互在 overlay 显示后才能绑定） */
function setupPositionEvents() {
    posCanvas = $('positionCanvas');
    posCtx = posCanvas.getContext('2d');

    magCanvas = $('magnifierCanvas');
    magCtx = magCanvas.getContext('2d');
    // 放大镜 Canvas 固定尺寸（CSS 控制显示大小）
    magCanvas.width = 160;
    magCanvas.height = 160;

    posCanvas.addEventListener('mousedown', onPosMouseDown);
    posCanvas.style.cursor = 'grab';
}

function onPosMouseDown(e) {
    if (State.gridMode) return; // 网格模式禁用拖拽
    const dp = getDrawParams();
    if (!dp) return;
    const rect = posCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 检测手柄
    const handle = hitTestHandle(mx, my, dp);
    if (handle) {
        resizing = true;
        resizeHandle = handle;
        dragStartMouse = { x: e.clientX, y: e.clientY };
        dragStartGrid = {
            x: State.gridX, y: State.gridY,
            w: State.gridTotalW, h: State.gridTotalH
        };
        posCanvas.style.cursor = handleToCursor(handle);
        e.preventDefault();
        return;
    }

    // 检测是否在九宫格内
    if (pointInGrid(mx, my, dp)) {
        dragging = true;
        dragStartMouse = { x: e.clientX, y: e.clientY };
        dragStartGrid = { x: State.gridX, y: State.gridY,
            w: State.gridTotalW, h: State.gridTotalH };
        posCanvas.style.cursor = 'grabbing';
        e.preventDefault();
    }
}

window.addEventListener('mousemove', onPosMouseMove);
window.addEventListener('mouseup', onPosMouseUp);

function onPosMouseMove(e) {
    const dp = getDrawParams();
    if (!dp) return;
    const rect = posCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (resizing) {
        const dx = (e.clientX - dragStartMouse.x) / dp.scale;
        const dy = (e.clientY - dragStartMouse.y) / dp.scale;
        handleResize(dx, dy);
        scheduleRender();
        return;
    }

    if (dragging) {
        const dx = (e.clientX - dragStartMouse.x) / dp.scale;
        const dy = (e.clientY - dragStartMouse.y) / dp.scale;
        State.gridX = dragStartGrid.x + dx;
        State.gridY = dragStartGrid.y + dy;
        // 边界限制
        State.gridX = Math.max(0, Math.min(State.posImg.width - State.gridTotalW, State.gridX));
        State.gridY = Math.max(0, Math.min(State.posImg.height - State.gridTotalH, State.gridY));
        scheduleRender();
        return;
    }

    // 鼠标悬停检测（仅九宫格模式）
    if (!State.gridMode) {
        const handle = hitTestHandle(mx, my, dp);
        if (handle !== hoveredHandle) {
            hoveredHandle = handle;
            posCanvas.style.cursor = handle ? handleToCursor(handle) :
                (pointInGrid(mx, my, dp) ? 'grab' : 'default');
        }
    }
}

function onPosMouseUp() {
    if (dragging || resizing) {
        dragging = false;
        resizing = false;
        resizeHandle = null;
        hoveredHandle = null;
        posCanvas.style.cursor = 'default';
        scheduleRender();
    }
}

function handleToCursor(h) {
    const map = {
        'tl': 'nw-resize', 'tr': 'ne-resize',
        'bl': 'sw-resize', 'br': 'se-resize',
        'top': 'n-resize', 'bottom': 's-resize',
        'left': 'w-resize', 'right': 'e-resize',
    };
    return map[h] || 'default';
}

function handleResize(dx, dy) {
    const minW = MIN_CELL_SIZE * 3;
    const minH = MIN_CELL_SIZE * 3;
    let { x, y, w, h } = dragStartGrid;
    const maxW = State.posImg.width - x;
    const maxH = State.posImg.height - y;

    switch (resizeHandle) {
        case 'tl':
            x += dx; y += dy; w -= dx; h -= dy;
            break;
        case 'tr':
            y += dy; w += dx; h -= dy;
            break;
        case 'bl':
            x += dx; w -= dx; h += dy;
            break;
        case 'br':
            w += dx; h += dy;
            break;
        case 'top':
            y += dy; h -= dy;
            break;
        case 'bottom':
            h += dy;
            break;
        case 'left':
            x += dx; w -= dx;
            break;
        case 'right':
            w += dx;
            break;
    }

    // 边界限制
    x = Math.max(0, x);
    y = Math.max(0, y);
    w = Math.max(minW, Math.min(maxW, w));
    h = Math.max(minH, Math.min(maxH, h));
    if (x + w > State.posImg.width) w = State.posImg.width - x;
    if (y + h > State.posImg.height) h = State.posImg.height - y;

    State.gridX = Math.round(x);
    State.gridY = Math.round(y);
    State.gridTotalW = Math.round(w);
    State.gridTotalH = Math.round(h);

    // 更新 cellSize（九宫格 3x3）
    State.cellSize = Math.round(Math.min(w / 3, h / 3));
    State.gridTotalW = State.cellSize * 3;
    State.gridTotalH = State.cellSize * 3;

    updateCellSizeInput();
}

// ══════════════════════════════════════════════
//  Window Resize
// ══════════════════════════════════════════════
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (currentStep === 3 && State.posImg) {
            resizeCanvas();
            scheduleRender();
        }
    }, 200);
});

// ══════════════════════════════════════════════
//  Toolbar — Zone 1: 尺寸控制
// ══════════════════════════════════════════════
function updateCellSizeInput() {
    $('cellSizeInput').value = State.cellSize;
    updateSizeBtnState();
}

function updateSizeBtnState() {
    $('cellSizePlus').disabled = State.cellSize >= 100;
    $('cellSizeMinus').disabled = State.cellSize <= 5;
}

function setCellSize(newSize) {
    if (!State.posImg) return;
    const oldSize = State.cellSize;
    newSize = Math.max(5, Math.min(100, Math.round(newSize)));
    if (newSize === oldSize) return;

    // 缩放中心：九宫格中心格左上角
    const centerCellX = State.gridX + oldSize;
    const centerCellY = State.gridY + oldSize;

    State.cellSize = newSize;
    State.gridTotalW = newSize * 3;
    State.gridTotalH = newSize * 3;

    // 保持中心格左上角不动
    State.gridX = centerCellX - newSize;
    State.gridY = centerCellY - newSize;

    // 边界限制
    State.gridX = Math.max(0, Math.min(Math.round(State.posImg.width - State.gridTotalW), Math.round(State.gridX)));
    State.gridY = Math.max(0, Math.min(Math.round(State.posImg.height - State.gridTotalH), Math.round(State.gridY)));

    updateCellSizeInput();
    scheduleRender();
}

$('cellSizeInput').addEventListener('input', () => {
    const val = parseInt($('cellSizeInput').value);
    if (!isNaN(val) && val >= 5 && val <= 100) {
        setCellSize(val);
    }
});

$('cellSizeInput').addEventListener('change', () => {
    let val = parseInt($('cellSizeInput').value);
    if (isNaN(val) || val < 5) val = 5;
    if (val > 100) val = 100;
    setCellSize(val);
});

$('cellSizePlus').addEventListener('click', () => {
    setCellSize(State.cellSize + 1);
});

$('cellSizeMinus').addEventListener('click', () => {
    setCellSize(State.cellSize - 1);
});

// ══════════════════════════════════════════════
//  Toolbar — Zone 2: 模式切换
// ══════════════════════════════════════════════
function updateModeLabels() {
    const nine = $('modeLabelNine');
    const grid = $('modeLabelGrid');
    if (State.gridMode) {
        nine.classList.remove('active');
        grid.classList.add('active');
    } else {
        nine.classList.add('active');
        grid.classList.remove('active');
    }
}

$('modeSwitch').addEventListener('change', () => {
    State.gridMode = $('modeSwitch').checked;
    updateModeLabels();

    // 禁用/启用方向微调按钮（网格模式仅微调）
    if (State.gridMode) {
        posCanvas.style.cursor = 'default';
        posCanvas.title = '网格模式：请使用微调按钮调整位置';
    } else {
        posCanvas.style.cursor = 'grab';
        posCanvas.title = '九宫格模式：可拖拽调整位置和尺寸';
    }

    scheduleRender();
});

// ══════════════════════════════════════════════
//  Toolbar — Zone 3: 微调工具
// ══════════════════════════════════════════════
let nudgeInterval = null;
let nudgeTimeout = null;

function startNudge(dx, dy) {
    applyNudge(dx, dy);
    // 长按支持：按下 200ms 后开始连续移动
    nudgeTimeout = setTimeout(() => {
        nudgeInterval = setInterval(() => applyNudge(dx, dy), 50);
    }, 200);
}

function stopNudge() {
    clearTimeout(nudgeTimeout);
    clearInterval(nudgeInterval);
    nudgeTimeout = null;
    nudgeInterval = null;
}

function applyNudge(dx, dy) {
    State.gridX += dx;
    State.gridY += dy;
    State.gridX = Math.max(0, Math.min(State.posImg.width - State.gridTotalW, State.gridX));
    State.gridY = Math.max(0, Math.min(State.posImg.height - State.gridTotalH, State.gridY));
    State.gridX = Math.round(State.gridX);
    State.gridY = Math.round(State.gridY);
    scheduleRender();
}

function setupNudgeBtn(id, dx, dy) {
    const btn = $(id);
    btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (!State.posImg) return;
        startNudge(dx, dy);
        btn.classList.add('pressing');
    });
    btn.addEventListener('mouseup', () => {
        stopNudge();
        btn.classList.remove('pressing');
    });
    btn.addEventListener('mouseleave', () => {
        stopNudge();
        btn.classList.remove('pressing');
    });
    // 触摸支持
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!State.posImg) return;
        startNudge(dx, dy);
        btn.classList.add('pressing');
    });
    btn.addEventListener('touchend', () => {
        stopNudge();
        btn.classList.remove('pressing');
    });
}

setupNudgeBtn('nudgeUp', 0, -1);
setupNudgeBtn('nudgeDown', 0, 1);
setupNudgeBtn('nudgeLeft', -1, 0);
setupNudgeBtn('nudgeRight', 1, 0);

// ══════════════════════════════════════════════
//  Toolbar — Zone 4: 流程控制
// ══════════════════════════════════════════════
$('posPrevBtn').addEventListener('click', () => {
    goToStep(2);
});

$('posNextBtn').addEventListener('click', () => {
    goToStep(4);
});

// ══════════════════════════════════════════════
//  Keyboard shortcuts for position step
// ══════════════════════════════════════════════
window.addEventListener('keydown', (e) => {
    if (currentStep !== 3 || !State.posImg) return;
    switch (e.key) {
        case 'ArrowUp': e.preventDefault(); applyNudge(0, -1); break;
        case 'ArrowDown': e.preventDefault(); applyNudge(0, 1); break;
        case 'ArrowLeft': e.preventDefault(); applyNudge(-1, 0); break;
        case 'ArrowRight': e.preventDefault(); applyNudge(1, 0); break;
    }
});

// ══════════════════════════════════════════════
//  Step 4: Recognition
// ══════════════════════════════════════════════
function startRecognition() {
    if (!State.croppedUrl) { posToast('请先完成裁剪'); return; }

    // 基准格左上角 = 九宫格中心格左上角
    const refX = State.gridX + State.cellSize;
    const refY = State.gridY + State.cellSize;

    let body = {
        image_id: State.imageId,
        method: 'reference',
        ref_x: refX,
        ref_y: refY,
        ref_w: State.cellSize,
        merge_threshold: 25,
        mode: State.recogMode,
    };

    // 隐藏算法选择，显示进度条
    $('algoSelect').style.display = 'none';
    $('startRecogBtn').style.display = 'none';
    $('progressWrap').style.display = '';

    $('progressBar').style.width = '0%';
    $('progressStatus').textContent = '正在提交任务...';
    $('progressResult').classList.remove('show');
    $('resultBtnGroup').style.display = 'none';

    fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    .then(r => r.json())
    .then(data => {
        if (data.error) { toast(data.error); $('progressStatus').textContent = '提交失败: ' + data.error; return; }
        State.taskId = data.task_id;
        pollTask(data.task_id);
    })
    .catch(err => { toast('提交失败: ' + err.message); $('progressStatus').textContent = '提交失败'; });
}

function pollTask(taskId) {
    let retries = 0;
    function poll() {
        fetch('/api/task/' + taskId)
            .then(r => r.json())
            .then(data => {
                if (data.error) { $('progressStatus').textContent = '查询失败: ' + data.error; return; }
                $('progressBar').style.width = data.progress + '%';
                $('progressStatus').textContent = data.message || '处理中 ' + data.progress + '%';
                if (data.status === 'complete') onRecognitionComplete(taskId, data.result);
                else if (data.status === 'error') { $('progressStatus').textContent = '\u274c ' + (data.error || '识别失败'); $('cancelRecogBtn').style.display = 'none'; }
                else pollTimer = setTimeout(poll, 500);
            })
            .catch(err => {
                retries++;
                if (retries < 5) pollTimer = setTimeout(poll, 1000);
                else $('progressStatus').textContent = '连接失败，请重试';
            });
    }
    poll();
}

function onRecognitionComplete(taskId, result) {
    $('cancelRecogBtn').style.display = 'none';
    fetch('/api/task/' + taskId + '/color-codes')
        .then(r => r.json())
        .then(data => {
            $('resultSummary').textContent =
                '\u5171 ' + data.rows + ' \u884c \u00d7 ' + data.cols +
                ' \u5217\uff0c' + result.total_cells +
                ' \u4e2a\u683c\u5b50\uff0c' + result.stats.length + ' \u79cd\u989c\u8272';
            $('progressResult').classList.add('show');
            $('resultBtnGroup').style.display = '';
            fetch('/api/render/' + taskId).catch(() => {});
        })
        .catch(err => { toast('获取颜色数据失败: ' + err.message); });
}

function cancelRecognition() {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    // 恢复算法选择和按钮
    $('algoSelect').style.display = '';
    $('startRecogBtn').style.display = '';
    $('progressWrap').style.display = 'none';
    $('cancelRecogBtn').style.display = '';
    goToStep(3);
}

// ══════════════════════════════════════════════
//  Algorithm Selection
// ══════════════════════════════════════════════
function selectAlgo(mode) {
    State.recogMode = mode;
    document.querySelectorAll('.algo-card').forEach(card => {
        card.classList.toggle('active', card.dataset.mode === mode);
    });
}

// ══════════════════════════════════════════════
//  Position Toast
// ══════════════════════════════════════════════
function posToast(msg) {
    const el = $('posToast');
    if (!el) { toast(msg); return; }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ══════════════════════════════════════════════
//  Step Dot Click Navigation
// ══════════════════════════════════════════════
document.querySelectorAll('.step-dot').forEach(dot => {
    dot.addEventListener('click', () => {
        const n = parseInt(dot.dataset.step);
        if (dot.classList.contains('disabled')) return;
        if (n <= currentStep) goToStep(n);
    });
});

console.log('FuseBead 图片转换页已加载');
