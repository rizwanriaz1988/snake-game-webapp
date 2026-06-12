/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type SpeedOption = 'slow' | 'normal' | 'fast' | 'hyper';

export interface GameSettings {
  difficulty: Difficulty;
  speedOption: SpeedOption;
  botCount: number; // Number of AI competitor snakes, default is 2
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'retro';
  wrapAround: boolean;
  gridSize: number; // 20 for standard, etc.
}

export interface GameStats {
  score: number;
  highScore: number;
  foodEaten: number;
  level: number;
  speed: number; // Actual current speed in ms
}

export type GameStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'GAME_OVER';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  decay: number;
}

export type FoodType = 'NORMAL' | 'GOLDEN' | 'SPEED_BOOST';

export interface Food {
  position: Position;
  type: FoodType;
  color: string;
  points: number;
  pulseTimer: number; // For animation effects
}

export interface BotSnake {
  id: string;
  name: string;
  body: Position[];
  direction: Direction;
  color: string;
  isAlive: boolean;
  score: number;
  pulse?: number;
}

