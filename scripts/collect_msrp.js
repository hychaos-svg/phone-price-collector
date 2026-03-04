const msrp = require('../src/msrp');

const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--brand=')) {
        options.brandFilter = arg.split('=')[1];
    } else if (arg.startsWith('--from=')) {
        options.startDate = arg.split('=')[1];
    } else if (arg.startsWith('--to=')) {
        options.endDate = arg.split('=')[1];
    } else if (arg === '--brand' && args[i + 1]) {
        options.brandFilter = args[++i];
    } else if (arg === '--from' && args[i + 1]) {
        options.startDate = args[++i];
    } else if (arg === '--to' && args[i + 1]) {
        options.endDate = args[++i];
    }
}

console.log('厂商指导价采集工具');
console.log('==================\n');

if (options.brandFilter) {
    console.log(`指定品牌: ${options.brandFilter}`);
}
if (options.startDate) {
    console.log(`起始日期: ${options.startDate}`);
}
if (options.endDate) {
    console.log(`结束日期: ${options.endDate}`);
}
console.log('');

msrp.run(options)
    .then(products => {
        console.log('\n采集完成!');
        console.log(`共采集 ${products.length} 条数据`);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n采集失败:', error.message);
        process.exit(1);
    });
