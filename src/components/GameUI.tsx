import React, { useState } from 'react';
import { GameState, Skin, GameStats } from '../types';
import { 
  Play, 
  ShoppingBag, 
  RotateCcw, 
  Home, 
  Volume2, 
  VolumeX, 
  Pause, 
  Sparkles, 
  HelpCircle, 
  Award,
  CircleAlert,
  ArrowRight,
  UserCheck,
  Check
} from 'lucide-react';
import { audio } from '../utils/AudioEngine';

interface GameUIProps {
  gameState: GameState;
  stats: GameStats;
  skins: Skin[];
  activeSkin: Skin;
  isMuted: boolean;
  onStartGame: () => void;
  onPauseToggle: () => void;
  onResetGame: () => void;
  onSelectSkin: (skinId: string) => void;
  onBuySkin: (skinId: string) => void;
  onMuteToggle: () => void;
  onNavigateToMenu: () => void;
}

export const GameUI: React.FC<GameUIProps> = ({
  gameState,
  stats,
  skins,
  activeSkin,
  isMuted,
  onStartGame,
  onPauseToggle,
  onResetGame,
  onSelectSkin,
  onBuySkin,
  onMuteToggle,
  onNavigateToMenu,
}) => {
  const [showShop, setShowShop] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);

  const handleBuy = (skin: Skin) => {
    if (stats.totalFish >= skin.cost) {
      onBuySkin(skin.id);
      setShopError(null);
    } else {
      setShopError(`Need ${skin.cost - stats.totalFish} more fish to unlock this penguin skin!`);
      setTimeout(() => setShopError(null), 3000);
    }
  };

  const activeSkinDescription = activeSkin.description;

  return (
    <div id="game-ui-overlay" className="absolute inset-0 pointer-events-none flex flex-col font-sans select-none z-10">
      
      {/* 1. TOP HEADER STATUS AREA (Mute toggle, help, stats) */}
      <div id="ui-top-bar" className="w-full flex items-center justify-between p-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Mute Button */}
          <button
            id="mute-button"
            onClick={() => {
              onMuteToggle();
              audio.playCollect();
            }}
            className="p-2.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-white hover:bg-slate-800 transition shadow-lg flex items-center justify-center cursor-pointer"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>

          {/* Guide Button */}
          {gameState === 'MENU' && (
            <button
              id="guide-button"
              onClick={() => {
                setShowInstructions(true);
                audio.playCollect();
              }}
              className="p-2.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-white hover:bg-slate-800 transition shadow-lg flex items-center justify-center cursor-pointer"
              title="How to Play"
            >
              <HelpCircle className="w-5 h-5 text-slate-300" />
            </button>
          )}
        </div>

        {/* FISH BANK DISPLAY (Only in Menu or Shop) */}
        {(gameState === 'MENU' || showShop) && (
          <div id="fish-bank-display" className="px-4 py-2 rounded-full bg-slate-900/70 backdrop-blur-md border border-amber-500/35 text-amber-300 flex items-center gap-2 shadow-lg">
            <span className="text-sm font-semibold tracking-wider">FISH BANK:</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 fill-amber-400 stroke-amber-500 animate-bounce" viewBox="0 0 24 24" style={{ animationDuration: '2s' }}>
                <path d="M4 12c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1-.45 1-1z M12 6c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6z M16 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0z" />
              </svg>
              <span className="font-mono font-bold text-lg text-amber-200">{stats.totalFish}</span>
            </div>
          </div>
        )}

        {/* ACTIVE HUD: Game statistics (Score & Fish Collected) */}
        {gameState === 'PLAYING' && (
          <div id="playing-hud" className="flex items-center gap-6 px-5 py-2.5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/5 shadow-inner">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Score</span>
              <span className="font-mono text-xl font-bold text-white tabular-nums">{stats.score}</span>
            </div>
            
            <div className="w-px h-8 bg-white/10" />

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Fish</span>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 fill-cyan-400 stroke-cyan-500 animate-pulse" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
                <span className="font-mono text-lg font-bold text-cyan-300 tabular-nums">{stats.fishCollected}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-white/10" />

            <button
              id="pause-hud-button"
              onClick={() => {
                onPauseToggle();
                audio.playCollect();
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. MAIN CENTER MENU & SCREENS */}
      <div id="ui-center-pane" className="flex-1 flex items-center justify-center p-4">
        
        {/* === MAIN MENU STATE === */}
        {gameState === 'MENU' && !showShop && (
          <div id="main-menu-view" className="flex flex-col items-center text-center w-full max-w-sm max-h-[98%] overflow-y-auto scrollbar-none pointer-events-auto bg-slate-900/60 backdrop-blur-xl border border-white/10 p-4 sm:p-6 rounded-2xl shadow-2xl animate-fade-in">
            {/* Arctic Title */}
            <div className="relative mb-1 sm:mb-1.5 flex flex-col items-center">
              <div className="absolute -top-10 flex gap-1 justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
              </div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-b from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-md uppercase">
                Arctic Slide
              </h1>
              <p className="text-cyan-400 text-[10px] sm:text-xs font-mono font-semibold tracking-widest uppercase mt-0.5">
                Penguin Parkour
              </p>
            </div>

            {/* Penguin Mascot visual display */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 my-2 sm:my-3.5 bg-slate-800/50 rounded-full border border-cyan-500/20 flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent group-hover:opacity-100 transition duration-500" />
              {/* Cute SVG Preview of Active Penguin */}
              <svg className="w-10 h-10 sm:w-14 sm:h-14 relative z-10" viewBox="0 0 64 64">
                <ellipse cx="32" cy="35" rx="16" ry="22" fill={activeSkin.color} />
                <ellipse cx="32" cy="38" rx="11" ry="17" fill="#ffffff" />
                {/* Eyes */}
                <circle cx="25" cy="24" r="2.5" fill="#000000" />
                <circle cx="25.5" cy="23.2" r="0.8" fill="#ffffff" />
                <circle cx="39" cy="24" r="2.5" fill="#000000" />
                <circle cx="39.5" cy="23.2" r="0.8" fill="#ffffff" />
                {/* Cheeks */}
                <circle cx="21" cy="29" r="2" fill="rgba(255, 170, 170, 0.6)" />
                <circle cx="43" cy="29" r="2" fill="rgba(255, 170, 170, 0.6)" />
                {/* Beak */}
                <polygon points="28,27 36,27 32,34" fill={activeSkin.id === 'golden' ? '#ff7675' : '#ff9209'} />
                {/* Accessories preview */}
                {activeSkin.id === 'agent' && (
                  <g>
                    <polygon points="21,22 43,22 43,25 21,25" fill="#111111" />
                    <polygon points="21,24 28,28 32,24 36,28 43,24" fill="#111111" />
                    <rect x="30" y="38" width="4" height="12" fill="#e74c3c" />
                  </g>
                )}
                {activeSkin.id === 'festive' && (
                  <g>
                    <polygon points="18,20 46,20 32,-3" fill="#e74c3c" />
                    <ellipse cx="32" cy="20" rx="15" ry="3.5" fill="#ffffff" />
                    <circle cx="32" cy="-2" r="3.5" fill="#ffffff" />
                  </g>
                )}
                {activeSkin.id === 'space' && (
                  <circle cx="32" cy="27" r="19" fill="rgba(0,240,255,0.2)" stroke="#00ffff" strokeWidth="1" />
                )}
                {activeSkin.id === 'ninja' && (
                  <rect x="18" y="19" width="28" height="4.5" fill="#111111" />
                )}
                {activeSkin.id === 'punk' && (
                  <polygon points="32,8 26,16 38,16" fill="#9b59b6" />
                )}
              </svg>
            </div>

            <div className="mb-2 sm:mb-4">
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-medium">Equipped Skin</span>
              <h3 className="text-sm sm:text-md font-bold text-white flex items-center gap-1.5 justify-center mt-0.5">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full inline-block" style={{ backgroundColor: activeSkin.color }} />
                {activeSkin.name}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 italic max-w-[240px]">
                "{activeSkinDescription}"
              </p>
            </div>

            {/* High Score Panel */}
            {stats.highScore > 0 && (
              <div className="mb-2.5 sm:mb-4 px-3 sm:px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2 text-indigo-300">
                <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                <span className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase">High Score:</span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white">{stats.highScore}</span>
              </div>
            )}

            {/* Menu Buttons */}
            <div className="w-full flex flex-col gap-2">
              <button
                id="play-game-button"
                onClick={() => {
                  onStartGame();
                  audio.playCollect();
                }}
                className="w-full py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold tracking-wider uppercase transition shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white group-hover:scale-110 transition" />
                Start Sliding
              </button>

              <button
                id="open-shop-button"
                onClick={() => {
                  setShowShop(true);
                  audio.playCollect();
                }}
                className="w-full py-2 sm:py-2.5 px-4 sm:px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] sm:text-xs font-semibold tracking-wider transition border border-white/5 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                Skin Closet
              </button>
            </div>
          </div>
        )}

        {/* === SKIN CLOSETS SHOP === */}
        {showShop && (
          <div id="skin-shop-panel" className="w-full max-w-xl pointer-events-auto bg-slate-950/85 backdrop-blur-2xl border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-full max-h-[95%] sm:max-h-[500px] animate-fade-in justify-between">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                Select Penguin Skin
              </h2>
              <button
                id="close-shop-button"
                onClick={() => {
                  setShowShop(false);
                  audio.playCollect();
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold tracking-wide transition cursor-pointer"
              >
                Back to Menu
              </button>
            </div>

            {/* Bank Warning messages */}
            {shopError && (
              <div className="my-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2 animate-pulse">
                <CircleAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{shopError}</span>
              </div>
            )}

            {/* Skins List (Scrollable Grid) */}
            <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-2.5 scrollbar-thin">
              {skins.map((skin) => {
                const isActive = skin.id === activeSkin.id;
                
                return (
                  <div
                    key={skin.id}
                    onClick={() => {
                      if (skin.unlocked) {
                        onSelectSkin(skin.id);
                        audio.playCollect();
                      }
                    }}
                    className={`p-3 rounded-2xl border transition duration-200 flex items-center justify-between gap-3 ${
                      isActive 
                        ? 'bg-cyan-500/10 border-cyan-400/40 shadow-md shadow-cyan-950/20' 
                        : 'bg-slate-900/60 border-white/5 hover:border-white/15 cursor-pointer'
                    }`}
                  >
                    {/* Visual Preview */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center relative overflow-hidden border border-white/5">
                        <svg className="w-9 h-9" viewBox="0 0 64 64">
                          <ellipse cx="32" cy="35" rx="16" ry="22" fill={skin.color} />
                          <ellipse cx="32" cy="38" rx="11" ry="17" fill="#ffffff" />
                          <circle cx="25" cy="24" r="2.5" fill="#000000" />
                          <circle cx="39" cy="24" r="2.5" fill="#000000" />
                          <polygon points="28,27 36,27 32,34" fill={skin.id === 'golden' ? '#ff7675' : '#ff9209'} />
                          {skin.id === 'agent' && <rect x="30" y="38" width="4" height="12" fill="#e74c3c" />}
                          {skin.id === 'festive' && (
                            <g>
                              <polygon points="18,20 46,20 32,-3" fill="#e74c3c" />
                              <circle cx="32" cy="-2" r="3.5" fill="#ffffff" />
                            </g>
                          )}
                          {skin.id === 'space' && <circle cx="32" cy="27" r="19" fill="rgba(0,240,255,0.2)" stroke="#00ffff" strokeWidth="1" />}
                          {skin.id === 'ninja' && <rect x="18" y="19" width="28" height="4.5" fill="#111111" />}
                          {skin.id === 'punk' && <polygon points="32,8 26,16 38,16" fill="#9b59b6" />}
                        </svg>
                      </div>

                      <div className="flex flex-col text-left">
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          {skin.name}
                          {isActive && (
                            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full border border-cyan-400/30">
                              EQUIPPED
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 max-w-[240px] leading-snug mt-0.5">
                          {skin.description}
                        </p>
                      </div>
                    </div>

                    {/* Cost / Selection Status Action */}
                    <div className="flex-shrink-0">
                      {skin.unlocked ? (
                        isActive ? (
                          <div className="px-3 py-1.5 rounded-xl bg-cyan-950/40 text-cyan-400 border border-cyan-400/20 text-xs font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Ready
                          </div>
                        ) : (
                          <button
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSkin(skin.id);
                              audio.playCollect();
                            }}
                          >
                            Equip
                          </button>
                        )
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuy(skin);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1 shadow-lg cursor-pointer"
                        >
                          Unlock 
                          <span className="font-mono bg-amber-950/20 px-1 rounded-md text-[11px] text-amber-950 flex items-center gap-0.5">
                            🐟 {skin.cost}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[10px] text-slate-500 italic text-center pt-2 border-t border-white/5">
              💡 Collect tasty little blue and golden fish on the ice track to bank more fish.
            </div>
          </div>
        )}

        {/* === HOW TO PLAY DIALOG === */}
        {showInstructions && (
          <div id="instructions-modal" className="w-full max-w-sm max-h-[95%] overflow-y-auto scrollbar-none pointer-events-auto bg-slate-950/95 backdrop-blur-2xl border border-white/10 p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl animate-fade-in flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              How to Slide
            </h2>

            <div className="space-y-3 sm:space-y-4 text-left text-slate-300 text-xs sm:text-sm flex-1">
              {/* Keyboard list */}
              <div>
                <h4 className="font-bold text-white text-[10px] sm:text-xs tracking-wider uppercase mb-1.5 sm:mb-2 text-cyan-400">Keyboard Controls</h4>
                <div className="space-y-1.5 sm:space-y-2 font-mono text-[11px] sm:text-xs text-slate-300 bg-slate-900/50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span>Jump Over Spikes</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-white text-[10px] sm:text-xs">Space / ↑ / W</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Slide Under Gulls</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-white text-[10px] sm:text-xs">↓ / S / Shift</span>
                  </div>
                </div>
              </div>

              {/* Touch instructions */}
              <div>
                <h4 className="font-bold text-white text-[10px] sm:text-xs tracking-wider uppercase mb-1.5 sm:mb-2 text-indigo-400">Touch/Mouse Controls</h4>
                <div className="p-2.5 sm:p-3 bg-slate-900/50 rounded-xl sm:rounded-2xl border border-white/5 text-[11px] sm:text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <p>• Tap/Click <strong className="text-cyan-300">LEFT HALF</strong> of the screen to <strong className="text-white">Jump</strong>.</p>
                  <p>• Tap/Click <strong className="text-indigo-300">RIGHT HALF</strong> of the screen to <strong className="text-white">Slide</strong>.</p>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h4 className="font-bold text-white text-[10px] sm:text-xs tracking-wider uppercase mb-1 sm:mb-1.5 text-amber-400">Arctic Tips</h4>
                <ul className="text-[11px] sm:text-xs list-disc pl-4 space-y-0.5 sm:space-y-1 text-slate-400">
                  <li>Yellow fish count as <strong className="text-amber-300">5 fish</strong> in the shop!</li>
                  <li>Obstacles move faster and faster the further you slide.</li>
                  <li>Shorter jumps are possible by letting go of the jump key quickly!</li>
                </ul>
              </div>
            </div>

            <button
              id="close-instructions-button"
              onClick={() => {
                setShowInstructions(false);
                audio.playCollect();
              }}
              className="mt-4 sm:mt-5 w-full py-2 sm:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs tracking-wider transition cursor-pointer"
            >
              Got It!
            </button>
          </div>
        )}

        {/* === PAUSED SCREEN === */}
        {gameState === 'PAUSED' && (
          <div id="paused-overlay" className="w-full max-w-xs max-h-[95%] overflow-y-auto scrollbar-none pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-white/10 p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl text-center animate-fade-in">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mb-1 sm:mb-2 uppercase tracking-wide">Game Paused</h2>
            <p className="text-slate-400 text-[10px] sm:text-xs mb-4 sm:mb-6">Take a quick breath in the chilly air.</p>
            
            <div className="flex flex-col gap-2 sm:gap-3">
              <button
                id="resume-game-button"
                onClick={() => {
                  onPauseToggle();
                  audio.playCollect();
                }}
                className="py-2.5 sm:py-3 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs sm:text-sm font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer"
              >
                Resume Run
              </button>

              <button
                id="restart-on-pause-button"
                onClick={() => {
                  onResetGame();
                  onStartGame();
                  audio.playCollect();
                }}
                className="py-2 sm:py-2.5 px-5 sm:px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Restart Run
              </button>

              <button
                id="quit-on-pause-button"
                onClick={() => {
                  onNavigateToMenu();
                  audio.playCollect();
                }}
                className="py-2 sm:py-2.5 px-5 sm:px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-red-400 hover:text-red-300 font-semibold text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Exit to Menu
              </button>
            </div>
          </div>
        )}

        {/* === GAME OVER STATE === */}
        {gameState === 'GAMEOVER' && (
          <div id="game-over-panel" className="w-full max-w-sm max-h-[95%] overflow-y-auto scrollbar-none pointer-events-auto bg-slate-950/85 backdrop-blur-xl border border-red-500/20 p-5 sm:p-7 rounded-2xl sm:rounded-3xl shadow-2xl text-center animate-fade-in">
            <h2 className="text-2xl sm:text-3xl font-black text-red-500 tracking-tight uppercase drop-shadow-md">Wiped Out!</h2>
            <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 mb-4 sm:mb-5">That ice wall or rolling snowball was frosty.</p>

            {/* Score Showcase Card */}
            <div className="p-3.5 sm:p-4 bg-slate-900/60 rounded-xl sm:rounded-2xl border border-white/5 space-y-2 sm:space-y-3 mb-4 sm:mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Final Score</span>
                <span className="font-mono text-lg sm:text-xl font-bold text-white">{stats.score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Fish Caught</span>
                <span className="font-mono text-sm sm:text-md font-bold text-cyan-300 flex items-center gap-1">
                  🐟 {stats.fishCollected}
                </span>
              </div>

              {stats.score >= stats.highScore && stats.score > 0 && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-center gap-1.5 text-amber-300 text-[10px] sm:text-xs font-bold animate-bounce mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  NEW ARCTIC HIGH SCORE!
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <button
                id="replay-game-button"
                onClick={() => {
                  onResetGame();
                  onStartGame();
                  audio.playCollect();
                }}
                className="py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold tracking-wider uppercase transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Slide Again
              </button>

              <button
                id="menu-from-gameover-button"
                onClick={() => {
                  onNavigateToMenu();
                  audio.playCollect();
                }}
                className="py-2.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Back to Menu
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 3. FOOTER HINTS (Only when running/playing) */}
      {gameState === 'PLAYING' && (
        <div id="ui-footer-area" className="w-full text-center p-3">
          <div className="hidden sm:flex justify-center items-center gap-4 text-[10px] text-slate-500 font-mono tracking-wider">
            <span>[SPACE / W] JUMP</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span>[S / SHIFT] SLIDE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span>[P] PAUSE</span>
          </div>
        </div>
      )}

    </div>
  );
};
