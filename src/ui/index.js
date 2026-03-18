/**
 * 超星学习通助手 - UI模块
 * 包含面板创建、事件绑定等UI相关功能
 */

// 导入样式
import '../styles/main.css';

// ============================================
// 面板管理
// ============================================

let panelInstance = null;
let heartbeatTimerId = null;
let isRunning = false;

/**
 * 创建浮动面板
 */
function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'answer-helper-panel';

    // 如果面板已存在，先移除
    const existingPanel = document.getElementById('answer-helper-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    panel.innerHTML = `
        <div id="answer-helper-header">
            <span class="title">
                <span class="accent"></span>
                学习助手
            </span>
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
            <div class="cx-trial-badge">
                免费版 <span class="trial-buy-btn">购买专业版</span>
            </div>
        </div>
    `;

    document.body.appendChild(panel);
    panelInstance = panel;

    // 初始化速度按钮
    initSpeedButtons();

    return panel;
}

/**
 * 设置面板固定高度
 */
function setPanelFixedHeight(px) {
    const panel = document.getElementById('answer-helper-panel');
    if (panel) {
        panel.style.setProperty('--ah-panel-height', px + 'px');
    }
}

/**
 * 绑定面板事件
 */
function bindPanelEvents() {
    const panel = document.getElementById('answer-helper-panel');
    if (!panel) return;

    // 折叠按钮
    const collapseBtn = document.getElementById('ah-collapse-btn');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            const verticalBar = panel.querySelector('.collapse-icon-bar.vertical');
            if (panel.classList.contains('collapsed')) {
                if (verticalBar) verticalBar.style.display = 'none';
            } else {
                if (verticalBar) verticalBar.style.display = 'block';
            }
        });
    }

    // 开始按钮
    const startBtn = document.getElementById('ah-start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (typeof startStudyChapters === 'function') {
                startStudyChapters();
            }
        });
    }

    // 停止按钮
    const stopBtn = document.getElementById('ah-stop-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            if (typeof stopStudyChapters === 'function') {
                stopStudyChapters();
            }
        });
    }

    // 速度按钮
    const speedBtn = document.getElementById('ah-speed-btn');
    if (speedBtn) {
        speedBtn.addEventListener('click', () => {
            cyclePlaybackSpeed();
        });
    }

    // 面板拖拽
    enablePanelDrag(panel);
}

/**
 * 启用面板拖拽
 */
function enablePanelDrag(panel) {
    const header = document.getElementById('answer-helper-header');
    if (!header) return;

    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

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
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        panel.style.left = (initialLeft + dx) + 'px';
        panel.style.top = (initialTop + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.transition = '';
        }
    });
}

/**
 * 安全点击元素
 */
function safeClick(el) {
    if (!el) return false;
    try {
        el.click();
        return true;
    } catch (e) {
        logger.error('Click failed:', e);
        // 尝试使用dispatchEvent
        try {
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            el.dispatchEvent(event);
            return true;
        } catch (e2) {
            logger.error('DispatchEvent failed:', e2);
            return false;
        }
    }
}

/**
 * 遍历同源iframe
 */
function forEachSameOriginFrame(callback) {
    try {
        const frames = window.frames;
        for (let i = 0; i < frames.length; i++) {
            try {
                if (frames[i].document?.body) {
                    callback(frames[i], i);
                }
            } catch (e) {
                // 跨域frame，跳过
            }
        }
    } catch (e) {
        logger.error('forEachSameOriginFrame error:', e);
    }
}

/**
 * 遍历所有同源文档
 */
function forEachAllSameOriginDocs(callback) {
    // 主文档
    callback(document, 0, window);

    // iframes
    forEachSameOriginFrame((frame, index) => {
        callback(frame.document, index + 1, frame);
    });
}

// ============================================
// 速度控制
// ============================================

const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
let currentSpeedIndex = 1; // 默认1.5x

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
    const buttons = document.querySelectorAll('.speed-button');
    buttons.forEach((btn, index) => {
        btn.classList.toggle('speed-active', index === currentSpeedIndex);
    });

    const speedBtn = document.getElementById('ah-speed-btn');
    if (speedBtn) {
        speedBtn.textContent = '倍速: ' + SPEEDS[currentSpeedIndex] + 'x';
    }
}

function cyclePlaybackSpeed() {
    currentSpeedIndex = (currentSpeedIndex + 1) % SPEEDS.length;
    const newSpeed = SPEEDS[currentSpeedIndex];
    setVideoPlaybackSpeed(newSpeed);
    updateSpeedButtonsState();
}

function setVideoPlaybackSpeed(speed) {
    forEachAllSameOriginDocs((doc) => {
        const videos = doc.querySelectorAll('video');
        videos.forEach(video => {
            video.playbackRate = speed;
        });
    });
}

// ============================================
// 面板状态管理
// ============================================

function getActivePanelRecord() {
    try {
        const data = localStorage.getItem('ah_active_panel');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function setActivePanelRecord(rec) {
    try {
        localStorage.setItem('ah_active_panel', JSON.stringify(rec));
    } catch (e) {
        logger.error('Failed to save panel record:', e);
    }
}

function clearActivePanelRecordIfOwner() {
    const rec = getActivePanelRecord();
    if (rec && rec.owner === getDeviceId()) {
        localStorage.removeItem('ah_active_panel');
    }
}

function shouldWeOwn(current) {
    const rec = getActivePanelRecord();
    if (!rec) return true;
    if (rec.owner === getDeviceId()) return true;
    // 检查是否超时
    if (Date.now() - rec.timestamp > 60000) return true;
    // 如果当前没有面板，我们获得所有权
    return !current;
}

function claimOwnership() {
    setActivePanelRecord({
        owner: getDeviceId(),
        timestamp: Date.now()
    });
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimerId = setInterval(() => {
        claimOwnership();
    }, 30000);
}

function stopHeartbeat() {
    if (heartbeatTimerId) {
        clearInterval(heartbeatTimerId);
        heartbeatTimerId = null;
    }
}

const cleanupOwnership = () => {
    stopHeartbeat();
    clearActivePanelRecordIfOwner();
};

function destroyPanelAndStop() {
    stopStudyChapters();
    const panel = document.getElementById('answer-helper-panel');
    if (panel) {
        panel.remove();
        panelInstance = null;
    }
    cleanupOwnership();
}

// 获取设备ID
function getDeviceId() {
    let deviceId = localStorage.getItem('ah_device_id');
    if (!deviceId) {
        deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('ah_device_id', deviceId);
    }
    return deviceId;
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createPanel,
        setPanelFixedHeight,
        bindPanelEvents,
        safeClick,
        forEachSameOriginFrame,
        forEachAllSameOriginDocs,
        initSpeedButtons,
        updateSpeedButtonsState,
        cyclePlaybackSpeed,
        setVideoPlaybackSpeed,
        getActivePanelRecord,
        setActivePanelRecord,
        clearActivePanelRecordIfOwner,
        shouldWeOwn,
        claimOwnership,
        startHeartbeat,
        stopHeartbeat,
        destroyPanelAndStop
    };
}
