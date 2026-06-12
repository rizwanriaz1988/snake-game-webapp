/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Play, Pause } from 'lucide-react';
import { Direction, GameStatus } from '../types';

interface ControlsProps {
  onDirectionChange: (dir: Direction) => void;
  onPauseToggle: () => void;
  status: GameStatus;
  currentDirection: Direction;
  theme: 'light' | 'dark' | 'retro';
}

export default function Controls({
  onDirectionChange,
  onPauseToggle,
  status,
  currentDirection,
  theme,
}: ControlsProps) {
  // Setup styles based on theme
  const getButtonStyles = (dir: Direction) => {
    const isActive = currentDirection === dir;
    const base = 'flex justify-center items-center w-14 h-14 rounded-full border-2 transition-all duration-150 active:scale-90 shadow-md touch-none';

    if (theme === 'retro') {
      return isActive
        ? `${base} bg-green-500 border-green-400 text-black shadow-[0_0_15px_rgba(34,197,94,0.8)]`
        : `${base} bg-[#062414] border-green-700 text-green-400 active:bg-green-900/40`;
    }

    if (theme === 'dark') {
      return isActive
        ? `${base} bg-indigo-600 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.7)]`
        : `${base} bg-[#16182d] border-white/5 text-slate-300 active:bg-[#1e213a] hover:text-white`;
    }

    // Light Theme
    return isActive
      ? `${base} bg-emerald-600 border-emerald-500 text-white shadow-lg`
      : `${base} bg-white border-slate-200 text-slate-700 active:bg-slate-100`;
  };

  const getPauseButtonStyles = () => {
    const base = 'flex justify-center items-center w-12 h-12 rounded-full border-2 transition-all duration-150 active:scale-95 shadow-md';
    if (theme === 'retro') {
      return `${base} bg-[#062414] border-green-700 text-green-400 active:bg-green-900/40`;
    }
    if (theme === 'dark') {
      return `${base} bg-[#16182d] border-white/5 text-slate-300 active:bg-[#1e213a]`;
    }
    return `${base} bg-white border-slate-200 text-slate-700 active:bg-slate-100`;
  };

  // Helper trigger to avoid any scrolling delay
  const handleTouch = (dir: Direction, e: React.TouchEvent) => {
    e.preventDefault();
    onDirectionChange(dir);
  };

  const handleMouseDown = (dir: Direction, e: React.MouseEvent) => {
    e.preventDefault();
    onDirectionChange(dir);
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 select-none w-full max-w-xs mx-auto">
      <div className="flex flex-col items-center gap-1">
        
        {/* ROW 1: UP BUTTON */}
        <div>
          <button
            onMouseDown={(e) => handleMouseDown('UP', e)}
            onTouchStart={(e) => handleTouch('UP', e)}
            className={getButtonStyles('UP')}
            aria-label="Move Up"
            id="control-up"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
        </div>

        {/* ROW 2: LEFT, CENTER (PAUSE), RIGHT */}
        <div className="flex items-center gap-6">
          <button
            onMouseDown={(e) => handleMouseDown('LEFT', e)}
            onTouchStart={(e) => handleTouch('LEFT', e)}
            className={getButtonStyles('LEFT')}
            aria-label="Move Left"
            id="control-left"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* PAUSE / RESUME TRIGGER */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onPauseToggle();
            }}
            className={getPauseButtonStyles()}
            aria-label={status === 'RUNNING' ? 'Pause Game' : 'Resume Game'}
            id="control-pause"
          >
            {status === 'RUNNING' ? (
              <Pause className="w-5 h-5 animate-pulse" />
            ) : (
              <Play className="w-5 h-5 text-emerald-500" />
            )}
          </button>

          <button
            onMouseDown={(e) => handleMouseDown('RIGHT', e)}
            onTouchStart={(e) => handleTouch('RIGHT', e)}
            className={getButtonStyles('RIGHT')}
            aria-label="Move Right"
            id="control-right"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* ROW 3: DOWN BUTTON */}
        <div className="mt-1">
          <button
            onMouseDown={(e) => handleMouseDown('DOWN', e)}
            onTouchStart={(e) => handleTouch('DOWN', e)}
            className={getButtonStyles('DOWN')}
            aria-label="Move Down"
            id="control-down"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        </div>

      </div>
    </div>
  );
}
