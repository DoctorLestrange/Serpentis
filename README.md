<div align="center">

<img src="./public/favicon.svg" width="84" height="84" alt="Serpentis Emblem" />

# SERPENTIS
### Tactile Arcade Serpent & Labyrinth Trial

[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![HTML5 Canvas](https://img.shields.io/badge/Renderer-HTML5_Canvas_2D-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Apache_2.0-34D399?style=flat-square)](./LICENSE)

**Serpentis** is a fast, customizable, studio-grade classic arcade snake game engineered with a deterministic simulation core, **Uniform Quadratic B-Spline** continuous body interpolation, woven 3D reptile scale textures, procedural Web Audio synthesis, handcrafted architectural chambers, and a persistent Hall of Fame.

</div>

---

## ✨ Key Features

- **Continuous B-Spline Serpent Rendering** — Replaces blocky grid-stepping with a smooth, constant-speed Uniform Quadratic B-Spline spine, layered 3D dorsal shading, diamond reptile scales, an articulated viper head with reactive gaze tracking, and a flickering forked tongue.
- **Deterministic Fixed-Tick Simulation & 3-Input Turn Queue** — Buffers rapid orthogonal cornering inputs (`WASD` / `Arrow Keys`) up to 3 turns ahead while strictly preventing accidental 180-degree self-reversal within the same simulation step.
- **4 Distinct Game Modes** — Play **Classic Arcade**, **Labyrinth Stages** (5 progressive architectural chambers with harvest quotas), **Time Blitz 90s**, or **Zen Endless**.
- **Deep Rule Customization** — Configure board dimensions (`Compact 18×14`, `Standard 24×18`, `Grand 30×22`), base speed tiers (`Calm`, `Normal`, `Turbo`, `Hyper`), obstacle presets (`Open`, `Pillars`, `Gates`, `Cross`, `Maze`), perimeter behavior (`Solid Walls` vs `Portal Wrap`), simultaneous multi-fruit counts (`1`, `3`, or `5`), paired warp gates, special power-ups, and toxic poison hazards.
- **Realistic No-Grid Arena Mode** — Toggle the arena grid off in Settings or from the Pause Menu (`Hide Grid`) for a seamless, natural terrain surface and heightened spatial challenge.
- **Tactical Power-Ups & Toxic Poison Skulls** — Harvest **Golden**, **Chrono**, **Phase**, and **Magnet** pickups while dodging lethal **Poison Skulls** (enabled on `Turbo`/`Hyper` difficulties or toggled manually). Magnets are strictly immune to pulling poison.
- **Hall of Fame & Quick-Select Player Profiles** — Record high-score runs at the end of every game by typing a new name or quick-selecting any previously saved player name. Automatically commits your entry if you click **Try Again** or close the dialog.
- **Zero-Dependency Web Audio Synthesizer** — Procedural polyphonic sound engine generating tactile harvest chimes, combo arpeggios, warp whooshes, boost hums, and collision thuds using the native Web Audio API.
- **Desktop & Mobile Ready** — Centered single-dialog navigation and responsive viewport geometry with on-screen mobile D-Pad + Boost controls and swipe gesture support.

---

## 🎮 Game Modes

| Mode | Objective & Mechanics |
| :--- | :--- |
| **Classic Arcade** | Progressive speed scaling as your harvest grows, combo streak multipliers, customizable obstacle layouts, and special pickups. |
| **Labyrinth Stages** | Conquer **5 handcrafted architectural chambers** (*The Courtyard*, *Twin Corridors*, *Crosswind Vault*, *Warp Sanctum*, and *The Citadel*) by reaching each chamber's apple harvest quota. |
| **Time Blitz 90s** | High-tempo 90-second score attack with simultaneous multi-fruit spawns and rapid combo chains. |
| **Zen Endless** | Relaxed flow state with portal-wrapped perimeter walls and phase-through self-collision immunity. |

---

## 🍎 Pickups & Hazards Guide

| Item | Visual Cue | Effect |
| :--- | :--- | :--- |
| **Crimson Apple** | Glossy red fruit with leaf | `+100` base score (scaled by active combo multiplier), `+1` body segment, `+14%` boost stamina. |
| **Golden Fruit** | Radiant gold orb (`2x`) | `+250` base score, `+2` body segments, and **2× Double Score** for `8.0s`. |
| **Chrono Berry** | Cyan crystal (`SLOW`) | `+150` base score and **Chrono Dilation** (`38%` slower tick interval) for `7.0s`. |
| **Phase Plum** | Violet diamond (`GHOST`) | `+150` base score and **Ethereal Phase** (pass safely through your own body and interior obstacles) for `7.0s`. |
| **Magnet Citrus** | Amber core (`PULL`) | `+150` base score and **Magnetic Harvest** (pulls beneficial fruits within a 3-tile Manhattan radius) for `8.0s`. **Never pulls Poison Skulls.** |
| **Poison Skull** | Bone skull & crossbones with violet aura | **Lethal Hazard** — Immediately terminates the run on contact. Auto-expires after `11.0s`. |

---

## 🕹️ Controls

| Action | Desktop (Keyboard) | Mobile / Touch |
| :--- | :--- | :--- |
| **Steer Serpent** | `W A S D` or `Arrow Keys` | On-screen D-Pad (`▲ ◀ ▶ ▼`) or Swipe on Arena |
| **Slither Boost (1.85× Speed)** | Hold `Space` or `Left/Right Shift` | Hold on-screen `BOOST` button |
| **Pause / Resume Game** | `P` or `Esc` | Tap Pause (`⏸`) button in top HUD |
| **Quick Restart Run** | `R` | Tap Restart (`↻`) button in top HUD |
| **Mute / Unmute Audio** | `M` | Tap Audio toggle in top HUD / Title Bar |
| **Close Active Dialog** | `Esc` | Tap `Done` or `Close [Esc]` |

---

## 🏗️ Architecture & Project Structure

The codebase strictly separates deterministic game rules from rendering, persistence, and React UI overlays:

```text
.
├── public/
│   └── favicon.svg              # Custom SVG coiled serpent emblem
├── src/
│   ├── components/
│   │   ├── GameCanvas.tsx       # 60 FPS Canvas2D renderer, B-spline serpent & responsive arena metrics
│   │   ├── PlayingHud.tsx       # Top telemetry dock & mobile touch D-Pad / Boost controls
│   │   ├── StatusModal.tsx      # Pause dialog, Game Over / Victory summary & Hall of Fame name entry
│   │   └── TitleScreen.tsx      # Centered Main Menu, Customize Rules dialog & Hall of Fame leaderboard
│   ├── game/
│   │   ├── audio.ts             # Procedural Web Audio API sound synthesizer
│   │   ├── particles.ts         # Pre-allocated zero-GC particle pool & floating score popups
│   │   ├── rules.ts             # Pure deterministic simulation engine, turn queue, AI & obstacle builders
│   │   ├── rules.test.ts        # Node test suite verifying simulation invariants & persistence
│   │   ├── storage.ts           # LocalStorage persistence, schema sanitization, Hall of Fame & achievements
│   │   ├── themes.ts            # 4 curated studio palettes (Botanical Slate, Obsidian Gold, Phosphor CRT, Alabaster)
│   │   └── types.ts             # Strict TypeScript interfaces for simulation state, config & profiles
│   ├── App.tsx                  # Root application state machine & global keyboard shortcuts
│   ├── index.css                # Tailwind CSS v4 setup & typography rules
│   └── main.tsx                 # React 19 DOM entry point
├── index.html                   # HTML5 entry point with SEO/OpenGraph metadata
├── package.json                 # Scripts & dependencies
├── tsconfig.json                # Strict TypeScript configuration
└── vite.config.ts               # Vite bundler configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 20.x` (or **Bun** `>= 1.1`)
- **npm** `>= 10.x`

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/serpentis-arcade-snake.git
   cd serpentis-arcade-snake
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server (runs on `http://localhost:3000`):**
   ```bash
   npm run dev
   ```

---

## 🧪 Testing & Verification

Serpentis includes a deterministic unit test suite (`node:test` via `tsx`) covering turn-queue buffering, 180-degree reversal prevention, growth interpolation alignment, magnet multi-fruit pulls, poison skull immunity, portal clearance, wall wrapping, campaign quotas, and LocalStorage schema sanitization.

```bash
# Run unit tests
npm test

# Run TypeScript type checking
npm run lint

# Build production bundle into ./dist
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Deployment

Serpentis compiles to a purely static, zero-backend production bundle in the `dist/` directory (`npm run build`), making it ready for instant deployment on any static host:

- **Vercel / Netlify / Cloudflare Pages**:
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
- **GitHub Pages**:
  - Build with `npm run build` and deploy the `dist/` folder via `actions/upload-pages-artifact` and `actions/deploy-pages`.

---

## 📄 License

Distributed under the **Apache License 2.0**. See [`LICENSE`](./LICENSE) for full details.
