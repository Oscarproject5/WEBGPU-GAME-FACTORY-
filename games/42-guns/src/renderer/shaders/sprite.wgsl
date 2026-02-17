// Sprite Instanced Rendering Shader
// Renders 2D quads with per-instance transform, color, and emissive glow

struct CameraUniform {
  projection: mat4x4<f32>,
  screenSize: vec2<f32>,
  time: f32,
  _pad: f32,
};

struct InstanceData {
  posX: f32,
  posY: f32,
  rotation: f32,
  scaleX: f32,
  scaleY: f32,
  r: f32,
  g: f32,
  b: f32,
  a: f32,
  emissive: f32,
  meshId: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> camera: CameraUniform;
@group(1) @binding(0) var<storage, read> instances: array<InstanceData>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) emissive: f32,
  @location(2) uv: vec2<f32>,
};

// Quad vertices (2 triangles forming a unit quad centered at origin)
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
  let instance = instances[instanceIndex];
  let localPos = QUAD_VERTICES[vertexIndex];

  // Apply scale
  var pos = localPos * vec2<f32>(instance.scaleX, instance.scaleY);

  // Apply rotation
  let cosR = cos(instance.rotation);
  let sinR = sin(instance.rotation);
  let rotatedPos = vec2<f32>(
    pos.x * cosR - pos.y * sinR,
    pos.x * sinR + pos.y * cosR,
  );

  // Apply translation
  let worldPos = rotatedPos + vec2<f32>(instance.posX, instance.posY);

  var output: VertexOutput;
  output.position = camera.projection * vec4<f32>(worldPos, 0.0, 1.0);
  output.color = vec4<f32>(instance.r, instance.g, instance.b, instance.a);
  output.emissive = instance.emissive;
  output.uv = QUAD_UVS[vertexIndex];

  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  var color = input.color;

  // Apply emissive glow - boost brightness for bloom to pick up
  let emissiveBoost = 1.0 + input.emissive * 2.0;
  color = vec4<f32>(color.rgb * emissiveBoost, color.a);

  // Soft edge for diamond/circular shapes based on UV distance from center
  let dist = length(input.uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let edgeSoftness = 1.0 - smoothstep(0.8, 1.0, dist);
  color.a *= edgeSoftness;

  return color;
}
