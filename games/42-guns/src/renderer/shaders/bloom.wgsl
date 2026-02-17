// Bloom Post-Processing Shader
// Pass 1: Extract bright pixels
// Pass 2: Horizontal gaussian blur
// Pass 3: Vertical gaussian blur
// Pass 4: Additive blend with original

struct BloomParams {
  threshold: f32,
  intensity: f32,
  texelSizeX: f32,
  texelSizeY: f32,
};

@group(0) @binding(0) var inputTexture: texture_2d<f32>;
@group(0) @binding(1) var inputSampler: sampler;
@group(0) @binding(2) var<uniform> params: BloomParams;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_fullscreen(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;
  let x = f32(i32(vertexIndex & 1u)) * 4.0 - 1.0;
  let y = f32(i32(vertexIndex >> 1u)) * 4.0 - 1.0;
  output.position = vec4<f32>(x, y, 0.0, 1.0);
  output.uv = vec2<f32>((x + 1.0) * 0.5, (1.0 - y) * 0.5);
  return output;
}

// Brightness extraction
@fragment
fn fs_extract(input: VertexOutput) -> @location(0) vec4<f32> {
  let color = textureSample(inputTexture, inputSampler, input.uv);
  let brightness = dot(color.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));

  if (brightness > params.threshold) {
    return vec4<f32>(color.rgb * (brightness - params.threshold), 1.0);
  }
  return vec4<f32>(0.0, 0.0, 0.0, 1.0);
}

// 5-tap gaussian blur weights
const WEIGHTS = array<f32, 5>(0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

// Horizontal blur
@fragment
fn fs_blur_h(input: VertexOutput) -> @location(0) vec4<f32> {
  var result = textureSample(inputTexture, inputSampler, input.uv).rgb * WEIGHTS[0];

  for (var i = 1; i < 5; i++) {
    let offset = vec2<f32>(params.texelSizeX * f32(i), 0.0);
    result += textureSample(inputTexture, inputSampler, input.uv + offset).rgb * WEIGHTS[i];
    result += textureSample(inputTexture, inputSampler, input.uv - offset).rgb * WEIGHTS[i];
  }

  return vec4<f32>(result, 1.0);
}

// Vertical blur
@fragment
fn fs_blur_v(input: VertexOutput) -> @location(0) vec4<f32> {
  var result = textureSample(inputTexture, inputSampler, input.uv).rgb * WEIGHTS[0];

  for (var i = 1; i < 5; i++) {
    let offset = vec2<f32>(0.0, params.texelSizeY * f32(i));
    result += textureSample(inputTexture, inputSampler, input.uv + offset).rgb * WEIGHTS[i];
    result += textureSample(inputTexture, inputSampler, input.uv - offset).rgb * WEIGHTS[i];
  }

  return vec4<f32>(result, 1.0);
}
