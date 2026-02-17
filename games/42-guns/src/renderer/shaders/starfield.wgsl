// Parallax Star Field Shader
// Compute shader updates star positions, vertex/fragment shaders render them

struct Star {
  posX: f32,
  posY: f32,
  brightness: f32,
  size: f32,
  speed: f32,       // parallax scroll speed
  twinklePhase: f32,
  twinkleSpeed: f32,
  layer: f32,       // 0=far, 1=mid, 2=near
};

struct StarParams {
  time: f32,
  screenWidth: f32,
  screenHeight: f32,
  dt: f32,
};

@group(0) @binding(0) var<storage, read_write> stars: array<Star>;
@group(0) @binding(1) var<uniform> params: StarParams;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= arrayLength(&stars)) {
    return;
  }

  var star = stars[index];

  // Scroll downward (simulates forward movement)
  star.posY += star.speed * params.dt;

  // Wrap around when off-screen
  if (star.posY > params.screenHeight + 5.0) {
    star.posY = -5.0;
    // Slight horizontal randomization on wrap
    star.posX = fract(star.posX * 0.618 + star.twinklePhase) * params.screenWidth;
  }

  // Twinkle: modulate brightness with sine wave
  let twinkle = 0.7 + 0.3 * sin(params.time * star.twinkleSpeed + star.twinklePhase);
  star.brightness = twinkle;

  stars[index] = star;
}

// === Render shaders ===

struct CameraUniform {
  projection: mat4x4<f32>,
  screenSize: vec2<f32>,
  time: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;
@group(1) @binding(0) var<storage, read> renderStars: array<Star>;

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

@vertex
fn vs_stars(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOutput {
  let star = renderStars[instanceIndex];

  let localPos = QUAD_VERTICES[vertexIndex] * star.size;
  let worldPos = localPos + vec2<f32>(star.posX, star.posY);

  var output: VertexOutput;
  output.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);

  // Stars are white/bluish with brightness modulation
  let warmth = star.layer * 0.1; // Nearer stars slightly warmer
  output.color = vec4<f32>(
    (0.8 + warmth) * star.brightness,
    (0.85 + warmth * 0.5) * star.brightness,
    1.0 * star.brightness,
    star.brightness
  );

  output.uv = QUAD_VERTICES[vertexIndex] + vec2<f32>(0.5, 0.5);

  return output;
}

@fragment
fn fs_stars(input: VertexOutput) -> @location(0) vec4<f32> {
  // Circular point with soft glow
  let dist = length(input.uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let core = 1.0 - smoothstep(0.0, 0.4, dist);
  let glow = (1.0 - smoothstep(0.3, 1.0, dist)) * 0.3;
  let alpha = core + glow;

  return vec4<f32>(input.color.rgb * (1.0 + core * 0.5), alpha * input.color.a);
}
