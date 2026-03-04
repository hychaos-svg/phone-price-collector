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
        res.status(200).json({ success: true, files });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
