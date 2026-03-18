// ==UserScript==
// @name         超星学习通考试/测验题目提取 (完整解密+导出Word/TXT)
// @namespace    http://tampermonkey.net/
// @version      4.6
// @description  一键提取学习通章节测验的题目，自动彻底解密乱码（参考字体解密脚本），支持导出Word和TXT，UI美化并置顶。
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
  // 字体映射表缓存
  let fontHashParams = null;
  let currentFontData = null;
  let fontLoaded = false; // 标记是否成功加载了页面字体

  // ================= 样式表 =================
  // 使用最大z-index保证在最上层
  const MAX_Z_INDEX = 2147483647;

  const styles = `
        /* 侧边悬浮按钮 */
        #cx-tool-panel {
            position: fixed;
            top: 150px;
            left: 10px;
            z-index: ${MAX_Z_INDEX - 1};
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .cx-btn {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            font-family: "Microsoft YaHei", sans-serif;
            text-align: center;
            transition: all 0.3s;
        }
        .cx-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 8px rgba(0,0,0,0.25); }
        .cx-btn:active { transform: translateY(0); }
        
        .cx-btn.primary { background-color: #1890ff; }
        .cx-btn.success { background-color: #52c41a; }
        .cx-btn.warning { background-color: #faad14; }

        /* 弹窗遮罩 */
        #cx-preview-modal {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(2px);
            z-index: ${MAX_Z_INDEX};
            display: none;
            justify-content: center;
            align-items: center;
        }
        /* 弹窗主体 */
        .cx-modal-content {
            background: white;
            width: 800px;
            max-width: 90%;
            height: 85vh;
            padding: 24px;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            animation: cxModalFadeIn 0.3s ease;
        }
        @keyframes cxModalFadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        
        .cx-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            border-bottom: 1px solid #eee;
            padding-bottom: 16px;
        }
        .cx-modal-title { font-size: 20px; font-weight: bold; color: #333; }
        .cx-close-btn {
            cursor: pointer;
            font-size: 28px;
            color: #999;
            line-height: 20px;
            transition: color 0.2s;
        }
        .cx-close-btn:hover { color: #333; }

        #cx-preview-text {
            flex: 1;
            width: 100%;
            resize: none;
            padding: 16px;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            font-family: Consolas, Monaco, "Courier New", monospace;
            font-size: 14px;
            line-height: 1.6;
            overflow-y: auto;
            background: #f9f9f9;
            color: #333;
        }
        #cx-preview-text:focus { outline: 2px solid #1890ff; border-color: transparent; }

        .cx-modal-footer {
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .cx-status-text {
            font-size: 13px;
            color: #666;
            background: #f0f0f0;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .cx-btn-group {
            display: flex;
            gap: 12px;
        }
    `;

  // ================= 解密核心逻辑 =================

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
    // 优先查找包含 font-cxsecret 的 style 标签
    // 很多时候字体定义在很长的 base64 串中
    const styles = document.getElementsByTagName('style');
    let fontBase64 = null;

    for (let style of styles) {
      const content = style.textContent;
      if (content.includes('font-cxsecret') && content.includes('base64,')) {
        // 正则提取 base64 内容，兼容换行和不同结束符
        const match = content.match(/base64,([\w\W]+?)'/);
        if (match && match[1]) {
          fontBase64 = match[1];
          break;
        }
      }
    }

    if (fontBase64) {
      try {
        // 处理 Base64
        const binary_string = window.atob(fontBase64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary_string.charCodeAt(i);
        }

        // Typr 解析
        const font = Typr.parse(bytes)[0];
        currentFontData = font;
        fontLoaded = true;
        console.log('ChaoxingExtractor: 页面加密字体解析成功');
      } catch (e) {
        console.error('ChaoxingExtractor: 解析字体出错', e);
        fontLoaded = false;
      }
    } else {
      console.log('ChaoxingExtractor: 未在页面找到加密字体 (font-cxsecret) 或已无需解密');
      fontLoaded = false;
    }
  }

  // 获取MD5函数
  function getMd5Fn() {
    // 兼容各种加载方式
    if (typeof md5 === 'function') return md5;
    if (typeof Typr !== 'undefined' && typeof Typr.md5 === 'function') return Typr.md5;
    if (window.md5) return window.md5;
    return null;
  }

  // 将文本中的乱码解密 (关键修复)
  function decryptText(text) {
    if (!text) return "";
    // 如果没有字体数据或者映射表，直接返回原文本
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

      // 尝试获取字形索引
      const glyphIndex = Typr.U.codeToGlyph(currentFontData, code);

      // 如果 glyphIndex > 0，说明这个字符在这个自定义字体里有定义
      if (glyphIndex > 0) {
        // 获取字形路径
        const path = Typr.U.glyphToPath(currentFontData, glyphIndex);
        if (path) {
          const pathStr = JSON.stringify(path);

          // 【关键修复】：参考“字体解密.js”，需要 slice(24) 截取后8位
          const hash = md5Fn(pathStr).slice(24);

          // 查找 hash 对应的文字
          let match = fontHashParams[hash];

          if (match) {
            // 映射表中存储的是 unicode 编码 (int)，需要转回字符
            // 有些表存的是字符，有些是int，做个兼容
            if (typeof match === 'number') {
              result += String.fromCharCode(match);
            } else {
              result += match;
            }
            continue; // 找到替换，跳过原字符
          }
        }
      }
      // 没找到或者不用替换，保留原字符
      result += char;
    }
    return result;
  }

  // ================= 提取逻辑 =================

  function extractContent() {
    // 每次提取前尝试刷新一下字体解析
    parsePageFont();

    const questions = document.querySelectorAll('.TiMu');
    if (questions.length === 0) return null;

    let resultText = "";
    // 用于导出 Word 的 HTML 结构
    let rawHtml = `
            <html>
            <head>
                <meta charset='utf-8'>
                <title>学习通习题导出</title>
                <style>
                    body { font-family: 'SimSun', '宋体', serif; line-height: 1.6; }
                    .q-block { margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
                    .q-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
                    .q-opt { margin-left: 20px; }
                    .q-ans { margin-top: 10px; background: #f5f5f5; padding: 8px; color: #d32f2f; font-weight: bold; }
                </style>
            </head>
            <body>
            <h1 style="text-align:center;">学习通习题导出</h1>
        `;

    questions.forEach((q, index) => {
      // --- 题目 ---
      let titleDiv = q.querySelector('.Zy_TItle .clearfix') ||
        q.querySelector('.Zy_TItle') ||
        q.querySelector('.newZy_TItle') ||
        q.querySelector('.fontLabel'); // 兼容更多选择器

      // 深度清理文本，处理可能存在的隐藏元素
      let titleText = titleDiv ? titleDiv.innerText.replace(/\s+/g, ' ').trim() : "未找到题目";

      // 【解密】
      titleText = decryptText(titleText);

      resultText += `【${index + 1}】 ${titleText}\n`;
      rawHtml += `<div class="q-block"><p class="q-title">【${index + 1}】 ${titleText}</p><ul>`;

      // --- 选项 ---
      // 兼容 li 下直接是文本，或者 p 标签，或者 a 标签的情况
      const options = q.querySelectorAll('ul li');
      if (options.length > 0) {
        options.forEach(opt => {
          let optText = opt.innerText.replace(/\s+/g, ' ').trim();
          optText = decryptText(optText);

          // 判断是否被选中/正确
          const isChecked = opt.querySelector('input:checked') || opt.querySelector('.ri') || opt.querySelector('.dui');
          const mark = isChecked ? " [已选]" : "";

          resultText += `\t${optText}${mark}\n`;
          rawHtml += `<li class="q-opt">${optText}${mark}</li>`;
        });
      }

      // --- 答案/解析提取 ---
      const answerDiv = q.querySelector('.newAnswerBx') || q.querySelector('.answerBx') || q.querySelector('.lookAnswer');

      if (answerDiv) {
        let answerBlockText = answerDiv.innerText.replace(/\s+/g, ' ').trim();
        answerBlockText = decryptText(answerBlockText);

        if (answerBlockText) {
          resultText += `\n${answerBlockText}\n`;
          rawHtml += `</ul><div class="q-ans">${answerBlockText}</div></div>`;
        } else {
          rawHtml += `</ul></div>`;
        }
      } else {
        rawHtml += `</ul></div>`;
      }

      resultText += "\n----------------------------------------\n\n";
    });

    rawHtml += "</body></html>";
    return { text: resultText, html: rawHtml, count: questions.length };
  }

  // ================= 导出功能函数 =================

  // 获取动态文件名
  function getExportFileName(extension) {
    let name = "学习通题目";

    // 优先尝试用户指定的选择器
    const userSelector = document.querySelector("#RightCon > div.radiusBG > div > div.ceyan_name > h3");
    // 备用选择器
    const fallbackSelector = document.querySelector(".ceyan_name h3") || document.querySelector("h3");

    const target = userSelector || fallbackSelector;

    if (target && target.innerText) {
      name = target.innerText.replace(/\s+/g, ' ').trim();
    } else if (document.title) {
      name = document.title.replace(/\s+/g, ' ').trim();
    }

    // 去除文件名非法字符
    name = name.replace(/[\\/:*?"<>|]/g, "_");

    const date = new Date();
    const timeStr = `${date.getMonth() + 1}月${date.getDate()}日`;

    return `${name}_${timeStr}.${extension}`;
  }

  function exportToWord(htmlContent) {
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getExportFileName('doc');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function exportToTxt(textContent) {
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getExportFileName('txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function showModal(data) {
    let modal = document.getElementById('cx-preview-modal');
    // 状态文本
    const statusStr = `字体解密状态: ${fontLoaded ? '✅ 字体已解析' : '⚠️ 无加密字体'} | 映射表: ${fontHashParams ? '✅ 已加载' : '❌ 未加载'}`;

    if (!modal) {
      const modalHtml = `
                <div id="cx-preview-modal">
                    <div class="cx-modal-content">
                        <div class="cx-modal-header">
                            <span class="cx-modal-title">📝 题目预览 (共 ${data.count} 题)</span>
                            <span class="cx-close-btn" onclick="document.getElementById('cx-preview-modal').style.display='none'">&times;</span>
                        </div>
                        <textarea id="cx-preview-text" readonly></textarea>
                        <div class="cx-modal-footer">
                            <span class="cx-status-text" id="cx-status-info">${statusStr}</span>
                            <div class="cx-btn-group">
                                <button class="cx-btn primary" id="cx-copy-btn">复制全部</button>
                                <button class="cx-btn warning" id="cx-txt-btn">导出 TXT</button>
                                <button class="cx-btn success" id="cx-word-btn">导出 Word</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modal = document.getElementById('cx-preview-modal');

      // 绑定事件
      document.getElementById('cx-copy-btn').onclick = () => {
        const text = document.getElementById('cx-preview-text').value;
        GM_setClipboard(text);

        // 简单的提示动画
        const btn = document.getElementById('cx-copy-btn');
        const originalText = btn.innerText;
        btn.innerText = '已复制！';
        btn.style.backgroundColor = '#52c41a';
        setTimeout(() => {
          btn.innerText = originalText;
          btn.style.backgroundColor = '';
        }, 1500);
      };

      document.getElementById('cx-word-btn').onclick = () => {
        const currentData = extractContent(); // 重新获取以防变动
        if (currentData) exportToWord(currentData.html);
      };

      document.getElementById('cx-txt-btn').onclick = () => {
        const currentData = extractContent();
        if (currentData) exportToTxt(currentData.text);
      };

      // 点击遮罩关闭
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };

    } else {
      // 更新状态
      document.getElementById('cx-status-info').innerText = statusStr;
    }

    document.getElementById('cx-preview-text').value = data.text;
    modal.style.display = 'flex';
  }

  // ================= 初始化 =================

  function init() {
    // TiMu 是题目块，如果没有题目块则不显示按钮
    const check = document.querySelectorAll('.TiMu');
    if (check.length === 0) return;

    initDecryption();
    parsePageFont();

    const styleEl = document.createElement('style');
    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);

    const toolPanel = document.createElement('div');
    toolPanel.id = 'cx-tool-panel';

    // 主按钮：提取并预览
    const mainBtn = document.createElement('button');
    mainBtn.className = 'cx-btn primary';
    mainBtn.innerHTML = '📑 提取题目';
    mainBtn.title = '点击提取本页所有题目、选项及答案并预览';
    mainBtn.onclick = () => {
      const data = extractContent();
      if (data) {
        showModal(data);
      } else {
        alert('未找到题目，请确保在测验页面内');
      }
    };

    // 快速下载按钮组
    const downloadGroup = document.createElement('div');
    downloadGroup.style.display = 'flex';
    downloadGroup.style.gap = '5px'; // 按钮间距

    const wordBtn = document.createElement('button');
    wordBtn.className = 'cx-btn success';
    wordBtn.style.flex = '1'; // 均分宽度
    wordBtn.style.padding = '8px 5px';
    wordBtn.innerHTML = '⬇️ Word';
    wordBtn.title = '直接导出 Word 文档';
    wordBtn.onclick = () => {
      const data = extractContent();
      if (data) exportToWord(data.html);
      else alert('未找到题目');
    };

    const txtBtn = document.createElement('button');
    txtBtn.className = 'cx-btn warning';
    txtBtn.style.flex = '1'; // 均分宽度
    txtBtn.style.padding = '8px 5px';
    txtBtn.innerHTML = '⬇️ TXT';
    txtBtn.title = '直接导出 TXT 文件';
    txtBtn.onclick = () => {
      const data = extractContent();
      if (data) exportToTxt(data.text);
      else alert('未找到题目');
    };

    downloadGroup.appendChild(wordBtn);
    downloadGroup.appendChild(txtBtn);

    toolPanel.appendChild(mainBtn);
    toolPanel.appendChild(downloadGroup);
    document.body.appendChild(toolPanel);
  }

  // 延时加载，确保页面元素特别是iframe加载完成
  setTimeout(() => {
    if (document.readyState === 'complete') {
      init();
    } else {
      window.addEventListener('load', init);
    }
  }, 2000); // 稍微延长等待时间


})();
