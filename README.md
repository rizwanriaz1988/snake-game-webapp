# 🐍 Snake Game - Retro Arcade Edition

A complete, modern, fully responsive, and highly polished Snake Game web application built with **React**, **Tailwind CSS (v4)**, and **HTML5 Canvas**. The app is optimized for desktop, tablet, and mobile browsers and is ready to be deployed directly on **Vercel** with zero configuration.

---

## 🎮 Live Features & Specifications

- **🎨 Multi-Theme Appearance Support**:
  - **Slate Light**: Sleek off-white aesthetics with gray-slate cards.
  - **Slate Dark**: Cozy dark-blue space environment using slate gradients.
  - **Retro Green Terminal**: Authentic monochrome arcade forest green canvas with scanlines and emerald glow highlights.
- **🔊 Client-Side Synthesized Audio**: Powered entirely by the browser's **Web Audio API**. Generates pure 8-bit sound effects (eating pops, golden sparkle chimes, laser speeds, and death explosions) without downloading any static assets.
- **📊 Granular Game Configurator**:
  - **Difficulty settings**: Easy, Medium, and Hard, with customized starting intervals.
  - **Portal Wrap-Around**: Toggle whether colliding with the outer walls wraps the snake around to the other side or triggers a Game Over.
  - **Grid Size Selectors**: Scale the challenge by swapping from 15x15 (tight) to 20x20 (normal) or 25x25 (massive arena) layouts.
- **🍎 Special Interactive Food Drops**:
  - **Standard Apple (Red)**: Gives `+10` points.
  - **Golden Glittering Apple (Gold)**: Rare (10% spawn chance). Gives `+30` points and plays a beautiful pentatonic chime sweep.
  - **Neon Speed Potion (Blue)**: Gives `+20` points and increases speed of movement temporarily.
- **💥 Dynamic Particle Physics**: Real-time canvas particle systems explode in matching shades when foods are eaten or when the snake collisions occur.
- **📱 Dual Mobile Control Systems**: Support for physical desktop keyboards (WASD & Arrow Keys) as well as swipe gestures and tactical virtual on-screen d-pads for phone/tablet screens.
- **🚫 Anti-Scroll Mechanics**: Page scrolling is intercepted and disabled dynamically while game directional keys or the spacebar are pressed.

---

## 📁 Technical Architecture & Codebase

- `/src/types.ts`: Game configurations and stats types.
- `/src/utils/audio.ts`: Retro Web Audio synth for instant audibles.
- `/src/components/SnakeBoard.tsx`: HTML5 Canvas engine with high-DPI (Retina) support, smooth rendering, and particle loops.
- `/src/components/Controls.tsx`: Tactile swipe-optimized on-screen d-pad.
- `/src/components/Settings.tsx`: Sidebar drawer for instant configurations.
- `/src/components/Instructions.tsx`: Simple arcade guidebook.
- `/src/App.tsx`: Coordinates states, tickers, and listeners.

---

## 🚀 Local Setup & Development Instructions

Ensure you have [Node.js](https://nodejs.org/) (v18+) installed.

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```
   The local server will spin up on `http://localhost:3000`.

3. **Check/Lint Source Code**:
   ```bash
   npm run lint
   ```

4. **Production Build Compilation**:
   ```bash
   npm run build
   ```

---

## ⚡ Deployment to Vercel

This React SPA resides entirely on the client, requiring no static server routes or backends. It compiles to a clean `dist/` bundle which can be hosted on Vercel instantly.

### Method 1: Using the Vercel CLI (Super Fast)

1. Install the Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```
2. Run the deployment sequence inside the project directory:
   ```bash
   vercel
   ```
   Select default settings. Vercel will auto-detect the Vite configuration and deploy.

3. Complete production upload:
   ```bash
   vercel --prod
   ```

### Method 2: Git Repository Connection (Vercel Dashboard)

1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Sign in to your [Vercel Dashboard](https://vercel.com/) and click **New Project**.
3. Import your repository.
4. Vercel will auto-configure:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build` (produces the static output in `dist/`)
   - **Output Directory**: `dist`
5. Click **Deploy**, and your Snake Game is live under a custom `.vercel.app` URL within seconds!

---

## 📝 License

SPDX-License-Identifier: Apache-2.0
