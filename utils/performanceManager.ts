/**
 * Performance Manager
 * Ensures consistent 60fps gameplay across all devices regardless of:
 * - Display refresh rate (60Hz, 120Hz ProMotion, 144Hz, etc.)
 * - Device pixel ratio (1x, 2x Retina, 3x)
 * - Hardware capabilities
 */

export interface PerformanceSettings {
  targetFPS: number
  maxDeltaTime: number
  enablePostProcessing: boolean
  pixelRatioLimit: number
  reducedParticles: boolean
  backgroundQuality: 'high' | 'medium' | 'low' | 'off'
}

const DEFAULT_SETTINGS: PerformanceSettings = {
  targetFPS: 30,
  maxDeltaTime: 1000 / 30, // Cap at 30fps worth of movement to prevent physics explosions
  enablePostProcessing: true,
  pixelRatioLimit: 1.5, // Limit DPR for consistent performance
  reducedParticles: false,
  backgroundQuality: 'high'
}

class PerformanceManager {
  private settings: PerformanceSettings = { ...DEFAULT_SETTINGS }
  private lastFrameTime: number = 0
  private deltaTime: number = 0
  private frameInterval: number = 1000 / 60
  private accumulator: number = 0
  private fpsHistory: number[] = []
  private autoAdjustEnabled: boolean = true

  // Normalized time factor (1.0 = 60fps baseline)
  private timeFactor: number = 1.0

  // Singleton animation frame ID to coordinate all loops
  private globalRAF: number = 0
  private callbacks: Map<string, (deltaTime: number, timeFactor: number) => void> = new Map()
  private isRunning: boolean = false

  constructor() {
    this.detectDeviceCapabilities()
  }

  /**
   * Detect device capabilities and set initial quality
   */
  private detectDeviceCapabilities() {
    const isMacOS = /Mac/.test(navigator.platform)
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent)
    const isRetina = window.devicePixelRatio > 1.5
    const isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent)

    // macOS Chrome with Retina = known performance issues
    if (isMacOS && isChrome && isRetina) {
      console.log('[PerformanceManager] Detected macOS Chrome Retina - applying optimizations')
      this.settings.pixelRatioLimit = 1.0 // Force 1x rendering
      this.settings.backgroundQuality = 'medium'
    }

    // Mobile devices - reduce quality
    if (isMobile) {
      this.settings.pixelRatioLimit = 1.0
      this.settings.backgroundQuality = 'low'
      this.settings.reducedParticles = true
    }

    // Low-end device detection via hardware concurrency
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
      this.settings.backgroundQuality = 'medium'
    }

    this.frameInterval = 1000 / this.settings.targetFPS
  }

  /**
   * Get normalized pixel ratio for consistent rendering
   */
  getNormalizedPixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, this.settings.pixelRatioLimit)
  }

  /**
   * Get current settings
   */
  getSettings(): Readonly<PerformanceSettings> {
    return { ...this.settings }
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<PerformanceSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    this.frameInterval = 1000 / this.settings.targetFPS
  }

  /**
   * Register a callback to be called on each frame
   * All registered callbacks run in a single coordinated RAF loop
   */
  registerCallback(id: string, callback: (deltaTime: number, timeFactor: number) => void) {
    this.callbacks.set(id, callback)

    if (!this.isRunning && this.callbacks.size > 0) {
      this.start()
    }
  }

  /**
   * Unregister a callback
   */
  unregisterCallback(id: string) {
    this.callbacks.delete(id)

    if (this.callbacks.size === 0) {
      this.stop()
    }
  }

  /**
   * Start the unified game loop
   */
  private start() {
    if (this.isRunning) return

    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.tick()
  }

  /**
   * Stop the unified game loop
   */
  private stop() {
    this.isRunning = false
    if (this.globalRAF) {
      cancelAnimationFrame(this.globalRAF)
      this.globalRAF = 0
    }
  }

  /**
   * Main tick function - runs all callbacks with consistent timing
   */
  private tick = () => {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const rawDelta = currentTime - this.lastFrameTime

    // Frame rate limiting - only update if enough time has passed
    if (rawDelta < this.frameInterval * 0.9) {
      this.globalRAF = requestAnimationFrame(this.tick)
      return
    }

    this.lastFrameTime = currentTime

    // Clamp delta time to prevent physics explosions on tab switches
    this.deltaTime = Math.min(rawDelta, this.settings.maxDeltaTime)

    // Calculate time factor (1.0 = 60fps baseline)
    // This allows frame-rate independent physics
    this.timeFactor = this.deltaTime / (1000 / 60)

    // Track FPS for auto-adjustment
    const instantFPS = 1000 / rawDelta
    this.fpsHistory.push(instantFPS)
    if (this.fpsHistory.length > 60) this.fpsHistory.shift()

    // Auto-adjust quality if performance is poor
    if (this.autoAdjustEnabled && this.fpsHistory.length >= 60) {
      this.checkPerformance()
    }

    // Run all registered callbacks
    this.callbacks.forEach((callback) => {
      try {
        callback(this.deltaTime, this.timeFactor)
      } catch (e) {
        console.error('[PerformanceManager] Callback error:', e)
      }
    })

    this.globalRAF = requestAnimationFrame(this.tick)
  }

  /**
   * Check performance and auto-adjust quality
   */
  private checkPerformance() {
    const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length

    // If consistently below 45fps, reduce quality
    if (avgFPS < 45 && this.settings.backgroundQuality !== 'off') {
      console.log(`[PerformanceManager] Low FPS (${avgFPS.toFixed(1)}), reducing quality`)

      if (this.settings.backgroundQuality === 'high') {
        this.settings.backgroundQuality = 'medium'
      } else if (this.settings.backgroundQuality === 'medium') {
        this.settings.backgroundQuality = 'low'
      } else {
        this.settings.backgroundQuality = 'off'
      }

      this.settings.reducedParticles = true
      this.fpsHistory = [] // Reset for next check
    }
  }

  /**
   * Get current delta time in milliseconds
   */
  getDeltaTime(): number {
    return this.deltaTime
  }

  /**
   * Get time factor for frame-rate independent physics
   * Multiply your per-frame values by this to get consistent speeds
   */
  getTimeFactor(): number {
    return this.timeFactor
  }

  /**
   * Get current FPS
   */
  getCurrentFPS(): number {
    if (this.fpsHistory.length === 0) return 60
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
  }

  /**
   * Get a consistent timestamp for animations
   * This returns a time that progresses at 60fps regardless of actual refresh rate
   */
  getAnimationTime(): number {
    return performance.now() * (60 / this.settings.targetFPS)
  }

  /**
   * Disable auto quality adjustment
   */
  disableAutoAdjust() {
    this.autoAdjustEnabled = false
  }

  /**
   * Enable auto quality adjustment
   */
  enableAutoAdjust() {
    this.autoAdjustEnabled = true
  }
}

// Export singleton instance
export const performanceManager = new PerformanceManager()

// Export constants for frame-rate independent physics
export const PHYSICS_TIMESTEP = 1000 / 60 // 16.67ms baseline

/**
 * Helper to convert per-frame values to frame-rate independent values
 * @param perFrameValue - Value applied per frame at 60fps
 * @param timeFactor - Current time factor from performance manager
 */
export function applyTimeFactor(perFrameValue: number, timeFactor: number): number {
  return perFrameValue * timeFactor
}

