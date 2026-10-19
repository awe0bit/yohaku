import type {
  LiveDeskState,
  PublicApplicationPresenceV2,
  PublicMediaPresenceV2,
} from '~/models/live-desk'

const svgDataURL = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">${body}</svg>`,
  )}`

const artworkDusk = svgDataURL(
  '<rect width="96" height="96" fill="#7c6a58"/><circle cx="62" cy="34" r="18" fill="#d8c6a4"/><rect y="62" width="96" height="34" fill="#5e5144"/>',
)
const artworkSea = svgDataURL(
  '<rect width="96" height="96" fill="#6f93a8"/><rect y="54" width="96" height="42" fill="#3f6178"/><circle cx="30" cy="30" r="12" fill="#f1e6cf"/>',
)
const iconCode = svgDataURL(
  '<rect x="8" y="8" width="80" height="80" rx="18" fill="#3b6ea8"/><path d="M38 34 24 48l14 14M58 34l14 14-14 14" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
)
const iconNotes = svgDataURL(
  '<rect x="8" y="8" width="80" height="80" rx="18" fill="#e9c46a"/><path d="M26 36h44M26 50h44M26 64h28" stroke="#5b4a1e" stroke-width="6" stroke-linecap="round"/>',
)

export interface LiveDeskScenario {
  build: (now: number) => LiveDeskState
  id: string
  label: string
}

const app = (
  displayName: string,
  icon: string | null,
  windowTitle: string | null,
): PublicApplicationPresenceV2 => ({
  activity: null,
  displayName,
  icon: icon ? { url: icon } : null,
  window: windowTitle ? { title: windowTitle } : null,
})

const media = (
  now: number,
  overrides: Partial<Omit<PublicMediaPresenceV2, 'playback'>> & {
    playback?: Partial<PublicMediaPresenceV2['playback']>
  },
): PublicMediaPresenceV2 => ({
  album: 'THE BOOK',
  artist: 'YOASOBI',
  artwork: { url: artworkDusk },
  kind: 'music',
  link: { url: 'https://music.apple.com/' },
  player: { displayName: 'Apple Music' },
  sessionId: 'demo',
  title: '夜に駆ける',
  ...overrides,
  playback: {
    anchorAt: new Date(now).toISOString(),
    durationMs: 261_000,
    positionMs: 102_000,
    rate: 1,
    state: 'playing',
    ...overrides.playback,
  },
})

const activeState = (
  now: number,
  projection: {
    application: PublicApplicationPresenceV2 | null
    media: PublicMediaPresenceV2 | null
  },
): LiveDeskState => ({
  phase: 'active',
  transport: 'rest',
  publicState: {
    epoch: 'demo',
    revision: now,
    schemaVersion: 2,
    projection: {
      ...projection,
      availability: 'active',
      expiresAt: new Date(now + 24 * 3_600_000).toISOString(),
      updatedAt: new Date(now).toISOString(),
    },
  },
})

export const liveDeskScenarios: LiveDeskScenario[] = [
  {
    id: 'media-app',
    label: '播放中 · 同时用应用',
    build: (now) =>
      activeState(now, {
        application: app('VS Code', iconCode, 'Yohaku'),
        media: media(now, {}),
      }),
  },
  {
    id: 'media-paused',
    label: '已暂停',
    build: (now) =>
      activeState(now, {
        application: null,
        media: media(now, {
          artwork: { url: artworkSea },
          playback: { positionMs: 48_000, state: 'paused' },
        }),
      }),
  },
  {
    id: 'no-artwork',
    label: '无封面',
    build: (now) =>
      activeState(now, {
        application: app('Notes', iconNotes, null),
        media: media(now, {
          album: null,
          artist: '一席',
          artwork: null,
          kind: 'podcast',
          player: { displayName: 'Podcasts' },
          playback: { durationMs: 2_460_000, positionMs: 1_230_000 },
          title: '在边缘处生活',
        }),
      }),
  },
  {
    id: 'media-no-timeline',
    label: '无时间线',
    build: (now) =>
      activeState(now, {
        application: null,
        media: media(now, {
          playback: { durationMs: null, positionMs: null },
        }),
      }),
  },
  {
    id: 'long-title',
    label: '超长标题',
    build: (now) =>
      activeState(now, {
        application: app(
          'Visual Studio Code — Insiders',
          iconCode,
          'apps/web/src/components/layout/header/internal/LiveDeskActivity.tsx',
        ),
        media: media(now, {
          album: 'Symphonies Nos. 1–9 (Remastered Deluxe Edition)',
          artist: 'Berliner Philharmoniker, Herbert von Karajan',
          title:
            'Symphony No. 9 in D Minor, Op. 125 "Choral": IV. Presto — Allegro assai',
        }),
      }),
  },
  {
    id: 'app-only',
    label: '仅应用',
    build: (now) =>
      activeState(now, {
        application: app('VS Code', iconCode, 'Yohaku'),
        media: null,
      }),
  },
  {
    id: 'app-bare',
    label: '仅应用 · 无图标无详情',
    build: (now) =>
      activeState(now, {
        application: app('Rockxy', null, null),
        media: null,
      }),
  },
]
