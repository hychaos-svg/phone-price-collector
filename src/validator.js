const PRICE_RANGES = {
    normal: { min: 100, max: 8000, name: '普通手机' },
    flagship: { min: 3000, max: 15000, name: '高端旗舰' },
    foldable: { min: 6000, max: 25000, name: '折叠屏' },
    special: { min: 10000, max: 30000, name: '特殊机型' }
};

const PRODUCT_TYPE_KEYWORDS = {
    foldable: ['MateX', 'matex', 'Fold', 'fold', 'Flip', 'flip', '折叠', 'FOLD', 'FLIP'],
    flagship: ['Pro', 'pro', 'PRO', 'Ultra', 'ultra', 'ULTRA', 'Mate', 'mate', 'MATE', 'Plus', 'plus', 'PLUS', 'Max', 'max', 'MAX'],
    special: ['典藏', '限量', '非凡', '珍藏', '定制']
};

const REQUIRED_FIELDS = ['brand', 'model', 'price'];

function detectPriceType(model, series = '') {
    const searchText = `${model} ${series}`.toLowerCase();
    
    for (const keyword of PRODUCT_TYPE_KEYWORDS.special) {
        if (searchText.includes(keyword.toLowerCase())) {
            return 'special';
        }
    }
    
    for (const keyword of PRODUCT_TYPE_KEYWORDS.foldable) {
        if (searchText.includes(keyword.toLowerCase())) {
            return 'foldable';
        }
    }
    
    for (const keyword of PRODUCT_TYPE_KEYWORDS.flagship) {
        if (searchText.includes(keyword.toLowerCase())) {
            return 'flagship';
        }
    }
    
    return 'normal';
}

function fixTrailingZeros(price, model = '') {
    const priceStr = String(price);
    const trailingZerosMatch = priceStr.match(/(0{2,})$/);
    
    if (!trailingZerosMatch) {
        return { fixed: price, corrected: false, reason: null };
    }
    
    const zeroCount = trailingZerosMatch[1].length;
    
    if (zeroCount < 2) {
        return { fixed: price, corrected: false, reason: null };
    }
    
    const fixedPrice = parseInt(priceStr.slice(0, -zeroCount));
    const productType = detectPriceType(model);
    const range = PRICE_RANGES[productType];
    
    if (fixedPrice >= range.min && fixedPrice <= range.max) {
        return {
            fixed: fixedPrice,
            corrected: true,
            reason: `末尾${zeroCount}个零，从${price}修正为${fixedPrice}`
        };
    }
    
    return { fixed: price, corrected: false, reason: null };
}

function validatePriceRange(price, productType) {
    const range = PRICE_RANGES[productType];
    
    if (price < range.min || price > range.max) {
        return {
            valid: false,
            issue: `价格${price}元超出${range.name}合理区间(${range.min}-${range.max}元)`
        };
    }
    
    return { valid: true, issue: null };
}

function validateRequiredFields(product) {
    const missingFields = [];
    
    for (const field of REQUIRED_FIELDS) {
        if (product[field] === undefined || product[field] === null || product[field] === '') {
            missingFields.push(field);
        }
    }
    
    return missingFields;
}

function validatePriceFormat(price) {
    if (typeof price === 'number' && !isNaN(price) && isFinite(price)) {
        return { valid: true, normalizedPrice: price };
    }
    
    if (typeof price === 'string') {
        const cleanPrice = price.replace(/[,\s元￥$]/g, '');
        const parsed = parseFloat(cleanPrice);
        
        if (!isNaN(parsed) && isFinite(parsed)) {
            return { valid: true, normalizedPrice: parsed };
        }
    }
    
    return { valid: false, normalizedPrice: null };
}

function validateProduct(product) {
    const result = {
        valid: true,
        corrected: false,
        issues: [],
        originalProduct: { ...product },
        correctedProduct: { ...product }
    };
    
    const missingFields = validateRequiredFields(product);
    if (missingFields.length > 0) {
        result.valid = false;
        result.issues.push(`必填字段为空: ${missingFields.join(', ')}`);
        return result;
    }
    
    const priceValidation = validatePriceFormat(product.price);
    if (!priceValidation.valid) {
        result.valid = false;
        result.issues.push(`价格格式异常: "${product.price}" 不是有效数字`);
        return result;
    }
    
    result.correctedProduct.price = priceValidation.normalizedPrice;
    
    const productType = detectPriceType(product.model, product.series);
    result.correctedProduct.productType = productType;
    result.correctedProduct.productTypeName = PRICE_RANGES[productType].name;
    
    const fixResult = fixTrailingZeros(result.correctedProduct.price, product.model);
    if (fixResult.corrected) {
        result.corrected = true;
        result.correctedProduct.price = fixResult.fixed;
        result.issues.push(fixResult.reason);
    }
    
    const rangeValidation = validatePriceRange(result.correctedProduct.price, productType);
    if (!rangeValidation.valid) {
        result.issues.push(rangeValidation.issue);
    }
    
    return result;
}

function validateProducts(products) {
    const results = [];
    const validProducts = [];
    const invalidProducts = [];
    const correctedProducts = [];
    
    const productsByType = {};
    
    for (const product of products) {
        const result = validateProduct(product);
        results.push(result);
        
        if (result.valid) {
            validProducts.push(result.correctedProduct);
            
            if (result.corrected) {
                correctedProducts.push(result);
            }
            
            const productType = result.correctedProduct.productType;
            if (!productsByType[productType]) {
                productsByType[productType] = [];
            }
            productsByType[productType].push(result.correctedProduct);
        } else {
            invalidProducts.push(result);
        }
    }
    
    const priceAnomalies = detectPriceAnomalies(validProducts, productsByType);
    
    for (const anomaly of priceAnomalies) {
        const resultIndex = results.findIndex(
            r => r.correctedProduct.model === anomaly.model && 
                 r.correctedProduct.brand === anomaly.brand
        );
        if (resultIndex !== -1) {
            results[resultIndex].issues.push(anomaly.issue);
        }
    }
    
    return {
        results,
        summary: {
            total: products.length,
            valid: validProducts.length,
            invalid: invalidProducts.length,
            corrected: correctedProducts.length,
            anomalies: priceAnomalies.length
        },
        validProducts,
        invalidProducts,
        correctedProducts,
        priceAnomalies
    };
}

function detectPriceAnomalies(validProducts, productsByType) {
    const anomalies = [];
    
    for (const productType of Object.keys(productsByType)) {
        const products = productsByType[productType];
        
        if (products.length < 3) continue;
        
        const prices = products.map(p => p.price);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        for (const product of products) {
            const deviation = Math.abs(product.price - avgPrice) / avgPrice;
            
            if (deviation > 0.5) {
                anomalies.push({
                    model: product.model,
                    brand: product.brand,
                    price: product.price,
                    avgPrice: Math.round(avgPrice),
                    deviation: Math.round(deviation * 100),
                    issue: `价格突变: ${product.price}元与同类产品均价${Math.round(avgPrice)}元偏差${Math.round(deviation * 100)}%`
                });
            }
        }
    }
    
    return anomalies;
}

function generateQualityReport(validationResults) {
    const summary = validationResults.summary;
    
    const issuesByType = {
        missingFields: 0,
        priceFormat: 0,
        priceRange: 0,
        trailingZeros: 0,
        priceAnomaly: 0
    };
    
    const issueExamples = {
        missingFields: [],
        priceFormat: [],
        priceRange: [],
        trailingZeros: [],
        priceAnomaly: []
    };
    
    for (const result of validationResults.results) {
        for (const issue of result.issues) {
            if (issue.includes('必填字段为空')) {
                issuesByType.missingFields++;
                if (issueExamples.missingFields.length < 3) {
                    issueExamples.missingFields.push({
                        model: result.originalProduct.model,
                        issue
                    });
                }
            } else if (issue.includes('价格格式异常')) {
                issuesByType.priceFormat++;
                if (issueExamples.priceFormat.length < 3) {
                    issueExamples.priceFormat.push({
                        model: result.originalProduct.model,
                        issue
                    });
                }
            } else if (issue.includes('超出') && issue.includes('合理区间')) {
                issuesByType.priceRange++;
                if (issueExamples.priceRange.length < 3) {
                    issueExamples.priceRange.push({
                        model: result.originalProduct.model,
                        issue
                    });
                }
            } else if (issue.includes('末尾') && issue.includes('零')) {
                issuesByType.trailingZeros++;
                if (issueExamples.trailingZeros.length < 3) {
                    issueExamples.trailingZeros.push({
                        model: result.originalProduct.model,
                        issue
                    });
                }
            } else if (issue.includes('价格突变')) {
                issuesByType.priceAnomaly++;
                if (issueExamples.priceAnomaly.length < 3) {
                    issueExamples.priceAnomaly.push({
                        model: result.originalProduct.model,
                        issue
                    });
                }
            }
        }
    }
    
    const qualityScore = Math.round(
        (summary.valid / summary.total) * 100 * 
        (1 - issuesByType.priceAnomaly / Math.max(summary.valid, 1))
    );
    
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            totalRecords: summary.total,
            validRecords: summary.valid,
            invalidRecords: summary.invalid,
            correctedRecords: summary.corrected,
            anomalyRecords: summary.anomalies,
            qualityScore: Math.max(0, Math.min(100, qualityScore))
        },
        issues: {
            byType: issuesByType,
            examples: issueExamples
        },
        recommendations: []
    };
    
    if (issuesByType.missingFields > 0) {
        report.recommendations.push({
            type: 'missing_fields',
            severity: 'high',
            message: `发现${issuesByType.missingFields}条缺少必填字段的数据，建议检查数据源完整性`
        });
    }
    
    if (issuesByType.priceFormat > 0) {
        report.recommendations.push({
            type: 'price_format',
            severity: 'medium',
            message: `发现${issuesByType.priceFormat}条价格格式异常数据，建议标准化价格输入格式`
        });
    }
    
    if (issuesByType.trailingZeros > 0) {
        report.recommendations.push({
            type: 'trailing_zeros',
            severity: 'low',
            message: `已自动修正${issuesByType.trailingZeros}条末尾多零的价格数据`
        });
    }
    
    if (issuesByType.priceAnomaly > 0) {
        report.recommendations.push({
            type: 'price_anomaly',
            severity: 'medium',
            message: `发现${issuesByType.priceAnomaly}条价格异常数据，建议人工核实`
        });
    }
    
    return report;
}

module.exports = {
    validateProduct,
    validateProducts,
    detectPriceType,
    fixTrailingZeros,
    generateQualityReport,
    PRICE_RANGES,
    PRODUCT_TYPE_KEYWORDS
};
