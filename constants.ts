
import { Theme } from './types'

// =============================================================================
// FRAME-RATE INDEPENDENT PHYSICS
// All values are now "per second" or normalized to 60fps baseline
// The game loop will multiply these by timeFactor for consistent behavior
// =============================================================================

// Target frame rate for physics calculations
export const TARGET_FPS = 60
export const FRAME_TIME = 1000 / TARGET_FPS // ~16.67ms

// Geometry Dash-like physics - snappy and responsive
// These values are calibrated for 60fps and will be adjusted by timeFactor
export const GRAVITY = 0.8 // Applied per frame at 60fps
export const JUMP_FORCE = -14 // Initial velocity
export const DOUBLE_JUMP_FORCE = -12 // Double jump velocity
export const JUMP_ADDITIONAL_FORCE = -0.3 // Hold bonus per frame at 60fps
export const MAX_JUMP_FRAMES = 8 // Frames at 60fps (converted to time internally)
export const MAX_JUMPS = 2 // Allow double jump

// Dash/Air Control
export const DASH_SPEED = 25
export const DASH_COOLDOWN = 60 // frames at 60fps
export const AIR_CONTROL = 0.3

// Constant speed like Geometry Dash
export const INITIAL_SPEED = 12
export const MAX_SPEED = 50
export const SPEED_INCREMENT = 0

// Speed Phase Config
export const SPEED_WAVE_DURATION = 360 // frames at 60fps
export const SPEED_WAVE_AMPLITUDE = 2

// =============================================================================
// CANVAS & RENDERING
// =============================================================================

// Internal canvas resolution (fixed for consistency)
export const CANVAS_WIDTH = 1280
export const CANVAS_HEIGHT = 720

// Maximum pixel ratio to prevent performance issues on Retina displays
export const MAX_PIXEL_RATIO = 1.5

// =============================================================================
// PLAYER
// =============================================================================

export const PLAYER_WIDTH = 40
export const PLAYER_HEIGHT = 40
export const PLAYER_X_OFFSET = 250

// =============================================================================
// PLATFORMS
// =============================================================================

export const PLATFORM_MIN_WIDTH = 150
export const PLATFORM_MAX_WIDTH = 450
export const PLATFORM_HEIGHT = 26
export const PLATFORM_COLOR = '#FFFFFF'
export const PLATFORM_BUFFER_COUNT = 10

export const GAP_MIN_MULTIPLIER = 12
export const GAP_MAX_MULTIPLIER = 26

// =============================================================================
// UI & EFFECTS
// =============================================================================

export const FLOATING_TEXT_LIFESPAN = 60 // frames at 60fps

export const STORAGE_KEY_DATA = 'bounce-runner-v2-data'

// =============================================================================
// PLATFORM TYPES
// =============================================================================

export const PLATFORM_TYPES = {
  default: {
    gradient: ["#6633EE", "#4C1ACD"],
    stripeOpacity: 0.1,
    scoreBonus: 0
  },
  green: {
    gradient: ["#96C231", "#4B6118"],
    stripeOpacity: 0.15,
    scoreBonus: 50
  },
  rare: {
    gradient: ["#FF8F00", "#D95F00"],
    stripeOpacity: 0.12,
    scoreBonus: 100
  },
  hazard: {
    gradient: ["#FF3B3B", "#C91818"],
    stripeOpacity: 0.2,
    scoreBonus: -50
  }
}

// =============================================================================
// THEMES - Unlocked progressively during gameplay
// Order: White (start) -> Purple (2000m) -> Cyan (10000m) -> Hot (25000m) -> Green (50000m)
// =============================================================================

export const THEMES: Theme[] = [
  {
    id: 'white',
    name: 'Pure Light',
    primary: '#FFFFFF',
    accent: '#E0E0E0',
    bg: '#0f0f17',
    unlockScore: 0, // Starting theme
  },
  {
    id: 'purple',
    name: 'Neon Core',
    primary: '#8F00FF',
    accent: '#B366FF',
    bg: '#0f0f17',
    unlockScore: 2000, // First milestone
  },
  {
    id: 'cyan',
    name: 'Cyber Pulse',
    primary: '#00F0FF',
    accent: '#0033FF',
    bg: '#001015',
    unlockScore: 10000, // Second milestone
  },
  {
    id: 'hot',
    name: 'Overheat',
    primary: '#FF2A6D',
    accent: '#FFD700',
    bg: '#1a0505',
    unlockScore: 25000, // Third milestone
  },
  {
    id: 'toxic',
    name: 'Bio Hazard',
    primary: '#39FF14',
    accent: '#CCFF00',
    bg: '#0a150a',
    unlockScore: 50000, // Final milestone - Green
  }
]

// Get theme by distance score
export function getThemeForDistance(distance: number): Theme {
  // Return the highest unlocked theme for the given distance
  let activeTheme = THEMES[0]
  for (const theme of THEMES) {
    if (distance >= theme.unlockScore) {
      activeTheme = theme
    }
  }
  return activeTheme
}

// Get the highest unlocked theme ID based on high score
export function getHighestUnlockedThemeId(highScore: number): string {
  let themeId = THEMES[0].id
  for (const theme of THEMES) {
    if (highScore >= theme.unlockScore) {
      themeId = theme.id
    }
  }
  return themeId
}

// Convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    }
    : { r: 255, g: 255, b: 255 }
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// Interpolate between two hex colors
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)

  const r = rgb1.r + (rgb2.r - rgb1.r) * factor
  const g = rgb1.g + (rgb2.g - rgb1.g) * factor
  const b = rgb1.b + (rgb2.b - rgb1.b) * factor

  return rgbToHex(r, g, b)
}

// Get interpolated color based on score progress between themes
export function getInterpolatedThemeColor(score: number): string {
  // Find current and next theme
  let currentTheme = THEMES[0]
  let nextTheme: Theme | null = null

  for (let i = 0; i < THEMES.length; i++) {
    if (score >= THEMES[i].unlockScore) {
      currentTheme = THEMES[i]
      nextTheme = THEMES[i + 1] || null
    } else {
      break
    }
  }

  // If no next theme, return current theme color
  if (!nextTheme) {
    return currentTheme.primary
  }

  // Calculate progress (0 to 1) between current and next theme
  const currentThreshold = currentTheme.unlockScore
  const nextThreshold = nextTheme.unlockScore
  const progress = (score - currentThreshold) / (nextThreshold - currentThreshold)

  // Clamp progress between 0 and 1
  const clampedProgress = Math.min(1, Math.max(0, progress))

  // Interpolate between current and next theme colors
  return interpolateColor(currentTheme.primary, nextTheme.primary, clampedProgress)
}

// =============================================================================
// FICTIONAL USERNAMES FOR LEADERBOARD
// =============================================================================

export const FICTIONAL_USERNAMES = [
  // Spain
  'CarlosRapido', 'MariaVeloz', 'PabloRunner', 'LuciaFlash', 'JavierSprint',
  'IsabelQuick', 'DiegoStorm', 'ElenaBlaze', 'FernandoWind', 'SofiaLight',
  // France
  'PierreVite', 'MarieClair', 'JeanSpeed', 'ClaireLune', 'LucasFoudre',
  'EmmaRapide', 'HugoBolt', 'ChloeEclair', 'LeoTonnerre', 'ManonSwift',
  // Korea
  'MinJunStar', 'JiWonFlash', 'SeoJinBolt', 'HyunWooRun', 'YunaSky',
  'TaeMinPro', 'SoYoungAce', 'JunHoKing', 'EunBiQueen', 'DongHyunX',
  // China
  'WeiLongDragon', 'XiaoMingPro', 'YuXuanStar', 'LiHuaWin', 'ZhangWeiX',
  'ChenYuBolt', 'WangFangAce', 'LiuYangPro', 'HuangMeiX', 'ZhouJunKing',
  // India
  'ArjunFlash', 'PriyaStar', 'RahulBolt', 'AnanyaWin', 'VikramPro',
  'AishaSky', 'RohanKing', 'NehaPro', 'KaranAce', 'DiviQueen',
  // USA
  'JakeRunner', 'EmilyBlaze', 'MikeStorm', 'SarahFlash', 'ChrisBolt',
  'JessicaPro', 'BrandonKing', 'AshleyWin', 'TylerAce', 'AmandaStar',
  // UK
  'JamesSwift', 'OliviaQuick', 'HarryBolt', 'SophieFlash', 'GeorgeKing',
  'CharlottePro', 'WilliamAce', 'EmilyRun', 'ThomasWin', 'IslaSpeed',
  // Australia
  'LiamOz', 'OliviaAus', 'NoahRunner', 'AvaFlash', 'EthanBolt',
  'MiaSprint', 'LucasKing', 'CharlotteAce', 'MasonPro', 'AmyWin',
  // Brazil
  'PedroBR', 'JulianaFlash', 'LucasBolt', 'AnaRunner', 'GabrielPro',
  'BiancaKing', 'MatheusAce', 'LarisaWin', 'RafaelStar', 'CamilaX',
  // Random cool names
  'NeonPhantom', 'CyberNinja', 'PixelKnight', 'QuantumRider', 'NovaBurst',
  'ZeroGravity', 'TurboMax', 'ShadowRun', 'LaserFox', 'CosmicDash',
  'VortexKid', 'ThunderX', 'NightHawk', 'StarDust', 'IronWolf',
  'CrystalAce', 'MagmaKing', 'FrostBite', 'BlazePro', 'StormChaser'
]

// Generate a random score for leaderboard
export function generateRandomScore(baseScore: number): number {
  const variance = baseScore * 0.3 // 30% variance
  return Math.floor(baseScore + (Math.random() - 0.5) * variance)
}

// Get shuffled usernames
export function getShuffledUsernames(count: number): string[] {
  const shuffled = [...FICTIONAL_USERNAMES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// =============================================================================
// PERFORMANCE QUALITY PRESETS
// =============================================================================

export interface QualityPreset {
  name: string
  pixelRatio: number
  enableBloom: boolean
  enableChromatic: boolean
  enableLiquid: boolean
  particleMultiplier: number
  backgroundEnabled: boolean
}

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  ultra: {
    name: 'Ultra',
    pixelRatio: 2.0,
    enableBloom: true,
    enableChromatic: true,
    enableLiquid: true,
    particleMultiplier: 1.5,
    backgroundEnabled: true
  },
  high: {
    name: 'High',
    pixelRatio: 1.5,
    enableBloom: true,
    enableChromatic: true,
    enableLiquid: true,
    particleMultiplier: 1.0,
    backgroundEnabled: true
  },
  medium: {
    name: 'Medium',
    pixelRatio: 1.0,
    enableBloom: true,
    enableChromatic: false,
    enableLiquid: false,
    particleMultiplier: 0.7,
    backgroundEnabled: true
  },
  low: {
    name: 'Low',
    pixelRatio: 1.0,
    enableBloom: false,
    enableChromatic: false,
    enableLiquid: false,
    particleMultiplier: 0.5,
    backgroundEnabled: false
  }
}
