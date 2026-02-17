/**
 * Procedural Sound Effects
 * All SFX synthesized via Web Audio API oscillators and noise.
 */

import { AudioEngine } from './audio-engine';

export type SFXType =
  | 'playerShoot'
  | 'spreadShoot'
  | 'enemyShootSwarm'
  | 'enemyShootArmada'
  | 'explosionSmall'
  | 'explosionLarge'
  | 'powerupCollect'
  | 'uiHover'
  | 'uiSelect'
  | 'playerDamage'
  | 'shieldHit';

export class SFXManager {
  private engine!: AudioEngine;

  init(engine: AudioEngine): void {
    this.engine = engine;
  }

  play(type: SFXType, pan = 0.5): void {
    const ctx = this.engine.getContext();
    if (!ctx) return;

    this.engine.ensureResumed();
    const sfxOutput = this.engine.getSFXGain();

    // Stereo panning (-1 to 1, derived from screen position 0-1)
    const panner = ctx.createStereoPanner();
    panner.pan.value = (pan - 0.5) * 2;
    panner.connect(sfxOutput);

    switch (type) {
      case 'playerShoot':
        this.synthPlayerShoot(ctx, panner);
        break;
      case 'spreadShoot':
        this.synthSpreadShoot(ctx, panner);
        break;
      case 'enemyShootSwarm':
        this.synthEnemyShootSwarm(ctx, panner);
        break;
      case 'enemyShootArmada':
        this.synthEnemyShootArmada(ctx, panner);
        break;
      case 'explosionSmall':
        this.synthExplosionSmall(ctx, panner);
        break;
      case 'explosionLarge':
        this.synthExplosionLarge(ctx, panner);
        break;
      case 'powerupCollect':
        this.synthPowerupCollect(ctx, panner);
        break;
      case 'uiHover':
        this.synthUIHover(ctx, panner);
        break;
      case 'uiSelect':
        this.synthUISelect(ctx, panner);
        break;
      case 'playerDamage':
        this.synthPlayerDamage(ctx, panner);
        break;
      case 'shieldHit':
        this.synthShieldHit(ctx, panner);
        break;
    }
  }

  // Punchy saw wave with pitch sweep 440 -> 220Hz, 50ms
  private synthPlayerShoot(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Wider detuned version
  private synthSpreadShoot(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    for (const detune of [-10, 0, 10]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);
      osc.detune.value = detune;
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.07);
    }
  }

  // Organic squelch (filtered noise burst)
  private synthEnemyShootSwarm(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.08);
    filter.Q.value = 5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(now);
  }

  // Metallic ping
  private synthEnemyShootArmada(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.07);

    // Add noise click
    const noiseLen = ctx.sampleRate * 0.02;
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    noiseSrc.connect(noiseGain);
    noiseGain.connect(dest);
    noiseSrc.start(now);
  }

  // White noise burst with low-pass sweep (100ms)
  private synthExplosionSmall(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    source.start(now);
  }

  // Layered noise + sub sine (200ms, more bass)
  private synthExplosionLarge(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;

    // Noise layer
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(6000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(dest);
    source.start(now);

    // Sub bass
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(60, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.2);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.3);
  }

  // Rising arpeggio C5 → E5 → G5 → C6 (triangle wave, 200ms)
  private synthPowerupCollect(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const duration = 0.05;

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = notes[i];

      const start = now + i * duration;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration + 0.05);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(start);
      osc.stop(start + duration + 0.06);
    }
  }

  // Soft click (short sine blip)
  private synthUIHover(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = 800;

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Clean synth tone
  private synthUISelect(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(880, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Low distorted hit
  private synthPlayerDamage(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Electric shield impact
  private synthShieldHit(ctx: AudioContext, dest: AudioNode): void {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.12);
  }
}
