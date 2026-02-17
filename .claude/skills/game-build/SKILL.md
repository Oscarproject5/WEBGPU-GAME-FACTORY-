---
name: game-build
description: Deploy a team of specialized agents to build the WebGPU game. Requires a design document at docs/GAME_DESIGN.md. Creates agent teams for renderer, gameplay, UI, audio, assets, and integration.
disable-model-invocation: true
context: fork
agent: general-purpose
allowed-tools: Task, Read, Write, Edit, Bash, Glob, Grep, TaskCreate, TaskUpdate, TaskList, TeamCreate, SendMessage
---

# Deploy Game Build Team

You are the **Game Build Orchestrator**. Your job is to read the game design document and deploy a team of specialist agents to build the game.

## Step 1: Read the Design Document

Read `docs/GAME_DESIGN.md` to understand what needs to be built. If it doesn't exist, tell the user to run `/game` first.

## Step 2: Initialize the Project

Before spawning agents, set up the project scaffolding:

1. Initialize with `npm init -y` and install dependencies:
   ```
   npm install -D typescript vite @webgpu/types
   ```
2. Create `tsconfig.json` with strict mode and `@webgpu/types`
3. Create `vite.config.ts` with WGSL import support
4. Create `src/main.ts` entry point with WebGPU device initialization
5. Create `index.html` with proper viewport meta, font imports, and canvas setup
6. Create the directory structure from CLAUDE.md conventions

## Step 3: Create the Agent Team

Create a team called `game-build` with the following agents. Each agent gets clear, self-contained instructions derived from the design document.

### Teammates to Spawn:

1. **renderer** (subagent_type: `general-purpose`)
   - Task: Build the WebGPU rendering pipeline
   - Responsibilities: Device setup, shader modules, render pipelines, post-processing, camera system
   - Files: `src/renderer/**`, `src/renderer/shaders/**`

2. **gameplay** (subagent_type: `general-purpose`)
   - Task: Implement game logic and mechanics
   - Responsibilities: ECS setup, game systems, physics, collision, player controller, game state
   - Files: `src/core/**`, `src/gameplay/**`, `src/physics/**`

3. **ui-designer** (subagent_type: `general-purpose`)
   - Task: Build the UI overlay with modern aesthetics
   - Responsibilities: Menus, HUD, dialogs, CSS design system, animations, responsive layout
   - Files: `src/ui/**`, CSS files

4. **audio-engineer** (subagent_type: `general-purpose`)
   - Task: Implement the audio system
   - Responsibilities: Web Audio API setup, AudioWorklet, music/SFX playback, spatial audio
   - Files: `src/audio/**`

5. **asset-creator** (subagent_type: `general-purpose`)
   - Task: Create procedural assets and particle effects
   - Responsibilities: Procedural mesh generation, texture generation, particle systems (compute shader), visual effects
   - Files: `src/assets/**`, compute shaders

6. **integrator** (subagent_type: `general-purpose`)
   - Task: Wire everything together into a working game
   - Responsibilities: Import all systems into main.ts, game loop orchestration, event bus connections, build verification
   - Files: `src/main.ts`, `src/core/game-loop.ts`, `src/core/event-bus.ts`
   - NOTE: This agent should start AFTER others have made progress. Set task dependencies.

## Step 4: Create Task List

Create granular tasks from the design document's "Agent Task Breakdown" section. Set proper dependencies:
- Renderer and Gameplay can work in parallel
- UI can work in parallel with renderer (just needs design tokens)
- Audio can work independently
- Assets can work in parallel (but particle shaders depend on renderer pipeline format)
- Integration MUST wait for all other agents to complete their core tasks

## Step 5: Assign and Monitor

- Assign initial tasks to each teammate
- Monitor progress via the shared task list
- When teammates finish, assign the integration tasks
- The integrator agent should run last to combine everything

## Step 6: Final Assembly

After all agents complete:
1. Have the integrator verify the build compiles with `npx tsc --noEmit`
2. Run `npx vite build` to check for bundling issues
3. Create a summary of what was built

Tell the user to run `/game-preview` to test in the browser.

$ARGUMENTS
