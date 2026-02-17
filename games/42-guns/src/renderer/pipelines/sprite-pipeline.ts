/**
 * Sprite Instanced Rendering Pipeline
 * Renders all game entities as instanced quads with transform, color, and emissive glow.
 */

import spriteShaderSource from '../shaders/sprite.wgsl?raw';

export interface SpriteInstance {
  posX: number;
  posY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  r: number;
  g: number;
  b: number;
  a: number;
  emissive: number;
  meshId: number;
}

// 12 floats per instance (11 data + 1 padding for alignment)
const INSTANCE_FLOATS = 12;
const INSTANCE_BYTE_SIZE = INSTANCE_FLOATS * 4;
const MAX_INSTANCES = 4096;

export class SpritePipeline {
  private device!: GPUDevice;
  private pipeline!: GPURenderPipeline;
  private cameraBindGroupLayout!: GPUBindGroupLayout;
  private instanceBindGroupLayout!: GPUBindGroupLayout;
  private cameraBuffer!: GPUBuffer;
  private instanceBuffer!: GPUBuffer;
  private cameraBindGroup!: GPUBindGroup;
  private instanceBindGroup!: GPUBindGroup;
  private instanceData!: Float32Array;
  private canvasWidth = 0;
  private canvasHeight = 0;

  // Expose bind group layout so other pipelines (particles) can share camera
  get cameraLayout(): GPUBindGroupLayout {
    return this.cameraBindGroupLayout;
  }

  get cameraGroup(): GPUBindGroup {
    return this.cameraBindGroup;
  }

  async init(device: GPUDevice, targetFormat: GPUTextureFormat, canvasWidth: number, canvasHeight: number): Promise<void> {
    this.device = device;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Create shader module
    const shaderModule = device.createShaderModule({
      label: 'Sprite Shader',
      code: spriteShaderSource,
    });

    // Bind group layouts
    this.cameraBindGroupLayout = device.createBindGroupLayout({
      label: 'Camera Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
      ],
    });

    this.instanceBindGroupLayout = device.createBindGroupLayout({
      label: 'Instance Bind Group Layout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'read-only-storage' },
        },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      label: 'Sprite Pipeline Layout',
      bindGroupLayouts: [this.cameraBindGroupLayout, this.instanceBindGroupLayout],
    });

    // Create render pipeline
    this.pipeline = device.createRenderPipeline({
      label: 'Sprite Render Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format: targetFormat,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    // Camera uniform buffer (mat4 + vec2 + f32 + f32 = 16+2+1+1 = 20 floats, padded to 80 bytes)
    this.cameraBuffer = device.createBuffer({
      label: 'Camera Uniform Buffer',
      size: 80, // mat4x4 (64) + vec2 (8) + f32 (4) + f32 pad (4) = 80
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Instance storage buffer
    this.instanceBuffer = device.createBuffer({
      label: 'Instance Storage Buffer',
      size: MAX_INSTANCES * INSTANCE_BYTE_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.instanceData = new Float32Array(MAX_INSTANCES * INSTANCE_FLOATS);

    // Bind groups
    this.cameraBindGroup = device.createBindGroup({
      label: 'Camera Bind Group',
      layout: this.cameraBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.cameraBuffer } },
      ],
    });

    this.instanceBindGroup = device.createBindGroup({
      label: 'Instance Bind Group',
      layout: this.instanceBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.instanceBuffer } },
      ],
    });

    // Set initial camera projection
    this.updateProjection(canvasWidth, canvasHeight);
  }

  updateProjection(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    // Orthographic projection: (0,0) top-left, (width,height) bottom-right
    // Maps pixel coordinates to clip space [-1, 1]
    const projectionMatrix = new Float32Array([
      2 / width,  0,           0, 0,
      0,         -2 / height,  0, 0,
      0,          0,           1, 0,
      -1,         1,           0, 1,
    ]);

    const cameraData = new Float32Array(20);
    cameraData.set(projectionMatrix, 0);
    cameraData[16] = width;
    cameraData[17] = height;
    cameraData[18] = 0; // time (updated per frame)
    cameraData[19] = 0; // padding

    this.device.queue.writeBuffer(this.cameraBuffer, 0, cameraData);
  }

  updateTime(time: number): void {
    const timeData = new Float32Array([time]);
    this.device.queue.writeBuffer(this.cameraBuffer, 72, timeData); // offset for time field
  }

  render(pass: GPURenderPassEncoder, instances: SpriteInstance[]): void {
    const count = Math.min(instances.length, MAX_INSTANCES);
    if (count === 0) return;

    // Pack instance data
    for (let i = 0; i < count; i++) {
      const inst = instances[i];
      const offset = i * INSTANCE_FLOATS;
      this.instanceData[offset + 0] = inst.posX;
      this.instanceData[offset + 1] = inst.posY;
      this.instanceData[offset + 2] = inst.rotation;
      this.instanceData[offset + 3] = inst.scaleX;
      this.instanceData[offset + 4] = inst.scaleY;
      this.instanceData[offset + 5] = inst.r;
      this.instanceData[offset + 6] = inst.g;
      this.instanceData[offset + 7] = inst.b;
      this.instanceData[offset + 8] = inst.a;
      this.instanceData[offset + 9] = inst.emissive;
      this.instanceData[offset + 10] = inst.meshId;
      this.instanceData[offset + 11] = 0; // padding
    }

    // Upload instance data
    this.device.queue.writeBuffer(
      this.instanceBuffer,
      0,
      this.instanceData.buffer,
      0,
      count * INSTANCE_BYTE_SIZE,
    );

    // Draw
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.cameraBindGroup);
    pass.setBindGroup(1, this.instanceBindGroup);
    pass.draw(6, count); // 6 vertices per quad, N instances
  }

  destroy(): void {
    this.cameraBuffer?.destroy();
    this.instanceBuffer?.destroy();
  }
}
