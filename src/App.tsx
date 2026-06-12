/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Sparkles, Trophy, RotateCcw, Play, Pause, Gamepad2, Settings as SettingsIcon } from 'lucide-react';
import { Direction, GameSettings, GameStats, GameStatus, Position, Food, FoodType } from './types';
import SnakeBoard from './components/SnakeBoard';
import Controls from './components/Controls';
import Settings from './components/Settings';
import Instructions from './components/Instructions';
import { audio } from './utils/audio';

// Constants
const DEFAULT_GRID_SIZE = 20;

const DIFFICULTY_CONFIG = {
  easy: { speed: 150, decrement: 5, minSpeed: 70 },
  medium: { speed: 100, decrement: 6, minSpeed: 45 },
  hard: { speed: 70, decrement: 7, minSpeed: 25 },
};

export default function App() {
  // Latch initial configurations from local storage
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('snake_game_settings_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read settings from localStorage', e);
    }
    return {
      difficulty: 'medium',
      soundEnabled: true,
      theme: 'dark',
      wrapAround: false,
      gridSize: DEFAULT_GRID_SIZE,
    };
  });

  // Dynamic High Score Tracking mapped to difficulty config
  const [highScores, setHighScores] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('snake_game_highscores_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read highscores from localStorage', e);
    }
    return { easy: 0, medium: 0, hard: 0 };
  });

  // Primary Game States
  const [snake, setSnake] = useState<Position[]>([]);
  const [direction, setDirection] = useState<Direction>('UP');
  const [foods, setFoods] = useState<Food[]>([]);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    foodEaten: 0,
    level: 1,
    speed: 100,
  });

  // Side panels
  const [showSettingsSidebar, setShowSettingsSidebar] = useState(false);

  // Prevention of opposite and rapid input turns in a single speed loop
  const lastMovedDirectionRef = useRef<Direction>('UP');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const newHighScoreBeatenRef = useRef<boolean>(false);

  // Sync audio enabled status with synthetic sound system
  useEffect(() => {
    audio.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Persist settings changes
  useEffect(() => {
    localStorage.setItem('snake_game_settings_v1', JSON.stringify(settings));
  }, [settings]);

  // Read score status and sync local dynamic high scores
  useEffect(() => {
    const activeHighScore = highScores[settings.difficulty] || 0;
    setStats((prev) => ({
      ...prev,
      highScore: activeHighScore,
    }));
  }, [settings.difficulty, highScores]);

  // Setup Snake and Food positions on load or reset
  const initGame = useCallback(() => {
    const size = settings.gridSize;
    const centerX = Math.floor(size / 2);
    const centerY = Math.floor(size / 2);

    // Initial snake body hanging downwards
    const initialSnake = [
      { x: centerX, y: centerY },
      { x: centerX, y: centerY + 1 },
      { x: centerX, y: centerY + 2 },
    ];

    setSnake(initialSnake);
    setDirection('UP');
    lastMovedDirectionRef.current = 'UP';
    newHighScoreBeatenRef.current = false;

    // Build fresh speed from difficulty selection
    const startSpeed = DIFFICULTY_CONFIG[settings.difficulty].speed;

    const initialStats: GameStats = {
      score: 0,
      highScore: highScores[settings.difficulty] || 0,
      foodEaten: 0,
      level: 1,
      speed: startSpeed,
    };
    setStats(initialStats);

    // Generate starter food
    const firstFood = generateSingleFood(initialSnake, size, []);
    setFoods([firstFood]);
  }, [settings.difficulty, settings.gridSize, highScores]);

  // Initialize on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Generates unique coordinates not colliding with snake or existing food
  const generateSingleFood = (
    currentSnake: Position[],
    gridSize: number,
    existingFoods: Food[]
  ): Food => {
    let position: Position = { x: 0, y: 0 };
    let attempts = 0;
    let isValid = false;

    while (!isValid && attempts < 1000) {
      position = {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize),
      };

      // Check snake body segment overlap
      const hitBody = currentSnake.some((seg) => seg.x === position.x && seg.y === position.y);
      // Check existing food overlap
      const hitFood = existingFoods.some((f) => f.position.x === position.x && f.position.y === position.y);

      if (!hitBody && !hitFood) {
        isValid = true;
      }
      attempts++;
    }

    // Determine lucky properties of food
    const rand = Math.random();
    let type: FoodType = 'NORMAL';
    let color = '#ef4444'; // Red-500
    let points = 10;

    if (rand < 0.1) {
      type = 'GOLDEN';
      color = '#eab308'; // Glowing gold yellow-500
      points = 30;
    } else if (rand < 0.22) {
      type = 'SPEED_BOOST';
      color = '#3b82f6'; // Bright potion blue-500
      points = 20;
    }

    // In Retro monochrome green look, override color accents with themed shades
    if (settings.theme === 'retro') {
      if (type === 'GOLDEN') color = '#22c55e'; // Highlighted Green
      else if (type === 'SPEED_BOOST') color = '#a7f3d0'; // Light jade
      else color = '#15803d'; // Medium emerald green
    }

    return {
      position,
      type,
      color,
      points,
      pulseTimer: 0,
    };
  };

  // Safe direction controller that ignores self-collisions inside tick limits
  const handleDirectionChange = useCallback(
    (newDir: Direction) => {
      const lastDir = lastMovedDirectionRef.current;
      if (status !== 'RUNNING') return;

      if (newDir === 'UP' && lastDir !== 'DOWN') setDirection('UP');
      if (newDir === 'DOWN' && lastDir !== 'UP') setDirection('DOWN');
      if (newDir === 'LEFT' && lastDir !== 'RIGHT') setDirection('LEFT');
      if (newDir === 'RIGHT' && lastDir !== 'LEFT') setDirection('RIGHT');
    },
    [status]
  );

  // Keybindings listener & Page Scroll Preventer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space trigger
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        audio.playClick();
        if (status === 'RUNNING') {
          setStatus('PAUSED');
        } else if (status === 'PAUSED') {
          setStatus('RUNNING');
        } else if (status === 'IDLE') {
          setStatus('RUNNING');
        }
        return;
      }

      // Enter override for rapid restart on Game Over
      if (e.key === 'Enter') {
        if (status === 'GAME_OVER' || status === 'IDLE') {
          e.preventDefault();
          audio.playClick();
          initGame();
          setStatus('RUNNING');
        }
        return;
      }

      // Track game control buttons to block page scrolling
      const controlKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'w',
        'a',
        's',
        'd',
        'W',
        'A',
        'S',
        'D',
      ];
      if (controlKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (status !== 'RUNNING') return;

      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          handleDirectionChange('UP');
          break;
        case 'arrowdown':
        case 's':
          handleDirectionChange('DOWN');
          break;
        case 'arrowleft':
        case 'a':
          handleDirectionChange('LEFT');
          break;
        case 'arrowright':
        case 'd':
          handleDirectionChange('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleDirectionChange, initGame]);

  // Touch Telemetry swipe observer
  const handleTouchStart = (e: React.TouchEvent) => {
    if (status !== 'RUNNING') return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || status !== 'RUNNING') return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Minimum distance threshold to count as swipe (in px)
    const threshold = 30;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal Swipes
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          handleDirectionChange('RIGHT');
        } else {
          handleDirectionChange('LEFT');
        }
      }
    } else {
      // Vertical Swipes
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          handleDirectionChange('DOWN');
        } else {
          handleDirectionChange('UP');
        }
      }
    }

    touchStartRef.current = null;
  };

  // Main core physics tick
  const moveSnake = useCallback(() => {
    if (status !== 'RUNNING') return;

    setSnake((prevSnake) => {
      if (prevSnake.length === 0) return prevSnake;

      const head = prevSnake[0];
      let newHead = { ...head };

      switch (direction) {
        case 'UP':
          newHead.y -= 1;
          break;
        case 'DOWN':
          newHead.y += 1;
          break;
        case 'LEFT':
          newHead.x -= 1;
          break;
        case 'RIGHT':
          newHead.x += 1;
          break;
      }

      // Frame direction locking to avoid rapid opposite collision
      lastMovedDirectionRef.current = direction;

      const size = settings.gridSize;

      // 1. Boundary Wall Cross Check
      if (settings.wrapAround) {
        if (newHead.x < 0) newHead.x = size - 1;
        else if (newHead.x >= size) newHead.x = 0;

        if (newHead.y < 0) newHead.y = size - 1;
        else if (newHead.y >= size) newHead.y = 0;
      } else {
        if (newHead.x < 0 || newHead.x >= size || newHead.y < 0 || newHead.y >= size) {
          triggerGameOver();
          return prevSnake; // Halt movement
        }
      }

      // 2. Self Body Collision Check (avoid crashing in neck, check full body)
      const hitBody = prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y);
      if (hitBody) {
        triggerGameOver();
        return prevSnake;
      }

      // 3. Food Eating Check
      const eatenFoodIndex = foods.findIndex(
        (f) => f.position.x === newHead.x && f.position.y === newHead.y
      );

      const computedSnake = [newHead, ...prevSnake];

      if (eatenFoodIndex !== -1) {
        const eatenFood = foods[eatenFoodIndex];
        
        // Play synthesizer response
        audio.playEat(eatenFood.type);

        // Remove eaten food and build replacement food
        const remainingFood = foods.filter((_, idx) => idx !== eatenFoodIndex);
        const newFood = generateSingleFood(computedSnake, size, remainingFood);
        const updatedFoods = [...remainingFood, newFood];

        // Rare extra chance to spawn a secondary sparkling golden apple when list is small
        if (Math.random() < 0.12 && updatedFoods.length === 1) {
          const bonusFood = generateSingleFood(computedSnake, size, updatedFoods);
          updatedFoods.push(bonusFood);
        }

        setFoods(updatedFoods);

        // Score calculations
        setStats((prev) => {
          const addedScore = eatenFood.points;
          const nextScore = prev.score + addedScore;
          const updatedFoodCount = prev.foodEaten + 1;

          // Compute Level Up and speed boosts
          let currentLevel = prev.level;
          let currentSpeed = prev.speed;
          const config = DIFFICULTY_CONFIG[settings.difficulty];

          if (updatedFoodCount % 3 === 0) {
            currentLevel += 1;
            currentSpeed = Math.max(currentSpeed - config.decrement, config.minSpeed);
            audio.playLevelUp();
          }

          // Trigger speed potion secondary boost
          if (eatenFood.type === 'SPEED_BOOST') {
            currentSpeed = Math.max(currentSpeed - 8, config.minSpeed);
          }

          // Track record breakers
          let targetHighScore = prev.highScore;
          if (nextScore > prev.highScore) {
            targetHighScore = nextScore;
            if (!newHighScoreBeatenRef.current && prev.highScore > 0) {
              newHighScoreBeatenRef.current = true;
              audio.playHighScore();
            }
          }

          return {
            ...prev,
            score: nextScore,
            foodEaten: updatedFoodCount,
            level: currentLevel,
            speed: currentSpeed,
            highScore: targetHighScore,
          };
        });

        // Do not pop tail block (snake elongates)
        return computedSnake;
      }

      // Normal movement loop: slide body grid forward
      computedSnake.pop();
      return computedSnake;
    });
  }, [direction, foods, settings, status]);

  const triggerGameOver = () => {
    setStatus('GAME_OVER');
    audio.playCrash();

    // Check and save highest score inside local storage values
    setStats((currentStats) => {
      const activeDifficulty = settings.difficulty;
      const cachedHighs = { ...highScores };
      
      if (currentStats.score > (cachedHighs[activeDifficulty] || 0)) {
        cachedHighs[activeDifficulty] = currentStats.score;
        setHighScores(cachedHighs);
        localStorage.setItem('snake_game_highscores_v1', JSON.stringify(cachedHighs));
      }
      return currentStats;
    });
  };

  // Run Interval ticks for Snake motion speed loops
  useEffect(() => {
    if (status !== 'RUNNING') return;

    const handleInterval = () => {
      moveSnake();
    };

    const timer = setTimeout(handleInterval, stats.speed);
    return () => clearTimeout(timer);
  }, [status, snake, direction, stats.speed, moveSnake]);

  // UI Theme adaptation fields
  const backgroundClass =
    settings.theme === 'retro'
      ? 'bg-[#020d06] text-green-400 font-mono'
      : settings.theme === 'dark'
      ? 'bg-[#0a0b14] text-slate-100 font-sans'
      : 'bg-slate-50 text-slate-800 font-sans';

  const titleColor =
    settings.theme === 'retro'
      ? 'text-green-400 font-bold tracking-widest'
      : settings.theme === 'dark'
      ? 'text-white'
      : 'text-slate-900';

  const cardBg =
    settings.theme === 'retro'
      ? 'bg-[#05180f] border border-green-800/80 shadow-[0_0_15px_rgba(22,101,52,0.15)] text-green-400'
      : settings.theme === 'dark'
      ? 'bg-[#16182d] border border-white/5 text-slate-100 shadow-xl'
      : 'bg-white border border-slate-200 text-slate-800 shadow-md';

  return (
    <div className={`min-h-screen pb-12 transition-colors duration-300 ${backgroundClass}`}>
      
      {/* HEADER NAVBAR */}
      <header className={`border-b backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3.5 transition-all duration-300 ${
        settings.theme === 'retro'
          ? 'border-green-900 bg-[#020d06]/95'
          : settings.theme === 'dark'
          ? 'border-indigo-500/20 bg-[#111322]/95 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
          : 'border-slate-200 bg-slate-50/90'
      }`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`p-2 rounded-xl flex items-center justify-center ${
              settings.theme === 'retro'
                ? 'bg-[#052e16] border border-green-700 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                : settings.theme === 'dark'
                ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                : 'bg-emerald-600 text-white shadow-sm'
            }`}>
              <Gamepad2 className="w-5 h-5" />
            </span>
            <div className="flex flex-col">
              <h1 className={`text-base font-black uppercase tracking-wider text-sm ${titleColor}`}>
                {settings.theme === 'dark' ? (
                  <>
                    Neon<span className="text-indigo-400">Snake</span>
                  </>
                ) : 'Snake Codex'}
              </h1>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Classic Arcade v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* EASY VOLUME TOGGLE FOR CONVENIENCE */}
            <button
              onClick={() => {
                audio.playClick();
                setSettings((current) => ({ ...current, soundEnabled: !current.soundEnabled }));
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                settings.theme === 'retro'
                  ? 'border-green-800 bg-[#05180f] text-green-400 hover:bg-[#0b2b1b]'
                  : settings.theme === 'dark'
                  ? 'border-white/5 bg-[#1e213a] text-slate-300 hover:bg-[#252844] hover:text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
              title="Toggle Audio Feedback"
              id="header-sound-icon"
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
            </button>

            {/* QUICK SETTINGS TOGGLE SIDEBAR BUTTON */}
            <button
              onClick={() => {
                audio.playClick();
                setShowSettingsSidebar(!showSettingsSidebar);
              }}
              className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all text-xs cursor-pointer select-none font-semibold ${
                settings.theme === 'retro'
                  ? 'border-green-800 bg-[#05180f] text-green-400 hover:bg-[#0b2b1b]'
                  : settings.theme === 'dark'
                  ? 'border-white/5 bg-[#1e213a] text-slate-300 hover:bg-[#252844] hover:text-white'
                  : 'border-[#eaeff4] bg-white text-slate-600 shadow-sm hover:bg-slate-100'
              }`}
              id="header-settings-toggle"
            >
              <SettingsIcon className={`w-4 h-4 ${showSettingsSidebar ? 'rotate-90' : ''} transition-transform duration-300`} />
              Configure
            </button>

          </div>
        </div>
      </header>

      {/* CORE WORKSPACE CONSTRAIN CONTAINER */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-6">

        {/* HERO TITLE STATS SUMMARY */}
        <section className={`grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6 w-full max-w-2xl mx-auto sm:max-w-none`}>
          
          {/* STAT 1: SCORE */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${cardBg}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
              📈 Score
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black font-mono leading-none">
                {stats.score}
              </span>
              <span className="text-[9px] text-slate-500 uppercase">pts</span>
            </div>
          </div>

          {/* STAT 2: HIGH SCORE */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${cardBg}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
              <Trophy className="w-3 h-3 text-yellow-500 shrink-0" />
              High Score
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl text-yellow-500 font-black font-mono leading-none">
                {stats.highScore}
              </span>
              <span className="text-[9px] text-slate-500 uppercase">Max</span>
            </div>
          </div>

          {/* STAT 3: LEVEL */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${cardBg}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
              ⭐ Game Level
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl text-emerald-500 font-black font-mono leading-none">
                {stats.level}
              </span>
              <span className="text-[9px] text-slate-500 uppercase">Spd</span>
            </div>
          </div>

          {/* STAT 4: CONTROLS CONFIG INFO SUMMARY */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${cardBg}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
              ⚙️ Difficulty
            </span>
            <div className="flex flex-col mt-1 justify-end">
              <span className="text-sm font-bold uppercase truncate">
                {settings.difficulty}
              </span>
              <span className="text-[8px] text-slate-400">
                {settings.wrapAround ? 'Wrap Active' : 'Solid Boundaries'}
              </span>
            </div>
          </div>

        </section>

        {/* PRIMARY ACTION PLAYGROUNDGRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN 1: BOARD CANVAS (8 Columns spanning) */}
          <div className="lg:col-span-12 flex flex-col items-center">
            
            <div className="w-full flex flex-col xl:flex-row gap-6 justify-center items-center">
              
              <div className="w-full max-w-lg relative select-none">
                
                {/* BOARD AREA TELEMETRY SWIPE LISTENERS */}
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  className="relative group cursor-crosshair rounded-xl overflow-hidden"
                >
                  <SnakeBoard
                    snake={snake}
                    direction={direction}
                    foods={foods}
                    gridSize={settings.gridSize}
                    status={status}
                    score={stats.score}
                    theme={settings.theme}
                  />

                  {/* BIG IDLE START / RESTART GAME OVERLAY FOR CONVENIENCE */}
                  {status === 'IDLE' && (
                    <div className="absolute inset-x-2 inset-y-2 rounded-xl bg-black/92 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none z-10">
                      <Gamepad2 className="w-14 h-14 text-emerald-400 mb-3 animate-bounce" />
                      <h2 className="text-lg font-black text-white uppercase tracking-wider">
                        SNAKE ENGINE READIED
                      </h2>
                      <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                        Navigate with arrow keys / WASD or swipe on mobile screens. Eat apples to grow!
                      </p>
                      
                      <button
                        onClick={() => {
                          audio.playClick();
                          initGame();
                          setStatus('RUNNING');
                        }}
                        className="mt-5 px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase hover:bg-emerald-600 transition-all shadow-[0_0_15px_rgba(16,185,129,0.45)] cursor-pointer active:scale-95 flex items-center gap-1.5"
                        id="overlay-start-btn"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Engage Thrusters (Enter)
                      </button>
                    </div>
                  )}

                  {/* AUDIO CONTROL OVERLAY FOR GAME OVER */}
                  {status === 'GAME_OVER' && (
                    <div className="absolute inset-x-2 inset-y-2 rounded-xl bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center select-none z-10">
                      <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-500 mb-3 animate-pulse">
                        💀
                      </div>
                      <h2 className="text-xl font-black text-rose-500 uppercase tracking-widest animate-pulse">
                        GAME OVER
                      </h2>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                        You collided with a boundary or bit your own tail.
                      </p>

                      <div className="grid grid-cols-2 gap-4 my-4 max-w-xs w-full bg-[#16182d]/90 p-3 rounded-xl border border-white/5 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase tracking-widest">Final Score</span>
                          <span className="text-xl font-black font-mono text-white mt-1 block">{stats.score}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase tracking-widest">Best High</span>
                          <span className="text-xl font-black font-mono text-yellow-400 mt-1 block">
                            {highScores[settings.difficulty] || stats.score}
                          </span>
                        </div>
                      </div>

                      {newHighScoreBeatenRef.current && (
                        <div className="text-[10px] text-amber-400 font-semibold mb-3 tracking-wide flex items-center gap-1 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                          <Sparkles className="w-3 h-3 text-amber-400 shrink-0 animate-spin" />
                          🎉 UNLOCKED A NEW HIGH SCORE RUN!
                        </div>
                      )}

                      <button
                        onClick={() => {
                          audio.playClick();
                          initGame();
                          setStatus('RUNNING');
                        }}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase hover:bg-emerald-600 transition-all shadow-[0_0_15px_rgba(16,185,129,0.45)] cursor-pointer active:scale-95 flex items-center gap-1.5"
                        id="overlay-replay-btn"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Play Again (Enter)
                      </button>
                    </div>
                  )}
                </div>

                {/* BOTTOM FLOATING STATE BAR UNDER CANVAS */}
                <div className="flex items-center justify-between mt-3 px-1 text-[11px] text-slate-400 select-none">
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full inline-block ${status === 'RUNNING' ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                    <span className="uppercase text-[9px] tracking-wider">
                      Status: <strong className={status === 'RUNNING' ? 'text-emerald-400' : 'text-slate-500'}>{status}</strong>
                    </span>
                  </div>

                  {status === 'RUNNING' && (
                    <button
                      onClick={() => {
                        audio.playClick();
                        setStatus('PAUSED');
                      }}
                      className="hover:text-emerald-400 cursor-pointer transition-colors uppercase text-[9px] tracking-wider flex items-center gap-1"
                      id="ui-quick-pause"
                    >
                      <Pause className="w-3 h-3 text-slate-500" />
                      Pause (Space)
                    </button>
                  )}

                  {status === 'PAUSED' && (
                    <button
                      onClick={() => {
                        audio.playClick();
                        setStatus('RUNNING');
                      }}
                      className="hover:text-emerald-400 cursor-pointer transition-colors uppercase text-[9px] tracking-wider flex items-center gap-1 text-emerald-400"
                      id="ui-quick-resume"
                    >
                      <Play className="w-3 h-3" />
                      Resume (Space)
                    </button>
                  )}
                </div>

              </div>

              {/* GAME CONFIGURATIONS DRAWER PANEL */}
              {showSettingsSidebar ? (
                <div className="w-full max-w-sm shrink-0 transition-all duration-300 transform translate-x-0">
                  <Settings
                    settings={settings}
                    onSettingsChange={(vals) => {
                      setSettings(vals);
                    }}
                    theme={settings.theme}
                    gameInProgress={status === 'RUNNING' || status === 'PAUSED'}
                  />
                </div>
              ) : null}

            </div>

            {/* VIRTUAL JOYSTICK FOR MOBILE USABILITY */}
            <div className="w-full mt-4">
              <Controls
                onDirectionChange={handleDirectionChange}
                onPauseToggle={() => {
                  audio.playClick();
                  if (status === 'RUNNING') setStatus('PAUSED');
                  else if (status === 'PAUSED') setStatus('RUNNING');
                  else if (status === 'IDLE') {
                    initGame();
                    setStatus('RUNNING');
                  }
                }}
                status={status}
                currentDirection={direction}
                theme={settings.theme}
              />
            </div>

            {/* HANDBOOK INSTRUCTION MANUAL */}
            <div className="w-full max-w-lg mt-6">
              <Instructions theme={settings.theme} />
            </div>

          </div>

        </section>

      </main>
    </div>
  );
}
