/**
 * 超星学习通助手 - 页面逻辑模块
 * 包含视频处理、PPT处理、答题、学习流程控制等功能
 */

// ============================================
// 页面检测
// ============================================

/**
 * 检测是否为学习页面
 */
function isStudyPage() {
    return /mycourse\/studentstudy|mooc2-ans|knowledgeId|chapterId/.test(location.href);
}

/**
 * 深层次检测学习内容
 */
function hasStudyContentDeep() {
    const doc = document;
    // 检测视频
    if (doc.querySelector('.video, video, #video, .mp4source')) {
        return true;
    }
    // 检测PPT
    if (doc.querySelector('.ppt, .pptx, #ppt, .pptplayer')) {
        return true;
    }
    // 检测测验
    if (doc.querySelector('.quiz, #quiz, .exam, .test')) {
        return true;
    }
    return false;
}

/**
 * 检测是否为测验页面
 */
function isQuizPageDoc(doc) {
    return doc.querySelector('.quiz, #quiz, .exam, .test, .question, .TiMu');
}

/**
 * 检测是否有可操作的学习内容
 */
function hasActionableStudyContent(doc) {
    // 视频
    const videos = doc.querySelectorAll('video');
    for (const video of videos) {
        if (video.offsetParent !== null) {
            return true;
        }
    }
    // PPT
    const ppt = doc.querySelectorAll('.ppt, .pptx, [data-type="ppt"]');
    for (const p of ppt) {
        if (p.offsetParent !== null) {
            return true;
        }
    }
    return false;
}

/**
 * 检测是否有未回答的问题
 */
function hasUnansweredQuestions(doc) {
    const questions = doc.querySelectorAll('.question, .TiMu, .quiz-question');
    for (const q of questions) {
        const answered = q.querySelector('.answered, input:checked, textarea');
        if (!answered) {
            return true;
        }
    }
    return false;
}

// ============================================
// 内容处理
// ============================================

/**
 * 处理文档中的视频
 */
function handleVideosInDocument(doc) {
    const videos = doc.querySelectorAll('video');
    let processedCount = 0;

    videos.forEach(video => {
        // 跳过隐藏的视频
        if (video.offsetParent === null) return;

        // 设置倍速
        const savedSpeed = localStorage.getItem('video_speed') || 1.5;
        video.playbackRate = parseFloat(savedSpeed);

        // 尝试自动播放
        if (video.paused) {
            video.play().catch(() => {
                // 自动播放被阻止
            });
        }

        processedCount++;
    });

    return processedCount;
}

/**
 * 处理文档中的PPT
 */
function handlePPTInDocument(doc) {
    // PPT处理逻辑
    const pptElements = doc.querySelectorAll('.ppt, .pptx');
    let processedCount = 0;

    pptElements.forEach(ppt => {
        // 自动播放PPT
        const nextBtn = ppt.querySelector('.next-btn, .next, [data-action="next"]');
        if (nextBtn) {
            // 处理PPT翻页
            processedCount++;
        }
    });

    return processedCount;
}

/**
 * 查找章节测验标签
 */
function findChapterQuizTab(doc) {
    // 查找测验相关的标签和元素
    const quizTabs = doc.querySelectorAll('.quiz-tab, [data-type="quiz"], .chapter-quiz');
    return Array.from(quizTabs);
}

/**
 * 注入控制台解密代码
 */
async function injectConsoleDecryptCode(doc, timeoutMs = 3000) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(false);
        }, timeoutMs);

        // 监听页面加载完成
        const checkReady = () => {
            if (doc.readyState === 'complete') {
                clearTimeout(timeout);
                resolve(true);
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    });
}

// ============================================
// 学习流程控制
// ============================================

let studyTimerId = null;
let isStudying = false;

/**
 * 跳转到下一个章节
 */
function gotoNextSection(contextDoc) {
    const nextButtons = contextDoc.querySelectorAll('.next-btn, .next-chapter, [data-action="next"], .finish-btn');
    for (const btn of nextButtons) {
        if (btn.offsetParent !== null && btn.disabled !== true) {
            btn.click();
            return true;
        }
    }
    return false;
}

/**
 * 尝试自动跳过空章节
 */
function tryAutoSkipEmptySection() {
    const doc = document;

    // 检测空白页面或已完成页面
    const noContent = !hasActionableStudyContent(doc);
    const isDone = isSectionDone(doc);

    if (noContent || isDone) {
        return gotoNextSection(doc);
    }

    return false;
}

/**
 * 检测章节是否完成
 */
function isSectionDone(contextDoc) {
    // 检查视频是否播放完成
    const videos = contextDoc.querySelectorAll('video');
    for (const video of videos) {
        // 如果视频未结束且不是循环播放
        if (!video.ended && !video.loop && video.duration > 0) {
            // 检查是否已观看超过90%
            if (video.currentTime / video.duration < 0.9) {
                return false;
            }
        }
    }

    // 检查测验是否完成
    if (hasUnansweredQuestions(contextDoc)) {
        return false;
    }

    return true;
}

/**
 * 开始学习章节
 */
function startStudyChapters() {
    if (isStudying) return;

    isStudying = true;
    updateStatus(true);

    logger.log('开始自动学习...');

    // 处理当前页面的内容
    processCurrentPage();

    // 设置定时器定期检查
    studyTimerId = setInterval(() => {
        processCurrentPage();

        // 检查是否需要跳转到下一章
        if (isSectionDone(document)) {
            gotoNextSection(document);
        }
    }, 5000);
}

/**
 * 停止学习章节
 */
function stopStudyChapters() {
    if (!isStudying) return;

    isStudying = false;
    updateStatus(false);

    if (studyTimerId) {
        clearInterval(studyTimerId);
        studyTimerId = null;
    }

    logger.log('已停止自动学习');
}

/**
 * 处理当前页面
 */
function processCurrentPage() {
    // 处理视频
    handleVideosInDocument(document);

    // 处理PPT
    handlePPTInDocument(document);

    // 更新速度按钮状态
    if (typeof updateSpeedButtonsState === 'function') {
        updateSpeedButtonsState();
    }
}

// ============================================
// 答题功能
// ============================================

/**
 * 收集测验题目
 */
function collectQuizQuestions(doc) {
    const questions = [];
    const questionElements = doc.querySelectorAll('.question, .TiMu, .quiz-question');

    questionElements.forEach((el, index) => {
        const questionInfo = getQuestionInfo(el);
        if (questionInfo) {
            questions.push({
                ...questionInfo,
                index: index
            });
        }
    });

    return questions;
}

/**
 * 获取题目信息
 */
function getQuestionInfo(questionElement) {
    try {
        // 提取题目内容
        const stem = questionElement.querySelector('.stem, .question-stem, .title');
        const questionText = stem ? stem.textContent.trim() : '';

        // 提取题目类型
        const typeEl = questionElement.querySelector('.type, .question-type');
        let questionType = 'default';
        if (typeEl) {
            questionType = typeEl.textContent.toLowerCase();
        } else {
            // 根据元素特征判断类型
            if (questionElement.querySelector('input[type="radio"]')) {
                questionType = 'single';
            } else if (questionElement.querySelector('input[type="checkbox"]')) {
                questionType = 'multiple';
            } else if (questionElement.querySelector('textarea')) {
                questionType = 'text';
            }
        }

        // 提取选项
        const options = [];
        const optionElements = questionElement.querySelectorAll('.option, .answer-item, label');
        optionElements.forEach(opt => {
            options.push(opt.textContent.trim());
        });

        return {
            text: questionText,
            type: questionType,
            options: options,
            element: questionElement
        };
    } catch (e) {
        logger.error('getQuestionInfo error:', e);
        return null;
    }
}

/**
 * 填充答案
 */
function fillAnswer(answer, questionElement, type) {
    try {
        if (type === 'single' || type === 'radio') {
            // 单选题
            const options = questionElement.querySelectorAll('input[type="radio"]');
            for (const option of options) {
                const label = questionElement.querySelector(`label[for="${option.id}"]`);
                if (label && label.textContent.includes(answer)) {
                    option.click();
                    return true;
                }
            }
        } else if (type === 'multiple' || type === 'checkbox') {
            // 多选题
            const options = questionElement.querySelectorAll('input[type="checkbox"]');
            const answers = answer.split(/[,，]/);
            for (const ans of answers) {
                for (const option of options) {
                    const label = questionElement.querySelector(`label[for="${option.id}"]`);
                    if (label && label.textContent.includes(ans.trim())) {
                        option.click();
                    }
                }
            }
            return true;
        } else if (type === 'text' || type === 'textarea') {
            // 填空题
            const textarea = questionElement.querySelector('textarea, input[type="text"]');
            if (textarea) {
                textarea.value = answer;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
        }
    } catch (e) {
        logger.error('fillAnswer error:', e);
    }
    return false;
}

/**
 * 查找并点击测验提交按钮
 */
function findAndClickQuizSubmitButton(doc) {
    const submitButtons = doc.querySelectorAll('.submit-btn, .commit-btn, [data-action="submit"], .btn-submit');
    for (const btn of submitButtons) {
        if (btn.offsetParent !== null && !btn.disabled) {
            btn.click();
            return true;
        }
    }
    return false;
}

/**
 * 验证并修复提交参数
 */
function validateAndFixSubmitParams(doc) {
    // 验证测验提交参数
    const form = doc.querySelector('form');
    if (form) {
        const requiredFields = form.querySelectorAll('[required]');
        for (const field of requiredFields) {
            if (!field.value) {
                logger.warn('Missing required field:', field.name);
                return false;
            }
        }
    }
    return true;
}

/**
 * 检测是否有题目
 */
function hasQuestions() {
    const questions = document.querySelectorAll('.question, .TiMu, .quiz-question');
    return questions.length > 0;
}

/**
 * 检测题目是否已回答
 */
function isQuestionAnswered(q) {
    const answered = q.querySelector('.answered');
    if (answered) return true;

    const radio = q.querySelector('input[type="radio"]:checked');
    if (radio) return true;

    const checkbox = q.querySelector('input[type="checkbox"]:checked');
    if (checkbox) return true;

    const textarea = q.querySelector('textarea');
    if (textarea && textarea.value.trim()) return true;

    return false;
}

/**
 * 显示无任务提示
 */
function showNoTaskToast() {
    const existing = document.getElementById('no-task-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'no-task-toast';
    toast.textContent = '当前没有学习任务';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * 更新状态显示
 */
function updateStatus(running) {
    const startBtn = document.getElementById('ah-start-btn');
    const stopBtn = document.getElementById('ah-stop-btn');

    if (startBtn && stopBtn) {
        startBtn.disabled = running;
        stopBtn.disabled = !running;
    }

    if (running) {
        addLog('开始自动学习...', 'info');
    } else {
        addLog('已停止自动学习', 'info');
    }
}

/**
 * 添加日志
 */
function addLog(message, type = 'info') {
    const logContainer = document.getElementById('answer-log');
    if (!logContainer) return;

    const logItem = document.createElement('div');
    logItem.className = `log-item ${type}`;
    logItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

    logContainer.appendChild(logItem);
    logContainer.scrollTop = logContainer.scrollHeight;

    // 限制日志数量
    const logs = logContainer.querySelectorAll('.log-item');
    if (logs.length > 50) {
        logs[0].remove();
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isStudyPage,
        hasStudyContentDeep,
        isQuizPageDoc,
        hasActionableStudyContent,
        hasUnansweredQuestions,
        handleVideosInDocument,
        handlePPTInDocument,
        findChapterQuizTab,
        injectConsoleDecryptCode,
        gotoNextSection,
        tryAutoSkipEmptySection,
        isSectionDone,
        startStudyChapters,
        stopStudyChapters,
        processCurrentPage,
        collectQuizQuestions,
        getQuestionInfo,
        fillAnswer,
        findAndClickQuizSubmitButton,
        validateAndFixSubmitParams,
        hasQuestions,
        isQuestionAnswered,
        showNoTaskToast,
        updateStatus,
        addLog
    };
}
