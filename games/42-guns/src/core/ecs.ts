/**
 * ECS (Entity-Component-System) Core
 * Gameplay agent will extend this with game-specific components and systems
 */

export type Entity = number;
export type ComponentType = string;

export class World {
  private nextEntityId: Entity = 0;
  private entities = new Set<Entity>();
  private components = new Map<ComponentType, Map<Entity, unknown>>();
  private toDestroy: Entity[] = [];

  createEntity(): Entity {
    const id = this.nextEntityId++;
    this.entities.add(id);
    return id;
  }

  destroyEntity(entity: Entity): void {
    this.toDestroy.push(entity);
  }

  addComponent<T>(entity: Entity, type: ComponentType, data: T): void {
    if (!this.components.has(type)) {
      this.components.set(type, new Map());
    }
    this.components.get(type)!.set(entity, data);
  }

  removeComponent(entity: Entity, type: ComponentType): void {
    this.components.get(type)?.delete(entity);
  }

  getComponent<T>(entity: Entity, type: ComponentType): T | undefined {
    return this.components.get(type)?.get(entity) as T | undefined;
  }

  hasComponent(entity: Entity, type: ComponentType): boolean {
    return this.components.get(type)?.has(entity) ?? false;
  }

  query(...types: ComponentType[]): Entity[] {
    const result: Entity[] = [];
    for (const entity of this.entities) {
      if (types.every(type => this.hasComponent(entity, type))) {
        result.push(entity);
      }
    }
    return result;
  }

  flush(): void {
    for (const entity of this.toDestroy) {
      this.entities.delete(entity);
      for (const componentMap of this.components.values()) {
        componentMap.delete(entity);
      }
    }
    this.toDestroy = [];
  }

  getEntityCount(): number {
    return this.entities.size;
  }

  clear(): void {
    this.entities.clear();
    this.components.clear();
    this.toDestroy = [];
    this.nextEntityId = 0;
  }
}
