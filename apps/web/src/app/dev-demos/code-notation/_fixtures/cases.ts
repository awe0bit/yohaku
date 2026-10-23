export type NotationGroup = 'diff' | 'highlight' | 'word' | 'meta' | 'syntax'

export interface NotationCase {
  description: string
  group: NotationGroup
  key: string
  label: string
  lang: string
  meta?: string
  source: string
}

export const notationCases: NotationCase[] = [
  {
    group: 'diff',
    key: 'diff-inline',
    label: 'Added and removed lines',
    description: '行尾 `[!code ++]` / `[!code --]`，注释整段剥除。',
    lang: 'ts',
    source: `import { env } from 'next-runtime-env'

const API_URL = process.env.NEXT_PUBLIC_API_URL // [!code --]
const API_URL = env('NEXT_PUBLIC_API_URL') // [!code ++]

export const fetchJson = () => fetch(API_URL).then((r) => r.json())`,
  },
  {
    group: 'diff',
    key: 'diff-standalone',
    label: 'Comment-only line marks the next line',
    description: '独占一行之 notation 注释作用于下一行，自身被删去。',
    lang: 'ts',
    source: `export const resources = {
  // [!code --]
  settings: settings_zhCN,
  // [!code ++]
  settings: settings_en,
}`,
  },
  {
    group: 'diff',
    key: 'diff-range',
    label: 'Range :n',
    description: '`[!code ++:3]` 自本行起连标三行。',
    lang: 'ts',
    source: `export default defineConfig({
  banner: { // [!code ++:3]
    js: '#!/usr/bin/env node',
  },
  treeshake: true,
})`,
  },
  {
    group: 'diff',
    key: 'diff-keeps-comment',
    label: 'Keeps the rest of a comment',
    description:
      '注释中 notation 之外的文字保留；`// a // [!code ++]` 只剥后一段。',
    lang: 'ts',
    source: `reply.send(html) // inject meta tags here // [!code ++]
const template = load() // cached on first call [!code ++]
const unchanged = true // plain comment`,
  },
  {
    group: 'highlight',
    key: 'highlight',
    label: 'Highlight and hl',
    description: '`[!code highlight]` 与简写 `[!code hl]` 同效。',
    lang: 'tsx',
    source: `export default function Page() {
  const node = await actionReturnReactNode() // [!code highlight]
  setNode(node) // [!code hl]
  return <div>{node}</div>
}`,
  },
  {
    group: 'highlight',
    key: 'highlight-range',
    label: 'Highlight range',
    description: '`[!code highlight:2]` 连标两行。',
    lang: 'python',
    source: `def handler(event):
    body = parse(event) # [!code highlight:2]
    validate(body)
    return respond(body)`,
  },
  {
    group: 'word',
    key: 'word-default',
    label: 'Word highlight to block end',
    description: '`[!code word:x]` 无范围时标出其后所有行中之 x。',
    lang: 'ts',
    source: `// [!code word:useQuery]
const query = useQuery({ queryKey: ['user'] })
const posts = useQuery({ queryKey: ['posts'] })
export { useQuery }`,
  },
  {
    group: 'word',
    key: 'word-range',
    label: 'Word highlight range',
    description: '`[!code word:x:1]` 只作用于下一行。',
    lang: 'ts',
    source: `// [!code word:token:1]
const token = await sign(user)
const other = token`,
  },
  {
    group: 'word',
    key: 'word-escaped',
    label: 'Escaped word',
    description: '`\\:` 转义冒号，词可跨 token 边界。',
    lang: 'css',
    source: String.raw`/* [!code word:a\:hover] */
a:hover { color: red; }`,
  },
  {
    group: 'meta',
    key: 'meta-lines',
    label: 'Fence meta {1,3-5}',
    description: 'fence meta 标行，行号从 1 起。',
    lang: 'ts',
    meta: '{1,3-5}',
    source: `@Module({
  imports: [
    AuthModule.forRoot(authConfig),
    UserModule,
    PostModule,
  ],
})
export class AppModule {}`,
  },
  {
    group: 'meta',
    key: 'meta-with-notation',
    label: 'Meta counts source lines',
    description:
      'meta 行号按删去 notation 行之前的源码计，与 shiki 一致：{3} 落在 `b`。',
    lang: 'ts',
    meta: '{3} filename="example.ts"',
    source: `const a = 1
// [!code ++]
const b = 2
const c = 3`,
  },
  {
    group: 'syntax',
    key: 'comment-hash',
    label: '# comments',
    description: 'shell / yaml / python 的 # 注释。',
    lang: 'bash',
    source: `pnpm install
pnpm add @pierre/highlights # [!code ++]
pnpm add shiki # [!code --]`,
  },
  {
    group: 'syntax',
    key: 'comment-dash',
    label: '-- comments',
    description: 'SQL 的 -- 注释。',
    lang: 'sql',
    source: `select id, title from posts
where deleted_at is null -- [!code ++]
order by created desc`,
  },
  {
    group: 'syntax',
    key: 'comment-block',
    label: 'Block comments',
    description: '`/* */`、`<!-- -->`、JSX `{/* */}`。',
    lang: 'tsx',
    source: `const style = { color: 'red' } /* [!code --] */
const style = { color: 'var(--accent)' } /* [!code ++] */
return <Card /> {/* [!code highlight] */}`,
  },
  {
    group: 'syntax',
    key: 'html-comment',
    label: 'HTML comments',
    description: '`<!-- [!code ++] -->`。',
    lang: 'html',
    source: `<head>
  <meta charset="utf-8" />
  <meta name="theme-color" content="#fff" /> <!-- [!code ++] -->
</head>`,
  },
  {
    group: 'syntax',
    key: 'mixed-long',
    label: 'Mixed, long lines',
    description: 'diff + highlight + word 同块，长行横向滚动时色带铺满。',
    lang: 'ts',
    source: `// [!code word:highlightCode]
import { highlightCode } from '@haklex/rich-editor-ui'
const html = await highlightCode(source, language, colorScheme === 'dark' ? 'dark' : 'light') // [!code ++]
const html = highlighter.codeToHtml(source, { lang: language, themes: SHIKI_DUAL_THEMES }) // [!code --]
setHtml(html) // [!code hl]`,
  },
  {
    group: 'syntax',
    key: 'unknown-language',
    label: 'Unsupported language',
    description: '无 lexer 之语言回落纯文本，notation 照常生效。',
    lang: 'nginx',
    source: `server {
  listen 443 ssl; # [!code ++]
  listen 80; # [!code --]
}`,
  },
]
