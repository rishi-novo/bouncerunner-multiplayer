
import React, { useState } from 'react';
import { GameStatus, Theme } from '../../types';
import { THEMES } from '../../constants';
import Button from '../UI/Button';

interface GameOverlayProps {
  status: GameStatus;
  score: number;
  highScore: number;
  currentThemeId: string;
  unlockedThemes: string[];
  onStart: () => void;
  onRestart: () => void;
  onSelectTheme: (id: string) => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ 
  status, 
  score, 
  highScore, 
  currentThemeId,
  unlockedThemes,
  onStart, 
  onRestart,
  onSelectTheme
}) => {
  const [showThemes, setShowThemes] = useState(false);
  
  if (status === GameStatus.PLAYING) {
    return (
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none select-none z-20">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 uppercase tracking-widest drop-shadow-md">Distance</span>
          <span className="text-4xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            {Math.floor(score)}<span className="text-sm ml-1 text-white/50">m</span>
          </span>
        </div>
        <div className="flex flex-col items-end opacity-70">
          <span className="text-xs text-gray-400 uppercase tracking-widest">Best</span>
          <span className="text-xl text-white">{Math.floor(highScore)}m</span>
        </div>
      </div>
    );
  }

  // Helper for theme list rendering
  const renderThemeSelector = () => (
    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 w-full max-w-lg px-4 animate-fade-in-up">
      <div className="bg-[#0f0f17]/90 border border-white/10 backdrop-blur-md p-4 rounded-xl shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-sm uppercase tracking-widest">Select Visual Core</h3>
          <button onClick={() => setShowThemes(false)} className="text-gray-500 hover:text-white">&times;</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(theme => {
            const isUnlocked = unlockedThemes.includes(theme.id);
            const isSelected = currentThemeId === theme.id;
            
            return (
              <button
                key={theme.id}
                onClick={() => isUnlocked && onSelectTheme(theme.id)}
                disabled={!isUnlocked}
                className={`
                  relative p-2 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1
                  ${isSelected ? 'border-white bg-white/10' : 'border-transparent hover:bg-white/5'}
                  ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div 
                  className="w-6 h-6 rounded-full shadow-lg" 
                  style={{ backgroundColor: theme.primary, boxShadow: `0 0 10px ${theme.primary}` }} 
                />
                <span className="text-[10px] text-gray-300 uppercase">{theme.name}</span>
                {!isUnlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg backdrop-blur-[1px]">
                    <span className="text-[9px] text-white bg-black/50 px-1 rounded border border-white/20">
                      {theme.unlockScore}m
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (status === GameStatus.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f17]/80 backdrop-blur-sm z-10">
        <div className="mb-12 text-center animate-fade-in-up">
          <h1 className="text-6xl md:text-8xl text-white mb-2 drop-shadow-[0_0_25px_rgba(115,61,242,0.6)]">
            BOUNCE
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#733DF2] to-[#00F0FF]">RUNNER</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
            SYSTEM READY
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button 
            label="INITIATE RUN" 
            onClick={onStart} 
            className="start-btn"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
          <Button 
            variant="secondary"
            label="CUSTOMIZE"
            onClick={() => setShowThemes(true)}
          />
        </div>

        {showThemes && renderThemeSelector()}
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    // Check if we just unlocked something
    const nextUnlock = THEMES.find(t => !unlockedThemes.includes(t.id) && score >= t.unlockScore);

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f0f17]/90 backdrop-blur-md z-10 animate-fade-in">
        <div className="mb-2 text-[#ff4444] tracking-widest uppercase text-sm animate-pulse">Connection Lost</div>
        <h2 className="text-5xl md:text-7xl text-white mb-6">TERMINATED</h2>
        
        <div className="flex gap-12 mb-10 text-center relative">
          <div className="relative group">
            <div className="text-gray-500 text-xs uppercase mb-1">Session Distance</div>
            <div className="text-5xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{Math.floor(score)}m</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase mb-1">Record</div>
            <div className="text-5xl text-[#733DF2]">{Math.floor(highScore)}m</div>
          </div>
          
          {nextUnlock && (
            <div className="absolute top-[-60px] left-1/2 transform -translate-x-1/2 w-max bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-4 py-1 rounded-full text-xs shadow-lg animate-bounce">
              NEW CORE UNLOCKED: {nextUnlock.name}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button 
            label="RETRY" 
            onClick={onRestart}
            variant="primary"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            } 
          />
           <Button 
            variant="secondary"
            label="CUSTOMIZE"
            onClick={() => setShowThemes(true)}
          />
        </div>

        {showThemes && renderThemeSelector()}
      </div>
    );
  }

  return null;
};

export default GameOverlay;
