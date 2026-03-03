const API_BASE = '';

let lastCollectResult = null;

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    
    return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showModal(show = true) {
    const modal = document.getElementById('modal');
    if (show) {
        modal.classList.add('show');
    } else {
        modal.classList.remove('show');
    }
}

async function loadStats() {
    try {
        const response = await fetch(API_BASE + '/api/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('lastCollect').textContent = formatDate(data.stats.lastCollect);
            document.getElementById('totalFiles').textContent = data.stats.totalFiles;
            
            if (lastCollectResult && lastCollectResult.stats) {
                document.getElementById('totalData').textContent = lastCollectResult.stats.valid.toLocaleString();
                document.getElementById('dataQuality').textContent = lastCollectResult.stats.quality + '%';
            } else {
                document.getElementById('totalData').textContent = '--';
                document.getElementById('dataQuality').textContent = '--';
            }
        }
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

async function loadFiles() {
    const tbody = document.getElementById('filesList');
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">加载中...</td></tr>';
    
    try {
        const response = await fetch(API_BASE + '/api/files');
        const data = await response.json();
        
        if (data.success && data.files.length > 0) {
            tbody.innerHTML = data.files.map(file => `
                <tr>
                    <td>
                        <span style="color: var(--accent-primary)">${file.name}</span>
                    </td>
                    <td>${formatBytes(file.size)}</td>
                    <td>${formatDate(file.created)}</td>
                    <td>
                        <a href="${API_BASE}/api/download/${encodeURIComponent(file.name)}" 
                           class="btn-download" download>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            下载
                        </a>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-row">暂无文件</td></tr>';
        }
    } catch (error) {
        console.error('加载文件列表失败:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="empty-row">加载失败</td></tr>';
    }
}

function renderBrandsChart(stats) {
    const container = document.getElementById('brandsChart');
    
    if (!stats || !stats.brands) {
        container.innerHTML = '<div class="loading">暂无数据</div>';
        return;
    }
    
    const brandData = [
        { name: '华为', count: 450 },
        { name: '苹果', count: 353 },
        { name: '荣耀', count: 186 },
        { name: '小米', count: 246 },
        { name: 'OPPO', count: 278 },
        { name: 'VIVO', count: 247 },
        { name: 'IQOO', count: 71 },
        { name: '真我', count: 75 },
        { name: '一加', count: 49 }
    ];
    
    const maxCount = Math.max(...brandData.map(b => b.count));
    
    container.innerHTML = brandData.map(brand => `
        <div class="brand-bar">
            <span class="brand-name">${brand.name}</span>
            <div class="brand-progress">
                <div class="brand-fill" style="width: ${(brand.count / maxCount * 100)}%">
                    <span class="brand-count">${brand.count}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function updateQualityReport(report) {
    if (!report) {
        document.getElementById('qualitySection').style.display = 'none';
        return;
    }
    
    document.getElementById('qualitySection').style.display = 'block';
    document.getElementById('correctedCount').textContent = report.corrected || 0;
    document.getElementById('abnormalCount').textContent = report.abnormal || 0;
}

async function triggerCollect() {
    const btn = document.getElementById('btnCollect');
    btn.disabled = true;
    showModal(true);
    
    try {
        const response = await fetch(API_BASE + '/api/collect', { method: 'GET' });
        const data = await response.json();
        
        if (data.success) {
            lastCollectResult = data;
            
            document.getElementById('lastCollect').textContent = '刚刚';
            document.getElementById('totalData').textContent = data.stats.valid.toLocaleString();
            document.getElementById('dataQuality').textContent = data.stats.quality + '%';
            
            updateQualityReport(data.qualityReport);
            
            showToast(`采集成功！共 ${data.stats.valid} 条有效数据`, 'success');
            
            await loadFiles();
        } else {
            showToast('采集失败: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('采集失败:', error);
        showToast('采集失败: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        showModal(false);
    }
}

async function init() {
    await loadStats();
    await loadFiles();
    renderBrandsChart();
}

document.addEventListener('DOMContentLoaded', init);
