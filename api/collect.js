const { collectAllPrices, BRANDS } = require('../src/collector');
const { validateProducts, generateQualityReport } = require('../src/validator');
const { exportToExcel, getDataDate } = require('../src/exporter');
const { getStorage } = require('../src/storage');

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    const startTime = Date.now();
    
    try {
        const brands = req.query.brands ? req.query.brands.split(',') : null;
        const targetBrands = brands ? BRANDS.filter(b => brands.includes(b.name)) : BRANDS;
        
        const products = await collectAllPrices({
            brandDelay: 0,
            shuffle: false,
            brands: targetBrands
        });
        
        if (!products || products.length === 0) {
            return res.status(200).json({ 
                success: false, 
                error: '未获取到数据',
                hint: '请稍后重试'
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
            brands: targetBrands.map(b => b.name)
        });
    } catch (error) {
        console.error('采集失败:', error);
        res.status(200).json({ 
            success: false, 
            error: error.message
        });
    }
};
