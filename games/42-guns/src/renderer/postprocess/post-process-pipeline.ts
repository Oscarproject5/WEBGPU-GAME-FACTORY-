/**
 * Post-Processing Pipeline
 * Chain: Scene HDR -> Bloom Extract -> Blur H -> Blur V -> Composite (with chromatic, vignette, scanlines, color grade, grain) -> Canvas
 */

import bloomShaderSource from '../shaders/bloom.wgsl?raw';
import compositeShaderSource from '../shaders/composite.wgsl?raw';

export class PostProcessPipeline {
  private device!: GPUDevice;
  private width = 0;
  private height = 0;

  // HDR scene render target
  private hdrTexture!: GPUTexture;
  private hdrTextureView!: GPUTextureView;

  // Bloom textures
  private bloomExtractTexture!: GPUTexture;
  private bloomBlurTexture1!: GPUTexture;
  private bloomBlurTexture2!: GPUTexture;

  // Pipelines
  private bloomExtractPipeline!: GPURenderPipeline;
  private bloomBlurHPipeline!: GPURenderPipeline;
  private bloomBlurVPipeline!: GPURenderPipeline;
  private compositePipeline!: GPURenderPipeline;

  // Buffers
  private bloomParamsBuffer!: GPUBuffer;
  private compositeParamsBuffer!: GPUBuffer;

  // Bind groups
  private bloomExtractBindGroup!: GPUBindGroup;
  private bloomBlurHBindGroup!: GPUBindGroup;
  private bloomBlurVBindGroup!: GPUBindGroup;
  private compositeBindGroup!: GPUBindGroup;

  // Sampler
  private sampler!: GPUSampler;

  // Layout
  private bloomBindGroupLayout!: GPUBindGroupLayout;
  private compositeBindGroupLayout!: GPUBindGroupLayout;

  // Params
  private chromaticIntensity = 1.5;
  private vignetteIntensity = 0.3;
  private scanlineEnabled = false;
  private bloomIntensity = 0.8;
  private grainIntensity = 0.03;
  private time = 0;

  get hdrRenderTarget(): GPUTextureView {
    return this.hdrTextureView;
  }

  get hdrFormat(): GPUTextureFormat {
    return 'rgba16float';
  }

  async init(device: GPUDevice, canvasFormat: GPUTextureFormat, width: number, height: number): Promise<void> {
    this.device = device;
    this.width = width;
    this.height = height;

    // Sampler
    this.sampler = device.createSampler({
      label: 'Post-Process Sampler',
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    });

    // Create textures
    this.createTextures(width, height);

    // Bloom params buffer
    this.bloomParamsBuffer = device.createBuffer({
      label: 'Bloom Params',
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Composite params buffer
    this.compositeParamsBuffer = device.createBuffer({
      label: 'Composite Params',
      size: 32, // 8 x f32
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // === Bloom Pipelines ===
    const bloomModule = device.createShaderModule({
      label: 'Bloom Shader',
      code: bloomShaderSource,
    });

    this.bloomBindGroupLayout = device.createBindGroupLayout({
      label: 'Bloom Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    const bloomLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.bloomBindGroupLayout],
    });

    // Extract pipeline
    this.bloomExtractPipeline = device.createRenderPipeline({
      label: 'Bloom Extract Pipeline',
      layout: bloomLayout,
      vertex: { module: bloomModule, entryPoint: 'vs_fullscreen' },
      fragment: {
        module: bloomModule,
        entryPoint: 'fs_extract',
        targets: [{ format: 'rgba16float' }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Horizontal blur
    this.bloomBlurHPipeline = device.createRenderPipeline({
      label: 'Bloom Blur H Pipeline',
      layout: bloomLayout,
      vertex: { module: bloomModule, entryPoint: 'vs_fullscreen' },
      fragment: {
        module: bloomModule,
        entryPoint: 'fs_blur_h',
        targets: [{ format: 'rgba16float' }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Vertical blur
    this.bloomBlurVPipeline = device.createRenderPipeline({
      label: 'Bloom Blur V Pipeline',
      layout: bloomLayout,
      vertex: { module: bloomModule, entryPoint: 'vs_fullscreen' },
      fragment: {
        module: bloomModule,
        entryPoint: 'fs_blur_v',
        targets: [{ format: 'rgba16float' }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // === Composite Pipeline ===
    const compositeModule = device.createShaderModule({
      label: 'Composite Shader',
      code: compositeShaderSource,
    });

    this.compositeBindGroupLayout = device.createBindGroupLayout({
      label: 'Composite Bind Group Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }, // scene
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } }, // bloom
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
      ],
    });

    this.compositePipeline = device.createRenderPipeline({
      label: 'Composite Pipeline',
      layout: device.createPipelineLayout({ bindGroupLayouts: [this.compositeBindGroupLayout] }),
      vertex: { module: compositeModule, entryPoint: 'vs_main' },
      fragment: {
        module: compositeModule,
        entryPoint: 'fs_main',
        targets: [{ format: canvasFormat }],
      },
      primitive: { topology: 'triangle-list' },
    });

    // Create bind groups
    this.createBindGroups();
  }

  private createTextures(width: number, height: number): void {
    // Destroy old textures if they exist
    this.hdrTexture?.destroy();
    this.bloomExtractTexture?.destroy();
    this.bloomBlurTexture1?.destroy();
    this.bloomBlurTexture2?.destroy();

    const hdrDesc: GPUTextureDescriptor = {
      size: { width, height },
      format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    };

    this.hdrTexture = this.device.createTexture({ ...hdrDesc, label: 'HDR Scene' });
    this.hdrTextureView = this.hdrTexture.createView();

    // Half-res bloom textures for efficiency
    const bloomWidth = Math.max(1, Math.floor(width / 2));
    const bloomHeight = Math.max(1, Math.floor(height / 2));

    const bloomDesc: GPUTextureDescriptor = {
      size: { width: bloomWidth, height: bloomHeight },
      format: 'rgba16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    };

    this.bloomExtractTexture = this.device.createTexture({ ...bloomDesc, label: 'Bloom Extract' });
    this.bloomBlurTexture1 = this.device.createTexture({ ...bloomDesc, label: 'Bloom Blur 1' });
    this.bloomBlurTexture2 = this.device.createTexture({ ...bloomDesc, label: 'Bloom Blur 2' });
  }

  private createBindGroups(): void {
    const bloomWidth = Math.max(1, Math.floor(this.width / 2));
    const bloomHeight = Math.max(1, Math.floor(this.height / 2));

    // Bloom extract: reads from HDR scene
    this.bloomExtractBindGroup = this.device.createBindGroup({
      label: 'Bloom Extract BG',
      layout: this.bloomBindGroupLayout,
      entries: [
        { binding: 0, resource: this.hdrTexture.createView() },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: { buffer: this.bloomParamsBuffer } },
      ],
    });

    // Bloom blur H: reads from extract
    this.bloomBlurHBindGroup = this.device.createBindGroup({
      label: 'Bloom Blur H BG',
      layout: this.bloomBindGroupLayout,
      entries: [
        { binding: 0, resource: this.bloomExtractTexture.createView() },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: { buffer: this.bloomParamsBuffer } },
      ],
    });

    // Bloom blur V: reads from blur H result
    this.bloomBlurVBindGroup = this.device.createBindGroup({
      label: 'Bloom Blur V BG',
      layout: this.bloomBindGroupLayout,
      entries: [
        { binding: 0, resource: this.bloomBlurTexture1.createView() },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: { buffer: this.bloomParamsBuffer } },
      ],
    });

    // Composite: reads from HDR scene + bloom result
    this.compositeBindGroup = this.device.createBindGroup({
      label: 'Composite BG',
      layout: this.compositeBindGroupLayout,
      entries: [
        { binding: 0, resource: this.hdrTexture.createView() },
        { binding: 1, resource: this.bloomBlurTexture2.createView() },
        { binding: 2, resource: this.sampler },
        { binding: 3, resource: { buffer: this.compositeParamsBuffer } },
      ],
    });

    // Update bloom params
    const bloomWidth2 = Math.max(1, Math.floor(this.width / 2));
    const bloomHeight2 = Math.max(1, Math.floor(this.height / 2));
    const bloomParams = new Float32Array([0.7, 1.0, 1.0 / bloomWidth2, 1.0 / bloomHeight2]);
    this.device.queue.writeBuffer(this.bloomParamsBuffer, 0, bloomParams);
  }

  render(canvasTextureView: GPUTextureView): void {
    this.time += 1 / 60;

    // Update composite params
    const compositeParams = new Float32Array([
      this.chromaticIntensity,
      this.vignetteIntensity,
      this.scanlineEnabled ? 1.0 : 0.0,
      this.time,
      this.width,
      this.height,
      this.bloomIntensity,
      this.grainIntensity,
    ]);
    this.device.queue.writeBuffer(this.compositeParamsBuffer, 0, compositeParams);

    const encoder = this.device.createCommandEncoder({ label: 'Post-Process' });

    // Pass 1: Bloom extract
    const extractPass = encoder.beginRenderPass({
      label: 'Bloom Extract Pass',
      colorAttachments: [{
        view: this.bloomExtractTexture.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    extractPass.setPipeline(this.bloomExtractPipeline);
    extractPass.setBindGroup(0, this.bloomExtractBindGroup);
    extractPass.draw(3);
    extractPass.end();

    // Pass 2: Horizontal blur
    const blurHPass = encoder.beginRenderPass({
      label: 'Bloom Blur H Pass',
      colorAttachments: [{
        view: this.bloomBlurTexture1.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    blurHPass.setPipeline(this.bloomBlurHPipeline);
    blurHPass.setBindGroup(0, this.bloomBlurHBindGroup);
    blurHPass.draw(3);
    blurHPass.end();

    // Pass 3: Vertical blur
    const blurVPass = encoder.beginRenderPass({
      label: 'Bloom Blur V Pass',
      colorAttachments: [{
        view: this.bloomBlurTexture2.createView(),
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    blurVPass.setPipeline(this.bloomBlurVPipeline);
    blurVPass.setBindGroup(0, this.bloomBlurVBindGroup);
    blurVPass.draw(3);
    blurVPass.end();

    // Pass 4: Composite to canvas
    const compositePass = encoder.beginRenderPass({
      label: 'Composite Pass',
      colorAttachments: [{
        view: canvasTextureView,
        loadOp: 'clear',
        storeOp: 'store',
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
      }],
    });
    compositePass.setPipeline(this.compositePipeline);
    compositePass.setBindGroup(0, this.compositeBindGroup);
    compositePass.draw(3);
    compositePass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  // Public API for dynamic adjustments
  setChromatic(intensity: number): void {
    this.chromaticIntensity = intensity;
  }

  setVignette(intensity: number): void {
    this.vignetteIntensity = intensity;
  }

  setScanlines(enabled: boolean): void {
    this.scanlineEnabled = enabled;
  }

  setBloomIntensity(intensity: number): void {
    this.bloomIntensity = intensity;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.createTextures(width, height);
    this.createBindGroups();
  }

  destroy(): void {
    this.hdrTexture?.destroy();
    this.bloomExtractTexture?.destroy();
    this.bloomBlurTexture1?.destroy();
    this.bloomBlurTexture2?.destroy();
    this.bloomParamsBuffer?.destroy();
    this.compositeParamsBuffer?.destroy();
  }
}
