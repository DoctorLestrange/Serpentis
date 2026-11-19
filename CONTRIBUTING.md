# Contributing to Serpentis

Thank you for your interest in contributing to **Serpentis — Tactile Arcade Snake**! This document outlines the architectural guidelines and verification steps required for contributions.

## 🏛️ Architectural Principles

1. **Pure Deterministic Simulation Core (`src/game/rules.ts`)**
   - All game rules, collision detection, turn queuing, fruit spawning, magnet pulls, poison skull logic, and demo AI pathfinding must remain pure functions independent of the DOM or Canvas context.
   - Any new gameplay mechanic or rule change must include unit test coverage in `src/game/rules.test.ts`.
2. **Smooth 60 FPS Canvas2D Rendering (`src/components/GameCanvas.tsx`)**
   - Avoid per-frame heap allocations inside the `requestAnimationFrame` render loop. Use the pre-allocated particle pool (`src/game/particles.ts`) for visual effects.
   - Do not use CSS `backdrop-filter` / `backdrop-blur` over the live game canvas.
3. **Single-Dialog & Responsive Viewport Discipline**
   - Only one modal/dialog may be visible at a time.
   - Verify all layout and UI changes on both Desktop (`1440×900`) and Mobile (`390×844`) viewports so neither the arena board nor any settings dialog is clipped.

## 🛠️ Development Workflow

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the local development server:**
   ```bash
   npm run dev
   ```
3. **Run the verification suite before opening a Pull Request:**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

## ✅ Pull Request Checklist

- [ ] `npm run lint` passes with zero TypeScript errors.
- [ ] `npm test` passes all unit tests (and new tests were added for any new game logic).
- [ ] `npm run build` compiles the production bundle cleanly.
- [ ] UI and arena layout verified across both Desktop and Mobile viewports.
