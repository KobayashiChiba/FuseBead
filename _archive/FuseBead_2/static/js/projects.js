// ══════════════════════════════════════════════
//  Projects Page - Load Saved Projects
// ══════════════════════════════════════════════

function loadProjects() {
    const list = $('projectList');
    const empty = $('projectEmpty');
    const loading = $('projectLoading');
    list.innerHTML = '';
    empty.style.display = 'none';
    loading.style.display = 'block';

    fetch('/api/projects')
        .then(r => r.json())
        .then(data => {
            loading.style.display = 'none';
            if (data.projects && data.projects.length > 0) {
                data.projects.forEach(p => {
                    list.appendChild(renderProjectItem(p));
                });
            } else {
                empty.style.display = 'block';
            }
        })
        .catch(err => {
            loading.style.display = 'none';
            empty.style.display = 'block';
            empty.textContent = '加载失败: ' + err.message;
        });
}

function renderProjectItem(p) {
    const div = document.createElement('div');
    div.className = 'project-item';

    const thumbUrl = p.has_thumbnail ? '/api/projects/' + p.id + '/thumbnail' : '';

    div.innerHTML = `
        <img class="thumb" src="${thumbUrl}" alt="${escHtml(p.name)}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22><rect fill=%22%23eee%22 width=%2280%22 height=%2280%22/><text x=%2240%22 y=%2240%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2224%22>📄</text></svg>'">
        <div class="info">
            <div class="name">${escHtml(p.name)}</div>
            <div class="meta">${p.rows}×${p.cols} | ${p.total_cells} 格 | ${p.color_count} 色 | ${p.created_at}</div>
        </div>
        <div class="actions">
            <button class="btn btn-primary btn-sm" onclick="loadProject('${p.id}')">加载</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">删除</button>
        </div>
    `;
    return div;
}

function loadProject(projectId) {
    window.location.href = '/view?project_id=' + projectId;
}

function deleteProject(projectId) {
    if (!confirm('确定要删除这个项目吗？')) return;
    fetch('/api/projects/' + projectId, { method: 'DELETE' })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                toast('项目已删除');
                loadProjects();
            } else {
                toast('删除失败');
            }
        })
        .catch(err => toast('删除失败: ' + err.message));
}

// Load on init
loadProjects();

console.log('FuseBead 加载项目页已加载');
