const { BRANDS } = require('../src/collector');
const { getStorage } = require('../src/storage');

module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    try {
        const storage = getStorage();
        const files = await storage.listFiles();
        
        const stats = {
            totalFiles: files.length,
            totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
            lastCollect: files.length > 0 ? files[0].created : null,
            brands: BRANDS.map(b => ({ name: b.name, id: b.id }))
        };
        
        res.status(200).json({ success: true, stats });
    } catch (error) {
        res.status(200).json({ success: false, error: error.message });
    }
};
