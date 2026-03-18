/**
 * 打包配置文件
 * 将模块化代码打包成油猴脚本
 */

const fs = require('fs');
const path = require('path');

class TampermonkeyBuilder {
    constructor(options = {}) {
        this.srcDir = options.srcDir || './src';
        this.distDir = options.distDir || './dist';
        this.entryFile = options.entryFile || 'index.js';
        this.outputFile = options.outputFile || 'cx-helper.user.js';
    }

    /**
     * 读取文件内容
     */
    readFile(filePath) {
        return fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * 写入文件
     */
    writeFile(filePath, content) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf-8');
    }

    /**
     * 提取元数据块
     */
    extractMetadata(content) {
        const match = content.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);
        return match ? match[0] : '';
    }

    /**
     * 移除导入语句
     */
    removeImports(content) {
        // 移除 import 语句（包括注释掉的）
        content = content.replace(/^\s*\/\/.*import .* from ['"].*;$/gm, '');
        content = content.replace(/^\s*import .* from ['"].*;$/gm, '');
        content = content.replace(/^\s*import ['"].*;$/gm, '');
        // 移除 export 语句
        content = content.replace(/^export .*;$/gm, '');
        content = content.replace(/^export \{.*\}$/gm, '');
        return content;
    }

    /**
     * 打包
     */
    build() {
        console.log('开始打包...');

        const entryPath = path.join(this.srcDir, this.entryFile);
        let content = this.readFile(entryPath);

        // 提取元数据
        const metadata = this.extractMetadata(content);

        // 移除开发模式相关注释
        content = content.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, '');
        // 移除模块导入部分的注释
        content = content.replace(/\/\/ ============================================[\s\S]*?\/\/ 开发模式: 动态加载模块[\s\S]*?===\s*\/\//, '');

        // 合并CSS - 必须在移除其他导入之前处理
        const cssPath = path.join(this.srcDir, 'styles', 'main.css');
        if (fs.existsSync(cssPath)) {
            const css = this.readFile(cssPath);
            // 将CSS导入替换为GM_addStyle调用（包括被注释的情况）
            const gmStyleCall = `GM_addStyle(\`${css.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`);`;
            content = content.replace(
                /^\s*\/\/.*import ['"]\.\/styles\/main\.css['"];$/gm,
                gmStyleCall
            );
            content = content.replace(
                /^import ['"]\.\/styles\/main\.css['"];$/gm,
                gmStyleCall
            );
        }

        // 移除其他导入
        content = this.removeImports(content);

        // 添加元数据
        content = metadata + '\n\n' + content;

        // 输出
        const outputPath = path.join(this.distDir, this.outputFile);
        this.writeFile(outputPath, content);

        console.log(`打包完成: ${outputPath}`);
        return outputPath;
    }

    /**
     * 监听文件变化并自动打包
     */
    watch() {
        console.log('开始监听文件变化...');

        const build = () => {
            try {
                this.build();
                console.log('文件变化，重新打包完成');
            } catch (e) {
                console.error('打包失败:', e);
            }
        };

        // 监听源文件变化
        const watchDir = path.join(this.srcDir);
        fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
            if (filename && filename.endsWith('.js')) {
                console.log(`检测到文件变化: ${filename}`);
                build();
            }
        });

        build();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    const builder = new TampermonkeyBuilder({
        srcDir: './src',
        distDir: './dist',
        entryFile: 'index.js',
        outputFile: 'cx-helper.user.js'
    });

    // 检查是否监听模式
    if (process.argv.includes('--watch')) {
        builder.watch();
    } else {
        builder.build();
    }
}

module.exports = TampermonkeyBuilder;
