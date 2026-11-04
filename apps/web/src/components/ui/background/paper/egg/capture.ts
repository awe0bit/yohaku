export const KEEP_ATTR = 'data-paper-egg-keep'

export const viewportSize = (
  doc: {
    documentElement: { clientHeight: number; clientWidth: number }
  } = document,
) => ({
  width: doc.documentElement.clientWidth,
  height: doc.documentElement.clientHeight,
})
