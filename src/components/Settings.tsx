/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, Volume2, VolumeX, Grid, Layout, RefreshCw, Zap, Gauge, Users } from 'lucide-react';
import { GameSettings, Difficulty, SpeedOption } from '../types';

interface SettingsProps {
  settings: GameSettings;
  onSettingsChange: (settings: GameSettings) => void;
  theme: 'light' | 'dark' | 'retro';
  gameInProgress: boolean;
}

export default function Settings({
  settings,
  onSettingsChange,
  theme,
  gameInProgress,
}: SettingsProps) {
  
  const updateSetting = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  // Styles based on theme
  const panelBg =
    theme === 'retro'
      ? 'bg-[#05180f] border-green-800'
      : theme === 'dark'
      ? 'bg-[#16182d] border-white/5'
      : 'bg-white border-slate-200';

  const sectionDivider = theme === 'retro' ? 'border-green-900' : 'border-slate-800/10 dark:border-white/5';

  const getButtonClass = (isActive: boolean) => {
    if (theme === 'retro') {
      return isActive
        ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500 text-black shadow-[0_0_8px_rgba(34,197,94,0.6)] cursor-pointer'
        : 'px-3 py-1.5 text-xs rounded-lg bg-[#0c2e1b] border border-green-800 text-green-400 hover:bg-[#123d24] cursor-pointer';
    }
    if (theme === 'dark') {
      return isActive
        ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white shadow-[0_0_12px_rgba(99,102,241,0.55)] border border-indigo-400 cursor-pointer'
        : 'px-3 py-1.5 text-xs rounded-lg bg-[#1e213a] border border-white/5 text-slate-300 hover:bg-[#252844] hover:text-white cursor-pointer';
    }
    return isActive
      ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white shadow-sm cursor-pointer'
      : 'px-3 py-1.5 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-transparent cursor-pointer';
  };

  return (
    <div className={`p-5 rounded-2xl border-2 shadow-lg ${panelBg} transition-all duration-300 w-full`}>
      <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${theme === 'retro' ? 'text-green-400' : 'text-slate-800 dark:text-slate-100'}`}>
        <Zap className="w-4 h-4 text-amber-500" />
        Game Configurator
      </h3>

      {gameInProgress && (
        <p className="text-xs text-amber-500 mb-4 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg leading-relaxed">
          🔒 Difficulty, Wrap-Around, and Grid size config are locked during a live session. End/Restart game to adjust.
        </p>
      )}

      <div className="space-y-4">
        
        {/* DIFFICULTY SELECTOR */}
        <div className="flex flex-col gap-2">
          <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            Difficulty Mode
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
              <button
                key={diff}
                disabled={gameInProgress}
                onClick={() => updateSetting('difficulty', diff)}
                className={getButtonClass(settings.difficulty === diff)}
                id={`setting-diff-${diff}`}
              >
                {diff.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            {settings.difficulty === 'easy' && 'Slower starting speed. Easy control.'}
            {settings.difficulty === 'medium' && 'Balanced classic speed.'}
            {settings.difficulty === 'hard' && 'Intense starting speed. Rapid reflexes required!'}
          </p>
        </div>

        <div className={`border-b ${sectionDivider}`} />

        {/* SPEED ADJUSTMENT */}
        <div className="flex flex-col gap-2">
          <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
            <Gauge className="w-3.5 h-3.5" />
            Game Velocity Speed
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['slow', 'normal', 'fast', 'hyper'] as SpeedOption[]).map((sp) => (
              <button
                key={sp}
                disabled={gameInProgress}
                onClick={() => updateSetting('speedOption', sp)}
                className={getButtonClass(settings.speedOption === sp)}
                id={`setting-speed-${sp}`}
              >
                {sp.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            {settings.speedOption === 'slow' && 'Chill pace. Ideal for beginners planning long paths.'}
            {settings.speedOption === 'normal' && 'Standard classic speed.'}
            {settings.speedOption === 'fast' && 'High-speed frenzy! Fast and frantic.'}
            {settings.speedOption === 'hyper' && 'Extreme adrenaline. Pure adrenaline speed!'}
          </p>
        </div>

        <div className={`border-b ${sectionDivider}`} />

        {/* COMPETITOR BOTS */}
        <div className="flex flex-col gap-2">
          <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
            <Users className="w-3.5 h-3.5" />
            Rival AI Bots (Multiplayer-Feel)
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {[0, 1, 2, 3, 4].map((count) => (
              <button
                key={count}
                disabled={gameInProgress}
                onClick={() => updateSetting('botCount', count)}
                className={getButtonClass(settings.botCount === count)}
                id={`setting-bots-${count}`}
              >
                {count === 0 ? 'OFF' : `${count} RIVAL${count > 1 ? 'S' : ''}`}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 italic border-l-2 pl-2 border-indigo-500/30">
            Adds rival bot snakes with names that roam the grid, eat food, and crash. Try to outscore them or block them!
          </p>
        </div>

        <div className={`border-b ${sectionDivider}`} />

        {/* WALL WRAP-AROUND MODE */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
              <RefreshCw className="w-3.5 h-3.5" />
              Portal Wrap-Around
            </label>
            <span className="text-[10px] text-slate-400 mt-0.5">Allow snake to pass through outer walls.</span>
          </div>
          <div className="flex gap-1">
            <button
              disabled={gameInProgress}
              onClick={() => updateSetting('wrapAround', true)}
              className={getButtonClass(settings.wrapAround === true)}
              id="setting-wrap-on"
            >
              On
            </button>
            <button
              disabled={gameInProgress}
              onClick={() => updateSetting('wrapAround', false)}
              className={getButtonClass(settings.wrapAround === false)}
              id="setting-wrap-off"
            >
              Off
            </button>
          </div>
        </div>

        <div className={`border-b ${sectionDivider}`} />

        {/* ARENA GRID SIZE SCREEN */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
              <Grid className="w-3.5 h-3.5" />
              Arena Size
            </label>
            <span className="text-[10px] text-slate-400 mt-0.5">Width & Height of the boundary grid.</span>
          </div>
          <div className="flex gap-1">
            {[15, 20, 25].map((sz) => (
              <button
                key={sz}
                disabled={gameInProgress}
                onClick={() => updateSetting('gridSize', sz)}
                className={getButtonClass(settings.gridSize === sz)}
                id={`setting-grid-${sz}`}
              >
                {sz}x{sz}
              </button>
            ))}
          </div>
        </div>

        <div className={`border-b ${sectionDivider}`} />

        {/* VISUAL LAYOUT THEME SELECTOR */}
        <div className="flex flex-col gap-2">
          <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <Layout className="w-3.5 h-3.5" />
            Appearance Theme
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'light', label: 'Light' },
              { id: 'dark', label: 'Dark' },
              { id: 'retro', label: 'Retro' },
            ].map((th) => (
              <button
                key={th.id}
                onClick={() => updateSetting('theme', th.id as any)}
                className={getButtonClass(settings.theme === th.id)}
                id={`setting-theme-${th.id}`}
              >
                {th.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`border-b ${sectionDivider}`} />

        {/* AUDIO ENABLE SWITCH */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${theme === 'retro' ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
              {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-500" />}
              Web Synth Sound FX
            </label>
            <span className="text-[10px] text-slate-400 mt-0.5">8-Bit sounds for retro game responses.</span>
          </div>
          <button
            onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)}
            className={`cursor-pointer px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              settings.soundEnabled
                ? theme === 'retro'
                  ? 'bg-green-500 text-black shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                  : theme === 'dark'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-emerald-600 text-white'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
            }`}
            id="setting-sound-toggle"
          >
            {settings.soundEnabled ? 'ENABLED' : 'MUTED'}
          </button>
        </div>

      </div>
    </div>
  );
}
