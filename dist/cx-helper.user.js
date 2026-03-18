// ==UserScript==
// @name         超星学习通助手
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  超星学习通(学习通)自动学习助手
// @author       kail
// @match        *://*.chaoxing.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @connect      api.116611.xyz
// @license      MIT
// ==/UserScript==

/**
 * 超星学习通助手 - 油猴脚本入口文件
 * @name CXHelper
 * @namespace CXHelper
 * @description 超星学习通(学习通)自动学习助手
 * @author kail
 * @match *://*.chaoxing.com/*
 * @grant GM_xmlhttpRequest
 * @grant GM_addStyle
 * @grant GM_getValue
 * @grant GM_setValue
 * @grant GM_registerMenuCommand
 * @grant GM_notification
 * @connect api.116611.xyz
 * @version 1.0.0
 */



// 导入样式 - 打包时会自动替换为GM_addStyle
GM_addStyle(`/* ============================================
   超星学习通助手 - 面板样式
   Author: kail
   ============================================ */

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

#answer-helper-header .collapse-btn:hover {
    background: #f3f4f6;
    color: #111827;
    border-color: #e5e7eb;
    transform: scale(1.05);
}

.collapse-btn-inner {
    width: 16px;
    height: 16px;
    position: relative;
}

.collapse-icon-bar.horizontal {
    width: 14px;
    height: 2px;
    background: currentColor;
    border-radius: 1px;
    position: absolute;
    left: 1px;
    top: 7px;
}

.collapse-icon-bar.vertical {
    width: 2px;
    height: 14px;
    background: currentColor;
    border-radius: 1px;
    position: absolute;
    left: 7px;
    top: 1px;
}

/* Content */
#answer-helper-content {
    padding: 12px 16px;
    overflow-y: auto;
    height: calc(var(--ah-panel-height) - 52px);
    max-height: calc(var(--ah-panel-height) - 52px);
}

#answer-helper-panel.collapsed #answer-helper-content {
    display: none;
}

#answer-helper-panel.collapsed {
    width: 240px;
    min-width: 240px;
    max-width: 240px;
    height: 52px !important;
    min-height: 52px !important;
    border-radius: 12px;
}

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

.panel-main {
    min-width: 0;
    grid-area: main;
}

.panel-actions {
    grid-area: actions;
}

.panel-actions.panel-row {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.panel-actions.panel-row .primary-pair {
    display: flex;
    gap: 10px;
    width: 100%;
}

.panel-actions.panel-row .primary-pair .pair-slot {
    flex: 1;
    display: flex;
}

.panel-actions.panel-row .primary-pair .pair-slot .ah-btn {
    flex: 1;
    min-height: 44px;
    border-radius: 12px;
}

.panel-actions.panel-row .ah-btn {
    min-height: 40px;
    padding: 8px 12px;
    border-radius: 10px;
}

/* Toast */
#no-task-toast {
    position: fixed;
    top: 24px;
    right: 24px;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.05);
    color: #111827;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
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

#answer-log::-webkit-scrollbar {
    width: 6px;
}

#answer-log::-webkit-scrollbar-track {
    background: transparent;
}

#answer-log::-webkit-scrollbar-thumb {
    background: #e5e7eb;
    border-radius: 10px;
}

#answer-log::-webkit-scrollbar-thumb:hover {
    background: #d1d5db;
}

.log-item {
    margin: 4px 0;
    padding: 6px 10px;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #f3f4f6;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.success { color: #059669; border-left: 3px solid #10b981; }
.error { color: #dc2626; border-left: 3px solid #ef4444; }
.info { color: #374151; border-left: 3px solid #6b7280; }
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

.ah-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.ah-btn:active {
    transform: translateY(0);
    box-shadow: none;
}

.ah-primary {
    background: #6366f1;
    color: #ffffff;
    border-color: #4f46e5;
}

.ah-primary:hover {
    background: #4f46e5;
    border-color: #4338ca;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.ah-danger {
    background: #ffffff;
    color: #ef4444;
    border-color: #fee2e2;
}

.ah-danger:hover {
    background: #fef2f2;
    border-color: #fca5a5;
}

.ah-secondary {
    background: #f9fafb;
    color: #4b5563;
    border-color: #f3f4f6;
}

.ah-secondary:hover {
    background: #f3f4f6;
    border-color: #e5e7eb;
}

.ah-success {
    background: #10b981;
    color: #ffffff;
    border-color: #059669;
}

.ah-success:hover {
    background: #059669;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* Speed buttons */
.speed-button {
    transition: all 0.2s ease;
    border-radius: 8px;
}

.speed-active {
    background: #6366f1 !important;
    color: #ffffff !important;
    border-color: #4f46e5 !important;
}

#playback-speed-controls.segmented {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    margin-top: 6px;
}

#playback-speed-controls.segmented .ah-btn {
    min-width: 60px;
    padding: 6px 8px;
    font-size: 12px;
}

/* Trial Badge */
#answer-helper-panel .cx-trial-badge {
    position: absolute;
    left: 16px;
    bottom: 12px;
    color: #9ca3af;
    font-size: 11px;
}

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

#answer-helper-panel .cx-trial-badge .trial-buy-btn:hover {
    background: #e0e7ff;
    border-color: #c7d2fe;
}
`);

(function() {
    'use strict';

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
    // 日志
    // ============================================
    function log() {
        console.log('[CXHelper]', ...arguments);
    }

    function error() {
        console.error('[CXHelper]', ...arguments);
    }

    // ============================================
    // 工具函数
    // ============================================
    function isStudyPage() {
        return /mycourse\/studentstudy|mooc2-ans|knowledgeId|chapterId/.test(location.href);
    }

    function getCookie(key) {
        const name = key + '=';
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1);
            if (c.indexOf(name) === 0) return c.substring(name.length, c.length);
        }
        return '';
    }

    function setCookie(key, value, days, domain) {
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = key + '=' + (value || '') + expires + '; path=/' + (domain ? '; domain=' + domain : '');
    }

    // ============================================
    // UI函数
    // ============================================
    let panelInstance = null;
    let studyTimerId = null;
    let isStudying = false;
    const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
    let currentSpeedIndex = 1;

    function createPanel() {
        const existingPanel = document.getElementById('answer-helper-panel');
        if (existingPanel) existingPanel.remove();

        const panel = document.createElement('div');
        panel.id = 'answer-helper-panel';
        panel.innerHTML = `
            <div id="answer-helper-header">
                <span class="title"><span class="accent"></span>学习助手</span>
                <span class="right">
                    <button class="collapse-btn" id="ah-collapse-btn" title="折叠">
                        <span class="collapse-btn-inner">
                            <span class="collapse-icon-bar horizontal"></span>
                            <span class="collapse-icon-bar vertical"></span>
                        </span>
                    </button>
                </span>
            </div>
            <div id="answer-helper-content">
                <div class="panel-body">
                    <div class="panel-main">
                        <div id="answer-log"></div>
                        <div id="playback-speed-controls" class="segmented"></div>
                    </div>
                    <div class="panel-actions panel-row">
                        <div class="primary-pair">
                            <div class="pair-slot">
                                <button class="ah-btn ah-primary" id="ah-start-btn">开始学习</button>
                            </div>
                            <div class="pair-slot">
                                <button class="ah-btn ah-danger" id="ah-stop-btn">停止学习</button>
                            </div>
                        </div>
                        <button class="ah-btn ah-secondary" id="ah-speed-btn">倍速: 1.5x</button>
                    </div>
                </div>
                <div class="cx-trial-badge">免费版 <span class="trial-buy-btn">购买专业版</span></div>
            </div>
        `;
        document.body.appendChild(panel);
        panelInstance = panel;
        return panel;
    }

    function bindPanelEvents() {
        const panel = document.getElementById('answer-helper-panel');
        if (!panel) return;

        // 折叠按钮
        const collapseBtn = document.getElementById('ah-collapse-btn');
        if (collapseBtn) {
            collapseBtn.addEventListener('click', () => {
                panel.classList.toggle('collapsed');
                const verticalBar = panel.querySelector('.collapse-icon-bar.vertical');
                if (verticalBar) {
                    verticalBar.style.display = panel.classList.contains('collapsed') ? 'none' : 'block';
                }
            });
        }

        // 开始按钮
        const startBtn = document.getElementById('ah-start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', startStudyChapters);
        }

        // 停止按钮
        const stopBtn = document.getElementById('ah-stop-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', stopStudyChapters);
        }

        // 速度按钮
        const speedBtn = document.getElementById('ah-speed-btn');
        if (speedBtn) {
            speedBtn.addEventListener('click', cyclePlaybackSpeed);
        }

        // 面板拖拽
        enablePanelDrag(panel);
    }

    function enablePanelDrag(panel) {
        const header = document.getElementById('answer-helper-header');
        if (!header) return;

        let isDragging = false, startX, startY, initialLeft, initialTop;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = panel.offsetLeft;
            initialTop = panel.offsetTop;
            panel.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            panel.style.left = (initialLeft + e.clientX - startX) + 'px';
            panel.style.top = (initialTop + e.clientY - startY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                panel.style.transition = '';
            }
        });
    }

    function initSpeedButtons() {
        const container = document.getElementById('playback-speed-controls');
        if (!container) return;
        container.innerHTML = '';
        SPEEDS.forEach((speed, index) => {
            const btn = document.createElement('button');
            btn.className = 'ah-btn speed-button' + (index === currentSpeedIndex ? ' speed-active' : '');
            btn.textContent = speed + 'x';
            btn.addEventListener('click', () => {
                setVideoPlaybackSpeed(speed);
                updateSpeedButtonsState();
            });
            container.appendChild(btn);
        });
    }

    function updateSpeedButtonsState() {
        document.querySelectorAll('.speed-button').forEach((btn, index) => {
            btn.classList.toggle('speed-active', index === currentSpeedIndex);
        });
        const speedBtn = document.getElementById('ah-speed-btn');
        if (speedBtn) speedBtn.textContent = '倍速: ' + SPEEDS[currentSpeedIndex] + 'x';
    }

    function cyclePlaybackSpeed() {
        currentSpeedIndex = (currentSpeedIndex + 1) % SPEEDS.length;
        setVideoPlaybackSpeed(SPEEDS[currentSpeedIndex]);
        updateSpeedButtonsState();
    }

    function setVideoPlaybackSpeed(speed) {
        const docs = [[document, 0]];
        try {
            for (let i = 0; i < window.frames.length; i++) {
                try {
                    if (window.frames[i].document?.body) {
                        docs.push([window.frames[i].document, i + 1]);
                    }
                } catch (e) {}
            }
        } catch (e) {}

        docs.forEach(([doc]) => {
            const videos = doc.querySelectorAll('video');
            videos.forEach(video => { video.playbackRate = speed; });
        });
    }

    // ============================================
    // 学习流程
    // ============================================
    function handleVideosInDocument(doc) {
        const videos = doc.querySelectorAll('video');
        let processedCount = 0;
        videos.forEach(video => {
            if (video.offsetParent === null) return;
            video.playbackRate = systemConfig.defaultSpeed;
            if (video.paused) {
                video.play().catch(() => {});
            }
            processedCount++;
        });
        return processedCount;
    }

    function startStudyChapters() {
        if (isStudying) return;
        isStudying = true;
        updateStatus(true);
        log('开始自动学习...');

        handleVideosInDocument(document);
        setVideoPlaybackSpeed(systemConfig.defaultSpeed);

        studyTimerId = setInterval(() => {
            handleVideosInDocument(document);
        }, 5000);
    }

    function stopStudyChapters() {
        if (!isStudying) return;
        isStudying = false;
        updateStatus(false);
        if (studyTimerId) {
            clearInterval(studyTimerId);
            studyTimerId = null;
        }
        log('已停止自动学习');
    }

    function updateStatus(running) {
        const startBtn = document.getElementById('ah-start-btn');
        const stopBtn = document.getElementById('ah-stop-btn');
        if (startBtn && stopBtn) {
            startBtn.disabled = running;
            stopBtn.disabled = !running;
        }
        addLog(running ? '开始自动学习...' : '已停止自动学习', 'info');
    }

    function addLog(message, type) {
        type = type || 'info';
        const logContainer = document.getElementById('answer-log');
        if (!logContainer) return;
        const logItem = document.createElement('div');
        logItem.className = 'log-item ' + type;
        logItem.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
        logContainer.appendChild(logItem);
        logContainer.scrollTop = logContainer.scrollHeight;
        const logs = logContainer.querySelectorAll('.log-item');
        if (logs.length > 50) logs[0].remove();
    }

    function showNoTaskToast() {
        const existing = document.getElementById('no-task-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'no-task-toast';
        toast.textContent = '当前没有学习任务';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ============================================
    // 初始化
    // ============================================
    function init() {
        // 检查是否为学习页面
        if (!isStudyPage()) {
            return;
        }

        log('初始化中...');

        // 创建UI面板
        createPanel();

        // 绑定事件
        bindPanelEvents();

        // 初始化速度按钮
        initSpeedButtons();

        log('初始化完成');
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
