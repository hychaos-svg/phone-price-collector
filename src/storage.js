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
    constructor(dataDir = './data') {
        super();
        this.dataDir = path.resolve(dataDir);
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
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime
                });
            }
        }
        return fileInfos;
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

function getStorage() {
    const storageType = process.env.STORAGE_TYPE || 'local';
    
    switch (storageType) {
        case 'local':
            return new LocalStorage();
        case 'oss':
            throw new Error('OSS storage adapter not implemented yet');
        default:
            throw new Error(`Unknown storage type: ${storageType}`);
    }
}

module.exports = {
    getStorage,
    LocalStorage,
    StorageInterface
};
