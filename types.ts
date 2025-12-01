
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  vy: number; // Used for "heat" visualization
  age: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isJumping: boolean;
  isGrounded: boolean;
  jumpCount: number;
  jumpHoldTimer: number;
  trailHistory: TrailPoint[]; // For ribbon rendering
  canDoubleJump: boolean; // Track if double jump is available
  isDashing: boolean; // Currently dashing
  dashCooldown: number; // Frames until dash is available
  comboCount: number; // Consecutive perfect jumps
  lastLandTime: number; // For combo timing
}

export type PlatformType = 'default' | 'green' | 'rare' | 'hazard';

export interface Item {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'boost';
  collected: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  id: number;
  type: PlatformType;
  items: Item[];
}

export interface BackgroundElement {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  id: number;
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export interface GameState {
  status: GameStatus;
  score: number;
  highScore: number;
  distance: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  vy: number;
}

export interface Theme {
  id: string;
  name: string;
  primary: string; // Player/Trail color
  accent: string;  // Glow/Secondary
  bg: string;      // Background base
  unlockScore: number;
}

export interface SaveData {
  highScore: number;
  unlockedThemes: string[];
  selectedThemeId: string;
  totalDistance: number;
}

export interface RemotePlayerState {
  id: string;
  username: string;
  x: number;
  y: number;
  alive: boolean;
  updatedAt: number;
}

