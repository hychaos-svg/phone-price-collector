const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const { PCONLINE_BASE_URL, PCONLINE_LIST_URL, REQUEST_CONFIG } = require('./brands');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                ...REQUEST_CONFIG,
                ...options,
                responseType: 'arraybuffer',
                timeout: options.timeout || REQUEST_CONFIG.timeout
            });
            
            const html = iconv.decode(Buffer.from(response.data), 'gbk');
            return html;
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            console.log(`  请求失败，${i + 1}秒后重试...`);
            await delay(1000 * (i + 1));
        }
    }
}

async function collectBrandProducts(brand, maxPages = 3) {
    const allProducts = [];
    const seenModels = new Set();
    
    for (let page = 1; page <= maxPages; page++) {
        let listUrl;
        if (page === 1) {
            listUrl = PCONLINE_LIST_URL.replace('{brandId}', brand.pconlineId);
        } else {
            listUrl = `https://product.pconline.com.cn/mobile/${brand.pconlineId}/25s${page}.shtml`;
        }
        
        console.log(`  请求: ${listUrl}`);
        const html = await fetchWithRetry(listUrl);
        const $ = cheerio.load(html);
        
        $('.list-items .item').each((index, element) => {
            const $item = $(element);
            const $link = $item.find('.item-title-name');
            const href = $link.attr('href');
            const text = $link.text().trim();
            
            if (href && text && text.length > 2 && !seenModels.has(text)) {
                seenModels.add(text);
                
                const $priceLink = $item.find('.price-now a');
                const priceText = $priceLink.text().trim();
                const priceMatch = priceText.match(/￥?(\d+)/);
                const price = priceMatch ? parseInt(priceMatch[1]) : null;
                
                const fullUrl = href.startsWith('http') ? href : `https:${href}`;
                
                allProducts.push({
                    brand: brand.name,
                    model: text,
                    url: fullUrl,
                    msrp: price
                });
            }
        });
        
        await delay(500);
    }
    
    return allProducts;
}

async function collectProductDetail(productUrl) {
    const html = await fetchWithRetry(productUrl);
    return html;
}

async function collectProductPrice(productUrl) {
    const priceUrl = productUrl.replace('.html', '_price.html');
    const html = await fetchWithRetry(priceUrl);
    return html;
}

module.exports = {
    collectBrandProducts,
    collectProductDetail,
    collectProductPrice,
    fetchWithRetry
};
