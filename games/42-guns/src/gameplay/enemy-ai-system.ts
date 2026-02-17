/**
 * Enemy AI System
 * Executes behavior patterns per faction and unit type.
 */

import { World, Entity } from '../core/ecs';
import {
  COMPONENT,
  TransformData,
  VelocityData,
  EnemyData,
  Faction,
  ColliderData,
  CollisionLayer,
  SpriteData,
  BulletData,
  BulletOwner,
  HealthData,
} from './components';
import { MESH_ID } from '../assets/mesh-data';
import { SCREEN_WIDTH, ENEMY_BULLET_SPEED_BASE, BULLET_SIZE } from '../core/constants';
import { eventBus } from '../core/event-bus';

// Behavior IDs
export const BEHAVIOR = {
  SWARM_DRONE: 0,
  SWARM_STINGER: 1,
  SWARM_HIVE_MOTHER: 2,
  ARMADA_SENTINEL: 3,
  ARMADA_GUNSHIP: 4,
  ARMADA_DREADNOUGHT: 5,
} as const;

// Per-enemy timers (using a map keyed by entity ID)
interface AIState {
  fireCooldown: number;
  behaviorTimer: number;
  phase: number;
  strafeDirX: number;
  diveTarget: { x: number; y: number } | null;
}

export class EnemyAISystem {
  private aiStates = new Map<Entity, AIState>();
  private playerX = SCREEN_WIDTH / 2;
  private playerY = 500;
  private bulletSpeedMultiplier = 1.0;

  init(): void {
    // Track player position for targeting
    eventBus.on<{ x: number; y: number }>('player:position', (data) => {
      if (data) {
        this.playerX = data.x;
        this.playerY = data.y;
      }
    });
  }

  setBulletSpeedMultiplier(mult: number): void {
    this.bulletSpeedMultiplier = mult;
  }

  update(dt: number, world: World): void {
    const enemies = world.query(COMPONENT.TRANSFORM, COMPONENT.VELOCITY, COMPONENT.ENEMY);

    for (const entity of enemies) {
      const enemy = world.getComponent<EnemyData>(entity, COMPONENT.ENEMY)!;
      const transform = world.getComponent<TransformData>(entity, COMPONENT.TRANSFORM)!;
      const velocity = world.getComponent<VelocityData>(entity, COMPONENT.VELOCITY)!;

      // Get or create AI state
      if (!this.aiStates.has(entity)) {
        this.aiStates.set(entity, {
          fireCooldown: Math.random() * 2, // Stagger initial fire
          behaviorTimer: 0,
          phase: 0,
          strafeDirX: Math.random() > 0.5 ? 1 : -1,
          diveTarget: null,
        });
      }
      const ai = this.aiStates.get(entity)!;
      ai.fireCooldown -= dt;
      ai.behaviorTimer += dt;

      switch (enemy.behaviorId) {
        case BEHAVIOR.SWARM_DRONE:
          this.updateSwarmDrone(dt, transform, velocity, ai, world);
          break;
        case BEHAVIOR.SWARM_STINGER:
          this.updateSwarmStinger(dt, transform, velocity, ai, world);
          break;
        case BEHAVIOR.SWARM_HIVE_MOTHER:
          this.updateSwarmHiveMother(dt, transform, velocity, ai, world);
          break;
        case BEHAVIOR.ARMADA_SENTINEL:
          this.updateArmadaSentinel(dt, transform, velocity, ai, world);
          break;
        case BEHAVIOR.ARMADA_GUNSHIP:
          this.updateArmadaGunship(dt, transform, velocity, ai, world);
          break;
        case BEHAVIOR.ARMADA_DREADNOUGHT:
          this.updateArmadaDreadnought(dt, transform, velocity, ai, world);
          break;
      }
    }

    // Clean up AI states for destroyed entities
    for (const entity of this.aiStates.keys()) {
      if (!world.hasComponent(entity, COMPONENT.ENEMY)) {
        this.aiStates.delete(entity);
      }
    }
  }

  private updateSwarmDrone(dt: number, t: TransformData, v: VelocityData, ai: AIState, world: World): void {
    // Sine-wave descent
    v.vx = Math.sin(ai.behaviorTimer * 2) * 100;
    v.vy = 60;

    // Fire occasionally
    if (ai.fireCooldown <= 0) {
      ai.fireCooldown = 1.5 + Math.random();
      this.fireEnemyBullet(world, t.x, t.y, Faction.Swarm);
    }
  }

  private updateSwarmStinger(dt: number, t: TransformData, v: VelocityData, ai: AIState, world: World): void {
    // Phase 0: drift down slowly
    // Phase 1: dive toward player
    if (ai.phase === 0) {
      v.vx = Math.sin(ai.behaviorTimer * 3) * 80;
      v.vy = 50;

      // Start dive when close enough vertically
      if (t.y > 200 && ai.behaviorTimer > 1.5) {
        ai.phase = 1;
        ai.diveTarget = { x: this.playerX, y: this.playerY };
      }
    } else {
      // Dive toward target
      if (ai.diveTarget) {
        const dx = ai.diveTarget.x - t.x;
        const dy = ai.diveTarget.y - t.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          v.vx = (dx / len) * 350;
          v.vy = (dy / len) * 350;
        }
      }
    }
  }

  private updateSwarmHiveMother(dt: number, t: TransformData, v: VelocityData, ai: AIState, world: World): void {
    // Hover at top, strafe slowly
    if (t.y < 100) {
      v.vy = 40;
    } else {
      v.vy = 0;
      v.vx = ai.strafeDirX * 60;

      // Reverse at screen edges
      if (t.x < 80 || t.x > SCREEN_WIDTH - 80) {
        ai.strafeDirX *= -1;
      }
    }

    // Fire burst of 3 bullets
    if (ai.fireCooldown <= 0) {
      ai.fireCooldown = 2.0;
      for (let i = -1; i <= 1; i++) {
        this.fireEnemyBullet(world, t.x + i * 20, t.y + 20, Faction.Swarm);
      }

      // Spawn drone occasionally
      if (Math.random() < 0.3) {
        eventBus.emit('enemy:spawnDrone', { x: t.x, y: t.y + 30 });
      }
    }
  }

  private updateArmadaSentinel(dt: number, t: TransformData, v: VelocityData, ai: AIState, world: World): void {
    // Slow grid descent
    v.vx = 0;
    v.vy = 30;

    // Fire occasionally (slow rate, single shot)
    if (ai.fireCooldown <= 0) {
      ai.fireCooldown = 2.5 + Math.random();
      this.fireEnemyBullet(world, t.x, t.y, Faction.Armada);
    }
  }

  private updateArmadaGunship(dt: number, t: TransformData, v: VelocityData, ai: AIState, world: World): void {
    // Strafe horizontally
    if (t.y < 120) {
      v.vy = 50;
    } else {
      v.vy = 0;
      v.vx = ai.strafeDirX * 120;

      if (t.x < 60 || t.x > SCREEN_WIDTH - 60) {
        ai.strafeDirX *= -1;
      }
    }

    // Heavy burst fire
    if (ai.fireCooldown <= 0) {
      ai.fireCooldown = 1.8;
      // Burst of 3 aimed shots
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          if (world.hasComponent(0, COMPONENT.TRANSFORM)) { // Check world still valid
            this.fireAimedBullet(world, t.x, t.y, this.playerX, this.playerY, Faction.Armada);
          }
        }, i * 100);
      }
    }
  }

  private updateArmadaDreadnought(dt: number, t: TransformData, v: VelocityData, ai: AIState, world: World): void {
    // Slow descent, then strafe
    if (t.y < 80) {
      v.vy = 30;
    } else {
      v.vy = 0;
      v.vx = ai.strafeDirX * 40;

      if (t.x < 100 || t.x > SCREEN_WIDTH - 100) {
        ai.strafeDirX *= -1;
      }
    }

    // Coordinated volley
    if (ai.fireCooldown <= 0) {
      ai.fireCooldown = 3.0;
      // Fan of 5 bullets
      for (let i = -2; i <= 2; i++) {
        const angle = Math.PI / 2 + i * 0.25; // Downward fan
        this.fireDirectionalBullet(world, t.x, t.y, angle, Faction.Armada);
      }
    }
  }

  private fireEnemyBullet(world: World, x: number, y: number, faction: Faction): void {
    const bullet = world.createEntity();
    const speed = ENEMY_BULLET_SPEED_BASE * this.bulletSpeedMultiplier;

    world.addComponent<TransformData>(bullet, COMPONENT.TRANSFORM, {
      x, y: y + 10,
      rotation: Math.PI,
      scaleX: BULLET_SIZE,
      scaleY: BULLET_SIZE,
    });

    world.addComponent<VelocityData>(bullet, COMPONENT.VELOCITY, {
      vx: 0,
      vy: speed,
      angularVelocity: 0,
    });

    const colors = this.getFactionBulletColor(faction);
    world.addComponent<SpriteData>(bullet, COMPONENT.SPRITE, {
      meshId: MESH_ID.ENEMY_BULLET,
      ...colors,
      a: 1.0,
      emissive: 0.8,
    });

    world.addComponent<ColliderData>(bullet, COMPONENT.COLLIDER, {
      radius: BULLET_SIZE / 2,
      layer: CollisionLayer.EnemyBullet,
    });

    world.addComponent<BulletData>(bullet, COMPONENT.BULLET, {
      owner: BulletOwner.Enemy,
      damage: 1,
    });

    eventBus.emit('enemyShoot', { faction, x, y });
  }

  private fireAimedBullet(world: World, fromX: number, fromY: number, targetX: number, targetY: number, faction: Faction): void {
    const dx = targetX - fromX;
    const dy = targetY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const speed = ENEMY_BULLET_SPEED_BASE * this.bulletSpeedMultiplier;
    const bullet = world.createEntity();

    world.addComponent<TransformData>(bullet, COMPONENT.TRANSFORM, {
      x: fromX, y: fromY + 10,
      rotation: Math.atan2(dy, dx) - Math.PI / 2,
      scaleX: BULLET_SIZE,
      scaleY: BULLET_SIZE,
    });

    world.addComponent<VelocityData>(bullet, COMPONENT.VELOCITY, {
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      angularVelocity: 0,
    });

    const colors = this.getFactionBulletColor(faction);
    world.addComponent<SpriteData>(bullet, COMPONENT.SPRITE, {
      meshId: MESH_ID.ENEMY_BULLET,
      ...colors,
      a: 1.0,
      emissive: 0.8,
    });

    world.addComponent<ColliderData>(bullet, COMPONENT.COLLIDER, {
      radius: BULLET_SIZE / 2,
      layer: CollisionLayer.EnemyBullet,
    });

    world.addComponent<BulletData>(bullet, COMPONENT.BULLET, {
      owner: BulletOwner.Enemy,
      damage: 1,
    });
  }

  private fireDirectionalBullet(world: World, x: number, y: number, angle: number, faction: Faction): void {
    const speed = ENEMY_BULLET_SPEED_BASE * this.bulletSpeedMultiplier;
    const bullet = world.createEntity();

    world.addComponent<TransformData>(bullet, COMPONENT.TRANSFORM, {
      x, y: y + 10,
      rotation: angle - Math.PI / 2,
      scaleX: BULLET_SIZE,
      scaleY: BULLET_SIZE,
    });

    world.addComponent<VelocityData>(bullet, COMPONENT.VELOCITY, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angularVelocity: 0,
    });

    const colors = this.getFactionBulletColor(faction);
    world.addComponent<SpriteData>(bullet, COMPONENT.SPRITE, {
      meshId: MESH_ID.ENEMY_BULLET,
      ...colors,
      a: 1.0,
      emissive: 0.8,
    });

    world.addComponent<ColliderData>(bullet, COMPONENT.COLLIDER, {
      radius: BULLET_SIZE / 2,
      layer: CollisionLayer.EnemyBullet,
    });

    world.addComponent<BulletData>(bullet, COMPONENT.BULLET, {
      owner: BulletOwner.Enemy,
      damage: 1,
    });
  }

  private getFactionBulletColor(faction: Faction): { r: number; g: number; b: number } {
    switch (faction) {
      case Faction.Swarm: return { r: 0.22, g: 0.78, b: 0.28 };
      case Faction.Armada: return { r: 0.82, g: 0.18, b: 0.15 };
      default: return { r: 0.82, g: 0.18, b: 0.15 };
    }
  }

  destroy(): void {
    this.aiStates.clear();
  }
}
