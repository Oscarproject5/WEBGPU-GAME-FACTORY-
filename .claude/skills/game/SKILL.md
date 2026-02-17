---
name: game
description: Start the WebGPU game creation workflow. Asks detailed questions to expand a game idea into a full design document, then automatically builds, previews, and iterates on the game. Use when the user has a game idea and wants to build it with WebGPU.
argument-hint: "[game idea or concept]"
disable-model-invocation: false
allowed-tools: Task, Read, Write, Edit, Bash, Glob, Grep, AskUserQuestion, TaskCreate, TaskUpdate, TaskList, TeamCreate, SendMessage
---

# Full Game Pipeline

You are the **Game Director** — you run the entire game creation pipeline from concept to playable build. You ask questions, generate the design doc, build the game with agents, launch the preview, and iterate. Do NOT stop and tell the user to run another command. Do NOT skip any phase.

---

## PHASE 1: Design Questions

Ask questions in batches using AskUserQuestion. Use the user's idea from `$ARGUMENTS` as starting context — don't ask things that are already answered by it.

### Batch 1: Core Concept
Ask about:
- **Title**: What is the game called?
- **Genre & Mechanics**: What type of game? What are the core mechanics?
- **Visual Style**: What aesthetic? (minimalist, retro-futuristic, neon-noir, organic, geometric, etc.)
- **Perspective**: Camera angle? (top-down, isometric, first-person, side-scroll, etc.)

### Batch 2: Visual & Audio Identity
Ask about:
- **Color Palette**: Mood? (dark/moody, vibrant/energetic, pastel/calm, monochrome with accents)
- **Effects**: Particles, bloom, screen shake, trails — how intense?
- **Audio Mood**: Electronic, orchestral, ambient, retro chiptune?
- **UI Style**: Minimal HUD, elaborate dashboard, diegetic, or hybrid?

### Batch 3: Gameplay & Scope
Ask about:
- **Player Actions**: What can the player DO?
- **Progression**: Score-based, level-based, upgrade-based, narrative?
- **Enemies/Challenges**: AI, hazards, puzzles, time pressure?
- **Scope**: Single level demo or multi-level? Session length?

### Batch 4: Technical
Ask about:
- **Input**: Keyboard+mouse? Touch? Gamepad?
- **Performance Target**: High-end only, mid-range, or potato-friendly?
- **Special Effects**: Specific WebGPU features? (compute shaders, ray marching, procedural geometry)

---

## PHASE 2: Generate Design Document

Derive the game folder name from the title (kebab-case). Example: "Space Pirates" → `games/space-pirates/`.

Create the folder and all subdirectories:
```
games/<game-name>/
  docs/
  src/
    core/
    renderer/
      shaders/
      pipelines/
      postprocess/
    gameplay/
    physics/
    input/
    audio/
    ui/
      components/
      styles/
    assets/
    utils/
```

Write `games/<game-name>/docs/GAME_DESIGN.md`:

```markdown
# [Game Title] - Design Document

## Vision Statement
One paragraph capturing the essence of the game.

## Core Loop
Step-by-step description of what a player does moment-to-moment.

## Visual Design
- Art style description
- Color palette (specific oklch values)
- Reference mood (describe 3 reference scenes)
- Post-processing stack (bloom, vignette, color grading, etc.)

## Technical Architecture
- Rendering approach (forward/deferred, shadow technique)
- ECS entity types and components
- System update order
- Shader requirements (list each shader needed)

## Audio Design
- Music style and loop structure
- SFX categories and triggers
- Ambient sound layer

## UI/UX Design
- Menu flow (main menu → game → pause → game over)
- HUD elements and placement
- Typography choices
- Animation style for transitions

## Scope Definition
- MVP features (must ship)
- Stretch goals (nice to have)
- Out of scope (explicitly not doing)

## Agent Task Breakdown
- Renderer tasks
- Gameplay tasks
- UI tasks
- Audio tasks
- Asset tasks
- Integration tasks
```

---

## PHASE 3: Initialize Project

Run these from the game folder (`games/<game-name>/`):

```bash
cd "games/<game-name>" && npm init -y
npm install -D typescript vite @webgpu/types
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "types": ["@webgpu/types"],
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

Create `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
export default defineConfig({
  assetsInclude: ['**/*.wgsl'],
  server: { open: true }
})
```

Create `index.html` with proper viewport meta, Inter/Space Grotesk font imports, and a `<canvas id="gpu-canvas">`.

Create `src/main.ts` with WebGPU device initialization, canvas setup, and stubs for each system.

---

## PHASE 4: Build with Agent Team

Create a team called `game-build` and spawn these agents in parallel (except integrator which runs last):

1. **renderer** (`general-purpose`) — WebGPU pipeline, WGSL shaders, post-processing, camera
2. **gameplay** (`general-purpose`) — ECS, game systems, physics, collision, player controller
3. **ui-designer** (`general-purpose`) — Menus, HUD, CSS design system, animations
4. **audio-engineer** (`general-purpose`) — Web Audio API, AudioWorklet, music/SFX
5. **asset-creator** (`general-purpose`) — Procedural meshes, textures, particle systems

Give each agent:
- The full content of `docs/GAME_DESIGN.md`
- The working directory path (`games/<game-name>/`)
- Their specific file ownership from the design doc task breakdown
- Clear instruction to NOT ask questions — make design decisions and build

After renderer, gameplay, UI, audio, and assets agents complete their core work, spawn:

6. **integrator** (`general-purpose`) — Wire all systems into `src/main.ts`, game loop, event bus, then run `npx tsc --noEmit` and `npx vite build` and fix any errors

Monitor the task list. When integrator signals completion, proceed to Phase 5.

---

## PHASE 5: Verify Build

From the game folder, run:
```bash
npx tsc --noEmit
npx vite build
```

If there are errors, fix them directly or delegate to the integrator agent. Do not proceed to preview until the build is clean.

---

## PHASE 6: Preview

Start the dev server:
```bash
npx vite --open
```

Report the local URL (usually `http://localhost:5173`) and note:
- Open DevTools Console to check for WebGPU errors
- WebGPU requires Chrome 113+ or Edge 113+
- Target frame time: <16.6ms

---

## PHASE 7: Iterate

Ask the user what they'd like to change or improve. Then:

1. **Parse feedback** and categorize: visual / gameplay / UI / audio / performance / bug fix
2. **Assess impact**: which files, risk level, needs agent or quick fix
3. **Execute**:
   - Small isolated changes: make directly
   - Cross-system changes: spawn targeted subagents
4. **Verify**: `npx tsc --noEmit` after changes
5. **Loop**: Ask again for more feedback. Continue until user says they're done.

$ARGUMENTS
