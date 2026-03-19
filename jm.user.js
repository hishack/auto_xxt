// ==UserScript==
// @name         超星学习通 - 复制题目 + 自动答题
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  一键复制题目+自动随机答题，可拖动悬浮框
// @author       2281046977
// @match        *://*.chaoxing.com/*
// @match        *://*.edu.cn/*
// @icon         http://pan-yz.chaoxing.com/favicon.ico
// @require      https://scriptcat.org/lib/668/1.0/TyprMd5.js
// @resource     Table https://www.forestpolice.org/ttf/2.0/table.json
// @grant        GM_getResourceText
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ================= 配置区 =================
  const LOG_MAX_ITEMS = 80;
  let fontHashParams = null;
  let currentFontData = null;
  let fontLoaded = false;
  let isAutoAnswering = false;

  // ================= 样式表 =================
  const MAX_Z_INDEX = 2147483647;

  const styles = `
    #answer-helper-panel {
      position: fixed;
      top: 150px;
      right: 24px;
      width: 320px;
      z-index: ${MAX_Z_INDEX - 1};
      font-family: "Microsoft YaHei", sans-serif;
      font-size: 14px;
      color: #111827;
      background: #ffffff;
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      overflow: hidden;
      cursor: move;
      user-select: none;
    }
    #answer-helper-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #6366f1;
      color: #fff;
      cursor: move;
    }
    #answer-helper-header .title {
      font-weight: 600;
      font-size: 14px;
    }
    #answer-helper-header .right {
      display: flex;
      gap: 8px;
    }
    #answer-helper-header .collapse-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      border-radius: 6px;
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #answer-helper-content {
      padding: 12px;
    }
    #answer-log {
      height: 120px;
      overflow-y: auto;
      border: 1px solid #f3f4f6;
      border-radius: 8px;
      padding: 8px;
      font-size: 11px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: #f9fafb;
      color: #4b5563;
      margin-bottom: 12px;
    }
    #answer-log::-webkit-scrollbar { width: 6px; }
    #answer-log::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }

    .log-item { margin: 3px 0; padding: 4px 8px; border-radius: 6px; background: #ffffff; border: 1px solid #f3f4f6; }
    .log-item.success { color: #059669; border-left: 3px solid #10b981; }
    .log-item.error { color: #dc2626; border-left: 3px solid #ef4444; }
    .log-item.info { color: #374151; border-left: 3px solid #6b7280; }
    .log-item.debug { color: #9ca3af; border-left: 3px solid #d1d5db; }

    .ah-btn {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: #374151;
      background: #ffffff;
    }
    .ah-btn:hover { background: #f9fafb; border-color: #d1d5db; transform: translateY(-1px); }
    .ah-btn:active { transform: translateY(0); }

    .ah-primary { background: #6366f1; color: #ffffff; border-color: #4f46e5; }
    .ah-primary:hover { background: #4f46e5; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }

    .ah-success { background: #10b981; color: #ffffff; border-color: #059669; }
    .ah-success:hover { background: #059669; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }

    .panel-actions {
      display: flex;
      gap: 10px;
    }
    .panel-actions .ah-btn {
      flex: 1;
    }
  `;

  // ================= 调试日志 =================

  function addLog(message, type = 'info') {
    try {
      const logContainer = document.getElementById('answer-log');
      if (!logContainer) return;

      const text = String(message || '').replace(/\s+/g, ' ').slice(0, 120);
      const logItem = document.createElement('div');
      logItem.className = `log-item ${type}`;
      logItem.textContent = `${new Date().toLocaleTimeString()} - ${text}`;
      logContainer.appendChild(logItem);

      const items = logContainer.querySelectorAll('.log-item');
      if (items.length > LOG_MAX_ITEMS) {
        logContainer.removeChild(logContainer.firstElementChild);
      }

      logContainer.scrollTop = logContainer.scrollHeight;
    } catch { }
  }

  // ================= 解密核心逻辑 =================

  function initDecryption() {
    try {
      const tableText = GM_getResourceText('Table');
      if (tableText) {
        fontHashParams = JSON.parse(tableText);
        addLog(`字体映射表加载成功, 条目数: ${Object.keys(fontHashParams).length}`, 'success');
      } else {
        addLog('字体映射表为空', 'error');
      }
    } catch (e) {
      addLog(`加载字体映射表失败: ${e.message}`, 'error');
    }
  }

  function parsePageFont() {
    const styleTags = document.getElementsByTagName('style');
    let fontBase64 = null;

    for (let style of styleTags) {
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
        addLog('页面加密字体解析成功', 'success');
      } catch (e) {
        fontLoaded = false;
        addLog(`解析字体出错: ${e.message}`, 'error');
      }
    } else {
      fontLoaded = false;
      addLog('未找到加密字体或已无需解密', 'debug');
    }
  }

  function getMd5Fn() {
    if (typeof md5 === 'function') return md5;
    if (typeof Typr !== 'undefined' && typeof Typr.md5 === 'function') return Typr.md5;
    if (window.md5) return window.md5;
    return null;
  }

  function decryptText(text) {
    if (!text) return "";
    if (!fontHashParams || !currentFontData) return text;

    const md5Fn = getMd5Fn();
    if (!md5Fn) return text;

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

  // ================= 提取题目 =================

  function extractQuestions() {
    parsePageFont();
    const questions = document.querySelectorAll('.TiMu');
    if (questions.length === 0) return null;

    addLog(`找到 ${questions.length} 个题目`, 'info');

    let resultText = "";
    questions.forEach((q, index) => {
      let titleDiv = q.querySelector('.Zy_TItle .clearfix') ||
        q.querySelector('.Zy_TItle') ||
        q.querySelector('.newZy_TItle') ||
        q.querySelector('.fontLabel');

      let titleText = titleDiv ? titleDiv.innerText.replace(/\s+/g, ' ').trim() : "未找到题目";
      titleText = decryptText(titleText);
      resultText += `【${index + 1}】 ${titleText}\n`;

      const options = q.querySelectorAll('ul li');
      if (options.length > 0) {
        options.forEach(opt => {
          let optText = opt.innerText.replace(/\s+/g, ' ').trim();
          optText = decryptText(optText);
          resultText += `\t${optText}\n`;
        });
      }
      resultText += "\n----------------------------------------\n\n";
    });

    addLog(`提取完成，共 ${questions.length} 题`, 'success');
    return resultText;
  }

  // ================= 自动答题 =================

  function autoAnswer() {
    if (isAutoAnswering) {
      addLog('正在自动答题中...', 'info');
      return;
    }
    isAutoAnswering = true;

    const questions = document.querySelectorAll('.TiMu');
    if (questions.length === 0) {
      addLog('未找到题目', 'error');
      isAutoAnswering = false;
      return;
    }

    addLog(`开始自动答题，共 ${questions.length} 题`, 'info');

    let answered = 0;
    questions.forEach((q, index) => {
      setTimeout(() => {
        // 获取题目类型 (0=单选, 1=多选, 3=判断)
        const questionType = q.getAttribute('data') || q.querySelector('.newTiMu')?.getAttribute('data') || '0';
        addLog(`第 ${index + 1} 题类型: ${questionType}`, 'debug');

        // 查找选项li元素
        let optionLis;
        if (questionType === '1') {
          // 多选题 - 使用 addMultipleChoice
          optionLis = q.querySelectorAll('ul li[onclick*="addMultipleChoice"]');
        } else {
          // 单选题/判断题 - 使用 addChoice
          optionLis = q.querySelectorAll('ul li[onclick*="addChoice"]');
        }

        addLog(`第 ${index + 1} 题找到 ${optionLis.length} 个选项`, 'debug');

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
            answered++;
            addLog(`第 ${index + 1} 题已选择 ${selectCount} 个选项`, 'debug');
          } else {
            // 单选题/判断题随机选一个
            const randomIndex = Math.floor(Math.random() * optionLis.length);
            if (typeof addChoice === 'function') {
              addChoice(optionLis[randomIndex]);
            } else {
              optionLis[randomIndex].click();
            }
            answered++;
            addLog(`第 ${index + 1} 题已随机选择`, 'debug');
          }
        }

        if (index === questions.length - 1) {
          setTimeout(() => {
            addLog(`自动答题完成！已回答 ${answered} 题`, 'success');
            isAutoAnswering = false;
          }, 500);
        }
      }, index * 800);
    });
  }

  // ================= 可拖动悬浮框 =================

  function makeDraggable(element) {
    let isDragging = false;
    let offsetX, offsetY;

    const header = element.querySelector('#answer-helper-header');
    if (!header) return;

    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      element.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      element.style.left = (e.clientX - offsetX) + 'px';
      element.style.top = (e.clientY - offsetY) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      element.style.cursor = 'move';
    });
  }

  // ================= 创建UI =================

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'answer-helper-panel';
    panel.innerHTML = `
      <div id="answer-helper-header">
        <span class="title">📚 学习通助手</span>
        <div class="right">
          <button class="collapse-btn" title="折叠/展开">
            <span style="font-size: 12px;">▼</span>
          </button>
        </div>
      </div>
      <div id="answer-helper-content">
        <div id="answer-log"></div>
        <div class="panel-actions">
          <button id="copy-questions" class="ah-btn ah-primary">
            <span>📋</span>
            <span>复制题目</span>
          </button>
          <button id="auto-answer" class="ah-btn ah-success">
            <span>🎲</span>
            <span>自动答题</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // 绑定事件
    document.getElementById('copy-questions').onclick = () => {
      const text = extractQuestions();
      if (text) {
        GM_setClipboard(text);
        addLog('题目已复制到剪贴板', 'success');
      } else {
        addLog('未找到题目', 'error');
      }
    };

    document.getElementById('auto-answer').onclick = () => {
      autoAnswer();
    };

    // 折叠功能
    const collapseBtn = panel.querySelector('.collapse-btn');
    const content = panel.querySelector('#answer-helper-content');
    let isCollapsed = false;
    collapseBtn.onclick = () => {
      isCollapsed = !isCollapsed;
      content.style.display = isCollapsed ? 'none' : 'block';
      collapseBtn.querySelector('span').textContent = isCollapsed ? '▲' : '▼';
    };

    makeDraggable(panel);
    return panel;
  }

  // ================= 初始化 =================

  function init() {
    const check = document.querySelectorAll('.TiMu');
    if (check.length === 0) {
      addLog('未检测到题目页面', 'debug');
      return;
    }

    addLog('检测到题目页面，初始化中...', 'info');

    initDecryption();
    parsePageFont();

    const styleEl = document.createElement('style');
    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);

    createPanel();
    addLog('助手加载完成', 'success');
  }

  setTimeout(() => {
    if (document.readyState === 'complete') {
      init();
    } else {
      window.addEventListener('load', init);
    }
  }, 2000);

})();
