/**
 * Shared Game Constants
 */

// Screen dimensions (logical pixels)
export const SCREEN_WIDTH = 800;
export const SCREEN_HEIGHT = 600;
export const SCREEN_MARGIN = 20;

// Player
export const PLAYER_SPEED = 400;            // pixels/sec
export const PLAYER_START_HP = 5;
export const PLAYER_SIZE = 32;               // pixels
export const INVINCIBILITY_DURATION = 2.0;   // seconds

// Bullets
export const PLAYER_BULLET_SPEED = 800;     // pixels/sec
export const ENEMY_BULLET_SPEED_BASE = 400; // pixels/sec
export const ENEMY_BULLET_SPEED_MAX = 700;
export const PLAYER_FIRE_RATE = 8;           // shots/sec
export const BULLET_SIZE = 8;

// Enemies
export const ENEMY_BASE_SIZE = 28;
export const BOSS_SIZE = 80;
export const MINIBOSS_SIZE = 50;

// Waves
export const WAVE_PAUSE_DURATION = 2.0;      // seconds between waves
export const DIFFICULTY_ESCALATION_INTERVAL = 5;  // every N waves
export const BULLET_SPEED_INCREASE = 0.10;   // 10% per escalation
export const SPAWN_RATE_INCREASE = 0.15;     // 15% per escalation

// Boss waves
export const MINIBOSS_INTERVAL = 10;
export const BOSS_INTERVAL = 25;

// Power-ups
export const POWERUP_DROP_CHANCE = 0.15;     // 15%
export const POWERUP_FALL_SPEED = 100;       // pixels/sec
export const POWERUP_SIZE = 20;

// Power-up durations (seconds)
export const SHIELD_HITS = 3;
export const SPEED_BOOST_DURATION = 20;
export const HOMING_MISSILE_DURATION = 30;
export const SCORE_MULTIPLIER_DURATION = 15;
export const DRONE_COMPANION_DURATION = 45;
export const SPEED_BOOST_FACTOR = 1.5;

// Score
export const SCORE_BASIC_ENEMY = 100;
export const SCORE_TOUGH_ENEMY = 250;
export const SCORE_MINIBOSS = 1000;
export const SCORE_BOSS = 5000;
export const SCORE_MULTIPLIER_VALUE = 2;

// Rendering
export const MAX_INSTANCES = 4096;
export const MAX_PARTICLES = 10000;
