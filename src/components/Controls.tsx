/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Gamepad2,
  Disc,
  Fingerprint,
} from 'lucide-react';
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
  // Mobile Controller Mode Selection
  const [controlMode, setControlMode] = useState<'dpad' | 'joystick' | 'swipe'>('joystick');

  // Interactive Joystick States & Refs
  const joystickRef = useRef<HTMLDivElement>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<Direction | null>(null);

  // Swipe Pad States & Refs
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number } | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  // 1. D-PAD BUTTON STYLING BY THEME
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

  // Prevent scroll during control interactions Helper
  const handleTouchDpad = (dir: Direction, e: React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    onDirectionChange(dir);
  };

  const handleMouseDownDpad = (dir: Direction, e: React.MouseEvent) => {
    e.preventDefault();
    onDirectionChange(dir);
  };

  // 2. INTERACTIVE JOYSTICK LOGIC
  const startDrag = (clientX: number, clientY: number, e: React.SyntheticEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    setIsDragging(true);
    handleJoystickDrag(clientX, clientY);
  };

  const handleJoystickDrag = (clientX: number, clientY: number) => {
    const container = joystickRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const maxRadius = 42; // Maximum boundaries of joystick travel

    let knobX = dx;
    let knobY = dy;

    if (distance > maxRadius) {
      knobX = (dx / distance) * maxRadius;
      knobY = (dy / distance) * maxRadius;
    }

    setKnobOffset({ x: knobX, y: knobY });

    // Threshold deadzone of 14px to prevent shaky/uncertain movements
    if (distance > 14) {
      let detectedDir: Direction;
      if (Math.abs(knobX) > Math.abs(knobY)) {
        detectedDir = knobX > 0 ? 'RIGHT' : 'LEFT';
      } else {
        detectedDir = knobY > 0 ? 'DOWN' : 'UP';
      }
      setActiveHighlight(detectedDir);
      onDirectionChange(detectedDir);
    } else {
      setActiveHighlight(null);
    }
  };

  const endDrag = () => {
    setIsDragging(false);
    setKnobOffset({ x: 0, y: 0 });
    setActiveHighlight(null);
  };

  // Dynamic window listeners bound carefully for continuous outside dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleJoystickDrag(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (e.touches.length > 0) {
        handleJoystickDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseUp = () => {
      endDrag();
    };

    const handleTouchEnd = () => {
      endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);


  // 3. SWIPE GESTURE CONTROLLER LOGIC
  const startSwipe = (clientX: number, clientY: number, e: React.SyntheticEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    setSwipeStart({ x: clientX, y: clientY });
    setIsSwiping(true);
  };

  const handleSwipeMove = (clientX: number, clientY: number) => {
    if (!swipeStart) return;

    const dx = clientX - swipeStart.x;
    const dy = clientY - swipeStart.y;
    const distance = Math.hypot(dx, dy);
    const triggerThreshold = 32; // In px

    if (distance > triggerThreshold) {
      let swipeDir: Direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        swipeDir = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        swipeDir = dy > 0 ? 'DOWN' : 'UP';
      }
      onDirectionChange(swipeDir);
      // Reset starting anchor point to current so continuous sweeping sweeps cleanly!
      setSwipeStart({ x: clientX, y: clientY });
    }
  };

  const endSwipe = () => {
    setIsSwiping(false);
    setSwipeStart(null);
  };

  useEffect(() => {
    if (!isSwiping) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleSwipeMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      if (e.touches.length > 0) {
        handleSwipeMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseUp = () => {
      endSwipe();
    };

    const handleTouchEnd = () => {
      endSwipe();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSwiping, swipeStart]);


  // THEMED COLOR RESOLVERS FOR THE DYNAMIC CONTROLLERS
  const getJoystickThemeLayout = () => {
    if (theme === 'retro') {
      return {
        outerCircle: 'bg-[#030f08] border-green-600 shadow-[inset_0_0_10px_rgba(0,255,100,0.15)]',
        innerKnob: 'bg-gradient-to-tr from-red-800 via-red-500 to-red-400 border border-red-950 shadow-[0_4px_10px_rgba(239,68,68,0.6)] cursor-grab active:cursor-grabbing',
        compassArrows: {
          UP: activeHighlight === 'UP' ? 'text-green-300 scale-125 font-bold shadow-[0_0_8px_#10b981]' : 'text-green-800',
          DOWN: activeHighlight === 'DOWN' ? 'text-green-300 scale-125 font-bold shadow-[0_0_8px_#10b981]' : 'text-green-800',
          LEFT: activeHighlight === 'LEFT' ? 'text-green-300 scale-125 font-bold shadow-[0_0_8px_#10b981]' : 'text-green-800',
          RIGHT: activeHighlight === 'RIGHT' ? 'text-green-300 scale-125 font-bold shadow-[0_0_8px_#10b981]' : 'text-green-800',
        }
      };
    }

    if (theme === 'dark') {
      return {
        outerCircle: 'bg-[#121426]/80 border-indigo-500/30 backdrop-blur-sm shadow-[inset_0_2px_15px_rgba(99,102,241,0.06)]',
        innerKnob: 'bg-gradient-to-tr from-indigo-700 via-indigo-500 to-indigo-400 border border-indigo-300/20 shadow-[0_4px_16px_rgba(99,102,241,0.5)] cursor-grab active:cursor-grabbing',
        compassArrows: {
          UP: activeHighlight === 'UP' ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'text-slate-600',
          DOWN: activeHighlight === 'DOWN' ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'text-slate-600',
          LEFT: activeHighlight === 'LEFT' ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'text-slate-600',
          RIGHT: activeHighlight === 'RIGHT' ? 'text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'text-slate-600',
        }
      };
    }

    // Light Theme Colors
    return {
      outerCircle: 'bg-slate-50 border-slate-200 shadow-[inset_0_2px_8px_rgba(0,0,0,0.03)]',
      innerKnob: 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-emerald-400 border border-emerald-300/30 shadow-[0_4px_12px_rgba(16,185,129,0.4)] cursor-grab active:cursor-grabbing',
      compassArrows: {
        UP: activeHighlight === 'UP' ? 'text-emerald-500 font-extrabold translate-y-[-2px]' : 'text-slate-350',
        DOWN: activeHighlight === 'DOWN' ? 'text-emerald-500 font-extrabold translate-y-[2px]' : 'text-slate-350',
        LEFT: activeHighlight === 'LEFT' ? 'text-emerald-500 font-extrabold translate-x-[-2px]' : 'text-slate-350',
        RIGHT: activeHighlight === 'RIGHT' ? 'text-emerald-500 font-extrabold translate-x-[2px]' : 'text-slate-350',
      }
    };
  };

  const getSwipeThemeLayout = () => {
    if (theme === 'retro') {
      return 'bg-[#030f08] border border-green-700 shadow-inner text-green-400/80';
    }
    if (theme === 'dark') {
      return 'bg-[#121426]/70 border border-white/5 shadow-inner text-slate-400';
    }
    return 'bg-slate-50 border border-slate-200 shadow-inner text-slate-500';
  };

  const joyColors = getJoystickThemeLayout();

  return (
    <div className="flex flex-col items-center justify-center py-2 select-none w-full max-w-sm mx-auto font-sans">
      
      {/* 🚀 MODE CONTROLLER SELECTION PILLS */}
      <div className="flex bg-[#0f111e]/10 dark:bg-slate-900/60 p-1 rounded-2xl mb-5 text-[10px] w-[270px] border border-slate-250 dark:border-white/5 select-none font-semibold">
        <button
          onClick={() => setControlMode('dpad')}
          className={`flex-1 py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all outline-none duration-150 ${controlMode === 'dpad' ? 'bg-white dark:bg-[#1a1c2e] shadow-md shadow-[#2e3256]/5 dark:shadow-none text-indigo-500 dark:text-[#00e1d9] font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
          id="btn-mode-dpad"
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          Tactile D-Pad
        </button>
        <button
          onClick={() => setControlMode('joystick')}
          className={`flex-1 py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all outline-none duration-150 ${controlMode === 'joystick' ? 'bg-white dark:bg-[#1a1c2e] shadow-md shadow-[#2e3256]/5 dark:shadow-none text-indigo-500 dark:text-[#00e1d9] font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
          id="btn-mode-joystick"
        >
          <Disc className="w-3.5 h-3.5" />
          360° Joystick
        </button>
        <button
          onClick={() => setControlMode('swipe')}
          className={`flex-1 py-1.5 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all outline-none duration-150 ${controlMode === 'swipe' ? 'bg-white dark:bg-[#1a1c2e] shadow-md shadow-[#2e3256]/5 dark:shadow-none text-indigo-500 dark:text-[#00e1d9] font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
          id="btn-mode-swipe"
        >
          <Fingerprint className="w-3.5 h-3.5" />
          Swipe Board
        </button>
      </div>

      {/* RENDER DYNAMIC ACTIVE CONTROLLER PANEL */}
      <div className="flex items-center justify-center w-full min-h-[160px] relative">
        
        {/* LAYOUT A: TACTILE BUTTONS D-PAD */}
        {controlMode === 'dpad' && (
          <div className="flex flex-col items-center gap-1 animate-fadeIn">
            {/* ROW 1: UP BUTTON */}
            <div>
              <button
                onMouseDown={(e) => handleMouseDownDpad('UP', e)}
                onTouchStart={(e) => handleTouchDpad('UP', e)}
                className={getButtonStyles('UP')}
                aria-label="Move Up"
                id="control-up"
              >
                <ArrowUp className="w-6 h-6" />
              </button>
            </div>

            {/* ROW 2: LEFT, CENTER (PAUSE/PLAY), RIGHT */}
            <div className="flex items-center gap-6">
              <button
                onMouseDown={(e) => handleMouseDownDpad('LEFT', e)}
                onTouchStart={(e) => handleTouchDpad('LEFT', e)}
                className={getButtonStyles('LEFT')}
                aria-label="Move Left"
                id="control-left"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              {/* CENTER PAUSE CONTROLLER */}
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
                  <Play className="w-5 h-5 text-emerald-500 dark:text-cyan-400" />
                )}
              </button>

              <button
                onMouseDown={(e) => handleMouseDownDpad('RIGHT', e)}
                onTouchStart={(e) => handleTouchDpad('RIGHT', e)}
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
                onMouseDown={(e) => handleMouseDownDpad('DOWN', e)}
                onTouchStart={(e) => handleTouchDpad('DOWN', e)}
                className={getButtonStyles('DOWN')}
                aria-label="Move Down"
                id="control-down"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* LAYOUT B: HIGH-FIDELITY INTERACTIVE ANALOG JOYSTICK */}
        {controlMode === 'joystick' && (
          <div className="flex items-center gap-8 animate-fadeIn">
            <div
              ref={joystickRef}
              className={`relative w-36 h-36 rounded-full border-2 transition-all flex items-center justify-center ${joyColors.outerCircle}`}
              onMouseDown={(e) => startDrag(e.clientX, e.clientY, e)}
              onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY, e)}
              style={{ touchAction: 'none' }}
              id="analog-joystick-frame"
            >
              {/* Perimeter Compass Arrow Coordinates */}
              <div className="absolute top-2 flex flex-col items-center">
                <span className={`text-[9px] font-extrabold uppercase tracking-widest leading-none ${joyColors.compassArrows.UP}`}>
                  {theme === 'retro' ? '▲' : 'UP'}
                </span>
              </div>
              <div className="absolute bottom-2 flex flex-col items-center">
                <span className={`text-[9px] font-extrabold uppercase tracking-widest leading-none ${joyColors.compassArrows.DOWN}`}>
                  {theme === 'retro' ? '▼' : 'DOWN'}
                </span>
              </div>
              <div className="absolute left-2 flex items-center">
                <span className={`text-[9px] font-extrabold uppercase tracking-widest leading-none ${joyColors.compassArrows.LEFT}`}>
                  {theme === 'retro' ? '◀' : 'LEFT'}
                </span>
              </div>
              <div className="absolute right-2 flex items-center">
                <span className={`text-[9px] font-extrabold uppercase tracking-widest leading-none ${joyColors.compassArrows.RIGHT}`}>
                  {theme === 'retro' ? '▶' : 'RIGHT'}
                </span>
              </div>

              {/* Inner Concentric Circle Target Grid Lines */}
              <div className="absolute w-20 h-20 rounded-full border border-dashed border-slate-500/10 pointer-events-none" />
              <div className="absolute w-8 h-8 rounded-full border border-slate-500/10 pointer-events-none" />

              {/* DRAGGABLE ANALOG STICK THUMB KNOB */}
              <div
                className={`absolute w-12 h-12 rounded-full flex items-center justify-center select-none ${joyColors.innerKnob}`}
                style={{
                  transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
                  transition: isDragging ? 'none' : 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                  touchAction: 'none',
                }}
                id="analog-joystick-puck"
              >
                {/* Visual Accent Center Dot representing finger placement */}
                <div className="w-3.5 h-3.5 rounded-full bg-white/30 border border-white/50 animate-pulse" />
              </div>
            </div>

            {/* FLOATING ACTION SIDEPLAY CONTROL FOR EASE OF USE */}
            <div className="flex flex-col gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onPauseToggle();
                }}
                className={getPauseButtonStyles()}
                aria-label="Pause Actions"
                id="control-joy-pause"
              >
                {status === 'RUNNING' ? (
                  <Pause className="w-5 h-5 animate-pulse" />
                ) : (
                  <Play className="w-5 h-5 text-emerald-500 dark:text-cyan-400" />
                )}
              </button>
              <div className="text-[8px] uppercase tracking-wider text-slate-500 text-center font-bold">
                {status === 'RUNNING' ? 'Pause' : 'Play'}
              </div>
            </div>
          </div>
        )}

        {/* LAYOUT C: UNLIMITED CONTINUOUS ROTATIONAL SWIPEPAD */}
        {controlMode === 'swipe' && (
          <div className="flex items-center gap-6 w-full max-w-[320px] animate-fadeIn">
            <div
              className={`flex-1 h-36 rounded-2xl flex flex-col items-center justify-center cursor-all-scroll select-none p-4 text-center ${getSwipeThemeLayout()}`}
              onMouseDown={(e) => startSwipe(e.clientX, e.clientY, e)}
              onTouchStart={(e) => startSwipe(e.touches[0].clientX, e.touches[0].clientY, e)}
              style={{ touchAction: 'none' }}
              id="swipeboard-pad"
            >
              <Fingerprint className={`w-10 h-10 mb-2 transition-transform duration-200 ${isSwiping ? 'scale-110 text-emerald-400 dark:text-cyan-400 animate-pulse' : 'text-slate-500/80'}`} />
              <p className="text-[10px] font-bold leading-normal uppercase tracking-wider">
                {isSwiping ? 'Tracking Swipe drag...' : 'Swipe drag steering'}
              </p>
              <p className="text-[8px] text-slate-500 mt-1 leading-relaxed">
                Slide your finger continuously anywhere in this tile to turn.
              </p>
            </div>

            {/* QUICK SEAMLESS PAUSE KEYBOARD */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onPauseToggle();
                }}
                className={getPauseButtonStyles()}
                aria-label="Pause Actions"
                id="control-swipe-pause"
              >
                {status === 'RUNNING' ? (
                  <Pause className="w-5 h-5 animate-pulse" />
                ) : (
                  <Play className="w-5 h-5 text-emerald-500 dark:text-cyan-400" />
                )}
              </button>
              <div className="text-[8px] uppercase tracking-widest text-slate-500 text-center font-extrabold text-xs">
                {status === 'RUNNING' ? 'Pause' : 'Play'}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
