/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Position, GameStatus, Food, Particle, BotSnake } from '../types';

interface SnakeBoardProps {
  snake: Position[];
  direction: string;
  foods: Food[];
  gridSize: number;
  status: GameStatus;
  score: number;
  theme: 'light' | 'dark' | 'retro';
  botSnakes: BotSnake[];
}

export default function SnakeBoard({
  snake,
  direction,
  foods,
  gridSize,
  status,
  score,
  theme,
  botSnakes,
}: SnakeBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const particlesRef = useRef<Particle[]>([]);
  const prevScoreRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Handle Resize and fit layout
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        // Keep it square and responsive
        const size = Math.min(width, 500);
        if (size > 0) {
          setDimensions({ width: size, height: size });
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Trigger particle burst on score increase (food eaten)
  useEffect(() => {
    if (score > prevScoreRef.current && snake.length > 0) {
      const head = snake[0];
      // Find what food color to explode
      const eatenColor = theme === 'retro' ? '#22c55e' : '#ef4444';
      spawnExplosion(head.x, head.y, eatenColor, 20);
    } else if (status === 'GAME_OVER' && prevScoreRef.current > 0) {
      // Game over big explosion of whole snake
      snake.forEach((pos, idx) => {
        if (idx % 2 === 0) {
          spawnExplosion(pos.x, pos.y, theme === 'retro' ? '#166534' : '#ef4444', 4);
        }
      });
    }
    prevScoreRef.current = score;
  }, [score, status, snake, theme]);

  const prevBotsRef = useRef<BotSnake[]>([]);

  // Trigger particle explosions for bots dying or eating
  useEffect(() => {
    botSnakes.forEach((bot) => {
      const prevBot = prevBotsRef.current.find((b) => b.id === bot.id);
      if (prevBot && prevBot.isAlive && !bot.isAlive && bot.body.length > 0) {
        // Explode the bot's head and body beautifully
        const head = bot.body[0];
        spawnExplosion(head.x, head.y, bot.color, 18);
        bot.body.forEach((pos, idx) => {
          if (idx > 0 && idx % 2 === 0) {
            spawnExplosion(pos.x, pos.y, bot.color, 3);
          }
        });
      } else if (prevBot && bot.score > prevBot.score && bot.body.length > 0) {
        // Explode minor particles when a bot eats food
        const head = bot.body[0];
        spawnExplosion(head.x, head.y, bot.color, 8);
      }
    });
    prevBotsRef.current = botSnakes;
  }, [botSnakes]);

  // Spawn explosion particles
  const spawnExplosion = (gridX: number, gridY: number, color: string, count: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cellSize = dimensions.width / gridSize;
    const pxX = gridX * cellSize + cellSize / 2;
    const pxY = gridY * cellSize + cellSize / 2;

    const newParticles: Particle[] = [];
    const colors =
      color === '#ef4444'
        ? ['#ef4444', '#f59e0b', '#facc15', '#f87171'] // Fire / Warm theme
        : theme === 'retro'
        ? ['#22c55e', '#15803d', '#4ade80', '#86efac'] // Retro emeralds
        : ['#6366f1', '#a855f7', '#ec4899', '#38bdf8']; // Cyberpunk neon

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      newParticles.push({
        x: pxX,
        y: pxY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        size: Math.random() * 3 + 1.5,
        decay: Math.random() * 0.03 + 0.02,
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  // Main Canvas Render Loop for continuous assets/particles animations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI setup
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const cellSize = dimensions.width / gridSize;

    // Pulse factor for animations
    let pulseAngle = 0;

    const render = () => {
      pulseAngle += 0.15;
      const pulseFactor = Math.sin(pulseAngle) * 0.15 + 1.0;

      // 1. Clear background and draw theme specific base
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      let gridLineColor = 'rgba(226, 232, 240, 0.4)'; // Light theme
      let bgGrad = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);

      if (theme === 'dark') {
        bgGrad.addColorStop(0, '#050508'); // Immersive dark board base color
        bgGrad.addColorStop(1, '#090a10'); // Immersive board shadow gradient base
        gridLineColor = 'rgba(99, 102, 241, 0.08)'; // Indigo/violet neon lines
      } else if (theme === 'retro') {
        bgGrad.addColorStop(0, '#042f1a'); // dark forest
        bgGrad.addColorStop(1, '#051b11'); // very dark retro green
        gridLineColor = 'rgba(22, 101, 52, 0.3)'; // forest-800
      } else {
        bgGrad.addColorStop(0, '#f8fafc'); // slate-50
        bgGrad.addColorStop(1, '#f1f5f9'); // slate-100
      }

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // 2. Draw Retro scanlines or grid lines
      ctx.strokeStyle = gridLineColor;
      ctx.lineWidth = 0.5;

      for (let i = 0; i <= gridSize; i++) {
        const pos = i * cellSize;
        // Vertical
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, dimensions.height);
        ctx.stroke();

        // Horizontal
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(dimensions.width, pos);
        ctx.stroke();
      }

      // Draw subtle neon grid highlights for retro/dark
      if (theme === 'retro') {
        // Overlay thin Scanlines look
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let y = 0; y < dimensions.height; y += 4) {
          ctx.fillRect(0, y, dimensions.width, 2);
        }
      }

      // 3. Draw Foods with neon glow
      foods.forEach((food) => {
        const centerX = food.position.x * cellSize + cellSize / 2;
        const centerY = food.position.y * cellSize + cellSize / 2;
        const radius = (cellSize / 2 - 2) * (food.type === 'GOLDEN' ? pulseFactor * 1.05 : pulseFactor);

        ctx.save();
        
        // Glow effect
        if (theme !== 'light') {
          ctx.shadowBlur = 12;
          ctx.shadowColor = food.color;
        }

        ctx.fillStyle = food.color;
        ctx.beginPath();

        if (food.type === 'GOLDEN') {
          // Sparkle star shape for Golden Food
          const spikes = 5;
          const outerRadius = radius;
          const innerRadius = radius / 2;
          let rot = (Math.PI / 2) * 3;
          let x = centerX;
          let y = centerY;
          const step = Math.PI / spikes;

          ctx.beginPath();
          ctx.moveTo(centerX, centerY - outerRadius);
          for (let i = 0; i < spikes; i++) {
            x = centerX + Math.cos(rot) * outerRadius;
            y = centerY + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = centerX + Math.cos(rot) * innerRadius;
            y = centerY + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
          }
          ctx.lineTo(centerX, centerY - outerRadius);
          ctx.closePath();
          ctx.fill();

          // Draw central diamond bright core
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else if (food.type === 'SPEED_BOOST') {
          // Pill or diamond lightning shape
          const len = radius * 1.1;
          ctx.moveTo(centerX, centerY - len);
          ctx.lineTo(centerX + len * 0.7, centerY);
          ctx.lineTo(centerX, centerY + len);
          ctx.lineTo(centerX - len * 0.7, centerY);
          ctx.closePath();
          ctx.fill();

          // Central bolt core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Perfect circular juicy red apple
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();

          // Leaf/Stem
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY - radius * 0.8);
          ctx.quadraticCurveTo(centerX + 3, centerY - radius - 2, centerX + 5, centerY - radius - 4);
          ctx.stroke();
        }

        ctx.restore();
      });

      // 4. Draw Snake with tapered rounded segments
      if (snake.length > 0) {
        snake.forEach((segment, idx) => {
          const isHead = idx === 0;
          const isTail = idx === snake.length - 1;

          // Snake theme colors
          let segmentColor = '#22c55e'; // Green-500 default
          let headColor = '#166534'; // Green-800 default
          let strokeColor = '#14532d';

          if (theme === 'dark') {
            segmentColor = '#10b981'; // Emerald-500
            headColor = '#047857'; // Emerald-700
            strokeColor = '#064e3b';
          } else if (theme === 'retro') {
            segmentColor = '#4ade80'; // Neon-retro green
            headColor = '#22c55e';
            strokeColor = '#052e16';
          }

          const centerX = segment.x * cellSize + cellSize / 2;
          const centerY = segment.y * cellSize + cellSize / 2;

          // Core radius tapers off from head to tail to create organic motion trail
          const ratio = (snake.length - idx) / snake.length;
          const segmentRadius = isHead
            ? cellSize / 2 - 0.5
            : (cellSize / 2 - 1.5) * (0.65 + 0.35 * ratio);

          ctx.save();

          if (theme !== 'light') {
            ctx.shadowBlur = isHead ? 10 : 4;
            ctx.shadowColor = isHead ? headColor : segmentColor;
          }

          ctx.fillStyle = isHead ? headColor : segmentColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.arc(centerX, centerY, segmentRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw Details on Snake Head
          if (isHead) {
            ctx.shadowBlur = 0; // Turn off shadows for precise facial details
            ctx.fillStyle = '#ffffff';

            // Eye offsets depending on current move direction
            let eyeRadius = cellSize * 0.14;
            let pupilRadius = eyeRadius * 0.5;
            let eyeOffset1 = { dx: 0, dy: 0 };
            let eyeOffset2 = { dx: 0, dy: 0 };
            let pupilOffset = { dx: 0, dy: 0 };

            switch (direction) {
              case 'UP':
                eyeOffset1 = { dx: -cellSize * 0.22, dy: -cellSize * 0.18 };
                eyeOffset2 = { dx: cellSize * 0.22, dy: -cellSize * 0.18 };
                pupilOffset = { dx: 0, dy: -1 };
                break;
              case 'DOWN':
                eyeOffset1 = { dx: -cellSize * 0.22, dy: cellSize * 0.18 };
                eyeOffset2 = { dx: cellSize * 0.22, dy: cellSize * 0.18 };
                pupilOffset = { dx: 0, dy: 1 };
                break;
              case 'LEFT':
                eyeOffset1 = { dx: -cellSize * 0.18, dy: -cellSize * 0.22 };
                eyeOffset2 = { dx: -cellSize * 0.18, dy: cellSize * 0.22 };
                pupilOffset = { dx: -1, dy: 0 };
                break;
              case 'RIGHT':
                eyeOffset1 = { dx: cellSize * 0.18, dy: -cellSize * 0.22 };
                eyeOffset2 = { dx: cellSize * 0.18, dy: cellSize * 0.22 };
                pupilOffset = { dx: 1, dy: 0 };
                break;
            }

            // Draw Eyes whites
            ctx.beginPath();
            ctx.arc(centerX + eyeOffset1.dx, centerY + eyeOffset1.dy, eyeRadius, 0, Math.PI * 2);
            ctx.arc(centerX + eyeOffset2.dx, centerY + eyeOffset2.dy, eyeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw Pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(
              centerX + eyeOffset1.dx + pupilOffset.dx,
              centerY + eyeOffset1.dy + pupilOffset.dy,
              pupilRadius,
              0,
              Math.PI * 2
            );
            ctx.arc(
              centerX + eyeOffset2.dx + pupilOffset.dx,
              centerY + eyeOffset2.dy + pupilOffset.dy,
              pupilRadius,
              0,
              Math.PI * 2
            );
            ctx.fill();

            // Flickering Red tongue
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            let tongueStart = { x: centerX, y: centerY };
            let tongueEnd = { x: centerX, y: centerY };

            switch (direction) {
              case 'UP':
                tongueStart = { x: centerX, y: centerY - segmentRadius };
                tongueEnd = { x: centerX, y: centerY - segmentRadius - 6 };
                ctx.moveTo(tongueStart.x, tongueStart.y);
                ctx.lineTo(tongueEnd.x, tongueEnd.y);
                ctx.lineTo(tongueEnd.x - 2, tongueEnd.y - 2);
                ctx.moveTo(tongueEnd.x, tongueEnd.y);
                ctx.lineTo(tongueEnd.x + 2, tongueEnd.y - 2);
                break;
              case 'DOWN':
                tongueStart = { x: centerX, y: centerY + segmentRadius };
                tongueEnd = { x: centerX, y: centerY + segmentRadius + 6 };
                ctx.moveTo(tongueStart.x, tongueStart.y);
                ctx.lineTo(tongueEnd.x, tongueEnd.y);
                ctx.lineTo(tongueEnd.x - 2, tongueEnd.y + 2);
                ctx.moveTo(tongueEnd.x, tongueEnd.y);
                ctx.lineTo(tongueEnd.x + 2, tongueEnd.y + 2);
                break;
              case 'LEFT':
                tongueStart = { x: centerX - segmentRadius, y: centerY };
                tongueEnd = { x: centerX - segmentRadius - 6, y: centerY };
                ctx.moveTo(tongueStart.x, tongueStart.y);
                ctx.lineTo(tongueEnd.x, tongueEnd.y);
                ctx.lineTo(tongueEnd.x - 2, tongueEnd.y - 2);
                ctx.moveTo(tongueEnd.x, tongueEnd.y);
                ctx.lineTo(tongueEnd.x - 2, tongueEnd.y + 2);
                break;
              case 'RIGHT':
                tongueStart = { x: centerX + segmentRadius, y: centerY };
                tongueEnd = { x: centerX + segmentRadius + 6, y: centerY };
                ctx.moveTo(tongueStart.x, tongueStart.y);
                ctx.lineTo(tongueEnd.x, tongueEnd.y);
                ctx.lineTo(tongueEnd.x + 2, tongueEnd.y - 2);
                ctx.moveTo(tongueEnd.x, tongueEnd.y);
                ctx.lineTo(tongueEnd.x + 2, tongueEnd.y + 2);
                break;
            }
            if (Math.random() > 0.4) {
              ctx.stroke();
            }
          }

          ctx.restore();
        });
      }

      // 4.5 Draw Bot/AI Snakes
      botSnakes?.forEach((bot) => {
        if (!bot.isAlive || bot.body.length === 0) return;

        bot.body.forEach((segment, idx) => {
          const isHead = idx === 0;
          const isTail = idx === bot.body.length - 1;

          // Bot custom segment colors
          let segmentColor = bot.color;
          let headColor = bot.color;
          let strokeColor = 'rgba(0,0,0,0.4)';

          // Tail taper
          const ratio = (bot.body.length - idx) / bot.body.length;
          const segmentRadius = isHead
            ? cellSize / 2 - 0.7
            : (cellSize / 2 - 1.7) * (0.65 + 0.35 * ratio);

          const centerX = segment.x * cellSize + cellSize / 2;
          const centerY = segment.y * cellSize + cellSize / 2;

          ctx.save();
          if (theme !== 'light') {
            ctx.shadowBlur = isHead ? 8 : 3;
            ctx.shadowColor = segmentColor;
          }

          ctx.fillStyle = isHead ? headColor : segmentColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;

          ctx.beginPath();
          ctx.arc(centerX, centerY, segmentRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Draw Details on Bot Snake Head
          if (isHead) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';

            let eyeRadius = cellSize * 0.12;
            let pupilRadius = eyeRadius * 0.5;
            let eyeOffset1 = { dx: 0, dy: 0 };
            let eyeOffset2 = { dx: 0, dy: 0 };
            let pupilOffset = { dx: 0, dy: 0 };

            switch (bot.direction) {
              case 'UP':
                eyeOffset1 = { dx: -cellSize * 0.20, dy: -cellSize * 0.16 };
                eyeOffset2 = { dx: cellSize * 0.20, dy: -cellSize * 0.16 };
                pupilOffset = { dx: 0, dy: -1 };
                break;
              case 'DOWN':
                eyeOffset1 = { dx: -cellSize * 0.20, dy: cellSize * 0.16 };
                eyeOffset2 = { dx: cellSize * 0.20, dy: cellSize * 0.16 };
                pupilOffset = { dx: 0, dy: 1 };
                break;
              case 'LEFT':
                eyeOffset1 = { dx: -cellSize * 0.16, dy: -cellSize * 0.20 };
                eyeOffset2 = { dx: -cellSize * 0.16, dy: cellSize * 0.20 };
                pupilOffset = { dx: -1, dy: 0 };
                break;
              case 'RIGHT':
                eyeOffset1 = { dx: cellSize * 0.16, dy: -cellSize * 0.20 };
                eyeOffset2 = { dx: cellSize * 0.16, dy: cellSize * 0.20 };
                pupilOffset = { dx: 1, dy: 0 };
                break;
            }

            // Eyes whites
            ctx.beginPath();
            ctx.arc(centerX + eyeOffset1.dx, centerY + eyeOffset1.dy, eyeRadius, 0, Math.PI * 2);
            ctx.arc(centerX + eyeOffset2.dx, centerY + eyeOffset2.dy, eyeRadius, 0, Math.PI * 2);
            ctx.fill();

            // Pupils
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(centerX + eyeOffset1.dx + pupilOffset.dx, centerY + eyeOffset1.dy + pupilOffset.dy, pupilRadius, 0, Math.PI * 2);
            ctx.arc(centerX + eyeOffset2.dx + pupilOffset.dx, centerY + eyeOffset2.dy + pupilOffset.dy, pupilRadius, 0, Math.PI * 2);
            ctx.fill();

            // Overhead Bot name
            ctx.fillStyle = theme === 'retro' ? '#22c55e' : theme === 'dark' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.7)';
            ctx.font = 'bold 8px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(bot.name, centerX, centerY - segmentRadius - 5);
          }
          ctx.restore();
        });
      });

      // 5. Draw and update particles
      const currentParticles = particlesRef.current;
      particlesRef.current = currentParticles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        return true;
      });

      // 6. Draw Game Pause Overlay / Grid Ambient Effect
      if (status === 'PAUSED') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'semibold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME PAUSED', dimensions.width / 2, dimensions.height / 2);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [dimensions, gridSize, snake, direction, foods, status, theme]);

  return (
    <div
      ref={containerRef}
      className={`w-full flex justify-center items-center select-none active:scale-[0.99] transition-transform duration-100`}
      style={{ touchAction: 'none' }}
    >
      <div
        className="relative border-4 rounded-xl overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          borderColor:
            theme === 'retro'
              ? 'rgba(34, 197, 94, 0.7)'
              : theme === 'dark'
              ? '#252844' // Immersive dark board border
              : 'rgba(203, 213, 225, 1)',
          boxShadow:
            theme === 'retro'
              ? '0 0 25px rgba(34, 197, 94, 0.45)'
              : theme === 'dark'
              ? '0 0 50px rgba(0, 0, 0, 0.85)' // Heavy immersive dark shadow
              : '0 10px 25px rgba(148, 163, 184, 0.15)',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block rounded-lg"
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
          }}
          id="snake-canvas"
        />
      </div>
    </div>
  );
}
