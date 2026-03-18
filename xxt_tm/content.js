// 学习通题目提取器 - Content Script
// 用于注入到学习通页面，提取题目和解密字体

// 字体映射表（从外部 URL 加载）
let fontTableData = null;

// 外部字体映射表 URL
const FONT_TABLE_URL = 'https://116611.xyz/table.json';

// 消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[学习通题目提取器] 收到消息:', request.action);

  if (request.action === 'checkStatus') {
    handleCheckStatus(request, sender, sendResponse);
    return true;
  }

  if (request.action === 'extractQuestions') {
    handleExtractQuestions(request, sender, sendResponse);
    return true;
  }
});

// 确保脚本已加载
console.log('[学习通题目提取器] Content script 已加载');

// 检查页面状态
async function handleCheckStatus(request, sender, sendResponse) {
  try {
    // 检查是否有题目
    const questionSelectors = [
      '.TiMu',
      '.newTiMu',
      '.question',
      '.questionLi',
      '.subject_item',
      '.examPaper_subject',
      '.questionContainer',
      '.q-item',
      '.subject_node',
      '[class*="TiMu"]',
      '[class*="question"]'
    ];

    let hasQuestions = false;
    let questionCount = 0;

    for (const selector of questionSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        hasQuestions = true;
        questionCount = elements.length;
        break;
      }
    }

    // 检查是否有加密字体
    const hasEncryptedFont = document.querySelectorAll('.font-cxsecret').length > 0;

    sendResponse({
      hasQuestions,
      questionCount,
      hasEncryptedFont
    });
  } catch (error) {
    console.error('检查页面状态失败:', error);
    sendResponse({ hasQuestions: false, questionCount: 0, hasEncryptedFont: false });
  }
}

// 提取题目
async function handleExtractQuestions(request, sender, sendResponse) {
  try {
    // 首先解密字体
    await decryptFontIfNeeded();

    // 等待一小段时间确保字体解密完成
    await new Promise(resolve => setTimeout(resolve, 500));

    // 提取题目
    const questions = extractQuestionsFromPage();

    sendResponse({ questions });
  } catch (error) {
    console.error('提取题目失败:', error);
    sendResponse({ questions: [], error: error.message });
  }
}

// 解密字体（如果需要）
async function decryptFontIfNeeded() {
  const encryptedElements = document.querySelectorAll('.font-cxsecret');

  if (encryptedElements.length === 0) {
    return; // 没有加密元素
  }

  // 加载字体映射表 - 从外部 URL
  if (!fontTableData) {
    try {
      const response = await fetch(FONT_TABLE_URL);
      fontTableData = await response.json();
      console.log('[学习通题目提取器] 字体映射表加载成功');
    } catch (error) {
      console.error('加载字体映射表失败:', error);
      // 尝试从本地文件加载
      try {
        const localResponse = await fetch(chrome.runtime.getURL('font_table.json'));
        fontTableData = await localResponse.json();
      } catch (localError) {
        console.error('本地字体映射表也加载失败:', localError);
      }
    }
  }

  // 查找字体样式
  const styleElements = [...document.querySelectorAll('style')];
  const cxStyle = styleElements.find(el => el.textContent.includes('font-cxsecret'));

  if (!cxStyle) {
    return;
  }

  // 提取 base64 字体数据
  const fontMatch = cxStyle.textContent.match(/base64,([\w\W]+?)'/);
  if (!fontMatch) {
    return;
  }

  // 注意：完整的字体解密需要 Typr 库来解析 woff2 字体
  // 这里简化处理：对于已渲染的页面，直接从元素获取文本
  // 实际使用时应配合 Typr 库进行完整解密
  console.log('[学习通题目提取器] 检测到加密字体，元素数量:', encryptedElements.length);
}

// 从页面提取题目
function extractQuestionsFromPage() {
  const questions = [];

  // 方法1: 查找作业/考试页面结构
  // 根据题目结构.md，题目在 .ZyBottom 容器内
  const zyBottom = document.querySelector('#ZyBottom');

  if (zyBottom) {
    // 查找所有 TiMu 元素
    const timuElements = zyBottom.querySelectorAll('.TiMu, .newTiMu');

    timuElements.forEach((element, index) => {
      const question = parseQuestionFromZyBottom(element, index);
      if (question && question.question) {
        questions.push(question);
      }
    });
  }

  // 方法2: 如果上面没找到，使用备选选择器
  if (questions.length === 0) {
    const alternativeSelectors = [
      '.singleQuesId',
      '.questionLi',
      '[class*="TiMu"]',
      '.question'
    ];

    for (const selector of alternativeSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach((element, index) => {
          const question = parseQuestionElement(element, index);
          if (question && question.question) {
            questions.push(question);
          }
        });
        break;
      }
    }
  }

  // 去重
  const uniqueQuestions = [];
  const seen = new Set();
  questions.forEach(q => {
    const key = q.question.substring(0, 50);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueQuestions.push(q);
    }
  });

  return uniqueQuestions;
}

// 从作业区域解析题目
function parseQuestionFromZyBottom(element, index) {
  // 获取题目ID - 从 singleQuesId 或 TiMu 获取
  const parentSingleQuesId = element.closest('.singleQuesId');
  const questionId = parentSingleQuesId?.getAttribute('data') ||
    element.id ||
    `q_${index + 1}`;

  // 获取题目类型 - 从 data 属性或类型标题
  let type = 'single';

  const dataAttr = element.getAttribute('data');
  if (dataAttr === '0') type = 'single';
  else if (dataAttr === '1') type = 'multiple';
  else if (dataAttr === '2') type = 'blank';
  else if (dataAttr === '3') type = 'judge';

  // 查找类型标题
  const typeTitle = element.closest('.ZyBottom')?.querySelector('.newTestType');
  if (typeTitle) {
    const typeText = typeTitle.textContent || '';
    if (typeText.includes('多选')) type = 'multiple';
    else if (typeText.includes('判断')) type = 'judge';
    else if (typeText.includes('填空')) type = 'blank';
    else if (typeText.includes('单选')) type = 'single';
  }

  // 获取题目内容
  const titleSelectors = [
    '.Zy_TItle .fontLabel',
    '.Zy_TItle',
    '.qtContent',
    '.fontLabel',
    '[class*="TItle"]'
  ];

  let questionText = '';

  for (const selector of titleSelectors) {
    const titleEl = element.querySelector(selector);
    if (titleEl) {
      let text = getElementText(titleEl);
      // 清理题目标记
      text = text.replace(/^【.*?】/, '').trim();
      if (text && text.length > 2) {
        questionText = text;
        break;
      }
    }
  }

  // 获取选项
  const options = [];

  // 查找选项容器
  const optionContainers = element.querySelectorAll('.Zy_ulTop, .qtDetail, .Py_tk ul');

  optionContainers.forEach(container => {
    const liElements = container.querySelectorAll('li');

    liElements.forEach(li => {
      // 获取选项文本
      const optionText = getElementText(li);
      if (optionText && optionText.length > 0 && optionText.length < 100) {
        // 避免重复选项
        if (!options.includes(optionText)) {
          options.push(optionText);
        }
      }
    });
  });

  // 特殊处理判断题
  if (type === 'judge' && options.length === 0) {
    const judgeOptions = element.querySelectorAll('.Py_tk li, [class*="judge"] li');
    judgeOptions.forEach(li => {
      const text = getElementText(li);
      if (text && !options.includes(text)) {
        options.push(text);
      }
    });
  }

  return {
    id: questionId,
    type,
    question: questionText,
    options: options
  };
}

// 解析单个题目元素（备选方法）
function parseQuestionElement(element, index) {
  // 获取题目ID
  const questionId = element.id ||
    element.getAttribute('data') ||
    element.getAttribute('data-id') ||
    `q_${index + 1}`;

  // 获取题目类型
  let type = 'single';

  const dataType = element.getAttribute('data');
  if (dataType === '0') type = 'single';
  else if (dataType === '1') type = 'multiple';
  else if (dataType === '2') type = 'blank';
  else if (dataType === '3') type = 'judge';

  // 获取题目内容
  const titleSelectors = [
    '.Zy_TItle',
    '.qtContent',
    '.question-content',
    '.questionText',
    '.stem_txt',
    '[class*="TItle"]',
    '[class*="Title"]'
  ];

  let questionText = '';

  for (const selector of titleSelectors) {
    const titleEl = element.querySelector(selector);
    if (titleEl) {
      let text = getElementText(titleEl);
      text = text.replace(/^【.*?】/, '').trim();
      if (text) {
        questionText = text;
        break;
      }
    }
  }

  if (!questionText) {
    questionText = getElementText(element).substring(0, 200);
  }

  // 获取选项
  const options = [];
  const optionContainers = element.querySelectorAll('.Zy_ulTop, .qtDetail, ul, [class*="option"]');

  optionContainers.forEach(container => {
    const liElements = container.querySelectorAll('li');
    liElements.forEach(li => {
      const optionText = getElementText(li);
      if (optionText && optionText.length < 100 && !options.includes(optionText)) {
        options.push(optionText);
      }
    });
  });

  return {
    id: questionId,
    type,
    question: questionText,
    options: options
  };
}

// 获取元素文本
function getElementText(element) {
  if (!element) return '';
  let text = element.textContent || '';
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// 初始化
console.log('[学习通题目提取器] Content script loaded');
