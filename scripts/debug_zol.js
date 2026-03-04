const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const fs = require('fs');

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
    
    fs.writeFileSync('debug_params.html', html, 'utf8');
    
    console.log('\n=== 1. 查找上市时间 ===');
    $('tr').each((i, el) => {
        const $row = $(el);
        const $th = $row.find('th');
        const $td = $row.find('td');
        
        if ($th.length > 0 && $td.length > 0) {
            const thText = $th.text().trim();
            const tdText = $td.text().trim();
            
            if (thText.includes('发布') || thText.includes('上市')) {
                console.log(`TH: "${thText}" -> TD: "${tdText}"`);
            }
        }
    });
    
    console.log('\n=== 2. 查找系列 ===');
    $('tr').each((i, el) => {
        const $row = $(el);
        const $th = $row.find('th');
        const $td = $row.find('td');
        
        if ($th.length > 0 && $td.length > 0) {
            const thText = $th.text().trim();
            const tdText = $td.text().trim();
            
            if (thText === '系列') {
                console.log(`TH: "${thText}" -> TD: "${tdText}"`);
            }
        }
    });
    
    console.log('\n=== 3. 所有TH标签 ===');
    $('th').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 0 && text.length < 20) {
            const $td = $(el).next('td');
            if ($td.length > 0) {
                console.log(`TH: "${text}" -> TD: "${$td.text().trim().substring(0, 50)}"`);
            }
        }
    });
}

test().catch(err => {
    console.error('错误:', err.message);
});
