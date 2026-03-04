const { collectAllPrices, BRANDS } = require('../src/collector');
const { validateProducts, generateQualityReport } = require('../src/validator');
const { exportToExcel, getDataDate } = require('../src/exporter');
const { getStorage } = require('../src/storage');

const RETENTION_DAYS = 30;

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    const startTime = Date.now();
    const allProducts = [];
    const results = [];
    
    try {
        for (const brand of BRANDS) {
            try {
                const products = await collectAllPrices({
                    brands: [brand],
                    brandDelay: 0,
                    shuffle: false
                });
                allProducts.push(...products);
                results.push({ brand: brand.name, count: products.length, status: 'success' });
            } catch (error) {
                results.push({ brand: brand.name, count: 0, status: 'failed', error: error.message });
            }
        }
        
        if (allProducts.length === 0) {
            return res.status(200).json({ 
                success: false, 
                error: '未获取到任何数据',
                results 
            });
        }
        
        const validationResult = validateProducts(allProducts);
        const qualityReport = generateQualityReport(validationResult);
        const buffer = await exportToExcel(validationResult.validProducts, qualityReport);
        const dateStr = getDataDate(validationResult.validProducts);
        const filename = `手机价格_${dateStr}.xlsx`;
        
        const storage = getStorage();
        await storage.saveFile(filename, buffer);
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        
        res.status(200).json({
            success: true,
            filename,
            elapsed: `${Math.floor(elapsed / 60)}分${elapsed % 60}秒`,
            stats: {
                total: allProducts.length,
                valid: validationResult.summary.valid,
                corrected: validationResult.summary.corrected,
                abnormal: validationResult.summary.anomalies,
                quality: qualityReport.summary.qualityScore
            },
            results,
            retention: {
                days: RETENTION_DAYS,
                expiresAt: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
            }
        });
    } catch (error) {
        console.error('采集失败:', error);
        res.status(200).json({ success: false, error: error.message, results });
    }
};
