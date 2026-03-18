/**
 * 超星字体加密解密工具
 *
 * 加密原理：
 * 超星使用自定义字体加密技术，将真实字符映射到错误的字形上。
 * 页面中带有 .font-cxsecret 类的元素使用了加密字体。
 *
 * 解密原理：
 * 1. 从页面 style 标签中提取 base64 编码的字体文件
 * 2. 使用 Typr 库解析字体文件
 * 3. 遍历中文字符范围，计算每个字符字形路径的 MD5 哈希
 * 4. 使用哈希值在映射表中查找真实字符
 * 5. 建立加密字符到解密字符的映射表
 * 6. 替换页面内容
 */

// ============ 依赖项 ============
// 需要以下外部库：
// 1. Typr.js - 字体解析库: https://116611.xyz/typr-md5.js
// 2. MD5 库 - 哈希计算: 包含在上述文件中
// 3. fontTableData - 字体映射表: https://116611.xyz/table.json

// ============ 工具函数 ============

/**
 * 将 base64 字符串转换为 Uint8Array
 */
function base64ToUint8Array(base64) {
  const data = atob(base64);
  const buffer = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    buffer[i] = data.charCodeAt(i);
  }
  return buffer;
}

/**
 * 从页面中提取加密字体数据
 */
function extractFontData() {
  const styleElements = [...document.querySelectorAll('style')];
  const cxStyle = styleElements.find(el =>
    el.textContent.includes('font-cxsecret')
  );

  if (!cxStyle) {
    console.log('未找到加密字体样式');
    return null;
  }

  // 提取 base64 字体数据
  const match = cxStyle.textContent.match(/base64,([\\w\\W]+?)'/);
  if (!match) {
    console.log('无法提取字体数据');
    return null;
  }

  return match[1];
}

/**
 * 解密超星字体加密内容
 */
async function decryptChaoXingFont() {
  // 检查依赖
  if (!window.Typr) {
    console.error('缺少 Typr 库，请先加载: https://116611.xyz/typr-md5.js');
    return;
  }
  if (!window.md5) {
    console.error('缺少 MD5 库，请先加载: https://116611.xyz/typr-md5.js');
    return;
  }
  if (!window.chaoXingFontTable) {
    console.error('缺少字体映射表，请先加载: https://116611.xyz/table.json');
    return;
  }

  const { Typr, md5, chaoXingFontTable: table } = window;

  // 提取字体数据
  const fontData = extractFontData();
  if (!fontData) {
    console.log('页面中没有加密内容');
    return;
  }

  console.log('正在解析字体文件...');

  // 解析字体
  const parsedFont = Typr.parse(base64ToUint8Array(fontData))[0];

  // 构建字符映射表
  console.log('正在构建字符映射表...');
  const charMap = {};
  let mappedCount = 0;

  // 遍历中文字符范围 (Unicode 4E00-9FA5)
  for (let charCode = 19968; charCode < 40870; charCode++) {
    const glyph = Typr.U.codeToGlyph(parsedFont, charCode);
    if (!glyph) continue;

    // 获取字形路径并计算哈希
    const path = Typr.U.glyphToPath(parsedFont, glyph);
    const pathHash = md5(JSON.stringify(path)).slice(24); // 取后8位

    // 在映射表中查找真实字符
    if (table[pathHash]) {
      const encryptedChar = String.fromCharCode(charCode);
      const decryptedChar = String.fromCharCode(table[pathHash]);
      charMap[encryptedChar] = decryptedChar;
      mappedCount++;
    }
  }

  console.log(`字符映射表构建完成，共映射 ${mappedCount} 个字符`);

  // 解密页面内容
  const elements = document.querySelectorAll('.font-cxsecret');
  console.log(`找到 ${elements.length} 个加密元素，开始解密...`);

  elements.forEach(element => {
    let htmlContent = element.innerHTML;
    let replacedCount = 0;

    Object.entries(charMap).forEach(([encryptedChar, decryptedChar]) => {
      const regex = new RegExp(encryptedChar, 'g');
      const matches = htmlContent.match(regex);
      if (matches) {
        replacedCount += matches.length;
        htmlContent = htmlContent.replace(regex, decryptedChar);
      }
    });

    element.innerHTML = htmlContent;
    element.classList.remove('font-cxsecret');
    console.log(`元素解密完成，替换了 ${replacedCount} 个字符`);
  });

  console.log('✅ 解密完成！');
  return charMap;
}

// ============ 使用示例 ============

/**
 * 方法1: 在浏览器控制台中使用
 *
 * 1. 打开超星学习通页面
 * 2. 按 F12 打开开发者工具
 * 3. 在 Console 中依次执行：
 *
 *    // 加载依赖库
 *    let script1 = document.createElement('script');
 *    script1.src = 'https://116611.xyz/typr-md5.js';
 *    document.head.appendChild(script1);
 *
 *    // 加载映射表
 *    fetch('https://116611.xyz/table.json')
 *      .then(r => r.json())
 *      .then(data => window.chaoXingFontTable = data);
 *
 *    // 等待加载完成后，复制本文件内容到控制台执行
 *    // 然后调用：
 *    decryptChaoXingFont();
 */

/**
 * 方法2: 作为油猴脚本使用
 *
 * 在油猴脚本头部添加：
 * // @resource     typrMd5Lib https://116611.xyz/typr-md5.js
 * // @resource     fontTableData https://116611.xyz/table.json
 * // @grant        GM_getResourceText
 *
 * 然后在脚本中：
 * eval(GM_getResourceText('typrMd5Lib'));
 * window.chaoXingFontTable = JSON.parse(GM_getResourceText('fontTableData'));
 * decryptChaoXingFont();
 */

/**
 * 方法3: 手动解密单个字符串
 *
 * 如果你已经有了字符映射表 charMap，可以这样解密：
 */
function decryptString(encryptedText, charMap) {
  let decrypted = encryptedText;
  Object.entries(charMap).forEach(([enc, dec]) => {
    decrypted = decrypted.replace(new RegExp(enc, 'g'), dec);
  });
  return decrypted;
}

// ============ 导出 ============
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    decryptChaoXingFont,
    decryptString,
    extractFontData,
    base64ToUint8Array
  };
}

// 如果在浏览器环境中直接运行，自动执行解密
if (typeof window !== 'undefined' && document.readyState === 'complete') {
  console.log('🔓 超星字体解密工具已加载');
  console.log('💡 使用方法：调用 decryptChaoXingFont() 进行解密');
}
