const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function testPricePageDetail() {
    const url = 'https://product.pconline.com.cn/mobile/huawei/2706739_price.html';
    console.log('请求价格页面:', url);
    
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
    
    console.log('\n=== 完整页面内容 ===');
    console.log(html.substring(0, 5000));
}

testPricePageDetail().catch(err => {
    console.error('错误:', err.message);
});
