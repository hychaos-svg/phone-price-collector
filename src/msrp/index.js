const { BRANDS, TIME_FILTER } = require('./brands');
const { collectBrandProducts, collectProductDetail } = require('./zolCollector');
const { parseProductDetail } = require('./parser');
const { exportMsrpToExcel } = require('./exporter');
const { validateMsrp, validateReleaseDate } = require('./validator');

async function collectMsrp(options = {}) {
    const {
        brandFilter = null,
        startDate = TIME_FILTER.startDate,
        endDate = TIME_FILTER.endDate,
        onProgress = null,
        maxPages = 3
    } = options;

    console.log('开始采集厂商指导价数据...\n');
    console.log(`时间范围: ${startDate} ~ ${endDate}`);
    console.log(`采集时间: ${new Date().toLocaleString('zh-CN')}\n`);

    const allProducts = [];
    const stats = {
        totalProducts: 0,
        validProducts: 0,
        invalidProducts: 0,
        byBrand: {}
    };

    const brandsToProcess = brandFilter 
        ? BRANDS.filter(b => b.name === brandFilter || b.pconlineId === brandFilter)
        : BRANDS;

    if (brandsToProcess.length === 0) {
        console.error(`未找到品牌: ${brandFilter}`);
        return [];
    }

    for (let i = 0; i < brandsToProcess.length; i++) {
        const brand = brandsToProcess[i];
        console.log(`[${i + 1}/${brandsToProcess.length}] 正在采集 ${brand.name}...`);
        
        stats.byBrand[brand.name] = { total: 0, valid: 0, invalid: 0 };

        try {
            const productList = await collectBrandProducts(brand, maxPages);
            
            console.log(`  发现 ${productList.length} 款产品`);
            stats.totalProducts += productList.length;
            stats.byBrand[brand.name].total = productList.length;

            for (let j = 0; j < productList.length; j++) {
                const product = productList[j];
                
                try {
                    const detailHtml = await collectProductDetail(product.detailUrl);
                    const detail = parseProductDetail(detailHtml, product);
                    
                    const dateResult = validateReleaseDate(detail.releaseDate, startDate, endDate);
                    
                    if (dateResult.valid && detail.variants.length > 0) {
                        for (const variant of detail.variants) {
                            const msrpResult = validateMsrp(variant.msrp, variant.model, variant.series);
                            
                            if (msrpResult.valid) {
                                variant.msrp = msrpResult.msrp;
                                allProducts.push(variant);
                                stats.validProducts++;
                                stats.byBrand[brand.name].valid++;
                            } else {
                                stats.invalidProducts++;
                                stats.byBrand[brand.name].invalid++;
                            }
                        }
                    } else if (!dateResult.valid && detail.releaseDate) {
                        console.log(`  [跳过] ${product.model} - ${dateResult.reason}`);
                        stats.invalidProducts++;
                        stats.byBrand[brand.name].invalid++;
                    } else if (!detail.releaseDate && product.msrp) {
                        const msrpResult = validateMsrp(product.msrp, product.model, '');
                        
                        if (msrpResult.valid) {
                            allProducts.push({
                                brand: product.brand,
                                series: '',
                                model: product.model,
                                releaseDate: '',
                                version: '',
                                color: '',
                                msrp: msrpResult.msrp,
                                otherParams: '',
                                dataSource: 'pconline',
                                collectTime: new Date().toISOString().split('T')[0]
                            });
                            stats.validProducts++;
                            stats.byBrand[brand.name].valid++;
                        } else {
                            stats.invalidProducts++;
                            stats.byBrand[brand.name].invalid++;
                        }
                    }

                    if (onProgress) {
                        onProgress({
                            brand: brand.name,
                            product: product.model,
                            total: allProducts.length
                        });
                    }
                } catch (error) {
                    if (product.msrp) {
                        const msrpResult = validateMsrp(product.msrp, product.model, '');
                        
                        if (msrpResult.valid) {
                            allProducts.push({
                                brand: product.brand,
                                series: '',
                                model: product.model,
                                releaseDate: '',
                                version: '',
                                color: '',
                                msrp: msrpResult.msrp,
                                otherParams: '',
                                dataSource: 'pconline',
                                collectTime: new Date().toISOString().split('T')[0]
                            });
                            stats.validProducts++;
                            stats.byBrand[brand.name].valid++;
                        }
                    }
                }
            }

            console.log(`  ${brand.name} 完成，累计 ${allProducts.length} 条有效数据\n`);
        } catch (error) {
            console.error(`采集 ${brand.name} 失败: ${error.message}\n`);
        }
    }

    console.log('\n=== 采集统计 ===');
    console.log(`总产品数: ${stats.totalProducts}`);
    console.log(`有效数据: ${stats.validProducts}`);
    console.log(`无效数据: ${stats.invalidProducts}`);
    console.log('\n按品牌统计:');
    for (const [brand, data] of Object.entries(stats.byBrand)) {
        console.log(`  ${brand}: 总计${data.total}款, 有效${data.valid}条, 无效${data.invalid}条`);
    }
    
    return allProducts;
}

async function run(options = {}) {
    const products = await collectMsrp(options);
    
    if (products.length > 0) {
        const filename = await exportMsrpToExcel(products);
        console.log(`\n数据已导出: ${filename}`);
    } else {
        console.log('\n无有效数据可导出');
    }

    return products;
}

module.exports = {
    collectMsrp,
    run,
    BRANDS
};
