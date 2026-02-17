/**
 * Wave System
 * Manages wave progression, enemy spawning, and difficulty escalation.
 */

import { World, Entity } from '../core/ecs';
import {
  COMPONENT,
  TransformData,
  VelocityData,
  SpriteData,
  HealthData,
  ColliderData,
  CollisionLayer,
  EnemyData,
  Faction,
} from './components';
import { MESH_ID } from '../assets/mesh-data';
import { BEHAVIOR } from './enemy-ai-system';
import {
  SCREEN_WIDTH,
  ENEMY_BASE_SIZE,
  MINIBOSS_SIZE,
  WAVE_PAUSE_DURATION,
  DIFFICULTY_ESCALATION_INTERVAL,
  BULLET_SPEED_INCREASE,
  SPAWN_RATE_INCREASE,
  MINIBOSS_INTERVAL,
  SCORE_BASIC_ENEMY,
  SCORE_TOUGH_ENEMY,
  SCORE_MINIBOSS,
} from '../core/constants';
import { eventBus } from '../core/event-bus';

interface WaveConfig {
  enemies: EnemySpawnConfig[];
  isBossWave: boolean;
}

interface EnemySpawnConfig {
  faction: Faction;
  behaviorId: number;
  meshId: number;
  count: number;
  hp: number;
  size: number;
  scoreValue: number;
  formationFn: (index: number, count: number) => { x: number; y: number };
}

export class WaveSystem {
  private currentWave = 0;
  private enemiesAlive = 0;
  private waveActive = false;
  private wavePauseTimer = 0;
  private waitingForNextWave = false;
  private difficultyMultiplier = 1.0;
  private spawnRateMultiplier = 1.0;

  init(): void {
    // Listen for enemy destroyed to track count
    eventBus.on('enemy:destroyed', () => {
      this.enemiesAlive--;
      if (this.enemiesAlive <= 0 && this.waveActive) {
        this.waveActive = false;
        this.waitingForNextWave = true;
        this.wavePauseTimer = WAVE_PAUSE_DURATION;
      }
    });
  }

  update(dt: number, world: World): void {
    if (this.waitingForNextWave) {
      this.wavePauseTimer -= dt;
      if (this.wavePauseTimer <= 0) {
        this.waitingForNextWave = false;
        this.startNextWave(world);
      }
    }
  }

  startFirstWave(world: World): void {
    this.currentWave = 0;
    this.difficultyMultiplier = 1.0;
    this.spawnRateMultiplier = 1.0;
    this.startNextWave(world);
  }

  private startNextWave(world: World): void {
    this.currentWave++;
    this.waveActive = true;

    // Difficulty escalation every N waves
    if (this.currentWave > 1 && (this.currentWave - 1) % DIFFICULTY_ESCALATION_INTERVAL === 0) {
      this.difficultyMultiplier += BULLET_SPEED_INCREASE;
      this.spawnRateMultiplier += SPAWN_RATE_INCREASE;
    }

    eventBus.emit('wave:start', { wave: this.currentWave });
    eventBus.emit('difficulty:update', { bulletSpeedMult: this.difficultyMultiplier });

    const config = this.generateWaveConfig(this.currentWave);
    this.spawnWave(world, config);
  }

  private generateWaveConfig(wave: number): WaveConfig {
    const enemies: EnemySpawnConfig[] = [];
    const isBossWave = wave % MINIBOSS_INTERVAL === 0;

    // Swarm enemies (always present from wave 1)
    if (wave >= 1) {
      // Drones: base count scales with wave
      const droneCount = Math.min(3 + Math.floor(wave * 0.8), 12);
      enemies.push({
        faction: Faction.Swarm,
        behaviorId: BEHAVIOR.SWARM_DRONE,
        meshId: MESH_ID.SWARM_DRONE,
        count: droneCount,
        hp: 1,
        size: ENEMY_BASE_SIZE,
        scoreValue: SCORE_BASIC_ENEMY,
        formationFn: (i, c) => ({
          x: SCREEN_WIDTH * 0.2 + (SCREEN_WIDTH * 0.6 / c) * i,
          y: -40 - i * 30,
        }),
      });
    }

    // Stingers from wave 3
    if (wave >= 3) {
      const stingerCount = Math.min(Math.floor((wave - 2) * 0.5), 5);
      if (stingerCount > 0) {
        enemies.push({
          faction: Faction.Swarm,
          behaviorId: BEHAVIOR.SWARM_STINGER,
          meshId: MESH_ID.SWARM_STINGER,
          count: stingerCount,
          hp: 1,
          size: ENEMY_BASE_SIZE - 4,
          scoreValue: SCORE_BASIC_ENEMY,
          formationFn: (i, c) => ({
            x: SCREEN_WIDTH * 0.15 + (SCREEN_WIDTH * 0.7 / c) * i,
            y: -80 - i * 20,
          }),
        });
      }
    }

    // Armada enemies from wave 6
    if (wave >= 6) {
      // Sentinels
      const sentinelCount = Math.min(Math.floor((wave - 5) * 0.6), 6);
      if (sentinelCount > 0) {
        enemies.push({
          faction: Faction.Armada,
          behaviorId: BEHAVIOR.ARMADA_SENTINEL,
          meshId: MESH_ID.ARMADA_SENTINEL,
          count: sentinelCount,
          hp: 3,
          size: ENEMY_BASE_SIZE + 4,
          scoreValue: SCORE_TOUGH_ENEMY,
          formationFn: (i, c) => ({
            x: SCREEN_WIDTH * 0.25 + (SCREEN_WIDTH * 0.5 / c) * i,
            y: -30 - i * 40,
          }),
        });
      }
    }

    // Gunships from wave 8
    if (wave >= 8) {
      const gunshipCount = Math.min(Math.floor((wave - 7) * 0.4), 4);
      if (gunshipCount > 0) {
        enemies.push({
          faction: Faction.Armada,
          behaviorId: BEHAVIOR.ARMADA_GUNSHIP,
          meshId: MESH_ID.ARMADA_GUNSHIP,
          count: gunshipCount,
          hp: 2,
          size: ENEMY_BASE_SIZE + 2,
          scoreValue: SCORE_TOUGH_ENEMY,
          formationFn: (i, c) => ({
            x: SCREEN_WIDTH * 0.3 + (SCREEN_WIDTH * 0.4 / c) * i,
            y: -60 - i * 35,
          }),
        });
      }
    }

    // Mini-boss waves
    if (isBossWave) {
      if (wave <= 15) {
        // Hive Mother
        enemies.push({
          faction: Faction.Swarm,
          behaviorId: BEHAVIOR.SWARM_HIVE_MOTHER,
          meshId: MESH_ID.SWARM_HIVE_MOTHER,
          count: 1,
          hp: 15,
          size: MINIBOSS_SIZE,
          scoreValue: SCORE_MINIBOSS,
          formationFn: () => ({ x: SCREEN_WIDTH / 2, y: -60 }),
        });
      } else {
        // Dreadnought
        enemies.push({
          faction: Faction.Armada,
          behaviorId: BEHAVIOR.ARMADA_DREADNOUGHT,
          meshId: MESH_ID.ARMADA_DREADNOUGHT,
          count: 1,
          hp: 25,
          size: MINIBOSS_SIZE + 10,
          scoreValue: SCORE_MINIBOSS,
          formationFn: () => ({ x: SCREEN_WIDTH / 2, y: -80 }),
        });
      }
    }

    return { enemies, isBossWave };
  }

  private spawnWave(world: World, config: WaveConfig): void {
    this.enemiesAlive = 0;

    for (const enemyConfig of config.enemies) {
      for (let i = 0; i < enemyConfig.count; i++) {
        const pos = enemyConfig.formationFn(i, enemyConfig.count);
        this.spawnEnemy(world, enemyConfig, pos.x, pos.y);
        this.enemiesAlive++;
      }
    }

    if (config.isBossWave) {
      eventBus.emit('boss:warning');
    }
  }

  private spawnEnemy(world: World, config: EnemySpawnConfig, x: number, y: number): Entity {
    const entity = world.createEntity();

    world.addComponent<TransformData>(entity, COMPONENT.TRANSFORM, {
      x, y,
      rotation: Math.PI, // Face downward
      scaleX: config.size,
      scaleY: config.size,
    });

    world.addComponent<VelocityData>(entity, COMPONENT.VELOCITY, {
      vx: 0, vy: 0,
      angularVelocity: 0,
    });

    const colors = this.getFactionColor(config.faction);
    world.addComponent<SpriteData>(entity, COMPONENT.SPRITE, {
      meshId: config.meshId,
      ...colors,
      a: 1.0,
      emissive: 0.5,
    });

    world.addComponent<HealthData>(entity, COMPONENT.HEALTH, {
      current: config.hp,
      max: config.hp,
      invincible: false,
      invincibleTimer: 0,
    });

    world.addComponent<ColliderData>(entity, COMPONENT.COLLIDER, {
      radius: config.size / 2,
      layer: CollisionLayer.Enemy,
    });

    world.addComponent<EnemyData>(entity, COMPONENT.ENEMY, {
      faction: config.faction,
      behaviorId: config.behaviorId,
      scoreValue: config.scoreValue,
    });

    return entity;
  }

  private getFactionColor(faction: Faction): { r: number; g: number; b: number } {
    switch (faction) {
      case Faction.Swarm: return { r: 0.22, g: 0.78, b: 0.28 };
      case Faction.Armada: return { r: 0.82, g: 0.18, b: 0.15 };
      default: return { r: 0.82, g: 0.18, b: 0.15 };
    }
  }

  getCurrentWave(): number {
    return this.currentWave;
  }

  isWaveActive(): boolean {
    return this.waveActive;
  }

  getEnemiesAlive(): number {
    return this.enemiesAlive;
  }

  reset(): void {
    this.currentWave = 0;
    this.enemiesAlive = 0;
    this.waveActive = false;
    this.waitingForNextWave = false;
    this.difficultyMultiplier = 1.0;
    this.spawnRateMultiplier = 1.0;
  }
}
