const msrp = require('../src/msrp');

async function test() {
    console.log('开始测试采集...\n');
    
    try {
        const products = await msrp.run({ 
            brandFilter: '华为', 
            maxPages: 1 
        });
        
        console.log('\n采集结果:', products.length, '条');
        
        if (products.length > 0) {
            console.log('\n前3条数据:');
            products.slice(0, 3).forEach((p, i) => {
                console.log(`${i + 1}. ${p.model} - 上市: ${p.releaseDate || '未知'} - 价格: ${p.msrp}元`);
            });
        }
    } catch (e) {
        console.error('错误:', e.message);
        console.error(e.stack);
    }
}

test();
