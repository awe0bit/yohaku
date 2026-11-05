const contextPrototype = () =>
  typeof CanvasRenderingContext2D === 'undefined'
    ? undefined
    : CanvasRenderingContext2D.prototype

export const supportsDrawable = (
  proto: object | undefined = contextPrototype(),
) => !!proto && 'drawElementImage' in proto
