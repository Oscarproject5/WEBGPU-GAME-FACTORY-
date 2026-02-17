/**
 * Score System
 * Track score, high score, and multiplier.
 */

import { eventBus } from '../core/event-bus';
import { SCORE_MULTIPLIER_VALUE } from '../core/constants';

const HIGH_SCORE_KEY = '42guns_highscore';

export class ScoreSystem {
  private score = 0;
  private displayScore = 0; // Animated score for HUD
  private multiplier = 1;
  private multiplierTimer = 0;
  private highScore = 0;
  private enemiesDestroyed = 0;
  private waveReached = 0;

  init(): void {
    // Load high score from localStorage
    const saved = localStorage.getItem(HIGH_SCORE_KEY);
    if (saved) {
      this.highScore = parseInt(saved, 10) || 0;
    }

    // Listen for score events
    eventBus.on<{ value: number }>('score:add', (data) => {
      if (data) {
        this.addScore(data.value);
      }
    });

    eventBus.on('enemy:destroyed', () => {
      this.enemiesDestroyed++;
    });

    eventBus.on<{ wave: number }>('wave:start', (data) => {
      if (data) {
        this.waveReached = data.wave;
      }
    });
  }

  update(dt: number): void {
    // Animate display score toward actual score
    if (this.displayScore < this.score) {
      const diff = this.score - this.displayScore;
      const increment = Math.max(1, Math.floor(diff * 5 * dt));
      this.displayScore = Math.min(this.score, this.displayScore + increment);
    }

    // Multiplier timer
    if (this.multiplierTimer > 0) {
      this.multiplierTimer -= dt;
      if (this.multiplierTimer <= 0) {
        this.multiplier = 1;
        this.multiplierTimer = 0;
      }
    }
  }

  addScore(value: number): void {
    this.score += value * this.multiplier;

    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(HIGH_SCORE_KEY, this.highScore.toString());
    }
  }

  activateMultiplier(duration: number): void {
    this.multiplier = SCORE_MULTIPLIER_VALUE;
    this.multiplierTimer = duration;
  }

  resetMultiplier(): void {
    this.multiplier = 1;
    this.multiplierTimer = 0;
  }

  getScore(): number {
    return this.score;
  }

  getDisplayScore(): number {
    return this.displayScore;
  }

  getMultiplier(): number {
    return this.multiplier;
  }

  getMultiplierTimer(): number {
    return this.multiplierTimer;
  }

  getHighScore(): number {
    return this.highScore;
  }

  getEnemiesDestroyed(): number {
    return this.enemiesDestroyed;
  }

  getWaveReached(): number {
    return this.waveReached;
  }

  isNewHighScore(): boolean {
    return this.score >= this.highScore && this.score > 0;
  }

  reset(): void {
    this.score = 0;
    this.displayScore = 0;
    this.multiplier = 1;
    this.multiplierTimer = 0;
    this.enemiesDestroyed = 0;
    this.waveReached = 0;
  }
}
