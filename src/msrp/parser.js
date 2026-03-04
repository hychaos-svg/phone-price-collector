const cheerio = require('cheerio');

function parseProductList(html, brand) {
    const $ = cheerio.load(html);
    const products = [];
    const seenModels = new Set();

    $('.list-items .item').each((index, element) => {
        const $item = $(element);
        const $link = $item.find('.item-title-name');
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        if (href && text && text.length > 2 && !seenModels.has(text)) {
            seenModels.add(text);
            
            const $priceLink = $item.find('.price-now a');
            const priceText = $priceLink.text().trim();
            const priceMatch = priceText.match(/￥?(\d+)/);
            const price = priceMatch ? parseInt(priceMatch[1]) : null;
            
            products.push({
                brand: brand.name,
                model: text,
                url: href.startsWith('http') ? href : `https:${href}`,
                msrp: price
            });
        }
    });

    return products;
}

function parseProductDetail(html, basicInfo) {
    const $ = cheerio.load(html);
    const result = {
        brand: basicInfo.brand,
        model: basicInfo.model,
        series: '',
        releaseDate: '',
        ramOptions: [],
        storageOptions: [],
        colors: [],
        msrp: basicInfo.msrp,
        variants: []
    };

    const params = {};
    
    $('tr').each((index, element) => {
        const $row = $(element);
        const $th = $row.find('th');
        const $td = $row.find('td');
        
        if ($th.length > 0 && $td.length > 0) {
            const thText = $th.text().trim();
            const tdText = $td.text().trim();
            params[thText] = tdText;
        }
    });

    if (params['发布时间']) {
        const dateText = params['发布时间'];
        const dateMatch = dateText.match(/(\d{4})[年,]\s*(\d{1,2})[月,]\s*(\d{1,2})/);
        if (dateMatch) {
            const year = dateMatch[1];
            const month = dateMatch[2].padStart(2, '0');
            const day = dateMatch[3].padStart(2, '0');
            result.releaseDate = `${year}-${month}-${day}`;
        } else {
            const yearMatch = dateText.match(/(\d{4})[年,]/);
            if (yearMatch) {
                result.releaseDate = `${yearMatch[1]}-01-01`;
            }
        }
    }

    if (params['型号']) {
        result.model = params['型号'];
    }

    if (params['运行内存']) {
        result.ramOptions = params['运行内存'].split(/[,，\/]/).map(s => s.trim()).filter(s => s);
    }

    if (params['机身容量']) {
        result.storageOptions = params['机身容量'].split(/[,，\/]/).map(s => s.trim()).filter(s => s);
    }

    if (params['手机颜色']) {
        result.colors = params['手机颜色'].split(/[,，\/]/).map(s => s.trim()).filter(s => s);
    }

    if (params['报价']) {
        const priceMatch = params['报价'].match(/￥?([\d.]+)/);
        if (priceMatch) {
            result.msrp = parseFloat(priceMatch[1]);
        }
    }

    if (result.ramOptions.length > 0 && result.storageOptions.length > 0) {
        for (const ram of result.ramOptions) {
            for (const storage of result.storageOptions) {
                const version = `${ram}+${storage}`;
                
                if (result.colors.length > 0) {
                    for (const color of result.colors) {
                        result.variants.push({
                            brand: result.brand,
                            series: result.series,
                            model: result.model,
                            releaseDate: result.releaseDate,
                            version: version,
                            color: color,
                            msrp: result.msrp,
                            otherParams: '',
                            dataSource: 'pconline',
                            collectTime: new Date().toISOString().split('T')[0]
                        });
                    }
                } else {
                    result.variants.push({
                        brand: result.brand,
                        series: result.series,
                        model: result.model,
                        releaseDate: result.releaseDate,
                        version: version,
                        color: '',
                        msrp: result.msrp,
                        otherParams: '',
                        dataSource: 'pconline',
                        collectTime: new Date().toISOString().split('T')[0]
                    });
                }
            }
        }
    } else if (result.storageOptions.length > 0) {
        for (const storage of result.storageOptions) {
            if (result.colors.length > 0) {
                for (const color of result.colors) {
                    result.variants.push({
                        brand: result.brand,
                        series: result.series,
                        model: result.model,
                        releaseDate: result.releaseDate,
                        version: storage,
                        color: color,
                        msrp: result.msrp,
                        otherParams: '',
                        dataSource: 'pconline',
                        collectTime: new Date().toISOString().split('T')[0]
                    });
                }
            } else {
                result.variants.push({
                    brand: result.brand,
                    series: result.series,
                    model: result.model,
                    releaseDate: result.releaseDate,
                    version: storage,
                    color: '',
                    msrp: result.msrp,
                    otherParams: '',
                    dataSource: 'pconline',
                    collectTime: new Date().toISOString().split('T')[0]
                });
            }
        }
    } else if (result.colors.length > 0) {
        for (const color of result.colors) {
            result.variants.push({
                brand: result.brand,
                series: result.series,
                model: result.model,
                releaseDate: result.releaseDate,
                version: '',
                color: color,
                msrp: result.msrp,
                otherParams: '',
                dataSource: 'pconline',
                collectTime: new Date().toISOString().split('T')[0]
            });
        }
    } else if (result.msrp) {
        result.variants.push({
            brand: result.brand,
            series: result.series,
            model: result.model,
            releaseDate: result.releaseDate,
            version: '',
            color: '',
            msrp: result.msrp,
            otherParams: '',
            dataSource: 'pconline',
            collectTime: new Date().toISOString().split('T')[0]
        });
    }

    return result;
}

function extractVersion(text) {
    const versionMatch = text.match(/(\d+)\s*GB\s*[+＋]\s*(\d+)\s*GB/i);
    if (versionMatch) {
        return `${versionMatch[1]}GB+${versionMatch[2]}GB`;
    }
    
    const simpleMatch = text.match(/(\d+)\s*[Gg][Bb]/);
    if (simpleMatch) {
        return `${simpleMatch[1]}GB`;
    }
    
    return '';
}

function extractColor(text) {
    const colorKeywords = ['黑', '白', '蓝', '红', '金', '银', '灰', '紫', '绿', '粉', '橙', '黄', '青', '褐'];
    
    for (const color of colorKeywords) {
        if (text.includes(color)) {
            const colorMatch = text.match(new RegExp(`[\\u4e00-\\u9fa5]*${color}[\\u4e00-\\u9fa5]*`));
            if (colorMatch) {
                return colorMatch[0];
            }
        }
    }
    
    return '';
}

function extractOtherParams(text) {
    const specialKeywords = ['典藏版', '限定版', '特别版', '尊享版', '设计师', '联名', '定制', '非凡大师', '保时捷'];
    
    for (const keyword of specialKeywords) {
        if (text.includes(keyword)) {
            return keyword;
        }
    }
    
    return '';
}

module.exports = {
    parseProductList,
    parseProductDetail,
    extractVersion,
    extractColor,
    extractOtherParams
};
