# TL;DR · 彩蛋重做：页面本体进 canvas

完整设计：`2026-11-05-egg-live-canvas-design.md`

## 做什么

`<yohaku-root>` 自定义元素取代 `CanvasRoot`。平时就是普通 DOM；彩蛋时把 shadow 里的 `<slot>` 移进 canvas，墨直接读活的页面，不截图、不搬 React 节点。然后把彩蛋重新挂回线上。

## 你会看到

1. 平时页面和现在完全一样，没有任何 canvas 开销；不支持的浏览器里 `<yohaku-root>` 就是一个普通块元素。
2. 静置 60 秒：页面原地、不闪地开始化墨，文字、卡片底色、能画进来的配图一起化开；墨是 Retina 全分辨率，细节比下线前清楚。
3. 同时右下角按钮、阅读进度、Presence、TTS、toast 等浮层 0.6s 淡出。
4. 浸没期间页面画面冻结，CSS 动画暂停。
5. 退出（按钮 / 滚轮 / 按键）：复印回来，浮层淡回，输入框、焦点、滚动位置、动画进度都和进入前一样。

## 已定

| 项 | 决定 |
|---|---|
| 方案 | B：只在彩蛋期间把 slot 移入 canvas |
| 动画 | 彩蛋期间冻结，退出后从原进度接着播 |
| 首帧闪烁 | View Transition 持旧图 150ms，new 透明 |
| 卡片底色 | 整块化墨（首帧与页面一致） |
| 配图 | 跟文字一起化墨；画不进来的跨源图用克隆淡出 |
| 浮层 | 淡出再淡回 |
| 基线 | 以下线前代码为准，不以 11-01 文档为准 |
| 画质 | 30fps、墨 2×（Retina 全分辨率）、墨层始终屏幕分辨率；GPU 实测约 13%（M4 Max），比下线前多 1 个百分点 |

## 请检查（我替你定的）

- 浮层淡出靠遍历 `body` 子元素改 inline 样式 + `MutationObserver` 接住新 portal
- 退出时不再 `loseContext`（canvas 跨会话复用）
- 元素上传后用一次 shader pass 上下翻转（`UNPACK_FLIP_Y` 对元素源无效）
- 只上传视口区域，避免长文在 Retina 下超出最大纹理
- 原型目录 `dev-demos/canvas-slot/` 落地后删除，不提交

## 时间

约 1 天：
- 接入 `<yohaku-root>` 替换 `CanvasRoot`：1 小时
- 墨 GL 搬到 shadow canvas、改 seed：2–3 小时
- 浮层淡出与配图回退：1.5 小时
- 真实页面验证（Retina、header、长文、录屏逐帧）：2 小时
