const { collectAllPrices, BRANDS } = require('../src/collector');
const { validateProducts, generateQualityReport } = require('../src/validator');
const { exportToExcel, getDataDate } = require('../src/exporter');
const { getStorage } = require('../src/storage');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function parseArgs() {
    const args = process.argv.slice(2);
    const result = { brands: null, delay: 30000 };
    
    for (const arg of args) {
        if (arg.startsWith('--brands=')) {
            const brandsStr = arg.split('=')[1];
            result.brands = brandsStr.split(',').map(b => b.trim());
        } else if (arg.startsWith('--delay=')) {
            result.delay = parseInt(arg.split('=')[1]) * 1000;
        }
    }
    
    return result;
}

async function main() {
    const startTime = Date.now();
    console.log('========================================');
    console.log('  GitHub Actions 价格采集任务');
    console.log('========================================');
    console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}\n`);
    
    const args = parseArgs();
    ensureDataDir();
    
    let brandsToCollect = BRANDS;
    if (args.brands && args.brands.length > 0) {
        brandsToCollect = BRANDS.filter(b => args.brands.includes(b.name));
        console.log(`指定采集品牌: ${brandsToCollect.map(b => b.name).join('、')}\n`);
    } else {
        console.log(`采集全部品牌: ${BRANDS.map(b => b.name).join('、')}\n`);
    }
    
    const allProducts = [];
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < brandsToCollect.length; i++) {
        const brand = brandsToCollect[i];
        console.log(`[${i + 1}/${brandsToCollect.length}] 正在采集 ${brand.name}...`);
        
        try {
            const products = await collectAllPrices({
                brands: [brand],
                brandDelay: 0,
                shuffle: false
            });
            
            allProducts.push(...products);
            successCount++;
            console.log(`  ✓ ${brand.name}: ${products.length} 条数据`);
        } catch (error) {
            failCount++;
            console.error(`  ✗ ${brand.name}: ${error.message}`);
        }
        
        if (i < brandsToCollect.length - 1 && args.delay > 0) {
            console.log(`  等待 ${args.delay / 1000} 秒...\n`);
            await new Promise(resolve => setTimeout(resolve, args.delay));
        }
    }
    
    console.log('\n========================================');
    console.log('  采集完成，开始处理数据');
    console.log('========================================\n');
    
    if (allProducts.length === 0) {
        console.log('未获取到任何数据');
        process.exit(1);
    }
    
    console.log(`总数据量: ${allProducts.length} 条`);
    console.log(`成功品牌: ${successCount}, 失败品牌: ${failCount}\n`);
    
    const validationResult = validateProducts(allProducts);
    const qualityReport = generateQualityReport(validationResult);
    
    console.log('校验结果:');
    console.log(`  有效数据: ${validationResult.summary.valid}`);
    console.log(`  已修正: ${validationResult.summary.corrected}`);
    console.log(`  异常数据: ${validationResult.summary.anomalies}`);
    console.log(`  数据质量: ${qualityReport.summary.qualityScore}%\n`);
    
    const buffer = await exportToExcel(validationResult.validProducts, qualityReport);
    const dateStr = getDataDate(validationResult.validProducts);
    const filename = `手机价格_${dateStr}.xlsx`;
    
    const storage = getStorage();
    await storage.saveFile(filename, buffer);
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log('========================================');
    console.log('  任务完成');
    console.log('========================================');
    console.log(`文件名: ${filename}`);
    console.log(`文件大小: ${(buffer.length / 1024).toFixed(1)} KB`);
    console.log(`耗时: ${Math.floor(elapsed / 60)}分${elapsed % 60}秒`);
    console.log(`完成时间: ${new Date().toLocaleString('zh-CN')}`);
}

main().catch(error => {
    console.error('任务失败:', error);
    process.exit(1);
});
