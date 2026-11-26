# Contributing to Serpentis

Thank you for your interest in contributing to **Serpentis — Tactile Arcade Snake**! By participating in this project, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## 🏛️ Architectural Principles

1. **Pure Deterministic Simulation Core (`src/game/rules.ts`)**
   - All game rules, collision detection, turn queuing, fruit spawning, magnet pulls, poison skull logic, and demo AI pathfinding must remain pure functions independent of the DOM or Canvas context.
   - Any new gameplay mechanic or rule change must include unit test coverage in `src/game/rules.test.ts`.
2. **Smooth 60 FPS Canvas2D Rendering (`src/components/GameCanvas.tsx`)**
   - Keep the `requestAnimationFrame` render loop allocation-light and batch repetitive grid primitives. Use the pre-allocated particle pool (`src/game/particles.ts`) for visual effects.
   - Do not use CSS `backdrop-filter` / `backdrop-blur` over the live game canvas.
3. **Single-Dialog & Responsive Viewport Discipline**
   - Only one modal/dialog may be open at a time.
   - Verify all layout and UI changes on both Desktop (`1440×900`) and Mobile (`390×844`) viewports so neither the arena board nor any settings dialog is clipped.
4. **Static Portability**
   - Keep asset references relative (`./favicon.svg`, `VITE_BASE_PATH="./"`) so builds work cleanly on GitHub Pages subpaths and root domains alike.

## 🛠️ Development Workflow

1. **Fork & clone the repository:**
   ```bash
   git clone https://github.com/DoctorLestrange/Serpentis.git
   cd Serpentis
   npm install
   ```
2. **Create a feature or fix branch:**
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Start the local development server (`http://localhost:3000`):**
   ```bash
   npm run dev
   ```
4. **Run the full verification suite before opening a Pull Request:**
   ```bash
   npm run check
   ```
   *(Runs `npm run lint`, `npm test`, and `npm run build` in sequence.)*

## ✅ Pull Request Checklist

- [ ] `npm run lint` passes with zero TypeScript errors.
- [ ] `npm test` passes all unit tests (with new tests covering any simulation/rule additions).
- [ ] `npm run build` compiles the production bundle cleanly.
- [ ] UI and arena layout verified across both Desktop (`1440×900`) and Mobile (`390×844`) viewports with zero console errors.
- [ ] PR description follows [`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md).
