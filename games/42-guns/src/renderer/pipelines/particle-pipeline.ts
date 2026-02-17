/**
 * GPU Compute Particle Pipeline
 * Manages particle simulation via compute shader and rendering via instanced quads.
 */

import particleSimSource from '../shaders/particle_sim.wgsl?raw';
import particleRenderSource from '../shaders/particle_render.wgsl?raw';

// Must match WGSL Particle struct (16 x f32 = 64 bytes)
const PARTICLE_FLOATS = 16;
const PARTICLE_BYTE_SIZE = PARTICLE_FLOATS * 4;
const MAX_PARTICLES = 10000;
const WORKGROUP_SIZE = 64;

export interface ParticleEmitConfig {
  x: number;
  y: number;
  count: number;
  spreadAngle: number;       // Radians, full spread cone
  baseAngle: number;         // Radians, center direction
  speedMin: number;
  speedMax: number;
  lifetimeMin: number;
  lifetimeMax: number;
  sizeMin: number;
  sizeMax: number;
  startColor: [number, number, number, number]; // rgba
  endColor: [number, number, number, number];   // rgba
  gravity?: number;
}

// Preset particle configs
export const PARTICLE_PRESETS = {
  explosion: (x: number, y: number, scale = 1): ParticleEmitConfig => ({
    x, y,
    count: Math.floor(30 * scale),
    spreadAngle: Math.PI * 2,
    baseAngle: 0,
    speedMin: 80,
    speedMax: 300,
    lifetimeMin: 0.3,
    lifetimeMax: 0.8,
    sizeMin: 3,
    sizeMax: 8,
    startColor: [1.0, 0.9, 0.5, 1.0],
    endColor: [0.4, 0.05, 0.02, 0.0],
  }),

  trail: (x: number, y: number): ParticleEmitConfig => ({
    x, y,
    count: 2,
    spreadAngle: 0.3,
    baseAngle: Math.PI / 2, // downward
    speedMin: 20,
    speedMax: 60,
    lifetimeMin: 0.2,
    lifetimeMax: 0.5,
    sizeMin: 2,
    sizeMax: 5,
    startColor: [0.4, 0.95, 1.0, 0.8],
    endColor: [0.05, 0.3, 0.6, 0.0],
  }),

  debris: (x: number, y: number, color: [number, number, number, number]): ParticleEmitConfig => ({
    x, y,
    count: 12,
    spreadAngle: Math.PI * 2,
    baseAngle: 0,
    speedMin: 50,
    speedMax: 200,
    lifetimeMin: 0.5,
    lifetimeMax: 1.2,
    sizeMin: 2,
    sizeMax: 5,
    startColor: color,
    endColor: [color[0] * 0.3, color[1] * 0.3, color[2] * 0.3, 0.0],
    gravity: 100,
  }),

  dust: (x: number, y: number): ParticleEmitConfig => ({
    x, y,
    count: 1,
    spreadAngle: Math.PI * 2,
    baseAngle: 0,
    speedMin: 5,
    speedMax: 20,
    lifetimeMin: 2.0,
    lifetimeMax: 5.0,
    sizeMin: 1,
    sizeMax: 3,
    startColor: [0.4, 0.4, 0.6, 0.0],
    endColor: [0.3, 0.3, 0.5, 0.0],
  }),

  powerupCollect: (x: number, y: number): ParticleEmitConfig => ({
    x, y,
    count: 20,
    spreadAngle: Math.PI * 2,
    baseAngle: 0,
    speedMin: 60,
    speedMax: 180,
    lifetimeMin: 0.3,
    lifetimeMax: 0.7,
    sizeMin: 3,
    sizeMax: 7,
    startColor: [0.9, 1.0, 1.0, 1.0],
    endColor: [0.3, 0.6, 0.8, 0.0],
  }),
};

export class ParticlePipeline {
  private device!: GPUDevice;
  private computePipeline!: GPUComputePipeline;
  private renderPipeline!: GPURenderPipeline;
  private particleBuffer!: GPUBuffer;
  private simParamsBuffer!: GPUBuffer;
  private computeBindGroup!: GPUBindGroup;
  private renderBindGroup!: GPUBindGroup;
  private cpuParticleData!: Float32Array;
  private nextParticleIndex = 0;
  private activeParticleCount = 0;
  private defaultGravity = 0;

  async init(
    device: GPUDevice,
    targetFormat: GPUTextureFormat,
    cameraBindGroupLayout: GPUBindGroupLayout,
    cameraBindGroup: GPUBindGroup,
  ): Promise<void> {
    this.device = device;

    // Create particle buffer (storage, used by both compute and render)
    this.particleBuffer = device.createBuffer({
      label: 'Particle Buffer',
      size: MAX_PARTICLES * PARTICLE_BYTE_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Simulation params uniform
    this.simParamsBuffer = device.createBuffer({
      label: 'Particle Sim Params',
      size: 16, // 4 x f32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // CPU-side particle data for emitting
    this.cpuParticleData = new Float32Array(MAX_PARTICLES * PARTICLE_FLOATS);

    // === Compute Pipeline ===
    const computeModule = device.createShaderModule({
      label: 'Particle Compute Shader',
      code: particleSimSource,
    });

    const computeBindGroupLayout = device.createBindGroupLayout({
      label: 'Particle Compute Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    this.computePipeline = device.createComputePipeline({
      label: 'Particle Compute Pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout],
      }),
      compute: {
        module: computeModule,
        entryPoint: 'cs_main',
      },
    });

    this.computeBindGroup = device.createBindGroup({
      label: 'Particle Compute Bind Group',
      layout: computeBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
        { binding: 1, resource: { buffer: this.simParamsBuffer } },
      ],
    });

    // === Render Pipeline ===
    const renderModule = device.createShaderModule({
      label: 'Particle Render Shader',
      code: particleRenderSource,
    });

    const renderParticleBindGroupLayout = device.createBindGroupLayout({
      label: 'Particle Render Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.renderPipeline = device.createRenderPipeline({
      label: 'Particle Render Pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [cameraBindGroupLayout, renderParticleBindGroupLayout],
      }),
      vertex: {
        module: renderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: renderModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format: targetFormat,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one', // Additive blending for glow
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one',
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

    this.renderBindGroup = device.createBindGroup({
      label: 'Particle Render Bind Group',
      layout: renderParticleBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.particleBuffer } },
      ],
    });

    // Store camera bind group reference for render
    this._cameraBindGroup = cameraBindGroup;

    // Initialize all particles as dead
    this.cpuParticleData.fill(0);
    this.device.queue.writeBuffer(this.particleBuffer, 0, this.cpuParticleData as unknown as Float32Array<ArrayBuffer>);
  }

  private _cameraBindGroup!: GPUBindGroup;

  emit(config: ParticleEmitConfig): void {
    for (let i = 0; i < config.count; i++) {
      const idx = this.nextParticleIndex;
      this.nextParticleIndex = (this.nextParticleIndex + 1) % MAX_PARTICLES;
      this.activeParticleCount = Math.min(this.activeParticleCount + 1, MAX_PARTICLES);

      const angle = config.baseAngle + (Math.random() - 0.5) * config.spreadAngle;
      const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
      const lifetime = config.lifetimeMin + Math.random() * (config.lifetimeMax - config.lifetimeMin);
      const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);

      const offset = idx * PARTICLE_FLOATS;
      this.cpuParticleData[offset + 0] = config.x + (Math.random() - 0.5) * 10; // posX with slight spread
      this.cpuParticleData[offset + 1] = config.y + (Math.random() - 0.5) * 10; // posY
      this.cpuParticleData[offset + 2] = Math.cos(angle) * speed; // velX
      this.cpuParticleData[offset + 3] = Math.sin(angle) * speed; // velY
      this.cpuParticleData[offset + 4] = lifetime;
      this.cpuParticleData[offset + 5] = lifetime;
      this.cpuParticleData[offset + 6] = config.startColor[0];
      this.cpuParticleData[offset + 7] = config.startColor[1];
      this.cpuParticleData[offset + 8] = config.startColor[2];
      this.cpuParticleData[offset + 9] = config.startColor[3];
      this.cpuParticleData[offset + 10] = config.endColor[0];
      this.cpuParticleData[offset + 11] = config.endColor[1];
      this.cpuParticleData[offset + 12] = config.endColor[2];
      this.cpuParticleData[offset + 13] = config.endColor[3];
      this.cpuParticleData[offset + 14] = size;
      this.cpuParticleData[offset + 15] = size;

      // Upload this particle immediately
      const uploadData = new Float32Array(this.cpuParticleData.buffer as ArrayBuffer, offset * 4, PARTICLE_FLOATS);
      this.device.queue.writeBuffer(
        this.particleBuffer,
        offset * 4,
        uploadData as unknown as Float32Array<ArrayBuffer>,
      );
    }

    // Store gravity for sim params
    if (config.gravity !== undefined) {
      this.defaultGravity = config.gravity;
    }
  }

  update(dt: number): void {
    if (this.activeParticleCount === 0) return;

    // Update sim params
    const simParams = new Float32Array([dt, this.defaultGravity, 0.5, 0]);
    this.device.queue.writeBuffer(this.simParamsBuffer, 0, simParams);

    // Dispatch compute
    const encoder = this.device.createCommandEncoder({ label: 'Particle Compute' });
    const pass = encoder.beginComputePass({ label: 'Particle Sim Pass' });
    pass.setPipeline(this.computePipeline);
    pass.setBindGroup(0, this.computeBindGroup);
    pass.dispatchWorkgroups(Math.ceil(MAX_PARTICLES / WORKGROUP_SIZE));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  render(pass: GPURenderPassEncoder): void {
    if (this.activeParticleCount === 0) return;

    pass.setPipeline(this.renderPipeline);
    pass.setBindGroup(0, this._cameraBindGroup);
    pass.setBindGroup(1, this.renderBindGroup);
    pass.draw(6, MAX_PARTICLES); // Draw all, shader skips dead ones
  }

  destroy(): void {
    this.particleBuffer?.destroy();
    this.simParamsBuffer?.destroy();
  }
}
