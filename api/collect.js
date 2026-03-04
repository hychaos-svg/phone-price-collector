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
    
    try {
        const products = await collectAllPrices({
            brandDelay: 0,
            shuffle: false
        });
        
        if (products.length === 0) {
            return res.status(500).json({ success: false, error: '未获取到任何数据' });
        }
        
        const validationResult = validateProducts(products);
        const qualityReport = generateQualityReport(validationResult);
        const buffer = await exportToExcel(validationResult.validProducts, qualityReport);
        const dateStr = getDataDate(validationResult.validProducts);
        const filename = `手机价格_${dateStr}.xlsx`;
        
        const storage = getStorage();
        await storage.saveFile(filename, buffer);
        
        res.status(200).json({
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
        });
    } catch (error) {
        console.error('采集失败:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
