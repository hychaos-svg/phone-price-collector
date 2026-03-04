const PRICE_RANGES = {
    normal: { min: 500, max: 8000, name: '普通手机' },
    flagship: { min: 2000, max: 20000, name: '高端旗舰' },
    foldable: { min: 3000, max: 30000, name: '折叠屏' },
    special: { min: 5000, max: 50000, name: '特殊机型' }
};

const PRODUCT_TYPE_KEYWORDS = {
    foldable: ['MateX', 'matex', 'Fold', 'fold', 'Flip', 'flip', '折叠', 'FOLD', 'FLIP', 'X5', 'X6'],
    flagship: ['Pro', 'pro', 'PRO', 'Ultra', 'ultra', 'ULTRA', 'Mate', 'mate', 'MATE', 'Plus', 'plus', 'PLUS', 'Max', 'max', 'MAX', 'Magic', 'RS', 'P80', 'P90', 'iPhone'],
    special: ['典藏', '限量', '非凡', '珍藏', '定制', '保时捷', '设计师', 'RSR']
};

function detectPriceType(model, series = '') {
    const searchText = `${model} ${series}`;
    
    for (const keyword of PRODUCT_TYPE_KEYWORDS.special) {
        if (searchText.includes(keyword)) {
            return 'special';
        }
    }
    
    for (const keyword of PRODUCT_TYPE_KEYWORDS.foldable) {
        if (searchText.includes(keyword)) {
            return 'foldable';
        }
    }
    
    for (const keyword of PRODUCT_TYPE_KEYWORDS.flagship) {
        if (searchText.includes(keyword)) {
            return 'flagship';
        }
    }
    
    return 'normal';
}

function validateMsrp(msrp, model = '', series = '') {
    if (!msrp || isNaN(msrp)) {
        return { valid: false, msrp: null, reason: '价格无效' };
    }
    
    const priceType = detectPriceType(model, series);
    const range = PRICE_RANGES[priceType];
    
    if (msrp < range.min || msrp > range.max) {
        console.log(`  [价格校验] ${model} 价格${msrp}元超出${range.name}合理区间(${range.min}-${range.max})`);
        return { valid: false, msrp: msrp, reason: `价格超出${range.name}合理区间` };
    }
    
    const priceStr = String(msrp);
    const trailingZerosMatch = priceStr.match(/(0{2,})$/);
    
    if (trailingZerosMatch && trailingZerosMatch[1].length >= 2) {
        const zeroCount = trailingZerosMatch[1].length;
        const fixedPrice = parseInt(priceStr.slice(0, -zeroCount));
        
        if (fixedPrice >= range.min && fixedPrice <= range.max) {
            console.log(`  [价格修正] ${model} 末尾${zeroCount}个零，从${msrp}修正为${fixedPrice}`);
            return { valid: true, msrp: fixedPrice, reason: `末尾多零已修正` };
        }
    }
    
    return { valid: true, msrp: msrp, reason: null };
}

function validateReleaseDate(releaseDate, startDate = '2024-03-01', endDate = '2026-03-04') {
    if (!releaseDate) {
        return { valid: false, reason: '无上市时间' };
    }
    
    if (releaseDate >= startDate && releaseDate <= endDate) {
        return { valid: true, reason: null };
    }
    
    return { valid: false, reason: `上市时间${releaseDate}不在采集范围内` };
}

function validateProduct(product) {
    const result = {
        valid: true,
        product: { ...product },
        issues: []
    };
    
    const msrpResult = validateMsrp(product.msrp, product.model, product.series);
    if (!msrpResult.valid) {
        result.valid = false;
        result.issues.push(msrpResult.reason);
    }
    result.product.msrp = msrpResult.msrp;
    
    const dateResult = validateReleaseDate(product.releaseDate);
    if (!dateResult.valid) {
        result.issues.push(dateResult.reason);
    }
    
    return result;
}

function validateProducts(products) {
    const validProducts = [];
    const invalidProducts = [];
    const stats = {
        total: products.length,
        valid: 0,
        invalid: 0,
        corrected: 0,
        byBrand: {},
        byYear: {}
    };
    
    for (const product of products) {
        const result = validateProduct(product);
        
        if (result.valid) {
            validProducts.push(result.product);
            stats.valid++;
            
            if (result.issues.length > 0) {
                stats.corrected++;
            }
            
            if (!stats.byBrand[product.brand]) {
                stats.byBrand[product.brand] = 0;
            }
            stats.byBrand[product.brand]++;
            
            if (product.releaseDate) {
                const year = product.releaseDate.split('-')[0];
                if (!stats.byYear[year]) {
                    stats.byYear[year] = 0;
                }
                stats.byYear[year]++;
            }
        } else {
            invalidProducts.push({ product, issues: result.issues });
            stats.invalid++;
        }
    }
    
    return { validProducts, invalidProducts, stats };
}

module.exports = {
    validateMsrp,
    validateReleaseDate,
    validateProduct,
    validateProducts,
    PRICE_RANGES,
    PRODUCT_TYPE_KEYWORDS
};
