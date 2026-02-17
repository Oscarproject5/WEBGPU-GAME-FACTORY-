/**
 * Audio Engine
 * Web Audio API core with master/sfx/music volume controls.
 */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private initialized = false;
  private muted = false;
  private prevMasterVolume = 1.0;

  async init(): Promise<void> {
    // AudioContext requires user gesture - create on demand
    this.createContext();
  }

  private createContext(): void {
    if (this.ctx) return;

    this.ctx = new AudioContext();

    // Master → destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    // SFX → master
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);

    // Music → master
    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);

    this.initialized = true;

    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.ctx?.suspend();
      } else {
        this.ctx?.resume();
      }
    });
  }

  ensureResumed(): void {
    if (!this.ctx) {
      this.createContext();
    }
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getContext(): AudioContext | null {
    return this.ctx;
  }

  getSFXGain(): GainNode {
    return this.sfxGain;
  }

  getMusicGain(): GainNode {
    return this.musicGain;
  }

  setMasterVolume(vol: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  setSFXVolume(vol: number): void {
    this.sfxGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  setMusicVolume(vol: number): void {
    this.musicGain.gain.value = Math.max(0, Math.min(1, vol));
  }

  mute(): void {
    if (!this.muted) {
      this.prevMasterVolume = this.masterGain.gain.value;
      this.masterGain.gain.value = 0;
      this.muted = true;
    }
  }

  unmute(): void {
    if (this.muted) {
      this.masterGain.gain.value = this.prevMasterVolume;
      this.muted = false;
    }
  }

  toggleMute(): void {
    if (this.muted) this.unmute();
    else this.mute();
  }

  isMuted(): boolean {
    return this.muted;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  destroy(): void {
    this.ctx?.close();
    this.ctx = null;
    this.initialized = false;
  }
}
