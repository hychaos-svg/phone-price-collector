const msrp = require('../src/msrp');

async function test() {
    console.log('测试采集华为...\n');
    
    const products = await msrp.run({ 
        brandFilter: '华为', 
        maxPages: 1 
    });
    
    console.log('\n采集结果:', products.length, '条');
    
    if (products.length > 0) {
        console.log('\n前10条数据:');
        products.slice(0, 10).forEach((p, i) => {
            console.log(`${i + 1}. ${p.model} | 版本: ${p.version || '无'} | 颜色: ${p.color || '无'} | 价格: ${p.msrp}元 | 上市: ${p.releaseDate || '未知'}`);
        });
        
        const models = [...new Set(products.map(p => p.model))];
        console.log('\n型号数量:', models.length);
        console.log('型号列表:', models.slice(0, 10).join(', '));
    }
}

test().catch(e => console.error('错误:', e));
