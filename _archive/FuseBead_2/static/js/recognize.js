// ══════════════════════════════════════════════
//  Recognize Page - Steps 1-4
//  Upload → Crop → Position → Recognize → Redirect to /view
// ══════════════════════════════════════════════

const State = {
    imageId: null,
    imageUrl: null,
    croppedUrl: null,
    taskId: null,
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

    document.querySelectorAll('.step-card').forEach((el, i) => {
        el.classList.toggle('active', i + 1 === n);
    });
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
    if (n === 3) initPosition();

    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            $('fileInfo').textContent = `${file.name} (${data.width}×${data.height})`;
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
        toast(`裁剪完成 (${res.width}×${res.height})`);
        goToStep(3);
    })
    .catch(err => { hideLoading(btn); toast('裁剪失败: ' + err.message); });
}

// ══════════════════════════════════════════════
//  Step 3: Position - Grid Preview
// ══════════════════════════════════════════════
let gridPreviewImg = null;
let gridPreviewZoom = 1;
let gridPreviewCanvasSize = 0;

function initPosition() {
    if (!State.croppedUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        gridPreviewImg = img;
        gridPreviewZoom = 1;
        $('zoomSlider').value = 1;
        $('zoomPctLabel').textContent = '100%';
        renderGridPreview();
        // 绑定鼠标滚轮缩放
        const canvas = $('gridPreviewCanvas');
        canvas.onwheel = null;
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            zoomPreview(delta);
        }, { passive: false });
    };
    img.src = State.croppedUrl;
}

function renderGridPreview() {
    if (!gridPreviewImg) return;
    const canvas = $('gridPreviewCanvas');
    const wrap = $('gridPreviewWrap');

    // 预览画布为正方形，大小由容器决定
    const wrapW = wrap.clientWidth || 260;
    const size = Math.min(wrapW, 280);
    gridPreviewCanvasSize = size;
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, size, size);

    const imgW = gridPreviewImg.width;
    const imgH = gridPreviewImg.height;

    // 默认显示右下角 5% 区域 (边长 = sqrt(0.05) ≈ 22.36% 的较短边)
    const defaultCropRatio = Math.sqrt(0.05);
    const minDim = Math.min(imgW, imgH);
    const defaultCropW = Math.round(minDim * defaultCropRatio);
    const defaultCropH = Math.round(minDim * defaultCropRatio);

    // 以默认区域为基准，缩放中心固定在图片右下角
    const baseW = defaultCropW / gridPreviewZoom;
    const baseH = defaultCropH / gridPreviewZoom;

    const sx = Math.max(0, imgW - baseW);
    const sy = Math.max(0, imgH - baseH);
    const sw = Math.min(baseW, imgW);
    const sh = Math.min(baseH, imgH);

    ctx.drawImage(gridPreviewImg, sx, sy, sw, sh, 0, 0, size, size);
}

function zoomPreview(delta) {
    gridPreviewZoom = Math.max(0.2, Math.min(10, gridPreviewZoom + delta));
    gridPreviewZoom = Math.round(gridPreviewZoom * 10) / 10;
    $('zoomSlider').value = gridPreviewZoom;
    $('zoomPctLabel').textContent = Math.round(gridPreviewZoom * 100) + '%';
    renderGridPreview();
}

function setZoomPreview(value) {
    gridPreviewZoom = value;
    $('zoomPctLabel').textContent = Math.round(gridPreviewZoom * 100) + '%';
    renderGridPreview();
}

// ══════════════════════════════════════════════
//  Step 4: Recognition
// ══════════════════════════════════════════════
function startRecognition() {
    const rows = parseInt($('gridRows').value);
    const cols = parseInt($('gridCols').value);
    if (!rows || !cols || rows < 1 || cols < 1) { toast('请输入有效的行数和列数'); return; }
    const body = { image_id: State.imageId, method: 'grid', rows, cols, merge_threshold: parseInt($('mergeThreshold').value) || 25 };

    goToStep(4);
    $('progressBar').style.width = '0%';
    $('progressStatus').textContent = '正在提交任务...';
    $('progressResult').classList.remove('show');
    $('cancelRecogBtn').style.display = '';
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
        fetch(`/api/task/${taskId}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { $('progressStatus').textContent = '查询失败: ' + data.error; return; }
                $('progressBar').style.width = data.progress + '%';
                $('progressStatus').textContent = data.message || `处理中 ${data.progress}%`;
                if (data.status === 'complete') onRecognitionComplete(taskId, data.result);
                else if (data.status === 'error') { $('progressStatus').textContent = '❌ ' + (data.error || '识别失败'); $('cancelRecogBtn').style.display = 'none'; }
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
    fetch(`/api/task/${taskId}/color-codes`)
        .then(r => r.json())
        .then(data => {
            $('resultSummary').textContent = `共 ${data.rows} 行 × ${data.cols} 列，${result.total_cells} 个格子，${result.stats.length} 种颜色`;
            $('progressResult').classList.add('show');
            $('resultBtnGroup').style.display = '';
            // 异步触发渲染，加速后续导出
            fetch(`/api/render/${taskId}`).catch(() => {});
        })
        .catch(err => { toast('获取颜色数据失败: ' + err.message); });
}

function cancelRecognition() {
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    goToStep(3);
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

console.log('FuseBead 拼豆识别页已加载');
