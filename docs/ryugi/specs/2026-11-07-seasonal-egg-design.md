# 四季彩蛋（季节限定 × HTML-in-Canvas）— Design

取代 11-01 纸浆彩蛋与 11-05 live canvas 版里的「化墨 → 纸浆」效果。`<yohaku-root>`、静置触发、浮层淡出、配图回退、退出按钮这些外壳全部沿用；换掉的是彩蛋期间画什么。

原型（已确认效果）：`.ryugi/artifacts/html/seasonal-egg/`（gitignore，engine.js + seasons/*.js），实现时以它的画面为准。

## 你会看到

静置 60 秒（条件同 11-01：桌面、背景开着、开了 HTML-in-Canvas flag、无弹层/媒体/焦点占用、未开减少动态效果）后，按 `seasonOf(term)` 进入当季：

| 季 | 节气 | 效果 | 借用纸背景 |
|---|---|---|---|
| 春 · 春雨洇字 | 立春–谷雨 | 雨珠是透镜，放大折射下面的字、纸纤维与配图；大珠滑落留湿痕；墨在湿处沿纤维洇开 | 雨珠里放大的是纸里当季花瓣与砂子；雨把压花冲起浮进水珠；湿纸透、纤维显 |
| 夏 · 囊萤夜读 | 立夏–大暑 | 入夜，只有萤光照到的字可读；光标是纱囊，聚萤成灯；萤会落在字上 | 萤数随节气（立夏 3 → 大暑 14）；压着的紫阳花/荷瓣被萤光透亮；砂子在萤光下闪 |
| 秋 · 镜花水月 | 立秋–霜降 | 水漫到约 53%，倒映正文；划水打碎倒影；真实月相的月亮与月光碎影 | 水面漂的是纸里当季真实压花，逐片浮起、退出时沉回原位；砂子在月光里闪 |
| 冬 · 呵气融霜 | 立冬–大寒 | 冰花长满窗，字在霜后模糊；鼠标停住哈气化开一圈，水滴下流，慢慢回冻 | 霜从纸里的落叶、六花处长起；蜡梅透出琥珀色；砂子在霜里闪 |

秋天是 2026-11-06 用户调过的「平静版」：环境波纹约为原来 1/3 频率、一半幅度，水面静止时模拟休眠。

退出：滚轮 / 按键 / 「回到正文」按钮；进入后 1.5 s 内指针移动超过 60 px 也算退出。之后指针是互动，不会退出。改窗口大小、切走标签页、换主题、路由变化：立即结束，不播动画。

## 已定

| 项 | 决定 |
|---|---|
| 画质档 | 彩蛋 30fps；纸背景彩蛋期间 1×（入场 1.2 s 后切，退出开始时切回设备 dpr，首尾帧都是设备 dpr） |
| 合成 | 彩蛋 canvas（`<yohaku-root>` shadow canvas，WebGL2）每帧输出不透明的完整画面：墨（页面纹理）叠在纸纹理上，两者分开处理 |
| 纸进彩蛋 | 彩蛋期间由彩蛋驱动纸背景渲染：`eggBridge.paper.render(variant)` 同步画一帧纸，彩蛋立刻 `texImage2D` 上传（同一任务内，缓冲尚未呈现）。纸自己的循环这期间只推进状态、不画 |
| 纸遮罩 | `elemAt` / `flakeAt` 需要的「无压花」「无压花无砂子」两张变体每 4 帧刷新一次，不是每帧 |
| 墨 | 页面视口区域 `texElementSubImage2D` 进 RGBA8，**直通 alpha**（实测；`inkAt()` 在 shader 里预乘），行 0 在上，不翻转 |
| 首帧 | 在 canvas `paint` 事件里画，必须等于页面（效果从 0 渐入）；重 shader 用 `KHR_parallel_shader_compile` 异步编译，未就绪前输出直通 |
| 末帧 | 季节模块 `done` 时最后一帧等于页面，然后 `root.exit()` |
| 纸 flow 扭曲 | 纸浆专用，连同 `tFlow`、`uploadFlow`、`flowOn` 一起删除 |
| 冬 | 冰花几何分帧生成（每帧 ≤4 ms），不再在第二帧卡 100 ms |
| 时辰 | 只经 `lightAt(hour)` 影响光的方向与色调；秋天始终入夜升月（用户 11-06 定：先这样） |
| 开发 | `localStorage['paper-term']`（非生产）覆盖节气，`paper-egg-idle-ms` 覆盖静置阈值 |

## 结构

```
paper/egg/
  PaperEgg.tsx engine.ts            不变（engine 只换 session）
  session.ts                         外壳：浮层、按钮、输入转发、30fps、阶段、纸驱动、结束
  phase.ts                           reading → entering → immersed → exiting；纸 profile 覆盖
  bridge.ts                          state / profile / ready / lost / paper 驱动
  capture dom float idle images ink-size   不变
  gl/header.ts gl/live.ts            共享 GLSL 头与 Live 上下文（program、FBO、上传、纸/墨纹理）
  seasons/types.ts seasons/index.ts  季节模块接口与分派
  seasons/{spring,summer,autumn,winter}/  各季（单文件 ≤500 行，shader 单独成文件）
```

删除：`fluid.ts falls.ts ink-gl.ts ink-shaders.ts reactions.ts sprites.ts sprite-art.ts sprite-draw.ts` 及其测试；`phase.ts` 的纸浆曲线（`eggCurves`、`liftOf`、`EGG_TIMING.sinkS` 等）。

### 季节模块接口

```ts
interface SeasonEffect {
  frame(dt: number, t: number): void   // 画完整一帧到默认 framebuffer；首次在 paint 内 dt=0
  pointer(e: { kind: 'move' | 'down' | 'leave'; x: number; y: number; now: number }): void
  exit(): void                         // 任意阶段可调
  readonly done: boolean               // 退出动画完且末帧 = 页面
  dispose(): void                      // 任意阶段可调（resize 等立即结束），释放 GL
}
type SeasonFactory = (live: Live) => SeasonEffect
```

## 性能（M4 Max，Chrome，HTML-in-Canvas，原型实测）

每帧 GPU（纸 1 遍 1× + 季节效果）：1280×860@2x 约 2.0–2.9 ms，1728×1117@2x 约 2.2–3.7 ms；30fps 下 60–110 ms/s，与 11-05 版纸浆彩蛋（127 ms/s）相当或更低。遮罩每 4 帧刷新，摊下来每帧 +0.2–0.4 ms。低端机未实测。

## 验收

- 四季在真实页面（文章页、首页）进入/互动/退出，浅色深色，无报错。
- 首帧与 DOM 逐像素差 < 200（同一张静止纸上测）；退出后 `-fuzz 1%` 差 0（纸顶部晕染自己在动，严格比较会有 ≤2/255 的漂移）。
- 30fps 稳定，无 >50 ms 长任务（冬天分帧生成后）。
- 改窗口大小、切标签、换主题、换路由立即结束，页面状态（滚动、输入、焦点）不丢。
