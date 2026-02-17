/**
 * Layered Synthwave Music System
 * Procedurally generated music using oscillators with intensity levels.
 */

import { AudioEngine } from './audio-engine';

const BPM = 132;
const BEAT_DURATION = 60 / BPM;

export class MusicSystem {
  private engine!: AudioEngine;
  private playing = false;
  private intensity = 0; // 0=off, 1=base, 2=arp, 3=lead, 4=boss
  private targetIntensity = 0;

  // Layer gain nodes
  private bassGain!: GainNode;
  private arpGain!: GainNode;
  private leadGain!: GainNode;
  private drumsGain!: GainNode;

  // Oscillators and intervals
  private bassOsc: OscillatorNode | null = null;
  private kickInterval: ReturnType<typeof setInterval> | null = null;
  private arpInterval: ReturnType<typeof setInterval> | null = null;
  private leadInterval: ReturnType<typeof setInterval> | null = null;
  private drumInterval: ReturnType<typeof setInterval> | null = null;

  init(engine: AudioEngine): void {
    this.engine = engine;
  }

  start(): void {
    const ctx = this.engine.getContext();
    if (!ctx) return;
    this.engine.ensureResumed();

    const musicOutput = this.engine.getMusicGain();

    // Create layer gain nodes
    this.bassGain = ctx.createGain();
    this.bassGain.gain.value = 0.3;
    this.bassGain.connect(musicOutput);

    this.arpGain = ctx.createGain();
    this.arpGain.gain.value = 0;
    this.arpGain.connect(musicOutput);

    this.leadGain = ctx.createGain();
    this.leadGain.gain.value = 0;
    this.leadGain.connect(musicOutput);

    this.drumsGain = ctx.createGain();
    this.drumsGain.gain.value = 0;
    this.drumsGain.connect(musicOutput);

    this.playing = true;
    this.setIntensity(1);
    this.startBass(ctx);
    this.startKick(ctx);
    this.startArp(ctx);
    this.startLead(ctx);
    this.startDrums(ctx);
  }

  stop(): void {
    this.playing = false;
    this.bassOsc?.stop();
    this.bassOsc = null;

    if (this.kickInterval) clearInterval(this.kickInterval);
    if (this.arpInterval) clearInterval(this.arpInterval);
    if (this.leadInterval) clearInterval(this.leadInterval);
    if (this.drumInterval) clearInterval(this.drumInterval);

    this.kickInterval = null;
    this.arpInterval = null;
    this.leadInterval = null;
    this.drumInterval = null;
  }

  setIntensity(level: number): void {
    this.targetIntensity = Math.max(0, Math.min(4, level));
    this.updateLayerVolumes();
  }

  private updateLayerVolumes(): void {
    const ctx = this.engine.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const fade = 0.5; // 500ms crossfade

    // Layer 1: Bass + Kick (always playing during gameplay)
    this.bassGain?.gain.linearRampToValueAtTime(
      this.targetIntensity >= 1 ? 0.25 : 0, now + fade
    );

    // Layer 2: Arpeggio (wave 3+)
    this.arpGain?.gain.linearRampToValueAtTime(
      this.targetIntensity >= 2 ? 0.12 : 0, now + fade
    );

    // Layer 3: Lead melody (boss approach)
    this.leadGain?.gain.linearRampToValueAtTime(
      this.targetIntensity >= 3 ? 0.1 : 0, now + fade
    );

    // Layer 4: Aggressive drums (boss fight)
    this.drumsGain?.gain.linearRampToValueAtTime(
      this.targetIntensity >= 4 ? 0.15 : 0, now + fade
    );

    this.intensity = this.targetIntensity;
  }

  private startBass(ctx: AudioContext): void {
    // Deep analog bass - continuous oscillator with filter
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55; // A1

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.Q.value = 3;

    osc.connect(filter);
    filter.connect(this.bassGain);
    osc.start();
    this.bassOsc = osc;

    // Bass note pattern (changes every 2 beats)
    const bassNotes = [55, 55, 73.4, 65.4]; // A1, A1, D2, C2
    let noteIndex = 0;

    this.kickInterval = setInterval(() => {
      if (!this.playing) return;
      osc.frequency.setValueAtTime(bassNotes[noteIndex % bassNotes.length], ctx.currentTime);
      noteIndex++;
    }, BEAT_DURATION * 2 * 1000);
  }

  private startKick(ctx: AudioContext): void {
    // Kick drum on every beat
    const kickBeat = (): void => {
      if (!this.playing) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.bassGain);
      osc.start(now);
      osc.stop(now + 0.2);
    };

    kickBeat();
    this.kickInterval = setInterval(kickBeat, BEAT_DURATION * 1000);
  }

  private startArp(ctx: AudioContext): void {
    // Arpeggiated synth pattern (16th notes)
    const arpNotes = [220, 330, 440, 330, 293, 440, 330, 220]; // Am arpeggio
    let arpIndex = 0;

    const arpBeat = (): void => {
      if (!this.playing) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = arpNotes[arpIndex % arpNotes.length];

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + BEAT_DURATION * 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.arpGain);
      osc.start(now);
      osc.stop(now + BEAT_DURATION * 0.25);

      arpIndex++;
    };

    this.arpInterval = setInterval(arpBeat, BEAT_DURATION * 250); // 16th notes
  }

  private startLead(ctx: AudioContext): void {
    // Lead synth melody (longer notes, every 2 beats)
    const melody = [440, 523, 440, 392, 440, 523, 587, 523]; // Simple melody
    let melodyIndex = 0;

    const leadBeat = (): void => {
      if (!this.playing) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = melody[melodyIndex % melody.length];

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + BEAT_DURATION * 1.5);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + BEAT_DURATION * 1.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.leadGain);
      osc.start(now);
      osc.stop(now + BEAT_DURATION * 2);

      melodyIndex++;
    };

    this.leadInterval = setInterval(leadBeat, BEAT_DURATION * 2 * 1000);
  }

  private startDrums(ctx: AudioContext): void {
    // Aggressive hi-hat pattern (8th notes)
    let hatIndex = 0;

    const drumBeat = (): void => {
      if (!this.playing) return;
      const now = ctx.currentTime;

      // Hi-hat (noise)
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;

      const gain = ctx.createGain();
      const accent = hatIndex % 2 === 0 ? 0.15 : 0.08;
      gain.gain.setValueAtTime(accent, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.drumsGain);
      source.start(now);

      // Snare on beats 2 and 4
      if (hatIndex % 4 === 2) {
        const snareLen = ctx.sampleRate * 0.1;
        const snareBuf = ctx.createBuffer(1, snareLen, ctx.sampleRate);
        const snareData = snareBuf.getChannelData(0);
        for (let i = 0; i < snareLen; i++) {
          snareData[i] = Math.random() * 2 - 1;
        }

        const snareSrc = ctx.createBufferSource();
        snareSrc.buffer = snareBuf;

        const snareFilter = ctx.createBiquadFilter();
        snareFilter.type = 'bandpass';
        snareFilter.frequency.value = 3000;

        const snareGain = ctx.createGain();
        snareGain.gain.setValueAtTime(0.2, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        snareSrc.connect(snareFilter);
        snareFilter.connect(snareGain);
        snareGain.connect(this.drumsGain);
        snareSrc.start(now);
      }

      hatIndex++;
    };

    this.drumInterval = setInterval(drumBeat, BEAT_DURATION * 0.5 * 1000);
  }

  isPlaying(): boolean {
    return this.playing;
  }

  getIntensity(): number {
    return this.intensity;
  }

  destroy(): void {
    this.stop();
  }
}
