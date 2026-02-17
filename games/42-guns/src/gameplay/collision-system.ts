/**
 * Collision System
 * Spatial grid broad phase + circle-circle narrow phase
 */

import { World, Entity } from '../core/ecs';
import { COMPONENT, TransformData, ColliderData, CollisionLayer } from './components';

const GRID_CELL_SIZE = 100;

export interface CollisionPair {
  entityA: Entity;
  entityB: Entity;
  layerA: CollisionLayer;
  layerB: CollisionLayer;
}

// Collision matrix: which layers collide with which
const COLLISION_PAIRS: [CollisionLayer, CollisionLayer][] = [
  [CollisionLayer.Player, CollisionLayer.EnemyBullet],
  [CollisionLayer.Player, CollisionLayer.Enemy],
  [CollisionLayer.Player, CollisionLayer.PowerUp],
  [CollisionLayer.PlayerBullet, CollisionLayer.Enemy],
];

export class CollisionSystem {
  private grid = new Map<string, Entity[]>();
  private collisions: CollisionPair[] = [];

  update(_dt: number, world: World): CollisionPair[] {
    this.collisions.length = 0;
    this.grid.clear();

    // Get all entities with colliders
    const entities = world.query(COMPONENT.TRANSFORM, COMPONENT.COLLIDER);

    // Populate spatial grid
    for (const entity of entities) {
      const transform = world.getComponent<TransformData>(entity, COMPONENT.TRANSFORM)!;
      const collider = world.getComponent<ColliderData>(entity, COMPONENT.COLLIDER)!;

      const cellX = Math.floor(transform.x / GRID_CELL_SIZE);
      const cellY = Math.floor(transform.y / GRID_CELL_SIZE);

      // Insert into current cell and neighboring cells for border overlap
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${cellX + dx},${cellY + dy}`;
          if (!this.grid.has(key)) {
            this.grid.set(key, []);
          }
          this.grid.get(key)!.push(entity);
        }
      }
    }

    // Check collisions within each cell
    const checked = new Set<string>();

    for (const cellEntities of this.grid.values()) {
      for (let i = 0; i < cellEntities.length; i++) {
        for (let j = i + 1; j < cellEntities.length; j++) {
          const a = cellEntities[i];
          const b = cellEntities[j];

          // Avoid duplicate checks
          const pairKey = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (checked.has(pairKey)) continue;
          checked.add(pairKey);

          const colliderA = world.getComponent<ColliderData>(a, COMPONENT.COLLIDER)!;
          const colliderB = world.getComponent<ColliderData>(b, COMPONENT.COLLIDER)!;

          // Check if this layer combination should collide
          if (!this.shouldCollide(colliderA.layer, colliderB.layer)) continue;

          // Narrow phase: circle-circle
          const transformA = world.getComponent<TransformData>(a, COMPONENT.TRANSFORM)!;
          const transformB = world.getComponent<TransformData>(b, COMPONENT.TRANSFORM)!;

          const dx = transformA.x - transformB.x;
          const dy = transformA.y - transformB.y;
          const distSq = dx * dx + dy * dy;
          const minDist = colliderA.radius + colliderB.radius;

          if (distSq < minDist * minDist) {
            this.collisions.push({
              entityA: a,
              entityB: b,
              layerA: colliderA.layer,
              layerB: colliderB.layer,
            });
          }
        }
      }
    }

    return this.collisions;
  }

  private shouldCollide(layerA: CollisionLayer, layerB: CollisionLayer): boolean {
    for (const [l1, l2] of COLLISION_PAIRS) {
      if ((layerA === l1 && layerB === l2) || (layerA === l2 && layerB === l1)) {
        return true;
      }
    }
    return false;
  }

  getCollisions(): readonly CollisionPair[] {
    return this.collisions;
  }
}
