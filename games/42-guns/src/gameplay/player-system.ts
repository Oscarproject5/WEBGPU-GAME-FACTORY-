/**
 * Player Movement System
 * Reads input state, applies velocity to player, clamps to screen bounds.
 */

import { World, Entity } from '../core/ecs';
import { COMPONENT, TransformData, VelocityData, HealthData, SpriteData } from './components';
import { PLAYER_SPEED, SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_MARGIN, INVINCIBILITY_DURATION } from '../core/constants';
import type { InputState } from '../input/input-manager';

export class PlayerMovementSystem {
  private playerEntity: Entity | null = null;

  setPlayer(entity: Entity): void {
    this.playerEntity = entity;
  }

  update(dt: number, world: World, input: Readonly<InputState>): void {
    if (this.playerEntity === null) return;

    const transform = world.getComponent<TransformData>(this.playerEntity, COMPONENT.TRANSFORM);
    const health = world.getComponent<HealthData>(this.playerEntity, COMPONENT.HEALTH);
    const sprite = world.getComponent<SpriteData>(this.playerEntity, COMPONENT.SPRITE);

    if (!transform) return;

    // Apply movement
    transform.x += input.moveX * PLAYER_SPEED * dt;
    transform.y += input.moveY * PLAYER_SPEED * dt;

    // Clamp to screen bounds
    transform.x = Math.max(SCREEN_MARGIN, Math.min(SCREEN_WIDTH - SCREEN_MARGIN, transform.x));
    transform.y = Math.max(SCREEN_MARGIN, Math.min(SCREEN_HEIGHT - SCREEN_MARGIN, transform.y));

    // Handle invincibility timer
    if (health && health.invincible) {
      health.invincibleTimer -= dt;
      if (health.invincibleTimer <= 0) {
        health.invincible = false;
        health.invincibleTimer = 0;
      }

      // Flash effect during invincibility
      if (sprite) {
        const flash = Math.sin(health.invincibleTimer * 15) > 0;
        sprite.a = flash ? 1.0 : 0.3;
      }
    } else if (sprite) {
      sprite.a = 1.0;
    }
  }

  applyDamage(world: World, amount: number): boolean {
    if (this.playerEntity === null) return false;

    const health = world.getComponent<HealthData>(this.playerEntity, COMPONENT.HEALTH);
    if (!health || health.invincible) return false;

    health.current -= amount;
    health.invincible = true;
    health.invincibleTimer = INVINCIBILITY_DURATION;

    return health.current <= 0;
  }

  getPlayerEntity(): Entity | null {
    return this.playerEntity;
  }

  getPosition(world: World): { x: number; y: number } | null {
    if (this.playerEntity === null) return null;
    const transform = world.getComponent<TransformData>(this.playerEntity, COMPONENT.TRANSFORM);
    if (!transform) return null;
    return { x: transform.x, y: transform.y };
  }
}
