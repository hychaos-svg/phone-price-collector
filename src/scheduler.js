const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'schedule.json');
const HISTORY_PATH = path.join(__dirname, '..', 'data', 'history.json');

const DEFAULT_CONFIG = {
    enabled: false,
    timeWindow: {
        start: '20:00',
        end: '24:00'
    },
    frequency: {
        type: 'daily',
        days: []
    },
    lastRun: null,
    nextRun: null
};

let scheduledTask = null;
let onCollectCallback = null;

function ensureDataDir() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

function loadConfig() {
    ensureDataDir();
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
        }
    } catch (error) {
        console.error('加载配置失败:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    ensureDataDir();
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function loadHistory() {
    ensureDataDir();
    try {
        if (fs.existsSync(HISTORY_PATH)) {
            const data = fs.readFileSync(HISTORY_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载历史失败:', error.message);
    }
    return [];
}

function saveHistory(history) {
    ensureDataDir();
    const recentHistory = history.slice(-100);
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(recentHistory, null, 2));
}

function addHistoryEntry(entry) {
    const history = loadHistory();
    history.push({
        timestamp: new Date().toISOString(),
        ...entry
    });
    saveHistory(history);
    return history;
}

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
}

function getNextRunTime(config) {
    const now = new Date();
    const { start, end } = config.timeWindow;
    const { type, days } = config.frequency;
    
    const startTime = parseTime(start);
    const endTime = parseTime(end);
    
    const windowMinutes = (endTime.hours - startTime.hours) * 60 + (endTime.minutes - startTime.minutes);
    const randomMinutes = Math.floor(Math.random() * windowMinutes);
    const randomSeconds = Math.floor(Math.random() * 60);
    
    let nextRun = new Date();
    nextRun.setHours(startTime.hours, startTime.minutes + randomMinutes, randomSeconds, 0);
    
    if (type === 'daily') {
        if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
        }
    } else if (type === 'weekly' && days.length > 0) {
        const currentDay = now.getDay();
        const targetDays = days.map(d => d === 7 ? 0 : d).sort((a, b) => a - b);
        
        let foundDay = targetDays.find(d => d > currentDay || (d === currentDay && nextRun > now));
        if (foundDay === undefined) {
            foundDay = targetDays[0];
            nextRun.setDate(nextRun.getDate() + (7 - currentDay + foundDay));
        } else {
            nextRun.setDate(nextRun.getDate() + (foundDay - currentDay));
        }
    } else if (type === 'monthly' && days.length > 0) {
        const currentDay = now.getDate();
        const targetDays = days.sort((a, b) => a - b);
        
        let foundDay = targetDays.find(d => d > currentDay || (d === currentDay && nextRun > now));
        if (foundDay === undefined) {
            foundDay = targetDays[0];
            nextRun.setMonth(nextRun.getMonth() + 1);
            nextRun.setDate(foundDay);
        } else {
            nextRun.setDate(foundDay);
        }
    }
    
    return nextRun;
}

function getCronExpression(config) {
    const { start } = config.timeWindow;
    const { hours, minutes } = parseTime(start);
    
    const { type, days } = config.frequency;
    
    if (type === 'daily') {
        return `${minutes} ${hours} * * *`;
    } else if (type === 'weekly' && days.length > 0) {
        const dayOfWeek = days.map(d => d === 7 ? 0 : d).join(',');
        return `${minutes} ${hours} * * ${dayOfWeek}`;
    } else if (type === 'monthly' && days.length > 0) {
        const dayOfMonth = days.join(',');
        return `${minutes} ${hours} ${dayOfMonth} * *`;
    }
    
    return `${minutes} ${hours} * * *`;
}

async function executeCollect() {
    console.log('\n========================================');
    console.log(`开始执行自动采集: ${new Date().toLocaleString('zh-CN')}`);
    console.log('========================================\n');
    
    const config = loadConfig();
    
    try {
        if (onCollectCallback) {
            const result = await onCollectCallback();
            
            config.lastRun = new Date().toISOString();
            config.nextRun = getNextRunTime(config).toISOString();
            saveConfig(config);
            
            addHistoryEntry({
                status: 'success',
                records: result.stats?.valid || 0,
                filename: result.filename
            });
            
            console.log('自动采集完成!');
        }
    } catch (error) {
        console.error('自动采集失败:', error.message);
        
        addHistoryEntry({
            status: 'failed',
            error: error.message
        });
    }
}

function startScheduler(collectCallback) {
    onCollectCallback = collectCallback;
    
    const config = loadConfig();
    
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
    }
    
    if (!config.enabled) {
        console.log('自动采集未启用');
        return;
    }
    
    const cronExpression = getCronExpression(config);
    
    console.log('启动定时任务:', cronExpression);
    
    scheduledTask = cron.schedule(cronExpression, executeCollect, {
        timezone: 'Asia/Shanghai'
    });
    
    config.nextRun = getNextRunTime(config).toISOString();
    saveConfig(config);
    
    console.log(`下次执行时间: ${new Date(config.nextRun).toLocaleString('zh-CN')}`);
}

function stopScheduler() {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
    }
    
    const config = loadConfig();
    config.enabled = false;
    saveConfig(config);
    
    console.log('定时任务已停止');
}

function updateSchedule(newConfig) {
    const config = loadConfig();
    
    Object.assign(config, newConfig);
    
    if (config.enabled) {
        config.nextRun = getNextRunTime(config).toISOString();
    } else {
        config.nextRun = null;
    }
    
    saveConfig(config);
    
    if (config.enabled) {
        startScheduler(onCollectCallback);
    } else {
        stopScheduler();
    }
    
    return config;
}

function getStatus() {
    const config = loadConfig();
    const history = loadHistory();
    
    return {
        config,
        history: history.slice(-10),
        isRunning: scheduledTask !== null
    };
}

module.exports = {
    startScheduler,
    stopScheduler,
    updateSchedule,
    getStatus,
    loadConfig,
    saveConfig,
    loadHistory,
    addHistoryEntry
};
