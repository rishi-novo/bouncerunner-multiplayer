
import { Player, Platform, Particle, BackgroundElement, Theme, TrailPoint, PlatformType, Item, FloatingText, RemotePlayerState } from '../types'
import {
  GRAVITY,
  JUMP_ADDITIONAL_FORCE,
  INITIAL_SPEED,
  PLATFORM_MIN_WIDTH,
  PLATFORM_MAX_WIDTH,
  GAP_MIN_MULTIPLIER,
  GAP_MAX_MULTIPLIER,
  CANVAS_HEIGHT,
  PLATFORM_TYPES,
  PLATFORM_HEIGHT,
  THEMES
} from '../constants'

// --- Procedural Generation ---

export const generatePlatform = (prevPlatform: Platform | null, difficultyMultiplier: number): Platform => {
  let x = 0
  let y = CANVAS_HEIGHT - 150
  let width = 1000

  if (prevPlatform) {
    const minGap = INITIAL_SPEED * GAP_MIN_MULTIPLIER * difficultyMultiplier
    const maxGap = INITIAL_SPEED * GAP_MAX_MULTIPLIER * difficultyMultiplier
    const gap = Math.random() * (maxGap - minGap) + minGap

    x = prevPlatform.x + prevPlatform.width + gap

    width = Math.random() * (PLATFORM_MAX_WIDTH - PLATFORM_MIN_WIDTH) + PLATFORM_MIN_WIDTH
    width = Math.max(PLATFORM_MIN_WIDTH, width * (1.2 - difficultyMultiplier * 0.2))

    const maxJumpHeight = 220
    const reachableHeightChange = maxJumpHeight * 0.7

    const minY = 200
    const maxY = CANVAS_HEIGHT - 100

    let nextY = prevPlatform.y + (Math.random() * reachableHeightChange * 2 - reachableHeightChange)

    if (nextY < minY) nextY = minY + Math.random() * 100
    if (nextY > maxY) nextY = maxY - Math.random() * 100

    y = nextY
  }

  // Determine Platform Type
  const roll = Math.random()
  let type: PlatformType = 'default'

  if (roll < 0.05) type = 'hazard'
  else if (roll < 0.10) type = 'rare'
  else if (roll < 0.20) type = 'green'

  // Generate Items
  const items: Item[] = []
  if (type !== 'hazard' && Math.random() < 0.4) {
    items.push({
      id: Date.now() + Math.random(),
      x: x + width / 2 - 10,
      y: y - 30,
      type: 'coin',
      collected: false
    })
  }

  return {
    x,
    y,
    width,
    height: PLATFORM_HEIGHT,
    id: Date.now() + Math.random(),
    type,
    items
  }
}

export const updateBackgroundElements = (elements: BackgroundElement[], width: number, height: number, speed: number): BackgroundElement[] => {
  return []
}

// --- Physics ---

export const getSpeedMultiplier = (tick: number): number => {
  return 1.0
}

export const updatePlayer = (
  player: Player,
  platforms: Platform[],
  baseSpeed: number,
  speedMultiplier: number,
  isHoldingJump: boolean,
  timeFactor: number = 1.0
): { updatedPlayer: Player, landedPlatform: Platform | null } => {
  const newPlayer = { ...player }
  const currentSpeed = baseSpeed * speedMultiplier
  let landedPlatform: Platform | null = null

  if (newPlayer.dashCooldown > 0) {
    newPlayer.dashCooldown -= timeFactor
  }

  if (isHoldingJump && newPlayer.jumpHoldTimer > 0) {
    newPlayer.vy += JUMP_ADDITIONAL_FORCE * timeFactor
    newPlayer.jumpHoldTimer -= timeFactor
  } else {
    newPlayer.jumpHoldTimer = 0
  }

  newPlayer.vy += GRAVITY * timeFactor

  const maxFallSpeed = 15
  if (newPlayer.vy > maxFallSpeed) {
    newPlayer.vy = maxFallSpeed
  }

  newPlayer.y += newPlayer.vy * timeFactor
  newPlayer.x += currentSpeed * timeFactor

  if (newPlayer.trailHistory.length === 0 ||
    Math.abs(newPlayer.trailHistory[newPlayer.trailHistory.length - 1].x - newPlayer.x) > 8) {

    newPlayer.trailHistory.push({
      x: newPlayer.x,
      y: newPlayer.y,
      vy: newPlayer.vy,
      age: 0
    })

    if (newPlayer.trailHistory.length > 60) {
      newPlayer.trailHistory.shift()
    }
  }

  newPlayer.isGrounded = false
  let landedThisFrame = false

  for (const platform of platforms) {
    if (newPlayer.vy >= 0) {
      const prevBottom = player.y + player.height

      if (
        newPlayer.x + newPlayer.width > platform.x + 10 &&
        newPlayer.x < platform.x + platform.width - 10
      ) {
        const velocityTolerance = Math.abs(newPlayer.vy) * timeFactor + 8
        if (
          newPlayer.y + newPlayer.height >= platform.y &&
          prevBottom <= platform.y + velocityTolerance
        ) {
          newPlayer.y = platform.y - newPlayer.height
          newPlayer.vy = 0
          newPlayer.isGrounded = true
          newPlayer.isJumping = false
          newPlayer.jumpHoldTimer = 0
          newPlayer.jumpCount = 0
          newPlayer.canDoubleJump = true
          landedThisFrame = true
          landedPlatform = platform
          newPlayer.lastLandTime = Date.now()
          break
        }
      }
    }
  }

  const isGrounded = landedThisFrame || newPlayer.isGrounded

  return {
    updatedPlayer: { ...newPlayer, isGrounded },
    landedPlatform
  }
}

export const checkItemCollisions = (player: Player, platforms: Platform[]) => {
  const events: { type: 'bonus' | 'penalty', scoreDelta: number }[] = []

  platforms.forEach(platform => {
    platform.items.forEach(item => {
      if (item.collected) return

      const itemSize = 20
      const hitX = player.x + player.width > item.x && player.x < item.x + itemSize
      const hitY = player.y + player.height > item.y && player.y < item.y + itemSize

      if (hitX && hitY) {
        item.collected = true
        if (item.type === 'coin') {
          events.push({ type: 'bonus', scoreDelta: 50 })
        }
      }
    })
  })

  return events
}

// --- Rendering ---

let animationTimeOffset = 0
export const getConsistentAnimationTime = (): number => {
  return performance.now() - animationTimeOffset
}

// Get all themes unlocked at the current score
export const getUnlockedThemes = (score: number): Theme[] => {
  return THEMES.filter(t => score >= t.unlockScore)
}

// Calculate progress to next theme (0-1)
export const getProgressToNextTheme = (score: number): { progress: number, nextTheme: Theme | null } => {
  const unlockedThemes = getUnlockedThemes(score)
  const currentThemeIndex = unlockedThemes.length - 1
  const nextTheme = THEMES[currentThemeIndex + 1] || null

  if (!nextTheme) return { progress: 1, nextTheme: null }

  const currentThreshold = unlockedThemes[currentThemeIndex]?.unlockScore || 0
  const nextThreshold = nextTheme.unlockScore
  const progress = (score - currentThreshold) / (nextThreshold - currentThreshold)

  return { progress: Math.min(1, Math.max(0, progress)), nextTheme }
}

export const drawComplexTrail = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  cameraX: number,
  theme: Theme,
  score: number,
  speedPhase: number
) => {
  if (player.trailHistory.length < 2) return

  const isAdvancedTrail = score > 150
  const isPulseTrail = score > 300

  ctx.beginPath()

  for (let i = 0; i < player.trailHistory.length; i++) {
    const point = player.trailHistory[i]
    const screenX = point.x - cameraX

    const px = screenX + player.width / 2
    const py = point.y + player.height / 2

    if (i === 0) {
      ctx.moveTo(px, py)
    } else {
      const prev = player.trailHistory[i - 1]
      const prevScreenX = prev.x - cameraX
      const prevPx = prevScreenX + player.width / 2
      const prevPy = prev.y + player.height / 2

      const cx = (prevPx + px) / 2
      const cy = (prevPy + py) / 2
      ctx.quadraticCurveTo(prevPx, prevPy, cx, cy)
    }
  }

  const currentCx = (player.x - cameraX) + player.width / 2
  const currentCy = player.y + player.height / 2
  ctx.lineTo(currentCx, currentCy)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.shadowBlur = isAdvancedTrail ? 20 : 10
  ctx.shadowColor = theme.primary

  const baseWidth = isAdvancedTrail ? 6 : 4
  const widthMod = Math.pow(1 / speedPhase, 3)
  const dynamicWidth = Math.max(1, baseWidth * widthMod)

  ctx.lineWidth = dynamicWidth
  ctx.strokeStyle = theme.primary

  const animTime = getConsistentAnimationTime()

  if (isPulseTrail) {
    const hue = (animTime / 10) % 360
    ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`
    ctx.shadowColor = `hsl(${hue}, 80%, 60%)`
  }

  if (Math.abs(player.vy) > 8) {
    ctx.strokeStyle = '#FFFFFF'
    ctx.shadowColor = '#FFFFFF'
    ctx.shadowBlur = 30
  }

  ctx.stroke()
  ctx.shadowBlur = 0
}

const drawPlatform = (
  ctx: CanvasRenderingContext2D,
  platform: Platform,
  screenX: number,
  animTime: number
) => {
  const { width, height, type } = platform
  const cfg = PLATFORM_TYPES[type] || PLATFORM_TYPES.default

  const y = platform.y
  const radius = 4

  const gradient = ctx.createLinearGradient(0, y, 0, y + height)
  gradient.addColorStop(0, cfg.gradient[0])
  gradient.addColorStop(1, cfg.gradient[1])
  ctx.fillStyle = gradient

  ctx.beginPath()
  ctx.moveTo(screenX + radius, y)
  ctx.lineTo(screenX + width - radius, y)
  ctx.quadraticCurveTo(screenX + width, y, screenX + width, y + radius)
  ctx.lineTo(screenX + width, y + height - radius)
  ctx.quadraticCurveTo(screenX + width, y + height, screenX + width - radius, y + height)
  ctx.lineTo(screenX + radius, y + height)
  ctx.quadraticCurveTo(screenX, y + height, screenX, y + height - radius)
  ctx.lineTo(screenX, y + radius)
  ctx.quadraticCurveTo(screenX, y, screenX + radius, y)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.rect(screenX, y, width, height)
  ctx.clip()

  ctx.lineWidth = 4
  ctx.strokeStyle = `rgba(255,255,255,${cfg.stripeOpacity})`

  const stripeSpacing = 20
  const angleOffset = 20

  const offset = (animTime / 50) % stripeSpacing

  for (let sx = screenX - 30 + offset; sx <= screenX + width + 30; sx += stripeSpacing) {
    ctx.beginPath()
    ctx.moveTo(sx, y - angleOffset)
    ctx.lineTo(sx + 20, y + height + angleOffset)
    ctx.stroke()
  }

  ctx.restore()
}

const drawEvolvedPlayer = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  playerScreenX: number,
  score: number,
  theme: Theme,
  speedPhase: number,
  animTime: number
) => {
  const isBoosting = player.isJumping && player.jumpHoldTimer > 0

  const baseSize = player.width
  const px = playerScreenX
  const py = player.y

  ctx.save()

  // Outer dark border for 8-bit feel
  ctx.fillStyle = '#050509'
  ctx.fillRect(px - 2, py - 2, baseSize + 4, baseSize + 4)

  // Main body square
  ctx.fillStyle = theme.primary
  ctx.fillRect(px, py, baseSize, baseSize)

  const unit = baseSize / 8

  // Top band / \"hair\" row
  ctx.fillStyle = '#111111'
  ctx.fillRect(px + unit, py + unit, unit * 6, unit)

  // Eyes
  ctx.fillStyle = '#000000'
  ctx.fillRect(px + unit * 2, py + unit * 3, unit, unit)
  ctx.fillRect(px + unit * 5, py + unit * 3, unit, unit)

  // Mouth
  ctx.fillRect(px + unit * 2, py + unit * 5, unit * 4, unit / 2)

  // Accent stripe at the right edge, using accent color when available
  ctx.fillStyle = theme.accent || '#FFFFFF'
  ctx.fillRect(px + unit * 6, py + unit * 2, unit, unit * 4)

  // Simple boost outline when boosting
  if (isBoosting) {
    ctx.strokeStyle = theme.accent || '#FFFFFF'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.5
    ctx.strokeRect(px - unit, py - unit, baseSize + unit * 2, baseSize + unit * 2)
    ctx.globalAlpha = 1
  }

  ctx.restore()
}

export const drawGame = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  player: Player,
  platforms: Platform[],
  particles: Particle[],
  bgElements: BackgroundElement[],
  floatingTexts: FloatingText[],
  cameraX: number,
  score: number,
  theme: Theme,
  speedPhase: number,
  remotePlayers?: RemotePlayerState[]
) => {
  const animTime = getConsistentAnimationTime()

  ctx.clearRect(0, 0, width, height)

  ctx.shadowColor = theme.primary
  ctx.shadowBlur = 0

  platforms.forEach((platform) => {
    const screenX = platform.x - cameraX
    if (screenX + platform.width > -100 && screenX < width + 100) {
      drawPlatform(ctx, platform, screenX, animTime)

      platform.items.forEach(item => {
        if (item.collected) return
        const itemScreenX = item.x - cameraX

        ctx.save()
        ctx.translate(itemScreenX + 10, item.y + 10)

        const bob = Math.sin(animTime / 200) * 5
        ctx.translate(0, bob)

        if (item.type === 'coin') {
          ctx.scale(Math.sin(animTime / 150), 1)
        }

        ctx.fillStyle = item.type === 'coin' ? '#FFD700' : '#00FFFF'
        ctx.shadowBlur = 10
        ctx.shadowColor = ctx.fillStyle

        ctx.beginPath()
        ctx.arc(0, 0, 8, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(0, 0, 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      })
    }
  })

  // Floating Texts
  floatingTexts.forEach(ft => {
    const screenX = ft.x - cameraX
    ctx.save()
    ctx.fillStyle = ft.color
    ctx.shadowColor = ft.color
    ctx.shadowBlur = 10
    ctx.font = "bold 28px 'Micro 5', monospace"
    ctx.textAlign = 'center'

    const alpha = Math.max(0, ft.life / 30)
    ctx.globalAlpha = Math.min(1.0, alpha)

    ctx.fillText(ft.text, screenX, ft.y)
    ctx.restore()
  })

  // Complex Trail
  drawComplexTrail(ctx, player, cameraX, theme, score, speedPhase)

  // Draw evolved player with layered borders
  const playerScreenX = player.x - cameraX
  drawEvolvedPlayer(ctx, player, playerScreenX, score, theme, speedPhase, animTime)

  // Remote players (multiplayer)
  if (remotePlayers && remotePlayers.length > 0) {
    remotePlayers.forEach(rp => {
      if (!rp.alive) return
      const screenX = rp.x - cameraX
      const size = player.width * 0.8

      ctx.save()

      // Body
      ctx.fillStyle = '#3b82f6'
      ctx.fillRect(screenX, rp.y, size, size)

      // Username label
      ctx.fillStyle = '#ffffff'
      ctx.font = "bold 18px 'Micro 5', monospace"
      ctx.textAlign = 'center'
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 4
      ctx.fillText(rp.username, screenX + size / 2, rp.y - 6)

      ctx.restore()
    })
  }

  // Particles
  particles.forEach(p => {
    const pScreenX = p.x - cameraX
    ctx.fillStyle = p.color
    ctx.globalAlpha = p.life
    ctx.beginPath()
    ctx.arc(pScreenX, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1.0
  })
}

export const createExplosion = (x: number, y: number, color: string, particleMultiplier: number = 1.0): Particle[] => {
  const particles: Particle[] = []
  const count = Math.floor(12 * particleMultiplier)
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 1.0,
      color: color,
      size: Math.random() * 5 + 2
    })
  }
  return particles
}

// Create theme transition explosion
export const createThemeTransitionEffect = (x: number, y: number, theme: Theme): Particle[] => {
  const particles: Particle[] = []

  // Large burst of particles in new theme color
  for (let i = 0; i < 50; i++) {
    const angle = (Math.PI * 2 * i) / 50
    const speed = 8 + Math.random() * 12
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.5,
      color: theme.primary,
      size: Math.random() * 8 + 4
    })
  }

  // Inner white burst
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 25,
      vy: (Math.random() - 0.5) * 25,
      life: 1.0,
      color: '#FFFFFF',
      size: Math.random() * 6 + 3
    })
  }

  return particles
}

export const updateParticles = (particles: Particle[], timeFactor: number): Particle[] => {
  particles.forEach(p => {
    p.x += p.vx * timeFactor
    p.y += p.vy * timeFactor
    p.life -= 0.03 * timeFactor
  })
  return particles.filter(p => p.life > 0)
}

export const updateFloatingTexts = (texts: FloatingText[], timeFactor: number): FloatingText[] => {
  texts.forEach(ft => {
    ft.y += ft.vy * timeFactor
    ft.life -= timeFactor
    ft.vy *= Math.pow(0.95, timeFactor)
  })
  return texts.filter(ft => ft.life > 0)
}
