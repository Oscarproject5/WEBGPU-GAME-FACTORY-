/**
 * Background Pipeline
 * Renders the cosmic nebula background and parallax star field.
 */

import backgroundShaderSource from '../shaders/background.wgsl?raw';
import starfieldShaderSource from '../shaders/starfield.wgsl?raw';

const TOTAL_STARS = 350; // 200 far + 100 mid + 50 near
const STAR_FLOATS = 8;   // Matches Star struct in WGSL
const STAR_BYTE_SIZE = STAR_FLOATS * 4;

export class BackgroundPipeline {
  private device!: GPUDevice;
  // Background
  private bgPipeline!: GPURenderPipeline;
  private bgParamsBuffer!: GPUBuffer;
  private bgBindGroup!: GPUBindGroup;
  // Star field
  private starComputePipeline!: GPUComputePipeline;
  private starRenderPipeline!: GPURenderPipeline;
  private starBuffer!: GPUBuffer;
  private starParamsBuffer!: GPUBuffer;
  private starComputeBindGroup!: GPUBindGroup;
  private starRenderBindGroup!: GPUBindGroup;
  private screenWidth = 0;
  private screenHeight = 0;

  async init(
    device: GPUDevice,
    targetFormat: GPUTextureFormat,
    cameraBindGroupLayout: GPUBindGroupLayout,
    cameraBindGroup: GPUBindGroup,
    width: number,
    height: number,
  ): Promise<void> {
    this.device = device;
    this.screenWidth = width;
    this.screenHeight = height;

    await this.initBackground(device, targetFormat);
    await this.initStarField(device, targetFormat, cameraBindGroupLayout, cameraBindGroup, width, height);
  }

  private async initBackground(device: GPUDevice, targetFormat: GPUTextureFormat): Promise<void> {
    const module = device.createShaderModule({
      label: 'Background Shader',
      code: backgroundShaderSource,
    });

    this.bgParamsBuffer = device.createBuffer({
      label: 'Background Params',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bgLayout = device.createBindGroupLayout({
      label: 'Background Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.bgBindGroup = device.createBindGroup({
      label: 'Background Bind Group',
      layout: bgLayout,
      entries: [
        { binding: 0, resource: { buffer: this.bgParamsBuffer } },
      ],
    });

    this.bgPipeline = device.createRenderPipeline({
      label: 'Background Render Pipeline',
      layout: device.createPipelineLayout({ bindGroupLayouts: [bgLayout] }),
      vertex: {
        module,
        entryPoint: 'vs_main',
      },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [{ format: targetFormat }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  private async initStarField(
    device: GPUDevice,
    targetFormat: GPUTextureFormat,
    cameraBindGroupLayout: GPUBindGroupLayout,
    cameraBindGroup: GPUBindGroup,
    width: number,
    height: number,
  ): Promise<void> {
    // Parse shader to get compute and render entry points
    const module = device.createShaderModule({
      label: 'Starfield Shader',
      code: starfieldShaderSource,
    });

    // Star buffer
    this.starBuffer = device.createBuffer({
      label: 'Star Buffer',
      size: TOTAL_STARS * STAR_BYTE_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // Star params
    this.starParamsBuffer = device.createBuffer({
      label: 'Star Params',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Initialize star data
    const starData = new Float32Array(TOTAL_STARS * STAR_FLOATS);
    let idx = 0;

    // Layer 0: Far stars (200)
    for (let i = 0; i < 200; i++) {
      const offset = idx * STAR_FLOATS;
      starData[offset + 0] = Math.random() * width;      // posX
      starData[offset + 1] = Math.random() * height;     // posY
      starData[offset + 2] = 0.3 + Math.random() * 0.3;  // brightness
      starData[offset + 3] = 1 + Math.random() * 1.5;    // size
      starData[offset + 4] = 10 + Math.random() * 15;    // speed (slowest)
      starData[offset + 5] = Math.random() * Math.PI * 2; // twinklePhase
      starData[offset + 6] = 1 + Math.random() * 2;       // twinkleSpeed
      starData[offset + 7] = 0;                           // layer
      idx++;
    }

    // Layer 1: Mid stars (100)
    for (let i = 0; i < 100; i++) {
      const offset = idx * STAR_FLOATS;
      starData[offset + 0] = Math.random() * width;
      starData[offset + 1] = Math.random() * height;
      starData[offset + 2] = 0.5 + Math.random() * 0.3;
      starData[offset + 3] = 2 + Math.random() * 2;
      starData[offset + 4] = 25 + Math.random() * 20;    // medium speed
      starData[offset + 5] = Math.random() * Math.PI * 2;
      starData[offset + 6] = 2 + Math.random() * 3;
      starData[offset + 7] = 1;
      idx++;
    }

    // Layer 2: Near stars (50)
    for (let i = 0; i < 50; i++) {
      const offset = idx * STAR_FLOATS;
      starData[offset + 0] = Math.random() * width;
      starData[offset + 1] = Math.random() * height;
      starData[offset + 2] = 0.7 + Math.random() * 0.3;
      starData[offset + 3] = 3 + Math.random() * 3;
      starData[offset + 4] = 45 + Math.random() * 30;    // fastest
      starData[offset + 5] = Math.random() * Math.PI * 2;
      starData[offset + 6] = 3 + Math.random() * 4;
      starData[offset + 7] = 2;
      idx++;
    }

    device.queue.writeBuffer(this.starBuffer, 0, starData);

    // Compute pipeline
    const computeLayout = device.createBindGroupLayout({
      label: 'Star Compute Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
      ],
    });

    this.starComputePipeline = device.createComputePipeline({
      label: 'Star Compute Pipeline',
      layout: device.createPipelineLayout({ bindGroupLayouts: [computeLayout] }),
      compute: {
        module,
        entryPoint: 'cs_main',
      },
    });

    this.starComputeBindGroup = device.createBindGroup({
      label: 'Star Compute Bind Group',
      layout: computeLayout,
      entries: [
        { binding: 0, resource: { buffer: this.starBuffer } },
        { binding: 1, resource: { buffer: this.starParamsBuffer } },
      ],
    });

    // Render pipeline
    const renderStarLayout = device.createBindGroupLayout({
      label: 'Star Render Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
      ],
    });

    this.starRenderPipeline = device.createRenderPipeline({
      label: 'Star Render Pipeline',
      layout: device.createPipelineLayout({
        bindGroupLayouts: [cameraBindGroupLayout, renderStarLayout],
      }),
      vertex: {
        module,
        entryPoint: 'vs_stars',
      },
      fragment: {
        module,
        entryPoint: 'fs_stars',
        targets: [
          {
            format: targetFormat,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one', // Additive for stars
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
      primitive: { topology: 'triangle-list' },
    });

    this.starRenderBindGroup = device.createBindGroup({
      label: 'Star Render Bind Group',
      layout: renderStarLayout,
      entries: [
        { binding: 0, resource: { buffer: this.starBuffer } },
      ],
    });

    this._cameraBindGroup = cameraBindGroup;
  }

  private _cameraBindGroup!: GPUBindGroup;
  private time = 0;

  update(dt: number): void {
    this.time += dt;

    // Update background params
    const bgParams = new Float32Array([this.time, this.screenWidth, this.screenHeight, 0]);
    this.device.queue.writeBuffer(this.bgParamsBuffer, 0, bgParams);

    // Update star params
    const starParams = new Float32Array([this.time, this.screenWidth, this.screenHeight, dt]);
    this.device.queue.writeBuffer(this.starParamsBuffer, 0, starParams);

    // Run star compute
    const encoder = this.device.createCommandEncoder({ label: 'Star Compute' });
    const pass = encoder.beginComputePass({ label: 'Star Sim' });
    pass.setPipeline(this.starComputePipeline);
    pass.setBindGroup(0, this.starComputeBindGroup);
    pass.dispatchWorkgroups(Math.ceil(TOTAL_STARS / 64));
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  renderBackground(pass: GPURenderPassEncoder): void {
    pass.setPipeline(this.bgPipeline);
    pass.setBindGroup(0, this.bgBindGroup);
    pass.draw(3); // Full-screen triangle
  }

  renderStars(pass: GPURenderPassEncoder): void {
    pass.setPipeline(this.starRenderPipeline);
    pass.setBindGroup(0, this._cameraBindGroup);
    pass.setBindGroup(1, this.starRenderBindGroup);
    pass.draw(6, TOTAL_STARS);
  }

  updateSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  destroy(): void {
    this.bgParamsBuffer?.destroy();
    this.starBuffer?.destroy();
    this.starParamsBuffer?.destroy();
  }
}
