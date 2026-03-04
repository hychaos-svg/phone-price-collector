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

function parseReleaseDate(dateText) {
    if (!dateText) return null;
    
    const fullMatch = dateText.match(/(\d{4})年[,，]?\s*(\d{1,2})月[,，]?\s*(\d{1,2})/);
    if (fullMatch) {
        const year = fullMatch[1];
        const month = fullMatch[2].padStart(2, '0');
        const day = fullMatch[3].padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    const yearMatch = dateText.match(/(\d{4})年/);
    if (yearMatch) {
        return `${yearMatch[1]}-01-01`;
    }
    
    return null;
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
        variants: [],
        modelPrices: [],
        skus: []
    };

    $('.b-tb table').first().find('tr').each((i, tr) => {
        const $tr = $(tr);
        const $tds = $tr.find('td');
        
        if ($tds.length >= 3) {
            const model = $($tds[0]).text().trim();
            const priceText = $($tds[2]).text().trim();
            const priceMatch = priceText.match(/￥(\d+)/);
            
            if (model && priceMatch) {
                result.modelPrices.push({
                    model: model,
                    price: parseInt(priceMatch[1])
                });
            }
        }
    });

    $('.product-version .item').each((i, el) => {
        const $item = $(el);
        const name = $item.text().trim();
        const skuid = $item.attr('data-skuid');
        
        if (name && skuid) {
            result.skus.push({
                name: name,
                skuid: skuid
            });
        }
    });

    return result;
}

function parseProductPrice(html, basicInfo, skus) {
    const $ = cheerio.load(html);
    const result = {
        brand: basicInfo.brand,
        model: basicInfo.model,
        skuPrices: []
    };

    const priceElements = [];
    $('[class*="price"]').each((i, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const priceMatch = text.match(/￥(\d{3,5})/);
        if (priceMatch) {
            priceElements.push({
                price: parseInt(priceMatch[1]),
                context: $el.parent().text().trim().substring(0, 100)
            });
        }
    });

    if (skus.length > 0 && priceElements.length > 0) {
        for (let i = 0; i < skus.length; i++) {
            const sku = skus[i];
            const priceIndex = Math.min(i, priceElements.length - 1);
            const price = priceElements[priceIndex]?.price;
            
            if (price) {
                result.skuPrices.push({
                    name: sku.name,
                    skuid: sku.skuid,
                    price: price
                });
            }
        }
    }

    return result;
}

function parseProductParams(html, basicInfo) {
    const $ = cheerio.load(html);
    const result = {
        brand: basicInfo.brand,
        model: basicInfo.model,
        series: '',
        releaseDate: '',
        ramOptions: [],
        storageOptions: [],
        colors: [],
        msrp: basicInfo.msrp
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
        result.releaseDate = parseReleaseDate(params['发布时间']) || '';
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

    return result;
}

function generateVariants(skuPrice, params) {
    const variants = [];
    
    const version = skuPrice.name || '';
    const price = skuPrice.price;
    
    if (params.colors.length > 0) {
        for (const color of params.colors) {
            variants.push({
                brand: params.brand,
                series: params.series,
                model: params.model,
                releaseDate: params.releaseDate,
                version: version,
                color: color,
                msrp: price,
                otherParams: '',
                dataSource: 'pconline',
                collectTime: new Date().toISOString().split('T')[0]
            });
        }
    } else {
        variants.push({
            brand: params.brand,
            series: params.series,
            model: params.model,
            releaseDate: params.releaseDate,
            version: version,
            color: '',
            msrp: price,
            otherParams: '',
            dataSource: 'pconline',
            collectTime: new Date().toISOString().split('T')[0]
        });
    }
    
    return variants;
}

module.exports = {
    parseProductList,
    parseProductDetail,
    parseProductParams,
    parseProductPrice,
    parseReleaseDate,
    generateVariants
};
