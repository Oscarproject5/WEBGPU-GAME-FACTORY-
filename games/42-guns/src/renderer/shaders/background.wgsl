// Cosmic Background Shader
// Procedural nebula and cosmic dust rendered as a full-screen quad

struct BackgroundParams {
  time: f32,
  screenWidth: f32,
  screenHeight: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> params: BackgroundParams;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

// Full-screen triangle
@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Oversized triangle clipped to viewport for full-screen coverage
  let x = f32(i32(vertexIndex & 1u)) * 4.0 - 1.0;
  let y = f32(i32(vertexIndex >> 1u)) * 4.0 - 1.0;
  output.position = vec4<f32>(x, y, 0.0, 1.0);
  output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);

  return output;
}

// Simple hash-based noise
fn hash(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.x, p.y, p.x) * 0.13);
  p3 += dot(p3, p3.yzx + 3.333);
  return fract((p3.x + p3.y) * p3.z);
}

// Value noise
fn noise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f); // smoothstep

  return mix(
    mix(hash(i + vec2<f32>(0.0, 0.0)), hash(i + vec2<f32>(1.0, 0.0)), u.x),
    mix(hash(i + vec2<f32>(0.0, 1.0)), hash(i + vec2<f32>(1.0, 1.0)), u.x),
    u.y
  );
}

// Fractal Brownian Motion
fn fbm(p: vec2<f32>) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 5; i++) {
    value += amplitude * noise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let aspectRatio = params.screenWidth / params.screenHeight;

  // Slow drift animation
  let drift = params.time * 0.01;
  let scaledUV = vec2<f32>(uv.x * aspectRatio, uv.y) * 3.0;

  // Deep space base color: near-black cosmic blue oklch(0.08 0.03 270)
  let baseColor = vec3<f32>(0.01, 0.01, 0.04);

  // Nebula layer 1: deep indigo/purple
  let n1 = fbm(scaledUV + vec2<f32>(drift * 0.3, drift * 0.2));
  let nebula1Color = vec3<f32>(0.06, 0.02, 0.12); // Deep violet
  let nebula1 = nebula1Color * smoothstep(0.3, 0.7, n1) * 0.6;

  // Nebula layer 2: subtle blue
  let n2 = fbm(scaledUV * 1.5 + vec2<f32>(-drift * 0.2, drift * 0.15) + 42.0);
  let nebula2Color = vec3<f32>(0.02, 0.04, 0.1); // Dark blue
  let nebula2 = nebula2Color * smoothstep(0.35, 0.65, n2) * 0.5;

  // Nebula layer 3: very subtle magenta wisps
  let n3 = fbm(scaledUV * 2.0 + vec2<f32>(drift * 0.1, -drift * 0.1) + 100.0);
  let nebula3Color = vec3<f32>(0.08, 0.01, 0.06); // Dark magenta
  let nebula3 = nebula3Color * smoothstep(0.4, 0.7, n3) * 0.3;

  // Combine
  var color = baseColor + nebula1 + nebula2 + nebula3;

  // Very subtle vignette on the background itself
  let vignetteUV = uv * 2.0 - 1.0;
  let vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.2;
  color *= vignette;

  return vec4<f32>(color, 1.0);
}
