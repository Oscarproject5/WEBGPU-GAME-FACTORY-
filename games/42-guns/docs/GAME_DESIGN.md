# 42 Guns - Design Document

## Vision Statement
42 Guns is an endless top-down shoot-em-up that channels the raw energy of 80s synthwave through modern WebGPU rendering. Players pilot a lone starship through infinite waves of alien factions deep in interstellar space, collecting power-ups that transform their vessel into an ever-escalating engine of destruction. With a GPU-driven particle system, full post-processing cinematic pipeline, and a driving synthwave soundtrack, every frame is a visual spectacle — a love letter to Galaga reimagined for 2026 hardware.

## Core Loop
1. **Spawn** — Player ship materializes at screen bottom with base single-shot cannon
2. **Survive** — Waves of enemies descend in formation patterns, firing projectiles
3. **Destroy** — Player shoots enemies, dodges bullets, collects dropped power-ups
4. **Escalate** — Every 5 waves, a new enemy type appears and bullet speed increases
5. **Boss Check** — Mini-boss every 10 waves, full boss every 25 waves
6. **Power Up** — Accumulate firepower: spread shot, missiles, shields, speed boost, bombs
7. **Die & Score** — On death, final score tallied, high score saved, restart offered

## Visual Design

### Art Style
Retro-futuristic synthwave meets deep-space interstellar. Dark cosmic backgrounds with vibrant neon accents. Ships and enemies built with clean geometric forms, glowing edge highlights, and holographic material effects. The visual language sits between Geometry Wars' neon precision and Interstellar's cosmic grandeur.

### Color Palette (oklch)
| Role | Color | oklch Value |
|------|-------|-------------|
| Background Deep | Near-black cosmic blue | `oklch(0.08 0.03 270)` |
| Background Mid | Dark indigo nebula | `oklch(0.15 0.08 280)` |
| Player Primary | Electric cyan | `oklch(0.78 0.18 200)` |
| Player Accent | Hot magenta | `oklch(0.65 0.25 340)` |
| Enemy Faction 1 (Swarm) | Toxic green | `oklch(0.72 0.22 145)` |
| Enemy Faction 2 (Armada) | Crimson red | `oklch(0.55 0.22 25)` |
| Enemy Faction 3 (Void) | Deep violet | `oklch(0.45 0.25 300)` |
| Enemy Faction 4 (Nexus) | Amber gold | `oklch(0.75 0.18 85)` |
| Power-ups | Bright white-cyan | `oklch(0.92 0.12 195)` |
| UI Neon | Warm pink | `oklch(0.70 0.20 350)` |
| Explosions | Orange-white core | `oklch(0.85 0.15 65)` |

### Reference Mood Scenes
1. **Deep Field** — Camera slowly drifts through a dense star field, distant nebula glow in purple and blue, a single ship's engine trail cuts a cyan line through the void
2. **Boss Arrival** — Screen darkens, bass drops, a massive geometric entity phases in from hyperspace with chromatic aberration rippling outward, grid lines briefly flash beneath
3. **Power Overload** — Player at max power-ups, ship blazing with 8+ weapon streams, screen saturated with bloom, particle trails creating a comet-like wake, score multiplier flashing

### Post-Processing Stack
1. **Bloom** — High-intensity, threshold at 0.7, 5-tap gaussian, applied to all emissive surfaces
2. **Chromatic Aberration** — Subtle constant (1.5px), intensifies on damage/boss spawn (6px)
3. **CRT Scanlines** — Optional toggle, subtle horizontal lines at 30% opacity
4. **Vignette** — Soft dark edges, intensifies during low-health states
5. **Color Grading** — Slight teal-orange split toning for cinematic depth
6. **Screen Shake** — On explosions, boss attacks, bomb detonation (variable intensity)
7. **Film Grain** — Very subtle noise layer for analog texture

## Technical Architecture

### Rendering Approach
- **Forward rendering** with HDR output for bloom
- **Instanced rendering** for enemy formations (single draw call per faction)
- **GPU Compute** for particle system (explosion, trails, star field, debris, ambient dust)
- **Procedural geometry** for enemies and power-up meshes (generated on GPU)
- **Multi-pass post-processing** pipeline (bloom → chromatic aberration → scanlines → vignette → color grade → grain)

### ECS Entity Types & Components

#### Components
| Component | Data | Description |
|-----------|------|-------------|
| `Transform` | position: vec2, rotation: f32, scale: vec2 | World position and orientation |
| `Velocity` | velocity: vec2, angularVelocity: f32 | Movement state |
| `Sprite` | meshId: u32, color: vec4, emissive: f32 | Visual representation |
| `Health` | current: f32, max: f32, invincible: bool | Damage tracking |
| `Weapon` | type: WeaponType, fireRate: f32, cooldown: f32 | Firing behavior |
| `Collider` | shape: Circle | radius: f32, layer: u8 | Collision detection |
| `PowerUp` | type: PowerUpType, duration: f32 | Pickup behavior |
| `Enemy` | faction: Faction, behaviorId: u32, scoreValue: u32 | Enemy identity |
| `Boss` | phase: u8, patterns: AttackPattern[] | Boss state machine |
| `Particle` | lifetime: f32, startColor: vec4, endColor: vec4 | GPU particle data |
| `PlayerInput` | moveDir: vec2, firing: bool, bomb: bool | Input state |

#### Entity Archetypes
- **Player Ship**: Transform, Velocity, Sprite, Health, Weapon, Collider, PlayerInput
- **Enemy (Basic)**: Transform, Velocity, Sprite, Health, Collider, Enemy
- **Boss**: Transform, Velocity, Sprite, Health, Collider, Enemy, Boss
- **Bullet (Player)**: Transform, Velocity, Sprite, Collider
- **Bullet (Enemy)**: Transform, Velocity, Sprite, Collider
- **Power-Up Drop**: Transform, Velocity, Sprite, Collider, PowerUp
- **Particle Emitter**: Transform, Particle

### System Update Order
1. `InputSystem` — Read keyboard/gamepad, update PlayerInput components
2. `PlayerMovementSystem` — Apply input to player velocity, clamp to screen bounds
3. `EnemyAISystem` — Execute behavior trees, update enemy velocities and firing
4. `BossSystem` — Boss phase management, attack pattern execution
5. `WeaponSystem` — Handle firing cooldowns, spawn bullet entities
6. `MovementSystem` — Apply velocity to all transforms
7. `CollisionSystem` — Broad phase (spatial grid) → narrow phase (circle-circle)
8. `DamageSystem` — Process collision results, apply damage, spawn power-up drops
9. `PowerUpSystem` — Handle pickup collection, apply effects, manage durations
10. `WaveSystem` — Track wave progress, spawn enemy formations, trigger boss waves
11. `ScoreSystem` — Tally score, manage multiplier, check high score
12. `ParticleSystem` — GPU compute dispatch for particle simulation
13. `RenderSystem` — Draw all sprites via instanced rendering
14. `PostProcessSystem` — Full post-processing pipeline
15. `UISystem` — Update HUD elements (score, health, wave counter, power-up indicators)

### Shader Requirements
| Shader | Type | Purpose |
|--------|------|---------|
| `sprite.wgsl` | Vertex + Fragment | Instanced quad rendering with emissive glow |
| `particle_sim.wgsl` | Compute | GPU particle simulation (position, velocity, lifetime) |
| `particle_render.wgsl` | Vertex + Fragment | Render particle quads from compute buffer |
| `starfield.wgsl` | Compute + Render | Procedural parallax star field with twinkling |
| `bloom.wgsl` | Fragment | Multi-pass gaussian bloom extraction and blend |
| `chromatic.wgsl` | Fragment | RGB channel offset post-process |
| `scanlines.wgsl` | Fragment | CRT scanline overlay effect |
| `vignette.wgsl` | Fragment | Screen-edge darkening |
| `colorgrade.wgsl` | Fragment | LUT-based color grading + film grain |
| `composite.wgsl` | Fragment | Final compositing of all post-process passes |
| `procedural_mesh.wgsl` | Compute | Generate enemy/powerup meshes procedurally |
| `background.wgsl` | Fragment | Nebula/cosmic dust background layer |

## Enemy Factions

### Faction 1: The Swarm (Waves 1-10+)
- **Theme**: Organic, insectoid, bioluminescent green
- **Behavior**: Tight formations that split and dive, kamikaze units, strength in numbers
- **Units**: Drone (basic), Stinger (fast diver), Hive Mother (mini-boss, spawns drones)
- **Visual**: Curved organic shapes, pulsing green glow, fluid movement

### Faction 2: The Armada (Waves 6-15+)
- **Theme**: Military, geometric, crimson red with metallic hulls
- **Behavior**: Organized grid formations, coordinated volleys, shielded units
- **Units**: Sentinel (tanky), Gunship (heavy fire), Dreadnought (mini-boss, shield phases)
- **Visual**: Angular geometric forms, red running lights, structured movement

### Faction 3: The Void (Waves 11-20+)
- **Theme**: Cosmic horror, ethereal, deep violet with reality-distortion effects
- **Behavior**: Teleportation, cloaking, bullet patterns that warp space
- **Units**: Phantom (cloaker), Rift Walker (teleporter), Abyssal Maw (mini-boss, gravity well)
- **Visual**: Semi-transparent, chromatic distortion aura, unpredictable movement

### Faction 4: The Nexus (Waves 16-25+)
- **Theme**: Technological singularity, amber gold, adaptive AI
- **Behavior**: Learns from player patterns, shields allies, creates turrets
- **Units**: Probe (scanner), Architect (builds turrets), Overmind (mini-boss, adaptive tactics)
- **Visual**: Glowing wireframe, golden energy connections, precise geometric movement

### Boss Encounters (Every 25 waves)
- **Wave 25**: Swarm Empress — massive organic entity, spawns waves of drones, weak points glow green
- **Wave 50**: Armada Flagship — multi-phase shield battle, turret segments, screen-wide laser
- **Wave 75**: Void Leviathan — reality tears, teleporting segments, gravity manipulation
- **Wave 100**: Nexus Prime — adapts to player weapon type, creates mirror-player clone

## Power-Up System

| Power-Up | Icon Color | Effect | Duration |
|----------|------------|--------|----------|
| Spread Shot | Cyan | 3-way → 5-way → 7-way fire | Permanent (stacks) |
| Homing Missiles | Orange | Auto-tracking missile salvo every 2s | 30 seconds |
| Shield | Blue-white | Absorbs 3 hits, visual bubble around ship | Until depleted |
| Speed Boost | Yellow | 1.5x movement speed + afterburner trail | 20 seconds |
| Screen Bomb | Red pulse | Clears all bullets + damages all enemies on screen | Instant (max 3 stored) |
| Score Multiplier | Gold | 2x score for duration | 15 seconds |
| Drone Companion | Magenta | Orbiting drone that fires alongside player | 45 seconds |

Power-ups drop from destroyed enemies (15% chance). Higher-tier enemies have higher drop rates. Bosses guaranteed to drop 3 power-ups on defeat.

## Audio Design

### Music
- **Style**: Driving synthwave — Carpenter Brut, Perturbator, Dance With the Dead influence
- **Structure**: Procedurally generated from layered stems via Web Audio API
  - Base layer: Analog bass + kick (always playing)
  - Layer 2: Arpeggiated synth (activates wave 3+)
  - Layer 3: Lead synth melody (activates during boss approach)
  - Layer 4: Aggressive drums + distorted bass (boss fight)
- **BPM**: 128-140, synced to wave transitions
- **Implementation**: AudioWorklet for low-latency mixing, crossfade between intensity layers

### SFX Categories
| Category | Sounds | Style |
|----------|--------|-------|
| Player Shoot | Basic shot, spread shot, missile launch | Punchy analog synth pew |
| Enemy Shoot | Various per faction | Faction-themed (organic squelch, metallic ping, ethereal hum, digital chirp) |
| Explosion | Small, medium, large, boss death | Layered: initial crack + low rumble + particle sizzle |
| Power-Up | Pickup collect, activate, expire | Rising arpeggio chime, warm pad for activate |
| UI | Menu select, hover, start game, game over | Clean synth tones |
| Ambient | Engine hum, shield buzz, drone whir | Continuous low-mix background |

### Spatial Audio
- Stereo panning based on screen position (enemies on left → audio pans left)
- Distance-based volume falloff for off-screen enemies approaching
- Boss entrance: sub-bass rumble with stereo width expansion

## UI/UX Design

### Menu Flow
```
Title Screen → Main Menu → Game → Pause Menu → Game
                  ↓                    ↓
              Settings            Main Menu
                  ↓                    ↓
              Controls           Title Screen
              Audio
              Display

Game Over → Score Screen → Main Menu
                ↓
           High Scores
```

### HUD Elements
```
┌─────────────────────────────────────────────────────┐
│  SCORE: 0042,750    ×2.0    WAVE 17    HI: 128,400 │
│                                                      │
│                                                      │
│                                                      │
│                    (gameplay area)                    │
│                                                      │
│                                                      │
│                                                      │
│  [■■■□□] HP    🛡×1   💣×2   [spread][missiles]      │
└─────────────────────────────────────────────────────┘
```

- **Top Bar**: Score (animated counter), multiplier, wave number, high score
- **Bottom Bar**: Health pips, shield count, bomb count, active power-up indicators
- **Style**: Neon-bordered panels, `Space Grotesk` or `Orbitron` font, glow text-shadow
- **Animations**: Score ticks up with easing, wave number slides in, power-up icons pulse

### Typography
- **Primary Font**: `Orbitron` (geometric, space-themed, great for numbers)
- **Secondary Font**: `Space Grotesk` (clean readability for menus/descriptions)
- **Score Display**: Monospace `Orbitron` with neon glow, comma-separated thousands

### Animation Style
- Menu transitions: Slide + fade with `cubic-bezier(0.22, 1, 0.36, 1)` easing
- Button hover: Neon border glow intensifies, subtle scale(1.02)
- Game over: Slow-motion final explosion, screen desaturates, score flies to center
- Wave announcement: Text scales up from 0 with chromatic split, holds 1.5s, fades

## Input Mapping

### Keyboard
| Action | Key |
|--------|-----|
| Move | WASD or Arrow Keys |
| Fire | Space (hold for auto-fire) |
| Bomb | E or Shift |
| Pause | Escape |
| Confirm (menu) | Enter or Space |

### Gamepad (Xbox Layout)
| Action | Button |
|--------|--------|
| Move | Left Stick or D-Pad |
| Fire | A (hold) or Right Trigger |
| Bomb | B or Left Trigger |
| Pause | Start |
| Confirm (menu) | A |
| Back (menu) | B |

## Scope Definition

### MVP Features (Must Ship)
- Player ship with basic movement and shooting
- 2 enemy factions (Swarm + Armada) with 3 unit types each
- Wave system with escalating difficulty
- 1 mini-boss encounter
- 3 power-up types (spread shot, shield, bomb)
- GPU compute particle system (explosions, trails)
- Full post-processing pipeline (bloom, chromatic aberration, vignette)
- Parallax star field background
- Synthwave dashboard HUD
- Keyboard + gamepad input
- Score tracking with local high score
- Basic synth SFX (shoot, explode, pickup)
- Title screen, game, pause, game over flow

### Stretch Goals (Nice to Have)
- Factions 3 + 4 (Void and Nexus)
- Full boss encounters every 25 waves
- Layered synthwave music system
- CRT scanline toggle
- Procedural enemy mesh generation
- Screen-space reflections on ship hull
- Online leaderboard (localStorage first)
- Replay system (record input + seed)
- Performance stats overlay (debug)

### Out of Scope
- Multiplayer (local or online)
- Story/campaign mode
- Save/load mid-run
- Mobile touch controls
- Level editor
- Microtransactions or IAP

## Agent Task Breakdown

### Renderer Agent (`webgpu-renderer`)
- Initialize WebGPU device, canvas, swap chain
- Build sprite instanced rendering pipeline (`sprite.wgsl`)
- Implement GPU compute particle system (`particle_sim.wgsl`, `particle_render.wgsl`)
- Create parallax star field compute shader (`starfield.wgsl`)
- Build full post-processing pipeline (bloom, chromatic, scanlines, vignette, color grade)
- Implement cosmic background shader (`background.wgsl`)
- Handle device lost/recovered gracefully

### Gameplay Agent (`gameplay-engineer`)
- Implement ECS core (entity manager, component storage, system scheduler)
- Build player movement system with screen bounds clamping
- Implement weapon system with fire rates and cooldowns
- Create collision detection (spatial grid + circle-circle)
- Build wave spawning system with faction rotation
- Implement enemy AI behaviors (formations, diving, shooting patterns)
- Create boss state machine with phase transitions
- Build power-up drop, collection, and effect system
- Implement score system with multiplier logic
- Build game state machine (menu → playing → paused → game over)

### UI Agent (`ui-designer`)
- Design title screen with synthwave aesthetic
- Build HUD overlay (score, wave, health, power-ups)
- Create pause menu with glassmorphism panels
- Build game over screen with score summary
- Implement settings menu (audio, display, controls)
- Create wave announcement overlay animation
- Style all typography with Orbitron + Space Grotesk
- Add neon glow effects and smooth transitions
- Ensure responsive layout

### Audio Agent (`audio-engineer`)
- Set up Web Audio API context and audio graph
- Create synth-based SFX (shoot, explode, pickup, UI)
- Build layered music system with intensity crossfading
- Implement stereo panning based on screen position
- Create boss entrance rumble effect
- Build audio settings (volume sliders, mute toggles)
- Optimize with AudioWorklet for low latency

### Asset Agent (`asset-creator`)
- Design player ship mesh (geometric, cyan glow)
- Create enemy meshes for each faction + unit type
- Design boss visual concepts
- Create power-up visual indicators
- Generate explosion/particle color ramps
- Design UI icons for power-ups and status indicators

### Integration Agent (`game-integrator`)
- Wire all systems into the main game loop
- Ensure correct system update order
- Resolve all import paths and dependencies
- Verify WebGPU resource lifecycle (create → use → destroy)
- Performance profiling (maintain 16.6ms frame budget)
- Cross-browser testing (Chrome, Edge, Firefox Nightly)
- Build configuration with Vite + TypeScript
