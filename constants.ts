
import { Theme } from './types';

// Geometry Dash-like physics - snappy and responsive
export const GRAVITY = 0.8; // Stronger gravity for quicker falls
export const JUMP_FORCE = -14; // Strong initial jump
export const DOUBLE_JUMP_FORCE = -12; // Double jump available
export const JUMP_ADDITIONAL_FORCE = -0.3; // Minimal hold bonus for precision
export const MAX_JUMP_FRAMES = 8; // Very short hold time - more like GD
export const MAX_JUMPS = 2; // Allow double jump

// Dash/Air Control
export const DASH_SPEED = 25;
export const DASH_COOLDOWN = 60; // frames
export const AIR_CONTROL = 0.3; // Horizontal air movement

// Constant speed like Geometry Dash - no acceleration
export const INITIAL_SPEED = 8;
export const MAX_SPEED = 15; // Same as initial - constant speed!
export const SPEED_INCREMENT = 0; // No speed increase

// Speed Phase Config
export const SPEED_WAVE_DURATION = 360; // 6 seconds cycle
export const SPEED_WAVE_AMPLITUDE = 2; // How much speed fluctuates

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 40;
export const PLAYER_X_OFFSET = 250; 

export const PLATFORM_MIN_WIDTH = 150;
export const PLATFORM_MAX_WIDTH = 450;
export const PLATFORM_HEIGHT = 26; 
export const PLATFORM_COLOR = '#FFFFFF';
export const PLATFORM_BUFFER_COUNT = 10; 

// Reset gap multipliers
export const GAP_MIN_MULTIPLIER = 12; 
export const GAP_MAX_MULTIPLIER = 26;

export const FLOATING_TEXT_LIFESPAN = 60;

export const STORAGE_KEY_DATA = 'bounce-runner-v2-data';

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
};

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
];
