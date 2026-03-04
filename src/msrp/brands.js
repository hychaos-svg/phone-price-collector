const BRANDS = [
    { name: '华为', id: 57, pconlineId: 'huawei' },
    { name: '苹果', id: 59, pconlineId: 'apple' },
    { name: '荣耀', id: 119, pconlineId: 'honor' },
    { name: '小米', id: 80, pconlineId: 'xiaomi' },
    { name: 'OPPO', id: 98, pconlineId: 'oppo' },
    { name: 'VIVO', id: 99, pconlineId: 'vivo' },
    { name: 'IQOO', id: 532, pconlineId: 'iqoo' },
    { name: '真我', id: 475, pconlineId: 'realme' },
    { name: '一加', id: 126, pconlineId: 'oneplus' }
];

const PCONLINE_BASE_URL = 'https://product.pconline.com.cn';
const PCONLINE_LIST_URL = 'https://product.pconline.com.cn/mobile/{brandId}/';

const REQUEST_CONFIG = {
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
    }
};

const TIME_FILTER = {
    startDate: '2024-03-01',
    endDate: '2026-03-04'
};

module.exports = {
    BRANDS,
    PCONLINE_BASE_URL,
    PCONLINE_LIST_URL,
    REQUEST_CONFIG,
    TIME_FILTER
};
