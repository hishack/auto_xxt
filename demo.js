// ==UserScript==
// @name         🏅学习通AI研习助手|💡智能刷课+自动答题|🛠️ 无需配置|♾️不限次数永久使用|🤖 AI智能答题|🔄长期维护更新
// @namespace    http://tampermonkey.net/
// @version      1.1.9
// @description  采用AI大模型，题目识别准、作答快，所有题目均可作答。支持自动刷课、自动答题、自动完成章节测试，简洁界面、稳定服务，持续适配平台更新。
// @author       kail
// @match        *://*.chaoxing.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @connect      api.116611.xyz
// @resource     typrMd5Lib https://116611.xyz/typr-md5.js
// @resource     fontTableData https://116611.xyz/table.json
// @license CC-BY-NC-ND-4.0
// @antifeature  payment  脚本存在第三方答题接口付费功能

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


  (function () {
    function _b64ToBytes(b64) { const bin = atob(b64); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
    function _bytesToStr(arr) { let s = ''; for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]); return s; }
    function _strToBytes(s) { const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
    function _xor(a, b) { const out = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i % b.length]; return out; }
    const __S = [100, 121, 96, 105, 102, 109, 113, 102, 115, 96, 116, 98, 109, 117, 96, 51, 49, 51, 54].map(c => c - 1);
    const __SALT = String.fromCharCode.apply(null, __S);
    const __ENC = "idiM9YBNCEBSu80fAcWJtglB3UgCOQSNSUCG2EFbmlWW7AyIJkSb/kgNWgCHsoEA";
    function __getDSK() {
      try {
        const step1 = __ENC.split('').reverse().join('');
        const xored = _b64ToBytes(step1);
        const plainB64Bytes = _xor(xored, _strToBytes(__SALT));
        const plainB64 = _bytesToStr(plainB64Bytes);
        return atob(plainB64);
      } catch (e) { return ''; }
    }
    window.__getDeepseekKey = __getDSK;
  })();


  const DEEPSEEK_PROXY_BASE = 'https://api.116611.xyz';

  const DEEPSEEK_MODEL = 'deepseek-chat';
  const DEEPSEEK_API_URL = `${DEEPSEEK_PROXY_BASE}/v1/chat/completions`;

  function deepseekChat(messages, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({
          method: 'POST',
          url: DEEPSEEK_API_URL,
          headers: {
            'Content-Type': 'application/json',
            'X-App-Token': __getDSAuth()
          },
          data: JSON.stringify({ model: DEEPSEEK_MODEL, messages, ...options }),
          timeout: 60000,
          onload: (r) => {
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


  const API_BASE = 'https://116611.xyz';
  const MONEY_YUAN = (() => {
    try {
      const b64 = 'OC4wMA==';
      return atob(b64);
    } catch {
      return '8.00';
    }
  })();
  const PAY_NAME = 'XHelper 解锁/赞助';
  const DEFAULT_PAY = 'wxpay';
  const LS_KEY_DEV_ID = 'cxhelper_device_id';
  const LS_KEY_FREE = 'cxhelper_free_used';
  const LS_KEY_LICENSED = 'cxhelper_licensed';
  const POLL_MS_PAY = 3000;
  const POLL_MAX_PAY = 100;


  const getFreeLimit = (() => {
    let cached = null;
    return function () {
      if (cached != null) return cached;
      try {

        const b64 = 'JDEw';
        const decoded = atob(b64);
        const n = parseInt(decoded.replace(/\D/g, ''), 10);
        cached = Number.isFinite(n) ? n : 10;
      } catch {
        cached = 10;
      }
      return cached;
    };
  })();

  function getDeviceIdPaid() {
    try {
      let id = localStorage.getItem(LS_KEY_DEV_ID);
      if (!id) {
        id = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
        localStorage.setItem(LS_KEY_DEV_ID, id);
      }
      return id;
    } catch { return 'dev_' + Math.random().toString(36).slice(2); }
  }
  const DEVICE_ID_PAID = getDeviceIdPaid();

  function getCookie(key) {
    try {
      const name = key + '=';
      const parts = document.cookie.split(';');
      for (let part of parts) {
        const s = part.trim();
        if (s.indexOf(name) === 0) return decodeURIComponent(s.substring(name.length));
      }
      return '';
    } catch { return ''; }
  }
  function setCookie(key, value, days, domain) {
    try {
      const d = new Date();
      d.setTime(d.getTime() + ((days || 365) * 24 * 60 * 60 * 1000));
      const expires = 'expires=' + d.toUTCString();
      const dm = domain ? ';domain=' + domain : '';
      document.cookie = key + '=' + encodeURIComponent(value) + ';path=/' + ';' + expires + dm;
    } catch { }
  }
  function isLocallyLicensed() {
    try {
      // 优先从跨子域Cookie读取，保障不同页面一致
      const c = getCookie(LS_KEY_LICENSED);
      if (c === '1') return true;
      return localStorage.getItem(LS_KEY_LICENSED) === '1';
    } catch { return false; }
  }
  function setLocallyLicensed() {
    try { localStorage.setItem(LS_KEY_LICENSED, '1'); } catch { }
    // 写入跨子域Cookie，统一所有 *.chaoxing.com 页面状态
    try { setCookie(LS_KEY_LICENSED, '1', 365, '.chaoxing.com'); } catch { }
  }
  function getFreeUsedCount() {
    try { return parseInt(localStorage.getItem(LS_KEY_FREE) || '0', 10) || 0; } catch { return 0; }
  }
  function incFreeUsedCount() {
    try { const n = getFreeUsedCount() + 1; localStorage.setItem(LS_KEY_FREE, String(n)); return n; } catch { return 0; }
  }

  async function checkLicensePaid() {
    if (isLocallyLicensed()) return true;
    try {
      const r = await fetch(`${API_BASE}/api/license/status?deviceId=${encodeURIComponent(DEVICE_ID_PAID)}`, { credentials: 'omit' });
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const data = ct.includes('application/json') ? await r.json() : await r.text();
      const ok = !!(data && data.licensed);
      if (ok) setLocallyLicensed();
      // try { updateTrialBadge(); } catch {}
      return ok;
    } catch { return false; }
  }

  async function startPaymentPaid(payType) {
    const win = window.open('', '_blank');
    try {
      const resp = await fetch(`${API_BASE}/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: PAY_NAME,
          money: MONEY_YUAN,
          type: payType || DEFAULT_PAY,
          param: DEVICE_ID_PAID
        })
      });
      const html = await resp.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
      return true;
    } catch (e) {
      if (win) win.close();
      alert('发起支付失败：' + e.message);
      return false;
    }
  }

  async function pollUntilLicensedPaid(onProgress) {
    for (let i = 0; i < POLL_MAX_PAY; i++) {
      if (onProgress) { try { onProgress(i); } catch { } }
      const ok = await checkLicensePaid();
      if (ok) { setLocallyLicensed(); return true; }
      await new Promise(r => setTimeout(r, POLL_MS_PAY));
    }
    return false;
  }

  function showPayModalPaid(messageText) {
    return new Promise(resolve => {
      const mask = document.createElement('div');
      mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999998;backdrop-filter:blur(4px);';
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:50%;top:120px;transform:translateX(-50%);width:420px;background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;z-index:999999;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Arial;';
      const msg = messageText || '试用已用完，打赏8元永久解锁哦';
      box.innerHTML = (
        '<div style="padding:18px 24px;border-bottom:1px solid #f3f4f6;font-weight:700;font-size:16px;color:#111827;">解锁全部功能（永久）</div>' +
        '<div style="padding:24px;">' +
        '<div style="margin-bottom:16px;font-size:14px;color:#4b5563;line-height:1.5;">' + msg + '</div>' +
        '<div style="margin-bottom:20px;background:#f9fafb;padding:16px;border-radius:12px;border:1px solid #f3f4f6;">' +
        '<div style="display:flex;gap:20px;">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;font-weight:500;color:#374151;"><input type="radio" name="cx_pay" value="wxpay" checked style="accent-color:#6366f1;"> 微信支付</label>' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;font-weight:500;color:#374151;"><input type="radio" name="cx_pay" value="alipay" style="accent-color:#6366f1;"> 支付宝</label>' +
        '</div>' +
        '<div style="color:#9ca3af;font-size:12px;margin-top:10px;">若支付方式不可用请尝试切换</div>' +
        '</div>' +
        '<div id="cx_tip_paid" style="color:#6b7280;font-size:13px;line-height:1.5;padding:0 4px;">点击"去支付"将打开收银台，完成后此处会自动检测。</div>' +
        '</div>' +
        '<div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:right;display:flex;justify-content:flex-end;gap:12px;">' +
        '<button id="cx_cancel_paid" style="padding:10px 20px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;color:#4b5563;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.2s;">取消</button>' +
        '<button id="cx_go_pay" style="padding:10px 24px;border-radius:10px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.2s;box-shadow:0 4px 6px -1px rgba(99, 102, 241, 0.2);">去支付</button>' +
        '</div>'
      );
      document.body.appendChild(mask);
      document.body.appendChild(box);

      const tip = box.querySelector('#cx_tip_paid');
      const btnPay = box.querySelector('#cx_go_pay');
      const btnCancel = box.querySelector('#cx_cancel_paid');

      function close() { try { box.remove(); mask.remove(); } catch { } }

      btnCancel.onclick = () => { close(); resolve(false); };
      btnPay.onclick = async () => {
        btnPay.disabled = true;
        btnPay.textContent = '打开收银台...';
        const payType = (box.querySelector('input[name="cx_pay"]:checked') || {}).value || DEFAULT_PAY;
        const ok = await startPaymentPaid(payType);
        if (!ok) { btnPay.disabled = false; btnPay.textContent = '去支付'; return; }
        btnPay.textContent = '检测支付中...';
        if (tip) tip.innerHTML = '已打开收银台，请完成支付，完成后此处会自动解锁...<br><span style="color:#6366f1;font-size:12px;margin-top:4px;display:block;font-weight:600;">💡 若无法打开支付页面请尝试连接手机热点网络</span>';
        const done = await pollUntilLicensedPaid();
        if (done) {
          if (tip) tip.textContent = '支付成功，正在解锁...';
          setLocallyLicensed();
          try { updateTrialBadge(); } catch { }
          setTimeout(() => { close(); resolve(true); }, 500);
        } else {
          btnPay.disabled = false;
          btnPay.textContent = '去支付';
          if (tip) tip.textContent = '未检测到支付完成，可重试或稍后再次打开本面板。';
        }
      };
    });
  }

  function showFeedbackModal() {
    const mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999998;backdrop-filter:blur(4px);';
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:50%;top:120px;transform:translateX(-50%);width:400px;background:#fff;border-radius:16px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);overflow:hidden;z-index:999999;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Arial;';
    box.innerHTML = (
      '<div style="padding:18px 24px;border-bottom:1px solid #f3f4f6;font-weight:700;font-size:16px;color:#111827;">意见反馈</div>' +
      '<div style="padding:24px;text-align:center;">' +
      '<div style="margin-bottom:20px;font-size:14px;color:#4b5563;line-height:1.6;">' +
      '如果您在使用过程中遇到问题或有任何建议，欢迎通过以下方式联系我们：' +
      '</div>' +
      '<div style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:20px;margin:16px 0;">' +
      '<div style="font-size:13px;font-weight:600;color:#6366f1;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">联系邮箱</div>' +
      '<div style="font-size:18px;font-weight:700;color:#111827;cursor:pointer;display:inline-block;padding:4px 8px;border-radius:6px;transition:background 0.2s;" onclick="navigator.clipboard.writeText(\'2036470448@qq.com\')" title="点击复制" onmouseover="this.style.background=\'#eef2ff\'" onmouseout="this.style.background=\'transparent\'">2036470448@qq.com</div>' +
      '<div style="font-size:12px;color:#9ca3af;margin-top:8px;">点击邮箱地址即可复制</div>' +
      '</div>' +
      '<div style="font-size:13px;color:#6b7280;margin-top:16px;line-height:1.5;">我们将会认真对待每一条反馈，并且尽快回复您的问题。您的建议是我们改进产品的重要动力！</div>' +
      '</div>' +
      '<div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:right;">' +
      '<button id="feedback-close" style="padding:10px 24px;border-radius:10px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.2s;box-shadow:0 4px 6px -1px rgba(99, 102, 241, 0.2);">关闭</button>' +
      '</div>'
    );
    document.body.appendChild(mask);
    document.body.appendChild(box);

    const closeBtn = box.querySelector('#feedback-close');
    function close() {
      try {
        box.remove();
        mask.remove();
      } catch { }
    }

    closeBtn.onclick = close;
    mask.onclick = close;


    const emailDiv = box.querySelector('[onclick*="clipboard"]');
    if (emailDiv) {
      emailDiv.addEventListener('click', function () {
        const originalText = this.innerHTML;
        this.innerHTML = '✅ 已复制到剪贴板';
        this.style.color = '#2563eb';
        setTimeout(() => {
          this.innerHTML = originalText;
          this.style.color = '#333';
        }, 2000);
      });
    }
  }

  async function ensureAccessAllowed() {
    if (await checkLicensePaid()) return true;
    const used = getFreeUsedCount();
    if (used < getFreeLimit()) { incFreeUsedCount(); try { updateTrialBadge(); } catch { } return true; }
    const ok = await showPayModalPaid();
    if (ok) { setLocallyLicensed(); try { updateTrialBadge(); } catch { } return true; }
    throw new Error('试用已用完，请解锁后继续使用');
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

        /* Trial Badge */
        #answer-helper-panel .cx-trial-badge { position: absolute; left: 16px; bottom: 12px; color: #9ca3af; font-size: 11px; }
        #answer-helper-panel .cx-trial-badge .trial-buy-btn {
            display: inline-block;
            margin-left: 8px;
            padding: 2px 8px;
            font-size: 11px;
            border: 1px solid #e0e7ff;
            background: #eef2ff;
            color: #4f46e5;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        }
        #answer-helper-panel .cx-trial-badge .trial-buy-btn:hover { background: #e0e7ff; border-color: #c7d2fe; }
    `);


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
                                    <span class="button-text">一键答题</span>
                                </button>
                                <button id="pause-answer" class="ah-btn ah-danger" style="display:none;">
                                    <span class="button-icon">⏸</span>
                                    <span class="button-text">暂停答题</span>
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
                    </div>
                </div>
            </div>
            <div id="cx_trial_badge" class="cx-trial-badge">
                检测中...
                <button id="buy-license" class="trial-buy-btn" style="display:none">购买授权</button>
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
    document.getElementById('start-answer')?.addEventListener('click', () => {
      addLog('本助手仅供学习研究，请遵守课程与平台规则。', 'info');
      addLog('开始自动答题...');
      autoAnswer();
    });
    document.getElementById('pause-answer')?.addEventListener('click', () => {
      isAnswering = false;
      addLog('正在暂停自动答题...', 'info');
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

    const buyBtn = document.getElementById('buy-license');
    if (buyBtn) {
      buyBtn.addEventListener('click', async () => {
        try {
          await showPayModalPaid('免费试用，打赏8元永久解锁哦');
        } catch (e) {
          addLog('打开支付弹窗失败: ' + (e && e.message ? e.message : e), 'error');
        }
      });
    }
    document.getElementById('feedback-btn')?.addEventListener('click', () => { showFeedbackModal(); });


    setTimeout(updateTrialBadge, 0);
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

      const possibleSelectors = ['.question', '.questionLi', '.subject_item', '.examPaper_subject', '.questionContainer', '.q-item', '.subject_node', '[class*="question"]', '[class*="subject"]', '.ti-item', '.exam-item'];
      let questions = [];
      for (let selector of possibleSelectors) {
        questions = rootDoc.querySelectorAll(selector);
        if (questions.length > 0) break;
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
        if (doc.querySelector('.question, .questionLi, .subject_item, .examPaper_subject, .questionContainer, .q-item, .subject_node, [class*="question"], .ti-item, .exam-item')) { found = true; return; }
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


  async function updateTrialBadge() {
    try {
      const el = document.getElementById('cx_trial_badge');
      if (!el) return;
      const licensed = await checkLicensePaid();

      if (licensed) {
        el.innerHTML = '永久激活，感谢赞助';
        return;
      }

      const used = getFreeUsedCount();
      const remain = Math.max(0, getFreeLimit() - used);
      el.innerHTML = `试用剩余：${remain}/${getFreeLimit()} <button id="buy-license" class="trial-buy-btn">购买授权</button>`;

      const btn = document.getElementById('buy-license');
      if (btn) {
        btn.addEventListener('click', async () => {
          try {
            await showPayModalPaid('免费试用，打赏8元永久解锁哦');
          } catch (e) {
            addLog('打开支付弹窗失败: ' + (e && e.message ? e.message : e), 'error');
          }
        });
      }
    } catch { }
  }


  function getQuestionInfo(questionElement) {
    try {

      addLog('题目元素HTML结构：' + questionElement.outerHTML.substring(0, 200) + '...', 'debug');


      const questionId = questionElement.id || '';
      addLog(`题目ID: ${questionId}`, 'debug');


      const possibleTypeSelectors = [
        '.type_title',
        '.mark_name',
        '.questionType',
        'div[class*="type"]',
        'div[class*="Type"]',
        '.subject_type',
        '.q-type',
        'div[class*="questionType"]',
        '.stem_type'
      ];

      const possibleQuestionSelectors = [
        '.subject_describe',
        '.mark_name',
        '.questionContent',
        '.title',
        'div[class*="title"]',
        '.subject_stem',
        '.q-body',
        '.question-content',
        '.stem-content',
        '.stem_txt'
      ];


      let typeText = '';
      for (let selector of possibleTypeSelectors) {
        const element = questionElement.querySelector(selector);
        if (element) {
          typeText = element.textContent.trim();
          addLog(`找到题目类型: ${typeText}，使用选择器: ${selector}`, 'debug');
          break;
        }
      }

      let type = '';
      if (typeText.includes('单选题')) type = 'single';
      else if (typeText.includes('多选题')) type = 'multiple';
      else if (typeText.includes('判断题')) type = 'judge';
      else if (typeText.includes('填空题')) type = 'blank';
      else if (typeText.includes('简答题')) type = 'short';
      else if (typeText.includes('名词解释')) type = 'term';
      else if (typeText.includes('论述题')) type = 'essay';
      else if (typeText.includes('计算题')) type = 'calculation';
      else if (typeText.includes('完形填空')) type = 'cloze';
      else if (typeText.includes('写作题')) type = 'writing';
      else if (typeText.includes('连线题')) type = 'matching';
      else if (typeText.includes('分录题')) type = 'accounting';


      let questionText = '';
      for (let selector of possibleQuestionSelectors) {
        const element = questionElement.querySelector(selector);
        if (element) {
          questionText = element.textContent.trim();
          addLog(`找到题目内容: ${questionText.substring(0, 30)}...，使用选择器: ${selector}`, 'debug');
          break;
        }
      }


      const optionSelectors = [
        '.stem_answer > div',
        '.stem_answer div[class*="option"]',
        'div.stem_answer > div',
        `#${questionId} > div.stem_answer > div`,
        '.answer_p',
        '.subject_node',
        '.answer_options',
        '.options div'
      ];

      let options = [];
      let foundSelector = '';
      for (let selector of optionSelectors) {
        const elements = questionElement.querySelectorAll(selector);
        if (elements.length > 0) {
          options = Array.from(elements).map((option, index) => {
            const text = option.textContent.trim();
            const letter = String.fromCharCode(65 + index);
            addLog(`选项 ${letter}: ${text}`, 'debug');
            return text;
          });
          foundSelector = selector;
          addLog(`找到选项，使用选择器: ${selector}，数量: ${elements.length}`, 'debug');
          break;
        }
      }


      if (options.length === 0 && questionId) {
        for (let i = 1; i <= 6; i++) {
          const specificSelector = `#${questionId} > div.stem_answer > div:nth-child(${i})`;
          const element = document.querySelector(specificSelector);
          if (element) {
            options.push(element.textContent.trim());
            addLog(`使用nth-child选择器找到选项 ${i}: ${element.textContent.trim()}`, 'debug');
          }
        }
      }

      if (!type || !questionText) {
        addLog('未能完全识别题目信息', 'error');
      }

      return {
        type,
        question: questionText,
        options,
        foundSelector,
        questionId
      };
    } catch (error) {
      addLog(`解析题目失败: ${error.message}`, 'error');
      return null;
    }
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


  async function getAnswer(questionInfo) {

    try {
      await ensureAccessAllowed();
    } catch (e) {
      addLog(String(e && e.message ? e.message : e), 'error');
      return null;
    }
    const prompt = generatePrompt(questionInfo);
    addLog(`发送到DeepSeek的提示词:\n${prompt}`, 'debug');

    try {
      const modelParams = getModelParams(questionInfo.type);
      addLog(`使用模型参数: ${JSON.stringify(modelParams)}`, 'debug');

      const data = await deepseekChat([
        { role: "user", content: prompt }
      ], modelParams);
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response format');
      }

      const answer = data.choices[0].message.content.trim();
      return answer;
    } catch (error) {
      addLog(`API调用失败: ${error.message}`, 'error');
      return null;
    }
  }


  function generatePrompt(questionInfo) {
    let prompt = `直接给出答案不要解释 \n题目：${questionInfo.question}\n`;

    if (questionInfo.type === 'single' || questionInfo.type === 'multiple' || questionInfo.type === 'judge') {
      if (questionInfo.options && questionInfo.options.length > 0) {
        prompt += '选项：\n';
        questionInfo.options.forEach((option, index) => {
          const letter = String.fromCharCode(65 + index);

          const cleanOption = option.replace(/^[A-Z][\s.、．。]+|^\d+[\s.、．。]+/, '').trim();
          prompt += `${letter}. ${cleanOption}\n`;
        });


        if (questionInfo.type === 'single') {
          prompt += '\n请直接回答选项字母（A/B/C/D/...）';
        } else if (questionInfo.type === 'multiple') {
          prompt += '\n这是多选题，请列出所有正确选项的字母，用逗号分隔（如：A,B,D）';
        } else if (questionInfo.type === 'judge') {
          prompt += '\n这是判断题，请回答A表示正确，B表示错误';
        }
      }
    } else if (questionInfo.type === 'blank') {

      prompt += '\n这是填空题，请按顺序给出每个空的答案，用逗号分隔';
    }

    return prompt;
  }



  (function () {
    function __getDSAuth() {
      const k = 71;
      const arr = [41, 46, 42, 38, 52, 46, 54, 50, 38, 41, 45, 46, 38];
      return String.fromCharCode(...arr.map(n => n ^ k));
    }
    window.__getDSAuth = __getDSAuth;
  })();

  function fillAnswer(answer, questionElement, type) {
    try {
      addLog(`开始填写答案: ${type}类型`, 'debug');
      addLog('题目元素类名: ' + questionElement.className, 'debug');
      let filled = false;

      const questionId = questionElement.id;
      addLog(`处理题目ID: ${questionId}`, 'debug');

      switch (type) {
        case 'blank':
        case 'cloze': {

          const answers = answer.split(/[,，;；、]\s*/).map(a => a.trim()).filter(a => a);
          addLog(`解析到的答案数量: ${answers.length}`, 'debug');
          answers.forEach((ans, idx) => addLog(`第${idx + 1}个答案: ${ans}`, 'debug'));


          const editorElements = questionElement.querySelectorAll('[id^="answerEditor"]');
          if (editorElements.length > 0) {
            addLog(`找到UEditor元素数量: ${editorElements.length}`, 'debug');

            editorElements.forEach((editorElement, index) => {
              const editorId = editorElement.id;
              addLog(`处理第${index + 1}个编辑器: ${editorId}`, 'debug');


              if (index < answers.length) {
                const currentAnswer = answers[index];
                try {

                  if (typeof UE !== 'undefined' && UE.getEditor) {
                    const editor = UE.getEditor(editorId);
                    if (editor) {

                      if (editor.ready) {
                        editor.ready(() => {
                          editor.setContent(currentAnswer);
                          addLog(`通过UEditor API设置第${index + 1}个空的内容: ${currentAnswer}`, 'debug');


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
          let answerLetters;
          if (type === 'multiple') {
            answerLetters = answer.toUpperCase().split(/[,，、\s]+/).map(l => l.trim());
          } else {
            answerLetters = [answer.toUpperCase().trim()];
          }

          addLog(`识别到的选项字母: ${answerLetters.join(', ')}`, 'debug');

          for (const letter of answerLetters) {
            if (!/^[A-Z]$/.test(letter)) {
              addLog(`跳过无效的选项字母: ${letter}`, 'error');
              continue;
            }

            const index = letter.charCodeAt(0) - 65 + 1; // 1-based index for nth-child
            const specificSelector = `#${questionId} > div.stem_answer > div:nth-child(${index})`;
            const optionElement = document.querySelector(specificSelector);

            if (optionElement) {
              try {
                optionElement.click();
                addLog(`点击选项元素: ${specificSelector}`, 'debug');

                const input = optionElement.querySelector('input');
                if (input) {
                  input.click();
                  input.checked = true;
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                  addLog(`点击选项input元素`, 'debug');
                }

                const label = optionElement.querySelector('label');
                if (label) {
                  label.click();
                  addLog(`点击选项label元素`, 'debug');
                }

                filled = true;
              } catch (e) {
                addLog(`点击选项 ${letter} 失败: ${e.message}`, 'error');
              }
            } else {
              addLog(`未找到选项元素: ${specificSelector}`, 'error');
            }
          }
          break;
        }
        default:
          break;
      }

      if (filled) {
        addLog(`答案填写成功`, 'success');
      } else {
        addLog(`答案可能未成功填写，请检查`, 'error');
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

    } catch (error) {
      addLog(`答案填写失败: ${error.message}`, 'error');
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


      const questions = doc.querySelectorAll('.question, .questionLi, .subject_item, .examPaper_subject, .questionContainer, .q-item, .subject_node, [class*="question"], .ti-item, .exam-item');
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


  async function autoAnswer() {
    if (isAnswering) {
      addLog('自动答题已经在运行中...', 'info');
      return;
    }

    isAnswering = true;
    updateStatus(true);
    addLog('开始查找题目...', 'debug');

    try {

      addLog('当前页面URL: ' + window.location.href, 'debug');
      addLog('当前页面标题: ' + document.title, 'debug');


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

      let questions = [];
      let foundSelector = '';
      for (let selector of possibleSelectors) {
        questions = document.querySelectorAll(selector);
        if (questions.length > 0) {
          foundSelector = selector;
          addLog(`使用选择器 ${selector} 找到 ${questions.length} 个题目`, 'debug');
          break;
        }
      }


      if (questions.length === 0) {
        addLog('使用常规选择器未找到题目，尝试查找可能的题目容器...', 'debug');


        const allElements = document.querySelectorAll('*');
        const possibleQuestions = Array.from(allElements).filter(el => {
          const className = el.className || '';
          const id = el.id || '';
          const text = el.textContent || '';


          return (className + id + text).toLowerCase().includes('题目') ||
            (className + id).toLowerCase().includes('question') ||
            (className + id).toLowerCase().includes('subject') ||
            /^\d+[\.。]/.test(text.trim()); // 匹配数字开头的内容
        });

        if (possibleQuestions.length > 0) {
          questions = possibleQuestions;
          addLog(`通过内容分析找到 ${questions.length} 个可能的题目`, 'debug');
        }
      }

      if (questions.length === 0) {
        addLog('未找到任何题目，请确保页面已完全加载', 'error');

        addLog('页面主要内容：' + document.body.innerHTML.substring(0, 500) + '...', 'debug');
        return;
      }


      addLog(`共找到 ${questions.length} 个题目`, 'info');
      addLog('正在初始化中...', 'info');
      Array.from(questions).forEach((q, idx) => {
        addLog(`题目 ${idx + 1} 类名: ${q.className}, ID: ${q.id}`, 'debug');
      });

      for (let question of questions) {
        if (!isAnswering) {
          addLog('自动答题已暂停', 'info');
          break;
        }

        const questionInfo = getQuestionInfo(question);
        if (!questionInfo) {
          addLog('题目信息获取失败，跳过当前题目', 'error');
          continue;
        }

        addLog(`正在处理题目: ${questionInfo.question.substring(0, 30)}...`);
        addLog(`题目类型: ${questionInfo.type}`, 'debug');
        addLog(`选项数量: ${questionInfo.options.length}`, 'debug');

        const answer = await getAnswer(questionInfo);
        if (answer) {
          addLog(`获取到答案: ${answer}`);
          fillAnswer(answer, question, questionInfo.type);
        }

        if (isAnswering) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      addLog(`自动答题过程出错: ${error.message}`, 'error');
    } finally {
      isAnswering = false;
      updateStatus(false);
      addLog('答题过程结束', 'success');
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
