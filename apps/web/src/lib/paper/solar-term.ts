const DEG = Math.PI / 180

const julianCenturies = (date: Date) =>
  (date.getTime() / 86_400_000 + 2_440_587.5 - 2_451_545) / 36_525

export const apparentSolarLongitude = (date: Date) => {
  const t = julianCenturies(date)
  const l0 = 280.46646 + 36_000.76983 * t + 0.000_303_2 * t * t
  const m = (357.52911 + 35_999.05029 * t - 0.000_153_7 * t * t) * DEG
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m)
  const omega = (125.04 - 1934.136 * t) * DEG
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega)
  return ((lambda % 360) + 360) % 360
}

export const solarTermAt = (date: Date) =>
  Math.floor(((apparentSolarLongitude(date) - 315 + 360) % 360) / 15) % 24

export const solarTermForLocalDay = (date: Date) => {
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  return solarTermAt(endOfDay)
}

export const msUntilNextLocalMidnight = (now: Date) => {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}
