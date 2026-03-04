const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { collectAllPrices, BRANDS } = require('./collector');
const { validateProducts, generateQualityReport } = require('./validator');
const { exportToExcel, getDataDate } = require('./exporter');
const { getStorage } = require('./storage');
const scheduler = require('./scheduler');

const PORT = process.env.PORT || 3003;
const HOST = process.env.HOST || '0.0.0.0';

function handleHealth(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'phone-price-collector',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    }));
}

async function handleCollect(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    try {
        console.log('开始采集数据...');
        
        const products = await collectAllPrices({
            onProgress: (info) => {
                console.log(`进度: ${info.brand} - ${info.count} 条数据`);
            },
            brandDelay: 0,
            shuffle: false
        });
        
        if (products.length === 0) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: '未获取到任何数据' }));
            return;
        }
        
        console.log(`采集完成，共 ${products.length} 条数据，开始校验...`);
        
        const validationResult = validateProducts(products);
        const qualityReport = generateQualityReport(validationResult);
        
        console.log(`校验完成，有效数据: ${validationResult.summary.valid}, 已修正: ${validationResult.summary.corrected}, 异常: ${validationResult.summary.anomalies}`);
        
        const buffer = await exportToExcel(validationResult.validProducts, qualityReport);
        
        const dateStr = getDataDate(validationResult.validProducts);
        const filename = `手机价格_${dateStr}.xlsx`;
        
        const storage = getStorage();
        await storage.saveFile(filename, buffer);
        
        console.log(`文件已保存: ${filename}`);
        
        res.statusCode = 200;
        res.end(JSON.stringify({
            success: true,
            filename,
            stats: {
                total: products.length,
                valid: validationResult.summary.valid,
                corrected: validationResult.summary.corrected,
                abnormal: validationResult.summary.anomalies,
                quality: qualityReport.summary.qualityScore
            },
            qualityReport: {
                quality: qualityReport.summary.qualityScore,
                corrected: validationResult.summary.corrected,
                abnormal: validationResult.summary.anomalies
            }
        }));
        
    } catch (error) {
        console.error('采集失败:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
}

async function handleFiles(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    try {
        const storage = getStorage();
        const files = await storage.listFiles();
        
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, files }));
    } catch (error) {
        console.error('获取文件列表失败:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
}

async function handleDownload(req, res, filename) {
    try {
        const storage = getStorage();
        const buffer = await storage.getFile(filename);
        
        if (!buffer) {
            res.statusCode = 404;
            res.end('文件不存在');
            return;
        }
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.end(buffer);
    } catch (error) {
        console.error('下载文件失败:', error);
        res.statusCode = 500;
        res.end('下载失败');
    }
}

async function handleStats(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    try {
        const storage = getStorage();
        const files = await storage.listFiles();
        
        const stats = {
            totalFiles: files.length,
            totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
            lastCollect: files.length > 0 ? files[0].created : null,
            brands: BRANDS.map(b => ({ name: b.name, id: b.id }))
        };
        
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, stats }));
    } catch (error) {
        console.error('获取统计失败:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
}

async function handleSchedule(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    try {
        const status = scheduler.getStatus();
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, ...status }));
    } catch (error) {
        console.error('获取调度配置失败:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
}

async function handleScheduleUpdate(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const config = scheduler.updateSchedule(data);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, config }));
        } catch (error) {
            console.error('更新调度配置失败:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
    });
}

async function handleHistory(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    try {
        const history = scheduler.loadHistory();
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, history: history.slice(-20) }));
    } catch (error) {
        console.error('获取历史记录失败:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
    }
}

function serveStatic(req, res, filePath) {
    const publicDir = path.join(__dirname, '..', 'public');
    const fullPath = path.join(publicDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
    }
    
    const ext = path.extname(fullPath);
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.ico': 'image/x-icon'
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.end(fs.readFileSync(fullPath));
}

async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    console.log(`${new Date().toISOString()} ${req.method} ${pathname}`);
    
    if (pathname === '/' || pathname === '/index.html') {
        serveStatic(req, res, 'index.html');
    } else if (pathname === '/health' || pathname === '/api/health') {
        handleHealth(req, res);
    } else if (pathname === '/api/collect') {
        await handleCollect(req, res);
    } else if (pathname === '/api/files') {
        await handleFiles(req, res);
    } else if (pathname === '/api/stats') {
        await handleStats(req, res);
    } else if (pathname === '/api/schedule' && req.method === 'GET') {
        await handleSchedule(req, res);
    } else if (pathname === '/api/schedule' && req.method === 'POST') {
        await handleScheduleUpdate(req, res);
    } else if (pathname === '/api/history') {
        await handleHistory(req, res);
    } else if (pathname.startsWith('/api/download/')) {
        const filename = decodeURIComponent(pathname.replace('/api/download/', ''));
        await handleDownload(req, res, filename);
    } else if (pathname.startsWith('/public/')) {
        serveStatic(req, res, pathname.replace('/public/', ''));
    } else {
        serveStatic(req, res, pathname);
    }
}

function startServer() {
    const server = http.createServer(handleRequest);
    
    server.listen(PORT, HOST, () => {
        console.log('========================================');
        console.log('    价格采集系统已启动');
        console.log('========================================');
        console.log(`服务地址: http://${HOST}:${PORT}`);
        console.log(`API端点:`);
        console.log(`  - GET  /api/collect  触发采集`);
        console.log(`  - GET  /api/files    文件列表`);
        console.log(`  - GET  /api/stats    统计数据`);
        console.log(`  - GET  /api/schedule 获取调度配置`);
        console.log(`  - POST /api/schedule 更新调度配置`);
        console.log(`  - GET  /api/history  执行历史`);
        console.log(`  - GET  /api/download/{filename}  下载文件`);
        console.log('========================================\n');
        
        scheduler.startScheduler(async () => {
            return await performCollect();
        });
    });
    
    return server;
}

async function performCollect() {
    const products = await collectAllPrices({
        onProgress: (info) => {
            console.log(`进度: ${info.brand} - ${info.count} 条数据`);
        },
        brandDelay: 0,
        shuffle: false
    });
    
    if (products.length === 0) {
        throw new Error('未获取到任何数据');
    }
    
    const validationResult = validateProducts(products);
    const qualityReport = generateQualityReport(validationResult);
    const buffer = await exportToExcel(validationResult.validProducts, qualityReport);
    const dateStr = getDataDate(validationResult.validProducts);
    const filename = `手机价格_${dateStr}.xlsx`;
    
    const storage = getStorage();
    await storage.saveFile(filename, buffer);
    
    return {
        filename,
        stats: {
            total: products.length,
            valid: validationResult.summary.valid,
            corrected: validationResult.summary.corrected,
            abnormal: validationResult.summary.anomalies
        }
    };
}

module.exports = { startServer, handleRequest };

if (require.main === module) {
    startServer();
}
