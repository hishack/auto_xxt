# 超星学习通助手 (CXHelper)

超星学习通(学习通)自动学习助手 - 油猴脚本

## 项目结构

```
xxt_tm/
├── src/
│   ├── core/           # 核心模块
│   │   └── index.js    # Logger, PerformanceMonitor, CacheManager
│   ├── ui/             # UI模块
│   │   └── index.js    # 面板创建、事件绑定、拖拽
│   ├── utils/          # 工具函数
│   │   └── index.js    # API调用、Cookie操作、模态框
│   ├── pages/         # 页面逻辑
│   │   └── index.js    # 视频处理、答题、学习流程
│   ├── styles/        # 样式
│   │   └── main.css   # 面板样式
│   └── index.js       # 入口文件
├── dist/               # 打包输出
├── build.js           # 打包脚本
├── package.json      # 项目配置
├── user.js           # 原始油猴脚本(未改动)
└── README.md
```

## 开发

### 安装依赖
```bash
npm install
```

### 打包
```bash
npm run build
```

### 开发模式(监听文件变化)
```bash
npm run dev
```

### 输出文件
打包后的油猴脚本位于: `dist/cx-helper.user.js`

## 功能

- 自动学习章节
- 视频倍速播放
- 视频进度记录
- 浮动控制面板
- 面板拖拽
- 学习日志

## 使用

1. 安装 [Tampermonkey](https://tampermonkey.net/) 浏览器扩展
2. 打包项目: `npm run build`
3. 在Tampermonkey中添加新脚本
4. 将 `dist/cx-helper.user.js` 的内容粘贴进去
5. 访问超星学习通页面即可使用
