import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { GameState, Skin, PlayerPhysics, Obstacle, FishCollectible, Particle, GameStats } from '../types';
import { audio } from '../utils/AudioEngine';

interface GameCanvasProps {
  gameState: GameState;
  activeSkin: Skin;
  isMuted: boolean;
  onGameOver: (finalStats: { score: number; fishCollected: number }) => void;
  onScoreUpdate: (score: number) => void;
  onFishCollect: (count: number, isGolden: boolean) => void;
}

export interface GameCanvasHandle {
  resetGame: () => void;
}

const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 450;
const GROUND_Y = 380;

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  ({ gameState, activeSkin, isMuted, onGameOver, onScoreUpdate, onFishCollect }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Game state refs to keep game loop running at 60fps without triggering React renders
    const stateRef = useRef<{
      gameState: GameState;
      player: PlayerPhysics;
      obstacles: Obstacle[];
      fish: FishCollectible[];
      particles: Particle[];
      distance: number;
      score: number;
      fishCollected: number;
      gameSpeed: number;
      maxSpeed: number;
      bgOffsets: number[];
      snowflakeOffsets: { x: number; y: number; size: number; speed: number }[];
      lastObstacleTime: number;
      lastFishTime: number;
      screenShake: number;
      keysPressed: { [key: string]: boolean };
      activeSkin: Skin;
    }>({
      gameState,
      player: {
        x: 100,
        y: GROUND_Y - 50,
        width: 44,
        height: 50,
        vy: 0,
        gravity: 0.65,
        jumpForce: -13.5,
        isGrounded: true,
        isSliding: false,
        slideTimer: 0,
        rotation: 0,
        runFrame: 0,
      },
      obstacles: [],
      fish: [],
      particles: [],
      distance: 0,
      score: 0,
      fishCollected: 0,
      gameSpeed: 4.5,
      maxSpeed: 10.5,
      bgOffsets: [0, 0, 0, 0], // Far, Mid, Near, Ground offsets
      snowflakeOffsets: [],
      lastObstacleTime: 0,
      lastFishTime: 0,
      screenShake: 0,
      keysPressed: {},
      activeSkin,
    });

    // Update state ref when React props change
    useEffect(() => {
      stateRef.current.gameState = gameState;
    }, [gameState]);

    useEffect(() => {
      stateRef.current.activeSkin = activeSkin;
    }, [activeSkin]);

    // Expose reset trigger
    useImperativeHandle(ref, () => ({
      resetGame: () => {
        const state = stateRef.current;
        state.player = {
          x: 100,
          y: GROUND_Y - 50,
          width: 44,
          height: 50,
          vy: 0,
          gravity: 0.65,
          jumpForce: -13.5,
          isGrounded: true,
          isSliding: false,
          slideTimer: 0,
          rotation: 0,
          runFrame: 0,
        };
        state.obstacles = [];
        state.fish = [];
        state.particles = [];
        state.distance = 0;
        state.score = 0;
        state.fishCollected = 0;
        state.gameSpeed = 4.5;
        state.bgOffsets = [0, 0, 0, 0];
        state.screenShake = 0;
        state.keysPressed = {};
        onScoreUpdate(0);
      }
    }));

    // Initialize Snowflake system
    useEffect(() => {
      const snowflakes = [];
      for (let i = 0; i < 40; i++) {
        snowflakes.push({
          x: Math.random() * VIRTUAL_WIDTH,
          y: Math.random() * VIRTUAL_HEIGHT,
          size: Math.random() * 2.5 + 0.5,
          speed: Math.random() * 0.8 + 0.3,
        });
      }
      stateRef.current.snowflakeOffsets = snowflakes;
    }, []);

    // Resize Handling for responsive virtual canvas sizing
    useEffect(() => {
      const handleResize = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Maintain 16:9 aspect ratio or fit inside
        const targetRatio = 16 / 9;
        let width = containerWidth;
        let height = containerWidth / targetRatio;

        if (height > containerHeight) {
          height = containerHeight;
          width = containerHeight * targetRatio;
        }

        canvas.width = width;
        canvas.height = height;
      };

      // Set up ResizeObserver to watch container size
      const observer = new ResizeObserver(() => {
        handleResize();
      });

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      handleResize();
      window.addEventListener('resize', handleResize);

      return () => {
        observer.disconnect();
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    // Keyboard controls
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const state = stateRef.current;
        state.keysPressed[e.code] = true;

        if (state.gameState !== 'PLAYING') return;

        // Jump commands: Space, ArrowUp, KeyW
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
          e.preventDefault();
          if (state.player.isGrounded && !state.player.isSliding) {
            state.player.vy = state.player.jumpForce;
            state.player.isGrounded = false;
            audio.playJump();
            // Jump puff particles
            spawnJumpPuff(state.player.x + 22, GROUND_Y);
          }
        }

        // Slide commands: ArrowDown, KeyS, ShiftLeft
        if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ShiftLeft') {
          e.preventDefault();
          if (state.player.isGrounded && !state.player.isSliding) {
            state.player.isSliding = true;
            state.player.height = 30; // Shorter body
            state.player.y = GROUND_Y - 30;
            state.player.slideTimer = 45; // Frames of slide
            audio.playSlide();
          }
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        const state = stateRef.current;
        state.keysPressed[e.code] = false;

        // Let go of jump button early for dynamic jump heights (classic platformer feel!)
        if (
          (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') &&
          state.player.vy < -3
        ) {
          state.player.vy = -3;
        }

        // Interrupt slide when letting go
        if (
          (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'ShiftLeft') &&
          state.player.isSliding
        ) {
          state.player.isSliding = false;
          state.player.height = 50;
          state.player.y = GROUND_Y - 50;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }, []);

    // Particle spawning helpers
    const spawnJumpPuff = (x: number, y: number) => {
      const state = stateRef.current;
      for (let i = 0; i < 8; i++) {
        state.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 2 - 0.5,
          color: 'rgba(235, 245, 255, 0.8)',
          size: Math.random() * 5 + 3,
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 15,
          type: 'slide_dust',
        });
      }
    };

    const spawnSlidePuff = (x: number, y: number) => {
      const state = stateRef.current;
      state.particles.push({
        x,
        y: y + (Math.random() - 0.5) * 5,
        vx: -state.gameSpeed * 0.4 - Math.random() * 2,
        vy: -Math.random() * 1.5,
        color: state.activeSkin.id === 'golden' ? 'rgba(255, 215, 0, 0.7)' : 'rgba(240, 248, 255, 0.7)',
        size: Math.random() * 4 + 2,
        alpha: 0.9,
        life: 0,
        maxLife: 25 + Math.random() * 10,
        type: 'slide_dust',
      });
    };

    const spawnTrailParticle = (x: number, y: number, skin: Skin) => {
      const state = stateRef.current;
      let color = 'rgba(255,255,255,0.4)';
      let size = Math.random() * 3 + 1.5;

      if (skin.particleType === 'gold') color = `hsla(45, 100%, ${50 + Math.random() * 20}%, ${0.5 + Math.random() * 0.4})`;
      else if (skin.particleType === 'bubble') color = `hsla(190, 80%, 75%, ${0.3 + Math.random() * 0.4})`;
      else if (skin.particleType === 'spark') color = `hsla(280, 100%, 70%, ${0.6 + Math.random() * 0.4})`;
      else if (skin.particleType === 'smoke') color = `rgba(180, 190, 200, 0.4)`;

      state.particles.push({
        x,
        y,
        vx: -state.gameSpeed * 0.3 - Math.random(),
        vy: (Math.random() - 0.5) * 1.5,
        color,
        size,
        alpha: 0.8,
        life: 0,
        maxLife: 30 + Math.random() * 15,
        type: 'trail',
      });
    };

    const spawnImpactIce = (x: number, y: number) => {
      const state = stateRef.current;
      for (let i = 0; i < 15; i++) {
        state.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8 - 3,
          color: i % 2 === 0 ? '#b9e5f9' : '#ffffff',
          size: Math.random() * 6 + 2,
          alpha: 1,
          life: 0,
          maxLife: 40 + Math.random() * 20,
          type: 'impact_ice',
        });
      }
    };

    const spawnCollectSpark = (x: number, y: number, isGolden: boolean) => {
      const state = stateRef.current;
      for (let i = 0; i < 10; i++) {
        state.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          color: isGolden ? '#ffd700' : '#00ffff',
          size: Math.random() * 4 + 1.5,
          alpha: 1,
          life: 0,
          maxLife: 20 + Math.random() * 15,
          type: 'fish_spark',
        });
      }
    };

    // Run core animation loop
    useEffect(() => {
      let animId: number;

      const loop = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          animId = requestAnimationFrame(loop);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          animId = requestAnimationFrame(loop);
          return;
        }

        // Update & Render Game State
        updateGame();
        drawGame(ctx, canvas);

        animId = requestAnimationFrame(loop);
      };

      const updateGame = () => {
        const state = stateRef.current;
        if (state.gameState !== 'PLAYING') return;

        // 1. Difficulty Scaling over distance
        state.distance += 0.05;
        state.gameSpeed = Math.min(state.maxSpeed, 4.5 + state.distance * 0.04);
        state.score = Math.floor(state.distance * 10) + state.fishCollected * 50;
        onScoreUpdate(state.score);

        // 2. Parallax background offsets
        state.bgOffsets[0] = (state.bgOffsets[0] + state.gameSpeed * 0.05) % VIRTUAL_WIDTH; // Far
        state.bgOffsets[1] = (state.bgOffsets[1] + state.gameSpeed * 0.15) % VIRTUAL_WIDTH; // Mid
        state.bgOffsets[2] = (state.bgOffsets[2] + state.gameSpeed * 0.4) % VIRTUAL_WIDTH;  // Near
        state.bgOffsets[3] = (state.bgOffsets[3] + state.gameSpeed) % VIRTUAL_WIDTH;        // Ground

        // 3. Update snowflakes
        state.snowflakeOffsets.forEach((sf) => {
          sf.y += sf.speed;
          sf.x -= state.gameSpeed * 0.1;
          if (sf.y > VIRTUAL_HEIGHT) {
            sf.y = -5;
            sf.x = Math.random() * VIRTUAL_WIDTH;
          }
          if (sf.x < 0) {
            sf.x = VIRTUAL_WIDTH;
            sf.y = Math.random() * VIRTUAL_HEIGHT;
          }
        });

        // 4. Update player physics
        const player = state.player;
        
        // Handle sliding countdown
        if (player.isSliding) {
          player.slideTimer--;
          if (player.slideTimer <= 0) {
            // Keep sliding if player holds slide key
            if (state.keysPressed['ArrowDown'] || state.keysPressed['KeyS'] || state.keysPressed['ShiftLeft']) {
              player.slideTimer = 10;
            } else {
              player.isSliding = false;
              player.height = 50;
              player.y = GROUND_Y - 50;
            }
          }
        }

        // Apply gravity and update position
        player.vy += player.gravity;
        player.y += player.vy;

        // Check ground landing
        const currentHeight = player.isSliding ? 30 : 50;
        if (player.y + currentHeight >= GROUND_Y) {
          player.y = GROUND_Y - currentHeight;
          player.vy = 0;
          player.isGrounded = true;
        }

        // Penguin rotation and foot frame waddling
        if (player.isGrounded) {
          player.rotation = player.isSliding ? 0.1 : 0;
          player.runFrame = (player.runFrame + state.gameSpeed * 0.03) % 4;

          // Spawn slide spray particles
          if (player.isSliding) {
            spawnSlidePuff(player.x, GROUND_Y - 10);
          } else {
            // Tiny running dust puff
            if (Math.random() < 0.25) {
              spawnSlidePuff(player.x + 5, GROUND_Y - 5);
            }
          }
        } else {
          // Dynamic rotation based on vertical velocity
          player.rotation = Math.max(-0.5, Math.min(0.5, player.vy * 0.05));
        }

        // Spawn constant active skin trailing sparks
        if (Math.random() < 0.6) {
          spawnTrailParticle(player.x + 5, player.y + currentHeight / 2 + (Math.random() - 0.5) * 10, state.activeSkin);
        }

        // 5. Spawn Obstacles & Fish
        const now = Date.now();
        const obstacleCooldown = Math.max(1200, 2200 - state.gameSpeed * 120);
        if (now - state.lastObstacleTime > obstacleCooldown && Math.random() < 0.7) {
          spawnObstacle();
          state.lastObstacleTime = now;
        }

        const fishCooldown = 1500;
        if (now - state.lastFishTime > fishCooldown && Math.random() < 0.5) {
          spawnFishPattern();
          state.lastFishTime = now;
        }

        // 6. Update obstacles & collision checks
        state.obstacles = state.obstacles.filter((obs) => {
          obs.x -= state.gameSpeed;

          // Collision detection
          if (checkCollision(player, obs)) {
            triggerGameOver();
            return false;
          }

          // Points on passing safely
          if (!obs.passed && obs.x + obs.width < player.x) {
            obs.passed = true;
          }

          return obs.x + obs.width > -50;
        });

        // 7. Update fish & collision checks
        state.fish = state.fish.filter((f) => {
          f.x -= state.gameSpeed;

          if (!f.collected && checkCircleCollision(player, f)) {
            f.collected = true;
            const isGolden = f.type === 'golden';
            state.fishCollected += isGolden ? 5 : 1;
            onFishCollect(1, isGolden);
            audio.playCollect();
            spawnCollectSpark(f.x + f.width/2, f.y + f.height/2, isGolden);
          }

          return f.x + f.width > -50 && !f.collected;
        });

        // 8. Update screen shake decay
        if (state.screenShake > 0) {
          state.screenShake -= 0.5;
        }

        // 9. Update particles
        state.particles = state.particles.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
          p.life++;
          return p.life < p.maxLife;
        });
      };

      const spawnObstacle = () => {
        const state = stateRef.current;
        const types: ('ICICLE' | 'SNOWBALL' | 'GLACIER_WALL' | 'FLYING_SEAGULL')[] = [
          'ICICLE', 'SNOWBALL', 'GLACIER_WALL', 'FLYING_SEAGULL'
        ];
        
        // Pick random obstacle based on distance/difficulty
        let filteredTypes = ['SNOWBALL', 'ICICLE'];
        if (state.distance > 15) filteredTypes.push('GLACIER_WALL');
        if (state.distance > 30) filteredTypes.push('FLYING_SEAGULL');

        const type = filteredTypes[Math.floor(Math.random() * filteredTypes.length)] as any;

        let obs: Obstacle = {
          id: Math.random().toString(),
          type,
          x: VIRTUAL_WIDTH + 50,
          y: 0,
          width: 0,
          height: 0,
          speedX: 0,
          passed: false,
        };

        if (type === 'ICICLE') {
          // Standing on ground or hanging from top
          const isHanging = Math.random() < 0.3;
          obs.width = 24;
          obs.height = Math.random() * 30 + 40;
          obs.y = isHanging ? 0 : GROUND_Y - obs.height;
          // Track hanging state in pulse
          obs.pulse = isHanging ? 1 : 0;
        } else if (type === 'SNOWBALL') {
          obs.width = 32;
          obs.height = 32;
          obs.y = GROUND_Y - 32;
          obs.angle = 0;
        } else if (type === 'GLACIER_WALL') {
          // Tall narrow block
          obs.width = 30;
          obs.height = 100;
          obs.y = GROUND_Y - 100;
        } else if (type === 'FLYING_SEAGULL') {
          // Flies mid height, requires ducking/sliding
          obs.width = 38;
          obs.height = 24;
          obs.y = GROUND_Y - 60 - Math.random() * 20;
          obs.pulse = 0; // Wave movement offset
        }

        state.obstacles.push(obs);
      };

      const spawnFishPattern = () => {
        const state = stateRef.current;
        const isGolden = Math.random() < 0.15;
        const count = isGolden ? 1 : Math.floor(Math.random() * 3) + 3;
        const patternType = Math.random() < 0.5 ? 'arc' : 'line';
        
        const startX = VIRTUAL_WIDTH + 40;
        const baseHeight = GROUND_Y - 70;

        for (let i = 0; i < count; i++) {
          let fx = startX + i * 35;
          let fy = baseHeight;

          if (patternType === 'arc') {
            const angle = count > 1 ? (i / (count - 1)) * Math.PI : Math.PI / 2;
            fy = baseHeight - Math.sin(angle) * 75;
          } else {
            fy = baseHeight - (i % 2 === 0 ? 0 : 25);
          }

          state.fish.push({
            id: `${Date.now()}-${i}`,
            x: fx,
            y: fy,
            width: 20,
            height: 16,
            points: isGolden ? 5 : 1,
            collected: false,
            pulseOffset: Math.random() * 10,
            type: isGolden ? 'golden' : 'regular',
          });
        }
      };

      // Perfect collision detection (rect intersect / circle approximation)
      const checkCollision = (p: PlayerPhysics, o: Obstacle) => {
        // Adjust player hitbox for tighter, fair gameplay!
        // Penguin is slightly rounded, so reduce hitbox margins
        const pPaddingX = 8;
        const pPaddingY = p.isSliding ? 2 : 4;

        const px1 = p.x + pPaddingX;
        const py1 = p.y + pPaddingY;
        const px2 = p.x + p.width - pPaddingX;
        const py2 = p.y + p.height - pPaddingY;

        // Obstacle hitboxes
        let ox1 = o.x;
        let oy1 = o.y;
        let ox2 = o.x + o.width;
        let oy2 = o.y + o.height;

        // Custom padding for fairer obstacle hitboxes
        if (o.type === 'ICICLE') {
          ox1 += 4;
          ox2 -= 4;
        } else if (o.type === 'SNOWBALL') {
          ox1 += 3;
          ox2 -= 3;
          oy1 += 3;
        }

        return px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1;
      };

      const checkCircleCollision = (p: PlayerPhysics, f: FishCollectible) => {
        const px = p.x + p.width / 2;
        const py = p.y + p.height / 2;
        const fx = f.x + f.width / 2;
        const fy = f.y + f.height / 2;

        const distance = Math.hypot(px - fx, py - fy);
        const radiusSum = (p.width * 0.4) + (f.width * 0.5);
        return distance < radiusSum;
      };

      const triggerGameOver = () => {
        const state = stateRef.current;
        state.gameState = 'GAMEOVER';
        state.screenShake = 15;
        audio.playHit();
        audio.playGameOver();
        spawnImpactIce(state.player.x + 22, state.player.y + state.player.height / 2);
        onGameOver({
          score: state.score,
          fishCollected: state.fishCollected,
        });
      };

      // Draw loop
      const drawGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        const state = stateRef.current;
        
        ctx.save();

        // Apply screen shake translate for visual punch
        if (state.screenShake > 0) {
          const dx = (Math.random() - 0.5) * state.screenShake;
          const dy = (Math.random() - 0.5) * state.screenShake;
          ctx.translate(dx, dy);
        }

        // Auto resolution scaling (virtual 800x450 coordinate space)
        ctx.scale(canvas.width / VIRTUAL_WIDTH, canvas.height / VIRTUAL_HEIGHT);

        // CLEAR
        ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // 1. LAYER 0: SKY GRADIENT (Space / Aurora)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
        skyGrad.addColorStop(0, '#0a1024'); // Deep Space Navy
        skyGrad.addColorStop(0.5, '#121e42');
        skyGrad.addColorStop(1, '#1b3b6f'); // Arctic Blue Edge
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

        // 2. AURORA BOREALIS (flowing background waves)
        drawAurora(ctx);

        // 3. STARS / SNOWFLAKES IN BG
        ctx.fillStyle = '#ffffff';
        state.snowflakeOffsets.forEach((sf) => {
          ctx.globalAlpha = sf.size / 3;
          ctx.beginPath();
          ctx.arc(sf.x, sf.y, sf.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // 4. MOON
        ctx.fillStyle = '#fbfdff';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(680, 80, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // 5. LAYER 1: PARALLAX DISTANT MOUNTAINS
        drawMountains(ctx, state.bgOffsets[0], 0.2, '#14254c', '#0f1d3a', 220);

        // 6. LAYER 2: PARALLAX ICEBERGS
        drawMountains(ctx, state.bgOffsets[1], 0.4, '#1b3765', '#102444', 280);

        // 7. LAYER 3: NEAR SNOWY TREES AND GLACIERS
        drawNearGlaciers(ctx, state.bgOffsets[2]);

        // 8. LAYER 4: GROUND ICE PATH
        drawGround(ctx, state.bgOffsets[3]);

        // 9. DRAW FISH COLLECTIBLES
        state.fish.forEach((f) => {
          drawFish(ctx, f);
        });

        // 10. DRAW OBSTACLES
        state.obstacles.forEach((obs) => {
          drawObstacle(ctx, obs);
        });

        // 11. DRAW PARTICLES
        state.particles.forEach((p) => {
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // 12. DRAW PENGUIN
        if (state.gameState !== 'GAMEOVER') {
          drawPenguin(ctx, state.player, state.activeSkin);
        }

        ctx.restore();
      };

      const drawAurora = (ctx: CanvasRenderingContext2D) => {
        const time = Date.now() * 0.0008;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        
        // Draw 2 glowing wavy lines (Aurora ribbon style)
        for (let wave = 0; wave < 2; wave++) {
          const grad = ctx.createLinearGradient(0, 0, VIRTUAL_WIDTH, 0);
          if (wave === 0) {
            grad.addColorStop(0, 'rgba(0, 240, 150, 0)');
            grad.addColorStop(0.3, 'rgba(0, 255, 180, 0.25)');
            grad.addColorStop(0.7, 'rgba(0, 180, 255, 0.2)');
            grad.addColorStop(1, 'rgba(0, 240, 150, 0)');
          } else {
            grad.addColorStop(0, 'rgba(150, 0, 255, 0)');
            grad.addColorStop(0.4, 'rgba(100, 220, 255, 0.15)');
            grad.addColorStop(0.8, 'rgba(255, 0, 150, 0.15)');
            grad.addColorStop(1, 'rgba(150, 0, 255, 0)');
          }

          ctx.strokeStyle = grad;
          ctx.lineWidth = 45;
          ctx.beginPath();
          
          for (let x = 0; x <= VIRTUAL_WIDTH; x += 40) {
            const angle = (x * 0.005) + time + (wave * Math.PI * 0.5);
            const y = 80 + Math.sin(angle) * 35 + Math.cos(angle * 0.5) * 15;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      };

      const drawMountains = (
        ctx: CanvasRenderingContext2D,
        offset: number,
        factor: number,
        colorStart: string,
        colorEnd: string,
        baseY: number
      ) => {
        ctx.save();
        const grad = ctx.createLinearGradient(0, baseY - 80, 0, VIRTUAL_HEIGHT);
        grad.addColorStop(0, colorStart);
        grad.addColorStop(1, colorEnd);
        ctx.fillStyle = grad;

        // Draw double-span mountains to wrap cleanly
        ctx.beginPath();
        ctx.moveTo(0, VIRTUAL_HEIGHT);

        // Generate static peak curves scaled by offset
        const points = 12;
        const step = VIRTUAL_WIDTH / (points - 1);

        for (let i = -1; i <= points; i++) {
          const x = i * step - offset;
          // Hardcoded peak patterns for consistency
          const heightFactor = Math.abs(Math.sin(i * 1.7) * 45 + Math.cos(i * 0.9) * 20);
          const y = baseY - heightFactor;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
        ctx.lineTo(0, VIRTUAL_HEIGHT);
        ctx.fill();
        ctx.restore();
      };

      const drawNearGlaciers = (ctx: CanvasRenderingContext2D, offset: number) => {
        ctx.save();
        const grad = ctx.createLinearGradient(0, 250, 0, GROUND_Y);
        grad.addColorStop(0, '#2d538e');
        grad.addColorStop(1, '#1b3b6f');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);

        // Draw near chunks/pine trees or sharp glacier blocks
        const count = 8;
        const width = VIRTUAL_WIDTH / (count - 1);
        for (let i = -1; i <= count; i++) {
          const x = i * width - offset;
          // Peak glacier height
          const y = 300 + Math.abs(Math.sin(i * 2.5)) * 40;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(VIRTUAL_WIDTH, GROUND_Y);
        ctx.lineTo(0, GROUND_Y);
        ctx.fill();

        // Little pine trees/ice crystals layered on top
        ctx.fillStyle = '#4c74ab';
        for (let i = -1; i <= count * 1.5; i++) {
          const x = i * (VIRTUAL_WIDTH / 10) - (offset * 1.2) % VIRTUAL_WIDTH;
          // Pine triangle
          ctx.beginPath();
          ctx.moveTo(x, GROUND_Y);
          ctx.lineTo(x - 15, GROUND_Y - 35);
          ctx.lineTo(x + 15, GROUND_Y);
          ctx.fill();

          // Snow cap on pine
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(x, GROUND_Y - 15);
          ctx.lineTo(x - 8, GROUND_Y - 35);
          ctx.lineTo(x + 8, GROUND_Y - 15);
          ctx.fill();
          ctx.fillStyle = '#4c74ab';
        }

        ctx.restore();
      };

      const drawGround = (ctx: CanvasRenderingContext2D, offset: number) => {
        ctx.save();
        // Shiny cold slippery ice ground
        const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, VIRTUAL_HEIGHT);
        groundGrad.addColorStop(0, '#e8f6ff'); // Sparkling white
        groundGrad.addColorStop(0.1, '#93d2f5'); // Soft blue
        groundGrad.addColorStop(0.5, '#40a9e6'); // Deep frost blue
        groundGrad.addColorStop(1, '#1d5a9d');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, GROUND_Y, VIRTUAL_WIDTH, VIRTUAL_HEIGHT - GROUND_Y);

        // Highlight line on edge
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(VIRTUAL_WIDTH, GROUND_Y);
        ctx.stroke();

        // Draw ground sliding details (horizontal lines/creases on ice)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        const lineSpacing = 35;
        for (let i = 0; i < 4; i++) {
          const ly = GROUND_Y + 12 + i * 14;
          const currentOffset = (offset * (1 + i * 0.2)) % VIRTUAL_WIDTH;
          
          ctx.beginPath();
          // Draw dashed lines across the screen to feel movement speed
          for (let lx = -VIRTUAL_WIDTH; lx < VIRTUAL_WIDTH * 2; lx += 150) {
            const rx = lx - currentOffset;
            if (rx > -100 && rx < VIRTUAL_WIDTH + 100) {
              ctx.moveTo(rx, ly);
              ctx.lineTo(rx + 80, ly);
            }
          }
          ctx.stroke();
        }
        ctx.restore();
      };

      const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
        ctx.save();
        
        if (obs.type === 'ICICLE') {
          const isHanging = obs.pulse === 1;
          const gradient = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y + obs.height);
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.4, '#bce6ff');
          gradient.addColorStop(1, '#53a8e2');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          if (isHanging) {
            // Pointing down
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + obs.width, obs.y);
            ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
          } else {
            // Pointing up from ground
            ctx.moveTo(obs.x, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
            ctx.lineTo(obs.x + obs.width / 2, obs.y);
          }
          ctx.closePath();
          ctx.fill();

          // Highlight shines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (isHanging) {
            ctx.moveTo(obs.x + obs.width / 2, obs.y + obs.height);
            ctx.lineTo(obs.x + 2, obs.y);
          } else {
            ctx.moveTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + 2, obs.y + obs.height);
          }
          ctx.stroke();
        } 
        else if (obs.type === 'SNOWBALL') {
          // Increment rolling rotation angle
          if (obs.angle !== undefined) {
            obs.angle += 0.08;
          }

          ctx.translate(obs.x + 16, obs.y + 16);
          ctx.rotate(obs.angle || 0);

          // Outer shadow/body
          const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 16);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.8, '#ecf6ff');
          grad.addColorStop(1, '#a6c6df');
          ctx.fillStyle = grad;

          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();

          // Draw spiral snowball ridges
          ctx.strokeStyle = '#85b2d6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 0.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, 6, Math.PI * 0.5, Math.PI * 1.5);
          ctx.stroke();
        } 
        else if (obs.type === 'GLACIER_WALL') {
          // Glacier pillar blocks
          const grad = ctx.createLinearGradient(obs.x, obs.y, obs.x + obs.width, obs.y + obs.height);
          grad.addColorStop(0, '#f2fafe');
          grad.addColorStop(0.5, '#76bcd9');
          grad.addColorStop(1, '#2c6ea6');
          ctx.fillStyle = grad;

          // Slightly jagged rectangular wall
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x, obs.y + 8);
          ctx.lineTo(obs.x + 8, obs.y);
          ctx.lineTo(obs.x + obs.width - 8, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + 12);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();

          // Shading cracks in the ice wall
          ctx.strokeStyle = '#27527c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(obs.x + 10, obs.y + 20);
          ctx.lineTo(obs.x + 18, obs.y + 45);
          ctx.lineTo(obs.x + 5, obs.y + 60);
          ctx.stroke();
        } 
        else if (obs.type === 'FLYING_SEAGULL') {
          if (obs.pulse !== undefined) {
            obs.pulse += 0.15;
          }
          const wingFlap = Math.sin(obs.pulse || 0) * 12;

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#222222';
          ctx.lineWidth = 1.5;

          // Body oval
          ctx.beginPath();
          ctx.ellipse(obs.x + 18, obs.y + 12, 16, 8, 0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Head & Beak
          ctx.fillStyle = '#ffd700'; // Beak
          ctx.beginPath();
          ctx.moveTo(obs.x + 30, obs.y + 8);
          ctx.lineTo(obs.x + 40, obs.y + 11);
          ctx.lineTo(obs.x + 32, obs.y + 14);
          ctx.fill();

          ctx.fillStyle = '#ffffff'; // Head
          ctx.beginPath();
          ctx.arc(obs.x + 30, obs.y + 9, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Eye
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(obs.x + 31, obs.y + 8, 1, 0, Math.PI * 2);
          ctx.fill();

          // Wing 1 (Far/Back)
          ctx.fillStyle = '#cccccc';
          ctx.beginPath();
          ctx.moveTo(obs.x + 12, obs.y + 10);
          ctx.lineTo(obs.x + 5, obs.y + 10 + wingFlap);
          ctx.lineTo(obs.x + 16, obs.y + 12);
          ctx.fill();

          // Wing 2 (Front)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(obs.x + 16, obs.y + 10);
          ctx.lineTo(obs.x + 20, obs.y - 10 - wingFlap);
          ctx.lineTo(obs.x + 22, obs.y + 12);
          ctx.fill();
          ctx.stroke();

          // Tail feather
          ctx.beginPath();
          ctx.moveTo(obs.x + 2, obs.y + 12);
          ctx.lineTo(obs.x, obs.y + 16);
          ctx.lineTo(obs.x + 6, obs.y + 14);
          ctx.stroke();
        }

        ctx.restore();
      };

      const drawFish = (ctx: CanvasRenderingContext2D, f: FishCollectible) => {
        ctx.save();
        
        // Up-down levitation pulse animation
        const pulseY = Math.sin(Date.now() * 0.005 + f.pulseOffset) * 4;
        const fy = f.y + pulseY;

        const isGolden = f.type === 'golden';

        // Glowing shadow/aura
        ctx.shadowColor = isGolden ? '#ffaa00' : '#49f3ff';
        ctx.shadowBlur = 12;

        const grad = ctx.createLinearGradient(f.x, fy, f.x + f.width, fy + f.height);
        if (isGolden) {
          grad.addColorStop(0, '#ffe873');
          grad.addColorStop(0.5, '#ffd700');
          grad.addColorStop(1, '#e5a900');
        } else {
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.5, '#4de3ff');
          grad.addColorStop(1, '#008ba8');
        }
        ctx.fillStyle = grad;

        // Draw cute fish outline path
        ctx.beginPath();
        // Body tail overlap
        ctx.moveTo(f.x + 4, fy + f.height / 2); // Nose
        ctx.quadraticCurveTo(f.x + f.width * 0.4, fy - 3, f.x + f.width - 5, fy + 4); // Top back
        ctx.lineTo(f.x + f.width, fy); // Tail upper tip
        ctx.lineTo(f.x + f.width - 3, fy + f.height / 2); // Tail center index
        ctx.lineTo(f.x + f.width, fy + f.height); // Tail lower tip
        ctx.quadraticCurveTo(f.x + f.width * 0.4, fy + f.height + 3, f.x + 4, fy + f.height / 2); // Bottom belly
        ctx.fill();

        // Eye
        ctx.fillStyle = isGolden ? '#511000' : '#003a4d';
        ctx.beginPath();
        ctx.arc(f.x + 7, fy + f.height / 2 - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Draw the beautiful vector penguin character
      const drawPenguin = (ctx: CanvasRenderingContext2D, p: PlayerPhysics, skin: Skin) => {
        ctx.save();

        const isGoldenSkin = skin.id === 'golden';

        // Move coordinates to the center of the penguin to apply rotation
        const px = p.x + p.width / 2;
        const py = p.y + p.height / 2;
        ctx.translate(px, py);
        ctx.rotate(p.rotation);

        // Waddling offset
        const waddleFrame = Math.floor(p.runFrame);
        const waddleY = (p.isGrounded && !p.isSliding) ? Math.abs(Math.sin(p.runFrame * Math.PI)) * 3 : 0;

        ctx.translate(0, waddleY);

        // Drawing parameters
        const w = p.width;
        const h = p.height;

        // Custom Skin Shading Values
        let coatColor = skin.color;
        let bellyColor = '#ffffff';
        let beakColor = '#ffd20c';

        if (isGoldenSkin) {
          coatColor = '#ffcf0c';
          bellyColor = '#ffeaa7';
          beakColor = '#ff7675';
        }

        // DRAW FEET (underbody)
        if (!p.isSliding) {
          ctx.fillStyle = isGoldenSkin ? '#ff7675' : '#ff9209';
          
          // Left Foot
          ctx.save();
          ctx.translate(-10, h / 2 - 4);
          ctx.rotate(waddleFrame % 2 === 0 ? 0.2 : -0.1);
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Right Foot
          ctx.save();
          ctx.translate(10, h / 2 - 4);
          ctx.rotate(waddleFrame % 2 !== 0 ? 0.2 : -0.1);
          ctx.beginPath();
          ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // DRAW MAIN SHADOW/BODY COAT
        ctx.fillStyle = coatColor;
        ctx.beginPath();
        if (p.isSliding) {
          // Slide: Horizontally oval shape
          ctx.ellipse(0, 5, w / 2 + 5, h / 2 + 3, 0, 0, Math.PI * 2);
        } else {
          // Standing: Vertical tear-drop/egg shape
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        // DRAW BELLY
        ctx.fillStyle = bellyColor;
        ctx.beginPath();
        if (p.isSliding) {
          ctx.ellipse(5, 7, w / 3, h / 3, 0, 0, Math.PI * 2);
        } else {
          ctx.ellipse(0, 4, w / 2.8, h / 2.2, 0, 0, Math.PI * 2);
        }
        ctx.fill();

        // DRAW CHEEKS (Cute details)
        ctx.fillStyle = isGoldenSkin ? 'rgba(255, 120, 120, 0.5)' : 'rgba(255, 170, 170, 0.5)';
        if (p.isSliding) {
          ctx.beginPath();
          ctx.arc(w / 3, 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(-w / 4, -h / 6, 3, 0, Math.PI * 2);
          ctx.arc(w / 4, -h / 6, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // DRAW EYES
        ctx.fillStyle = '#000000';
        if (p.isSliding) {
          // Slide looking forward (right)
          ctx.beginPath();
          ctx.arc(w / 3 - 1, -2, 2.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Eye shine
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(w / 3, -3, 0.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Eye 1
          ctx.beginPath();
          ctx.arc(-w / 5, -h / 4, 2.5, 0, Math.PI * 2);
          ctx.fill();
          // Eye 2
          ctx.beginPath();
          ctx.arc(w / 5, -h / 4, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Shiny sparkles
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-w / 5 + 0.5, -h / 4 - 0.5, 0.8, 0, Math.PI * 2);
          ctx.arc(w / 5 + 0.5, -h / 4 - 0.5, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // DRAW BEAK
        ctx.fillStyle = beakColor;
        ctx.beginPath();
        if (p.isSliding) {
          ctx.moveTo(w / 2 - 2, 2);
          ctx.lineTo(w / 2 + 8, 5);
          ctx.lineTo(w / 2 - 1, 8);
        } else {
          ctx.moveTo(-5, -h / 5);
          ctx.lineTo(5, -h / 5);
          ctx.lineTo(0, -h / 5 + 8);
        }
        ctx.fill();

        // DRAW SKIN UNIQUE COSTUMES
        drawSkinDetails(ctx, skin, p);

        // DRAW FLIPPERS/WINGS (Overbody)
        ctx.fillStyle = coatColor;
        ctx.save();
        if (p.isSliding) {
          // Wings pinned backward on slide
          ctx.translate(-w / 3, 5);
          ctx.rotate(-0.4);
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 3, h / 5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (!p.isGrounded) {
          // Flapping wings fully up in air
          ctx.translate(-w / 2 + 2, -3);
          ctx.rotate(-0.8);
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 4, h / 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
          ctx.save();
          ctx.fillStyle = coatColor;
          ctx.translate(w / 2 - 2, -3);
          ctx.rotate(0.8);
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 4, h / 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Waddling arms
          const armFlap = Math.sin(p.runFrame * Math.PI) * 0.15;
          ctx.translate(-w / 2 + 1, 0);
          ctx.rotate(-0.2 + armFlap);
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 5, h / 3, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
          ctx.save();
          ctx.fillStyle = coatColor;
          ctx.translate(w / 2 - 1, 0);
          ctx.rotate(0.2 - armFlap);
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 5, h / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.restore();
      };

      const drawSkinDetails = (ctx: CanvasRenderingContext2D, skin: Skin, p: PlayerPhysics) => {
        const w = p.width;
        const h = p.height;
        
        if (skin.id === 'agent') {
          // Cool sunglasses
          ctx.fillStyle = '#111111';
          if (p.isSliding) {
            ctx.fillRect(w / 4, -5, 11, 4);
          } else {
            ctx.beginPath();
            ctx.roundRect(-w / 4 - 2, -h / 4 - 3, 10, 5, 2);
            ctx.roundRect(w / 12, -h / 4 - 3, 10, 5, 2);
            ctx.fill();
            // Glass bridge
            ctx.fillRect(-w / 12, -h / 4 - 1, 4, 1.5);
          }

          // Suit Tie
          ctx.fillStyle = '#e74c3c'; // Red Tie
          ctx.beginPath();
          if (p.isSliding) {
            ctx.moveTo(w / 8, 8);
            ctx.lineTo(w / 8 - 4, 11);
            ctx.lineTo(w / 8 - 8, 9);
            ctx.lineTo(w / 8 - 4, 7);
          } else {
            ctx.moveTo(0, h / 12);
            ctx.lineTo(-4, h / 12 + 12);
            ctx.lineTo(0, h / 12 + 17);
            ctx.lineTo(4, h / 12 + 12);
          }
          ctx.fill();
        } 
        else if (skin.id === 'festive') {
          // Red Christmas Santa Hat
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          if (p.isSliding) {
            ctx.moveTo(-w / 6, -h / 4);
            ctx.lineTo(-w / 2, -h / 3);
            ctx.lineTo(w / 4, -h / 3.5);
            ctx.fill();
            // Pom pom
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-w / 2, -h / 3, 4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.moveTo(-w / 2 + 2, -h / 2.3);
            ctx.quadraticCurveTo(0, -h - 2, w / 2 - 2, -h / 2.3);
            ctx.fill();

            // White fluff rim
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(-w / 2, -h / 2.3 - 2, w, 5, 2);
            ctx.fill();

            // Pom pom at top/side
            ctx.beginPath();
            ctx.arc(w / 3, -h / 1.5, 4.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Cozy Green Scarf
          ctx.fillStyle = '#2ecc71';
          ctx.beginPath();
          if (p.isSliding) {
            ctx.roundRect(w / 6, 4, 5, h / 2.5, 2.5);
            ctx.fill();
          } else {
            ctx.roundRect(-w / 3, h / 12, (w * 2) / 3, 5, 2);
            ctx.fill();
            // Scarf tail flapping
            ctx.save();
            ctx.translate(w / 4, h / 12 + 2);
            ctx.rotate(0.3 + Math.sin(p.runFrame) * 0.15);
            ctx.fillRect(0, 0, 5, 12);
            ctx.restore();
          }
        } 
        else if (skin.id === 'space') {
          // Translucent spacesuit helmet bubble visor
          ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (p.isSliding) {
            ctx.arc(w / 4, 2, w / 2.3, 0, Math.PI * 2);
          } else {
            ctx.arc(0, -h / 5, w / 1.7, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.stroke();

          // Oxygen tank on back
          ctx.fillStyle = '#dfe6e9';
          ctx.beginPath();
          if (p.isSliding) {
            ctx.roundRect(-w / 2 - 6, 2, 7, h / 2.5, 2.5);
          } else {
            ctx.roundRect(-w / 2 - 3, -5, 6, h / 2, 3);
          }
          ctx.fill();
        } 
        else if (skin.id === 'ninja') {
          // Headband band around head
          ctx.fillStyle = '#111111';
          ctx.beginPath();
          if (p.isSliding) {
            ctx.roundRect(w / 12, -4, w / 2.5, 5, 1);
            ctx.fill();
          } else {
            ctx.roundRect(-w / 2, -h / 4 - 3, w, 5, 1);
            ctx.fill();
          }

          // Flapping red headband tie tails at the back
          ctx.fillStyle = '#e74c3c';
          ctx.save();
          if (p.isSliding) {
            ctx.translate(-w / 3, -1);
            ctx.rotate(-0.2 + Math.sin(p.runFrame) * 0.2);
            ctx.fillRect(-12, -2, 12, 3);
          } else {
            ctx.translate(-w / 2, -h / 4);
            ctx.rotate(0.5 + Math.sin(p.runFrame) * 0.2);
            ctx.fillRect(-12, -1, 12, 2.5);
          }
          ctx.restore();
        }
        else if (skin.id === 'punk') {
          // Cool purple mohawk
          ctx.fillStyle = '#9b59b6';
          ctx.beginPath();
          if (p.isSliding) {
            ctx.moveTo(w / 6, -h / 3);
            ctx.lineTo(w / 3, -h / 2.5);
            ctx.lineTo(-w / 4, -h / 4);
          } else {
            ctx.moveTo(-5, -h / 2);
            ctx.lineTo(0, -h / 1.3);
            ctx.lineTo(5, -h / 2);
            ctx.moveTo(-10, -h / 2.2);
            ctx.lineTo(-5, -h / 1.4);
            ctx.lineTo(0, -h / 2.2);
            ctx.moveTo(0, -h / 2.2);
            ctx.lineTo(5, -h / 1.4);
            ctx.lineTo(10, -h / 2.2);
          }
          ctx.closePath();
          ctx.fill();
        }
      };

      // Handle loop cleanups
      animId = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(animId);
      };
    }, [gameState]);

    return (
      <div 
        id="game-canvas-container" 
        ref={containerRef} 
        className="relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center cursor-pointer select-none"
        onClick={(e) => {
          // Touch controls for mobile users:
          // Click left half of screen to JUMP
          // Click right half of screen to SLIDE
          if (gameState !== 'PLAYING') return;
          const container = containerRef.current;
          if (!container) return;

          const rect = container.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const halfWidth = rect.width / 2;

          const state = stateRef.current;
          if (clickX < halfWidth) {
            // JUMP
            if (state.player.isGrounded && !state.player.isSliding) {
              state.player.vy = state.player.jumpForce;
              state.player.isGrounded = false;
              audio.playJump();
              spawnJumpPuff(state.player.x + 22, GROUND_Y);
            }
          } else {
            // SLIDE
            if (state.player.isGrounded && !state.player.isSliding) {
              state.player.isSliding = true;
              state.player.height = 30;
              state.player.y = GROUND_Y - 30;
              state.player.slideTimer = 45;
              audio.playSlide();
            }
          }
        }}
      >
        <canvas 
          id="main-runner-canvas"
          ref={canvasRef} 
          className="block max-w-full max-h-full rounded shadow-2xl"
        />
        
        {/* Mobile Control Helper Labels overlay (brief hint at start of playing) */}
        {gameState === 'PLAYING' && stateRef.current.distance < 4 && (
          <div className="absolute inset-0 flex pointer-events-none animate-fade-out" style={{ animationDelay: '2.5s', animationFillMode: 'forwards' }}>
            <div className="w-1/2 h-full flex flex-col justify-end items-center pb-8 bg-gradient-to-r from-cyan-500/5 to-transparent">
              <span className="text-white/60 text-xs px-3 py-1.5 rounded-full bg-slate-900/65 backdrop-blur-sm border border-white/10 font-sans font-medium tracking-wide">
                ← TAP LEFT TO JUMP
              </span>
            </div>
            <div className="w-1/2 h-full flex flex-col justify-end items-center pb-8 bg-gradient-to-l from-indigo-500/5 to-transparent">
              <span className="text-white/60 text-xs px-3 py-1.5 rounded-full bg-slate-900/65 backdrop-blur-sm border border-white/10 font-sans font-medium tracking-wide">
                TAP RIGHT TO SLIDE →
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

GameCanvas.displayName = 'GameCanvas';
