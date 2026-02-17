/**
 * Audio Manager
 * Central interface between game events and audio playback.
 */

import { AudioEngine } from './audio-engine';
import { SFXManager } from './sfx';
import { MusicSystem } from './music';
import { eventBus } from '../core/event-bus';
import { SCREEN_WIDTH } from '../core/constants';

export class AudioManager {
  private engine: AudioEngine;
  private sfx: SFXManager;
  private music: MusicSystem;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.engine = new AudioEngine();
    this.sfx = new SFXManager();
    this.music = new MusicSystem();
  }

  async init(): Promise<void> {
    await this.engine.init();
    this.sfx.init(this.engine);
    this.music.init(this.engine);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Player shooting
    this.unsubscribers.push(
      eventBus.on<{ type: number }>('playerShoot', (data) => {
        if (data && data.type > 0) {
          this.sfx.play('spreadShoot', 0.5);
        } else {
          this.sfx.play('playerShoot', 0.5);
        }
      })
    );

    // Enemy shooting
    this.unsubscribers.push(
      eventBus.on<{ faction: number; x: number }>('enemyShoot', (data) => {
        if (!data) return;
        const pan = data.x / SCREEN_WIDTH;
        if (data.faction === 0) {
          this.sfx.play('enemyShootSwarm', pan);
        } else {
          this.sfx.play('enemyShootArmada', pan);
        }
      })
    );

    // Explosions
    this.unsubscribers.push(
      eventBus.on<{ x: number; size: string }>('explosion', (data) => {
        if (!data) return;
        const pan = data.x / SCREEN_WIDTH;
        if (data.size === 'large') {
          this.sfx.play('explosionLarge', pan);
        } else {
          this.sfx.play('explosionSmall', pan);
        }
      })
    );

    // Power-up collect
    this.unsubscribers.push(
      eventBus.on('powerup:collect', () => {
        this.sfx.play('powerupCollect', 0.5);
      })
    );

    // Player damage
    this.unsubscribers.push(
      eventBus.on('player:damage', () => {
        this.sfx.play('playerDamage', 0.5);
      })
    );

    // Wave start - adjust music intensity
    this.unsubscribers.push(
      eventBus.on<{ wave: number }>('wave:start', (data) => {
        if (!data) return;
        if (data.wave >= 3) this.music.setIntensity(2);
        if (data.wave >= 10) this.music.setIntensity(3);
      })
    );

    // Boss warning
    this.unsubscribers.push(
      eventBus.on('boss:warning', () => {
        this.music.setIntensity(4);
      })
    );

    // Game state
    this.unsubscribers.push(
      eventBus.on('state:playing', () => {
        this.engine.ensureResumed();
        if (!this.music.isPlaying()) {
          this.music.start();
        }
        this.music.setIntensity(1);
      })
    );

    this.unsubscribers.push(
      eventBus.on('state:paused', () => {
        this.music.setIntensity(0);
      })
    );

    this.unsubscribers.push(
      eventBus.on('state:gameover', () => {
        this.music.stop();
      })
    );

    this.unsubscribers.push(
      eventBus.on('state:menu', () => {
        this.music.stop();
      })
    );
  }

  getEngine(): AudioEngine {
    return this.engine;
  }

  getSFX(): SFXManager {
    return this.sfx;
  }

  getMusic(): MusicSystem {
    return this.music;
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.music.destroy();
    this.engine.destroy();
  }
}
