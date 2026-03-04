const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function test() {
    const url = 'https://product.pconline.com.cn/mobile/huawei/2706739.html';
    console.log('请求产品详情页:', url);
    
    const response = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        responseType: 'arraybuffer'
    });
    
    const html = iconv.decode(Buffer.from(response.data), 'gbk');
    const $ = cheerio.load(html);
    
    console.log('\n=== 1. 查找型号价格表格 ===');
    $('.b-tb table').each((i, table) => {
        console.log('\n表格', i + 1);
        $(table).find('tr').each((j, tr) => {
            const cells = [];
            $(tr).find('td, th').each((k, cell) => {
                cells.push($(cell).text().trim().substring(0, 40));
            });
            if (cells.length > 0) {
                console.log(cells.join(' | '));
            }
        });
    });
    
    console.log('\n=== 2. 查找所有表格 ===');
    $('table').each((i, table) => {
        const text = $(table).text();
        if (text.includes('型号') && text.includes('￥')) {
            console.log('\n找到型号价格表格:');
            $(table).find('tr').each((j, tr) => {
                const cells = [];
                $(tr).find('td, th').each((k, cell) => {
                    cells.push($(cell).text().trim().substring(0, 40));
                });
                if (cells.length > 0) {
                    console.log(cells.join(' | '));
                }
            });
        }
    });
    
    console.log('\n=== 3. 查找SKU版本 ===');
    const skus = [];
    $('.product-version .item').each((i, el) => {
        const $item = $(el);
        skus.push({
            name: $item.text().trim(),
            skuid: $item.attr('data-skuid')
        });
    });
    console.log('SKU版本:', skus);
    
    console.log('\n=== 4. 查找JavaScript中的价格数据 ===');
    const scripts = $('script').text();
    
    const priceMatch = scripts.match(/price\s*[:=]\s*(\d+)/g);
    if (priceMatch) {
        console.log('找到价格数据:', priceMatch.slice(0, 10));
    }
    
    const skuDataMatch = scripts.match(/skuData\s*=\s*(\{[\s\S]*?\})/);
    if (skuDataMatch) {
        console.log('找到SKU数据:', skuDataMatch[1].substring(0, 500));
    }
}

test().catch(err => {
    console.error('错误:', err.message);
});
