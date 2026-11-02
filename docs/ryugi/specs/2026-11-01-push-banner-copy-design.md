# Yohaku 推送横幅文案改版

## 为什么

Yohaku（读者端 iOS app）的推送横幅信息量太少：

- 评论被回复：正文永远是「你在《X》中的评论收到了回复。」，看不到对方说了什么。
- 文章/手记发布：标题就是文章名，正文用 `summary`。线上最近 3 篇文章 summary 全为空，横幅只剩一行字；看不出是文章还是手记、是谁发的；没有封面。

目标：每条横幅一眼交代「谁、做了什么、内容是什么」，并带上回复原文和封面。

## 范围

| 事件 | 改动 |
|---|---|
| 评论被回复（`comment.replied`，category `YOHAKU_COMMENT_REPLIED`） | 改 |
| 文章发布（`content.published`，resource_type `post`） | 改 |
| 手记发布（`content.published`，resource_type `note`） | 改 |
| 速记发布（`content.published`，resource_type `recently`） | 不改 |
| Space 管理端新评论（`SPACE_COMMENT`） | 不改 |

## 定稿设计

看板：artboard `push-banners`，路径 `Yohaku/.ryugi/artifacts/artboard/push-banners/`，链接 https://ryugi.innei.dev/a/hZzqrIpLwcAqByWQqmUmt 。以下文字即定稿，不依赖看板存在。

### 1. 评论被回复（看板 `d-reply`，即 `q1-c`）

```
[发送者头像 + Yohaku 角标]  Innei                         现在
                           回复了你 · 《十月未央》
                           暂时还不行……GPX 导入已经在做了 [图片] 进度可以看这里
```

- 标题：发送者名。由通讯通知（`INSendMessageIntent` 的 sender displayName）决定，iOS 自动显示。
- 副标题：`回复了你 · 《{target_title}》`，本地化 key `PUSH_REPLY_SUBTITLE`。
- 正文：回复内容摘录（见「回复摘录规则」）。
- 头像：保持现状。
- **真机结果（2026-11-01，iPhone 17）**：1:1 通讯通知不显示 subtitle。已按退路实现：`speakableGroupName` = 文章名，且 `recipients` 须含「我」+ 发送者（无 recipients 时 iOS 忽略会话名）。iPhone 显示 `Innei` / `十月未央` / 回复摘录；Mac 镜像通知显示原始 content：`Innei` / `回复了你 · 《十月未央》` / 回复摘录（title 改为发送者名，避免重复「回复了你」）。
- **副标题不显示时的退路（用户已定）**：先在模拟器验证通讯通知是否显示 subtitle。若不显示，改为把《{target_title}》设为 `INSendMessageIntent` 的 `speakableGroupName`（会话名），接受标题区变成群聊式布局；不把文章名并进正文。

### 2. 文章发布（看板 `d-post`，即 `q2-c` 去掉正文 + `q4-b`）

```
[Yohaku 图标]  Innei 发布了新文章              现在   [封面缩略图]
              我的 AI Native iOS 开发验证工作流
```

- 标题：`{owner_name} 发布了新文章`，key `PUSH_POST_PUBLISHED_TITLE`。
- 副标题：文章标题。
- 正文：无。用户明确否决了摘要/正文摘录。
- 封面：有 `meta.cover` 时作为附件显示缩略图，长按展开看大图（看板 `q4-b` 下半部分）。

### 3. 手记发布（看板 `q5-b`）

```
[Yohaku 图标]  Innei 发布了新手记              现在   [封面缩略图]
              十月未央
              秋 · 五味杂陈
```

- 标题：`{owner_name} 发布了新手记`，key `PUSH_NOTE_PUBLISHED_TITLE`。
- 副标题：手记标题。
- 正文：`{weather} · {mood}`，缺哪个省哪个，都缺则无正文。不放摘要（用户明确否决）。
- 封面：同文章。

### 被否决的方案（不要做回去）

- 回复横幅标题写「X 回复了你」（q1-a/b）——用户选了对话式。
- 文章标题直接用文章名、副标题放「文章 · 分类」（q2-b）。
- 文章/手记正文放摘要或正文前 100 字。
- 手记副标题用编号「第 221 篇」（q3-b）。

## 回复摘录规则

服务端（mx-core）从回复的 `text`（markdown）生成 `reply_excerpt`：

1. 图片（`![..](..)`、`<img>`）→ 图片哨兵 ``。
2. 围栏代码块 → 代码哨兵 ``。行内代码保留文字。
3. 链接只留链接文字；裸 URL 保留。
4. 其余 markdown 标记去掉（复用 `remove-markdown`，`feed.controller.ts` 已在用）。
5. 连续空白（含换行）折叠为一个空格，trim。
6. 按字素截到 100 个，超出补 `…`。
7. 结果为空则不发该字段。

### 回复原文的隐私边界（用户已定）

现协议刻意不收评论原文（`packages/push-protocol/README.md`：comment text never enters the protocol；`protocol.spec.ts` 的 "rejects reply text" 测试）。本次**有意放宽**：允许 `reply_excerpt` 进入协议，但 relay **在该事件投递终结（APNs 成功或最终放弃）后，从 `push_events.payload` 中抹掉 `reply_excerpt`**，原文只在投递期间留存。

- 更新 README 的这句说明与 "rejects reply text" 测试（改为接受 `reply_excerpt`、仍拒绝其他原文字段）。
- relay `store.rs` 增加抹除逻辑与测试；重试期间字段必须仍在。
- relay 对 `reply_excerpt` 做长度上限校验（实现者定，≥ 100 字素对应的字节数）。

哨兵由 iOS 扩展替换为本地化文本 `[图片]` / `[代码]`（key `PUSH_TOKEN_IMAGE` / `PUSH_TOKEN_CODE`）。服务端不知道设备语言，所以不在服务端写死中文。

## 兼容旧版本 app（关键约束）

relay 不记录 app 版本，服务端无法区分新旧客户端。若服务端直接下发新 loc-key，旧版 app 的 Localizable 里没有这些 key，iOS 会把 key 名原样显示在横幅上。

因此：**服务端 `aps.alert` 保持今天的 loc-key 不变**，作为旧版 app 与扩展失败时的兜底；新信息全部放在自定义字段里，由新版 Notification Service Extension 重写 title/subtitle/body 并挂封面。

- 旧版 app：横幅和今天一样。
- 新版 app，扩展正常：新设计。
- 新版 app，扩展超时/出错：`serviceExtensionTimeWillExpire` 交付 best attempt。已改好的文案保留，封面可能缺失。

扩展里的文案用 `NSString.localizedUserNotificationString(forKey:arguments:)` 生成，它在送达时从主 app bundle 取本地化，新 key 加在现有 `apps/mobile/assets/notifications/Localizable.xcstrings` 即可。**这一点需在模拟器上实测**；若扩展内取不到，改由 `plugins/with-notification-localizations.cjs` 把同一份 xcstrings 也加进扩展 target。

## 改动清单

### mx-core / `packages/push-protocol`

- `ArticleData` 新增可选：`owner_name`、`cover_url`（https）、`weather`、`mood`。
- `CommentRepliedData` 新增可选：`reply_excerpt`。
- 全部可选，保持旧 core/relay 互通。

### mx-core / `apps/push-relay-rs`

- `protocol.rs` 同步上述可选字段与长度校验（`deny_unknown_fields`，**relay 必须先于 core 部署**）。
- `apns.rs`：
  - post/note 的 content 推送：`aps` 增加 `"mutable-content": 1`；自定义字段增加 `owner_name`、`cover_url`、`weather`、`mood`（有值才放）。`aps.alert` 不变。
  - recently 不加 `mutable-content`，不变。
  - comment.replied：自定义字段增加 `reply_excerpt`。`aps.alert` 不变。
- 更新 `test/apns-payloads.json` fixture。

### mx-core / `apps/core/src/modules/push`

- `enqueueContentPublished`：带上 `owner_name`（复用 `ownerDisplayName()`）、`cover_url`（`httpsUrlOf(document.meta?.cover)`）、note 的 `weather`/`mood`（`publicText`，各 ≤ 40）。
- `enqueueCommentReplied`：读回复 `text`，生成 `reply_excerpt`。清洗函数放新文件（如 `reply-excerpt.ts`）并配单测。

### Yohaku / `yohaku-oss/apps/mobile`

- `assets/notifications/Localizable.xcstrings` 新增 5 语言（en / ja / ko / zh-Hans / zh-Hant）：
  - `PUSH_REPLY_SUBTITLE`：zh-Hans `回复了你 · 《%@》`
  - `PUSH_POST_PUBLISHED_TITLE`：zh-Hans `%@ 发布了新文章`
  - `PUSH_NOTE_PUBLISHED_TITLE`：zh-Hans `%@ 发布了新手记`
  - `PUSH_TOKEN_IMAGE`：zh-Hans `[图片]`
  - `PUSH_TOKEN_CODE`：zh-Hans `[代码]`
  - 其他语言按现有 key 的语气翻译；zh-Hant 用「回覆」「發佈」。
- `targets/notification-service/NotificationService.swift`：
  - `YOHAKU_COMMENT_REPLIED`：有 `reply_excerpt` 时，替换哨兵 → 设 body 为摘录、subtitle 为 `PUSH_REPLY_SUBTITLE`，再走现有 intent 捐赠（intent `content` 用新 body）。若 `content.updating(from:)` 丢了 subtitle，在其返回值上补设。
  - `YOHAKU_CONTENT` 且 `resource_type` ∈ {post, note} 且有 `owner_name`：重写 title/subtitle/body；有 `cover_url` 时下载为附件。
  - 封面下载复用 `AvatarLoader` 的约束（https、image/*、无重定向、超时 5s/8s），上限放宽到约 5 MB；写临时文件后建 `UNNotificationAttachment`。失败则不挂附件。
- 更新 `src/push/notification-localizations.test.ts`、`notification-extension.test.ts`。
- 提交后按 `Yohaku/AGENTS.md` bump `yohaku-oss` submodule。

## 部署顺序

1. relay（接受新可选字段）
2. core（开始发新字段）
3. app（随时上线；上线前用户看到的仍是旧横幅）

## 验收

- Rust：fixture 测试覆盖 post/note（有无封面、有无天气心情）、reply（有无摘录）。
- core：`reply-excerpt` 单测覆盖图片、代码块、链接、纯图片回复、超长截断、emoji 字素。
- 端到端：按 `verifying-yohaku-apns` skill，本地 mx-core → 本地 relay → APNs sandbox → 模拟器，截图对照看板 `d-reply`、`d-post`、`q5-b`、`q4-b`（含长按展开）。
- 至少一种非中文系统语言下截图，确认无裸 key。

## 留给实现者

- APNs 4096 字节上限：超限时依次丢弃可选字段（先 `reply_excerpt` 截短，再 `cover_url`、`weather`/`mood`）。
- 哨兵字符的具体实现细节（只要 iOS 扩展与服务端一致）。
- 英/日/韩/繁体的具体措辞。
- 封面附件的临时文件命名、格式识别方式。
- 测试组织方式。
