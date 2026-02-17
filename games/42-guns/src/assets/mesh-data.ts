/**
 * Procedural Mesh Data
 * 2D shape definitions for all game entities.
 * Each mesh is an array of vertices forming triangles, centered at origin, unit-sized.
 * The sprite renderer scales these via Transform component.
 */

export interface MeshDefinition {
  id: number;
  name: string;
  // Flat array of x,y pairs forming triangles
  vertices: number[];
  // Default color (r, g, b, a) - can be overridden per instance
  color: [number, number, number, number];
  // Default emissive intensity
  emissive: number;
}

// Mesh IDs
export const MESH_ID = {
  PLAYER_SHIP: 0,
  PLAYER_BULLET: 1,
  ENEMY_BULLET: 2,
  SWARM_DRONE: 3,
  SWARM_STINGER: 4,
  SWARM_HIVE_MOTHER: 5,
  ARMADA_SENTINEL: 6,
  ARMADA_GUNSHIP: 7,
  ARMADA_DREADNOUGHT: 8,
  POWERUP_SPREAD: 9,
  POWERUP_SHIELD: 10,
  POWERUP_BOMB: 11,
  POWERUP_SPEED: 12,
  POWERUP_MISSILE: 13,
  POWERUP_MULTIPLIER: 14,
} as const;

// oklch colors converted to approximate linear RGB for shader use
// Player: Electric cyan oklch(0.78 0.18 200)
const CYAN: [number, number, number, number] = [0.15, 0.78, 0.88, 1.0];
// Player accent: Hot magenta oklch(0.65 0.25 340)
const MAGENTA: [number, number, number, number] = [0.85, 0.25, 0.55, 1.0];
// Swarm: Toxic green oklch(0.72 0.22 145)
const GREEN: [number, number, number, number] = [0.22, 0.78, 0.28, 1.0];
// Armada: Crimson red oklch(0.55 0.22 25)
const RED: [number, number, number, number] = [0.82, 0.18, 0.15, 1.0];
// Power-up: Bright white-cyan oklch(0.92 0.12 195)
const WHITE_CYAN: [number, number, number, number] = [0.75, 0.95, 0.98, 1.0];
// Explosion: Orange-white oklch(0.85 0.15 65)
const ORANGE: [number, number, number, number] = [0.95, 0.72, 0.25, 1.0];
// Gold
const GOLD: [number, number, number, number] = [0.92, 0.78, 0.15, 1.0];
// Blue-white (shield)
const BLUE_WHITE: [number, number, number, number] = [0.6, 0.8, 1.0, 1.0];
// Red pulse (bomb)
const RED_PULSE: [number, number, number, number] = [1.0, 0.2, 0.2, 1.0];
// Yellow (speed)
const YELLOW: [number, number, number, number] = [1.0, 0.9, 0.2, 1.0];

export const MESHES: MeshDefinition[] = [
  // 0: Player Ship - sleek arrow fighter
  {
    id: MESH_ID.PLAYER_SHIP,
    name: 'Player Ship',
    vertices: [
      // Main body (pointed nose)
       0.0, -0.5,  -0.2, 0.1,   0.2, 0.1,   // nose triangle
      -0.2,  0.1,   0.2, 0.1,   0.0, 0.0,   // upper body
      // Wings
      -0.2,  0.1,  -0.5, 0.35, -0.15, 0.2,   // left wing
       0.2,  0.1,   0.5, 0.35,  0.15, 0.2,   // right wing
      // Tail
      -0.15, 0.2,   0.15, 0.2,  0.0, 0.5,   // tail
      // Engine block
      -0.12, 0.2,   0.12, 0.2,  0.12, 0.35,  // engine right
      -0.12, 0.2,   0.12, 0.35, -0.12, 0.35, // engine left
    ],
    color: CYAN,
    emissive: 0.6,
  },

  // 1: Player Bullet - elongated diamond
  {
    id: MESH_ID.PLAYER_BULLET,
    name: 'Player Bullet',
    vertices: [
       0.0, -0.5,   0.15, 0.0,  -0.15, 0.0,  // top
      -0.15, 0.0,   0.15, 0.0,   0.0, 0.5,   // bottom
    ],
    color: CYAN,
    emissive: 1.0,
  },

  // 2: Enemy Bullet - small dot/diamond
  {
    id: MESH_ID.ENEMY_BULLET,
    name: 'Enemy Bullet',
    vertices: [
       0.0, -0.4,   0.3, 0.0,   0.0, 0.4,   // right half
       0.0, -0.4,   0.0, 0.4,  -0.3, 0.0,   // left half
    ],
    color: RED,
    emissive: 0.8,
  },

  // 3: Swarm Drone - organic curved diamond
  {
    id: MESH_ID.SWARM_DRONE,
    name: 'Swarm Drone',
    vertices: [
       0.0, -0.45,  0.3, -0.1,   0.0, 0.0,   // top right
       0.0, -0.45, -0.3, -0.1,   0.0, 0.0,   // top left
       0.3, -0.1,   0.4,  0.15,  0.0, 0.0,   // mid right
      -0.3, -0.1,  -0.4,  0.15,  0.0, 0.0,   // mid left
       0.4,  0.15,  0.0,  0.45,  0.0, 0.0,   // bottom right
      -0.4,  0.15,  0.0,  0.45,  0.0, 0.0,   // bottom left
    ],
    color: GREEN,
    emissive: 0.5,
  },

  // 4: Swarm Stinger - narrow pointed shape
  {
    id: MESH_ID.SWARM_STINGER,
    name: 'Swarm Stinger',
    vertices: [
       0.0, -0.5,   0.15, 0.0,  -0.15, 0.0,  // nose
       0.15, 0.0,   0.3,  0.3,   0.0,  0.15, // right wing
      -0.15, 0.0,  -0.3,  0.3,   0.0,  0.15, // left wing
       0.0,  0.15,  0.1,  0.5,  -0.1,  0.5,  // tail
    ],
    color: GREEN,
    emissive: 0.7,
  },

  // 5: Swarm Hive Mother - larger hexagonal shape
  {
    id: MESH_ID.SWARM_HIVE_MOTHER,
    name: 'Swarm Hive Mother',
    vertices: [
      // Hexagon made of 6 triangles from center
       0.0,  0.0,   0.0, -0.5,   0.43, -0.25, // top right
       0.0,  0.0,   0.43,-0.25,  0.43,  0.25, // right
       0.0,  0.0,   0.43, 0.25,  0.0,   0.5,  // bottom right
       0.0,  0.0,   0.0,  0.5,  -0.43,  0.25, // bottom left
       0.0,  0.0,  -0.43, 0.25, -0.43, -0.25, // left
       0.0,  0.0,  -0.43,-0.25,  0.0,  -0.5,  // top left
    ],
    color: GREEN,
    emissive: 0.8,
  },

  // 6: Armada Sentinel - thick angular shield shape
  {
    id: MESH_ID.ARMADA_SENTINEL,
    name: 'Armada Sentinel',
    vertices: [
      -0.35, -0.4,   0.35, -0.4,   0.4, -0.1,  // top
      -0.35, -0.4,   0.4,  -0.1,  -0.4, -0.1,  // top2
      -0.4,  -0.1,   0.4,  -0.1,   0.35, 0.4,  // body
      -0.4,  -0.1,   0.35,  0.4,  -0.35, 0.4,  // body2
    ],
    color: RED,
    emissive: 0.4,
  },

  // 7: Armada Gunship - wide angular with gun extensions
  {
    id: MESH_ID.ARMADA_GUNSHIP,
    name: 'Armada Gunship',
    vertices: [
      // Central body
      -0.2, -0.35,  0.2, -0.35,  0.2,  0.35,  // body right
      -0.2, -0.35,  0.2,  0.35, -0.2,  0.35,  // body left
      // Left gun
      -0.2, -0.2,  -0.5, -0.1,  -0.5,  0.2,   // gun
      -0.2, -0.2,  -0.5,  0.2,  -0.2,  0.1,   // gun2
      // Right gun
       0.2, -0.2,   0.5, -0.1,   0.5,  0.2,   // gun
       0.2, -0.2,   0.5,  0.2,   0.2,  0.1,   // gun2
    ],
    color: RED,
    emissive: 0.5,
  },

  // 8: Armada Dreadnought - large imposing angular shape
  {
    id: MESH_ID.ARMADA_DREADNOUGHT,
    name: 'Armada Dreadnought',
    vertices: [
      // Main hull
       0.0, -0.5,   0.3, -0.2,  -0.3, -0.2,  // nose
      -0.3, -0.2,   0.3, -0.2,   0.5,  0.1,  // upper
      -0.3, -0.2,   0.5,  0.1,  -0.5,  0.1,  // upper2
      -0.5,  0.1,   0.5,  0.1,   0.4,  0.45, // lower
      -0.5,  0.1,   0.4,  0.45, -0.4,  0.45, // lower2
      // Side armor
      -0.5,  0.1,  -0.4,  0.45, -0.5,  0.3,  // left armor
       0.5,  0.1,   0.4,  0.45,  0.5,  0.3,  // right armor
    ],
    color: RED,
    emissive: 0.6,
  },

  // 9: Power-up Spread - triple-arrow icon
  {
    id: MESH_ID.POWERUP_SPREAD,
    name: 'Spread Shot',
    vertices: [
      // Center arrow
       0.0, -0.4,   0.1, -0.1,  -0.1, -0.1,
      // Left arrow
      -0.25, -0.2,  -0.15, 0.1,  -0.35, 0.1,
      // Right arrow
       0.25, -0.2,   0.15, 0.1,   0.35, 0.1,
      // Base
      -0.15, 0.1,   0.15, 0.1,   0.0,  0.4,
    ],
    color: CYAN,
    emissive: 1.0,
  },

  // 10: Power-up Shield - hexagon outline (filled)
  {
    id: MESH_ID.POWERUP_SHIELD,
    name: 'Shield',
    vertices: [
       0.0,  0.0,   0.0, -0.45,  0.39, -0.22,
       0.0,  0.0,   0.39,-0.22,  0.39,  0.22,
       0.0,  0.0,   0.39, 0.22,  0.0,   0.45,
       0.0,  0.0,   0.0,  0.45, -0.39,  0.22,
       0.0,  0.0,  -0.39, 0.22, -0.39, -0.22,
       0.0,  0.0,  -0.39,-0.22,  0.0,  -0.45,
    ],
    color: BLUE_WHITE,
    emissive: 1.0,
  },

  // 11: Power-up Bomb - star/burst shape
  {
    id: MESH_ID.POWERUP_BOMB,
    name: 'Bomb',
    vertices: [
      // 4-pointed star
       0.0, -0.5,   0.12,-0.12,  -0.12, -0.12, // top spike
       0.5,  0.0,   0.12, 0.12,   0.12, -0.12, // right spike
       0.0,  0.5,  -0.12, 0.12,   0.12,  0.12, // bottom spike
      -0.5,  0.0,  -0.12,-0.12,  -0.12,  0.12, // left spike
      // Center fill
      -0.12,-0.12,  0.12,-0.12,   0.12,  0.12,
      -0.12,-0.12,  0.12, 0.12,  -0.12,  0.12,
    ],
    color: RED_PULSE,
    emissive: 1.2,
  },

  // 12: Power-up Speed - lightning bolt
  {
    id: MESH_ID.POWERUP_SPEED,
    name: 'Speed Boost',
    vertices: [
       0.1, -0.5,   0.25,-0.05,  -0.05, -0.05,
      -0.05,-0.05,  0.25,-0.05,   0.05,  0.05,
      -0.05,-0.05,  0.05, 0.05,  -0.25,  0.05,
      -0.25, 0.05, -0.1,  0.5,    0.05,  0.05,
    ],
    color: YELLOW,
    emissive: 1.0,
  },

  // 13: Power-up Homing Missiles - missile icon
  {
    id: MESH_ID.POWERUP_MISSILE,
    name: 'Homing Missiles',
    vertices: [
       0.0, -0.5,   0.15, 0.0,  -0.15, 0.0,   // nose
      -0.15, 0.0,   0.15, 0.0,   0.15,  0.3,  // body
      -0.15, 0.0,   0.15, 0.3,  -0.15,  0.3,  // body2
      -0.3,  0.3,   0.3,  0.3,   0.0,   0.5,  // fins
    ],
    color: ORANGE,
    emissive: 0.8,
  },

  // 14: Power-up Score Multiplier - diamond with x
  {
    id: MESH_ID.POWERUP_MULTIPLIER,
    name: 'Score Multiplier',
    vertices: [
       0.0, -0.45,  0.35, 0.0,   0.0,  0.0,   // top right
       0.0, -0.45, -0.35, 0.0,   0.0,  0.0,   // top left
       0.35, 0.0,    0.0, 0.45,   0.0,  0.0,   // bottom right
      -0.35, 0.0,    0.0, 0.45,   0.0,  0.0,   // bottom left
    ],
    color: GOLD,
    emissive: 1.0,
  },
];

// Lookup mesh by ID
export function getMesh(id: number): MeshDefinition | undefined {
  return MESHES.find(m => m.id === id);
}
