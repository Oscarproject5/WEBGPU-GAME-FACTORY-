/**
 * Game-specific ECS Components
 * All component types and their data structures.
 */

// Component type identifiers
export const COMPONENT = {
  TRANSFORM: 'Transform',
  VELOCITY: 'Velocity',
  SPRITE: 'Sprite',
  HEALTH: 'Health',
  WEAPON: 'Weapon',
  COLLIDER: 'Collider',
  POWERUP: 'PowerUp',
  ENEMY: 'Enemy',
  BOSS: 'Boss',
  PLAYER_INPUT: 'PlayerInput',
  BULLET: 'Bullet',
  POWERUP_EFFECT: 'PowerUpEffect',
} as const;

// Enums
export enum WeaponType {
  Single = 0,
  Spread3 = 1,
  Spread5 = 2,
  Spread7 = 3,
}

export enum PowerUpType {
  SpreadShot = 0,
  Shield = 1,
  Bomb = 2,
  Speed = 3,
  HomingMissiles = 4,
  ScoreMultiplier = 5,
}

export enum Faction {
  Swarm = 0,
  Armada = 1,
  Void = 2,
  Nexus = 3,
}

export enum CollisionLayer {
  Player = 0,
  PlayerBullet = 1,
  Enemy = 2,
  EnemyBullet = 3,
  PowerUp = 4,
}

export enum BulletOwner {
  Player = 0,
  Enemy = 1,
}

// Component data interfaces
export interface TransformData {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface VelocityData {
  vx: number;
  vy: number;
  angularVelocity: number;
}

export interface SpriteData {
  meshId: number;
  r: number;
  g: number;
  b: number;
  a: number;
  emissive: number;
}

export interface HealthData {
  current: number;
  max: number;
  invincible: boolean;
  invincibleTimer: number;
}

export interface WeaponData {
  type: WeaponType;
  fireRate: number;   // shots per second
  cooldown: number;   // current cooldown timer
  level: number;
}

export interface ColliderData {
  radius: number;
  layer: CollisionLayer;
}

export interface PowerUpData {
  type: PowerUpType;
  duration: number;
}

export interface EnemyData {
  faction: Faction;
  behaviorId: number;
  scoreValue: number;
}

export interface BossData {
  phase: number;
  patterns: number[];
  phaseTimer: number;
}

export interface PlayerInputData {
  moveX: number;
  moveY: number;
  firing: boolean;
  bomb: boolean;
}

export interface BulletData {
  owner: BulletOwner;
  damage: number;
}

export interface PowerUpEffectData {
  type: PowerUpType;
  remainingTime: number;
  maxTime: number;
}
