/**
 * 42 Guns - Main Entry Point
 * WebGPU-powered endless synthwave shoot-em-up
 */

// Core
import { World } from './core/ecs';
import { eventBus } from './core/event-bus';
import { MovementSystem } from './core/movement-system';
import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PLAYER_START_HP,
  PLAYER_SIZE,
  PLAYER_FIRE_RATE,
} from './core/constants';

// Renderer
import { SpritePipeline, SpriteInstance } from './renderer/pipelines/sprite-pipeline';
import { ParticlePipeline, PARTICLE_PRESETS } from './renderer/pipelines/particle-pipeline';
import { BackgroundPipeline } from './renderer/pipelines/background-pipeline';
import { PostProcessPipeline } from './renderer/postprocess/post-process-pipeline';

// Gameplay
import {
  COMPONENT,
  TransformData,
  VelocityData,
  SpriteData,
  HealthData,
  WeaponData,
  WeaponType,
  ColliderData,
  CollisionLayer,
  PlayerInputData,
  Faction,
} from './gameplay/components';
import { PlayerMovementSystem } from './gameplay/player-system';
import { WeaponSystem } from './gameplay/weapon-system';
import { EnemyAISystem } from './gameplay/enemy-ai-system';
import { CollisionSystem } from './gameplay/collision-system';
import { DamageSystem } from './gameplay/damage-system';
import { WaveSystem } from './gameplay/wave-system';
import { PowerUpSystem } from './gameplay/powerup-system';
import { ScoreSystem } from './gameplay/score-system';
import { GameStateMachine, GameState } from './gameplay/game-state';

// Input
import { InputManager } from './input/input-manager';

// Audio
import { AudioManager } from './audio/audio-manager';

// UI
import { UIManager } from './ui/ui-manager';

// Assets
import { MESH_ID } from './assets/mesh-data';

// Loading screen helpers
function updateLoadingProgress(percent: number, status: string): void {
  const bar = document.getElementById('loader-bar');
  const statusEl = document.getElementById('loading-status');
  if (bar) bar.style.width = `${percent}%`;
  if (statusEl) statusEl.textContent = status;
}

function hideLoadingScreen(): void {
  const screen = document.getElementById('loading-screen');
  if (screen) {
    screen.style.opacity = '0';
    setTimeout(() => screen.remove(), 500);
  }
}

function showError(message: string): void {
  const statusEl = document.getElementById('loading-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = 'oklch(0.65 0.25 25)';
  }
}

// WebGPU initialization
async function initWebGPU(): Promise<{
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  canvas: HTMLCanvasElement;
}> {
  updateLoadingProgress(10, 'Checking WebGPU support...');

  if (!navigator.gpu) {
    throw new Error(
      'WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.',
    );
  }

  updateLoadingProgress(20, 'Requesting GPU adapter...');
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: 'high-performance',
  });

  if (!adapter) {
    throw new Error('Failed to get GPU adapter. Your GPU may not support WebGPU.');
  }

  updateLoadingProgress(40, 'Requesting GPU device...');
  const device = await adapter.requestDevice({
    requiredFeatures: [],
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
    },
  });

  // Handle device loss
  device.lost.then((info) => {
    console.error(`WebGPU device lost: ${info.message}`);
    if (info.reason !== 'destroyed') {
      console.log('Attempting to recover...');
      init();
    }
  });

  updateLoadingProgress(60, 'Configuring canvas...');
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  const context = canvas.getContext('webgpu');
  if (!context) {
    throw new Error('Failed to get WebGPU context from canvas');
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  updateLoadingProgress(80, 'GPU ready');

  return { device, context, format, canvas };
}

// === GAME STATE ===
let device: GPUDevice;
let context: GPUCanvasContext;
let canvasFormat: GPUTextureFormat;

// Systems
let world: World;
let inputManager: InputManager;
let playerMovement: PlayerMovementSystem;
let weaponSystem: WeaponSystem;
let enemyAI: EnemyAISystem;
let collisionSystem: CollisionSystem;
let damageSystem: DamageSystem;
let waveSystem: WaveSystem;
let powerUpSystem: PowerUpSystem;
let scoreSystem: ScoreSystem;
let movementSystem: MovementSystem;
let gameState: GameStateMachine;

// Renderer
let spritePipeline: SpritePipeline;
let particlePipeline: ParticlePipeline;
let backgroundPipeline: BackgroundPipeline;
let postProcess: PostProcessPipeline;

// Audio & UI
let audioManager: AudioManager;
let uiManager: UIManager;

// Game state
let bombs = 0;
let shieldHits = 0;
let running = false;
let lastTime = 0;

// Create the player entity
function createPlayer(): void {
  const player = world.createEntity();

  world.addComponent<TransformData>(player, COMPONENT.TRANSFORM, {
    x: SCREEN_WIDTH / 2,
    y: SCREEN_HEIGHT - 80,
    rotation: 0,
    scaleX: PLAYER_SIZE,
    scaleY: PLAYER_SIZE,
  });

  world.addComponent<VelocityData>(player, COMPONENT.VELOCITY, {
    vx: 0,
    vy: 0,
    angularVelocity: 0,
  });

  world.addComponent<SpriteData>(player, COMPONENT.SPRITE, {
    meshId: MESH_ID.PLAYER_SHIP,
    r: 0.15,
    g: 0.78,
    b: 0.88,
    a: 1.0,
    emissive: 0.6,
  });

  world.addComponent<HealthData>(player, COMPONENT.HEALTH, {
    current: PLAYER_START_HP,
    max: PLAYER_START_HP,
    invincible: false,
    invincibleTimer: 0,
  });

  world.addComponent<WeaponData>(player, COMPONENT.WEAPON, {
    type: WeaponType.Single,
    fireRate: PLAYER_FIRE_RATE,
    cooldown: 0,
    level: 0,
  });

  world.addComponent<ColliderData>(player, COMPONENT.COLLIDER, {
    radius: PLAYER_SIZE / 3,
    layer: CollisionLayer.Player,
  });

  world.addComponent<PlayerInputData>(player, COMPONENT.PLAYER_INPUT, {
    moveX: 0,
    moveY: 0,
    firing: false,
    bomb: false,
  });

  playerMovement.setPlayer(player);
}

function startGame(): void {
  // Reset world
  world.clear();
  scoreSystem.reset();
  waveSystem.reset();
  powerUpSystem.reset();
  bombs = 3; // Start with 3 bombs
  shieldHits = 0;

  // Create player
  createPlayer();

  // Start waves
  waveSystem.startFirstWave(world);
}

function setupGameEvents(): void {
  // Game start
  eventBus.on('game:start', () => {
    audioManager.getEngine().ensureResumed();
    startGame();
  });

  // Player damage
  eventBus.on<{ amount: number }>('player:damage', (data) => {
    if (!data) return;

    // Check shield first
    if (shieldHits > 0) {
      shieldHits--;
      eventBus.emit('explosion', {
        x: playerMovement.getPosition(world)?.x ?? SCREEN_WIDTH / 2,
        y: playerMovement.getPosition(world)?.y ?? SCREEN_HEIGHT - 80,
        size: 'small',
      });
      return;
    }

    const isDead = playerMovement.applyDamage(world, data.amount);
    if (isDead) {
      // Game over
      const pos = playerMovement.getPosition(world);
      if (pos) {
        particlePipeline.emit(PARTICLE_PRESETS.explosion(pos.x, pos.y, 3));
      }
      eventBus.emit('game:over');
      uiManager.showGameOver(
        scoreSystem.getScore(),
        scoreSystem.getWaveReached(),
        scoreSystem.getEnemiesDestroyed(),
        scoreSystem.isNewHighScore(),
      );
    } else {
      // Screen shake / chromatic burst
      postProcess.setChromatic(6);
      setTimeout(() => postProcess.setChromatic(1.5), 300);
    }
  });

  // Explosion particles
  eventBus.on<{ x: number; y: number; faction?: number; size?: string }>('explosion', (data) => {
    if (!data) return;
    const scale = data.size === 'large' ? 2 : 1;
    particlePipeline.emit(PARTICLE_PRESETS.explosion(data.x, data.y, scale));
  });

  eventBus.on<{ x: number; y: number }>('enemy:destroyed', (data) => {
    if (data) {
      particlePipeline.emit(PARTICLE_PRESETS.debris(data.x, data.y, [0.5, 0.5, 0.5, 1]));
    }
  });

  // Power-up events
  eventBus.on('powerup:spreadshot', () => {
    const player = playerMovement.getPlayerEntity();
    if (player !== null) {
      weaponSystem.upgradeWeapon(world, player);
    }
  });

  eventBus.on<{ hits: number }>('powerup:shield', (data) => {
    if (data) shieldHits = data.hits;
  });

  eventBus.on('powerup:bomb', () => {
    bombs = Math.min(bombs + 1, 3);
  });

  eventBus.on<{ x: number; y: number }>('powerup:collect', (data) => {
    if (data) {
      particlePipeline.emit(PARTICLE_PRESETS.powerupCollect(data.x, data.y));
    }
  });

  // Bomb usage
  eventBus.on('input:bomb', () => {
    if (!gameState.isPlaying()) return;
    if (bombs <= 0) return;
    bombs--;

    // Screen bomb: destroy all enemy bullets and damage all enemies
    const enemies = world.query(COMPONENT.ENEMY);
    for (const entity of enemies) {
      const health = world.getComponent<HealthData>(entity, COMPONENT.HEALTH);
      const transform = world.getComponent<TransformData>(entity, COMPONENT.TRANSFORM);
      if (health) {
        health.current -= 3;
        if (health.current <= 0 && transform) {
          eventBus.emit('score:add', { value: 100 });
          eventBus.emit('enemy:destroyed', { x: transform.x, y: transform.y, faction: 0 });
          eventBus.emit('explosion', { x: transform.x, y: transform.y, size: 'small' });
          world.destroyEntity(entity);
        }
      }
    }

    // Clear enemy bullets
    const bullets = world.query(COMPONENT.BULLET);
    for (const entity of bullets) {
      const collider = world.getComponent<ColliderData>(entity, COMPONENT.COLLIDER);
      if (collider && collider.layer === CollisionLayer.EnemyBullet) {
        world.destroyEntity(entity);
      }
    }

    // Visual: big chromatic + bloom burst
    postProcess.setChromatic(8);
    postProcess.setBloomIntensity(2.0);
    setTimeout(() => {
      postProcess.setChromatic(1.5);
      postProcess.setBloomIntensity(0.8);
    }, 500);
  });

  // Difficulty update
  eventBus.on<{ bulletSpeedMult: number }>('difficulty:update', (data) => {
    if (data) {
      enemyAI.setBulletSpeedMultiplier(data.bulletSpeedMult);
    }
  });

  // Game menu reset
  eventBus.on('game:menu', () => {
    world.clear();
  });
}

// Collect all sprite instances for rendering
function collectSpriteInstances(): SpriteInstance[] {
  const entities = world.query(COMPONENT.TRANSFORM, COMPONENT.SPRITE);
  const instances: SpriteInstance[] = [];

  for (const entity of entities) {
    const transform = world.getComponent<TransformData>(entity, COMPONENT.TRANSFORM)!;
    const sprite = world.getComponent<SpriteData>(entity, COMPONENT.SPRITE)!;

    instances.push({
      posX: transform.x,
      posY: transform.y,
      rotation: transform.rotation,
      scaleX: transform.scaleX,
      scaleY: transform.scaleY,
      r: sprite.r,
      g: sprite.g,
      b: sprite.b,
      a: sprite.a,
      emissive: sprite.emissive,
      meshId: sprite.meshId,
    });
  }

  return instances;
}

// Main game loop
function gameLoop(currentTime: number): void {
  if (!running) return;
  requestAnimationFrame(gameLoop);

  const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms
  lastTime = currentTime;

  const input = inputManager.getState();

  // === UPDATE ===
  inputManager.update();

  // Handle menu input
  if (!gameState.isPlaying()) {
    uiManager.handleMenuInput(
      {
        moveY: input.moveY,
        confirmJustPressed: input.confirmJustPressed,
        backJustPressed: input.backJustPressed,
      },
      gameState.getState(),
    );
  }

  if (gameState.isPlaying()) {
    // Emit player position for enemy targeting
    const playerPos = playerMovement.getPosition(world);
    if (playerPos) {
      eventBus.emit('player:position', playerPos);
    }

    // Update systems in order
    playerMovement.update(dt, world, input);
    enemyAI.update(dt, world);
    weaponSystem.update(dt, world, input.fire, playerMovement.getPlayerEntity());
    movementSystem.update(dt, world);

    const collisions = collisionSystem.update(dt, world);
    damageSystem.update(dt, world, collisions);
    powerUpSystem.update(dt, world);
    waveSystem.update(dt, world);
    scoreSystem.update(dt);

    // Player engine trail particles
    if (playerPos && Math.random() < 0.5) {
      particlePipeline.emit(PARTICLE_PRESETS.trail(playerPos.x, playerPos.y + PLAYER_SIZE / 2));
    }

    // Flush destroyed entities
    world.flush();

    // Update HUD
    const player = playerMovement.getPlayerEntity();
    const health = player !== null ? world.getComponent<HealthData>(player, COMPONENT.HEALTH) : null;
    uiManager.updateHUD({
      score: scoreSystem.getDisplayScore(),
      multiplier: scoreSystem.getMultiplier(),
      multiplierActive: scoreSystem.getMultiplier() > 1,
      wave: waveSystem.getCurrentWave(),
      highScore: scoreSystem.getHighScore(),
      health: health?.current ?? 0,
      maxHealth: health?.max ?? PLAYER_START_HP,
      bombs,
      shieldHits,
    });

    // Update vignette based on health
    if (health) {
      const healthRatio = health.current / health.max;
      postProcess.setVignette(0.3 + (1 - healthRatio) * 0.4);
    }
  }

  // === RENDER ===
  // Update renderer timing
  backgroundPipeline.update(dt);
  particlePipeline.update(dt);
  spritePipeline.updateTime(currentTime / 1000);

  // Render to HDR target
  const hdrView = postProcess.hdrRenderTarget;
  const encoder = device.createCommandEncoder({ label: 'Main Render' });

  // Background pass (clears the HDR target)
  const bgPass = encoder.beginRenderPass({
    label: 'Background Pass',
    colorAttachments: [
      {
        view: hdrView,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0.01, g: 0.01, b: 0.04, a: 1 },
      },
    ],
  });
  backgroundPipeline.renderBackground(bgPass);
  backgroundPipeline.renderStars(bgPass);
  bgPass.end();

  // Sprite + particle pass (loads existing content)
  if (gameState.isPlaying() || gameState.isPaused()) {
    const spritePass = encoder.beginRenderPass({
      label: 'Sprite Pass',
      colorAttachments: [
        {
          view: hdrView,
          loadOp: 'load',
          storeOp: 'store',
        },
      ],
    });

    const instances = collectSpriteInstances();
    spritePipeline.render(spritePass, instances);
    particlePipeline.render(spritePass);

    spritePass.end();
  }

  device.queue.submit([encoder.finish()]);

  // Post-processing: HDR -> canvas
  const canvasTexture = context.getCurrentTexture();
  postProcess.render(canvasTexture.createView());
}

// Main initialization
async function init(): Promise<void> {
  try {
    const gpu = await initWebGPU();
    device = gpu.device;
    context = gpu.context;
    canvasFormat = gpu.format;

    updateLoadingProgress(85, 'Initializing render pipelines...');

    // Initialize renderer
    spritePipeline = new SpritePipeline();
    await spritePipeline.init(device, 'rgba16float', SCREEN_WIDTH, SCREEN_HEIGHT);

    particlePipeline = new ParticlePipeline();
    await particlePipeline.init(
      device,
      'rgba16float',
      spritePipeline.cameraLayout,
      spritePipeline.cameraGroup,
    );

    backgroundPipeline = new BackgroundPipeline();
    await backgroundPipeline.init(
      device,
      'rgba16float',
      spritePipeline.cameraLayout,
      spritePipeline.cameraGroup,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
    );

    postProcess = new PostProcessPipeline();
    await postProcess.init(device, canvasFormat, SCREEN_WIDTH, SCREEN_HEIGHT);

    updateLoadingProgress(90, 'Initializing game systems...');

    // Initialize ECS and gameplay systems
    world = new World();
    inputManager = new InputManager();
    playerMovement = new PlayerMovementSystem();
    weaponSystem = new WeaponSystem();
    enemyAI = new EnemyAISystem();
    collisionSystem = new CollisionSystem();
    damageSystem = new DamageSystem();
    waveSystem = new WaveSystem();
    powerUpSystem = new PowerUpSystem();
    scoreSystem = new ScoreSystem();
    movementSystem = new MovementSystem();
    gameState = new GameStateMachine();

    inputManager.init();
    enemyAI.init();
    waveSystem.init();
    powerUpSystem.init();
    scoreSystem.init();
    gameState.init();

    updateLoadingProgress(95, 'Initializing audio and UI...');

    // Initialize audio
    audioManager = new AudioManager();
    await audioManager.init();

    // Initialize UI
    uiManager = new UIManager();
    uiManager.init();

    // Setup game event handlers
    setupGameEvents();

    // Handle window resize
    window.addEventListener('resize', () => {
      const canvas = gpu.canvas;
      canvas.width = SCREEN_WIDTH;
      canvas.height = SCREEN_HEIGHT;
      spritePipeline.updateProjection(SCREEN_WIDTH, SCREEN_HEIGHT);
      backgroundPipeline.updateSize(SCREEN_WIDTH, SCREEN_HEIGHT);
      postProcess.resize(SCREEN_WIDTH, SCREEN_HEIGHT);
    });

    console.log('42 Guns initialized successfully');
    console.log(`Canvas: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}`);
    console.log(`Format: ${canvasFormat}`);

    updateLoadingProgress(100, 'Ready!');

    setTimeout(() => {
      hideLoadingScreen();

      // Start game loop
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);
    }, 300);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error during initialization';
    console.error('Failed to initialize 42 Guns:', message);
    showError(message);
  }
}

// Start the game
init();
