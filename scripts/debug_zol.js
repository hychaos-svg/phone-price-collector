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
    
    console.log('\n=== 查找发布时间 ===');
    $('tr').each((i, el) => {
        const $row = $(el);
        const $th = $row.find('th');
        const $td = $row.find('td');
        
        if ($th.length > 0 && $td.length > 0) {
            const thText = $th.text().trim();
            const tdText = $td.text().trim();
            
            if (thText === '发布时间') {
                console.log(`原始值: "${tdText}"`);
                
                const dateMatch = tdText.match(/(\d{4})[年,]\s*(\d{1,2})[月,]\s*(\d{1,2})/);
                if (dateMatch) {
                    console.log('匹配到完整日期:', dateMatch[0]);
                }
                
                const yearMatch = tdText.match(/(\d{4})[年,]/);
                if (yearMatch) {
                    console.log('匹配到年份:', yearMatch[0]);
                }
            }
        }
    });
    
    console.log('\n=== 查找所有参数 ===');
    const params = {};
    $('tr').each((i, el) => {
        const $row = $(el);
        const $th = $row.find('th');
        const $td = $row.find('td');
        
        if ($th.length > 0 && $td.length > 0) {
            const thText = $th.text().trim();
            const tdText = $td.text().trim();
            params[thText] = tdText;
        }
    });
    
    console.log('型号:', params['型号']);
    console.log('发布时间:', params['发布时间']);
    console.log('运行内存:', params['运行内存']);
    console.log('机身容量:', params['机身容量']);
    console.log('手机颜色:', params['手机颜色']);
    console.log('报价:', params['报价']);
}

test().catch(err => {
    console.error('错误:', err.message);
});
