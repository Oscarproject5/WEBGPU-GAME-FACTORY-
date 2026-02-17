/**
 * Movement System
 * Applies Velocity to Transform for all entities.
 * Removes entities that go off-screen.
 */

import { World } from './ecs';
import { COMPONENT, TransformData, VelocityData } from '../gameplay/components';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './constants';

const OFF_SCREEN_MARGIN = 100;

export class MovementSystem {
  update(dt: number, world: World): void {
    const entities = world.query(COMPONENT.TRANSFORM, COMPONENT.VELOCITY);

    for (const entity of entities) {
      const transform = world.getComponent<TransformData>(entity, COMPONENT.TRANSFORM)!;
      const velocity = world.getComponent<VelocityData>(entity, COMPONENT.VELOCITY)!;

      // Apply velocity
      transform.x += velocity.vx * dt;
      transform.y += velocity.vy * dt;
      transform.rotation += velocity.angularVelocity * dt;

      // Remove entities far off-screen (bullets, power-ups that fell off)
      if (
        transform.x < -OFF_SCREEN_MARGIN ||
        transform.x > SCREEN_WIDTH + OFF_SCREEN_MARGIN ||
        transform.y < -OFF_SCREEN_MARGIN ||
        transform.y > SCREEN_HEIGHT + OFF_SCREEN_MARGIN
      ) {
        // Don't remove enemies (they spawn off-screen), or the player
        if (!world.hasComponent(entity, COMPONENT.ENEMY) &&
            !world.hasComponent(entity, 'PlayerInput')) {
          world.destroyEntity(entity);
        }
      }
    }
  }
}
