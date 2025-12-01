import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  GameStatus,
  Player,
  Platform,
  Particle,
  BackgroundElement,
  SaveData,
  FloatingText
} from '../../types'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_X_OFFSET,
  INITIAL_SPEED,
  SPEED_INCREMENT,
  MAX_SPEED,
  JUMP_FORCE,
  DOUBLE_JUMP_FORCE,
  MAX_JUMP_FRAMES,
  MAX_JUMPS,
  DASH_COOLDOWN,
  STORAGE_KEY_DATA,
  PLATFORM_BUFFER_COUNT,
  THEMES,
  PLATFORM_TYPES,
  FLOATING_TEXT_LIFESPAN,
  getThemeForDistance,
  getHighestUnlockedThemeId,
  getInterpolatedThemeColor
} from '../../constants'
import {
  generatePlatform,
  updatePlayer,
  drawGame,
  createExplosion,
  createThemeTransitionEffect,
  getSpeedMultiplier,
  checkItemCollisions,
  updateParticles,
  updateFloatingTexts
} from '../../utils/gameLogic'
import { audioManager } from '../../utils/audioManager'
import { performanceManager } from '../../utils/performanceManager'
import { localSessionManager } from '../../utils/local-session-manager'
import { networkManager } from '../../utils/networkManager'
import GameOverlay from './GameOverlay'
import PixelBlast from '../Background/PixelBlast'

const BounceRunner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const requestRef = useRef<number>(0)
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU)
  const [score, setScore] = useState(0)
  const [currentFPS, setCurrentFPS] = useState(60)
  const [coins, setCoins] = useState(0)
  const [combo, setCombo] = useState(0)
  const [roomPlayerCount, setRoomPlayerCount] = useState(1)
  const roomCapacity = 5
  const [maxCombo, setMaxCombo] = useState(0)

  // Performance quality state
  const [backgroundEnabled, setBackgroundEnabled] = useState(true)

  // Persistence State
  const [highScore, setHighScore] = useState(0)

  // Current theme - changes automatically during gameplay based on distance
  const [currentThemeId, setCurrentThemeId] = useState<string>('white')

  // Flash effect for theme transitions
  const [themeFlash, setThemeFlash] = useState(false)

  // Dynamic background color based on score progress
  const [backgroundColor, setBackgroundColor] = useState<string>('#FFFFFF')

  // Track max combo with ref to avoid closure issues
  const maxComboRef = useRef(0)

  // Mutable game state
  const gameState = useRef({
    player: {
      x: 0,
      y: CANVAS_HEIGHT - 100,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      isJumping: false,
      isGrounded: true,
      jumpCount: 0,
      jumpHoldTimer: 0,
      trailHistory: [],
    } as Player,
    platforms: [] as Platform[],
    particles: [] as Particle[],
    bgElements: [] as BackgroundElement[],
    floatingTexts: [] as FloatingText[],
    baseSpeed: INITIAL_SPEED,
    tick: 0,
    cameraX: 0,
    score: 0,
    bonusScore: 0,
    coinsCollected: 0,
    isRunning: false,
    isHoldingJump: false,
    lastUpdateTime: performance.now(),
    currentThemeId: 'white',
  })

  // Load Data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA)
      if (saved) {
        const data: SaveData = JSON.parse(saved)
        const loadedHighScore = data.highScore || 0
        setHighScore(loadedHighScore)

        // Set starting theme based on highest unlocked (from high score)
        const startingTheme = getHighestUnlockedThemeId(loadedHighScore)
        setCurrentThemeId(startingTheme)
        gameState.current.currentThemeId = startingTheme

        console.log(`Loaded high score: ${loadedHighScore}, starting theme: ${startingTheme}`)
      }
    } catch (e) {
      console.warn('Failed to load save data', e)
    }

    const settings = performanceManager.getSettings()
    setBackgroundEnabled(settings.backgroundQuality !== 'off')

    // Local room simulation: join as real player and ensure up to capacity bots
    localSessionManager.joinRealPlayer()
    localSessionManager.ensurePlayers(roomCapacity)
    setRoomPlayerCount(localSessionManager.getPlayerCount())

    // Connect to server
    networkManager.connect();

    networkManager.onSessionUpdate = (session) => {
      // Update remote players and session status
      // TODO: Store session state
      console.log('Session update', session);
    };

    networkManager.onTrackUpdate = (segments) => {
      // Update track segments
      // TODO: Update gameState.current.platforms with new segments
      console.log('Track update', segments);
    };
  }, [])

  // Save Data Helper
  const persistData = (newHighScore: number) => {
    const bestTheme = getHighestUnlockedThemeId(newHighScore)
    const data: SaveData = {
      highScore: newHighScore,
      unlockedThemes: [],
      selectedThemeId: bestTheme,
      totalDistance: 0
    }
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data))
    console.log(`Saved high score: ${newHighScore}, best theme: ${bestTheme}`)
  }

  const initGame = useCallback(() => {
    audioManager.init()
    audioManager.resume()

    const startPlatform: Platform = {
      x: -50,
      y: CANVAS_HEIGHT - 100,
      width: 1500,
      height: 40,
      id: 0,
      type: 'default',
      items: []
    }

    const platforms = [startPlatform]
    for (let i = 0; i < PLATFORM_BUFFER_COUNT; i++) {
      platforms.push(generatePlatform(platforms[platforms.length - 1], 1))
    }

    // Start with the highest unlocked theme based on high score
    const startingTheme = getHighestUnlockedThemeId(highScore)
    setCurrentThemeId(startingTheme)

    console.log(`Starting game with theme: ${startingTheme} (high score: ${highScore})`)

    gameState.current = {
      player: {
        x: 0,
        y: startPlatform.y - PLAYER_HEIGHT,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        vx: 0,
        vy: 0,
        isJumping: false,
        isGrounded: true,
        jumpCount: 0,
        jumpHoldTimer: 0,
        trailHistory: [],
        canDoubleJump: true,
        isDashing: false,
        dashCooldown: 0,
        comboCount: 0,
        lastLandTime: 0,
      },
      platforms,
      particles: [],
      bgElements: [],
      floatingTexts: [],
      baseSpeed: INITIAL_SPEED,
      tick: 0,
      cameraX: -PLAYER_X_OFFSET,
      score: 0,
      bonusScore: 0,
      coinsCollected: 0,
      isRunning: true,
      isHoldingJump: false,
      lastUpdateTime: performance.now(),
      currentThemeId: startingTheme,
    }

    setStatus(GameStatus.PLAYING)
    setScore(0)
    setCoins(0)
    setCombo(0)
    setMaxCombo(0)
    maxComboRef.current = 0
  }, [highScore])

  const handleJumpStart = useCallback(() => {
    const { isRunning, player, currentThemeId: stateThemeId } = gameState.current

    audioManager.resume()
    gameState.current.isHoldingJump = true

    if (!isRunning) return

    const theme = THEMES.find(t => t.id === stateThemeId) || THEMES[0]
    const settings = performanceManager.getSettings()
    const particleMultiplier = settings.reducedParticles ? 0.5 : 1.0

    if (player.isGrounded) {
      player.vy = JUMP_FORCE
      player.isGrounded = false
      player.isJumping = true
      player.jumpHoldTimer = MAX_JUMP_FRAMES
      player.jumpCount = 1
      player.canDoubleJump = true

      gameState.current.particles.push(
        ...createExplosion(player.x + player.width / 2, player.y + player.height, theme.primary, particleMultiplier)
      )

      audioManager.playJump()
    } else if (!player.isGrounded && player.canDoubleJump && player.jumpCount < MAX_JUMPS) {
      player.vy = DOUBLE_JUMP_FORCE
      player.isJumping = true
      player.jumpHoldTimer = MAX_JUMP_FRAMES
      player.jumpCount = 2
      player.canDoubleJump = false

      gameState.current.particles.push(
        ...createExplosion(player.x + player.width / 2, player.y + player.height / 2, theme.accent, particleMultiplier),
        ...createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#FFFFFF', particleMultiplier * 0.5)
      )

      gameState.current.floatingTexts.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        text: 'DOUBLE JUMP!',
        life: 30,
        color: theme.accent,
        vy: -3
      })

      audioManager.playJump()
    }
  }, [])

  const handleJumpEnd = useCallback(() => {
    gameState.current.isHoldingJump = false
  }, [])

  const handleDash = useCallback(() => {
    const { isRunning, player, currentThemeId: stateThemeId } = gameState.current

    if (!isRunning) return
    if (player.dashCooldown > 0) return

    const theme = THEMES.find(t => t.id === stateThemeId) || THEMES[0]
    const settings = performanceManager.getSettings()
    const particleMultiplier = settings.reducedParticles ? 0.5 : 1.0

    player.isDashing = true
    player.dashCooldown = DASH_COOLDOWN

    const dashParticleCount = Math.floor(20 * particleMultiplier)
    for (let i = 0; i < dashParticleCount; i++) {
      gameState.current.particles.push({
        x: player.x + Math.random() * player.width,
        y: player.y + Math.random() * player.height,
        vx: -5 - Math.random() * 5,
        vy: (Math.random() - 0.5) * 3,
        life: 1.0,
        color: theme.accent,
        size: Math.random() * 4 + 2
      })
    }

    gameState.current.floatingTexts.push({
      x: player.x + player.width / 2,
      y: player.y + player.height / 2,
      text: 'DASH!',
      life: 20,
      color: theme.accent,
      vy: -2
    })

    audioManager.playJump()

    setTimeout(() => {
      if (gameState.current.player) {
        gameState.current.player.isDashing = false
      }
    }, 150)
  }, [])

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        if (status === GameStatus.MENU || status === GameStatus.GAME_OVER) initGame()
        else handleJumpStart()
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowRight') {
        e.preventDefault()
        if (status === GameStatus.PLAYING) handleDash()
      }
      if (e.code === 'KeyR') {
        e.preventDefault()
        if (status === GameStatus.PLAYING || status === GameStatus.GAME_OVER) {
          initGame()
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        handleJumpEnd()
      }
    }
    const handleStart = () => {
      if (status === GameStatus.PLAYING) handleJumpStart()
    }
    const handleEnd = () => handleJumpEnd()

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousedown', handleStart)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchstart', handleStart, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousedown', handleStart)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchstart', handleStart)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [status, initGame, handleJumpStart, handleJumpEnd, handleDash])

  // Main Loop
  const loop = useCallback((currentTime: number) => {
    const state = gameState.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')

    if (!canvas || !ctx) {
      requestRef.current = requestAnimationFrame(loop)
      return
    }

    const deltaTime = Math.min(currentTime - state.lastUpdateTime, 50)
    state.lastUpdateTime = currentTime
    const timeFactor = deltaTime / (1000 / 60)

    if (Math.floor(currentTime / 1000) !== Math.floor((currentTime - deltaTime) / 1000)) {
      setCurrentFPS(Math.round(1000 / deltaTime))

      const settings = performanceManager.getSettings()
      if (settings.backgroundQuality === 'off' && backgroundEnabled) {
        setBackgroundEnabled(false)
      }
    }

    if (state.isRunning) {
      state.tick += timeFactor

      if (state.baseSpeed < MAX_SPEED) {
        state.baseSpeed += SPEED_INCREMENT * timeFactor
      }
      const speedMultiplier = getSpeedMultiplier(state.tick)

      audioManager.updateDrone((state.baseSpeed * speedMultiplier) / MAX_SPEED)

      const wasGrounded = state.player.isGrounded
      const { updatedPlayer, landedPlatform } = updatePlayer(
        state.player,
        state.platforms,
        state.baseSpeed,
        speedMultiplier,
        state.isHoldingJump,
        timeFactor
      )
      state.player = updatedPlayer

      const distanceScore = state.player.x / 100
      state.score = distanceScore + state.bonusScore

      // === THEME TRANSITION BASED ON DISTANCE ===
      const newTheme = getThemeForDistance(distanceScore)
      if (newTheme.id !== state.currentThemeId) {
        console.log(`Theme changed from ${state.currentThemeId} to ${newTheme.id} at score ${distanceScore}`)

        // Store old theme for transition effect
        const oldTheme = THEMES.find(t => t.id === state.currentThemeId)

        // Update theme
        state.currentThemeId = newTheme.id
        setCurrentThemeId(newTheme.id)

        // Trigger flash effect
        setThemeFlash(true)
        setTimeout(() => setThemeFlash(false), 500)

        // Create spectacular transition effect
        state.particles.push(
          ...createThemeTransitionEffect(
            state.player.x + state.player.width / 2,
            state.player.y + state.player.height / 2,
            newTheme
          )
        )

        // Show big unlock text
        state.floatingTexts.push({
          x: state.player.x + state.player.width / 2,
          y: state.player.y - 100,
          text: `⚡ ${newTheme.name.toUpperCase()} POWER! ⚡`,
          life: 180,
          color: newTheme.primary,
          vy: -0.5
        })

        // Additional floating text
        state.floatingTexts.push({
          x: state.player.x + state.player.width / 2,
          y: state.player.y - 60,
          text: `${newTheme.unlockScore.toLocaleString()}m MILESTONE!`,
          life: 150,
          color: '#FFFFFF',
          vy: -1
        })

        // Play sound effect multiple times for emphasis
        audioManager.playJump()
        setTimeout(() => audioManager.playJump(), 100)
        setTimeout(() => audioManager.playJump(), 200)
      }

      const theme = THEMES.find(t => t.id === state.currentThemeId) || THEMES[0]
      const settings = performanceManager.getSettings()
      const particleMultiplier = settings.reducedParticles ? 0.5 : 1.0

      // Item Collisions
      const events = checkItemCollisions(state.player, state.platforms)
      events.forEach(evt => {
        state.floatingTexts.push({
          x: state.player.x + state.player.width / 2,
          y: state.player.y - 20,
          text: evt.scoreDelta > 0 ? `+${evt.scoreDelta}` : `${evt.scoreDelta}`,
          life: FLOATING_TEXT_LIFESPAN,
          color: evt.type === 'penalty' ? '#FF4444' : '#44FF44',
          vy: -2
        })

        state.bonusScore += evt.scoreDelta

        if (evt.type === 'bonus') {
          state.coinsCollected++
          state.particles.push(...createExplosion(state.player.x, state.player.y, '#FFD700', particleMultiplier))
        } else {
          state.particles.push(...createExplosion(state.player.x, state.player.y, '#FF4444', particleMultiplier))
        }
      })

      // Land Sound & Combo
      if (!wasGrounded && state.player.isGrounded) {
        audioManager.playLand()

        const timeSinceLastLand = Date.now() - state.player.lastLandTime
        const comboWindow = 1500

        if (timeSinceLastLand < comboWindow && state.player.lastLandTime > 0) {
          state.player.comboCount++
        } else {
          state.player.comboCount = 1
        }

        if (state.player.comboCount > 1) {
          const comboBonus = state.player.comboCount * 10
          state.bonusScore += comboBonus

          const comboColor = state.player.comboCount >= 5 ? '#FFD700' :
            state.player.comboCount >= 3 ? '#FF00FF' : '#00FFFF'

          state.floatingTexts.push({
            x: state.player.x + state.player.width / 2,
            y: state.player.y - 60,
            text: `${state.player.comboCount}x COMBO! +${comboBonus}`,
            life: FLOATING_TEXT_LIFESPAN,
            color: comboColor,
            vy: -2.5
          })

          state.particles.push(
            ...createExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height, comboColor, particleMultiplier),
            ...createExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height, '#FFFFFF', particleMultiplier * 0.5)
          )
        } else {
          state.particles.push(
            ...createExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height, theme.accent, particleMultiplier)
          )
        }

        if (landedPlatform) {
          const pType = PLATFORM_TYPES[landedPlatform.type]
          if (pType && pType.scoreBonus !== 0) {
            state.bonusScore += pType.scoreBonus

            state.floatingTexts.push({
              x: state.player.x + state.player.width / 2,
              y: state.player.y - 40,
              text: pType.scoreBonus > 0 ? `+${pType.scoreBonus}` : `${pType.scoreBonus}`,
              life: FLOATING_TEXT_LIFESPAN,
              color: pType.scoreBonus > 0 ? '#FFD700' : '#FF4444',
              vy: -1.5
            })

            if (pType.scoreBonus > 0) {
              state.particles.push(
                ...createExplosion(state.player.x, state.player.y, '#FFD700', particleMultiplier)
              )
            }
          }
        }
      }

      state.cameraX = state.player.x - PLAYER_X_OFFSET

      // Update React state periodically
      if (Math.floor(currentTime / 100) !== Math.floor((currentTime - deltaTime) / 100)) {
        setScore(state.score)
        setCoins(state.coinsCollected)
        setCombo(state.player.comboCount)
        // Track max combo
        if (state.player.comboCount > maxComboRef.current) {
          maxComboRef.current = state.player.comboCount
          setMaxCombo(state.player.comboCount)
        }
      }

      // Platform Gen
      const rightMost = state.platforms[state.platforms.length - 1]
      if (rightMost.x < state.cameraX + CANVAS_WIDTH + 800) {
        const diff = Math.min(state.baseSpeed / INITIAL_SPEED, 2.0)
        state.platforms.push(generatePlatform(rightMost, diff))
      }
      state.platforms = state.platforms.filter(p => p.x + p.width > state.cameraX - 1000)

      // Game Over Check
      if (state.player.y > CANVAS_HEIGHT) {
        handleGameOver()
      }

      // Update particles and texts
      state.particles = updateParticles(state.particles, timeFactor)
      state.floatingTexts = updateFloatingTexts(state.floatingTexts, timeFactor)
    }

    // Draw
    const theme = THEMES.find(t => t.id === gameState.current.currentThemeId) || THEMES[0]
    const speedPhase = getSpeedMultiplier(state.tick)

    drawGame(
      ctx,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      state.player,
      state.platforms,
      state.particles,
      state.bgElements,
      state.floatingTexts,
      state.cameraX,
      state.score,
      theme,
      speedPhase
    )

    requestRef.current = requestAnimationFrame(loop)
  }, [backgroundEnabled])

  const handleGameOver = () => {
    gameState.current.isRunning = false
    audioManager.stopDrone()
    audioManager.playGameOver()

    const finalScore = gameState.current.score
    let newHigh = highScore

    if (finalScore > highScore) {
      newHigh = finalScore
      setHighScore(finalScore)
    }

    // Save with new high score
    persistData(Math.max(finalScore, highScore))

    // Set theme to highest unlocked for menu display
    const bestTheme = getHighestUnlockedThemeId(Math.max(finalScore, highScore))
    setCurrentThemeId(bestTheme)

    setStatus(GameStatus.GAME_OVER)
  }

  // Update background color based on score progress
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      const interpolatedColor = getInterpolatedThemeColor(score)
      setBackgroundColor(interpolatedColor)
    } else {
      // Use current theme color when not playing
      const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0]
      setBackgroundColor(theme.primary)
    }
  }, [score, status, currentThemeId])

  useEffect(() => {
    gameState.current.lastUpdateTime = performance.now()
    requestRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(requestRef.current)
  }, [loop])

  const currentTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0]
  const pixelRatio = performanceManager.getNormalizedPixelRatio()

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Theme transition flash effect */}
      {themeFlash && (
        <div
          className="absolute inset-0 z-50 pointer-events-none animate-pulse"
          style={{
            backgroundColor: currentTheme.primary,
            opacity: 0.3,
            animation: 'flash 0.5s ease-out'
          }}
        />
      )}

      {/* 3D Background Layer - temporarily disabled for performance testing */}
      {false && backgroundEnabled && (
        <div className="absolute inset-0 z-0 opacity-80 transition-all duration-1000">
          <PixelBlast
            variant="circle"
            pixelSize={6}
            color={backgroundColor}
            patternScale={3}
            patternDensity={1.2}
            pixelSizeJitter={0.5}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={pixelRatio > 1}
            liquidStrength={0.12}
            liquidRadius={1.2}
            liquidWobbleSpeed={5}
            speed={0.6}
            edgeFade={0.25}
            transparent
          />
        </div>
      )}

      {/* Full width container */}
      <div className="relative w-full h-full flex items-center justify-center shadow-2xl z-10">
        {/* Glow border based on current theme */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-500 z-20"
          style={{
            boxShadow: `inset 0 0 100px ${currentTheme.primary}40, inset 0 0 200px ${currentTheme.primary}20`
          }}
        />

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain z-10"
          style={{
            aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`,
            imageRendering: 'auto'
          }}
        />

        <GameOverlay
          status={status}
          score={score}
          highScore={highScore}
          currentThemeId={currentThemeId}
          coins={coins}
          combo={combo}
          maxCombo={maxCombo}
          roomPlayerCount={roomPlayerCount}
          roomCapacity={roomCapacity}
          onStart={initGame}
          onRestart={initGame}
        />

        {/* FPS Counter */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-2 right-2 text-xs text-white/30 font-mono z-30">
            {currentFPS} FPS | Theme: {currentThemeId}
          </div>
        )}
      </div>

      {/* CSS for flash animation */}
      <style>{`
        @keyframes flash {
          0% { opacity: 0.5; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default BounceRunner
