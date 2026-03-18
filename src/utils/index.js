/**
 * 超星学习通助手 - 工具函数模块
 * 包含API调用、Cookie操作、支付模态框等功能
 */

// ============================================
// DeepSeek API
// ============================================

const API_CONFIG = {
    baseUrl: 'https://api.116611.xyz',
    deepseekModel: 'deepseek-chat'
};

/**
 * DeepSeek API 调用
 */
async function deepseekChat(messages, options = {}) {
    const apiKey = localStorage.getItem('deepseek_api_key') || '';
    const model = options.model || API_CONFIG.deepseekModel;

    if (!apiKey) {
        throw new Error('请先设置 DeepSeek API Key');
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 2000
        })
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * 获取设备ID (付费版)
 */
function getDeviceIdPaid() {
    let id = localStorage.getItem('cx_device_id');
    if (!id) {
        id = 'cx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cx_device_id', id);
    }
    return id;
}

// ============================================
// Cookie 操作
// ============================================

/**
 * 获取Cookie
 */
function getCookie(key) {
    const name = key + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return '';
}

/**
 * 设置Cookie
 */
function setCookie(key, value, days, domain = '') {
    let expires = '';
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = '; expires=' + date.toUTCString();
    }
    const domainStr = domain ? '; domain=' + domain : '';
    document.cookie = key + '=' + (value || '') + expires + '; path=/' + domainStr;
}

// ============================================
// 授权相关
// ============================================

/**
 * 检查本地授权状态
 */
function isLocallyLicensed() {
    return localStorage.getItem('cx_licensed') === 'true';
}

/**
 * 设置本地授权状态
 */
function setLocallyLicensed() {
    localStorage.setItem('cx_licensed', 'true');
}

/**
 * 获取免费使用次数
 */
function getFreeUsedCount() {
    const count = localStorage.getItem('cx_free_count');
    return count ? parseInt(count, 10) : 0;
}

/**
 * 增加免费使用次数
 */
function incFreeUsedCount() {
    const count = getFreeUsedCount();
    localStorage.setItem('cx_free_count', (count + 1).toString());
    return count + 1;
}

// ============================================
// 模态框
// ============================================

/**
 * 显示付费模态框
 */
function showPayModalPaid(messageText = '') {
    const modal = document.createElement('div');
    modal.id = 'cx-pay-modal';
    modal.innerHTML = `
        <div class="cx-modal-overlay"></div>
        <div class="cx-modal-content">
            <div class="cx-modal-header">
                <h3>开通专业版</h3>
                <button class="cx-modal-close">&times;</button>
            </div>
            <div class="cx-modal-body">
                <p>${messageText || '免费次数已用完，请开通专业版继续使用'}</p>
                <div class="cx-price-info">
                    <span class="cx-price">¥29.9</span>
                    <span class="cx-period">/永久</span>
                </div>
                <button class="cx-buy-btn">立即购买</button>
                <p class="cx-contact">联系QQ: 123456789</p>
            </div>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        #cx-pay-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .cx-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
        }
        .cx-modal-content {
            position: relative;
            background: #fff;
            border-radius: 16px;
            padding: 24px;
            max-width: 360px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .cx-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .cx-modal-header h3 {
            margin: 0;
            font-size: 18px;
            color: #111;
        }
        .cx-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
        }
        .cx-modal-body p {
            color: #666;
            margin-bottom: 16px;
        }
        .cx-price-info {
            text-align: center;
            margin: 20px 0;
        }
        .cx-price {
            font-size: 32px;
            font-weight: bold;
            color: #ff4d4f;
        }
        .cx-period {
            color: #999;
            font-size: 14px;
        }
        .cx-buy-btn {
            width: 100%;
            padding: 12px;
            background: #ff4d4f;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
        }
        .cx-contact {
            text-align: center;
            font-size: 12px;
            color: #999;
            margin-top: 16px;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    // 绑定关闭事件
    modal.querySelector('.cx-modal-close').addEventListener('click', () => {
        modal.remove();
        style.remove();
    });
    modal.querySelector('.cx-modal-overlay').addEventListener('click', () => {
        modal.remove();
        style.remove();
    });
}

/**
 * 显示反馈模态框
 */
function showFeedbackModal() {
    const modal = document.createElement('div');
    modal.id = 'cx-feedback-modal';
    modal.innerHTML = `
        <div class="cx-modal-overlay"></div>
        <div class="cx-modal-content">
            <div class="cx-modal-header">
                <h3>意见反馈</h3>
                <button class="cx-modal-close">&times;</button>
            </div>
            <div class="cx-modal-body">
                <textarea class="cx-feedback-text" placeholder="请输入您的意见或建议..."></textarea>
                <button class="cx-submit-btn">提交反馈</button>
            </div>
        </div>
    `;

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        #cx-feedback-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .cx-modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
        }
        .cx-modal-content {
            position: relative;
            background: #fff;
            border-radius: 16px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }
        .cx-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .cx-modal-header h3 {
            margin: 0;
            font-size: 18px;
            color: #111;
        }
        .cx-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
        }
        .cx-feedback-text {
            width: 100%;
            height: 120px;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            resize: none;
            font-size: 14px;
            box-sizing: border-box;
        }
        .cx-submit-btn {
            width: 100%;
            padding: 12px;
            background: #6366f1;
            color: #fff;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 16px;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    // 绑定事件
    modal.querySelector('.cx-modal-close').addEventListener('click', () => {
        modal.remove();
        style.remove();
    });
    modal.querySelector('.cx-modal-overlay').addEventListener('click', () => {
        modal.remove();
        style.remove();
    });
    modal.querySelector('.cx-submit-btn').addEventListener('click', () => {
        const text = modal.querySelector('.cx-feedback-text').value;
        if (text.trim()) {
            alert('感谢您的反馈！');
            modal.remove();
            style.remove();
        }
    });
}

/**
 * 关闭模态框
 */
function close() {
    document.querySelectorAll('[id$="-modal"]').forEach(modal => {
        modal.remove();
    });
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        deepseekChat,
        getDeviceIdPaid,
        getCookie,
        setCookie,
        isLocallyLicensed,
        setLocallyLicensed,
        getFreeUsedCount,
        incFreeUsedCount,
        showPayModalPaid,
        showFeedbackModal,
        close
    };
}
