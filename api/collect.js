const { collectAllPrices, BRANDS } = require('../src/collector');
const { validateProducts, generateQualityReport } = require('../src/validator');
const { exportToExcel, getDataDate } = require('../src/exporter');
const { getStorage } = require('../src/storage');

const TIMEOUT_MS = 8000;

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('请求超时，请稍后重试')), ms)
        )
    ]);
}

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    const startTime = Date.now();
    
    try {
        const brands = req.query.brands ? req.query.brands.split(',') : null;
        const limitedBrands = brands ? BRANDS.filter(b => brands.includes(b.name)) : BRANDS.slice(0, 3);
        
        const products = await withTimeout(
            collectAllPrices({
                brandDelay: 0,
                shuffle: false,
                brands: limitedBrands
            }),
            TIMEOUT_MS
        );
        
        if (!products || products.length === 0) {
            return res.status(200).json({ 
                success: false, 
                error: '未获取到数据',
                hint: '请稍后重试或减少采集品牌数量'
            });
        }
        
        const validationResult = validateProducts(products);
        const qualityReport = generateQualityReport(validationResult);
        const buffer = await exportToExcel(validationResult.validProducts, qualityReport);
        const dateStr = getDataDate(validationResult.validProducts);
        const filename = `手机价格_${dateStr}.xlsx`;
        
        const storage = getStorage();
        await storage.saveFile(filename, buffer);
        
        const elapsed = Date.now() - startTime;
        
        res.status(200).json({
            success: true,
            filename,
            elapsed: `${elapsed}ms`,
            stats: {
                total: products.length,
                valid: validationResult.validProducts.length,
                corrected: validationResult.summary.corrected,
                abnormal: validationResult.summary.anomalies,
                quality: qualityReport.summary.qualityScore
            },
            brands: limitedBrands.map(b => b.name),
            hint: products.length < 500 ? '数据较少，可尝试采集更多品牌' : null
        });
    } catch (error) {
        console.error('采集失败:', error);
        res.status(200).json({ 
            success: false, 
            error: error.message,
            hint: 'Vercel免费版有10秒执行限制，建议分批采集'
        });
    }
};
