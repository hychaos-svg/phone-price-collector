const msrp = require('../src/msrp');

async function test() {
    console.log('测试采集华为...\n');
    
    const products = await msrp.run({ 
        brandFilter: '华为', 
        maxPages: 1 
    });
    
    console.log('\n采集结果:', products.length, '条');
    
    if (products.length > 0) {
        console.log('\n前15条数据:');
        products.slice(0, 15).forEach((p, i) => {
            console.log(`${i + 1}. ${p.model} | 版本: ${p.version || '无'} | 颜色: ${p.color || '无'} | 价格: ${p.msrp}元 | 上市: ${p.releaseDate || '未知'}`);
        });
        
        const versions = [...new Set(products.map(p => p.version).filter(v => v))];
        console.log('\n版本数量:', versions.length);
        console.log('版本列表:', versions.slice(0, 10).join(', '));
    }
}

test().catch(e => console.error('错误:', e));
