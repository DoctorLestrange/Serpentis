# Changelog

All notable changes to **Serpentis** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-25

### Added
- **Deterministic Simulation Engine** (`src/game/rules.ts`) with fixed-tick advancement, 3-input orthogonal turn queue, and anti-reversal protection.
- **Continuous B-Spline Serpent Rendering** (`src/components/GameCanvas.tsx`) with Uniform Quadratic B-Spline body interpolation, layered 3D reptile scale textures, reactive viper gaze, and flickering forked tongue.
- **4 Game Modes**: Classic Arcade, Labyrinth Stages (5 handcrafted chambers with progressive harvest quotas), Time Blitz 90s, and Zen Endless.
- **Pickups & Hazards**: Crimson Apple, Golden Fruit (`2×` score / `+5s` Blitz bonus), Chrono Berry (time dilation), Phase Plum (ghost phasing), Magnet Citrus (multi-fruit attraction strictly immune to poison), and togglable lethal Poison Skulls.
- **4 Curated Visual Themes**: Botanical Slate, Obsidian Gold, Phosphor CRT, and Alabaster Studio, plus a **Hide Grid** toggle for natural seamless terrain.
- **Persistent Hall of Fame** with custom player name entry, quick-select chips for previously entered names, automatic save on retry/close, and sanitized `localStorage` persistence.
- **Procedural Web Audio Synthesizer** (`src/game/audio.ts`) with zero audio asset dependencies and safe autoplay unlock handling.
- **Responsive Desktop & Mobile UX**: Centered single-dialog navigation, adaptive arena sizing, mobile touch D-Pad + Boost controls, swipe steering, and React Error Boundary recovery.
- **Automated Verification & Publishing**: 14 deterministic `node:test` unit tests, GitHub Actions CI verification, and automated GitHub Pages static demo deployment.
