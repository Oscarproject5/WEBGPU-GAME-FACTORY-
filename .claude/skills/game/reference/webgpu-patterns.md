# WebGPU Common Patterns Reference

## Device Initialization
```typescript
const adapter = await navigator.gpu.requestAdapter({
  powerPreference: 'high-performance'
});
if (!adapter) throw new Error('WebGPU not supported');

const device = await adapter.requestDevice({
  requiredFeatures: ['texture-compression-bc'],
  requiredLimits: {
    maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
    maxBufferSize: adapter.limits.maxBufferSize,
  }
});

device.lost.then((info) => {
  console.error(`GPU device lost: ${info.message}`);
  if (info.reason !== 'destroyed') reinitialize();
});
```

## Render Pipeline Pattern
```typescript
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({ code: vertexShader }),
    entryPoint: 'vs_main',
    buffers: [vertexBufferLayout],
  },
  fragment: {
    module: device.createShaderModule({ code: fragmentShader }),
    entryPoint: 'fs_main',
    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
  },
  primitive: { topology: 'triangle-list', cullMode: 'back' },
  depthStencil: {
    format: 'depth24plus',
    depthWriteEnabled: true,
    depthCompare: 'less',
  },
});
```

## Compute Shader for Particle Systems
```wgsl
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: SimParams;

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let i = id.x;
  if (i >= params.count) { return; }

  var p = particles[i];
  p.velocity += params.gravity * params.dt;
  p.position += p.velocity * params.dt;
  p.life -= params.dt;

  if (p.life <= 0.0) {
    p = respawn(i, params.time);
  }

  particles[i] = p;
}
```

## Post-Processing Chain
Standard post-process order:
1. Scene render → HDR framebuffer
2. Bright pass extraction (threshold > 1.0)
3. Gaussian blur (horizontal + vertical, multi-pass)
4. Bloom composite (additive blend)
5. Tone mapping (ACES filmic)
6. Color grading (LUT or parametric)
7. Vignette
8. Final output to swapchain

## Modern CSS Design Tokens
```css
:root {
  --color-bg: oklch(0.15 0.01 260);
  --color-surface: oklch(0.20 0.02 260);
  --color-primary: oklch(0.75 0.18 160);
  --color-accent: oklch(0.80 0.20 30);
  --color-text: oklch(0.95 0.01 260);
  --color-text-dim: oklch(0.65 0.01 260);

  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --radius-sm: 0.375rem;
  --radius-md: 0.75rem;
  --radius-lg: 1.5rem;

  --glass: oklch(0.20 0.02 260 / 0.6);
  --glass-border: oklch(0.40 0.02 260 / 0.3);
  --blur: blur(20px);
}
```

## Glassmorphism UI Panel
```css
.game-panel {
  background: var(--glass);
  backdrop-filter: var(--blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  box-shadow:
    0 8px 32px oklch(0 0 0 / 0.3),
    inset 0 1px 0 oklch(1 0 0 / 0.05);
}
```
