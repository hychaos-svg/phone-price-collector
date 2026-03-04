const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data/msrp');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function getExportFilename() {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    return `phone_msrp_${dateStr}_${timeStr}.xlsx`;
}

async function exportMsrpToExcel(products) {
    ensureDataDir();
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('厂商指导价');

    worksheet.columns = [
        { header: '品牌', key: 'brand', width: 10 },
        { header: '系列', key: 'series', width: 20 },
        { header: '型号', key: 'model', width: 30 },
        { header: '上市时间', key: 'releaseDate', width: 12 },
        { header: '版本', key: 'version', width: 18 },
        { header: '颜色', key: 'color', width: 12 },
        { header: '厂商指导价(元)', key: 'msrp', width: 15 },
        { header: '其他参数', key: 'otherParams', width: 15 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    products.forEach((product, index) => {
        const row = worksheet.addRow({
            brand: product.brand,
            series: product.series,
            model: product.model,
            releaseDate: product.releaseDate,
            version: product.version,
            color: product.color,
            msrp: product.msrp,
            otherParams: product.otherParams
        });

        row.alignment = { vertical: 'middle' };

        if (product.msrp === null || product.msrp === undefined) {
            row.getCell('msrp').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFCCCC' }
            };
        }
    });

    worksheet.eachRow((row, rowNum) => {
        if (rowNum > 1) {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
                };
            });
        }
    });

    const filename = getExportFilename();
    const filepath = path.join(DATA_DIR, filename);
    
    await workbook.xlsx.writeFile(filepath);
    
    return filepath;
}

function generateSummary(products) {
    const summary = {
        total: products.length,
        withPrice: products.filter(p => p.msrp !== null).length,
        withoutPrice: products.filter(p => p.msrp === null).length,
        byBrand: {},
        byYear: {}
    };

    products.forEach(p => {
        if (!summary.byBrand[p.brand]) {
            summary.byBrand[p.brand] = 0;
        }
        summary.byBrand[p.brand]++;

        if (p.releaseDate) {
            const year = p.releaseDate.split('-')[0];
            if (!summary.byYear[year]) {
                summary.byYear[year] = 0;
            }
            summary.byYear[year]++;
        }
    });

    return summary;
}

module.exports = {
    exportMsrpToExcel,
    generateSummary,
    DATA_DIR
};
