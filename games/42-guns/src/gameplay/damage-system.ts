/**
 * Damage System
 * Processes collision results, applies damage, handles death events.
 */

import { World, Entity } from '../core/ecs';
import {
  COMPONENT,
  TransformData,
  HealthData,
  CollisionLayer,
  EnemyData,
  BulletData,
  BulletOwner,
  PowerUpType,
} from './components';
import { CollisionPair } from './collision-system';
import { eventBus } from '../core/event-bus';
import { POWERUP_DROP_CHANCE, SCORE_BASIC_ENEMY, SCORE_TOUGH_ENEMY, SCORE_MINIBOSS } from '../core/constants';

export class DamageSystem {
  update(_dt: number, world: World, collisions: readonly CollisionPair[]): void {
    for (const pair of collisions) {
      this.processCollision(world, pair);
    }
  }

  private processCollision(world: World, pair: CollisionPair): void {
    const { entityA, entityB, layerA, layerB } = pair;

    // PlayerBullet vs Enemy
    if (
      (layerA === CollisionLayer.PlayerBullet && layerB === CollisionLayer.Enemy) ||
      (layerA === CollisionLayer.Enemy && layerB === CollisionLayer.PlayerBullet)
    ) {
      const bulletEntity = layerA === CollisionLayer.PlayerBullet ? entityA : entityB;
      const enemyEntity = layerA === CollisionLayer.Enemy ? entityA : entityB;
      this.handleBulletHitEnemy(world, bulletEntity, enemyEntity);
    }

    // Player vs EnemyBullet
    if (
      (layerA === CollisionLayer.Player && layerB === CollisionLayer.EnemyBullet) ||
      (layerA === CollisionLayer.EnemyBullet && layerB === CollisionLayer.Player)
    ) {
      const playerEntity = layerA === CollisionLayer.Player ? entityA : entityB;
      const bulletEntity = layerA === CollisionLayer.EnemyBullet ? entityA : entityB;
      this.handleEnemyBulletHitPlayer(world, bulletEntity, playerEntity);
    }

    // Player vs Enemy (contact damage)
    if (
      (layerA === CollisionLayer.Player && layerB === CollisionLayer.Enemy) ||
      (layerA === CollisionLayer.Enemy && layerB === CollisionLayer.Player)
    ) {
      const playerEntity = layerA === CollisionLayer.Player ? entityA : entityB;
      this.handleEnemyContactPlayer(world, playerEntity);
    }

    // Player vs PowerUp
    if (
      (layerA === CollisionLayer.Player && layerB === CollisionLayer.PowerUp) ||
      (layerA === CollisionLayer.PowerUp && layerB === CollisionLayer.Player)
    ) {
      const powerUpEntity = layerA === CollisionLayer.PowerUp ? entityA : entityB;
      this.handlePowerUpCollect(world, powerUpEntity);
    }
  }

  private handleBulletHitEnemy(world: World, bulletEntity: Entity, enemyEntity: Entity): void {
    const bullet = world.getComponent<BulletData>(bulletEntity, COMPONENT.BULLET);
    const health = world.getComponent<HealthData>(enemyEntity, COMPONENT.HEALTH);
    const transform = world.getComponent<TransformData>(enemyEntity, COMPONENT.TRANSFORM);
    const enemy = world.getComponent<EnemyData>(enemyEntity, COMPONENT.ENEMY);

    // Destroy bullet
    world.destroyEntity(bulletEntity);

    if (!health || !transform) return;

    // Apply damage
    health.current -= bullet?.damage ?? 1;

    if (health.current <= 0) {
      // Enemy destroyed
      const pos = { x: transform.x, y: transform.y };

      // Determine score value
      const scoreValue = enemy?.scoreValue ?? SCORE_BASIC_ENEMY;
      eventBus.emit('score:add', { value: scoreValue });
      eventBus.emit('enemy:destroyed', { x: pos.x, y: pos.y, faction: enemy?.faction ?? 0 });
      eventBus.emit('explosion', { x: pos.x, y: pos.y, size: health.max > 3 ? 'large' : 'small' });

      // Power-up drop chance
      if (Math.random() < POWERUP_DROP_CHANCE) {
        const types = [PowerUpType.SpreadShot, PowerUpType.Shield, PowerUpType.Bomb];
        const type = types[Math.floor(Math.random() * types.length)];
        eventBus.emit('powerup:spawn', { x: pos.x, y: pos.y, type });
      }

      world.destroyEntity(enemyEntity);
    } else {
      // Hit flash event
      eventBus.emit('enemy:hit', { entity: enemyEntity });
    }
  }

  private handleEnemyBulletHitPlayer(world: World, bulletEntity: Entity, playerEntity: Entity): void {
    const health = world.getComponent<HealthData>(playerEntity, COMPONENT.HEALTH);

    // Destroy enemy bullet
    world.destroyEntity(bulletEntity);

    if (!health || health.invincible) return;

    eventBus.emit('player:damage', { amount: 1 });
  }

  private handleEnemyContactPlayer(world: World, playerEntity: Entity): void {
    const health = world.getComponent<HealthData>(playerEntity, COMPONENT.HEALTH);
    if (!health || health.invincible) return;

    eventBus.emit('player:damage', { amount: 1 });
  }

  private handlePowerUpCollect(world: World, powerUpEntity: Entity): void {
    const powerUp = world.getComponent(powerUpEntity, COMPONENT.POWERUP);
    const transform = world.getComponent<TransformData>(powerUpEntity, COMPONENT.TRANSFORM);

    if (transform) {
      eventBus.emit('powerup:collect', { x: transform.x, y: transform.y, powerUp });
    }

    world.destroyEntity(powerUpEntity);
  }
}
