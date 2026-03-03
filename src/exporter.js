const ExcelJS = require('exceljs');

function getDataDate(products) {
    const dates = [...new Set(products.map(p => p.date).filter(d => d))];
    if (dates.length > 0) {
        return dates.sort()[dates.length - 1];
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function exportToExcel(products, qualityReport) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('价格数据');

    worksheet.columns = [
        { header: '品牌', key: 'brand', width: 10 },
        { header: '系列', key: 'series', width: 25 },
        { header: '型号', key: 'model', width: 35 },
        { header: '版本', key: 'version', width: 10 },
        { header: '颜色', key: 'color', width: 15 },
        { header: '价格(元)', key: 'price', width: 12 },
        { header: '日期', key: 'date', width: 12 },
        { header: '状态', key: 'status', width: 10 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const correctedMap = new Map();
    const abnormalMap = new Map();

    if (qualityReport) {
        if (qualityReport.corrected && Array.isArray(qualityReport.corrected)) {
            qualityReport.corrected.forEach(item => {
                const key = `${item.brand}|${item.model}|${item.color}|${item.date}`;
                correctedMap.set(key, item);
            });
        }
        if (qualityReport.abnormal && Array.isArray(qualityReport.abnormal)) {
            qualityReport.abnormal.forEach(item => {
                const key = `${item.brand}|${item.model}|${item.color}|${item.date}`;
                abnormalMap.set(key, item);
            });
        }
    }

    products.forEach((product, index) => {
        const key = `${product.brand}|${product.model}|${product.color}|${product.date}`;
        const rowIndex = index + 2;
        const row = worksheet.addRow({
            brand: product.brand,
            series: product.series,
            model: product.model,
            version: product.version,
            color: product.color,
            price: product.price,
            date: product.date,
            status: product.status || ''
        });

        if (abnormalMap.has(key)) {
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFF0000' }
                };
            });
            row.getCell(8).value = '异常';
        } else if (correctedMap.has(key)) {
            const correctedItem = correctedMap.get(key);
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFF00' }
                };
            });
            row.getCell(8).value = '已修正';

            if (correctedItem.originalPrice !== undefined) {
                const priceCell = row.getCell(6);
                priceCell.note = {
                    texts: [{ text: `原始价格: ${correctedItem.originalPrice} 元` }],
                    margins: {
                        insetmode: 'auto',
                        inset: [0.13, 0.13, 0.13, 0.13]
                    }
                };
            }
        } else {
            row.eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFFFF' }
                };
            });
        }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

module.exports = {
    exportToExcel,
    getDataDate
};
