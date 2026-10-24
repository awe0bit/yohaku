import type { LinkModel } from '@mx-space/api-client'
import { LinkState, LinkType } from '@mx-space/api-client'

const NAMES = [
  '雾岛手记',
  'Pebble Notes',
  '栖木小站',
  'Lantern Log',
  '山茶与猫',
  'Quiet Compile',
  '北窗',
  'Driftwood Dev',
  '纸飞机',
  'Byte Garden',
  '枕水集',
  'Orbit Diary',
  '青梅煮字',
  'Low Tide',
  '拾光机',
  'Moss & Code',
  '半夏',
  'Tiny Harbor',
  '听雨轩',
  'Northbound',
  '柚子茶的博客',
  'Paper Lanterns',
  '一页书',
  'Static Bloom',
  '白夜行',
  'Sundial',
  '咸鱼翻身记',
  'Kite Theory',
  '落叶归档',
  'Glass Orchard',
  '未完待续',
  'Nocturne Notes',
  '橘子海',
  'Field Notes from Nowhere',
  '慢慢来',
  'Ember Index',
  '小森林',
  '一个特别特别长的站点名字 Long Name Stress Test',
  'Hush',
  '木木的后花园',
  'Atlas of Small Things',
  '夏至',
]

const DESCRIPTIONS = [
  '写代码，也写日子。',
  'Notes on frontend, type systems and slow mornings.',
  '在城市的缝隙里种一点草。',
  '',
  '记录每一次把 bug 变成 feature 的瞬间。',
  'A small corner for long-form essays.',
  '读书、跑步、偶尔折腾服务器。',
  '一句很长很长的自述，用来测试卡片在描述超过两行时的换行与留白表现，看看会不会挤到下面的链接。',
  'Mostly Rust, sometimes cooking.',
  '慢一点，也没关系。',
]

const OUTDATED = [
  '旧时光',
  'Lost Signal',
  '404 小屋',
  '断桥',
  'Faded Ink',
  '归零',
]
const BANNED = ['Spam Garden', '广告位招租']

const avatarFor = (index: number) => {
  const hue = (index * 47) % 360
  const glyph = (index * 7) % 3
  const shape = [
    `<circle cx="32" cy="38" r="14" fill="hsl(${hue} 45% 92%)"/>`,
    `<path d="M14 46 L32 18 L50 46 Z" fill="hsl(${hue} 45% 92%)"/>`,
    `<rect x="18" y="20" width="28" height="28" rx="6" fill="hsl(${hue} 45% 92%)"/>`,
  ][glyph]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 62%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360} 50% 42%)"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/>${shape}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const makeLink = (
  name: string,
  index: number,
  state: LinkState,
): LinkModel => ({
  id: `fixture-${state}-${index}`,
  createdAt: new Date(Date.UTC(2024, 0, 1 + index)).toISOString(),
  name,
  url: `https://friend-${index + 1}.example`,
  avatar: index % 3 === 2 ? null : avatarFor(index),
  description: DESCRIPTIONS[index % DESCRIPTIONS.length] || null,
  type: LinkType.Friend,
  state,
  hide: false,
  email: null,
})

export const fixtureFriends = NAMES.map((name, i) =>
  makeLink(name, i, LinkState.Pass),
)
export const fixtureOutdated = OUTDATED.map((name, i) =>
  makeLink(name, i, LinkState.Outdate),
)
export const fixtureBanned = BANNED.map((name, i) =>
  makeLink(name, i, LinkState.Banned),
)
