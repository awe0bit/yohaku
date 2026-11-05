export const HOLD_TYPE = 'egg-enter'
export const HOLD_MS = 150

export const holdStyle = (type: string, ms: number) =>
  [
    `html:active-view-transition-type(${type})::view-transition-old(root) { animation: ${type}-keep ${ms}ms both; }`,
    `html:active-view-transition-type(${type})::view-transition-new(root) { animation: ${type}-hide ${ms}ms both; }`,
    `@keyframes ${type}-keep { from, to { opacity: 1; } }`,
    `@keyframes ${type}-hide { from, to { opacity: 0; } }`,
  ].join('\n')
