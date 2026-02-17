/**
 * Game Loop - Fixed timestep game loop with requestAnimationFrame
 * Integrator agent will wire all systems into this loop
 */

export interface GameSystem {
  init?(): Promise<void> | void;
  update?(dt: number): void;
  render?(): void;
  destroy?(): void;
}

export class GameLoop {
  private systems: GameSystem[] = [];
  private running = false;
  private lastTime = 0;
  private frameId = 0;
  private readonly fixedDt = 1 / 60; // 60fps fixed timestep
  private accumulator = 0;

  // Performance tracking
  private frameTimes: number[] = [];
  private readonly maxFrameSamples = 60;

  addSystem(system: GameSystem): void {
    this.systems.push(system);
  }

  removeSystem(system: GameSystem): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }
  }

  async start(): Promise<void> {
    if (this.running) return;

    // Initialize all systems
    for (const system of this.systems) {
      if (system.init) {
        await system.init();
      }
    }

    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  destroy(): void {
    this.stop();
    for (const system of this.systems) {
      if (system.destroy) {
        system.destroy();
      }
    }
    this.systems = [];
  }

  getFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return avg > 0 ? 1000 / avg : 0;
  }

  private loop = (currentTime: number): void => {
    if (!this.running) return;
    this.frameId = requestAnimationFrame(this.loop);

    const frameStart = performance.now();
    const elapsed = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    // Cap elapsed time to prevent spiral of death
    this.accumulator += Math.min(elapsed, 0.1);

    // Fixed timestep updates
    while (this.accumulator >= this.fixedDt) {
      for (const system of this.systems) {
        if (system.update) {
          system.update(this.fixedDt);
        }
      }
      this.accumulator -= this.fixedDt;
    }

    // Render
    for (const system of this.systems) {
      if (system.render) {
        system.render();
      }
    }

    // Track frame time
    const frameTime = performance.now() - frameStart;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > this.maxFrameSamples) {
      this.frameTimes.shift();
    }
  };
}
