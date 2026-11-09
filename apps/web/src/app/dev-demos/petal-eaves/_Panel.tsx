import type { Season } from './_scene'
import type { EaveSettings } from './_useEaveCanvas'

const SEASONS: { id: Season; label: string; amount: string }[] = [
  { id: 'spring', label: '春 · 落樱', amount: '片/s' },
  { id: 'summer', label: '夏 · 夕立', amount: '雨势' },
  { id: 'autumn', label: '秋 · 红叶', amount: '叶势' },
  { id: 'winter', label: '冬 · 檐雪', amount: '雪势' },
]

interface PanelProps {
  onChange: (patch: Partial<EaveSettings>) => void
  settings: EaveSettings
}

export const Panel = ({ settings, onChange }: PanelProps) => {
  const season = SEASONS.find((s) => s.id === settings.season) ?? SEASONS[0]!
  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-60 flex-col gap-3 rounded-[2px] border border-neutral-4 bg-paper/90 p-4 font-sans text-xs text-neutral-8">
      <div className="grid grid-cols-2 gap-1">
        {SEASONS.map((s) => (
          <button
            className="rounded-[2px] border border-neutral-4 py-1 data-[on]:border-neutral-8 data-[on]:text-neutral-10 hover:bg-neutral-2"
            data-on={s.id === settings.season ? '' : undefined}
            key={s.id}
            type="button"
            onClick={() => onChange({ season: s.id })}
          >
            {s.label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1">
        风 {settings.wind}
        <input
          max={80}
          min={-80}
          type="range"
          value={settings.wind}
          onChange={(e) => onChange({ wind: Number(e.target.value) })}
        />
      </label>
      <label className="flex flex-col gap-1">
        {season.amount} {settings.density}
        <input
          max={8}
          min={0}
          step={0.5}
          type="range"
          value={settings.density}
          onChange={(e) => onChange({ density: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2">
        <input
          checked={settings.debug}
          type="checkbox"
          onChange={(e) => onChange({ debug: e.target.checked })}
        />
        显示屋檐线
      </label>
      <button
        className="rounded-[2px] border border-neutral-4 py-1 hover:bg-neutral-2"
        type="button"
        onClick={() => onChange({ clear: settings.clear + 1 })}
      >
        重来
      </button>
    </div>
  )
}
