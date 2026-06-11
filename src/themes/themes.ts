export interface ThemeColors {
  low: string
  mid: string
  high: string
  background: string
  accent: string
  lowRgb: [number, number, number]
  midRgb: [number, number, number]
  highRgb: [number, number, number]
  accentRgb: [number, number, number]
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return [r, g, b]
}

function makeTheme(hex: {
  low: string
  mid: string
  high: string
  background: string
  accent: string
}): ThemeColors {
  return {
    ...hex,
    lowRgb: hexToRgb(hex.low),
    midRgb: hexToRgb(hex.mid),
    highRgb: hexToRgb(hex.high),
    accentRgb: hexToRgb(hex.accent),
  }
}

export const themes: Record<string, ThemeColors> = {
  neon: makeTheme({
    low: '#0044ff',
    mid: '#00ff88',
    high: '#ff4400',
    background: '#0a0a1a',
    accent: '#ff00ff',
  }),
  aurora: makeTheme({
    low: '#00ccaa',
    mid: '#44ffcc',
    high: '#aaffee',
    background: '#050510',
    accent: '#88ffdd',
  }),
  flame: makeTheme({
    low: '#ff2200',
    mid: '#ff8800',
    high: '#ffdd00',
    background: '#0a0500',
    accent: '#ff4400',
  }),
  ocean: makeTheme({
    low: '#003366',
    mid: '#0066cc',
    high: '#00aaff',
    background: '#000510',
    accent: '#00bbff',
  }),
}

export type ThemeName = keyof typeof themes
