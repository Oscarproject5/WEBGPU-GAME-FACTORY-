// Composite Post-Processing Shader
// Combines bloom with original, applies chromatic aberration, vignette, color grading, and film grain

struct CompositeParams {
  chromaticIntensity: f32,  // pixels of RGB offset
  vignetteIntensity: f32,   // 0-1 vignette strength
  scanlineEnabled: f32,     // 0 or 1
  time: f32,
  screenWidth: f32,
  screenHeight: f32,
  bloomIntensity: f32,
  grainIntensity: f32,
};

@group(0) @binding(0) var sceneTexture: texture_2d<f32>;
@group(0) @binding(1) var bloomTexture: texture_2d<f32>;
@group(0) @binding(2) var texSampler: sampler;
@group(0) @binding(3) var<uniform> params: CompositeParams;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;
  let x = f32(i32(vertexIndex & 1u)) * 4.0 - 1.0;
  let y = f32(i32(vertexIndex >> 1u)) * 4.0 - 1.0;
  output.position = vec4<f32>(x, y, 0.0, 1.0);
  output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
  return output;
}

// Simple noise function for grain
fn random(st: vec2<f32>) -> f32 {
  return fract(sin(dot(st, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  let uv = input.uv;
  let texelSize = vec2<f32>(1.0 / params.screenWidth, 1.0 / params.screenHeight);

  // === Chromatic Aberration ===
  let chromaticOffset = params.chromaticIntensity * texelSize;
  let centerOffset = (uv - vec2<f32>(0.5, 0.5));
  let r = textureSample(sceneTexture, texSampler, uv + centerOffset * chromaticOffset.x).r;
  let g = textureSample(sceneTexture, texSampler, uv).g;
  let b = textureSample(sceneTexture, texSampler, uv - centerOffset * chromaticOffset.x).b;
  var color = vec3<f32>(r, g, b);

  // === Add Bloom ===
  let bloom = textureSample(bloomTexture, texSampler, uv).rgb;
  color += bloom * params.bloomIntensity;

  // === Scanlines ===
  if (params.scanlineEnabled > 0.5) {
    let scanline = sin(uv.y * params.screenHeight * 3.14159) * 0.5 + 0.5;
    color *= 0.7 + 0.3 * scanline;
  }

  // === Vignette ===
  let vignetteUV = uv * 2.0 - 1.0;
  let vignetteDist = dot(vignetteUV, vignetteUV);
  var vignette = 1.0 - vignetteDist * params.vignetteIntensity;
  vignette = clamp(vignette, 0.0, 1.0);
  vignette = smoothstep(0.0, 1.0, vignette);
  color *= vignette;

  // === Color Grading (teal-orange split tone) ===
  let luminance = dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
  let shadows = vec3<f32>(0.0, 0.05, 0.08); // Teal shadows
  let highlights = vec3<f32>(0.08, 0.04, 0.0); // Warm highlights

  let shadowWeight = 1.0 - smoothstep(0.0, 0.5, luminance);
  let highlightWeight = smoothstep(0.5, 1.0, luminance);

  color += shadows * shadowWeight * 0.3;
  color += highlights * highlightWeight * 0.2;

  // === Film Grain ===
  let grain = random(uv + vec2<f32>(params.time * 0.1, params.time * 0.07)) - 0.5;
  color += vec3<f32>(grain * params.grainIntensity);

  // Tone mapping (simple Reinhard)
  color = color / (color + vec3<f32>(1.0));

  // Gamma correction
  color = pow(color, vec3<f32>(1.0 / 2.2));

  return vec4<f32>(clamp(color, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);
}
