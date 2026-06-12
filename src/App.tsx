/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, Sparkles, Trophy, RotateCcw, Play, Pause, Gamepad2, Settings as SettingsIcon } from 'lucide-react';
import { Direction, GameSettings, GameStats, GameStatus, Position, Food, FoodType, BotSnake } from './types';
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

const SPEED_OPTION_MULTIPLIERS = {
  slow: 1.5,     // 1.5x slower (larger interval)
  normal: 1.0,   // Standard
  fast: 0.7,     // 0.7x faster
  hyper: 0.45,   // Adrenaline-fueled speed!
};

export default function App() {
  // Latch initial configurations from local storage
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('snake_game_settings_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Fallback for newly added speedOption and botCount
        if (!parsed.speedOption) parsed.speedOption = 'normal';
        if (parsed.botCount === undefined) parsed.botCount = 2;
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage', e);
    }
    return {
      difficulty: 'medium',
      speedOption: 'normal',
      botCount: 2,
      soundEnabled: true,
      theme: 'dark',
      wrapAround: true,
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
  const [botSnakes, setBotSnakes] = useState<BotSnake[]>([]);
  const [status, setStatus] = useState<GameStatus>('IDLE');

  // Real-time multiplayer interaction logger
  interface GameLog {
    id: string;
    message: string;
    type: 'eat' | 'crash' | 'system' | 'player_eat';
    timestamp: string;
  }
  const [gameLogs, setGameLogs] = useState<GameLog[]>([]);

  const addGameLog = useCallback((message: string, type: 'eat' | 'crash' | 'system' | 'player_eat') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setGameLogs((prev) => [
      { id: `${Date.now()}-${Math.random()}`, message, type, timestamp },
      ...prev.slice(0, 10),
    ]);
  }, []);

  // Ref-based state synchronization buffers for the simultaneous AI physics tick engine
  const snakeRef = useRef<Position[]>([]);
  const botSnakesRef = useRef<BotSnake[]>([]);
  const foodsRef = useRef<Food[]>([]);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    botSnakesRef.current = botSnakes;
  }, [botSnakes]);

  useEffect(() => {
    foodsRef.current = foods;
  }, [foods]);

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

    // Reset battle logs
    setGameLogs([
      {
        id: 'start-log',
        message: '⚔️ Arena started! devouring other snakes makes you grow!',
        type: 'system',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      }
    ]);

    // Build fresh speed from difficulty selection and manually adjustable speedOption!
    const baseSpeed = DIFFICULTY_CONFIG[settings.difficulty].speed;
    const speedMult = SPEED_OPTION_MULTIPLIERS[settings.speedOption || 'normal'];
    const startSpeed = Math.round(baseSpeed * speedMult);

    const initialStats: GameStats = {
      score: 0,
      highScore: highScores[settings.difficulty] || 0,
      foodEaten: 0,
      level: 1,
      speed: startSpeed,
    };
    setStats(initialStats);

    // Setup initial bot/AI opponent snakes
    const defaultBotsList = [
      { id: 'bot-1', name: 'Cyber-Viper 🤖', color: '#ec4899', isAlive: true, score: 0 },
      { id: 'bot-2', name: 'Slyther-AI 👾', color: '#a855f7', isAlive: true, score: 0 },
      { id: 'bot-3', name: 'Noodle-3000 ⚡', color: '#06b6d4', isAlive: true, score: 0 },
      { id: 'bot-4', name: 'Nezha-Core 🐉', color: '#f97316', isAlive: true, score: 0 },
    ];

    const botCount = settings.botCount !== undefined ? settings.botCount : 2;
    const activeBots: BotSnake[] = [];

    for (let i = 0; i < botCount; i++) {
      const template = defaultBotsList[i % defaultBotsList.length];
      
      // Compute safe starting position in quadrants
      let startX = 2 + (i * 4);
      let startY = 3 + ((i % 2) * 5);
      
      // Avoid overlap with player snake
      if (Math.abs(startX - centerX) < 2) {
        startX = (startX + 6) % size;
      }

      activeBots.push({
        id: `${template.id}-${Date.now()}-${i}`,
        name: template.name,
        color: template.color,
        isAlive: true,
        score: 0,
        direction: i % 2 === 0 ? 'LEFT' : 'RIGHT',
        body: [
          { x: startX, y: startY },
          { x: startX, y: (startY + 1) % size },
          { x: startX, y: (startY + 2) % size },
        ],
      });
    }

    setBotSnakes(activeBots);

    // Generate starter food (multiplied if there are bots)
    const startingFoods: Food[] = [];
    const numFoods = 1 + botCount;
    let tempAllSegments = [...initialSnake];

    // Exclude bot snake spots
    activeBots.forEach((bot) => {
      tempAllSegments = [...tempAllSegments, ...bot.body];
    });

    for (let f = 0; f < numFoods; f++) {
      const foodItem = generateSingleFood(tempAllSegments, size, startingFoods);
      startingFoods.push(foodItem);
      tempAllSegments.push(foodItem.position);
    }

    setFoods(startingFoods);
  }, [settings.difficulty, settings.gridSize, settings.speedOption, settings.botCount, highScores]);

  // Initialize on mount
  useEffect(() => {
    initGame();
  }, [initGame]);

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

  // AI decision-maker for bots: avoids self, boundaries and other snakes, pathing towards nearest food
  const getNextBotDirection = (
    botHead: Position,
    currentBody: Position[],
    obstacles: Position[],
    foods: Food[],
    gridSize: number,
    wrapAround: boolean,
    currentDir: Direction
  ): Direction => {
    if (foods.length === 0) return currentDir;

    let nearestFood = foods[0].position;
    let minDist = Math.abs(botHead.x - nearestFood.x) + Math.abs(botHead.y - nearestFood.y);
    foods.forEach((f) => {
      const dist = Math.abs(botHead.x - f.position.x) + Math.abs(botHead.y - f.position.y);
      if (dist < minDist) {
        minDist = dist;
        nearestFood = f.position;
      }
    });

    const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const oppositeDir: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    const opp = oppositeDir[currentDir];

    const possibleChoices = directions.filter((d) => d !== opp);

    let bestDir = currentDir;
    let bestScore = -Infinity;

    possibleChoices.forEach((dir) => {
      let nextCell = { ...botHead };
      switch (dir) {
        case 'UP': nextCell.y -= 1; break;
        case 'DOWN': nextCell.y += 1; break;
        case 'LEFT': nextCell.x -= 1; break;
        case 'RIGHT': nextCell.x += 1; break;
      }

      // Always wrap around as game does not end when hitting the boundary!
      if (nextCell.x < 0) nextCell.x = gridSize - 1;
      else if (nextCell.x >= gridSize) nextCell.x = 0;
      if (nextCell.y < 0) nextCell.y = gridSize - 1;
      else if (nextCell.y >= gridSize) nextCell.y = 0;

      const isSelfColliding = currentBody.some((seg) => seg.x === nextCell.x && seg.y === nextCell.y);
      const isObstacleColliding = obstacles.some((seg) => seg.x === nextCell.x && seg.y === nextCell.y);

      if (isSelfColliding || isObstacleColliding) {
        return; // Crash warning
      }

      let rating = 1000;
      const newDist = Math.abs(nextCell.x - nearestFood.x) + Math.abs(nextCell.y - nearestFood.y);
      rating -= newDist * 20;

      if (dir === currentDir) {
        rating += 5;
      }

      if (rating > bestScore) {
        bestScore = rating;
        bestDir = dir;
      }
    });

    return bestDir;
  };

  const triggerGameOver = useCallback(() => {
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
  }, [settings.difficulty, highScores]);

  // Main core physics tick
  const moveSnake = useCallback(() => {
    if (status !== 'RUNNING') return;

    const size = settings.gridSize;
    const prevSnake = snakeRef.current;
    if (prevSnake.length === 0) return;

    const currentBots = botSnakesRef.current;
    let activeFoodsList = [...foodsRef.current];

    const aliveBots = currentBots.filter((b) => b.isAlive);
    const deadBotIds = new Set<string>();
    let playerDead = false;
    let playerGrowBy = 0;
    let playerScoreBonus = 0;

    // 1. Calculate proposed next player head
    const playerHead = prevSnake[0];
    let nextPlayerHead = { ...playerHead };
    switch (direction) {
      case 'UP': nextPlayerHead.y -= 1; break;
      case 'DOWN': nextPlayerHead.y += 1; break;
      case 'LEFT': nextPlayerHead.x -= 1; break;
      case 'RIGHT': nextPlayerHead.x += 1; break;
    }
    lastMovedDirectionRef.current = direction;

    // Check boundaries for player - always wrap around as game does not end when hitting the boundary!
    if (nextPlayerHead.x < 0) nextPlayerHead.x = size - 1;
    else if (nextPlayerHead.x >= size) nextPlayerHead.x = 0;
    if (nextPlayerHead.y < 0) nextPlayerHead.y = size - 1;
    else if (nextPlayerHead.y >= size) nextPlayerHead.y = 0;

    // Self body collision
    if (prevSnake.some((seg) => seg.x === nextPlayerHead.x && seg.y === nextPlayerHead.y)) {
      playerDead = true;
      addGameLog('💀 You bit your own tail!', 'crash');
    }

    // Devour or crash into rival bots
    if (!playerDead) {
      for (const bot of aliveBots) {
        // Head-to-head collision detector
        const botHead = bot.body[0];
        const hitHead = botHead && (nextPlayerHead.x === botHead.x && nextPlayerHead.y === botHead.y);

        if (hitHead) {
          if (prevSnake.length > bot.body.length) {
            // Player devours Bot head-first!
            deadBotIds.add(bot.id);
            playerScoreBonus += 50;
            playerGrowBy += 3;
            addGameLog(`⚡ You devoured ${bot.name} head-first! (+50 pts)`, 'player_eat');
            audio.playLevelUp(); // Crunch alternative sfx
          } else if (prevSnake.length < bot.body.length) {
            // Bot devours player head-first!
            playerDead = true;
            addGameLog(`💀 You were devoured head-first by the larger ${bot.name}!`, 'crash');
          } else {
            // Equal sized head-to-head collision results in double crash
            playerDead = true;
            deadBotIds.add(bot.id);
            addGameLog(`💀 Double head-collision knockout with ${bot.name}!`, 'crash');
          }
        }
      }
    }

    if (playerDead) {
      triggerGameOver();
      return;
    }

    // Check player eating food
    let playerAteFoodIndex = activeFoodsList.findIndex(
      (f) => f.position.x === nextPlayerHead.x && f.position.y === nextPlayerHead.y
    );

    const updatedPlayerSnake = [nextPlayerHead, ...prevSnake];

    if (playerAteFoodIndex !== -1) {
      const eatenFood = activeFoodsList[playerAteFoodIndex];
      audio.playEat(eatenFood.type);
      activeFoodsList = activeFoodsList.filter((_, idx) => idx !== playerAteFoodIndex);

      // Regenerate replacement food for the player snake eating!
      let compoundBodies = [...updatedPlayerSnake];
      currentBots.forEach((b) => {
        if (b.isAlive && !deadBotIds.has(b.id)) {
          compoundBodies = [...compoundBodies, ...b.body];
        }
      });
      const brandNewFood = generateSingleFood(compoundBodies, size, activeFoodsList);
      activeFoodsList = [...activeFoodsList, brandNewFood];

      // Rare extra chance to spawn a secondary sparkling bonus food when list remains small
      if (Math.random() < 0.12 && activeFoodsList.length <= 1) {
        const bonusFood = generateSingleFood(compoundBodies, size, activeFoodsList);
        activeFoodsList = [...activeFoodsList, bonusFood];
      }

      // Score player from food and any bot devours
      setStats((prev) => {
        const addedScore = eatenFood.points + playerScoreBonus;
        const nextScore = prev.score + addedScore;
        const updatedFoodCount = prev.foodEaten + 1;

        let currentLevel = prev.level;
        let currentSpeed = prev.speed;
        const config = DIFFICULTY_CONFIG[settings.difficulty];

        if (updatedFoodCount % 3 === 0) {
          currentLevel += 1;
          currentSpeed = Math.max(currentSpeed - config.decrement, config.minSpeed);
          audio.playLevelUp();
        }

        if (eatenFood.type === 'SPEED_BOOST') {
          currentSpeed = Math.max(currentSpeed - 8, config.minSpeed);
        }

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
    } else {
      updatedPlayerSnake.pop();

      // If we didn't eat normal food, but ate a bot, update player score stats!
      if (playerScoreBonus > 0) {
        setStats((prev) => {
          const nextScore = prev.score + playerScoreBonus;
          let targetHighScore = prev.highScore;
          if (nextScore > prev.highScore) {
            targetHighScore = nextScore;
          }
          return {
            ...prev,
            score: nextScore,
            highScore: targetHighScore,
          };
        });
      }
    }

    // Apply immediate expansion segments to player body if they devoured a bot
    for (let grow = 0; grow < playerGrowBy; grow++) {
      const lastSeg = updatedPlayerSnake[updatedPlayerSnake.length - 1] || nextPlayerHead;
      updatedPlayerSnake.push({ ...lastSeg });
    }

    // 2. Process AI Bot Snake moves
    const nextBots = currentBots.map((bot) => {
      // If dead or eaten during this turn, prepare to be respawned (reproduced)
      if (!bot.isAlive || deadBotIds.has(bot.id) || bot.body.length === 0) {
        return { ...bot, isAlive: false };
      }

      const botHead = bot.body[0];
      const botLength = bot.body.length;
      
      // Define lethal obstacles for the bot: only heads of rival snakes which are equal length or larger than this bot
      const lethalObstacles: Position[] = [];

      // Check player head
      const playerHeadSeg = updatedPlayerSnake[0];
      if (playerHeadSeg && updatedPlayerSnake.length >= botLength) {
        lethalObstacles.push(playerHeadSeg);
      }

      // Check other rival bot heads
      currentBots.forEach((b) => {
        if (b.id !== bot.id && b.isAlive && !deadBotIds.has(b.id)) {
          const otherHead = b.body[0];
          if (otherHead && b.body.length >= botLength) {
            lethalObstacles.push(otherHead);
          }
        }
      });

      const nextDir = getNextBotDirection(
        botHead,
        bot.body,
        lethalObstacles,
        activeFoodsList,
        size,
        settings.wrapAround,
        bot.direction
      );

      let nextBotHead = { ...botHead };
      switch (nextDir) {
        case 'UP': nextBotHead.y -= 1; break;
        case 'DOWN': nextBotHead.y += 1; break;
        case 'LEFT': nextBotHead.x -= 1; break;
        case 'RIGHT': nextBotHead.x += 1; break;
      }

      // Wrapping checks
      let botCrashed = false;
      let botScore = bot.score;
      let botGrowBy = 0;

      // Wrapping checks - always wrap around
      if (nextBotHead.x < 0) nextBotHead.x = size - 1;
      else if (nextBotHead.x >= size) nextBotHead.x = 0;
      if (nextBotHead.y < 0) nextBotHead.y = size - 1;
      else if (nextBotHead.y >= size) nextBotHead.y = 0;

      // Check head-first conditions with player
      const hitPlayerHead = playerHeadSeg && (nextBotHead.x === playerHeadSeg.x && nextBotHead.y === playerHeadSeg.y);

      let hitSelf = bot.body.some((seg) => seg.x === nextBotHead.x && seg.y === nextBotHead.y);
      let hitRivalBotName = '';
      let hitRivalIsSmaller = false;
      let devouredRivalId: string | null = null;

      // Check other rival bots
      for (const other of currentBots) {
        if (other.id !== bot.id && other.isAlive && !deadBotIds.has(other.id)) {
          const otherHeadSeg = other.body[0];
          const hitOtherHead = otherHeadSeg && (nextBotHead.x === otherHeadSeg.x && nextBotHead.y === otherHeadSeg.y);

          if (hitOtherHead) {
            if (bot.body.length > other.body.length) {
              devouredRivalId = other.id;
              hitRivalIsSmaller = true;
            } else if (bot.body.length < other.body.length) {
              botCrashed = true;
            } else {
              // Equal length: double head-first knockout
              botCrashed = true;
              devouredRivalId = other.id;
              hitRivalIsSmaller = false;
            }
            hitRivalBotName = other.name;
            break;
          }
        }
      }

      if (hitSelf) {
        botCrashed = true;
      }

      if (hitPlayerHead) {
        if (bot.body.length > updatedPlayerSnake.length) {
          playerDead = true;
          botScore += 50;
          botGrowBy += 3;
        } else if (bot.body.length < updatedPlayerSnake.length) {
          botCrashed = true; // Bot gets swallowed head-first
        } else {
          // Equal: double knockout
          playerDead = true;
          botCrashed = true;
        }
      }

      if (botCrashed) {
        deadBotIds.add(bot.id);
        if (devouredRivalId && !hitRivalIsSmaller) {
          // If equal-sized head-on collision, also kill the rival!
          deadBotIds.add(devouredRivalId);
          addGameLog(`⚔️ Mutual head-first crash between ${bot.name} and ${hitRivalBotName}!`, 'crash');
        }
        return {
          ...bot,
          isAlive: false,
        };
      }

      // Handle devouring rival bot
      if (devouredRivalId && hitRivalIsSmaller) {
        deadBotIds.add(devouredRivalId);
        botScore += 50;
        botGrowBy = 3;
        addGameLog(`🔥 ${bot.name} devoured ${hitRivalBotName} head-first! (+50 pts)`, 'eat');
      }

      const botAteFoodIndex = activeFoodsList.findIndex(
        (f) => f.position.x === nextBotHead.x && f.position.y === nextBotHead.y
      );

      const updatedBotBody = [nextBotHead, ...bot.body];

      if (botAteFoodIndex !== -1) {
        const eatenFood = activeFoodsList[botAteFoodIndex];
        botScore += eatenFood.points;

        // Remove and replenish food
        activeFoodsList = activeFoodsList.filter((_, idx) => idx !== botAteFoodIndex);

        let compoundBodies = [...updatedPlayerSnake, ...updatedBotBody];
        currentBots.forEach((b) => {
          if (b.id !== bot.id && b.isAlive && !deadBotIds.has(b.id)) {
            compoundBodies = [...compoundBodies, ...b.body];
          }
        });

        const brandNewFood = generateSingleFood(compoundBodies, size, activeFoodsList);
        activeFoodsList = [...activeFoodsList, brandNewFood];
      } else {
        updatedBotBody.pop();
      }

      // Apply growth
      for (let bg = 0; bg < botGrowBy; bg++) {
        const lastSeg = updatedBotBody[updatedBotBody.length - 1] || nextBotHead;
        updatedBotBody.push({ ...lastSeg });
      }

      return {
        ...bot,
        body: updatedBotBody,
        direction: nextDir,
        score: botScore,
      };
    });

    if (playerDead) {
      addGameLog('💀 Devoured head-first by a larger rival snake!', 'crash');
      triggerGameOver();
      return;
    }

    // Reproduce (respawn/re-create) any dead/eaten rival bot snakes!
    let compositeObstaclesForSpawning = [...updatedPlayerSnake];
    activeFoodsList.forEach((food) => {
      compositeObstaclesForSpawning.push(food.position);
    });

    const getSafeBotSpawn = (
      allObstacles: Position[],
      gridSize: number
    ): Position[] => {
      let tries = 0;
      while (tries < 100) {
        tries++;
        const rx = Math.floor(Math.random() * (gridSize - 4)) + 2;
        const ry = Math.floor(Math.random() * (gridSize - 4)) + 2;
        const orientation = Math.random() > 0.5 ? 'H' : 'V';
        const proposed: Position[] = [];
        
        for (let segment = 0; segment < 3; segment++) {
          if (orientation === 'H') {
            proposed.push({
              x: (rx + segment) % gridSize,
              y: ry
            });
          } else {
            proposed.push({
              x: rx,
              y: (ry + segment) % gridSize
            });
          }
        }
        
        const collides = proposed.some((pbody) => 
          allObstacles.some((obs) => obs.x === pbody.x && obs.y === pbody.y)
        );
        
        if (!collides) {
          return proposed;
        }
      }
      
      const fallbackY = Math.floor(Math.random() * (gridSize - 4)) + 2;
      return [
        { x: 2, y: fallbackY },
        { x: 3, y: fallbackY },
        { x: 4, y: fallbackY },
      ];
    };

    const finalBots = nextBots.map((b) => {
      const isDeadNow = !b.isAlive || deadBotIds.has(b.id);
      
      if (isDeadNow) {
        const spawnBody = getSafeBotSpawn(compositeObstaclesForSpawning, size);
        // Track the respawn coordinates as obstacle for any subsequent bot respawn on this tick
        compositeObstaclesForSpawning = [...compositeObstaclesForSpawning, ...spawnBody];

        addGameLog(`🌀 ${b.name} regenerated & re-entered the arena!`, 'system');

        return {
          ...b,
          isAlive: true,
          score: 0,
          direction: Math.random() > 0.5 ? 'LEFT' : 'RIGHT' as Direction,
          body: spawnBody
        };
      }
      
      compositeObstaclesForSpawning = [...compositeObstaclesForSpawning, ...b.body];
      return b;
    });

    // Write all calculated states together!
    setSnake(updatedPlayerSnake);
    setBotSnakes(finalBots);
    setFoods(activeFoodsList);

  }, [direction, settings, status, triggerGameOver, addGameLog]);

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
            
            <div className="w-full flex flex-col xl:flex-row gap-6 justify-center items-stretch items-center">
              
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
                    botSnakes={botSnakes}
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
                        You collided with a boundary, rival bot, or bit your own tail.
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

              {/* STUNNING REAL-TIME MULTIPLAYER LEADERBOARD */}
              <div className={`w-full max-w-sm shrink-0 p-5 rounded-2xl border transition-all duration-300 ${cardBg} flex flex-col justify-between`}>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#00e1d9] mb-4 flex items-center gap-2 border-b pb-2.5 border-white/5">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    Rivalry Arena Leaderboard
                  </h3>
                  
                  <div className="space-y-2.5">
                    {/* Player item */}
                    <div className={`p-2.5 rounded-xl flex items-center justify-between border transition-all duration-300 ${
                      stats.score >= Math.max(...botSnakes.map((b) => b.isAlive ? b.score : 0), 0)
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                        : 'bg-white/5 border-transparent text-slate-300'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span className="text-xs font-bold font-sans">You (Player)</span>
                        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase font-black tracking-wider">
                          Live
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm tracking-wide text-emerald-400">{stats.score}</span>
                    </div>

                    {/* Bots items, sorted by current score */}
                    {botSnakes.length === 0 ? (
                      <div className="text-[10px] text-slate-500 italic text-center py-4">
                        No rival bots active. Add bots using the settings drawer!
                      </div>
                    ) : (
                      [...botSnakes]
                        .sort((a, b) => b.score - a.score)
                        .map((bot) => (
                          <div
                            key={bot.id}
                            className={`p-2.5 rounded-xl flex items-center justify-between border transition-all duration-300 ${
                              !bot.isAlive
                                ? 'opacity-45 border-dashed border-slate-800 bg-black/20 text-slate-500'
                                : 'bg-[#101224]/50 border-white/5 hover:border-white/10 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition-transform duration-300 hover:scale-110"
                                style={{ backgroundColor: bot.color }}
                              />
                              <span className={`text-xs font-semibold ${!bot.isAlive ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                {bot.name}
                              </span>
                              {!bot.isAlive && (
                                <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded uppercase font-black tracking-wider">
                                  Crashed
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-xs font-semibold text-slate-400">{bot.score}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* REAL-TIME BATTLE FEED EVENTS LOG */}
                <div className="mt-5 pt-4 border-t border-white/5">
                  <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#00e1d9] mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    Live Arena Activity Feed
                  </h4>
                  
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 select-none font-sans scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                    {gameLogs.length === 0 ? (
                      <div className="text-[9px] text-slate-600 italic py-2 text-center">No arena activities yet. Engage thrusters!</div>
                    ) : (
                      gameLogs.map((log) => {
                        let badgeStyle = 'text-slate-400 bg-white/5';
                        if (log.type === 'player_eat') badgeStyle = 'text-emerald-400 bg-emerald-500/10 font-bold border border-emerald-500/10';
                        else if (log.type === 'eat') badgeStyle = 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/10';
                        else if (log.type === 'crash') badgeStyle = 'text-rose-400 bg-rose-500/10 border border-rose-500/10';
                        else if (log.type === 'system') badgeStyle = 'text-cyan-400 bg-cyan-500/10 font-semibold border border-cyan-500/10';

                        return (
                          <div
                            key={log.id}
                            className="text-[9px] leading-relaxed flex items-start gap-1.5 p-1 rounded-md border border-white/[0.02] bg-[#101224]/30"
                          >
                            <span className="text-[8px] text-slate-500 font-mono mt-0.5 shrink-0">
                              {log.timestamp.split(':').slice(1).join(':')}
                            </span>
                            <span className={`text-[8px] px-1 py-[0.5px] rounded scale-90 shrink-0 capitalize ${badgeStyle}`}>
                              {log.type === 'player_eat' ? 'Devour' : log.type}
                            </span>
                            <span className="text-slate-300 font-medium">{log.message}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-white/5 text-[10px] text-slate-500 flex justify-between items-center">
                  <span>Match details:</span>
                  <span className="uppercase text-slate-300 font-extrabold font-mono tracking-wide">
                    Speed: {settings.speedOption ?? 'Normal'} / {settings.difficulty}
                  </span>
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
