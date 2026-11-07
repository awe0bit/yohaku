const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
const SYNODIC_DAYS = 29.530588853

export const moonAge = (now: number) => {
  const a = ((now - NEW_MOON) / 864e5 / SYNODIC_DAYS) % 1
  return (a + 1) % 1
}
