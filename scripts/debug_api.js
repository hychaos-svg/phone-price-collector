const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function testPconlineApi() {
    const productId = '2706739';
    const skuUrl = `https://product.pconline.com.cn/product/${productId}/sku.html`;
    console.log('请求SKU页面:', skuUrl);
    
    try {
        const response = await axios.get(skuUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            responseType: 'arraybuffer'
        });
        
        const html = iconv.decode(Buffer.from(response.data), 'gbk');
        const $ = cheerio.load(html);
        
        console.log('\n=== SKU页面内容 ===');
        console.log($('body').text().substring(0, 2000));
        
    } catch (e) {
        console.log('请求失败:', e.message);
    }
}

async function testPconlinePriceApi() {
    const productId = '2706739';
    const skuId = '63770';
    const priceUrl = `https://product.pconline.com.cn/product/${productId}/price_${skuId}.html`;
    console.log('\n请求价格API:', priceUrl);
    
    try {
        const response = await axios.get(priceUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            },
            responseType: 'arraybuffer'
        });
        
        const html = iconv.decode(Buffer.from(response.data), 'gbk');
        const $ = cheerio.load(html);
        
        console.log('\n=== 价格API内容 ===');
        console.log($('body').text().substring(0, 2000));
        
    } catch (e) {
        console.log('请求失败:', e.message);
    }
}

async function testPconlineJsonApi() {
    const productId = '2706739';
    const apiUrl = `https://product.pconline.com.cn/product/${productId}/detail.html`;
    console.log('\n请求详情API:', apiUrl);
    
    try {
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/javascript, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            responseType: 'arraybuffer'
        });
        
        const text = iconv.decode(Buffer.from(response.data), 'gbk');
        
        console.log('\n=== 详情API内容 ===');
        console.log(text.substring(0, 3000));
        
    } catch (e) {
        console.log('请求失败:', e.message);
    }
}

async function test() {
    await testPconlineApi();
    await testPconlinePriceApi();
    await testPconlineJsonApi();
}

test().catch(err => {
    console.error('错误:', err.message);
});
