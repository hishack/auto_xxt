// 学习通题目提取器 - Background Script

// 监听插件安装
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[学习通题目提取器] 插件已安装', details);
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 可以在这里做一些初始化工作
  }
});
