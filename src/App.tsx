/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GameState, Skin, GameStats } from './types';
import { GameCanvas, GameCanvasHandle } from './components/GameCanvas';
import { GameUI } from './components/GameUI';
import { audio } from './utils/AudioEngine';

const INITIAL_SKINS: Skin[] = [
  { id: 'classic', name: 'Classic Blue', cost: 0, unlocked: true, color: '#1e272e', accentColor: '#ff9209', description: 'Your trusty, standard penguin companion.', particleType: 'snow' },
  { id: 'agent', name: 'Agent Penguin', cost: 50, unlocked: false, color: '#2d3436', accentColor: '#e74c3c', description: 'Licence to slide. Equipped with dark shades and a dapper red tie.', particleType: 'bubble' },
  { id: 'festive', name: 'Festive Santa', cost: 120, unlocked: false, color: '#3c6382', accentColor: '#2ecc71', description: 'Spreads holiday cheer with a red wool hat and warm green scarf.', particleType: 'snow' },
  { id: 'ninja', name: 'Ninja Shinobi', cost: 240, unlocked: false, color: '#090a0f', accentColor: '#e74c3c', description: 'Moves like a shadow in the snow. Trails smoke puffs.', particleType: 'smoke' },
  { id: 'space', name: 'Astro Penguin', cost: 380, unlocked: false, color: '#57606f', accentColor: '#00ffff', description: 'Designed for high-altitude celestial gliding. Sports a glowing space visor.', particleType: 'spark' },
  { id: 'golden', name: 'Golden King', cost: 600, unlocked: false, color: '#f1c40f', accentColor: '#ff7675', description: 'Pure solid ice-gold. Emits rich sparkling golden trail lights!', particleType: 'gold' }
];

export default function App() {
  const canvasRef = useRef<GameCanvasHandle | null>(null);

  // App Level States
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('arctic_muted');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    fishCollected: 0,
    totalFish: 0,
    distance: 0
  });

  const [skins, setSkins] = useState<Skin[]>(INITIAL_SKINS);
  const [activeSkinId, setActiveSkinId] = useState<string>('classic');

  // Load state from local storage on mount
  useEffect(() => {
    try {
      // 1. High Score
      const savedHighScore = localStorage.getItem('arctic_high_score');
      const highScoreVal = savedHighScore ? parseInt(savedHighScore, 10) : 0;

      // 2. Total Fish Bank
      const savedFishBank = localStorage.getItem('arctic_total_fish');
      const fishBankVal = savedFishBank ? parseInt(savedFishBank, 10) : 0;

      setStats(prev => ({
        ...prev,
        highScore: highScoreVal,
        totalFish: fishBankVal
      }));

      // 3. Unlocked Skins
      const savedUnlockedSkins = localStorage.getItem('arctic_unlocked_skins');
      if (savedUnlockedSkins) {
        const unlockedIds: string[] = JSON.parse(savedUnlockedSkins);
        setSkins(prevSkins => prevSkins.map(skin => ({
          ...skin,
          unlocked: skin.unlocked || unlockedIds.includes(skin.id)
        })));
      }

      // 4. Equipped Skin
      const savedActiveSkin = localStorage.getItem('arctic_active_skin');
      if (savedActiveSkin) {
        setActiveSkinId(savedActiveSkin);
      }
    } catch (e) {
      console.warn("Could not load from localStorage", e);
    }
  }, []);

  // Update Audio mute context when changed
  useEffect(() => {
    audio.setMute(isMuted);
  }, [isMuted]);

  // Global key listener for pausing
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (gameState === 'PLAYING') {
          setGameState('PAUSED');
          audio.stopBGM();
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
          audio.startBGM();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [gameState]);

  // Game UI/UX State Actions
  const handleStartGame = () => {
    setGameState('PLAYING');
    setStats(prev => ({
      ...prev,
      score: 0,
      fishCollected: 0
    }));
    audio.startBGM();
  };

  const handlePauseToggle = () => {
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
      audio.stopBGM();
    } else if (gameState === 'PAUSED') {
      setGameState('PLAYING');
      audio.startBGM();
    }
  };

  const handleResetGame = () => {
    if (canvasRef.current) {
      canvasRef.current.resetGame();
    }
  };

  const handleGameOver = (finalStats: { score: number; fishCollected: number }) => {
    setGameState('GAMEOVER');
    audio.stopBGM();

    setStats(prev => {
      const isNewHigh = finalStats.score > prev.highScore;
      const newHighScore = isNewHigh ? finalStats.score : prev.highScore;
      const newTotalFish = prev.totalFish + finalStats.fishCollected;

      try {
        if (isNewHigh) {
          localStorage.setItem('arctic_high_score', newHighScore.toString());
        }
        localStorage.setItem('arctic_total_fish', newTotalFish.toString());
      } catch (e) {
        console.warn("Could not save stats to localStorage", e);
      }

      return {
        ...prev,
        highScore: newHighScore,
        totalFish: newTotalFish,
        fishCollected: finalStats.fishCollected
      };
    });
  };

  const handleScoreUpdate = (currentScore: number) => {
    setStats(prev => ({
      ...prev,
      score: currentScore
    }));
  };

  const handleFishCollect = (count: number, isGolden: boolean) => {
    const amount = isGolden ? 5 : count;
    setStats(prev => ({
      ...prev,
      fishCollected: prev.fishCollected + amount
    }));
  };

  const handleSelectSkin = (skinId: string) => {
    setActiveSkinId(skinId);
    try {
      localStorage.setItem('arctic_active_skin', skinId);
    } catch (e) {
      console.warn("Could not save equipped skin", e);
    }
  };

  const handleBuySkin = (skinId: string) => {
    const skinToBuy = skins.find(s => s.id === skinId);
    if (!skinToBuy) return;

    const newSkins = skins.map(s => s.id === skinId ? { ...s, unlocked: true } : s);
    const newTotalFish = stats.totalFish - skinToBuy.cost;

    setSkins(newSkins);
    setActiveSkinId(skinId);
    setStats(prev => ({
      ...prev,
      totalFish: newTotalFish
    }));

    try {
      localStorage.setItem('arctic_total_fish', newTotalFish.toString());
      localStorage.setItem('arctic_active_skin', skinId);
      
      const unlockedIds = newSkins.filter(s => s.unlocked).map(s => s.id);
      localStorage.setItem('arctic_unlocked_skins', JSON.stringify(unlockedIds));
    } catch (e) {
      console.warn("Could not save purchase details", e);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(prev => {
      const nextMute = !prev;
      try {
        localStorage.setItem('arctic_muted', nextMute.toString());
      } catch (e) {
        console.warn("Could not save mute preference", e);
      }
      return nextMute;
    });
  };

  const handleNavigateToMenu = () => {
    setGameState('MENU');
    audio.stopBGM();
    handleResetGame();
  };

  const activeSkin = skins.find(s => s.id === activeSkinId) || skins[0];

  return (
    <div 
      id="app-root-container" 
      className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'radial-gradient(circle at center, #111a36 0%, #060913 100%)'
      }}
    >
      
      {/* Decorative ambient background snowfall for deep immersion */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute top-32 right-20 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/2 left-1/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDuration: '5s' }} />
        <div className="absolute bottom-24 right-1/4 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDuration: '3.5s' }} />
      </div>

      {/* Main 16:9 arcade gaming screen frame */}
      <div 
        id="arcade-cabinet"
        className="w-full max-w-4xl aspect-[16/9] portrait:aspect-[9/10] relative bg-slate-900 rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,255,255,0.1)] flex items-center justify-center group"
      >
        {/* Soft neon glowing shadow border around viewport */}
        <div className="absolute inset-0 border border-cyan-500/10 rounded-[2rem] pointer-events-none z-20 transition group-hover:border-cyan-500/20" />

        {/* 1. Canvas layer running 60fps physics & renders */}
        <GameCanvas
          ref={canvasRef}
          gameState={gameState}
          activeSkin={activeSkin}
          isMuted={isMuted}
          onGameOver={handleGameOver}
          onScoreUpdate={handleScoreUpdate}
          onFishCollect={handleFishCollect}
        />

        {/* 2. Interactive UI layer containing menus, closets, shop and HUD overlays */}
        <GameUI
          gameState={gameState}
          stats={stats}
          skins={skins}
          activeSkin={activeSkin}
          isMuted={isMuted}
          onStartGame={handleStartGame}
          onPauseToggle={handlePauseToggle}
          onResetGame={handleResetGame}
          onSelectSkin={handleSelectSkin}
          onBuySkin={handleBuySkin}
          onMuteToggle={handleMuteToggle}
          onNavigateToMenu={handleNavigateToMenu}
        />
      </div>

      {/* Humble, literal footer credit */}
      <div className="mt-4 text-[11px] font-mono text-slate-600 uppercase tracking-widest pointer-events-none">
        Arctic Slide Run • Made with Care
      </div>

    </div>
  );
}
