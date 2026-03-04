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
    
    console.log('\n=== 1. 查找所有表格 ===');
    $('table').each((i, table) => {
        const $table = $(table);
        const rows = [];
        $table.find('tr').each((j, tr) => {
            const cells = [];
            $(tr).find('td, th').each((k, cell) => {
                cells.push($(cell).text().trim().substring(0, 50));
            });
            if (cells.length > 0) {
                rows.push(cells);
            }
        });
        if (rows.length > 0) {
            console.log(`\n表格 ${i + 1}:`);
            rows.forEach(row => console.log(row.join(' | ')));
        }
    });
    
    console.log('\n=== 2. 查找版本选择区域 ===');
    const bodyText = $('body').html();
    const versionMatch = bodyText.match(/版本选择[\s\S]{0,500}/);
    if (versionMatch) {
        console.log('版本选择区域:', versionMatch[0].substring(0, 500));
    }
    
    console.log('\n=== 3. 查找JavaScript中的价格数据 ===');
    const scripts = $('script').text();
    const priceDataMatch = scripts.match(/price[s]?\s*[:=]\s*\[[\s\S]{0,1000}/);
    if (priceDataMatch) {
        console.log('价格数据:', priceDataMatch[0].substring(0, 500));
    }
}

test().catch(err => {
    console.error('错误:', err.message);
});
