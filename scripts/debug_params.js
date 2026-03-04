const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function test() {
    const url = 'https://product.pconline.com.cn/mobile/huawei/2706739_detail.html';
    console.log('请求参数详情页:', url);
    
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
    
    const params = {};
    $('tr').each((index, element) => {
        const $row = $(element);
        const $th = $row.find('th');
        const $td = $row.find('td');
        
        if ($th.length > 0 && $td.length > 0) {
            const thText = $th.text().trim();
            const tdText = $td.text().trim();
            params[thText] = tdText;
        }
    });
    
    console.log('\n=== 内存和容量相关参数 ===');
    console.log('运行内存:', params['运行内存']);
    console.log('机身容量:', params['机身容量']);
    console.log('RAM:', params['RAM']);
    console.log('ROM:', params['ROM']);
    console.log('存储:', params['存储']);
    
    console.log('\n=== 所有参数名称 ===');
    for (const key of Object.keys(params)) {
        if (key.includes('内存') || key.includes('容量') || key.includes('RAM') || key.includes('ROM') || key.includes('存储')) {
            console.log(`${key}: ${params[key]}`);
        }
    }
    
    console.log('\n=== 型号信息 ===');
    console.log('型号:', params['型号']);
}

test().catch(err => {
    console.error('错误:', err.message);
});
