// ==UserScript==
// @name         学习通自动刷课刷题（DeepSeek版）
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  使用 DeepSeek API 自动答题，支持自动刷课、自动答题、题目提取复制、字体解密。需要自行配置 DeepSeek API 密钥。
// @author       kail (Modified)
// @match        *://*.chaoxing.com/*
// @match        *://*.edu.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.deepseek.com
// @require      https://scriptcat.org/lib/668/1.0/TyprMd5.js
// @resource     Table https://www.forestpolice.org/ttf/2.0/table.json
// @license      MIT

// ==/UserScript==




const systemConfig = {
  buildTime: new Date().toISOString(),
  environment: 'production'
};
class Logger {
  constructor(prefix) {
    this.prefix = prefix || 'System';
    this.levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
  }

  log(level, message) {
    if (this.levels.includes(level)) {
      const timestamp = new Date().toISOString();
    }
  }

  debug(msg) { this.log('DEBUG', msg); }
  info(msg) { this.log('INFO', msg); }
  warn(msg) { this.log('WARN', msg); }
  error(msg) { this.log('ERROR', msg); }
}


const logger = new Logger('CXHelper');

const browserCheck = {
  isChrome: () => /Chrome/.test(navigator.userAgent),
  isFirefox: () => /Firefox/.test(navigator.userAgent),
  isEdge: () => /Edge/.test(navigator.userAgent),
  isSafari: () => /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
};


class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  start(name) {
    this.startTimes.set(name, performance.now());
  }

  end(name) {
    const startTime = this.startTimes.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.set(name, duration);
      this.startTimes.delete(name);
      return duration;
    }
    return 0;
  }

  getMetric(name) {
    return this.metrics.get(name) || 0;
  }
}


const perfMonitor = new PerformanceMonitor();


const utils = {

  generateId: (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },


  deepClone: (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => utils.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = utils.deepClone(obj[key]);
      });
      return cloned;
    }
  },


  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },


  throttle: (func, limit) => {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
};

class CacheManager {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  set(key, value, ttl = 300000) { // 默认5分钟过期
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const item = {
      value: value,
      expiry: Date.now() + ttl
    };
    this.cache.set(key, item);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

const cacheManager = new CacheManager();


logger.info('System initialization completed');

(function () {
  'use strict';

  // ================= DeepSeek API 配置 =================
  const DEEPSEEK_API_KEY_STORAGE = 'cx_deepseek_api_key';
  const DEEPSEEK_API_BASE = 'https://api.deepseek.com';
  const DEEPSEEK_MODEL = 'deepseek-chat';

  // 获取用户配置的 API Key
  function getDeepSeekApiKey() {
    try {
      return GM_getValue(DEEPSEEK_API_KEY_STORAGE, '');
    } catch {
      return localStorage.getItem(DEEPSEEK_API_KEY_STORAGE) || '';
    }
  }

  // 保存 API Key
  function saveDeepSeekApiKey(key) {
    try {
      GM_setValue(DEEPSEEK_API_KEY_STORAGE, key);
      localStorage.setItem(DEEPSEEK_API_KEY_STORAGE, key);
      return true;
    } catch (e) {
      console.error('保存 API Key 失败:', e);
      return false;
    }
  }

  // DeepSeek API 调用
  function deepseekChat(messages, options = {}) {
    return new Promise((resolve, reject) => {
      const apiKey = getDeepSeekApiKey();
      if (!apiKey) {
        reject(new Error('请先配置 DeepSeek API Key'));
        return;
      }

      // 打印 API 请求信息
      console.log('═══════════════════════════════════════════');
      console.log('🔵 DeepSeek API 请求信息:');
      console.log('   API URL:', `${DEEPSEEK_API_BASE}/v1/chat/completions`);
      console.log('   Model:', DEEPSEEK_MODEL);
      console.log('   Messages:', messages.length);
      console.log('   Options:', JSON.stringify(options));
      console.log('   API Key:', apiKey.substring(0, 10) + '...');
      console.log('═══════════════════════════════════════════');

      try {
        GM_xmlhttpRequest({
          method: 'POST',
          url: `${DEEPSEEK_API_BASE}/v1/chat/completions`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          data: JSON.stringify({ model: DEEPSEEK_MODEL, messages, ...options }),
          timeout: 60000,
          onload: (r) => {
            console.log('═══════════════════════════════════════════');
            console.log('🟢 DeepSeek API 响应:');
            console.log('   Status:', r.status);
            console.log('   Status Text:', r.statusText);
            console.log('   Response:', r.responseText.substring(0, 500) + '...');
            console.log('═══════════════════════════════════════════');

            if (r.status >= 200 && r.status < 300) {
              try { resolve(JSON.parse(r.responseText)); } catch (e) { reject(e); }
            } else {
              reject(new Error(`HTTP ${r.status}: ${String(r.responseText || '').slice(0, 200)}`));
            }
          },
          onerror: () => reject(new Error('Network error')),
          ontimeout: () => reject(new Error('Timeout'))
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  let isAnswering = false;
  let isStudyingChapters = false;
  let studyIntervalId = null;
  const STUDY_PERSIST_KEY = 'cx_helper_study_on_v2';

  const PANEL_REG_KEY = 'cx_helper_active_panel_v2';
  const PANEL_INSTANCE_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const FRAME_DEPTH = (() => { let d = 0; try { let w = window; while (w !== w.top) { d++; w = w.parent; } } catch { d = 999; } return d; })();
  let isActiveOwner = false;
  let createdPanelEl = null;
  const HEARTBEAT_INTERVAL_MS = 2000;
  const STALE_MS = 7000;
  let heartbeatTimerId = null;
  let lastAutoSkipTs = 0;
  let emptyChecksCount = 0;
  let lastEmptySectionKey = '';
  let recoveryTimerId = null;

  // ================= 字体解密功能（来自 jm.user.js）=================
  let fontHashParams = null;
  let currentFontData = null;
  let fontLoaded = false;

  // 初始化解密表
  function initDecryption() {
    try {
      const tableText = GM_getResourceText('Table');
      if (tableText) {
        fontHashParams = JSON.parse(tableText);
        console.log('ChaoxingExtractor: 字体映射表加载成功, 条目数:', Object.keys(fontHashParams).length);
      } else {
        console.warn('ChaoxingExtractor: 字体映射表为空');
      }
    } catch (e) {
      console.error('ChaoxingExtractor: 加载字体映射表失败', e);
    }
  }

  // 解析当前页面的加密字体
  function parsePageFont() {
    const styles = document.getElementsByTagName('style');
    let fontBase64 = null;

    for (let style of styles) {
      const content = style.textContent;
      if (content.includes('font-cxsecret') && content.includes('base64,')) {
        const match = content.match(/base64,([\w\W]+?)'/);
        if (match && match[1]) {
          fontBase64 = match[1];
          break;
        }
      }
    }

    if (fontBase64) {
      try {
        const binary_string = window.atob(fontBase64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary_string.charCodeAt(i);
        }
        const font = Typr.parse(bytes)[0];
        currentFontData = font;
        fontLoaded = true;
        console.log('ChaoxingExtractor: 页面加密字体解析成功');
      } catch (e) {
        console.error('ChaoxingExtractor: 解析字体出错', e);
        fontLoaded = false;
      }
    } else {
      fontLoaded = false;
    }
  }

  // 获取MD5函数
  function getMd5Fn() {
    if (typeof md5 === 'function') return md5;
    if (typeof Typr !== 'undefined' && typeof Typr.md5 === 'function') return Typr.md5;
    if (window.md5) return window.md5;
    return null;
  }

  // 解密文本
  function decryptText(text) {
    if (!text) return "";
    if (!fontHashParams || !currentFontData) return text;

    const md5Fn = getMd5Fn();
    if (!md5Fn) {
      console.warn('ChaoxingExtractor: 未找到MD5函数，无法解密');
      return text;
    }

    let result = "";
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);
      const glyphIndex = Typr.U.codeToGlyph(currentFontData, code);

      if (glyphIndex > 0) {
        const path = Typr.U.glyphToPath(currentFontData, glyphIndex);
        if (path) {
          const pathStr = JSON.stringify(path);
          const hash = md5Fn(pathStr).slice(24);
          let match = fontHashParams[hash];

          if (match) {
            if (typeof match === 'number') {
              result += String.fromCharCode(match);
            } else {
              result += match;
            }
            continue;
          }
        }
      }
      result += char;
    }
    return result;
  }

  // ================= 移除付费功能，改为检查 API Key =================
  async function ensureAccessAllowed() {
    const apiKey = getDeepSeekApiKey();
    if (!apiKey) {
      showApiKeyConfigModal();
      throw new Error('请先配置 DeepSeek API Key');
    }
    return true;
  }

  // 显示 API Key 配置弹窗
  function showApiKeyConfigModal() {
    const mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999998;backdrop-filter:blur(4px);';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:50%;top:120px;transform:translateX(-50%);width:480px;background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden;z-index:999999;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Arial;';

    const currentKey = getDeepSeekApiKey();
    box.innerHTML = `
      <div style="padding:18px 24px;border-bottom:1px solid #f3f4f6;font-weight:700;font-size:16px;color:#111827;">配置 DeepSeek API Key</div>
      <div style="padding:24px;">
        <div style="margin-bottom:16px;font-size:14px;color:#4b5563;line-height:1.5;">
          请输入您的 DeepSeek API Key 以使用自动答题功能。<br>
          <a href="https://platform.deepseek.com/api_keys" target="_blank" style="color:#6366f1;text-decoration:none;">点击这里获取 API Key →</a>
        </div>
        <input type="text" id="cx_api_key_input" placeholder="sk-..." value="${currentKey}"
          style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;font-family:monospace;margin-bottom:12px;">
        <div style="font-size:12px;color:#9ca3af;line-height:1.5;">
          💡 API Key 将安全保存在本地，不会上传到任何服务器
        </div>
      </div>
      <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:right;display:flex;justify-content:flex-end;gap:12px;">
        <button id="cx_cancel_api" style="padding:10px 20px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#4b5563;cursor:pointer;font-size:14px;font-weight:600;">取消</button>
        <button id="cx_save_api" style="padding:10px 24px;border-radius:10px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">保存</button>
      </div>
    `;

    document.body.appendChild(mask);
    document.body.appendChild(box);

    const input = box.querySelector('#cx_api_key_input');
    const btnSave = box.querySelector('#cx_save_api');
    const btnCancel = box.querySelector('#cx_cancel_api');

    function close() { try { box.remove(); mask.remove(); } catch { } }

    btnCancel.onclick = close;
    btnSave.onclick = () => {
      const key = input.value.trim();
      if (!key) {
        alert('请输入有效的 API Key');
        return;
      }
      if (saveDeepSeekApiKey(key)) {
        alert('API Key 保存成功！');
        close();
      } else {
        alert('保存失败，请重试');
      }
    };
    mask.onclick = close;
  }

  function showFeedbackModal() {
    const mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999998;backdrop-filter:blur(4px);';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:50%;top:120px;transform:translateX(-50%);width:400px;background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);overflow:hidden;z-index:999999;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Arial;';
    box.innerHTML = `
      <div style="padding:18px 24px;border-bottom:1px solid #f3f4f6;font-weight:700;font-size:16px;color:#111827;">关于脚本</div>
      <div style="padding:24px;text-align:center;">
        <div style="margin-bottom:20px;font-size:14px;color:#4b5563;line-height:1.6;">
          学习通自动刷课刷题（DeepSeek版）<br>
          使用 DeepSeek API 进行智能答题<br>
          支持题目提取、字体解密、自动答题
        </div>
        <div style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:16px;margin:16px 0;">
          <div style="font-size:13px;color:#6b7280;line-height:1.5;">
            本脚本完全免费开源<br>
            需要自行配置 DeepSeek API Key
          </div>
        </div>
      </div>
      <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:right;">
        <button id="feedback-close" style="padding:10px 24px;border-radius:10px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:14px;font-weight:600;">关闭</button>
      </div>
    `;
    document.body.appendChild(mask);
    document.body.appendChild(box);

    const closeBtn = box.querySelector('#feedback-close');
    function close() { try { box.remove(); mask.remove(); } catch { } }
    closeBtn.onclick = close;
    mask.onclick = close;
  }

  function getActivePanelRecord() {
    try { const raw = localStorage.getItem(PANEL_REG_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function setActivePanelRecord(rec) {
    try { localStorage.setItem(PANEL_REG_KEY, JSON.stringify(rec)); } catch { }
  }
  function clearActivePanelRecordIfOwner() {
    try {
      const cur = getActivePanelRecord();
      if (cur && cur.id === PANEL_INSTANCE_ID) {
        localStorage.removeItem(PANEL_REG_KEY);
      }
    } catch { }
  }
  function shouldWeOwn(current) {
    const nowTs = Date.now();
    if (!current) return { own: true, ts: nowTs };

    if (!current.aliveTs || nowTs - current.aliveTs > STALE_MS) return { own: true, ts: nowTs };

    try { if (current.url && current.url !== location.href) return { own: true, ts: nowTs }; } catch { }

    if (FRAME_DEPTH > (current.depth || 0)) return { own: true, ts: nowTs };
    if (FRAME_DEPTH === (current.depth || 0) && nowTs > (current.ts || 0)) return { own: true, ts: nowTs };
    return { own: false, ts: nowTs };
  }
  function claimOwnership() {
    const cur = getActivePanelRecord();
    const decision = shouldWeOwn(cur);
    if (decision.own) {
      setActivePanelRecord({ id: PANEL_INSTANCE_ID, depth: FRAME_DEPTH, ts: decision.ts, aliveTs: Date.now(), url: location.href });
      isActiveOwner = true;
    } else {
      isActiveOwner = false;
    }
    return isActiveOwner;
  }
  function startHeartbeat() {
    if (heartbeatTimerId) return;
    heartbeatTimerId = setInterval(() => {
      if (!isActiveOwner) return;
      const cur = getActivePanelRecord();

      if (!cur || cur.id !== PANEL_INSTANCE_ID) { stopHeartbeat(); return; }
      cur.aliveTs = Date.now();
      try { cur.url = location.href; } catch { }
      setActivePanelRecord(cur);
    }, HEARTBEAT_INTERVAL_MS);
  }
  function stopHeartbeat() { if (heartbeatTimerId) { clearInterval(heartbeatTimerId); heartbeatTimerId = null; } }
  const cleanupOwnership = () => {
    stopHeartbeat();
    clearActivePanelRecordIfOwner();
  };
  window.addEventListener('beforeunload', cleanupOwnership);
  window.addEventListener('pagehide', cleanupOwnership);

  function destroyPanelAndStop() {
    try {
      if (studyIntervalId) { clearInterval(studyIntervalId); studyIntervalId = null; }
      isStudyingChapters = false;
      isAnswering = false;
      stopHeartbeat();
      const panel = document.getElementById('answer-helper-panel');
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      createdPanelEl = null;
    } catch { }
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== PANEL_REG_KEY) return;
    const rec = getActivePanelRecord();
    if (!rec) return;
    if (rec.id === PANEL_INSTANCE_ID) {

      if (!createdPanelEl) {
        try { createdPanelEl = createPanel(); bindPanelEvents(); } catch { }
      }
      isActiveOwner = true;
      startHeartbeat();
    } else {

      isActiveOwner = false;
      destroyPanelAndStop();
    }
  });


  GM_addStyle(`
        /* Panel: Modern Light Theme */
        #answer-helper-panel {
            --ah-panel-height: 340px;
            position: fixed;
            top: 24px;
            left: 24px;
            width: 320px;
            min-width: 320px;
            max-width: 320px;
            height: var(--ah-panel-height) !important;
            min-height: var(--ah-panel-height) !important;
            max-height: var(--ah-panel-height) !important;
            background: #ffffff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 16px;
            padding: 0;
            z-index: 9999;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1f2937;
            user-select: none;
            overflow: hidden;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, height 0.3s ease;
        }

        /* Header */
        #answer-helper-header {
            cursor: move;
            height: 52px;
            padding: 0 18px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #ffffff;
            border-bottom: 1px solid #f3f4f6;
            font-size: 15px;
            color: #111827;
        }
        #answer-helper-header .title {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            color: #111827;
        }
        #answer-helper-header .title .accent {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        #answer-helper-header .right {
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }
        #answer-helper-header .collapse-btn {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: #f9fafb;
            border: 1px solid #f3f4f6;
            cursor: pointer;
            color: #6b7280;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }
        #answer-helper-header .collapse-btn:hover { background: #f3f4f6; color: #111827; border-color: #e5e7eb; transform: scale(1.05); }
        .collapse-btn-inner { width: 16px; height: 16px; position: relative; }
        .collapse-icon-bar.horizontal { width: 14px; height: 2px; background: currentColor; border-radius: 1px; position: absolute; left: 1px; top: 7px; }
        .collapse-icon-bar.vertical { width: 2px; height: 14px; background: currentColor; border-radius: 1px; position: absolute; left: 7px; top: 1px; }

        /* Content */
        #answer-helper-content { padding: 12px 16px; overflow-y: auto; height: calc(var(--ah-panel-height) - 52px); max-height: calc(var(--ah-panel-height) - 52px); }
        #answer-helper-panel.collapsed #answer-helper-content { display: none; }
        #answer-helper-panel.collapsed { width: 240px; min-width: 240px; max-width: 240px; height: 52px !important; min-height: 52px !important; border-radius: 12px; }

        /* Body: main on top, actions at bottom */
        #answer-helper-content .panel-body {
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            grid-template-areas:
                "main"
                "actions";
            gap: 12px;
            align-items: start;
        }
        .panel-main { min-width: 0; grid-area: main; }
        .panel-actions { grid-area: actions; }
        .panel-actions.panel-row { display: flex; flex-direction: column; gap: 10px; }
        .panel-actions.panel-row .primary-pair { display: flex; gap: 10px; width: 100%; }
        .panel-actions.panel-row .primary-pair .pair-slot { flex: 1; display: flex; }
        .panel-actions.panel-row .primary-pair .pair-slot .ah-btn { flex: 1; min-height: 44px; border-radius: 12px; }
        .panel-actions.panel-row .ah-btn { min-height: 40px; padding: 8px 12px; border-radius: 10px; }

        /* Toast */
        #no-task-toast {
            position: fixed;
            top: 24px;
            right: 24px;
            background: #ffffff;
            border: 1px solid rgba(0,0,0,0.05);
            color: #111827;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            animation: fadeInOut 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px) scale(0.95); }
            10% { opacity: 1; transform: translateY(0) scale(1); }
            90% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-20px) scale(0.95); }
        }

        /* Terminal Log */
        #answer-log {
            height: 140px;
            overflow-y: auto;
            border: 1px solid #f3f4f6;
            border-radius: 12px;
            padding: 10px;
            margin-bottom: 8px;
            font-size: 12px;
            line-height: 1.6;
            font-family: 'JetBrains Mono', 'Fira Code', 'Menlo', monospace;
            background: #f9fafb;
            color: #4b5563;
        }
        #answer-log::-webkit-scrollbar { width: 6px; }
        #answer-log::-webkit-scrollbar-track { background: transparent; }
        #answer-log::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        #answer-log::-webkit-scrollbar-thumb:hover { background: #d1d5db; }

        .log-item { margin: 4px 0; padding: 6px 10px; border-radius: 8px; background: #ffffff; border: 1px solid #f3f4f6; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .success { color: #059669; border-left: 3px solid #10b981; }
         .error { color: #dc2626; border-left: 3px solid #ef4444; }
         .info  { color: #374151; border-left: 3px solid #6b7280; }
         .debug { color: #6b7280; border-left: 3px solid #9ca3af; }

        /* Buttons */
        .ah-btn {
            flex: 1;
            padding: 8px 14px;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: #374151;
            background: #ffffff;
        }
        .ah-btn:hover { background: #f9fafb; border-color: #d1d5db; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .ah-btn:active { transform: translateY(0); box-shadow: none; }

        .ah-primary { background: #6366f1; color: #ffffff; border-color: #4f46e5; }
        .ah-primary:hover { background: #4f46e5; border-color: #4338ca; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }

        .ah-danger { background: #ffffff; color: #ef4444; border-color: #fee2e2; }
        .ah-danger:hover { background: #fef2f2; border-color: #fca5a5; }

        .ah-secondary { background: #f9fafb; color: #4b5563; border-color: #f3f4f6; }
        .ah-secondary:hover { background: #f3f4f6; border-color: #e5e7eb; }

        .ah-success { background: #10b981; color: #ffffff; border-color: #059669; }
        .ah-success:hover { background: #059669; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }

        /* Speed buttons */
        .speed-button { transition: all 0.2s ease; border-radius: 8px; }
        .speed-active { background: #6366f1 !important; color: #ffffff !important; border-color: #4f46e5 !important; }
        #playback-speed-controls.segmented { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }
        #playback-speed-controls.segmented .ah-btn { min-width: 60px; padding: 6px 8px; font-size: 12px; }
    `);

  //创建界面
  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'answer-helper-panel';
    panel.innerHTML = `
            <div id="answer-helper-header">
                <span class="title"><span class="accent"></span>学习通研习助手</span>
                <div class="right">
                    <button id="feedback-btn" class="ah-btn ah-secondary" style="min-width:32px; width:32px; height:32px; padding:0; border-radius:8px;">
                        <span class="button-icon" style="margin:0; font-size:14px;">💬</span>
                    </button>
                    <button class="collapse-btn" title="折叠/展开">
                      <span class="collapse-btn-inner">
                        <span class="collapse-icon-bar horizontal"></span>
                      </span>
                    </button>
                </div>
            </div>
            <div id="answer-helper-content">
                <div class="panel-body">
                    <div class="panel-main">
                        <div id="answer-log"></div>
                        <div id="playback-speed-controls" class="segmented" style="display:none;">
                            <button id="speed-1x" class="ah-btn ah-secondary speed-button speed-active"><span class="button-icon">1×</span></button>
                            <button id="speed-1.5x" class="ah-btn ah-secondary speed-button"><span class="button-icon">1.5×</span></button>
                            <button id="speed-2x" class="ah-btn ah-secondary speed-button"><span class="button-icon">2×</span></button>
                        </div>
                    </div>
                    <div class="panel-actions panel-row">
                        <div class="primary-pair">
                            <div class="pair-slot">
                                <button id="start-answer" class="ah-btn ah-primary">
                                    <span class="button-icon">▶</span>
                                    <span class="button-text">AI答题</span>
                                </button>
                                <button id="pause-answer" class="ah-btn ah-danger" style="display:none;">
                                    <span class="button-icon">⏸</span>
                                    <span class="button-text">暂停答题</span>
                                </button>
                            </div>
                            <div class="pair-slot">
                                <button id="random-answer" class="ah-btn ah-success">
                                    <span class="button-icon">🎲</span>
                                    <span class="button-text">随机答题</span>
                                </button>
                            </div>
                            <div class="pair-slot">
                                <button id="start-study" class="ah-btn ah-primary">
                                    <span class="button-icon">⏯</span>
                                    <span class="button-text">刷章节与测验</span>
                                </button>
                                <button id="pause-study" class="ah-btn ah-danger" style="display:none;">
                                    <span class="button-icon">■</span>
                                    <span class="button-text">暂停刷章节</span>
                                </button>
                            </div>
                        </div>
                        <button id="copy-questions-btn" class="ah-btn ah-success">
                            <span class="button-icon">📋</span>
                            <span class="button-text">复制题目</span>
                        </button>
                        <button id="config-api-btn" class="ah-btn ah-secondary">
                            <span class="button-icon">⚙️</span>
                            <span class="button-text">配置API Key</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(panel);
    try { panel.style.setProperty('--ah-panel-height', '340px'); } catch { }


    try {
      const rect = panel.getBoundingClientRect();
      const winW = window.innerWidth || document.documentElement.clientWidth;
      const winH = window.innerHeight || document.documentElement.clientHeight;
      const left = Math.max(12, Math.round((winW - rect.width) / 2));
      let isQuizPage = false;
      try {
        forEachAllSameOriginDocs((doc) => {
          if (isQuizPage) return;
          if (isQuizPageDoc(doc)) isQuizPage = true;
        });
      } catch { }
      const centerTop = Math.round((winH - rect.height) / 2);
      const offset = Math.round(winH * 0.1);
      const desiredTop = isQuizPage ? Math.round(winH * 0.08) : (centerTop - offset);
      const top = Math.max(12, Math.min(desiredTop, Math.max(12, winH - rect.height - 12)));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.right = 'auto';
    } catch { }


    let isDragging = false, offsetX = 0, offsetY = 0;
    const header = panel.querySelector('#answer-helper-header');
    header.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('collapse-btn')) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      panel.style.left = (e.clientX - offsetX) + 'px';
      panel.style.top = (e.clientY - offsetY) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', function () {
      isDragging = false;
      document.body.style.userSelect = '';
    });


    const collapseBtn = panel.querySelector('.collapse-btn');
    const collapseBtnInner = collapseBtn.querySelector('.collapse-btn-inner');
    collapseBtn.addEventListener('click', function () {
      panel.classList.toggle('collapsed');
      collapseBtnInner.innerHTML = '';
      if (panel.classList.contains('collapsed')) {

        const h = document.createElement('span');
        h.className = 'collapse-icon-bar horizontal';
        const v = document.createElement('span');
        v.className = 'collapse-icon-bar vertical';
        collapseBtnInner.appendChild(h);
        collapseBtnInner.appendChild(v);
      } else {

        const h = document.createElement('span');
        h.className = 'collapse-icon-bar horizontal';
        collapseBtnInner.appendChild(h);
      }
    });
    return panel;
  }

  function setPanelFixedHeight(px) {
    const panel = document.getElementById('answer-helper-panel');
    if (!panel) return;
    const val = Math.max(200, Math.round(px || 0)) + 'px';
    try { panel.style.setProperty('--ah-panel-height', val); } catch { }
    try {
      const rect = panel.getBoundingClientRect();
      const winH = window.innerHeight || document.documentElement.clientHeight;
      const maxTop = Math.max(12, winH - rect.height - 12);
      if (rect.top > maxTop) panel.style.top = maxTop + 'px';
    } catch { }
  }

  function bindPanelEvents() {
    // AI答题按钮
    document.getElementById('start-answer')?.addEventListener('click', () => {

      addLog('⚠️ 本助手仅供学习研究，请遵守课程与平台规则', 'info');
      addLog('🎯 点击了 AI答题 按钮，开始自动答题...', 'info');
      addLog('📍 当前页面: ' + window.location.href, 'debug');
      autoAnswer();
    });
    document.getElementById('pause-answer')?.addEventListener('click', () => {
      isAnswering = false;
      isRandomAnswering = false;
      addLog('⏸️ 用户点击暂停，自动答题即将停止...', 'info');
    });
    // 随机答题
    document.getElementById('random-answer')?.addEventListener('click', () => {
      addLog('⚠️ 本助手仅供学习研究，请遵守课程与平台规则', 'info');
      addLog('🎲 点击了 随机答题 按钮...', 'info');
      randomAnswer();
    });
    const startStudyBtn = document.getElementById('start-study');
    const pauseStudyBtn = document.getElementById('pause-study');
    if (startStudyBtn && pauseStudyBtn) {
      startStudyBtn.addEventListener('click', () => {
        addLog('本助手仅供学习研究，请遵守课程与平台规则。', 'info');
        startStudyChapters();
      });
      pauseStudyBtn.addEventListener('click', () => { stopStudyChapters(); });
    }

    // 题目复制功能
    document.getElementById('copy-questions-btn')?.addEventListener('click', () => {
      copyQuestionsToClipboard();
    });

    // API Key 配置
    document.getElementById('config-api-btn')?.addEventListener('click', () => {
      showApiKeyConfigModal();
    });

    document.getElementById('speed-1x')?.addEventListener('click', () => {
      setVideoPlaybackSpeed(1.0);
    });
    document.getElementById('speed-1.5x')?.addEventListener('click', () => {
      setVideoPlaybackSpeed(1.5);
    });
    document.getElementById('speed-2x')?.addEventListener('click', () => {
      setVideoPlaybackSpeed(2.0);
    });

    updateSpeedButtonsState();
    document.getElementById('feedback-btn')?.addEventListener('click', () => { showFeedbackModal(); });
  }

  // ================= 题目复制功能（来自 jm.user.js）=================
  function extractQuestionsContent() {
    parsePageFont(); // 刷新字体解析

    const questions = document.querySelectorAll('.TiMu');
    if (questions.length === 0) {
      addLog('未找到题目，请确保在测验页面内', 'error');
      return null;
    }

    let resultText = "";
    questions.forEach((q, index) => {
      // 提取题目标题
      let titleDiv = q.querySelector('.Zy_TItle .clearfix') ||
        q.querySelector('.Zy_TItle') ||
        q.querySelector('.newZy_TItle') ||
        q.querySelector('.fontLabel');

      let titleText = titleDiv ? titleDiv.innerText.replace(/\s+/g, ' ').trim() : "未找到题目";
      titleText = decryptText(titleText); // 解密

      resultText += `【${index + 1}】 ${titleText}\n`;

      // 提取选项
      const options = q.querySelectorAll('ul li');
      if (options.length > 0) {
        options.forEach(opt => {
          let optText = opt.innerText.replace(/\s+/g, ' ').trim();
          optText = decryptText(optText); // 解密

          const isChecked = opt.querySelector('input:checked') || opt.querySelector('.ri') || opt.querySelector('.dui');
          const mark = isChecked ? " [已选]" : "";

          resultText += `\t${optText}${mark}\n`;
        });
      }

      // 提取答案/解析
      const answerDiv = q.querySelector('.newAnswerBx') || q.querySelector('.answerBx') || q.querySelector('.lookAnswer');
      if (answerDiv) {
        let answerBlockText = answerDiv.innerText.replace(/\s+/g, ' ').trim();
        answerBlockText = decryptText(answerBlockText); // 解密

        if (answerBlockText) {
          resultText += `\n${answerBlockText}\n`;
        }
      }

      resultText += "\n下一题\n\n";
    });

    return { text: resultText, count: questions.length };
  }

  // ================= 随机答题功能 =================

  let isRandomAnswering = false;

  async function randomAnswer() {
    if (isRandomAnswering) {
      addLog('随机答题正在进行中...', 'info');
      return;
    }
    isRandomAnswering = true;
    updateStatus(true);
    addLog('开始随机答题...', 'info');

    try {
      const questions = document.querySelectorAll('.TiMu');
      if (questions.length === 0) {
        addLog('未找到题目', 'error');
        isRandomAnswering = false;
        updateStatus(false);
        return;
      }

      addLog(`共找到 ${questions.length} 个题目`, 'info');

      for (let i = 0; i < questions.length; i++) {
        if (!isRandomAnswering) {
          addLog('随机答题已暂停', 'info');
          break;
        }

        const q = questions[i];
        const questionType = q.getAttribute('data') || q.querySelector('.newTiMu')?.getAttribute('data') || '0';
        addLog(`第 ${i + 1} 题类型: ${questionType === '0' ? '单选' : questionType === '1' ? '多选' : questionType === '3' ? '判断' : '未知'}`, 'debug');

        let optionLis;
        if (questionType === '1') {
          optionLis = q.querySelectorAll('ul li[onclick*="addMultipleChoice"]');
        } else {
          optionLis = q.querySelectorAll('ul li[onclick*="addChoice"]');
        }

        if (optionLis.length > 0) {
          if (questionType === '1') {
            // 多选题随机选2-3个
            const selectCount = Math.min(Math.floor(Math.random() * 2) + 2, optionLis.length);
            const indices = [];
            while (indices.length < selectCount) {
              const idx = Math.floor(Math.random() * optionLis.length);
              if (!indices.includes(idx)) indices.push(idx);
            }
            indices.forEach(idx => {
              if (typeof addMultipleChoice === 'function') {
                addMultipleChoice(optionLis[idx]);
              } else {
                optionLis[idx].click();
              }
            });
            addLog(`第 ${i + 1} 题已选择 ${selectCount} 个选项`, 'debug');
          } else {
            // 单选题/判断题随机选一个
            const randomIndex = Math.floor(Math.random() * optionLis.length);
            if (typeof addChoice === 'function') {
              addChoice(optionLis[randomIndex]);
            } else {
              optionLis[randomIndex].click();
            }
            addLog(`第 ${i + 1} 题已随机选择`, 'debug');
          }
        } else {
          addLog(`第 ${i + 1} 题未找到选项`, 'error');
        }

        if (isRandomAnswering && i < questions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }

      addLog('随机答题完成！', 'success');
    } catch (error) {
      addLog(`随机答题出错: ${error.message}`, 'error');
    } finally {
      isRandomAnswering = false;
      updateStatus(false);
    }
  }

  function copyQuestionsToClipboard() {
    try {
      initDecryption(); // 初始化解密表
      const data = extractQuestionsContent();

      if (!data) {
        addLog('未找到题目，请在测验页面使用此功能', 'error');
        return;
      }

      GM_setClipboard(data.text);
      addLog(`成功复制 ${data.count} 道题目到剪贴板！`, 'success');

      // 显示提示
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;top:24px;right:24px;background:#10b981;color:#fff;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:500;z-index:10000;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);animation:fadeInOut 3s ease forwards;';
      toast.textContent = `✅ 已复制 ${data.count} 道题目`;
      document.body.appendChild(toast);

      setTimeout(() => {
        try { toast.remove(); } catch { }
      }, 3000);
    } catch (e) {
      addLog('复制题目失败: ' + e.message, 'error');
      console.error('复制题目错误:', e);
    }
  }


  function safeClick(el) {
    try {
      if (!el) return false;
      el.click();
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    } catch { return false; }
  }


  function forEachSameOriginFrame(callback) {
    const visit = (win) => {
      for (let i = 0; i < win.frames.length; i++) {
        const f = win.frames[i];
        try {
          const doc = f.document || f.contentDocument;
          if (doc && doc.location && doc.location.href.includes('.chaoxing.com')) {
            callback(doc);
            visit(f);
          }
        } catch { }
      }
    };
    try { callback(document); } catch { }
    try { visit(window); } catch { }
  }


  function forEachAllSameOriginDocs(callback) {
    const seen = new Set();
    const visit = (win) => {
      if (!win || seen.has(win)) return;
      seen.add(win);
      try {
        const doc = win.document || win.contentDocument;
        if (doc) callback(doc);
      } catch { }
      try {
        const len = win.frames ? win.frames.length : 0;
        for (let i = 0; i < len; i++) {
          try { visit(win.frames[i]); } catch { }
        }
      } catch { }
    };
    try { visit(window.top); } catch { visit(window); }
  }


  async function waitForQuestionsRenderAny(timeoutMs = 8000) {
    const end = Date.now() + timeoutMs;
    const selector = '.question, .questionLi, .subject_item, .examPaper_subject, .questionContainer, .q-item, .subject_node, [class*="question"], .ti-item, .exam-item';
    while (Date.now() < end) {
      let hit = null;
      forEachAllSameOriginDocs((doc) => {
        if (hit) return;
        try {
          const qs = doc.querySelectorAll(selector);
          if (qs && qs.length > 0) hit = doc;
        } catch { }
      });
      if (hit) return hit;
      await new Promise(r => setTimeout(r, 300));
    }
    return null;
  }


  function gotoNextSection(contextDoc) {
    const docsToTry = [];
    if (contextDoc) docsToTry.push(contextDoc);
    try { if (window.top && window.top.document) docsToTry.push(window.top.document); } catch { }
    docsToTry.push(document);

    const textNextRegex = /下一(节|章|单元|页|个)|继续|下一步|下一个|Next/i;
    const nextBtnSelectors = [
      '.next', '.vc-next', '.reader-next', 'a[title="下一页"]', '.btn-next', '#next',
      '.prev_next .right a', '.switch-btn.next', '.icon-arrow-right', '.right-btn .next'
    ];
    const currentNodeSelectors = ['.cur', '.curr', 'li.active', 'li.selected', '.posCatalog_active'];


    try { if (isStudyingChapters) localStorage.setItem(STUDY_PERSIST_KEY, '1'); } catch { }

    for (const doc of docsToTry) {
      try {

        for (const sel of nextBtnSelectors) {
          const btn = doc.querySelector(sel);
          if (btn && !btn.getAttribute('disabled') && !String(btn.className).includes('disabled')) {
            if (safeClick(btn)) { addLog('检测到下一节按钮，已点击', 'success'); return true; }
          }
        }


        for (const curSel of currentNodeSelectors) {
          const cur = doc.querySelector(curSel);
          if (cur && cur.nextElementSibling) {
            const link = cur.nextElementSibling.querySelector('a');
            if (link && safeClick(link)) { addLog('目录定位到下一小节', 'success'); return true; }
          }
        }


        const links = Array.from(doc.querySelectorAll('a[href*="knowledgeId"], a[href*="chapterId"], a[href*="studentstudy"]'));
        if (links.length > 1) {
          const hrefNow = (location && location.href) || '';
          const idx = links.findIndex(a => (a.href || '').includes('knowledgeId') && hrefNow.includes('knowledgeId') && a.href.split('knowledgeId')[1] === hrefNow.split('knowledgeId')[1]);
          const next = idx >= 0 ? links[idx + 1] : null;
          if (next && safeClick(next)) { addLog('通过目录链接顺序跳转下一小节', 'success'); return true; }
        }


        const clickable = Array.from(doc.querySelectorAll('a, button, .btn, .el-button, .next'));
        for (const el of clickable) {
          const txt = (el.textContent || '').trim();

          if (textNextRegex.test(txt)) {

            const excludeClasses = ['close', 'cancel', 'delete', 'remove', 'back', 'prev', 'disabled', 'popup', 'modal'];
            const hasExcludeClass = excludeClasses.some(cls =>
              el.className.toLowerCase().includes(cls) ||
              el.id.toLowerCase().includes(cls)
            );


            const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0 &&
              window.getComputedStyle(el).display !== 'none' &&
              window.getComputedStyle(el).visibility !== 'hidden';


            const isValidNavigationElement = (
              (el.tagName === 'A' && (el.href || el.onclick)) ||
              (el.tagName === 'BUTTON' && el.onclick) ||
              el.className.includes('btn') ||
              el.className.includes('next')
            ) && !el.closest('.popup, .modal, .dialog, .alert');


            const isNavigationText = /^(下一节|下一章|下一个|下一页|继续|Next)$/i.test(txt);

            if (!hasExcludeClass && isVisible && isValidNavigationElement && isNavigationText) {
              if (safeClick(el)) {
                addLog(`通过文本匹配跳转: ${txt}`, 'success');
                return true;
              }
            } else {
              addLog(`跳过不合适的文本匹配元素: ${txt} (类名: ${el.className})`, 'debug');
            }
          }
        }
      } catch { }
    }
    addLog('未能自动跳转到下一小节', 'error');
    return false;
  }


  function handleVideosInDocument(doc) {
    try {
      const videos = doc.querySelectorAll('video, .video-js video');
      if (videos.length === 0) return false;
      let any = false;
      videos.forEach(v => {
        try {
          v.muted = true;
          if (!Number.isNaN(v.playbackRate)) v.playbackRate = currentPlaybackSpeed;
          const p = v.play(); if (p && typeof p.catch === 'function') p.catch(() => { });

          v.loop = false;


          if (!v.dataset.autonextBind) {
            v.dataset.autonextBind = '1';


            v.addEventListener('ended', () => {
              if (v.dataset.disableAutoNext === '1' || !isStudyingChapters) return;
              addLog('视频播放结束，进行完成度检测', 'success');
              setTimeout(() => ensureSectionCompletedAndAdvance(doc), 300);
            }, { passive: true });


            let nearingFired = false;
            const onTimeUpdate = () => {
              if (v.dataset.disableAutoNext === '1' || !isStudyingChapters) return;
              try {
                const d = v.duration || 0;
                const t = v.currentTime || 0;
                if (d > 0 && (d - t) <= 1.0 && !nearingFired) {
                  nearingFired = true;
                  addLog('检测到视频即将结束，进行完成度检测', 'debug');
                  setTimeout(() => ensureSectionCompletedAndAdvance(doc), 800);
                }
              } catch { }
            };
            v.addEventListener('timeupdate', onTimeUpdate, { passive: true });
          }
          any = true;
        } catch { }
      });

      const popBtns = doc.querySelectorAll('.ans-job-icon, .popBtn, .dialog-footer .btn, .ans-modal .btn, .vjs-big-play-button');
      popBtns.forEach(b => safeClick(b));
      return any;
    } catch { return false; }
  }


  function handlePPTInDocument(doc) {
    try {
      const nextSelectors = ['.next', '.vc-next', '.reader-next', 'a[title="下一页"]', '.btn-next', '#next'];
      for (const sel of nextSelectors) {
        const btn = doc.querySelector(sel);
        if (btn && !btn.className.includes('disabled') && !btn.getAttribute('disabled')) {
          if (safeClick(btn)) { addLog('PPT自动下一页', 'debug'); return true; }
        }
      }

      const container = doc.scrollingElement || doc.body;
      if (container) container.scrollTop = container.scrollHeight;
      return false;
    } catch { return false; }
  }


  function findChapterQuizTab(doc) {
    try {

      const byTitle = doc.querySelector('li[title*="章节测验"], li[title*="测验"], a[title*="章节测验"], a[title*="测验"]');
      if (byTitle) return byTitle;

      const byOnClick = Array.from(doc.querySelectorAll('li[onclick], a[onclick], button[onclick]')).find(el => {
        const oc = (el.getAttribute('onclick') || '').toString();
        return oc.includes('changeDisplayContent') && (oc.includes('(2,2') || oc.includes(',2)'));
      });
      if (byOnClick) return byOnClick;

      const candidates = Array.from(doc.querySelectorAll('li, a, button, [role="tab"], [role="option"]'));
      const textEl = candidates.find(el => /章节测验|测验/.test(((el.textContent || el.getAttribute('title') || '') + '').trim()));
      if (textEl) return textEl;
    } catch { }
    return null;
  }


  async function waitForQuestionsRender(doc, timeoutMs = 6000) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      try {
        const qs = doc.querySelectorAll('.question, .questionLi, .subject_item, .examPaper_subject, .questionContainer, .q-item, .subject_node, [class*="question"], .ti-item, .exam-item');
        if (qs.length > 0) return true;
      } catch { }
      await new Promise(r => setTimeout(r, 300));
    }
    return false;
  }



  let TYPR_MD5_LIB, FONT_TABLE_DATA;
  try {
    TYPR_MD5_LIB = GM_getResourceText('typrMd5Lib');
    FONT_TABLE_DATA = GM_getResourceText('fontTableData');


    if (TYPR_MD5_LIB) {
      window.TYPR_MD5_LIB = TYPR_MD5_LIB;
    }
    if (FONT_TABLE_DATA) {
      window.FONT_TABLE_DATA = FONT_TABLE_DATA;
    }
  } catch (e) {
    console.error('加载外部资源失败:', e);

    TYPR_MD5_LIB = '';
    FONT_TABLE_DATA = '{}';
  }


  function injectConsoleDecryptCode(doc, timeoutMs = 3000) {
    return new Promise((resolve) => {
      try {
        const consoleCode = `

if (!window.Typr || !window.md5) {
    ${TYPR_MD5_LIB || window.TYPR_MD5_LIB || ''}
}


if (!window.chaoXingFontTable) {
    window.chaoXingFontTable = ${FONT_TABLE_DATA || window.FONT_TABLE_DATA || '{}'};
}


const decryptChaoXingFont = async () => {
  const { Typr, md5, chaoXingFontTable: table } = window;


  const base64ToUint8Array = (base64) => {
    const data = atob(base64);
    const buffer = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      buffer[i] = data.charCodeAt(i);
    }
    return buffer;
  };


  const styleElements = [...document.querySelectorAll('style')];
  const cxStyle = styleElements.find(el =>
    el.textContent.includes('font-cxsecret')
  );

  if (!cxStyle) {
    return;
  }


  const fontData = cxStyle.textContent.match(/base64,([\\w\\W]+?)'/)[1];
  const parsedFont = Typr.parse(base64ToUint8Array(fontData))[0];


  const charMap = {};
  for (let charCode = 19968; charCode < 40870; charCode++) {
    const glyph = Typr.U.codeToGlyph(parsedFont, charCode);
    if (!glyph) continue;

    const path = Typr.U.glyphToPath(parsedFont, glyph);
    const pathHash = md5(JSON.stringify(path)).slice(24);
    charMap[String.fromCharCode(charCode)] =
      String.fromCharCode(table[pathHash]);
  }


  document.querySelectorAll('.font-cxsecret').forEach(element => {
    let htmlContent = element.innerHTML;
    Object.entries(charMap).forEach(([encryptedChar, decryptedChar]) => {
      const regex = new RegExp(encryptedChar, 'g');
      htmlContent = htmlContent.replace(regex, decryptedChar);
    });
    element.innerHTML = htmlContent;
    element.classList.remove('font-cxsecret');
  });
};


decryptChaoXingFont().catch(console.error);
`;
        const beforeCnt = (() => { try { return doc.querySelectorAll('.font-cxsecret').length; } catch { return -1; } })();

        let script = doc.createElement('script');
        script.type = 'text/javascript';
        let blobUrl = '';
        try {
          const blob = new Blob([consoleCode], { type: 'text/javascript' });
          blobUrl = (doc.defaultView || window).URL.createObjectURL(blob);
          script.src = blobUrl;
        } catch {

          script.textContent = consoleCode;
        }
        (doc.head || doc.documentElement).appendChild(script);
        script.onload = () => { try { if (blobUrl) (doc.defaultView || window).URL.revokeObjectURL(blobUrl); } catch { } };

        const start = Date.now();
        const timer = setInterval(() => {
          try {
            const cnt = doc.querySelectorAll('.font-cxsecret').length;
            if (cnt === 0 || (beforeCnt >= 0 && cnt < beforeCnt)) { clearInterval(timer); resolve(); return; }
          } catch { }
          if (Date.now() - start > timeoutMs) { clearInterval(timer); resolve(); }
        }, 200);
      } catch { resolve(); }
    });
  }


  async function tryEnterQuizAndAnswer(contextDoc) {
    try {
      if (!isStudyingChapters) return false;
      let targetDoc = null;
      let tabEl = null;

      forEachAllSameOriginDocs((doc) => {
        if (tabEl) return;
        const el = findChapterQuizTab(doc);
        if (el) { tabEl = el; targetDoc = doc; }
      });
      if (!tabEl || !targetDoc) return false;
      addLog('检测到章节测验入口，正在进入...', 'info');

      await new Promise((r) => {
        let pending = 0; let done = false;
        forEachAllSameOriginDocs((doc) => {
          pending++; injectConsoleDecryptCode(doc).finally(() => { if (--pending === 0 && !done) { done = true; r(); } });
        });
        if (pending === 0) r();
      });

      try { tabEl.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch { }
      const clicked = safeClick(tabEl);


      const oc = (tabEl.getAttribute('onclick') || '').toString();
      const m = oc.match(/changeDisplayContent\(([^)]*)\)/);
      if (!clicked && m && m[1]) {
        try {
          const ownerWin = (tabEl.ownerDocument && tabEl.ownerDocument.defaultView) || null;
          const topWin = (function () { try { return window.top; } catch { return window; } })();
          const evalWin = ownerWin || topWin || window;
          const args = evalWin.eval('[' + m[1] + ']');
          const fn = (ownerWin && ownerWin.changeDisplayContent) || (topWin && topWin.changeDisplayContent) || window.changeDisplayContent;
          if (typeof fn === 'function') {
            fn.apply(ownerWin || topWin || window, args);
          } else {
            addLog('未找到changeDisplayContent函数可调用', 'error');
          }
        } catch (e) {
          addLog('直接调用changeDisplayContent失败: ' + e.message, 'error');
        }
      }


      const qDoc = await waitForQuestionsRenderAny(10000);
      if (!isStudyingChapters) return false;
      if (!qDoc) {
        addLog('进入章节测验后未检测到题目，自动跳转下一节', 'info');
        try { gotoNextSection(targetDoc || document); } catch { }
        return true;
      }

      await injectConsoleDecryptCode(qDoc);

      if (!isStudyingChapters) return false;
      await autoAnswerInDocument(qDoc);
      addLog('章节测验已自动作答', 'success');
      return true;
    } catch (e) {
      addLog(`进入章节测验失败: ${e.message}`, 'error');
      return false;
    }
  }


  function hasActionableStudyContent(doc) {
    try {

      if (doc.querySelector('video, .video-js video')) return true;


      const docSelectors = [
        '.ans-attach-ct', '.reader', '.ppt', '.ppt-play', '.vjs-control', '.vjs-big-play-button',
        '.catalog', '.course_section', '.posCatalog', '.posCatalog_active', '.catalogTree'
      ];
      if (docSelectors.some(sel => !!doc.querySelector(sel))) return true;


      const nextSelectors = ['.next', '.vc-next', '.reader-next', 'a[title="下一页"]', '.btn-next', '#next'];
      if (nextSelectors.some(sel => !!doc.querySelector(sel))) return true;


      if (doc.querySelector('.question, .questionLi, .subject_item, .examPaper_subject, .questionContainer, .q-item, .subject_node, [class*="question"], .ti-item, .exam-item')) return true;


      if (doc.querySelector('input[type="radio"], input[type="checkbox"], textarea, select')) return true;


      if (doc.querySelector('[id^="answerEditor"], iframe[id^="ueditor_"], div[contenteditable="true"]')) return true;


      const iframes = Array.from(doc.querySelectorAll('iframe'));
      if (iframes.some(f => {
        const src = (f.getAttribute('src') || '').toLowerCase();
        return src.includes('mooc-ans') || src.includes('document') || src.includes('ppt') || src.includes('video') || src.includes('knowledgeid');
      })) return true;


      if (doc.querySelector('.cur, .curr, li.active, li.selected, .posCatalog_active')) return true;
    } catch { }
    return false;
  }


  function hasUnansweredQuestions(doc) {
    try {

      const containers = doc.querySelectorAll('.question, .questionLi, .subject_item, .examPaper_subject, .questionContainer, .q-item, .subject_node, [class*="question"], .ti-item, .exam-item');
      for (const q of containers) {
        try { if (!isQuestionAnswered(q)) return true; } catch { }
      }


      const radios = Array.from(doc.querySelectorAll('input[type="radio"]'));
      if (radios.length > 0) {
        const groups = new Map();
        radios.forEach(r => {
          const k = r.name || `__radio_${Math.random()}`;
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(r);
        });
        for (const [, list] of groups) {
          if (!list.some(r => r.checked)) return true;
        }
      }


      const texts = Array.from(doc.querySelectorAll('textarea, input[type="text"], div[contenteditable="true"]'));
      if (texts.length > 0) {
        if (texts.some(el => {
          if (el.tagName && el.tagName.toLowerCase() === 'div') return ((el.innerText || el.textContent || '').trim().length === 0);
          return ((el.value || '').trim().length === 0);
        })) return true;
      }
    } catch { }
    return false;
  }


  function tryAutoSkipEmptySection() {
    if (!isStudyingChapters) return false;
    const now = Date.now();
    if (now - lastAutoSkipTs < 4000) return false;


    const href = (location && location.href) || '';
    const key = href.split('?')[0] + (href.includes('knowledgeId') ? ('?k=' + href.split('knowledgeId')[1]) : '');
    if (key !== lastEmptySectionKey) { lastEmptySectionKey = key; emptyChecksCount = 0; }

    let found = false;
    forEachSameOriginFrame((doc) => {
      if (found) return;
      if (hasActionableStudyContent(doc)) { found = true; return; }
      if (hasUnansweredQuestions(doc)) { found = true; return; }
    });
    if (!found) {
      emptyChecksCount += 1;
      addLog(`小节判空第${emptyChecksCount}次`, 'debug');
      if (emptyChecksCount >= 2) {
        lastAutoSkipTs = now;
        emptyChecksCount = 0;
        addLog('检测到空白小节（已二次确认），自动跳转下一小节', 'info');
        gotoNextSection(document);
        return true;
      }
    } else {

      emptyChecksCount = 0;
    }
    return false;
  }


  async function autoAnswerInDocument(rootDoc) {
    try {
      if (!isStudyingChapters) return false;

      if (isQuizPageDoc(rootDoc)) {
        if (!isStudyingChapters) return false;
        const ok = await autoAnswerQuizInDocument(rootDoc);
        if (ok) return true;
      }

      // 优先使用学习通标准选择器 .TiMu（参考 jm.user.js）
      const possibleSelectors = [
        '.TiMu',                    // 学习通标准题目类名（最优先）
        '.questionLi',              // 常见题目列表项
        '.question',                // 通用题目类
        '.subject_item',            // 科目项
        '.examPaper_subject',       // 试卷题目
        '.questionContainer',       // 题目容器
        '.q-item',                  // 题目项
        '.subject_node',            // 科目节点
        '.ti-item',                 // 题项
        '.exam-item',               // 考试项
        '[class*="question"]',      // 包含question的类名
        '[class*="subject"]',       // 包含subject的类名
        '[class*="TiMu"]',          // 包含TiMu的类名
        '[class*="timu"]'           // 包含timu的类名（小写）
      ];
      let questions = [];
      for (let selector of possibleSelectors) {
        questions = rootDoc.querySelectorAll(selector);
        if (questions.length > 0) {
          addLog(`使用选择器 "${selector}" 找到 ${questions.length} 个题目`, 'debug');
          break;
        }
      }
      if (questions.length === 0) return false;
      addLog(`章节内发现 ${questions.length} 个题目，自动作答...`, 'info');
      for (let q of questions) {
        if (!isStudyingChapters) { addLog('已暂停刷章节，停止小测作答', 'info'); return false; }
        const info = getQuestionInfo(q);
        if (!info || !info.question) continue;
        const ans = await getAnswer(info);
        if (ans) {
          fillAnswer(ans, q, info.type);
          await new Promise(r => setTimeout(r, 800));
        }
      }
      return true;
    } catch (e) { addLog(`章节答题出错: ${e.message}`, 'error'); return false; }
  }


  function isStudyPage() { return /mycourse\/studentstudy|mooc2-ans|knowledgeId|chapterId/.test(location.href); }


  function hasStudyContentDeep() {
    let found = false;
    const tryDoc = (doc) => {
      try {
        if (doc.querySelector('video, .video-js, .ans-attach-ct, .reader, .ppt, .ppt-play, .catalog, .vjs-play-control')) { found = true; return; }
        if (doc.querySelector('.TiMu, .questionLi, .question, .subject_item, .examPaper_subject, .questionContainer, .q-item, .subject_node, [class*="question"], .ti-item, .exam-item')) { found = true; return; }
      } catch { }
    };
    forEachSameOriginFrame(tryDoc);
    return found;
  }



  let currentPlaybackSpeed = 1.0;
  const PLAYBACK_SPEED_KEY = 'cx_playback_speed';


  try {
    const savedSpeed = localStorage.getItem(PLAYBACK_SPEED_KEY);
    if (savedSpeed) {
      currentPlaybackSpeed = parseFloat(savedSpeed);
    }
  } catch { }


  function updateSpeedButtonsState() {
    const speedButtons = document.querySelectorAll('.speed-button');
    speedButtons.forEach(btn => {
      btn.classList.remove('speed-active');
    });

    const activeButton = document.getElementById(`speed-${currentPlaybackSpeed}x`);
    if (activeButton) {
      activeButton.classList.add('speed-active');
    }
  }


  function setVideoPlaybackSpeed(speed) {
    currentPlaybackSpeed = speed;
    try {
      localStorage.setItem(PLAYBACK_SPEED_KEY, speed.toString());
    } catch { }

    updateSpeedButtonsState();


    forEachSameOriginFrame((doc) => {
      try {
        const videos = doc.querySelectorAll('video, .video-js video');
        videos.forEach(v => {
          if (!Number.isNaN(v.playbackRate)) v.playbackRate = speed;
        });
      } catch { }
    });

    addLog(`视频播放速度已设置为 ${speed}×`, 'success');
  }

  function updateStudyButtons(running) {
    const startBtn = document.getElementById('start-study');
    const pauseBtn = document.getElementById('pause-study');
    const speedControls = document.getElementById('playback-speed-controls');

    if (!startBtn || !pauseBtn) return;

    if (running) {
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'flex';
      if (speedControls) speedControls.style.display = 'flex';
    } else {
      startBtn.style.display = 'flex';
      pauseBtn.style.display = 'none';
      if (speedControls) speedControls.style.display = 'none';
    }
  }

  function startStudyChapters() {
    if (isStudyingChapters) { addLog('刷章节已在运行', 'info'); return; }
    isStudyingChapters = true;
    setPanelFixedHeight(360);
    try { localStorage.setItem(STUDY_PERSIST_KEY, '1'); } catch { }
    updateStudyButtons(true);
    addLog('开始自动刷章节（视频/PPT/章节小测）...', 'success');
    addLog('⚠️ 章节视频请勿倍速观看，倍速观看可能导致账号异常哦', 'warning');

    forEachSameOriginFrame((doc) => {

      try { doc.querySelectorAll('video, .video-js video').forEach(v => { delete v.dataset.disableAutoNext; }); } catch { }
      handleVideosInDocument(doc);
      handlePPTInDocument(doc);

      autoAnswerInDocument(doc);
    });

    tryAutoSkipEmptySection();

    studyIntervalId = setInterval(() => {
      if (!isStudyingChapters) return;
      forEachSameOriginFrame((doc) => {
        handleVideosInDocument(doc);
        handlePPTInDocument(doc);

      });

      tryAutoSkipEmptySection();
    }, 3000);
  }

  function stopStudyChapters() {
    if (!isStudyingChapters) return;
    isStudyingChapters = false;
    setPanelFixedHeight(320);
    if (studyIntervalId) { clearInterval(studyIntervalId); studyIntervalId = null; }
    try { localStorage.removeItem(STUDY_PERSIST_KEY); } catch { }

    forEachSameOriginFrame((doc) => {
      try {
        doc.querySelectorAll('video, .video-js video').forEach(v => {
          v.dataset.disableAutoNext = '1';
          try { v.pause(); } catch { }
        });
      } catch { }
    });
    updateStudyButtons(false);
    addLog('已暂停刷章节', 'info');
  }


  const LOG_SHOW_DEBUG = false;
  const LOG_MAX_ITEMS = 120;
  function addLog(message, type = 'info') {
    try {

      if (type === 'debug' && !LOG_SHOW_DEBUG) return;

      const logContainer = document.getElementById('answer-log');
      if (!logContainer) return;


      const text = String(message || '')
        .replace(/\s+/g, ' ')
        .slice(0, 140);

      const logItem = document.createElement('div');
      logItem.className = `log-item ${type}`;
      logItem.textContent = `${new Date().toLocaleTimeString()} - ${text}`;
      logContainer.appendChild(logItem);


      const items = logContainer.querySelectorAll('.log-item');
      if (items.length > LOG_MAX_ITEMS) {
        const removeCount = items.length - LOG_MAX_ITEMS;
        for (let i = 0; i < removeCount; i++) {
          const n = logContainer.firstElementChild;
          if (n) logContainer.removeChild(n);
        }
      }

      logContainer.scrollTop = logContainer.scrollHeight;
    } catch { }
  }



  function getModelParams(questionType) {

    const preciseTypes = ['single', 'multiple', 'blank', 'cloze', 'judge', 'term'];

    if (preciseTypes.includes(questionType)) {
      return {
        temperature: 0.1,
        max_tokens: 100,
        top_p: 0.1,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      };
    } else {

      return {
        temperature: 0.5,
        max_tokens: 500,
        top_p: 0.8,
        frequency_penalty: 0.3,
        presence_penalty: 0.3
      };
    }
  }

  // 批量生成提示词 - 一次性发送所有题目
  function generateBatchPrompt(questionsInfo) {
    let prompt = `你是一个专业的答题助手。请分析以下所有题目并给出所有答案。

请严格按照以下 JSON 数组格式返回答案，不要返回任何其他内容：
[
  {"questionIndex": 1, "answer": "答案"},
  {"questionIndex": 2, "answer": "答案"},
  ...
]

注意：
1. 只返回 JSON 数组，不要有任何其他文字
2. questionIndex 从 1 开始
3. 单选题、判断题答案格式：单个字母如 "A" 或 "B"
4. 多选题答案格式：多个字母用逗号分隔如 "A,B" 或 "A,B,D"
5. 填空题答案格式：用逗号分隔多个答案如 "答案1,答案2"

现在开始答题：

`;

    questionsInfo.forEach((q, idx) => {
      const index = idx + 1;
      prompt += `\n【题目 ${index}】\n`;
      prompt += `题型: ${getTypeName(q.type)}\n`;
      prompt += `题目: ${q.question}\n`;

      if (q.options && q.options.length > 0) {
        prompt += `选项:\n`;
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          const cleanOption = opt.replace(/^[A-Z][\s.、．。]+|^\d+[\s.、．。]+/, '').trim();
          prompt += `${letter}. ${cleanOption}\n`;
        });
      }
      prompt += '\n';
    });

    prompt += `
请返回 JSON 数组格式的答案：`;

    return prompt;
  }

  // 获取题型中文名称
  function getTypeName(type) {
    const typeMap = {
      'single': '单选题',
      'multiple': '多选题',
      'judge': '判断题',
      'blank': '填空题',
      'cloze': '完形填空',
      'short': '简答题',
      'term': '名词解释',
      'essay': '论述题',
      'writing': '写作题',
      'calculation': '计算题',
      'matching': '连线题',
      'accounting': '分录题'
    };
    return typeMap[type] || '未知题型';
  }

  // 解析批量答案
  function parseBatchAnswers(rawAnswer, expectedCount) {
    try {
      addLog('🔧 开始解析批量答案...', 'debug');

      // 尝试提取 JSON 数组
      let jsonStr = rawAnswer;

      // 尝试找到 JSON 数组的开始和结束
      const startIdx = jsonStr.indexOf('[');
      const lastIdx = jsonStr.lastIndexOf(']');

      if (startIdx !== -1 && lastIdx !== -1 && lastIdx > startIdx) {
        jsonStr = jsonStr.substring(startIdx, lastIdx + 1);
      }

      const answers = JSON.parse(jsonStr);

      if (!Array.isArray(answers)) {
        addLog('❌ 解析结果不是数组', 'error');
        return [];
      }

      addLog(`📋 解析到 ${answers.length} 个答案`, 'info');

      // 创建答案数组，按题目顺序
      const result = new Array(expectedCount).fill(null);

      answers.forEach((item, idx) => {
        if (item.questionIndex && item.answer) {
          const qIdx = item.questionIndex - 1; // 转换为 0 索引
          if (qIdx >= 0 && qIdx < expectedCount) {
            result[qIdx] = item.answer;
            addLog(`  题目 ${item.questionIndex}: ${item.answer}`, 'debug');
          }
        }
      });

      return result;
    } catch (e) {
      addLog(`❌ 解析批量答案失败: ${e.message}`, 'error');
      addLog('📝 原始答案: ' + rawAnswer.substring(0, 200), 'debug');

      // 尝试备用解析 - 按行分割
      try {
        const lines = rawAnswer.split('\n');
        const result = [];
        let currentAnswer = '';

        for (const line of lines) {
          const match = line.match(/answer[:\s]*["']?([A-Z,，、\s]+)["']?/i);
          if (match) {
            currentAnswer = match[1].replace(/[,，、\s]+/g, ',').replace(/^,|,$/g, '');
            if (currentAnswer) result.push(currentAnswer);
          }
        }

        if (result.length > 0) {
          addLog(`📋 备用解析到 ${result.length} 个答案`, 'info');
          return result;
        }
      } catch (e2) {
        addLog(`❌ 备用解析也失败: ${e2.message}`, 'error');
      }

      return [];
    }
  }


  async function getAnswer(questionInfo) {
    addLog(`题目类型: ${questionInfo.type}`, 'info');
    addLog(`题目内容: ${questionInfo.question}`, 'info');

    if (questionInfo.options && questionInfo.options.length > 0) {
      addLog(`选项数量: ${questionInfo.options.length}`, 'info');
      questionInfo.options.forEach((opt, idx) => {
        addLog(`选项${String.fromCharCode(65 + idx)}: ${opt}`, 'debug');
      });
    }

    try {

      await ensureAccessAllowed();
    } catch (e) {
      addLog(`❌ 权限检查失败: ${String(e && e.message ? e.message : e)}`, 'error');
      return null;
    }

    const prompt = generatePrompt(questionInfo);

    addLog(prompt.substring(0, 200) + '...', 'debug');

    try {
      const modelParams = getModelParams(questionInfo.type);

      const startTime = Date.now();


      const data = await deepseekChat([
        { role: "user", content: prompt }
      ], modelParams);

      const elapsed = Date.now() - startTime;
      addLog(`⏱️ API 调用完成，耗时: ${elapsed}ms`, 'info');

      // 显示完整的 API 响应
      addLog('📥 API 响应: ' + JSON.stringify(data).substring(0, 200) + '...', 'debug');

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        addLog('❌ 完整响应: ' + JSON.stringify(data), 'debug');
        throw new Error('Invalid API response format');
      }

      const answer = data.choices[0].message.content.trim();
      addLog(answer, 'success');

      // 解析答案
      addLog('🔧 正在解析答案...', 'debug');
      const parsedAnswer = parseAnswer(answer, questionInfo.type);
      addLog(`✅ 解析后的答案: "${parsedAnswer}"`, 'info');

      return parsedAnswer;
    } catch (error) {
      addLog(`错误类型: ${error.name}`, 'error');
      addLog(`错误信息: ${error.message}`, 'error');
      addLog(`错误堆栈: ${error.stack}`, 'debug');
      return null;
    }
  }

  // 解析 DeepSeek 返回的答案
  function parseAnswer(rawAnswer, questionType) {
    addLog(`开始解析答案，题目类型: ${questionType}`, 'debug');
    addLog(`原始答案: "${rawAnswer}"`, 'debug');

    let parsed = rawAnswer.trim();

    // 针对不同题型进行解析
    switch (questionType) {
      case 'single':
      case 'judge':
        // 单选题和判断题：提取单个字母
        const singleMatch = parsed.match(/[A-Z]/i);
        if (singleMatch) {
          parsed = singleMatch[0].toUpperCase();
          addLog(`提取到单选答案: ${parsed}`, 'debug');
        }
        break;

      case 'multiple':
        // 多选题：提取所有字母
        const letters = parsed.match(/[A-Z]/gi);
        if (letters && letters.length > 0) {
          parsed = letters.map(l => l.toUpperCase()).join(',');
          addLog(`提取到多选答案: ${parsed}`, 'debug');
        }
        break;

      case 'blank':
      case 'cloze':
        // 填空题：保持原样或按逗号分隔
        addLog(`填空题答案: ${parsed}`, 'debug');
        break;

      default:
        // 其他题型：保持原样
        addLog(`其他题型，保持原答案: ${parsed}`, 'debug');
    }

    return parsed;
  }


  function generatePrompt(questionInfo) {

    let prompt = '';

    // 根据题目类型生成不同的提示词，要求返回 JSON 格式
    if (questionInfo.type === 'single') {
      // 单选题
      prompt = `你是一个专业的答题助手。请分析以下单选题并给出答案。

题目：${questionInfo.question}\n\n`;

      if (questionInfo.options && questionInfo.options.length > 0) {
        prompt += '选项：\n';
        questionInfo.options.forEach((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const cleanOption = option.replace(/^[A-Z][\s.、．。]+|^\d+[\s.、．。]+/, '').trim();
          prompt += `${letter}. ${cleanOption}\n`;
        });
      }

      prompt += `
请严格按照以下 JSON 格式返回答案，不要返回任何其他内容：
[{"answer": "答案字母"}]

示例：对于单选题，如果答案是 A，则返回：
[{"answer": "A"}]`;

    } else if (questionInfo.type === 'multiple') {
      // 多选题
      prompt = `你是一个专业的答题助手。请分析以下多选题并给出所有正确答案。

题目：${questionInfo.question}\n\n`;

      if (questionInfo.options && questionInfo.options.length > 0) {
        prompt += '选项：\n';
        questionInfo.options.forEach((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const cleanOption = option.replace(/^[A-Z][\s.、．。]+|^\d+[\s.、．。]+/, '').trim();
          prompt += `${letter}. ${cleanOption}\n`;
        });
      }

      prompt += `
请严格按照以下 JSON 格式返回答案，不要返回任何其他内容：
[{"answer": ["答案字母1", "答案字母2", ...]}]

示例：如果正确答案是 A、B、D，则返回：
[{"answer": ["A", "B", "D"]}]`;

    } else if (questionInfo.type === 'judge') {
      // 判断题
      prompt = `你是一个专业的答题助手。请判断以下说法的正确性。

题目：${questionInfo.question}

选项：A. 正确  B. 错误

请严格按照以下 JSON 格式返回答案，不要返回任何其他内容：
[{"answer": "A"}]  // A表示正确，B表示错误

示例：如果答案是"正确"，则返回：
[{"answer": "A"}]`;

    } else if (questionInfo.type === 'blank' || questionInfo.type === 'cloze') {
      // 填空题
      prompt = `你是一个专业的答题助手。请回答以下填空题。

题目：${questionInfo.question}

请严格按照以下 JSON 格式返回答案，不要返回任何其他内容：
[{"answer": ["答案1", "答案2", ...]}]

示例：如果有两个空，答案是"北京"和"上海"，则返回：
[{"answer": ["北京", "上海"]}]

注意：答案按题目中空的顺序依次填写。`;

    } else {
      // 其他题型（简答题、论述题等）
      prompt = `你是一个专业的答题助手。请简洁地回答以下问题。

题目：${questionInfo.question}\n\n`;

      if (questionInfo.options && questionInfo.options.length > 0) {
        prompt += '选项：\n';
        questionInfo.options.forEach((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const cleanOption = option.replace(/^[A-Z][\s.、．。]+|^\d+[\s.、．。]+/, '').trim();
          prompt += `${letter}. ${cleanOption}\n`;
        });
      }

      prompt += `
请严格按照以下 JSON 格式返回答案，不要返回任何其他内容：
[{"answer": "你的答案"}]`;
    }

    addLog(`生成的提示词长度: ${prompt.length} 字符`, 'debug');
    return prompt;
  }



  function fillAnswer(answer, questionElement, type) {
    addLog('═══════════════════════════════════════════', 'info');
    addLog('📝 开始填写答案', 'info');
    addLog(`🏷️ 题目类型: ${type}`, 'info');
    addLog(`✍️ 答案内容: "${answer}"`, 'info');
    addLog(`🔍 题目元素ID: "${questionElement.id}"`, 'debug');
    addLog(`🔍 题目元素类名: "${questionElement.className}"`, 'debug');

    try {
      let filled = false;
      const questionId = questionElement.id;
      addLog(`📌 题目ID: "${questionId}"`, 'debug');

      switch (type) {
        case 'blank':
        case 'cloze': {
          addLog('处理填空题...', 'info');
          const answers = answer.split(/[,，;；、]\s*/).map(a => a.trim()).filter(a => a);
          addLog(`解析到 ${answers.length} 个答案`, 'info');
          answers.forEach((ans, idx) => addLog(`  答案${idx + 1}: ${ans}`, 'debug'));

          const editorElements = questionElement.querySelectorAll('[id^="answerEditor"]');
          addLog(`找到 ${editorElements.length} 个编辑器元素`, 'info');

          if (editorElements.length > 0) {
            editorElements.forEach((editorElement, index) => {
              const editorId = editorElement.id;
              addLog(`处理编辑器 ${index + 1}/${editorElements.length}: ${editorId}`, 'debug');

              if (index < answers.length) {
                const currentAnswer = answers[index];
                try {
                  if (typeof UE !== 'undefined' && UE.getEditor) {
                    const editor = UE.getEditor(editorId);
                    if (editor) {
                      if (editor.ready) {
                        editor.ready(() => {
                          editor.setContent(currentAnswer);
                          addLog(`✓ 成功设置编辑器内容: ${currentAnswer}`, 'success');
                          if (typeof editor.fireEvent === 'function') {
                            editor.fireEvent('contentChange');
                          }
                        });
                        filled = true;
                      }
                    }
                  }

                  if (!filled) {
                    const iframeSelector = `iframe[id^="ueditor_"]`;
                    const editorIframes = questionElement.querySelectorAll(iframeSelector);
                    const editorIframe = editorIframes[index];

                    if (editorIframe) {
                      try {
                        const iframeDoc = editorIframe.contentDocument || editorIframe.contentWindow.document;
                        const editorBody = iframeDoc.body;
                        if (editorBody) {
                          editorBody.innerHTML = currentAnswer;
                          editorBody.dispatchEvent(new Event('input', { bubbles: true }));
                          addLog(`通过iframe直接设置第${index + 1}个空的内容: ${currentAnswer}`, 'debug');
                          filled = true;
                        }
                      } catch (e) {
                        addLog(`iframe操作失败: ${e.message}`, 'error');
                      }
                    }
                  }


                  const textarea = document.getElementById(editorId);
                  if (textarea) {
                    textarea.value = currentAnswer;
                    textarea.dispatchEvent(new Event('change', { bubbles: true }));
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    addLog(`设置第${index + 1}个空的textarea值: ${currentAnswer}`, 'debug');
                  }

                } catch (e) {
                  addLog(`处理第${index + 1}个空时出错: ${e.message}`, 'error');
                }
              } else {
                addLog(`警告：第${index + 1}个空没有对应的答案`, 'error');
              }
            });
          }


          if (!filled) {
            const blankInputs = [
              ...questionElement.querySelectorAll('input[type="text"]'),
              ...questionElement.querySelectorAll('.blank'),
              ...questionElement.querySelectorAll('.fill-blank'),
              ...questionElement.querySelectorAll('[class*="blank"]'),
              ...questionElement.querySelectorAll('[class*="fill"]'),
              ...questionElement.querySelectorAll('textarea')
            ];

            if (blankInputs.length > 0) {
              addLog(`找到 ${blankInputs.length} 个普通输入框`, 'debug');
              blankInputs.forEach((input, index) => {
                if (index < answers.length) {
                  try {
                    input.value = answers[index];
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    addLog(`填写第${index + 1}个空: ${answers[index]}`, 'debug');
                    filled = true;
                  } catch (e) {
                    addLog(`填写第${index + 1}个空失败: ${e.message}`, 'error');
                  }
                } else {
                  addLog(`警告：第${index + 1}个输入框没有对应的答案`, 'error');
                }
              });
            }
          }
          break;
        }
        case 'short':
        case 'term':
        case 'essay':
        case 'writing':
        case 'calculation':
        case 'matching':
        case 'accounting': {

          const textInputs = [
            ...questionElement.querySelectorAll('textarea'),
            ...questionElement.querySelectorAll('.answer-area'),
            ...questionElement.querySelectorAll('.writing-area'),
            ...questionElement.querySelectorAll('[class*="answer"]'),
            ...questionElement.querySelectorAll('[class*="text-area"]'),
            ...questionElement.querySelectorAll('div[contenteditable="true"]')
          ];

          if (textInputs.length > 0) {
            textInputs.forEach(input => {
              try {

                if (input.tagName.toLowerCase() === 'textarea' || input.tagName.toLowerCase() === 'input') {
                  input.value = answer;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }

                else if (input.getAttribute('contenteditable') === 'true') {
                  input.innerHTML = answer;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                addLog(`填写答案到${input.tagName.toLowerCase()}`, 'debug');
                filled = true;
              } catch (e) {
                addLog(`填写答案失败: ${e.message}`, 'error');
              }
            });
          }


          const editors = [
            ...questionElement.querySelectorAll('.editor'),
            ...questionElement.querySelectorAll('[class*="editor"]'),
            ...questionElement.querySelectorAll('iframe')
          ];

          editors.forEach(editor => {
            try {

              if (editor.tagName.toLowerCase() === 'iframe') {
                const iframeDoc = editor.contentDocument || editor.contentWindow.document;
                const editorBody = iframeDoc.body;
                if (editorBody) {
                  editorBody.innerHTML = answer;
                  editorBody.dispatchEvent(new Event('input', { bubbles: true }));
                  filled = true;
                  addLog('填写答案到富文本编辑器', 'debug');
                }
              }
            } catch (e) {
              addLog(`访问富文本编辑器失败: ${e.message}`, 'error');
            }
          });
          break;
        }
        case 'single':
        case 'multiple':
        case 'judge': {
          addLog(`处理${type === 'single' ? '单选题' : type === 'multiple' ? '多选题' : '判断题'}...`, 'info');

          // 解析答案
          let answerLetters = [];
          const upperAnswer = answer.toUpperCase().trim();

          if (type === 'multiple') {
            // 多选题：用逗号、空格、中文逗号分割
            answerLetters = upperAnswer.split(/[,，、\s]+/).filter(l => l.trim());
          } else {
            // 单选和判断：取第一个字母
            const match = upperAnswer.match(/[A-Z]/);
            if (match) {
              answerLetters = [match[0]];
            }
          }

          addLog(`原始答案: ${answer}`, 'info');
          addLog(`解析后的选项字母: ${answerLetters.join(', ')}`, 'info');


          if (answerLetters.length === 0) {
            addLog(`❌ 无法解析答案选项`, 'error');
            break;
          }

          // 学习通标准方式：使用 addChoice / addMultipleChoice 函数
          addLog(`🔍 使用学习通标准方式填写答案...`, 'info');

          // 根据题目类型选择正确的选择器
          let allOptions = [];
          if (type === 'multiple') {
            // 多选题使用 addMultipleChoice
            allOptions = questionElement.querySelectorAll('ul li[onclick*="addMultipleChoice"]');
            addLog(`📋 多选题找到 ${allOptions.length} 个选项元素 (addMultipleChoice)`, 'info');
          } else {
            // 单选题和判断题使用 addChoice
            allOptions = questionElement.querySelectorAll('ul li[onclick*="addChoice"]');
            addLog(`📋 单选题/判断题找到 ${allOptions.length} 个选项元素 (addChoice)`, 'info');
          }

          // 如果没找到，尝试备用选择器
          if (allOptions.length === 0) {
            allOptions = questionElement.querySelectorAll('ul li');
            addLog(`📋 尝试备用选择器，找到 ${allOptions.length} 个选项`, 'info');
          }

          if (allOptions.length === 0) {
            addLog(`❌ 未找到任何选项元素`, 'error');
            break;
          }

          let filled = false;

          // 先解密选项文本再匹配
          const decryptedOptions = Array.from(allOptions).map(opt => {
            const text = opt.textContent || '';
            return {
              element: opt,
              text: decryptText(text).trim(),
              onclick: opt.getAttribute('onclick') || ''
            };
          });

          addLog(`解密后的选项:`, 'debug');
          decryptedOptions.forEach((opt, idx) => {
            addLog(`  选项${String.fromCharCode(65 + idx)}: ${opt.text.substring(0, 30)}... onclick: ${opt.onclick.substring(0, 30)}`, 'debug');
          });

          for (const letter of answerLetters) {
            if (!/^[A-Z]$/.test(letter)) {
              addLog(`跳过无效的选项字母: ${letter}`, 'error');
              continue;
            }

            addLog(`正在查找选项 ${letter}...`, 'info');

            // 查找对应字母的选项 - 检查选项文本是否以该字母开头
            for (let i = 0; i < decryptedOptions.length; i++) {
              const optData = decryptedOptions[i];
              const textContent = optData.text;

              // 匹配选项字母 - 选项文本以字母开头
              if (textContent.startsWith(letter) || textContent.match(new RegExp(`^${letter}[\\s.、．。]`))) {
                addLog(`✅ 找到选项 ${letter}，正在调用函数...`, 'info');

                try {
                  const optElement = optData.element;

                  if (type === 'multiple') {
                    // 多选题
                    if (typeof window.addMultipleChoice === 'function') {
                      window.addMultipleChoice(optElement);
                      addLog(`✅ 通过 addMultipleChoice 选择选项 ${letter}`, 'success');
                    } else if (typeof addMultipleChoice === 'function') {
                      addMultipleChoice(optElement);
                      addLog(`✅ 通过 addMultipleChoice 选择选项 ${letter}`, 'success');
                    } else {
                      optElement.click();
                      addLog(`✅ 通过 click 点击选项 ${letter}`, 'success');
                    }
                  } else {
                    // 单选题/判断题
                    if (typeof window.addChoice === 'function') {
                      window.addChoice(optElement);
                      addLog(`✅ 通过 addChoice 选择选项 ${letter}`, 'success');
                    } else if (typeof addChoice === 'function') {
                      addChoice(optElement);
                      addLog(`✅ 通过 addChoice 选择选项 ${letter}`, 'success');
                    } else {
                      optElement.click();
                      addLog(`✅ 通过 click 点击选项 ${letter}`, 'success');
                    }
                  }
                  filled = true;
                  // 单选题只选一个，选完就跳出
                  if (type !== 'multiple') break;
                } catch (e) {
                  addLog(`❌ 选择选项 ${letter} 失败: ${e.message}`, 'error');
                }
              }
            }
          }

          // 如果按文本没匹配成功，尝试按索引匹配
          if (!filled && answerLetters.length > 0) {
            addLog('🔄 尝试按索引选择...', 'info');
            for (let i = 0; i < answerLetters.length; i++) {
              const letter = answerLetters[i];
              const letterIndex = letter.charCodeAt(0) - 65; // A=0, B=1, C=2, ...
              if (letterIndex < decryptedOptions.length) {
                const optElement = decryptedOptions[letterIndex].element;
                try {
                  if (type === 'multiple') {
                    if (typeof window.addMultipleChoice === 'function') {
                      window.addMultipleChoice(optElement);
                    } else if (typeof addMultipleChoice === 'function') {
                      addMultipleChoice(optElement);
                    } else {
                      optElement.click();
                    }
                  } else {
                    if (typeof window.addChoice === 'function') {
                      window.addChoice(optElement);
                    } else if (typeof addChoice === 'function') {
                      addChoice(optElement);
                    } else {
                      optElement.click();
                    }
                  }
                  filled = true;
                  addLog(`✅ 按索引选择选项 ${letter} 成功`, 'success');
                  if (type !== 'multiple') break;
                } catch (e) {
                  addLog(`❌ 按索引选择失败: ${e.message}`, 'error');
                }
              }
            }
          }

          if (filled) {
            addLog('✅ 答案填写成功', 'success');
          } else {
            addLog('❌ 答案填写失败，未找到选项', 'error');
          }
          break;
        }

          try {
            const submitButtons = [
              ...questionElement.querySelectorAll('button[type="submit"]'),
              ...questionElement.querySelectorAll('input[type="submit"]'),
              ...questionElement.querySelectorAll('.submit-btn'),
              ...questionElement.querySelectorAll('.save-btn'),
              ...questionElement.querySelectorAll('[class*="submit"]'),
              ...questionElement.querySelectorAll('[class*="save"]')
            ];

            if (submitButtons.length > 0) {
              submitButtons[0].click();
              addLog('触发了提交按钮', 'debug');
            }
          } catch (e) {
            addLog(`触发提交按钮失败: ${e.message}`, 'debug');
          }

      }
    } catch {
      addLog('未找到题目元素或答案元素', 'error');
    }
  }


  function debugPageStructure() {
    addLog('开始调试页面结构...', 'debug');


    addLog('页面URL: ' + window.location.href, 'debug');
    addLog('页面标题: ' + document.title, 'debug');


    const possibleContainers = [
      '.question',
      '.questionLi',
      '.subject_item',
      '.examPaper_subject',
      '.questionContainer',
      '.q-item',
      '.subject_node',
      '[class*="question"]',
      '[class*="subject"]'
    ];

    for (let selector of possibleContainers) {
      const elements = document.querySelectorAll(selector);
      addLog(`使用选择器 ${selector} 找到 ${elements.length} 个元素`, 'debug');
      if (elements.length > 0) {

        addLog(`第一个元素HTML结构：${elements[0].outerHTML.substring(0, 200)}...`, 'debug');
      }
    }


    const allElements = document.querySelectorAll('*');
    const relevantElements = Array.from(allElements).filter(el => {
      const className = el.className || '';
      const id = el.id || '';
      return (className + id).toLowerCase().includes('question') ||
        (className + id).toLowerCase().includes('answer') ||
        (className + id).toLowerCase().includes('option') ||
        (className + id).toLowerCase().includes('subject');
    });

    addLog(`找到 ${relevantElements.length} 个可能相关的元素`, 'debug');
    relevantElements.forEach(el => {
      addLog(`发现元素: ${el.tagName.toLowerCase()}.${el.className}#${el.id}`, 'debug');

      addLog(`元素HTML: ${el.outerHTML.substring(0, 100)}...`, 'debug');
    });


    const inputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"], textarea');
    addLog(`找到 ${inputs.length} 个输入元素`, 'debug');
    inputs.forEach(input => {
      addLog(`输入元素: type=${input.type}, name=${input.name}, class=${input.className}`, 'debug');
    });
  }

  function updateStatus(running) {
    const startButton = document.getElementById('start-answer');
    const pauseButton = document.getElementById('pause-answer');

    if (running) {
      startButton.style.display = 'none';
      pauseButton.style.display = 'flex';
    } else {
      startButton.style.display = 'flex';
      pauseButton.style.display = 'none';
    }
  }


  function hasQuestions() {
    const possibleSelectors = [
      '.question',
      '.questionLi',
      '.subject_item',
      '.examPaper_subject',
      '.questionContainer',
      '.q-item',
      '.subject_node',
      '[class*="question"]',
      '[class*="subject"]',
      '.ti-item',
      '.exam-item'
    ];

    for (let selector of possibleSelectors) {
      const questions = document.querySelectorAll(selector);
      if (questions.length > 0) {
        return true;
      }
    }


    const allElements = document.querySelectorAll('*');
    const possibleQuestions = Array.from(allElements).filter(el => {
      const className = el.className || '';
      const id = el.id || '';
      const text = el.textContent || '';

      return (className + id + text).toLowerCase().includes('题目') ||
        (className + id).toLowerCase().includes('question') ||
        (className + id).toLowerCase().includes('subject') ||
        /^\d+[\.。]/.test(text.trim());
    });

    return possibleQuestions.length > 0;
  }


  function showNoTaskToast() {
    const toast = document.createElement('div');
    toast.id = 'no-task-toast';
    toast.textContent = '该页面无任务';
    document.body.appendChild(toast);


    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }


  let advanceInProgress = false;


  function isQuestionAnswered(q) {
    try {

      const choiceInputs = q.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      if (choiceInputs.length > 0) {
        return Array.from(choiceInputs).some(i => i.checked);
      }

      const textInputs = q.querySelectorAll('input[type="text"], textarea');
      if (textInputs.length > 0) {
        if (Array.from(textInputs).some(t => (t.value || '').trim().length > 0)) return true;
      }
      const editableDivs = q.querySelectorAll('[contenteditable="true"]');
      if (editableDivs.length > 0) {
        if (Array.from(editableDivs).some(d => (d.innerText || d.textContent || '').trim().length > 0)) return true;
      }

      const ueTextareas = q.querySelectorAll('[id^="answerEditor"]');
      for (const ta of ueTextareas) {
        const id = ta.id;
        try {
          if (typeof UE !== 'undefined' && UE.getEditor) {
            const ed = UE.getEditor(id);
            if (ed && ed.getContentTxt && ed.getContentTxt().trim().length > 0) return true;
          }
        } catch { }
        if ((ta.value || '').trim().length > 0) return true;
      }
      const ifr = q.querySelector('iframe[id^="ueditor_"]');
      if (ifr) {
        try {
          const doc = ifr.contentDocument || ifr.contentWindow.document;
          const txt = (doc && doc.body && (doc.body.innerText || doc.body.textContent)) || '';
          if (txt.trim().length > 0) return true;
        } catch { }
      }
    } catch { }
    return false;
  }


  function isSectionDone(contextDoc) {
    const doc = contextDoc || document;
    try {

      const videos = doc.querySelectorAll('video, .video-js video');
      for (const v of videos) {
        try {
          const d = v.duration || 0;
          const t = v.currentTime || 0;
          if (!(v.ended || (d > 0 && t / d >= 0.985))) {
            return false;
          }
        } catch { return false; }
      }


      const questions = doc.querySelectorAll('.TiMu, .questionLi, .question, .subject_item, .examPaper_subject, .questionContainer, .q-item, .subject_node, [class*="question"], .ti-item, .exam-item');
      for (const q of questions) {
        if (!isQuestionAnswered(q)) {
          return false;
        }
      }


      return true;
    } catch { return false; }
  }

  async function ensureSectionCompletedAndAdvance(contextDoc) {
    if (!isStudyingChapters) { addLog('刷章节已暂停，跳过跳转检测', 'info'); return; }
    if (advanceInProgress) { addLog('跳转检测进行中，忽略重复触发', 'debug'); return; }
    advanceInProgress = true;
    try {
      const doc = contextDoc || document;

      await autoAnswerInDocument(doc);

      await tryEnterQuizAndAnswer(doc);


      let tries = 3;
      while (tries-- > 0) {
        if (!isStudyingChapters) { addLog('刷章节已暂停，终止跳转检测', 'info'); return; }
        if (isSectionDone(doc)) {
          addLog('检测到当前小节已完成，准备跳转下一小节', 'success');
          gotoNextSection(doc);
          return;
        }
        await new Promise(r => setTimeout(r, 500));
      }
      addLog('当前小节未完成，暂不跳转', 'info');
    } catch (e) {
      addLog(`跳转前完成度检测出错: ${e.message}`, 'error');
    } finally {
      advanceInProgress = false;
    }
  }

  // 自动答题
  async function autoAnswer() {

    if (isAnswering) {
      addLog('⚠️ 自动答题已经在运行中，请勿重复点击', 'warn');
      return;
    }

    isAnswering = true;
    updateStatus(true);

    try {


      // 检查 API Key 是否已配置
      const apiKey = getDeepSeekApiKey();
      if (!apiKey) {
        addLog('❌ 尚未配置 DeepSeek API Key', 'error');
        isAnswering = false;
        updateStatus(false);
        return;
      }

      const extracted = extractQuestionsContent();
      console.log(extracted);

      if (!extracted) {
        addLog('❌ 无法获取题目内容', 'error');
        isAnswering = false;
        updateStatus(false);
        return;
      }

      addLog(`✅ 成功获取 ${extracted.count} 道题目`, 'success');

      // 解析提取的题目文本来构建结构化信息
      const questions = document.querySelectorAll('.TiMu');
      const allQuestionsInfo = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // 获取题目类型
        const questionType = q.getAttribute('data') || q.querySelector('.newTiMu')?.getAttribute('data') || '0';
        let type = 'single';
        if (questionType === '1') type = 'multiple';
        else if (questionType === '3') type = 'judge';
        else if (questionType === '2') type = 'blank';

        // 获取解密后的选项
        const options = [];
        const optionLis = q.querySelectorAll('ul li');
        optionLis.forEach(opt => {
          let optText = opt.innerText.replace(/\s+/g, ' ').trim();
          optText = decryptText(optText); // 解密选项
          options.push(optText);
        });

        // 获取解密后的题目
        let titleDiv = q.querySelector('.Zy_TItle .clearfix') ||
          q.querySelector('.Zy_TItle') ||
          q.querySelector('.newZy_TItle') ||
          q.querySelector('.fontLabel');
        let questionText = titleDiv ? titleDiv.innerText.replace(/\s+/g, ' ').trim() : "未找到题目";
        questionText = decryptText(questionText); // 解密题目

        if (questionText && questionText !== "未找到题目") {
          allQuestionsInfo.push({
            index: i,
            element: q,
            info: {
              type: type,
              question: questionText,
              options: options
            }
          });
          addLog(`📝 题目 ${i + 1}: ${type} - ${questionText.substring(0, 30)}...`, 'info');
        }
      }
      console.log("所有问题!",allQuestionsInfo);

      if (allQuestionsInfo.length === 0) {
        addLog('❌ 无法解析任何题目信息', 'error');
        isAnswering = false;
        updateStatus(false);
        return;
      }

      addLog(`✅ 成功收集 ${allQuestionsInfo.length} 道题目信息`, 'success');

      // ================= 一次性发送所有题目给 AI =================
      addLog('🤖 准备一次性发送所有题目给 DeepSeek AI...', 'info');

      // 生成批量答题提示词
      const batchPrompt = generateBatchPrompt(allQuestionsInfo.map(q => q.info));
      addLog(`📤 提示词长度: ${batchPrompt.length} 字符`, 'info');

      try {
        // 确保有访问权限
        await ensureAccessAllowed();

        const modelParams = {
          temperature: 0.1,
          max_tokens: 4000,
          top_p: 0.1,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        };

        addLog('🌐 正在调用 DeepSeek API 获取所有答案...', 'info');
        const startTime = Date.now();

        const data = await deepseekChat([
          { role: "user", content: batchPrompt }
        ], modelParams);

        const elapsed = Date.now() - startTime;
        addLog(`⏱️ API 调用完成，耗时: ${elapsed}ms`, 'info');

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('API 响应格式错误');
        }

        const rawAnswer = data.choices[0].message.content.trim();
        addLog('📥 AI 返回的原始答案:', 'success');
        addLog(rawAnswer, 'success');

        // 解析批量答案
        const allAnswers = parseBatchAnswers(rawAnswer, allQuestionsInfo.length);
        addLog(`✅ 解析到 ${allAnswers.length} 个答案`, 'info');

        // ================= 依次填写答案 =================
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < allQuestionsInfo.length; i++) {
          const q = allQuestionsInfo[i];
          const answer = allAnswers[i];

          if (!isAnswering) {
            addLog('⏸️ 自动答题已暂停', 'info');
            break;
          }

          addLog(`📝 【第 ${i + 1}/${allQuestionsInfo.length} 题】填写答案`, 'info');
          addLog(`🏷️ 题目类型: ${q.info.type}`, 'info');
          addLog(`✍️ 答案: "${answer || '无答案'}"`, 'info');

          if (answer) {
            fillAnswer(answer, q.element, q.info.type);
            successCount++;
            addLog(`✅ 第 ${i + 1} 题完成!`, 'success');
          } else {
            addLog(`❌ 第 ${i + 1} 题无答案`, 'error');
            failCount++;
          }

          // 简短延迟
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        addLog(`🎉 AI 答题完成!`, 'success');
        addLog(`   ✅ 成功: ${successCount} 题`, 'success');
        addLog(`   ❌ 失败: ${failCount} 题`, 'info');

      } catch (error) {
        addLog(`❌ 批量获取答案失败: ${error.message}`, 'error');
        addLog('📝 退回一题一题模式...', 'info');

        // 退回一题一题模式
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < allQuestionsInfo.length; i++) {
          const q = allQuestionsInfo[i];
          if (!isAnswering) break;

          addLog(`📝 【第 ${i + 1}/${allQuestionsInfo.length} 题】备用模式`, 'info');

          const answer = await getAnswer(q.info);
          if (answer) {
            fillAnswer(answer, q.element, q.info.type);
            successCount++;
          } else {
            failCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        addLog(`🎉 备用模式答题完成!`, 'success');
        addLog(`   ✅ 成功: ${successCount} 题`, 'success');
        addLog(`   ❌ 失败: ${failCount} 题`, 'info');
      }
    } catch (error) {
      addLog(`❌ 自动答题过程出错: ${error.message}`, 'error');
      addLog(`错误堆栈: ${error.stack}`, 'debug');
    } finally {
      isAnswering = false;
      updateStatus(false);
    }
  }


  function init() {

    let persistedStudy = false;
    try { persistedStudy = localStorage.getItem(STUDY_PERSIST_KEY) === '1'; } catch { }

    const pageTitle = document.title || '';
    const currentUrl = location.href || '';


    if (pageTitle.includes('课程') || pageTitle === '课程' || pageTitle.includes('课表') || pageTitle === '课表' ||
      pageTitle.includes('AI工作台') || pageTitle === 'AI工作台' || pageTitle.includes('知识点') || pageTitle === '知识点' ||
      pageTitle.includes('章节') || pageTitle === '章节' || pageTitle.includes('资料') || pageTitle === '资料' ||
      pageTitle.includes('错题集') || pageTitle === '错题集' || pageTitle.includes('学习记录') || pageTitle === '学习记录') {
      let pageType = '';
      if (pageTitle.includes('课表')) pageType = '课表';
      else if (pageTitle.includes('课程')) pageType = '课程';
      else if (pageTitle.includes('AI工作台')) pageType = 'AI工作台';
      else if (pageTitle.includes('知识点')) pageType = '知识点';
      else if (pageTitle.includes('章节')) pageType = '章节';
      else if (pageTitle.includes('资料')) pageType = '资料';
      else if (pageTitle.includes('错题集')) pageType = '错题集';
      else if (pageTitle.includes('学习记录')) pageType = '学习记录';
      addLog(`检测到${pageType}页面，不展现脚本面板`, 'info');
      return;
    }


    const isCourseDetailPage = () => {

      if (currentUrl.includes('/mooc2-ans/mycourse/stu') ||
        currentUrl.includes('/mycourse/studentcourse') ||
        currentUrl.includes('course/') && !currentUrl.includes('knowledge')) {


        const hasNavigationMenu = document.querySelector('.nav-content ul, .stuNavigationList ul');
        const hasModuleLinks = document.querySelectorAll('a[title="章节"], a[title="作业"], a[title="考试"], a[title="资料"]').length >= 3;


        const hasCourseInfo = document.querySelector('.classDl, .sideCon, .nav_side');


        const hasCourseId = document.querySelector('#courseid, input[name="courseid"]');

        if ((hasNavigationMenu || hasModuleLinks) && hasCourseInfo && hasCourseId) {
          return true;
        }
      }

      return false;
    };

    if (isCourseDetailPage()) {
      addLog('检测到课程详情页面，不展现脚本面板', 'info');
      return;
    }


    const isChapterListPage = () => {

      const hasChapterList = document.querySelector('.fanyaChapter, .chapter_body, .xs_table');
      const hasChapterItems = document.querySelectorAll('.chapter_unit, .chapter_item').length > 0;
      const hasChapterStructure = document.querySelector('.chapter_th, .chapter_td');
      const hasProgressInfo = document.querySelector('.catalog_points_yi, .chapter_head');
      const hasSearchBox = document.querySelector('#searchChapterListByName, .dataSearch');


      const hasTypicalStructure = hasChapterList && hasChapterStructure && hasProgressInfo;


      const hasChapterTitles = document.querySelectorAll('.catalog_name, .newCatalog_name').length > 2;


      const urlIndicatesChapterList = currentUrl.includes('/mycourse/studentcourse') ||
        currentUrl.includes('/studentstudy') && !currentUrl.includes('chapterId=');


      const hasNoLearningContent = !document.querySelector('video, .video-js, iframe[src*="chaoxing"], .questionLi, .TiMu');

      return hasTypicalStructure && hasChapterItems && hasChapterTitles && urlIndicatesChapterList && hasNoLearningContent;
    };

    if (isChapterListPage()) {
      addLog('检测到章节列表页面，不展现脚本面板', 'info');
      return;
    }


    if (!persistedStudy && !hasQuestions() && !hasStudyContentDeep() && !isStudyPage()) {
      showNoTaskToast();
      return;
    }


    if (!claimOwnership()) {

      if (persistedStudy && !recoveryTimerId) {
        recoveryTimerId = setInterval(() => {
          if (claimOwnership()) {
            clearInterval(recoveryTimerId); recoveryTimerId = null;
            createdPanelEl = createPanel();
            bindPanelEvents();
            startHeartbeat();
            if (!isStudyingChapters) startStudyChapters();
          }
        }, 1000);
      }
      return;
    }

    createdPanelEl = createPanel();
    bindPanelEvents();
    startHeartbeat();

    if (persistedStudy) {
      startStudyChapters();

      setTimeout(() => tryAutoSkipEmptySection(), 600);
    }
  }


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }


  function isQuizPageDoc(doc) {
    try {
      if (doc.getElementById('form1') && doc.querySelector('#RightCon .newTestTitle')) return true;
      if (doc.querySelector('.newTestCon form#form1') && doc.querySelector('.ans-cc')) return true;
    } catch { }
    return false;
  }


  function collectQuizQuestions(doc) {
    const questions = [];
    try {

      const typeInputs = doc.querySelectorAll('input[id^="answertype"]');
      typeInputs.forEach((inp) => {
        try {
          const id = inp.id.replace('answertype', '');
          const qid = id.trim();
          const block = doc.querySelector(`.singleQuesId[data="${qid}"]`) || inp.closest('.TiMu') || doc;
          const typeVal = (inp.value || '').trim();
          let type = '';
          if (typeVal === '0') type = 'single';
          else if (typeVal === '1') type = 'multiple';
          else if (typeVal === '3') type = 'judge';
          else if (typeVal === '2') type = 'blank';
          else if (typeVal === '4') type = 'short';
          else {
            const hasTextInput = block.querySelector('input[type="text"], textarea, [contenteditable="true"], [id^="answerEditor"], iframe[id^="ueditor_"]');
            type = hasTextInput ? 'short' : 'text';
          }

          const opts = [];
          const lis = block.querySelectorAll(`ul.Zy_ulTop li[onclick][qid="${qid}"]`);
          lis.forEach((li, idx) => {
            const span = li.querySelector('.num_option, .num_option_dx');
            const letter = span?.getAttribute('data') || String.fromCharCode(65 + idx);
            const txt = (li.querySelector('a.after')?.textContent || '').trim();
            opts.push(`${letter}. ${txt}`);
          });

          let qtext = '';
          const label = block.querySelector('.Zy_TItle .fontLabel');
          if (label) qtext = label.textContent.replace(/\s+/g, ' ').trim();
          questions.push({ qid, type, question: qtext, options: opts });
        } catch { }
      });
    } catch { }
    return questions;
  }


  function fillQuizAnswer(doc, qid, type, answer) {
    try {
      const block = doc.querySelector(`.singleQuesId[data="${qid}"]`) || doc;
      if (!block) return false;
      if (type === 'single' || type === 'multiple' || type === 'judge') {
        let letters = [];
        if (type === 'multiple') {
          letters = (answer || '').toUpperCase().split(/[,，、\s]+/).filter(Boolean);
        } else if (type === 'judge') {
          const val = String(answer || '').trim().toLowerCase();

          if (/^a$|对|true|正确/.test(val)) letters = ['A'];
          else if (/^b$|错|false|错误/.test(val)) letters = ['B'];
          else if (/^t$/.test(val)) letters = ['A'];
          else if (/^f$/.test(val)) letters = ['B'];
          else letters = [(val.match(/[ab]/i) || ['A'])[0].toUpperCase()];
        } else {
          const m = String(answer || '').toUpperCase().match(/[A-Z]/g);
          letters = m ? m : [];
        }

        const ul = block.querySelector('ul.Zy_ulTop');
        if (!ul) return false;


        letters.forEach((L) => {
          let target = null;
          if (type === 'judge') {

            const dataVal = (L === 'A') ? 'true' : 'false';
            target = ul.querySelector(`li .num_option[data='${dataVal}'], li .num_option_dx[data='${dataVal}']`)
              || ul.querySelector(`li .num_option[data='${L}'], li .num_option_dx[data='${L}']`);
          } else {
            target = ul.querySelector(`li .num_option[data='${L}'], li .num_option_dx[data='${L}']`);
          }
          if (target) {
            const li = target.closest('li');
            safeClick(li);
          }
        });


        const hidden = doc.getElementById(`answer${qid}`);
        if (hidden) {
          const want = (type === 'judge')
            ? (letters[0] === 'A' ? 'true' : 'false')
            : letters.join('');

          if (!hidden.value || (type !== 'multiple' && hidden.value.toLowerCase() !== want)) {
            hidden.value = want;

            const spans = ul.querySelectorAll(`.choice${qid}`);
            spans.forEach(s => s.classList.remove('check_answer', 'check_answer_dx'));
            letters.forEach((L) => {
              let sel = null;
              if (type === 'judge') {
                const dv = (L === 'A') ? 'true' : 'false';
                sel = ul.querySelector(`.choice${qid}[data='${dv}']`) || ul.querySelector(`.choice${qid}[data='${L}']`);
              } else {
                sel = ul.querySelector(`.choice${qid}[data='${L}']`);
              }
              if (sel) {
                const isMulti = !!ul.querySelector('.num_option_dx');
                sel.classList.add(isMulti ? 'check_answer_dx' : 'check_answer');
                const li = sel.closest('li');
                if (li) {
                  li.setAttribute('aria-checked', 'true');
                  li.setAttribute('aria-pressed', 'true');
                }
              }
            });
          }
        }
        return true;
      }
      else if (type === 'blank') {

        const answers = String(answer || '').split(/[,，;；、]\s*/).map(s => s.trim()).filter(Boolean);

        const ueAreas = block.querySelectorAll('[id^="answerEditor"]');
        ueAreas.forEach((ta, i) => {
          const val = answers[i] || '';
          if (!val) return;
          try {
            if (typeof UE !== 'undefined' && UE.getEditor) {
              const ed = UE.getEditor(ta.id);
              if (ed) {
                ed.ready(() => {
                  ed.setContent(val);
                  if (typeof ed.fireEvent === 'function') ed.fireEvent('contentChange');
                });
              }
            } else {
              ta.value = val;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              ta.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch { }
        });

        const ifrs = block.querySelectorAll('iframe[id^="ueditor_"]');
        ifrs.forEach((ifr, i) => {
          const val = answers[i] || '';
          if (!val) return;
          try {
            const d = ifr.contentDocument || ifr.contentWindow?.document;
            const body = d && d.body;
            if (body) {
              body.innerHTML = val;
              body.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } catch { }
        });

        const inputs = [
          ...block.querySelectorAll('input[type="text"]'),
          ...block.querySelectorAll('textarea'),
          ...block.querySelectorAll('[contenteditable="true"]')
        ];
        inputs.forEach((el, i) => {
          const val = answers[i] || '';
          if (!val) return;
          try {
            const tag = (el.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea') {
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.getAttribute('contenteditable') === 'true') {
              el.innerHTML = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } catch { }
        });

        const hidden = doc.getElementById(`answer${qid}`);
        if (hidden) hidden.value = answers.join(' ');
        return true;
      }
      else if (type === 'text' || type === 'short' || type === 'essay' || type === 'writing') {

        const val = String(answer || '').trim();
        if (!val) return false;

        const ueAreas = block.querySelectorAll('[id^="answerEditor"]');
        ueAreas.forEach((ta) => {
          try {
            if (typeof UE !== 'undefined' && UE.getEditor) {
              const ed = UE.getEditor(ta.id);
              if (ed) {
                ed.ready(() => {
                  ed.setContent(val);
                  if (typeof ed.fireEvent === 'function') ed.fireEvent('contentChange');
                });
              }
            } else {
              ta.value = val;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              ta.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } catch { }
        });

        const ifrs = block.querySelectorAll('iframe[id^="ueditor_"]');
        ifrs.forEach((ifr) => {
          try {
            const d = ifr.contentDocument || ifr.contentWindow?.document;
            const body = d && d.body;
            if (body) {
              body.innerHTML = val;
              body.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } catch { }
        });

        const inputs = [
          ...block.querySelectorAll('textarea'),
          ...block.querySelectorAll('input[type="text"]'),
          ...block.querySelectorAll('[contenteditable="true"]')
        ];
        inputs.forEach((el) => {
          try {
            const tag = (el.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea') {
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.getAttribute('contenteditable') === 'true') {
              el.innerHTML = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } catch { }
        });

        const hidden = doc.getElementById(`answer${qid}`);
        if (hidden) hidden.value = val;
        return true;
      }
      return false;
    } catch { return false; }
  }


  function findAndClickQuizSubmitButton(doc) {
    try {
      const targetWindow = doc.defaultView || window;


      const chaoxingSubmitMethods = [

        () => {
          if (typeof targetWindow.btnBlueSubmit === 'function') {
            targetWindow.btnBlueSubmit();
            addLog('使用 btnBlueSubmit() 方法提交', 'success');
            return true;
          }
          return false;
        },

        () => {
          if (typeof targetWindow.submitCheckTimes === 'function') {
            targetWindow.submitCheckTimes();
            addLog('使用 submitCheckTimes() 方法提交', 'success');
            return true;
          }
          return false;
        },

        () => {
          if (typeof targetWindow.submitWork === 'function') {
            targetWindow.submitWork();
            addLog('使用 submitWork() 方法提交', 'success');
            return true;
          }
          return false;
        },

        () => {
          const forms = doc.querySelectorAll('form');
          for (const form of forms) {
            const formAction = form.action || '';
            if (formAction.includes('work') || formAction.includes('quiz') || formAction.includes('submit')) {
              try {
                form.submit();
                addLog('使用表单 submit() 方法提交', 'success');
                return true;
              } catch (e) {
                addLog(`表单提交失败: ${e.message}`, 'error');
              }
            }
          }
          return false;
        }
      ];


      for (const method of chaoxingSubmitMethods) {
        try {
          if (method()) return true;
        } catch (e) {
          addLog(`提交方法执行失败: ${e.message}`, 'error');
        }
      }


      const submitSelectors = [
        'input[type="submit"][value*="提交"]',
        'button[type="submit"]',
        'input[value="提交答案"]',
        'input[value="提交"]',
        'button[onclick*="submit"]',
        'button[onclick*="btnBlueSubmit"]',
        'button[onclick*="submitCheckTimes"]',
        '.submit-btn',
        '.btn-submit',
        '#submit',
        '.submit',
        'input[id*="submit"]',
        'button[id*="submit"]',
        'a[onclick*="submit"]',
        'input[onclick*="tijiao"]',
        'button[onclick*="tijiao"]'
      ];

      for (const selector of submitSelectors) {
        const submitBtn = doc.querySelector(selector);
        if (submitBtn && !submitBtn.disabled && !submitBtn.classList.contains('disabled')) {
          try {

            submitBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });


            const onclick = submitBtn.getAttribute('onclick');
            if (onclick) {
              try {

                const func = new targetWindow.Function(onclick);
                func.call(submitBtn);
                addLog(`通过onclick执行提交: ${onclick}`, 'success');
                return true;
              } catch (e) {
                addLog(`onclick执行失败: ${e.message}`, 'error');
              }
            }


            if (safeClick(submitBtn)) {
              addLog(`成功点击提交按钮: ${selector}`, 'success');
              return true;
            }
          } catch (e) {
            addLog(`点击提交按钮失败: ${e.message}`, 'error');
          }
        }
      }


      const clickableElements = Array.from(doc.querySelectorAll('input, button, a, span, div'));
      for (const el of clickableElements) {
        const text = (el.textContent || el.value || '').trim();
        if (/^(提交|提交答案|完成|确认提交)$/.test(text)) {
          try {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' });


            const onclick = el.getAttribute('onclick');
            if (onclick) {
              try {
                const func = new targetWindow.Function(onclick);
                func.call(el);
                addLog(`通过文本匹配和onclick执行提交: ${text}`, 'success');
                return true;
              } catch (e) {
                addLog(`文本匹配onclick执行失败: ${e.message}`, 'error');
              }
            }

            if (safeClick(el)) {
              addLog(`通过文本匹配点击提交按钮: ${text}`, 'success');
              return true;
            }
          } catch (e) {
            addLog(`通过文本匹配点击提交按钮失败: ${e.message}`, 'error');
          }
        }
      }

      addLog('未找到章节测验提交按钮', 'error');
      return false;
    } catch (e) {
      addLog(`查找提交按钮时出错: ${e.message}`, 'error');
      return false;
    }
  }


  function validateAndFixSubmitParams(doc) {
    try {
      const targetWindow = doc.defaultView || window;


      if (typeof targetWindow.workRelationId === 'undefined') {

        const workIdInputs = doc.querySelectorAll('input[name*="workRelationId"], input[id*="workRelationId"]');
        if (workIdInputs.length > 0) {
          targetWindow.workRelationId = workIdInputs[0].value;
          addLog(`设置workRelationId: ${targetWindow.workRelationId}`, 'debug');
        }
      }


      if (typeof targetWindow.courseId === 'undefined') {
        const courseIdInputs = doc.querySelectorAll('input[name*="courseId"], input[id*="courseId"]');
        if (courseIdInputs.length > 0) {
          targetWindow.courseId = courseIdInputs[0].value;
          addLog(`设置courseId: ${targetWindow.courseId}`, 'debug');
        }
      }


      if (typeof targetWindow.classId === 'undefined') {
        const classIdInputs = doc.querySelectorAll('input[name*="classId"], input[id*="classId"]');
        if (classIdInputs.length > 0) {
          targetWindow.classId = classIdInputs[0].value;
          addLog(`设置classId: ${targetWindow.classId}`, 'debug');
        }
      }


      const questions = doc.querySelectorAll('[class*="TiMu"], [class*="timu"]');
      questions.forEach((q, index) => {
        const qid = q.getAttribute('id') || `question_${index}`;
        let answerInput = doc.querySelector(`input[name="answer${qid}"], input[id="answer${qid}"]`);

        if (!answerInput) {

          answerInput = doc.createElement('input');
          answerInput.type = 'hidden';
          answerInput.name = `answer${qid}`;
          answerInput.id = `answer${qid}`;
          q.appendChild(answerInput);
          addLog(`为题目${qid}创建答案input`, 'debug');
        }
      });

      addLog('提交参数验证完成', 'debug');
      return true;
    } catch (e) {
      addLog(`提交参数验证失败: ${e.message}`, 'error');
      return false;
    }
  }


  async function handleSubmitConfirmDialog(doc, timeoutMs = 3000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {

        const confirmDialogSelectors = [
          '.popDiv', '.modal', '.dialog', '.alert',
          '.layui-layer', '.confirm-dialog', '.submit-confirm',
          '[class*="confirm"]', '[class*="dialog"]', '[class*="modal"]'
        ];

        for (const selector of confirmDialogSelectors) {
          const dialog = doc.querySelector(selector);
          if (dialog && dialog.style.display !== 'none' &&
            (dialog.textContent.includes('确认提交') ||
              dialog.textContent.includes('提交') ||
              dialog.textContent.includes('确定'))) {

            addLog('检测到提交确认弹窗', 'info');


            const confirmButtonSelectors = [
              'button[onclick*="submit"]', 'button[value*="提交"]',
              'button[value*="确定"]', 'button[value*="确认"]',
              'input[type="button"][value*="提交"]',
              'input[type="button"][value*="确定"]',
              'input[type="button"][value*="确认"]',
              '.confirm-btn', '.submit-btn', '.ok-btn',
              'button:contains("提交")', 'button:contains("确定")',
              'button:contains("确认")', 'a[onclick*="submit"]'
            ];


            for (const btnSelector of confirmButtonSelectors) {
              const confirmBtn = dialog.querySelector(btnSelector) ||
                doc.querySelector(`${selector} ${btnSelector}`);

              if (confirmBtn && !confirmBtn.disabled) {
                try {

                  const onclick = confirmBtn.getAttribute('onclick');
                  if (onclick) {
                    const targetWindow = doc.defaultView || window;
                    const func = new targetWindow.Function(onclick);
                    func.call(confirmBtn);
                    addLog(`通过onclick执行确认提交: ${onclick}`, 'success');
                    return true;
                  }


                  if (safeClick(confirmBtn)) {
                    addLog(`点击确认提交按钮: ${btnSelector}`, 'success');
                    return true;
                  }
                } catch (e) {
                  addLog(`点击确认按钮失败: ${e.message}`, 'error');
                }
              }
            }


            const allButtons = dialog.querySelectorAll('button, input[type="button"], a');
            for (const btn of allButtons) {
              const text = (btn.textContent || btn.value || '').trim();
              if (/^(提交|确定|确认|OK)$/.test(text)) {
                try {
                  if (safeClick(btn)) {
                    addLog(`通过文本匹配点击确认按钮: ${text}`, 'success');
                    return true;
                  }
                } catch (e) {
                  addLog(`文本匹配点击确认按钮失败: ${e.message}`, 'error');
                }
              }
            }
          }
        }
      } catch (e) {

      }

      await new Promise(r => setTimeout(r, 200));
    }

    return false;
  }


  async function waitForQuizSubmitCompletion(doc, timeoutMs = 5000) {
    const startTime = Date.now();
    const originalUrl = doc.location.href;

    while (Date.now() - startTime < timeoutMs) {
      try {

        const successIndicators = [
          '.success', '.alert-success', '.msg-success',
          '[class*="success"]', '[class*="complete"]',
          '*[text()*="提交成功"]', '*[text()*="完成"]'
        ];

        for (const selector of successIndicators) {
          const indicator = doc.querySelector(selector);
          if (indicator && indicator.textContent.includes('成功')) {
            addLog('检测到提交成功提示', 'success');
            return true;
          }
        }


        if (doc.location.href !== originalUrl) {
          addLog('检测到页面跳转，提交可能已完成', 'info');
          return true;
        }


        const nextStepSelectors = [
          'button[onclick*="next"]', 'a[onclick*="next"]',
          'input[value*="下一"]', 'button[value*="下一"]',
          '.next-btn', '.btn-next', '#next'
        ];

        for (const selector of nextStepSelectors) {
          if (doc.querySelector(selector)) {
            addLog('检测到下一步按钮，提交可能已完成', 'info');
            return true;
          }
        }

      } catch (e) {

      }

      await new Promise(r => setTimeout(r, 200));
    }

    addLog('等待提交完成超时', 'error');
    return false;
  }


  async function autoAnswerQuizInDocument(doc) {
    try {
      if (!isStudyingChapters) return false;
      if (!isQuizPageDoc(doc)) return false;

      await injectConsoleDecryptCode(doc);
      const qs = collectQuizQuestions(doc);
      if (!qs || qs.length === 0) return false;
      addLog(`检测到章节测验，共 ${qs.length} 题，开始作答...`, 'info');


      for (const q of qs) {
        if (!isStudyingChapters) { addLog('已暂停刷章节，停止测验作答', 'info'); return false; }
        const promptInfo = { type: q.type, question: q.question || `题目 ${q.qid}`, options: q.options || [] };
        const ans = await getAnswer(promptInfo);
        if (ans) {
          fillQuizAnswer(doc, q.qid, q.type, ans);
        }
        await new Promise(r => setTimeout(r, 500));
      }

      addLog('章节测验答题完成，准备提交...', 'success');


      await new Promise(r => setTimeout(r, 1000));


      addLog('验证提交参数...', 'info');
      validateAndFixSubmitParams(doc);


      let submitSuccess = false;
      const targetWindow = doc.defaultView || window;


      try {

        const originalAlert = targetWindow.alert;
        targetWindow.alert = function (msg) {
          addLog(`阻止弹窗: ${msg}`, 'debug');
          if (msg && msg.includes('code-1')) {
            addLog('检测到code-1错误，尝试其他提交方式', 'info');
            return;
          }
          return originalAlert.call(this, msg);
        };


        if (typeof targetWindow.btnBlueSubmit === 'function') {
          addLog('使用学习通标准提交流程', 'info');


          targetWindow.btnBlueSubmit();
          await new Promise(r => setTimeout(r, 1000));


          if (typeof targetWindow.submitCheckTimes === 'function') {
            targetWindow.submitCheckTimes();
            addLog('执行submitCheckTimes完成', 'success');
          }


          if (typeof targetWindow.noSubmit === 'function') {
            addLog('检测到noSubmit函数，跳过自动提交以避免错误', 'info');
          }

          submitSuccess = true;
          addLog('学习通标准提交流程执行完成', 'success');
        } else if (typeof targetWindow.submitWork === 'function') {

          addLog('使用submitWork提交', 'info');
          targetWindow.submitWork();
          submitSuccess = true;
        } else {

          submitSuccess = findAndClickQuizSubmitButton(doc);
        }

        // 恢复原始alert targetWindow.alert = originalAlert;
      } catch (e) {
        addLog(`提交流程执行失败: ${e.message}`, 'error');

        submitSuccess = findAndClickQuizSubmitButton(doc);
      }

      if (submitSuccess) {
        addLog('已执行提交操作，等待确认弹窗...', 'info');

        await new Promise(r => setTimeout(r, 500));


        const confirmHandled = await handleSubmitConfirmDialog(doc, 3000);
        if (confirmHandled) {
          addLog('已处理提交确认弹窗', 'success');
        } else {
          addLog('未检测到确认弹窗或处理失败', 'info');
        }

        const submitCompleted = await waitForQuizSubmitCompletion(doc, 8000);
        if (submitCompleted) {
          addLog('章节测验提交完成，准备跳转下一节...', 'success');


          await new Promise(r => setTimeout(r, 2000));


          if (isStudyingChapters) {
            const jumpSuccess = gotoNextSection(doc);
            if (jumpSuccess) {
              addLog('已自动跳转到下一节', 'success');
            } else {
              addLog('自动跳转失败，请手动切换到下一节', 'error');
            }
          }
        } else {
          addLog('等待提交完成超时，但将继续尝试跳转', 'info');

          await new Promise(r => setTimeout(r, 1500));
          if (isStudyingChapters) gotoNextSection(doc);
        }
      } else {
        addLog('未找到提交按钮，跳过提交直接尝试跳转', 'info');

        await new Promise(r => setTimeout(r, 1000));
        if (isStudyingChapters) gotoNextSection(doc);
      }

      return true;
    } catch (e) {
      addLog(`章节测验自动作答失败: ${e.message}`, 'error');
      return false;
    }
  }
})();
