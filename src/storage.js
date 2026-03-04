const fs = require('fs');
const path = require('path');

class StorageInterface {
    async saveFile(filename, buffer) {
        throw new Error('saveFile method must be implemented');
    }

    async getFile(filename) {
        throw new Error('getFile method must be implemented');
    }

    async listFiles() {
        throw new Error('listFiles method must be implemented');
    }

    async deleteFile(filename) {
        throw new Error('deleteFile method must be implemented');
    }
}

class LocalStorage extends StorageInterface {
    constructor(dataDir = null) {
        super();
        if (dataDir) {
            this.dataDir = path.resolve(dataDir);
        } else if (process.env.VERCEL) {
            this.dataDir = '/tmp/data';
        } else {
            this.dataDir = path.resolve('./data');
        }
        this._ensureDataDir();
    }

    _ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    _getFilePath(filename) {
        return path.join(this.dataDir, filename);
    }

    async saveFile(filename, buffer) {
        const filePath = this._getFilePath(filename);
        await fs.promises.writeFile(filePath, buffer);
        return filePath;
    }

    async getFile(filename) {
        const filePath = this._getFilePath(filename);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        return fs.promises.readFile(filePath);
    }

    async listFiles() {
        if (!fs.existsSync(this.dataDir)) {
            return [];
        }
        const files = await fs.promises.readdir(this.dataDir);
        const fileInfos = [];
        for (const file of files) {
            const filePath = this._getFilePath(file);
            const stats = await fs.promises.stat(filePath);
            if (stats.isFile()) {
                fileInfos.push({
                    name: file,
                    size: stats.size,
                    created: stats.birthtime,
                    stored: stats.birthtime
                });
            }
        }
        return fileInfos.sort((a, b) => b.created - a.created);
    }

    async deleteFile(filename) {
        const filePath = this._getFilePath(filename);
        if (!fs.existsSync(filePath)) {
            return false;
        }
        await fs.promises.unlink(filePath);
        return true;
    }
}

class VercelBlobStorage extends StorageInterface {
    constructor() {
        super();
        this.put = null;
        this.list = null;
        this.del = null;
        this.head = null;
        this.initialized = false;
    }

    async _init() {
        if (this.initialized) return;
        try {
            const blob = await import('@vercel/blob');
            this.put = blob.put;
            this.list = blob.list;
            this.del = blob.del;
            this.head = blob.head;
            this.initialized = true;
        } catch (error) {
            console.error('Vercel Blob not available:', error.message);
            throw new Error('Vercel Blob storage requires @vercel/blob package and BLOB_READ_WRITE_TOKEN');
        }
    }

    async saveFile(filename, buffer) {
        await this._init();
        const result = await this.put(filename, buffer, {
            access: 'public',
            addRandomSuffix: false
        });
        return result.url;
    }

    async getFile(filename) {
        await this._init();
        try {
            const blobInfo = await this.head(filename);
            if (!blobInfo) return null;
            
            const response = await fetch(blobInfo.url);
            return Buffer.from(await response.arrayBuffer());
        } catch (error) {
            return null;
        }
    }

    async listFiles() {
        await this._init();
        const result = await this.list();
        return result.blobs.map(blob => ({
            name: blob.pathname,
            size: blob.size,
            created: new Date(blob.uploadedAt),
            stored: new Date(blob.uploadedAt),
            url: blob.url
        })).sort((a, b) => b.created - a.created);
    }

    async deleteFile(filename) {
        await this._init();
        await this.del(filename);
        return true;
    }
}

function getStorage() {
    const storageType = process.env.STORAGE_TYPE;
    
    if (storageType === 'vercel-blob') {
        return new VercelBlobStorage();
    }
    
    return new LocalStorage();
}

module.exports = {
    getStorage,
    LocalStorage,
    VercelBlobStorage,
    StorageInterface
};
