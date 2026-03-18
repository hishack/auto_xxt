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

// 导入样式 - 打包时会自动替换为GM_addStyle
import './styles/main.css';

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
