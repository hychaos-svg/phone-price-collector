const { getStorage } = require('../src/storage');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
    
    let filename = req.query.filename;
    
    if (!filename) {
        const urlPath = req.url || '';
        const match = urlPath.match(/\/api\/download\/(.+?)(?:\?|$)/);
        if (match) {
            filename = decodeURIComponent(match[1]);
        }
    }
    
    if (!filename) {
        return res.status(400).json({ success: false, error: 'Filename required' });
    }
    
    try {
        const storage = getStorage();
        const buffer = await storage.getFile(filename);
        
        if (!buffer) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
