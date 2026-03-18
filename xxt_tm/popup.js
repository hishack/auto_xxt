// 学习通题目提取器 - Popup 脚本
let extractedQuestions = [];
let currentTabId = null;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await checkPageStatus();
  setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
  document.getElementById('extractBtn').addEventListener('click', extractQuestions);
  document.getElementById('copyAllBtn').addEventListener('click', copyAllQuestions);
}

// 发送消息到 content script（带重试）
async function sendMessageToContent(tabId, message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (error) {
      console.log(`发送消息失败，第 ${i + 1} 次重试...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error('无法连接到页面，请刷新页面后重试');
}

// 检查页面状态
async function checkPageStatus() {
  const pageStatusEl = document.getElementById('pageStatus');
  const questionCountEl = document.getElementById('questionCount');
  const fontStatusEl = document.getElementById('fontStatus');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;
    const currentUrl = tab.url;

    // 检查是否在学习通页面
    if (!currentUrl.includes('chaoxing.com')) {
      pageStatusEl.textContent = '不在学习通页面';
      pageStatusEl.className = 'status-value error';
      document.getElementById('extractBtn').disabled = true;
      return;
    }

    // 发送消息给 content script 检查页面状态
    try {
      const response = await sendMessageToContent(tab.id, { action: 'checkStatus' });

      if (response) {
        pageStatusEl.textContent = response.hasQuestions ? '已检测到题目' : '未检测到题目';
        pageStatusEl.className = response.hasQuestions ? 'status-value success' : 'status-value warning';

        questionCountEl.textContent = response.questionCount || 0;

        fontStatusEl.textContent = response.hasEncryptedFont ? '已加密' : '未加密';
        fontStatusEl.className = response.hasEncryptedFont ? 'status-value warning' : 'status-value success';
      } else {
        pageStatusEl.textContent = '页面未响应';
        pageStatusEl.className = 'status-value error';
      }
    } catch (error) {
      pageStatusEl.textContent = '请刷新页面';
      pageStatusEl.className = 'status-value warning';
      questionCountEl.textContent = '-';
      fontStatusEl.textContent = '-';
    }
  } catch (error) {
    pageStatusEl.textContent = '检测失败';
    pageStatusEl.className = 'status-value error';
    console.error('检查页面状态失败:', error);
  }
}

// 提取题目
async function extractQuestions() {
  const btn = document.getElementById('extractBtn');
  const btnText = document.getElementById('btnText');
  const container = document.getElementById('questionsContainer');
  const copyAllBtn = document.getElementById('copyAllBtn');

  btn.disabled = true;
  btnText.textContent = '提取中...';
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    // 先获取当前 tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;

    const response = await sendMessageToContent(tab.id, { action: 'extractQuestions' });

    extractedQuestions = response?.questions || [];

    // 更新题目数量
    document.getElementById('questionCount').textContent = extractedQuestions.length;

    if (extractedQuestions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <p>未找到题目</p>
          <p style="font-size: 12px; margin-top: 8px;">请确保在作业/考试页面</p>
        </div>
      `;
    } else {
      renderQuestionsList(extractedQuestions);
      copyAllBtn.style.display = 'block';
    }

    btnText.textContent = '重新提取';
  } catch (error) {
    container.innerHTML = `
      <div class="empty-state">
        <p>提取失败</p>
        <p style="font-size: 12px; margin-top: 8px;">请刷新页面后重试</p>
      </div>
    `;
    btnText.textContent = '重新提取';
  }

  btn.disabled = false;
}

// 渲染题目列表
function renderQuestionsList(questions) {
  const container = document.getElementById('questionsContainer');

  const typeMap = {
    '0': '单选题',
    '1': '多选题',
    '2': '填空题',
    '3': '判断题',
    'single': '单选题',
    'multiple': '多选题',
    'blank': '填空题',
    'judge': '判断题'
  };

  container.innerHTML = `
    <div class="questions-list">
      ${questions.map((q, index) => `
        <div class="question-item" data-index="${index}">
          <div class="question-header">
            <span class="question-type">${typeMap[q.type] || q.type}</span>
            <span class="question-id">#${q.id}</span>
          </div>
          <div class="question-text">${q.question}</div>
          ${q.options && q.options.length > 0 ? `
            <div class="options-list">
              ${q.options.slice(0, 2).map(opt => `<div class="option-item">${opt}</div>`).join('')}
              ${q.options.length > 2 ? `<div class="option-item">...等${q.options.length}个选项</div>` : ''}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;

  // 添加点击事件查看详情
  container.querySelectorAll('.question-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      showQuestionDetail(questions[index]);
    });
  });
}

// 显示题目详情
function showQuestionDetail(question) {
  const container = document.getElementById('questionsContainer');

  const typeMap = {
    '0': '单选题',
    '1': '多选题',
    '2': '填空题',
    '3': '判断题',
    'single': '单选题',
    'multiple': '多选题',
    'blank': '填空题',
    'judge': '判断题'
  };

  container.innerHTML = `
    <div class="detail-view">
      <div class="detail-header">
        <span>题目详情</span>
        <button class="detail-close" id="closeDetail">&times;</button>
      </div>
      <div class="detail-content">
        <span class="detail-type">${typeMap[question.type] || question.type}</span>
        <div class="detail-question">${question.question}</div>
        ${question.options && question.options.length > 0 ? `
          <div class="detail-options">
            ${question.options.map(opt => `
              <div class="detail-option">${opt}</div>
            `).join('')}
          </div>
        ` : ''}
        <button class="btn btn-primary" style="margin-top: 16px;" id="copyQuestionBtn">
          复制本题
        </button>
      </div>
    </div>
  `;

  document.getElementById('closeDetail').addEventListener('click', () => {
    renderQuestionsList(extractedQuestions);
  });

  document.getElementById('copyQuestionBtn').addEventListener('click', () => {
    const text = formatQuestionText(question);
    copyToClipboard(text);
  });
}

// 格式化题目文本
function formatQuestionText(question) {
  const typeMap = {
    '0': '单选题',
    '1': '多选题',
    '2': '填空题',
    '3': '判断题',
    'single': '单选题',
    'multiple': '多选题',
    'blank': '填空题',
    'judge': '判断题'
  };

  let text = `【${typeMap[question.type] || question.type}】\n`;
  text += `题目：${question.question}\n`;

  if (question.options && question.options.length > 0) {
    text += `\n选项：\n`;
    question.options.forEach(opt => {
      text += `${opt}\n`;
    });
  }

  return text;
}

// 复制全部题目
async function copyAllQuestions() {
  if (extractedQuestions.length === 0) return;

  const allText = extractedQuestions.map(q => formatQuestionText(q)).join('\n\n' + '='.repeat(30) + '\n\n');
  copyToClipboard(allText);
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showCopySuccess();
  }).catch(err => {
    console.error('复制失败:', err);
  });
}

// 显示复制成功提示
function showCopySuccess() {
  const existing = document.querySelector('.copy-success');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'copy-success';
  toast.textContent = '复制成功！';
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 1500);
}
