/**
 * Color Ramps for Particle Effects
 * Each ramp is an array of [r, g, b, a] stops interpolated over a particle's lifetime.
 */

export interface ColorStop {
  t: number;  // 0-1 position in lifetime
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorRamp {
  name: string;
  stops: ColorStop[];
}

// Interpolate a color ramp at a given t (0-1)
export function sampleRamp(ramp: ColorRamp, t: number): [number, number, number, number] {
  const stops = ramp.stops;
  if (stops.length === 0) return [1, 1, 1, 1];
  if (t <= stops[0].t) return [stops[0].r, stops[0].g, stops[0].b, stops[0].a];
  if (t >= stops[stops.length - 1].t) {
    const last = stops[stops.length - 1];
    return [last.r, last.g, last.b, last.a];
  }

  // Find surrounding stops
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) {
      const localT = (t - stops[i].t) / (stops[i + 1].t - stops[i].t);
      const a = stops[i];
      const b = stops[i + 1];
      return [
        a.r + (b.r - a.r) * localT,
        a.g + (b.g - a.g) * localT,
        a.b + (b.b - a.b) * localT,
        a.a + (b.a - a.a) * localT,
      ];
    }
  }

  return [1, 1, 1, 1];
}

// Explosion: white → yellow → orange → red → dark red → fade out
export const EXPLOSION_RAMP: ColorRamp = {
  name: 'Explosion',
  stops: [
    { t: 0.0, r: 1.0,  g: 1.0,  b: 0.9,  a: 1.0 },  // White-hot
    { t: 0.15, r: 1.0,  g: 0.9,  b: 0.3,  a: 1.0 },  // Yellow
    { t: 0.35, r: 1.0,  g: 0.5,  b: 0.1,  a: 0.9 },  // Orange
    { t: 0.6, r: 0.8,  g: 0.2,  b: 0.05, a: 0.7 },  // Red
    { t: 0.8, r: 0.4,  g: 0.05, b: 0.02, a: 0.4 },  // Dark red
    { t: 1.0, r: 0.2,  g: 0.02, b: 0.01, a: 0.0 },  // Fade out
  ],
};

// Player trail: bright cyan → dark blue → transparent
export const PLAYER_TRAIL_RAMP: ColorRamp = {
  name: 'Player Trail',
  stops: [
    { t: 0.0, r: 0.4,  g: 0.95, b: 1.0,  a: 1.0 },  // Bright cyan
    { t: 0.3, r: 0.15, g: 0.7,  b: 0.9,  a: 0.8 },  // Mid cyan
    { t: 0.7, r: 0.05, g: 0.3,  b: 0.6,  a: 0.4 },  // Dark blue
    { t: 1.0, r: 0.02, g: 0.1,  b: 0.3,  a: 0.0 },  // Transparent
  ],
};

// Swarm explosion: green tinted
export const SWARM_EXPLOSION_RAMP: ColorRamp = {
  name: 'Swarm Explosion',
  stops: [
    { t: 0.0, r: 0.8,  g: 1.0,  b: 0.6,  a: 1.0 },
    { t: 0.2, r: 0.4,  g: 0.9,  b: 0.3,  a: 0.9 },
    { t: 0.5, r: 0.2,  g: 0.6,  b: 0.1,  a: 0.6 },
    { t: 0.8, r: 0.1,  g: 0.3,  b: 0.05, a: 0.3 },
    { t: 1.0, r: 0.05, g: 0.15, b: 0.02, a: 0.0 },
  ],
};

// Armada explosion: red/metallic
export const ARMADA_EXPLOSION_RAMP: ColorRamp = {
  name: 'Armada Explosion',
  stops: [
    { t: 0.0, r: 1.0,  g: 0.9,  b: 0.7,  a: 1.0 },
    { t: 0.2, r: 1.0,  g: 0.5,  b: 0.2,  a: 0.9 },
    { t: 0.5, r: 0.8,  g: 0.15, b: 0.1,  a: 0.7 },
    { t: 0.8, r: 0.4,  g: 0.08, b: 0.05, a: 0.3 },
    { t: 1.0, r: 0.2,  g: 0.04, b: 0.02, a: 0.0 },
  ],
};

// Power-up glow: white-cyan pulse
export const POWERUP_GLOW_RAMP: ColorRamp = {
  name: 'Power-Up Glow',
  stops: [
    { t: 0.0, r: 0.9,  g: 1.0,  b: 1.0,  a: 1.0 },
    { t: 0.3, r: 0.5,  g: 0.85, b: 0.95, a: 0.8 },
    { t: 0.7, r: 0.3,  g: 0.6,  b: 0.8,  a: 0.4 },
    { t: 1.0, r: 0.1,  g: 0.3,  b: 0.5,  a: 0.0 },
  ],
};

// Ambient dust: very subtle floating specks
export const AMBIENT_DUST_RAMP: ColorRamp = {
  name: 'Ambient Dust',
  stops: [
    { t: 0.0, r: 0.4, g: 0.4, b: 0.6, a: 0.0 },
    { t: 0.2, r: 0.4, g: 0.4, b: 0.6, a: 0.15 },
    { t: 0.8, r: 0.3, g: 0.3, b: 0.5, a: 0.15 },
    { t: 1.0, r: 0.3, g: 0.3, b: 0.5, a: 0.0 },
  ],
};

// Shield hit flash
export const SHIELD_HIT_RAMP: ColorRamp = {
  name: 'Shield Hit',
  stops: [
    { t: 0.0, r: 0.8,  g: 0.95, b: 1.0, a: 1.0 },
    { t: 0.2, r: 0.5,  g: 0.8,  b: 1.0, a: 0.8 },
    { t: 0.5, r: 0.3,  g: 0.6,  b: 0.9, a: 0.4 },
    { t: 1.0, r: 0.1,  g: 0.3,  b: 0.6, a: 0.0 },
  ],
};
