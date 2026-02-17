/**
 * Power-Up System
 * Handles power-up drops, collection, and effect application.
 */

import { World, Entity } from '../core/ecs';
import {
  COMPONENT,
  TransformData,
  VelocityData,
  SpriteData,
  ColliderData,
  CollisionLayer,
  PowerUpData,
  PowerUpType,
  PowerUpEffectData,
} from './components';
import { MESH_ID } from '../assets/mesh-data';
import { POWERUP_FALL_SPEED, POWERUP_SIZE, SHIELD_HITS, SPEED_BOOST_DURATION, SCORE_MULTIPLIER_DURATION } from '../core/constants';
import { eventBus } from '../core/event-bus';

export class PowerUpSystem {
  private activeEffects: PowerUpEffectData[] = [];

  init(): void {
    // Listen for power-up spawn requests (from damage system)
    eventBus.on<{ x: number; y: number; type: PowerUpType }>('powerup:spawn', (data) => {
      if (data) {
        // We'll need the world reference; defer to update
        this.pendingSpawns.push(data);
      }
    });

    // Listen for power-up collection
    eventBus.on<{ x: number; y: number; powerUp: PowerUpData }>('powerup:collect', (data) => {
      if (data?.powerUp) {
        this.applyPowerUp(data.powerUp.type);
      }
    });
  }

  private pendingSpawns: { x: number; y: number; type: PowerUpType }[] = [];

  update(dt: number, world: World): void {
    // Spawn pending power-ups
    for (const spawn of this.pendingSpawns) {
      this.spawnPowerUp(world, spawn.x, spawn.y, spawn.type);
    }
    this.pendingSpawns.length = 0;

    // Update active effect durations
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.remainingTime -= dt;

      if (effect.remainingTime <= 0) {
        eventBus.emit('powerup:expire', { type: effect.type });
        this.activeEffects.splice(i, 1);
      }
    }
  }

  private spawnPowerUp(world: World, x: number, y: number, type: PowerUpType): void {
    const entity = world.createEntity();

    world.addComponent<TransformData>(entity, COMPONENT.TRANSFORM, {
      x, y,
      rotation: 0,
      scaleX: POWERUP_SIZE,
      scaleY: POWERUP_SIZE,
    });

    world.addComponent<VelocityData>(entity, COMPONENT.VELOCITY, {
      vx: 0,
      vy: POWERUP_FALL_SPEED,
      angularVelocity: 2, // Spin
    });

    const meshInfo = this.getPowerUpMesh(type);
    world.addComponent<SpriteData>(entity, COMPONENT.SPRITE, {
      meshId: meshInfo.meshId,
      ...meshInfo.color,
      a: 1.0,
      emissive: 1.0,
    });

    world.addComponent<ColliderData>(entity, COMPONENT.COLLIDER, {
      radius: POWERUP_SIZE / 2,
      layer: CollisionLayer.PowerUp,
    });

    world.addComponent<PowerUpData>(entity, COMPONENT.POWERUP, {
      type,
      duration: this.getPowerUpDuration(type),
    });
  }

  private applyPowerUp(type: PowerUpType): void {
    switch (type) {
      case PowerUpType.SpreadShot:
        eventBus.emit('powerup:spreadshot');
        break;
      case PowerUpType.Shield:
        eventBus.emit('powerup:shield', { hits: SHIELD_HITS });
        break;
      case PowerUpType.Bomb:
        eventBus.emit('powerup:bomb');
        break;
      case PowerUpType.Speed:
        this.addTimedEffect(PowerUpType.Speed, SPEED_BOOST_DURATION);
        eventBus.emit('powerup:speed');
        break;
      case PowerUpType.ScoreMultiplier:
        this.addTimedEffect(PowerUpType.ScoreMultiplier, SCORE_MULTIPLIER_DURATION);
        eventBus.emit('powerup:multiplier');
        break;
    }
  }

  private addTimedEffect(type: PowerUpType, duration: number): void {
    // Remove existing effect of same type
    this.activeEffects = this.activeEffects.filter(e => e.type !== type);

    this.activeEffects.push({
      type,
      remainingTime: duration,
      maxTime: duration,
    });
  }

  hasEffect(type: PowerUpType): boolean {
    return this.activeEffects.some(e => e.type === type);
  }

  getEffectTimer(type: PowerUpType): number {
    const effect = this.activeEffects.find(e => e.type === type);
    return effect ? effect.remainingTime : 0;
  }

  getActiveEffects(): readonly PowerUpEffectData[] {
    return this.activeEffects;
  }

  private getPowerUpMesh(type: PowerUpType): { meshId: number; color: { r: number; g: number; b: number } } {
    switch (type) {
      case PowerUpType.SpreadShot:
        return { meshId: MESH_ID.POWERUP_SPREAD, color: { r: 0.15, g: 0.78, b: 0.88 } };
      case PowerUpType.Shield:
        return { meshId: MESH_ID.POWERUP_SHIELD, color: { r: 0.6, g: 0.8, b: 1.0 } };
      case PowerUpType.Bomb:
        return { meshId: MESH_ID.POWERUP_BOMB, color: { r: 1.0, g: 0.2, b: 0.2 } };
      case PowerUpType.Speed:
        return { meshId: MESH_ID.POWERUP_SPEED, color: { r: 1.0, g: 0.9, b: 0.2 } };
      case PowerUpType.ScoreMultiplier:
        return { meshId: MESH_ID.POWERUP_MULTIPLIER, color: { r: 0.92, g: 0.78, b: 0.15 } };
      default:
        return { meshId: MESH_ID.POWERUP_SPREAD, color: { r: 0.75, g: 0.95, b: 0.98 } };
    }
  }

  private getPowerUpDuration(type: PowerUpType): number {
    switch (type) {
      case PowerUpType.SpreadShot: return 0; // Permanent
      case PowerUpType.Shield: return 0; // Until depleted
      case PowerUpType.Bomb: return 0; // Instant
      case PowerUpType.Speed: return SPEED_BOOST_DURATION;
      case PowerUpType.ScoreMultiplier: return SCORE_MULTIPLIER_DURATION;
      default: return 0;
    }
  }

  reset(): void {
    this.activeEffects.length = 0;
    this.pendingSpawns.length = 0;
  }
}
