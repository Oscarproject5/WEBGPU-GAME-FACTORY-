// GPU Compute Particle Simulation Shader
// Simulates particle position, velocity, lifetime, and color interpolation

struct Particle {
  posX: f32,
  posY: f32,
  velX: f32,
  velY: f32,
  lifetime: f32,
  maxLifetime: f32,
  startR: f32,
  startG: f32,
  startB: f32,
  startA: f32,
  endR: f32,
  endG: f32,
  endB: f32,
  endA: f32,
  size: f32,
  startSize: f32,
};

struct SimParams {
  dt: f32,
  gravity: f32,
  drag: f32,
  _pad: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: SimParams;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= arrayLength(&particles)) {
    return;
  }

  var p = particles[index];

  // Skip dead particles
  if (p.lifetime <= 0.0) {
    return;
  }

  // Update lifetime
  p.lifetime -= params.dt;
  if (p.lifetime <= 0.0) {
    p.lifetime = 0.0;
    particles[index] = p;
    return;
  }

  // Apply drag
  p.velX *= (1.0 - params.drag * params.dt);
  p.velY *= (1.0 - params.drag * params.dt);

  // Apply gravity
  p.velY += params.gravity * params.dt;

  // Update position
  p.posX += p.velX * params.dt;
  p.posY += p.velY * params.dt;

  // Interpolate size over lifetime (shrink as it dies)
  let lifeRatio = p.lifetime / p.maxLifetime;
  p.size = p.startSize * lifeRatio;

  particles[index] = p;
}
