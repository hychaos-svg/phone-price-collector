const axios = require('axios');
const cheerio = require('cheerio');

async function testHuaweiMall() {
    const url = 'https://www.vmall.com/list-36';
    console.log('请求华为商城:', url);
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        console.log('\n=== 华为商城产品列表 ===');
        let count = 0;
        $('.product-item, [class*="product"]').each((i, el) => {
            const name = $(el).find('[class*="name"]').text().trim() || $(el).text().trim().substring(0, 30);
            const price = $(el).find('[class*="price"]').text().trim();
            
            if (name && price) {
                console.log(`${name} -> ${price}`);
                count++;
                if (count >= 10) return false;
            }
        });
        console.log('找到产品数:', count);
        
    } catch (e) {
        console.log('请求失败:', e.message);
    }
}

async function testHuaweiProduct() {
    const url = 'https://www.vmall.com/product/10086835428325.html';
    console.log('\n请求华为商城产品详情:', url);
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        console.log('\n=== 华为商城产品详情 ===');
        console.log('标题:', $('h1, [class*="title"]').first().text().trim());
        
        console.log('\n=== 价格信息 ===');
        $('[class*="price"]').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('￥') || text.includes('元')) {
                console.log(text.substring(0, 100));
            }
        });
        
        console.log('\n=== 版本选择 ===');
        $('[class*="sku"], [class*="version"], [class*="spec"]').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('GB') || text.includes('色')) {
                console.log(text.substring(0, 100));
            }
        });
        
    } catch (e) {
        console.log('请求失败:', e.message);
    }
}

async function test() {
    await testHuaweiMall();
    await testHuaweiProduct();
}

test().catch(err => {
    console.error('错误:', err.message);
});
