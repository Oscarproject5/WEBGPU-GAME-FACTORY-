/**
 * Weapon System
 * Handles fire rate cooldowns, spawns bullet entities.
 */

import { World, Entity } from '../core/ecs';
import {
  COMPONENT,
  TransformData,
  WeaponData,
  WeaponType,
  ColliderData,
  CollisionLayer,
  VelocityData,
  SpriteData,
  BulletData,
  BulletOwner,
} from './components';
import { PLAYER_BULLET_SPEED, BULLET_SIZE } from '../core/constants';
import { MESH_ID } from '../assets/mesh-data';
import { eventBus } from '../core/event-bus';

export class WeaponSystem {
  update(dt: number, world: World, playerFiring: boolean, playerEntity: Entity | null): void {
    if (playerEntity === null) return;

    const weapon = world.getComponent<WeaponData>(playerEntity, COMPONENT.WEAPON);
    const transform = world.getComponent<TransformData>(playerEntity, COMPONENT.TRANSFORM);

    if (!weapon || !transform) return;

    // Update cooldown
    weapon.cooldown -= dt;

    // Fire if button held and cooldown ready
    if (playerFiring && weapon.cooldown <= 0) {
      weapon.cooldown = 1 / weapon.fireRate;
      this.fireWeapon(world, transform, weapon);
    }
  }

  private fireWeapon(world: World, playerPos: TransformData, weapon: WeaponData): void {
    const angles = this.getFireAngles(weapon.type);

    for (const angle of angles) {
      const bullet = world.createEntity();

      world.addComponent<TransformData>(bullet, COMPONENT.TRANSFORM, {
        x: playerPos.x,
        y: playerPos.y - 15, // Spawn slightly above player
        rotation: angle,
        scaleX: BULLET_SIZE,
        scaleY: BULLET_SIZE * 1.5,
      });

      world.addComponent<VelocityData>(bullet, COMPONENT.VELOCITY, {
        vx: Math.sin(angle) * PLAYER_BULLET_SPEED,
        vy: -Math.cos(angle) * PLAYER_BULLET_SPEED, // Negative = upward
        angularVelocity: 0,
      });

      world.addComponent<SpriteData>(bullet, COMPONENT.SPRITE, {
        meshId: MESH_ID.PLAYER_BULLET,
        r: 0.15,
        g: 0.78,
        b: 0.88,
        a: 1.0,
        emissive: 1.0,
      });

      world.addComponent<ColliderData>(bullet, COMPONENT.COLLIDER, {
        radius: BULLET_SIZE / 2,
        layer: CollisionLayer.PlayerBullet,
      });

      world.addComponent<BulletData>(bullet, COMPONENT.BULLET, {
        owner: BulletOwner.Player,
        damage: 1,
      });
    }

    eventBus.emit('playerShoot', { type: weapon.type });
  }

  private getFireAngles(type: WeaponType): number[] {
    switch (type) {
      case WeaponType.Single:
        return [0];
      case WeaponType.Spread3:
        return [-0.2, 0, 0.2];
      case WeaponType.Spread5:
        return [-0.35, -0.175, 0, 0.175, 0.35];
      case WeaponType.Spread7:
        return [-0.45, -0.3, -0.15, 0, 0.15, 0.3, 0.45];
      default:
        return [0];
    }
  }

  upgradeWeapon(world: World, playerEntity: Entity): void {
    const weapon = world.getComponent<WeaponData>(playerEntity, COMPONENT.WEAPON);
    if (!weapon) return;

    if (weapon.type < WeaponType.Spread7) {
      weapon.type++;
      weapon.level++;
    }
  }
}
