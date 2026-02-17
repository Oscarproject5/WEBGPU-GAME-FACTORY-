# WebGPU Game Factory

## Project Overview
This is a WebGPU game development workspace powered by multi-agent orchestration. Games are built using modern web technologies with a focus on visual polish and modern aesthetics.

## Tech Stack
- **Rendering**: WebGPU API with WGSL shaders (NO WebGL fallback during development)
- **Language**: TypeScript (strict mode) with ES2024+ features
- **Build**: Vite with HMR for instant iteration
- **Audio**: Web Audio API with AudioWorklet for low-latency sound
- **Input**: Pointer Lock API, Gamepad API, keyboard/touch unified input
- **State**: ECS (Entity-Component-System) architecture
- **UI**: HTML/CSS overlay for menus and HUD (not canvas-rendered UI)
- **Styling**: Modern CSS with container queries, `oklch()` color space, view transitions

## Design Principles
1. **Visual-first**: Every game must look stunning in 2026. Use bloom, ambient occlusion, PBR materials, particle systems, and post-processing by default.
2. **60fps minimum**: All rendering paths must maintain 60fps on mid-range hardware. Profile GPU workloads.
3. **Modular architecture**: Each system (renderer, physics, input, audio, UI) is independent and hot-swappable.
4. **Progressive enhancement**: Core gameplay works without audio/particles. Effects layer on top.
5. **Modern aesthetics**: Clean typography (Inter/Space Grotesk), glassmorphism menus, smooth animations, cinematic camera.

## Per-Game Folder Convention
Each game gets its own self-contained folder inside `games/`. The folder name is the game title in kebab-case (e.g., "Space Pirates" → `games/space-pirates/`). Each game folder is a complete standalone project with its own `package.json`, `tsconfig.json`, and `node_modules`.

```
games/
  space-pirates/          # One game
    docs/
      GAME_DESIGN.md      # Full design document
    src/
      main.ts             # Entry point
      core/               # ECS, game loop, event bus
      renderer/           # WebGPU pipeline, shaders, materials
        shaders/          # .wgsl shader files
        pipelines/        # Render pipeline configs
        postprocess/      # Post-processing effects
      gameplay/           # Game-specific logic, systems
      physics/            # Collision, spatial partitioning
      input/              # Unified input manager
      audio/              # Sound engine, music, SFX
      ui/                 # HTML/CSS overlay UI
        components/       # Menu, HUD, dialog components
        styles/           # CSS with design tokens
      assets/             # Procedural generation, loaders
      utils/              # Math, helpers, debug tools
    index.html
    package.json
    tsconfig.json
    vite.config.ts
  neon-drift/             # Another game
    docs/
    src/
    ...
```

## Code Conventions
- Use `const` by default, `let` only when mutation is necessary
- All WebGPU resources must be explicitly destroyed in cleanup
- Shader code in separate `.wgsl` files, imported as strings via Vite
- Use `requestAnimationFrame` for the game loop, never `setInterval`
- All async operations use `async/await`, no raw Promises
- Error boundaries: wrap GPU operations in try/catch with meaningful messages
- Every system exports an `init()`, `update(dt)`, `render()`, and `destroy()` interface

## Agent Workflow
The entire pipeline is automated in a single command:

**`/webgpu-game-factory:game [idea]`** - Runs the full pipeline automatically:
1. **Concept** → asks targeted questions (including game title), builds design doc
2. **Folder** → creates `games/<game-name>/` with all subdirectories
3. **Setup** → initializes npm project, TypeScript, Vite inside the game folder
4. **Build** → deploys 5 specialist agents in parallel (renderer, gameplay, UI, audio, assets), then integrator
5. **Verify** → runs `tsc --noEmit` and `vite build` from the game folder, fixes errors
6. **Preview** → starts Vite dev server from the game folder, opens browser, takes screenshot
7. **Iterate** → asks for feedback, makes changes, loops until satisfied

Standalone skills are available for re-running individual stages:
- `/webgpu-game-factory:game-build [game-name]` - Re-run build only
- `/webgpu-game-factory:game-preview [game-name]` - Re-launch preview only
- `/webgpu-game-factory:game-iterate [game-name] [feedback]` - One-off improvements only

## Quality Gates
- All WGSL shaders must have correct `@group` and `@binding` annotations
- Every component must handle `device.lost` gracefully
- UI must be responsive (mobile-aware even for desktop-first games)
- Frame time budget: 16.6ms total, 10ms for render, 4ms for logic, 2ms for audio/input
