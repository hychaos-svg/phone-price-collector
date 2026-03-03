const axios = require('axios');
const cheerio = require('cheerio');

const BRANDS = [
    { name: '华为', id: 16, url: 'huawei' },
    { name: '苹果', id: 6, url: 'apple' },
    { name: '荣耀', id: 56, url: 'honor' },
    { name: '小米', id: 13, url: 'xiaomi' },
    { name: 'OPPO', id: 46, url: 'oppo' },
    { name: 'VIVO', id: 47, url: 'vivo' },
    { name: 'IQOO', id: 49, url: 'iqoo' },
    { name: '真我', id: 48, url: 'realme' },
    { name: '一加', id: 55, url: 'oneplus' }
];

const API_URL = 'https://www.sjpif.net/price/price.loading.php';

async function fetchBrandPrice(brand) {
    console.log(`正在获取 ${brand.name} 价格数据...`);
    
    try {
        const response = await axios.get(API_URL, {
            params: { id: brand.id, ajax: 'true' },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': `https://www.sjpif.net/price/${brand.url}.html`,
                'Cache-Control': 'no-cache'
            },
            timeout: 15000
        });
        
        return parsePriceData(response.data, brand.name);
    } catch (error) {
        console.error(`获取 ${brand.name} 数据失败: ${error.message}`);
        if (error.response) {
            console.error(`  状态码: ${error.response.status}`);
        }
        return [];
    }
}

function parsePriceData(html, brandName) {
    try {
        const $ = cheerio.load(html);
        const products = [];
        
        let currentSeries = '';
        let currentDate = '';
        
        $('table').each((tableIndex, table) => {
            const $table = $(table);
            
            const seriesDiv = $table.find('div').filter((i, el) => {
                const text = $(el).text();
                return text.includes('报价') && text.includes('[');
            });
            
            if (seriesDiv.length > 0) {
                const seriesText = seriesDiv.text().trim();
                const dateMatch = seriesText.match(/\[(\d{4}-\d{2}-\d{2})\]/);
                currentDate = dateMatch ? dateMatch[1] : '';
                currentSeries = seriesText.replace(/\[.*?\]/, '').replace('报价', '').trim();
            }
            
            if (!$table.hasClass('price_table_box')) return;
            
            $table.find('tr').each((rowIndex, row) => {
                const $row = $(row);
                const cells = $row.find('td');
                
                if (cells.length < 2) return;
                
                const firstCell = $(cells[0]);
                const modelLink = firstCell.find('a font').first();
                let modelName = modelLink.text().trim();
                
                modelName = modelName.replace(/^[\s•]+/, '').trim();
                
                if (!modelName) return;
                
                const versionText = firstCell.find('font[style*="float:right"]').text().trim();
                
                for (let i = 1; i < cells.length; i++) {
                    const $cell = $(cells[i]);
                    if ($cell.length === 0) continue;
                    
                    const colorLink = $cell.find('a font').first();
                    const colorName = colorLink.text().trim();
                    
                    if (!colorName) continue;
                    
                    const priceFont = $cell.find('font[style*="float:right"]');
                    const priceText = priceFont.text().trim();
                    const priceMatch = priceText.match(/(\d{3,6})/);
                    
                    if (priceMatch) {
                        const price = parseInt(priceMatch[1]);
                        
                        products.push({
                            brand: brandName,
                            series: currentSeries,
                            model: modelName,
                            version: versionText,
                            color: colorName,
                            price: price,
                            date: currentDate
                        });
                    }
                }
            });
        });
        
        return products;
    } catch (error) {
        console.error(`解析 ${brandName} 数据失败: ${error.message}`);
        return [];
    }
}

async function collectAllPrices(options = {}) {
    const { 
        onProgress = null,
        brandDelay = 0,
        shuffle = true 
    } = options;
    
    console.log('开始采集价格数据...\n');
    console.log(`时间: ${new Date().toLocaleString('zh-CN')}\n`);
    
    const allProducts = [];
    const brandsToProcess = shuffle ? [...BRANDS].sort(() => Math.random() - 0.5) : [...BRANDS];
    
    for (let i = 0; i < brandsToProcess.length; i++) {
        const brand = brandsToProcess[i];
        
        try {
            const products = await fetchBrandPrice(brand);
            allProducts.push(...products);
            console.log(`  ${brand.name}: ${products.length} 条数据`);
            
            if (onProgress) {
                onProgress({
                    brand: brand.name,
                    count: products.length,
                    total: allProducts.length,
                    index: i + 1,
                    totalBrands: brandsToProcess.length
                });
            }
            
            if (brandDelay > 0 && i < brandsToProcess.length - 1) {
                await new Promise(resolve => setTimeout(resolve, brandDelay));
            }
        } catch (error) {
            console.error(`处理 ${brand.name} 时发生错误: ${error.message}`);
        }
    }
    
    console.log(`\n总计: ${allProducts.length} 条数据`);
    
    return allProducts;
}

module.exports = {
    BRANDS,
    API_URL,
    fetchBrandPrice,
    parsePriceData,
    collectAllPrices
};
