/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HelpCircle, Keyboard, Cpu, Sparkles } from 'lucide-react';

interface InstructionsProps {
  theme: 'light' | 'dark' | 'retro';
}

export default function Instructions({ theme }: InstructionsProps) {
  const textColor = theme === 'retro' ? 'text-green-400' : 'text-slate-800 dark:text-slate-100';
  const labelColor = theme === 'retro' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400';
  const itemBorder = theme === 'retro' ? 'border-green-900 bg-[#05180f]' : theme === 'dark' ? 'border-white/5 bg-[#1e213a]/50' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40';

  return (
    <div className={`p-5 rounded-2xl border-2 transition-all duration-300 w-full ${
      theme === 'retro'
        ? 'bg-[#05180f] border-green-800'
        : theme === 'dark'
        ? 'bg-[#16182d] border-white/5'
        : 'bg-white border-slate-200 shadow-md'
    }`}>
      <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${textColor}`}>
        <HelpCircle className="w-4 h-4 text-emerald-500" />
        Handbook & Codex
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* INSTRUCTIONS COL 1 */}
        <div className={`flex flex-col gap-3 p-3.5 rounded-xl border ${itemBorder}`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
            <Keyboard className="w-3.5 h-3.5" />
            Navigation Bindings
          </h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className={labelColor}>Navigate Board</span>
              <span className="font-mono bg-slate-200 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                ↑↓←→  /  WASD
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={labelColor}>Pause / Resume</span>
              <span className="font-mono bg-slate-200 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                SPACEBAR
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={labelColor}>Reset / Play Again</span>
              <span className="font-mono bg-slate-200 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                ENTER
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={labelColor}>Touch Gesture</span>
              <span className="text-[11px] text-right text-slate-500 dark:text-slate-400">
                Swipe up, down, left, right anywhere on board.
              </span>
            </div>
          </div>
        </div>

        {/* INSTRUCTIONS COL 2 */}
        <div className={`flex flex-col gap-3 p-3.5 rounded-xl border ${itemBorder}`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-400' : 'text-slate-700 dark:text-slate-200'}`}>
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            Consumable Elements
          </h4>

          <div className="space-y-2.5 text-xs">
            {/* RED APPLE */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-400 shrink-0" />
              <div className="flex flex-col">
                <span className={`font-semibold ${textColor}`}>Standard Apple</span>
                <span className="text-[10px] text-slate-400">Gives +10 pts. Normal speed increments.</span>
              </div>
            </div>

            {/* GOLDEN CHIME */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rotate-45 bg-amber-400 shrink-0 ring-2 ring-yellow-300" />
              <div className="flex flex-col">
                <span className={`font-semibold text-yellow-500`}>Golden Apple</span>
                <span className="text-[10px] text-slate-400">Rare trigger! Gives +30 pts + full score celebration sound.</span>
              </div>
            </div>

            {/* LIGHTNING potions */}
            <div className="flex items-center gap-2 items-start">
              <div className="w-3 h-3 rounded bg-blue-500 hover:scale-110 shrink-0 ring-2 ring-cyan-400" />
              <div className="flex flex-col">
                <span className={`font-semibold text-cyan-400`}>Neon Potion</span>
                <span className="text-[10px] text-slate-400">Gives +20 pts + increases current speed briefly!</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER TIP */}
      <p className="text-[10px] text-slate-400 mt-4 text-center">
        💡 <strong className={textColor}>Pro-Tip:</strong> The game automatically prevents double inputs within a single game tick to keep you from running straight into your own neck!
      </p>

    </div>
  );
}
