# 静置彩蛋重做：页面本体进入 canvas（slot 方案）

前作：`docs/superpowers/specs/2026-11-01-idle-pulp-easter-egg-design.md`（视觉、阶段、季节反应、触发条件全部沿用，本文只换「页面像素怎么进 GL」这一层）。

## 为什么重做

2026-11-04 线上彩蛋被下线（commit `119332103`，只摘了 `BackgroundTexture` 里的 `<PaperEgg>` 挂载，`paper/egg/` 代码还在）。用户认定前两版实现都有问题：

1. 11-01 版：克隆整站进可绘制画布截一张图。
2. 11-04 前的 `CanvasRoot` 版（commit `286dcd6f7`）：`useLayoutEffect` 里把 React 管理的 `#root` 节点手动搬进一张与文档等高的 `<canvas>`，常驻；彩蛋时 `captureViewport` 从这张大画布 `drawImage` 出一张静态快照。问题：React 节点被挪到 React 不知道的父级下；文档等高画布超出 16k/16M 被降采样而发糊，且平时每次 paint 都要重绘整页；彩蛋用的是截图而非页面本体。

用户的方向：不要截图，页面本体直接成为 canvas 子树；不支持的浏览器自动回退成普通元素；水合时服务端与客户端无差异。

## 目标

- 自定义元素 `<yohaku-root>` 包住 `#root`。SSR 与客户端渲染同一标签，水合零差异。
- 支持 HTML-in-Canvas 的浏览器：元素挂 shadow root，内含 `<slot>` 和一张 `<canvas content="drawable" layoutsubtree>`。**平时 slot 在 canvas 外**，页面是普通 DOM，零开销。
- 彩蛋期间把 `<slot>` 移进 canvas，墨 GL 直接用 `texElementSubImage2D` 读活的页面子树，不截图、不克隆、不 reparent light DOM。
- 不支持的浏览器：不挂 shadow root，`<yohaku-root>` 等同 `display:block` 的 div，彩蛋不触发。
- 彩蛋阶段曲线、触发条件、退出方式与 11-01 设计一致；视觉以下线前代码为基线，差异见第 4 节。

## 非目标

- 页面常驻 canvas（用户在 A/B 中选了 B：只在彩蛋期间进入）。
- 彩蛋期间页面内容实时更新（用户接受彩蛋期间画面冻结）。
- 移动端、Safari、Firefox。
- 新的墨效果。洇墨 shader、精灵、季节、背景联动保持原样（配图随墨化开是唯一的新观感，见第 4 节）。

## 反目标（出现即失败）

- 进入或退出时任何一帧空白或闪烁。
- 进出后 React state、输入框内容、焦点、iframe、滚动位置有任何丢失。
- 进出前后布局偏移（逐像素差应为 0，正在播放的动画除外）。
- 平时（非彩蛋）页面有任何 canvas 绘制开销，或 DOM 结构与水合结果不同。

## 约束

- 平台：Chrome 156 带 `--enable-blink-features=CanvasDrawElement`（或 `chrome://flags` 中 HTML-in-Canvas 开启）。能力检测：`'drawElementImage' in CanvasRenderingContext2D.prototype`。
- 属性名：Chrome 2026-09 把 `layoutsubtree` 改名为 `content="drawable"`，两者都写。
- 文件规模：单文件 ≤500 行，组件 ≤300 行；不写注释，除非是平台怪癖（下面「已验证的平台事实」大多值得一行注释）。
- `dev/` 目录被 gitignore；dev demo 走 `app/dev-demos/`。
- 只对改动文件跑 lint/typecheck。

## 已验证的平台事实（原型 `apps/web/src/app/dev-demos/canvas-slot/`，未提交）

这些都是实测结论，实现时照做，不要再试别的写法：

1. **slot 进出 canvas 不丢状态**：React 组件不重挂、计数器/输入值/焦点保留、iframe 不重载、`scrollY` 与文档高度不变，进出前后逐像素差 0、`layout-shift` 0 条。
2. **CSS animation 会因 slot 移动而重启**。做法：进入前 `document.getAnimations()` 记下子树内每个 `CSSAnimation` 的 `(target, animationName, currentTime)`；移入后把新建出的同名动画 `currentTime` 设回并 `pause()`；退出移回后再把 `currentTime` 设回（不 pause）。原型实测 3349ms → 冻结 3349ms → 退出后 3349ms 接着播。参考 `canvas-slot/_components/freeze.ts`。
3. **canvas 子元素会 shrink-to-fit**：shadow 样式里加 `.frame[data-drawn] ::slotted(*) { width: 100% }`，不碰 React 管的 DOM。
4. **位图尺寸按 canvas 自身 `clientWidth/clientHeight × dpr`**，不要按视口算（否则约 6% 拉伸）。
5. **尺寸与滚动**：shadow 内一层 `.frame { position: relative }`。进入时先把 `frame.style.height` 锁成当前 `offsetHeight`，canvas 为 `position: sticky; top: 0; width: 100%; height: 100vh`。这样文档高度、`window.scrollY` 都不变。
6. **GL 上传**：旧的 `texElementImage2D` 在 Chrome 156 不可用（任何参数组合都报 `Invalid internalformat`）。必须先 `texImage2D(TEXTURE_2D, 0, RGBA8, w, h, 0, RGBA, UNSIGNED_BYTE, null)` 分配，再 `texElementSubImage2D(TEXTURE_2D, 0, 0, 0, element, { width, height })`。配置字典成员：`sx, sy, swidth, sheight, width, height`。
7. **上传与绘制必须在 canvas 的 `paint` 事件里完成**。同一帧里 rAF 先于 `paint`；只在 rAF 里画会空一帧。
8. **冻结后只上传一次**：首个 `paint` 上传，之后忽略 `paint`。不冻结时每帧都上传（3 秒 179 次）。
9. **首帧闪烁是平台行为**：子树某区域第一次经 canvas 显示时，Chrome 晚一帧上屏（与 GL/2D 无关；预编译 shader、预分配纹理、预设尺寸、先显示透明 canvas、占位元素预热全部无效；换了可见内容会再犯）。唯一有效解法：把「移入 canvas」包进 `document.startViewTransition({ update, types: ['egg-enter'] })`，150ms 内 `::view-transition-old(root)` 保持不透明、`::view-transition-new(root)` 保持 `opacity: 0`（默认 new 叠在 old 上，它截到的正是空白帧）。样式只在 `html:active-view-transition-type(egg-enter)` 下生效，避免影响 `paper-swap.ts` 的 View Transition。实测 7 次 0 闪。
10. **自定义元素 define 后 HMR 不替换类**，验证必须整页刷新。

## 怎么做（已定）

### 1. `<yohaku-root>` 取代 `CanvasRoot`

- 新文件 `components/common/yohaku-root/`：`element.ts`（类 + `customElements.define`，`typeof window` 守卫）、`freeze.ts`（第 2 条）、`YohakuRoot.tsx`（客户端组件，import element 模块触发 define，渲染 `<yohaku-root><div data-theme id="root">{children}</div></yohaku-root>`）、JSX 内建元素类型声明。
- `#root` 保持为 `<yohaku-root>` 的唯一 light-DOM 子元素，`id`、`data-theme` 不变（`RootDataAttributeBinder.tsx` 用 `getElementById('root')`）。`#root` 上加 `drawable` 属性。
- `AppShell.tsx` 中 `<CanvasRoot>` 换成新组件。删除 `components/common/CanvasRoot.tsx`。
- `lib/html-in-canvas.ts`：保留能力检测（改名 `supportsDrawable`），删除 `mountCanvasRoot`、`captureViewport`、`getCanvasRoot`、`CANVAS_ROOT_ATTR`。
- 元素对外 API（给彩蛋引擎用）：
  - `supported: boolean`
  - `enter(): Promise<HTMLCanvasElement | null>`：锁 frame 高度 → View Transition 包住「记动画 → `data-drawn` → 设位图尺寸 → slot 移入 → 冻结动画」→ resolve 时返回那张 canvas。
  - `exit()`：slot 移回、去 `data-drawn`、解锁高度、恢复动画时间。同步，无过渡。
  - `onpaint` 的挂接由调用方经返回的 canvas 自己做。

### 2. 墨 GL 搬到这张 canvas 上

- `texElementSubImage2D` 只能用在「元素是其后代的那张 canvas」的上下文里，所以 `ink-gl.ts` 的 WebGL 上下文必须建在 `<yohaku-root>` 的 shadow canvas 上，不再建在 `session.ts` 的覆盖层 `glCanvas` 上。
- 覆盖层（`z-index: 9990` fixed）保留，只装精灵 2D canvas 和「回到正文」按钮，并继续接收指针事件。
- `ink.seed(snapshot)` 改为 `ink.seed(element, rect)`：在 `paint` 事件里调用，用第 6 条的写法把 `#root` 的**视口区域**上传（`sx/sy/swidth/sheight` 取当前视口在 `#root` 内的矩形，`width/height` 取墨纹理尺寸），然后照旧 copy 进 dye FBO，并在同一个 `paint` 里画出第一帧（第 7 条）。只传视口区域，避免长文 × dpr2 超出最大纹理尺寸。
- `FLIP_Y` / 预乘：原 `seed` 对 canvas 源用了 `UNPACK_FLIP_Y_WEBGL=true`、`PREMULTIPLY=false`。元素源的行序与预乘行为实现时以首帧画面与 DOM 逐像素对比为准来定。
- 退出：`exiting` 阶段的「套色复印」照旧在墨 GL 里播完，`stepEggPhase` 返回 `finished` 后再调 `root.exit()`，最后一帧墨输出应与页面原貌一致。

### 3. 引擎与会话改接

- `engine.ts` 的 `start()`：删 `captureViewport`；`backgroundReady` 等条件不变；改为 `await root.enter()` 拿 canvas，再 `startSession({ canvas, ... })`。
- `session.ts`：`hidePage` 删除（页面已在 canvas 里，只由墨绘制）。`preservePageState`（滚动/焦点）仍在退出时调用，作为兜底。`end()` 中先 `ink.dispose()`、再 `root.exit()`、再移除覆盖层。
- `engine.ts` 的 `update()`：换主题/开启减弱动效时 `session.end()` 的行为不变。
- `PaperEgg.tsx`：守卫从 `canCapture()` 改成 `<yohaku-root>.supported`。
- `BackgroundTexture.tsx` 恢复 `<PaperEgg>` 挂载（本次下线时删掉的那几行）。
- 删除 `capture.ts`/`capture.test.ts` 中只服务截图的部分（`KEEP_ATTR` 若仍被 `dom.ts` 用则保留）。

### 4. 视觉基线（用户 2026-11-05 定）

以下线前代码（`119332103`）为基线，不以 11-01 文档为准，差异如下：

| 项 | 决定 |
|---|---|
| 卡片 / header 底色 | **整块化墨**，不做 11-01 的 30% 底色。首帧与 DOM 逐像素一致。 |
| 配图 | **跟文字一起化墨**：能画进纹理的图随墨搅散，不再单独淡出。跨源且未带 `crossorigin` 的图在进入前先用 `crossOrigin="anonymous"` 试加载（每张 ≤1.5s）：成功就给原 `<img>` 补上 `crossorigin`、等解码后进入，图随墨化开；失败（服务器不给 CORS 头）才在覆盖层放克隆（带上同尺寸祖先的 mask / clip-path / 圆角），沿用旧 `setImageFade` 曲线淡出，退出复印时淡回。同页混合两种效果可以接受。（2026-11-05 用户追加：支持就不淡出，不支持才淡出） |
| `#root` 外的浮层 | **淡出再淡回**，照 11-01 §6.1 第 7 条：`FABContainer`、`ReadIndicator`、`Presence`、`TtsFloatingPlayer`、`CommentBlockGutter` 弹层、toast 等经 `RootPortal` 挂在 `body` 的元素，进入时 0.6s 淡到 opacity 0 且不可点，退出复印结束后淡回。背景画布（`BackgroundTexture`）与彩蛋覆盖层除外。 |

浮层淡出的实现：进入时遍历 `body` 的直接子元素，排除 `<yohaku-root>` 所在分支、背景 portal、彩蛋覆盖层（`KEEP_ATTR`），对其余元素记下 inline `opacity`/`transition`/`pointer-events` 后改写，退出时还原；之后新挂进 `body` 的 portal（如 toast）用 `MutationObserver` 同样处理，结束时断开。这是我的判断，实现者可以换更稳的做法，但还原必须完整。

### 5. 画质档位（用户 2026-11-05 定）

**30fps、墨 2×**。下线前代码为了性能把墨降到 1× 并只在「字清晰」阶段输出屏幕分辨率，细节损失明显；这次恢复：

| 项 | 下线前 | 本次 |
|---|---|---|
| 彩蛋帧率 | 30（`FRAME_MS = 33`） | 不变 |
| 墨（dye）分辨率 | `ink.resize(W, H)`，1× | `W × dpr`、`H × dpr`（dpr 上限 2） |
| 墨层输出 | `setOutputScale(c.sharp ? dpr : 1)` | 始终 `dpr` |
| 流体网格 | 现值 | 不变 |
| 纸背景 | 彩蛋期间 1× | 不变 |

实测依据（对照版 `.ryugi/artifacts/html/idle-easter-egg-hic/index.html`，1440×900 @2x，M4 Max，`EXT_disjoint_timer_query` 计两个 GL 上下文，彩蛋中采样 18s）：

| 档位 | 墨 GPU | 纸 GPU | 合计 |
|---|---|---|---|
| 下线前档（30fps、墨 1×、纸 1×、网格 96） | 47 ms/s | 68 ms/s | 约 12% |
| **本次档（30fps、墨 2×、墨层屏幕分辨率、纸 1×）** | 58 ms/s | 69 ms/s | 约 13% |
| 全画质（60fps、墨 2×、网格 128、纸跟随屏幕） | 245 ms/s | 192 ms/s | 约 44%（未采用） |

取图方式只影响进入时那一次上传，逐帧成本来自流体、墨分辨率、帧率与纸背景。基础款 M1/M2 GPU 约为 M4 Max 的 1/4–1/5，本次档估计占 50–60%，属估算未实测；实现后若在低端机明显掉帧，回报而不是自行降档。

### 6. 其他实现细节（我的判断）

- 元素源上传时 `UNPACK_FLIP_Y_WEBGL` 不生效（开了反而什么都传不上去）。原 `seed` 依赖 FLIP_Y 让行序与 canvas 源一致；改为先 `texElementSubImage2D` 进临时纹理，再用一次全屏 pass 上下翻转写进 `inkTex`。对照版已验证首帧与页面一致。WebGL1 上下文里 `texImage2D(RGBA, w, h, null)` + `texElementSubImage2D` 也可用，所以是否升 WebGL2 由实现者定。

- `ink.dispose()` 不能再调 `WEBGL_lose_context`：shadow canvas 跨会话复用，丢失上下文会让第二次彩蛋无法启动。改为只删资源，或每次会话新建 canvas，二选一。
- `onpaint` 必须在 View Transition 的 `update` 回调里、slot 移入的同一同步段内挂上，确保首个 `paint` 一定被接住（第 7 条）；`enter()` 的 Promise 只用于把 canvas 交给会话，不能等它 resolve 再挂 `onpaint`。

## 留给实现者

- 配图：跨源图片画进 canvas 时可能被排除或污染 canvas（规范的 read-back 限制）。**先验证**：在真实文章页进入彩蛋，看配图是否出现在首帧、`texElementSubImage2D` 是否抛错。
  - 若有图缺失：按第 4 节放克隆淡出；进入首帧必须与 DOM 一致。
  - 若上传直接抛错：停下回报，不要自行改方案。
- fixed/sticky 元素（header 等）在 canvas 内的定位是否与 DOM 一致：以首帧逐像素对比判断；不一致时在 `data-drawn` 下用 shadow 样式补偿，或回报。
- 退出时是否也会空一帧：原型 3 次退出未见，但真实页面需复测；若有，退出同样包一层 `egg-exit` 类型的保持型 View Transition。
- dpr 2（Retina）：原型只测了 dpr 1，需复测清晰度与首帧一致性。
- 单测：`freeze.ts` 的记录/恢复匹配逻辑、`supported` 守卫可单测；GL 与 View Transition 只做运行时验证。

## 验证（实现完成的标准）

用 agent-browser（有头，带 flag）在真实首页和一篇长文页上：

1. `agent-browser record --fps 60` 录「全新加载 → 进入」与「退出」，ffmpeg `signalstats` 逐帧 YAVG，相邻帧跳变 >2 计为闪烁；各 4 次，必须全 0。不要用 macOS `screencapture`（会录到用户整个桌面）。
2. 进入后 500ms 截图与进入前截图 `magick compare -fuzz 3%`，差异只允许来自正在动的元素。
3. 退出后：输入框内容、焦点、`scrollY`、动画 `currentTime` 与进入前一致。
4. 在不支持的浏览器（不带 flag 启动）中：`<yohaku-root>` 无 shadow root，页面与改动前一致，彩蛋不触发，控制台无报错。
5. 最后请用户在自己的 Chrome 里整页刷新后体感确认。

## 本次对话用到的产物

- 对照版 demo `.ryugi/artifacts/html/idle-easter-egg-hic/index.html`：原纸浆 demo（`.ryugi/artifacts/html/idle-easter-egg/index.html`，与 `docs/superpowers/specs/assets/2026-11-01-idle-pulp-egg-demo.html` 相同）只换取图为 HTML-in-Canvas、加墨 2× 档与 GPU 计时，用来定第 5 节的档位。
- 原型页 `apps/web/src/app/dev-demos/canvas-slot/`（`page.tsx`、`_components/yohaku-root.ts`、`egg-gl.ts`、`freeze.ts`）：验证了上面第 1–9 条。带三个调试开关：`?ctx=2d`（2D 对照）、`?warm=1`（占位预热，已证无效）、`?vt=0`（关掉 View Transition 修复做对照）。实现落地后删除整个目录，不提交。
- 用户录屏 `~/Library/Application Support/CleanShot/media/media_Y0fhvOQcNe/CleanShot 2026-11-04 at 11.42.59 PM.mp4`：第 56 帧空白，即第 9 条的问题。
