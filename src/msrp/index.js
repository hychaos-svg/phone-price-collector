const { BRANDS, TIME_FILTER } = require('./brands');
const { collectBrandProducts, collectProductDetail } = require('./zolCollector');
const { parseProductDetail } = require('./parser');
const { exportMsrpToExcel } = require('./exporter');

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

        try {
            const productList = await collectBrandProducts(brand, maxPages);
            
            console.log(`  发现 ${productList.length} 款产品`);

            for (let j = 0; j < productList.length; j++) {
                const product = productList[j];
                
                try {
                    const detailHtml = await collectProductDetail(product.detailUrl);
                    const detail = parseProductDetail(detailHtml, product);
                    
                    if (detail.releaseDate) {
                        if (detail.releaseDate >= startDate && detail.releaseDate <= endDate) {
                            if (detail.variants.length > 0) {
                                allProducts.push(...detail.variants);
                            } else if (product.msrp) {
                                allProducts.push({
                                    brand: product.brand,
                                    series: detail.series,
                                    model: product.model,
                                    releaseDate: detail.releaseDate,
                                    version: '',
                                    color: '',
                                    msrp: product.msrp,
                                    otherParams: '',
                                    dataSource: 'pconline',
                                    collectTime: new Date().toISOString().split('T')[0]
                                });
                            }
                        }
                    } else if (product.msrp) {
                        allProducts.push({
                            brand: product.brand,
                            series: '',
                            model: product.model,
                            releaseDate: '',
                            version: '',
                            color: '',
                            msrp: product.msrp,
                            otherParams: '',
                            dataSource: 'pconline',
                            collectTime: new Date().toISOString().split('T')[0]
                        });
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
                        allProducts.push({
                            brand: product.brand,
                            series: '',
                            model: product.model,
                            releaseDate: '',
                            version: '',
                            color: '',
                            msrp: product.msrp,
                            otherParams: '',
                            dataSource: 'pconline',
                            collectTime: new Date().toISOString().split('T')[0]
                        });
                    }
                }
            }

            console.log(`  ${brand.name} 完成，累计 ${allProducts.length} 条数据\n`);
        } catch (error) {
            console.error(`采集 ${brand.name} 失败: ${error.message}\n`);
        }
    }

    console.log(`\n采集完成，共 ${allProducts.length} 条数据`);
    return allProducts;
}

async function run(options = {}) {
    const products = await collectMsrp(options);
    
    if (products.length > 0) {
        const filename = await exportMsrpToExcel(products);
        console.log(`\n数据已导出: ${filename}`);
    }

    return products;
}

module.exports = {
    collectMsrp,
    run,
    BRANDS
};
