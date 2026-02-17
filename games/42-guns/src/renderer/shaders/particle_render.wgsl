// Particle Rendering Shader
// Renders particles as quads from compute buffer data with color interpolation

struct CameraUniform {
  projection: mat4x4<f32>,
  screenSize: vec2<f32>,
  time: f32,
  _pad: f32,
};

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

@group(0) @binding(0) var<uniform> camera: CameraUniform;
@group(1) @binding(0) var<storage, read> particles: array<Particle>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) uv: vec2<f32>,
};

const QUAD_VERTICES = array<vec2<f32>, 6>(
  vec2<f32>(-0.5, -0.5),
  vec2<f32>( 0.5, -0.5),
  vec2<f32>(-0.5,  0.5),
  vec2<f32>(-0.5,  0.5),
  vec2<f32>( 0.5, -0.5),
  vec2<f32>( 0.5,  0.5),
);

const QUAD_UVS = array<vec2<f32>, 6>(
  vec2<f32>(0.0, 0.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(0.0, 1.0),
  vec2<f32>(0.0, 1.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(1.0, 1.0),
);

@vertex
fn vs_main(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOutput {
  let p = particles[instanceIndex];

  var output: VertexOutput;

  // Skip dead particles (move off-screen)
  if (p.lifetime <= 0.0) {
    output.position = vec4<f32>(-9999.0, -9999.0, 0.0, 1.0);
    output.color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    output.uv = vec2<f32>(0.0, 0.0);
    return output;
  }

  let localPos = QUAD_VERTICES[vertexIndex] * p.size;
  let worldPos = localPos + vec2<f32>(p.posX, p.posY);

  output.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);

  // Interpolate color based on lifetime ratio
  let lifeRatio = 1.0 - (p.lifetime / p.maxLifetime); // 0 = just born, 1 = about to die
  let r = mix(p.startR, p.endR, lifeRatio);
  let g = mix(p.startG, p.endG, lifeRatio);
  let b = mix(p.startB, p.endB, lifeRatio);
  let a = mix(p.startA, p.endA, lifeRatio);
  output.color = vec4<f32>(r, g, b, a);

  output.uv = QUAD_UVS[vertexIndex];

  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  // Circular particle shape with soft edges
  let dist = length(input.uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let alpha = 1.0 - smoothstep(0.6, 1.0, dist);

  var color = input.color;
  color.a *= alpha;

  // Emissive boost for bloom (particles are naturally bright)
  color = vec4<f32>(color.rgb * 1.5, color.a);

  return color;
}
