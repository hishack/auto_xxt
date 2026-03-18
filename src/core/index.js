/**
 * 超星学习通助手 - 核心模块
 * 包含日志、性能监控、缓存管理等核心功能
 */

// ============================================
// 系统配置
// ============================================
const systemConfig = {
    apiBaseUrl: 'https://api.116611.xyz',
    deepseekApiKey: '',
    deepseekModel: 'deepseek-chat',
    defaultSpeed: 1.5,
    autoSubmit: true,
    debugMode: false
};

// ============================================
// 日志类
// ============================================
class Logger {
    constructor(prefix = 'Logger') {
        this.prefix = prefix;
        this.enabled = true;
    }

    log(...args) {
        if (this.enabled) {
            console.log(`[${this.prefix}]`, ...args);
        }
    }

    error(...args) {
        console.error(`[${this.prefix}]`, ...args);
    }

    warn(...args) {
        console.warn(`[${this.prefix}]`, ...args);
    }

    info(...args) {
        console.info(`[${this.prefix}]`, ...args);
    }

    debug(...args) {
        if (systemConfig.debugMode) {
            console.debug(`[${this.prefix}]`, ...args);
        }
    }
}

const logger = new Logger('CXHelper');

// ============================================
// 浏览器检测
// ============================================
const browserCheck = {
    isChrome: () => /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
    isFirefox: () => /Firefox/.test(navigator.userAgent),
    isSafari: (): /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor),
    isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(navigator.userAgent)
};

// ============================================
// 性能监控类
// ============================================
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.startTimes = {};
    }

    start(label) {
        this.startTimes[label] = performance.now();
    }

    end(label) {
        if (this.startTimes[label]) {
            const duration = performance.now() - this.startTimes[label];
            this.metrics[label] = duration;
            delete this.startTimes[label];
            return duration;
        }
        return 0;
    }

    getMetric(label) {
        return this.metrics[label];
    }

    getAllMetrics() {
        return { ...this.metrics };
    }

    clear() {
        this.metrics = {};
        this.startTimes = {};
    }
}

const perfMonitor = new PerformanceMonitor();

// ============================================
// 缓存管理类
// ============================================
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.expiry = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5分钟
    }

    set(key, value, ttl = this.defaultTTL) {
        this.cache.set(key, value);
        this.expiry.set(key, Date.now() + ttl);
    }

    get(key) {
        if (this.has(key)) {
            return this.cache.get(key);
        }
        return null;
    }

    has(key) {
        if (!this.cache.has(key)) return false;
        if (this.expiry.has(key) && Date.now() > this.expiry.get(key)) {
            this.delete(key);
            return false;
        }
        return true;
    }

    delete(key) {
        this.cache.delete(key);
        this.expiry.delete(key);
    }

    clear() {
        this.cache.clear();
        this.expiry.clear();
    }

    // 加密相关工具函数
    _b64ToBytes(b64) {
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    _bytesToStr(arr) {
        let s = '';
        for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
        return s;
    }

    _strToBytes(s) {
        const out = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
        return out;
    }

    _xor(a, b) {
        const out = new Uint8Array(a.length);
        for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i % b.length];
        return out;
    }

    __getDSK() {
        // DSK获取逻辑
    }
}

const cacheManager = new CacheManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        systemConfig,
        Logger,
        logger,
        browserCheck,
        PerformanceMonitor,
        perfMonitor,
        CacheManager,
        cacheManager
    };
}
