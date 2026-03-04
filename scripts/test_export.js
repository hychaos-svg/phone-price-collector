const { exportMsrpToExcel } = require('../src/msrp/exporter');

const testProducts = [
    { brand: '华为', series: '', model: 'Mate 80', releaseDate: '2025-11-25', version: '12GB+256GB', color: '曜石黑', msrp: 5499, otherParams: '', dataSource: 'pconline', collectTime: '2026-03-04' },
    { brand: '华为', series: '', model: 'Mate 80', releaseDate: '2025-11-25', version: '12GB+256GB', color: '雪域白', msrp: 5499, otherParams: '', dataSource: 'pconline', collectTime: '2026-03-04' },
    { brand: '华为', series: '', model: 'Mate 80', releaseDate: '2025-11-25', version: '16GB+512GB', color: '曜石黑', msrp: 5499, otherParams: '', dataSource: 'pconline', collectTime: '2026-03-04' }
];

exportMsrpToExcel(testProducts)
    .then(f => console.log('导出成功:', f))
    .catch(e => console.error('导出失败:', e.message));
