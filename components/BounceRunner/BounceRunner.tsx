import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GameStatus, 
  Player, 
  Platform, 
  Particle,
  Theme,
  BackgroundElement,
  SaveData,
  FloatingText
} from '../../types';
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
  DASH_SPEED,
  DASH_COOLDOWN,
  STORAGE_KEY_DATA,
  PLATFORM_BUFFER_COUNT,
  THEMES,
  PLATFORM_TYPES,
  FLOATING_TEXT_LIFESPAN
} from '../../constants';
import { 
  generatePlatform, 
  updatePlayer, 
  drawGame,
  createExplosion,
  updateBackgroundElements,
  getSpeedMultiplier,
  checkItemCollisions
} from '../../utils/gameLogic';
import { audioManager } from '../../utils/audioManager';
import GameOverlay from './GameOverlay';
import PixelBlast from '../Background/PixelBlast';

const BounceRunner: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [score, setScore] = useState(0);
  
  // Persistence State
  const [highScore, setHighScore] = useState(0);
  const [unlockedThemes, setUnlockedThemes] = useState<string[]>(['default']);
  const [currentThemeId, setCurrentThemeId] = useState<string>('default');

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
    tick: 0, // Global frame counter for waves
    cameraX: 0,
    score: 0,
    bonusScore: 0,
    isRunning: false,
    isHoldingJump: false,
  });

  // Load Data
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      if (saved) {
        const data: SaveData = JSON.parse(saved);
        setHighScore(data.highScore || 0);
        setUnlockedThemes(data.unlockedThemes || ['default']);
        setCurrentThemeId(data.selectedThemeId || 'default');
      }
    } catch (e) {
      console.warn('Failed to load save data', e);
    }
  }, []);

  // Save Data Helper
  const persistData = (newHighScore: number, newUnlockedThemes: string[]) => {
    const data: SaveData = {
      highScore: newHighScore,
      unlockedThemes: newUnlockedThemes,
      selectedThemeId: currentThemeId,
      totalDistance: 0 // Could track lifetime stats here
    };
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
  };

  const initGame = useCallback(() => {
    // Start Audio
    audioManager.init();
    audioManager.resume();

    const startPlatform: Platform = {
      x: -50,
      y: CANVAS_HEIGHT - 100,
      width: 1500,
      height: 40,
      id: 0,
      type: 'default',
      items: []
    };
    
    const platforms = [startPlatform];
    for (let i = 0; i < PLATFORM_BUFFER_COUNT; i++) {
      platforms.push(generatePlatform(platforms[platforms.length - 1], 1));
    }

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
      isRunning: true,
      isHoldingJump: false,
    };

    setStatus(GameStatus.PLAYING);
    setScore(0);
  }, []);

  const handleJumpStart = useCallback(() => {
    const { isRunning, player } = gameState.current;
    
    // Init audio context on first interaction if blocked
    audioManager.resume();

    gameState.current.isHoldingJump = true;

    if (!isRunning) return;

    const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];

    // First jump - from ground
    if (player.isGrounded) {
      player.vy = JUMP_FORCE;
      player.isGrounded = false;
      player.isJumping = true;
      player.jumpHoldTimer = MAX_JUMP_FRAMES;
      player.jumpCount = 1;
      player.canDoubleJump = true;
      
      gameState.current.particles.push(
        ...createExplosion(player.x + player.width/2, player.y + player.height, theme.primary)
      );

      audioManager.playJump();
    } 
    // Double jump - in air
    else if (!player.isGrounded && player.canDoubleJump && player.jumpCount < MAX_JUMPS) {
      player.vy = DOUBLE_JUMP_FORCE;
      player.isJumping = true;
      player.jumpHoldTimer = MAX_JUMP_FRAMES;
      player.jumpCount = 2;
      player.canDoubleJump = false;
      
      // Create spectacular double jump effect
      gameState.current.particles.push(
        ...createExplosion(player.x + player.width/2, player.y + player.height/2, theme.accent),
        ...createExplosion(player.x + player.width/2, player.y + player.height/2, '#FFFFFF')
      );

      // Visual feedback for double jump
      gameState.current.floatingTexts.push({
        x: player.x + player.width/2,
        y: player.y + player.height/2,
        text: 'DOUBLE JUMP!',
        life: 30,
        color: theme.accent,
        vy: -3
      });

      audioManager.playJump();
    }
  }, [currentThemeId]);

  const handleJumpEnd = useCallback(() => {
    gameState.current.isHoldingJump = false;
  }, []);

  const handleDash = useCallback(() => {
    const { isRunning, player } = gameState.current;
    
    if (!isRunning) return;
    
    // Check if dash is available
    if (player.dashCooldown > 0) return;
    
    const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
    
    // Activate dash
    player.isDashing = true;
    player.dashCooldown = DASH_COOLDOWN;
    
    // Add horizontal boost
    const dashBoost = DASH_SPEED;
    
    // Create spectacular dash effect trail
    for (let i = 0; i < 20; i++) {
      gameState.current.particles.push({
        x: player.x + Math.random() * player.width,
        y: player.y + Math.random() * player.height,
        vx: -5 - Math.random() * 5,
        vy: (Math.random() - 0.5) * 3,
        life: 1.0,
        color: theme.accent,
        size: Math.random() * 4 + 2
      });
    }
    
    // Visual feedback
    gameState.current.floatingTexts.push({
      x: player.x + player.width/2,
      y: player.y + player.height/2,
      text: 'DASH!',
      life: 20,
      color: theme.accent,
      vy: -2
    });
    
    // Play jump sound for now (could add dash sound)
    audioManager.playJump();
    
    // Dash effect will be applied in the update loop
    setTimeout(() => {
      if (gameState.current.player) {
        gameState.current.player.isDashing = false;
      }
    }, 150); // Dash lasts 150ms
  }, [currentThemeId]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (status === GameStatus.MENU || status === GameStatus.GAME_OVER) initGame();
        else handleJumpStart();
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'ArrowRight') {
        e.preventDefault();
        if (status === GameStatus.PLAYING) handleDash();
      }
      // Geometry Dash style instant restart with R key
      if (e.code === 'KeyR') {
        e.preventDefault();
        if (status === GameStatus.PLAYING || status === GameStatus.GAME_OVER) {
          initGame();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleJumpEnd();
      }
    };
    const handleStart = (e: Event) => {
        // e.preventDefault(); // removed to allow button clicks in menu
        if (status === GameStatus.PLAYING) handleJumpStart();
    };
    const handleEnd = () => handleJumpEnd();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    // Bind to window for global game input
    window.addEventListener('mousedown', handleStart);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchstart', handleStart, {passive: false});
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [status, initGame, handleJumpStart, handleJumpEnd]);

  // Main Loop
  const loop = useCallback(() => {
    // Always run loop to update visuals even if paused
    // if (!gameState.current.isRunning && status === GameStatus.PLAYING) return;
    
    const state = gameState.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;

    if (state.isRunning) {
      state.tick++;

      // 1. Difficulty & Speed Phase
      if (state.baseSpeed < MAX_SPEED) {
        state.baseSpeed += SPEED_INCREMENT;
      }
      const speedMultiplier = getSpeedMultiplier(state.tick);
      
      // Update Audio Drone
      audioManager.updateDrone((state.baseSpeed * speedMultiplier) / MAX_SPEED);

      // 2. Physics
      const wasGrounded = state.player.isGrounded;
      const { updatedPlayer, landedPlatform } = updatePlayer(
        state.player, 
        state.platforms, 
        state.baseSpeed, 
        speedMultiplier, 
        state.isHoldingJump
      );
      state.player = updatedPlayer;

      // Item Collisions
      const events = checkItemCollisions(state.player, state.platforms);
      events.forEach(evt => {
         // Create Visual text
         state.floatingTexts.push({
           x: state.player.x + state.player.width/2,
           y: state.player.y - 20,
           text: evt.scoreDelta > 0 ? `+${evt.scoreDelta}` : `${evt.scoreDelta}`,
           life: FLOATING_TEXT_LIFESPAN,
           color: evt.type === 'penalty' ? '#FF4444' : '#44FF44',
           vy: -2
         });
         
         state.bonusScore += evt.scoreDelta;
         
         if (evt.type === 'bonus') {
           state.particles.push(...createExplosion(state.player.x, state.player.y, '#44FF44'));
           // Play collect sound (reuse jump for now or add new)
         } else {
           // Reduce speed slightly on penalty?
           // state.baseSpeed *= 0.8;
           state.particles.push(...createExplosion(state.player.x, state.player.y, '#FF4444'));
         }
      });

      // Land Sound & Logic with Combo System
      if (!wasGrounded && state.player.isGrounded) {
         audioManager.playLand();
         
         const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
         
         // Combo System - reward quick successive landings
         const timeSinceLastLand = Date.now() - state.player.lastLandTime;
         const comboWindow = 1500; // 1.5 seconds to maintain combo
         
         if (timeSinceLastLand < comboWindow && state.player.lastLandTime > 0) {
           state.player.comboCount++;
         } else {
           state.player.comboCount = 1;
         }
         
         // Combo rewards and visual feedback
         if (state.player.comboCount > 1) {
           const comboBonus = state.player.comboCount * 10;
           state.bonusScore += comboBonus;
           
           // Combo text with increasing intensity
           const comboColor = state.player.comboCount >= 5 ? '#FFD700' : 
                             state.player.comboCount >= 3 ? '#FF00FF' : '#00FFFF';
           
           state.floatingTexts.push({
             x: state.player.x + state.player.width/2,
             y: state.player.y - 60,
             text: `${state.player.comboCount}x COMBO! +${comboBonus}`,
             life: FLOATING_TEXT_LIFESPAN,
             color: comboColor,
             vy: -2.5
           });
           
           // Enhanced particle effects for combos
           state.particles.push(
              ...createExplosion(state.player.x + state.player.width/2, state.player.y + state.player.height, comboColor),
              ...createExplosion(state.player.x + state.player.width/2, state.player.y + state.player.height, '#FFFFFF')
           );
         } else {
           // Regular landing particles
           state.particles.push(
              ...createExplosion(state.player.x + state.player.width/2, state.player.y + state.player.height, theme.accent)
           );
         }

         // Handle special platforms
         if (landedPlatform) {
            const pType = PLATFORM_TYPES[landedPlatform.type];
            if (pType && pType.scoreBonus !== 0) {
              state.bonusScore += pType.scoreBonus;
              
              // Floating Text for Platform Bonus
              state.floatingTexts.push({
                 x: state.player.x + state.player.width/2,
                 y: state.player.y - 40,
                 text: pType.scoreBonus > 0 ? `+${pType.scoreBonus}` : `${pType.scoreBonus}`,
                 life: FLOATING_TEXT_LIFESPAN,
                 color: pType.scoreBonus > 0 ? '#FFD700' : '#FF4444',
                 vy: -1.5
              });

              // Special visual for bonus
              if (pType.scoreBonus > 0) {
                 state.particles.push(
                   ...createExplosion(state.player.x, state.player.y, '#FFD700')
                 );
              }
            }
         }
      }

      state.cameraX = state.player.x - PLAYER_X_OFFSET;
      
      const distanceScore = state.player.x / 100;
      state.score = distanceScore + state.bonusScore;

      if (Math.floor(state.player.x) % 10 === 0) {
        setScore(state.score);
      }

      // 3. Platform Gen
      const rightMost = state.platforms[state.platforms.length - 1];
      if (rightMost.x < state.cameraX + CANVAS_WIDTH + 800) {
         const diff = Math.min(state.baseSpeed / INITIAL_SPEED, 2.0);
         state.platforms.push(generatePlatform(rightMost, diff));
      }
      state.platforms = state.platforms.filter(p => p.x + p.width > state.cameraX - 1000);

      // 4. Game Over Check
      if (state.player.y > CANVAS_HEIGHT) {
        handleGameOver();
        // Don't return, keep drawing the death frame
      }

      // 5. Particles
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
      });
      state.particles = state.particles.filter(p => p.life > 0);
      
      // 6. Floating Texts
      state.floatingTexts.forEach(ft => {
        ft.y += ft.vy;
        ft.life--;
        ft.vy *= 0.95; // damp
      });
      state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);
    }

    // Draw
    const theme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];
    const speedPhase = getSpeedMultiplier(state.tick);
    
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
    );

    requestRef.current = requestAnimationFrame(loop);
  }, [status, currentThemeId]); 

  const handleGameOver = () => {
    gameState.current.isRunning = false;
    audioManager.playGameOver();
    
    const finalScore = gameState.current.score;
    let newHigh = highScore;
    
    if (finalScore > highScore) {
      newHigh = finalScore;
      setHighScore(finalScore);
    }

    // Unlock Logic
    const newUnlocks = [...unlockedThemes];
    let changed = false;
    THEMES.forEach(t => {
      if (!newUnlocks.includes(t.id) && finalScore >= t.unlockScore) {
        newUnlocks.push(t.id);
        changed = true;
      }
    });
    
    if (changed) setUnlockedThemes(newUnlocks);
    
    // Save
    persistData(newHigh, newUnlocks);
    setStatus(GameStatus.GAME_OVER);
  };

  const handleThemeSelect = (id: string) => {
    setCurrentThemeId(id);
    const data: SaveData = {
      highScore,
      unlockedThemes,
      selectedThemeId: id,
      totalDistance: 0
    };
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  const currentTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      
      {/* 3D Background Layer */}
      <div className="absolute inset-0 z-0 opacity-80">
        <PixelBlast 
          variant="circle"
          pixelSize={6}
          color={currentTheme.primary}
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>

      {/* Full width container, remove max constraints */}
      <div className="relative w-full h-full flex items-center justify-center shadow-2xl z-10">
        {/* Glow border based on current theme - Optional, made subtle to fit full screen */}
        <div 
           className="absolute inset-0 pointer-events-none transition-all duration-1000 z-20"
           style={{
             boxShadow: `inset 0 0 50px ${currentTheme.primary}20`
           }}
        />

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-contain z-10"
          style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
        />
        
        <GameOverlay 
          status={status}
          score={score}
          highScore={highScore}
          currentThemeId={currentThemeId}
          unlockedThemes={unlockedThemes}
          onStart={initGame}
          onRestart={initGame}
          onSelectTheme={handleThemeSelect}
        />
      </div>
    </div>
  );
};

export default BounceRunner;
