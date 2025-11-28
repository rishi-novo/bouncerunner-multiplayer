
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
export const INITIAL_SPEED = 12git
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
// THEMES
// =============================================================================

export const THEMES: Theme[] = [
  {
    id: 'default',
    name: 'Neon Core',
    primary: '#8F00FF',
    accent: '#ffffff',
    bg: '#0f0f17',
    unlockScore: 0,
  },
  {
    id: 'cyan',
    name: 'Cyber Pulse',
    primary: '#00F0FF',
    accent: '#0033FF',
    bg: '#001015',
    unlockScore: 250,
  },
  {
    id: 'toxic',
    name: 'Bio Hazard',
    primary: '#39FF14',
    accent: '#CCFF00',
    bg: '#0a150a',
    unlockScore: 500,
  },
  {
    id: 'hot',
    name: 'Overheat',
    primary: '#FF2A6D',
    accent: '#FFD700',
    bg: '#1a0505',
    unlockScore: 1000,
  },
  {
    id: 'gold',
    name: 'Ascended',
    primary: '#FFD700',
    accent: '#FFFFFF',
    bg: '#151515',
    unlockScore: 2000,
  }
]

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
