/**
 * HUD Component
 * Score, wave, health, power-up indicators overlaid on gameplay.
 */

export class HUD {
  private container: HTMLElement | null = null;
  private scoreEl: HTMLElement | null = null;
  private multiplierEl: HTMLElement | null = null;
  private waveEl: HTMLElement | null = null;
  private highScoreEl: HTMLElement | null = null;
  private healthEl: HTMLElement | null = null;
  private shieldEl: HTMLElement | null = null;
  private bombEl: HTMLElement | null = null;
  private powerupsEl: HTMLElement | null = null;

  create(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    this.container.innerHTML = `
      <div class="hud-top">
        <div class="hud-score">
          <span class="hud-label">SCORE</span>
          <span class="hud-value" id="hud-score">0</span>
        </div>
        <div class="hud-multiplier" id="hud-multiplier" style="display:none">
          <span>x2.0</span>
        </div>
        <div class="hud-wave">
          <span class="hud-label">WAVE</span>
          <span class="hud-value" id="hud-wave">1</span>
        </div>
        <div class="hud-highscore">
          <span class="hud-label">HI</span>
          <span class="hud-value" id="hud-highscore">0</span>
        </div>
      </div>
      <div class="hud-bottom">
        <div class="hud-health" id="hud-health">
          <div class="health-pip active"></div>
          <div class="health-pip active"></div>
          <div class="health-pip active"></div>
          <div class="health-pip active"></div>
          <div class="health-pip active"></div>
        </div>
        <div class="hud-items">
          <div class="hud-item" id="hud-shield" style="display:none">
            <span class="item-icon">&#x1F6E1;</span>
            <span class="item-count">0</span>
          </div>
          <div class="hud-item" id="hud-bomb">
            <span class="item-icon">&#x1F4A3;</span>
            <span class="item-count" id="hud-bomb-count">0</span>
          </div>
        </div>
        <div class="hud-powerups" id="hud-powerups"></div>
      </div>
    `;

    this.applyStyles();
    parent.appendChild(this.container);

    this.scoreEl = document.getElementById('hud-score');
    this.multiplierEl = document.getElementById('hud-multiplier');
    this.waveEl = document.getElementById('hud-wave');
    this.highScoreEl = document.getElementById('hud-highscore');
    this.healthEl = document.getElementById('hud-health');
    this.shieldEl = document.getElementById('hud-shield');
    this.bombEl = document.getElementById('hud-bomb');
    this.powerupsEl = document.getElementById('hud-powerups');
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #hud {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
        font-family: var(--font-primary);
        z-index: 20;
        display: none;
      }

      .hud-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: var(--space-md) var(--space-lg);
      }

      .hud-bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: var(--space-md) var(--space-lg);
      }

      .hud-label {
        font-size: 0.625rem;
        color: var(--ui-text-dim);
        letter-spacing: 0.15em;
        display: block;
      }

      .hud-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--ui-text);
        text-shadow: var(--glow-text-cyan);
        font-variant-numeric: tabular-nums;
      }

      .hud-multiplier {
        background: oklch(0.65 0.25 340 / 0.3);
        border: 1px solid oklch(0.65 0.25 340 / 0.5);
        border-radius: var(--radius-sm);
        padding: 2px 8px;
        font-size: 0.875rem;
        font-weight: 700;
        color: var(--player-accent);
        text-shadow: var(--glow-magenta);
        animation: mult-pulse 0.5s ease-in-out infinite alternate;
      }

      @keyframes mult-pulse {
        from { opacity: 0.8; }
        to { opacity: 1; }
      }

      .hud-health {
        display: flex;
        gap: 4px;
      }

      .health-pip {
        width: 24px;
        height: 8px;
        border-radius: 2px;
        background: oklch(0.2 0.05 200);
        border: 1px solid oklch(0.3 0.08 200);
        transition: all var(--duration-fast) var(--ease-smooth);
      }

      .health-pip.active {
        background: var(--player-primary);
        box-shadow: 0 0 6px oklch(0.78 0.18 200 / 0.5);
      }

      .health-pip.danger {
        background: var(--ui-danger);
        box-shadow: 0 0 6px oklch(0.6 0.2 25 / 0.5);
        animation: danger-pulse 0.5s ease-in-out infinite alternate;
      }

      @keyframes danger-pulse {
        from { opacity: 0.6; }
        to { opacity: 1; }
      }

      .hud-items {
        display: flex;
        gap: var(--space-md);
      }

      .hud-item {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.875rem;
        color: var(--ui-text);
      }

      .item-icon {
        font-size: 1.1rem;
      }

      .item-count {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      .hud-powerups {
        display: flex;
        gap: var(--space-sm);
      }

      .powerup-indicator {
        width: 28px;
        height: 28px;
        border-radius: var(--radius-sm);
        background: oklch(0.15 0.06 200 / 0.6);
        border: 1px solid oklch(0.5 0.12 200 / 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--powerup);
        text-shadow: 0 0 6px oklch(0.92 0.12 195 / 0.5);
        animation: powerup-glow 1s ease-in-out infinite alternate;
      }

      .powerup-indicator.expiring {
        animation: powerup-expire 0.3s ease-in-out infinite alternate;
      }

      @keyframes powerup-glow {
        from { box-shadow: 0 0 4px oklch(0.92 0.12 195 / 0.3); }
        to { box-shadow: 0 0 8px oklch(0.92 0.12 195 / 0.5); }
      }

      @keyframes powerup-expire {
        from { opacity: 0.4; }
        to { opacity: 1; }
      }
    `;
    this.container!.appendChild(style);
  }

  updateScore(score: number): void {
    if (this.scoreEl) {
      this.scoreEl.textContent = score.toLocaleString('en-US', { minimumIntegerDigits: 1 });
    }
  }

  updateMultiplier(multiplier: number, active: boolean): void {
    if (this.multiplierEl) {
      this.multiplierEl.style.display = active ? 'block' : 'none';
      this.multiplierEl.querySelector('span')!.textContent = `x${multiplier.toFixed(1)}`;
    }
  }

  updateWave(wave: number): void {
    if (this.waveEl) {
      this.waveEl.textContent = wave.toString();
    }
  }

  updateHighScore(score: number): void {
    if (this.highScoreEl) {
      this.highScoreEl.textContent = score.toLocaleString('en-US');
    }
  }

  updateHealth(current: number, max: number): void {
    if (!this.healthEl) return;
    const pips = this.healthEl.querySelectorAll('.health-pip');
    pips.forEach((pip, i) => {
      pip.classList.toggle('active', i < current);
      pip.classList.toggle('danger', current <= 2 && i < current);
    });
  }

  updateBombs(count: number): void {
    const countEl = document.getElementById('hud-bomb-count');
    if (countEl) countEl.textContent = count.toString();
  }

  updateShield(hits: number): void {
    if (this.shieldEl) {
      this.shieldEl.style.display = hits > 0 ? 'flex' : 'none';
      const countEl = this.shieldEl.querySelector('.item-count');
      if (countEl) countEl.textContent = hits.toString();
    }
  }

  show(): void {
    if (this.container) this.container.style.display = 'block';
  }

  hide(): void {
    if (this.container) this.container.style.display = 'none';
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
