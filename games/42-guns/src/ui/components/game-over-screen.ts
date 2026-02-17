/**
 * Game Over Screen Component
 * Score summary with play again / main menu options.
 */

import { eventBus } from '../../core/event-bus';

export class GameOverScreen {
  private container: HTMLElement | null = null;
  private selectedIndex = 0;
  private menuItems = ['PLAY AGAIN', 'MAIN MENU'];

  create(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'game-over';
    this.container.innerHTML = `
      <div class="gameover-overlay"></div>
      <div class="gameover-panel">
        <h2 class="gameover-title">GAME OVER</h2>
        <div class="gameover-newhi" id="gameover-newhi" style="display:none">NEW HIGH SCORE!</div>
        <div class="gameover-stats">
          <div class="stat-row">
            <span class="stat-label">FINAL SCORE</span>
            <span class="stat-value" id="gameover-score">0</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">WAVE REACHED</span>
            <span class="stat-value" id="gameover-wave">0</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">ENEMIES DESTROYED</span>
            <span class="stat-value" id="gameover-enemies">0</span>
          </div>
        </div>
        <div class="gameover-options">
          ${this.menuItems.map((item, i) => `
            <button class="menu-item ui-button ${i === 0 ? 'selected' : ''}" data-index="${i}">
              ${item}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.applyStyles();
    parent.appendChild(this.container);

    const buttons = this.container.querySelectorAll('.menu-item');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.selectedIndex = i;
        this.confirm();
      });
    });
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #game-over {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 60;
        pointer-events: auto;
      }

      .gameover-overlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: oklch(0.03 0.01 270 / 0.75);
      }

      .gameover-panel {
        position: relative;
        text-align: center;
        animation: gameover-fade-in 0.8s var(--ease-smooth);
      }

      @keyframes gameover-fade-in {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }

      .gameover-title {
        font-family: var(--font-primary);
        font-size: 3rem;
        font-weight: 900;
        color: var(--ui-danger);
        text-shadow: 0 0 20px oklch(0.6 0.2 25 / 0.5), 0 0 40px oklch(0.6 0.2 25 / 0.3);
        letter-spacing: 0.15em;
        margin-bottom: var(--space-md);
      }

      .gameover-newhi {
        font-family: var(--font-primary);
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--explosion);
        text-shadow: 0 0 15px oklch(0.85 0.15 65 / 0.6);
        animation: newhi-flash 0.5s ease-in-out infinite alternate;
        margin-bottom: var(--space-lg);
      }

      @keyframes newhi-flash {
        from { opacity: 0.7; transform: scale(1); }
        to { opacity: 1; transform: scale(1.05); }
      }

      .gameover-stats {
        background: oklch(0.1 0.04 270 / 0.5);
        border: 1px solid var(--ui-border);
        border-radius: var(--radius-lg);
        padding: var(--space-lg);
        margin-bottom: var(--space-xl);
        min-width: 300px;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: var(--space-sm) 0;
        border-bottom: 1px solid oklch(0.2 0.04 200 / 0.3);
      }

      .stat-row:last-child {
        border-bottom: none;
      }

      .stat-label {
        font-family: var(--font-secondary);
        font-size: 0.8rem;
        color: var(--ui-text-dim);
        letter-spacing: 0.1em;
      }

      .stat-value {
        font-family: var(--font-primary);
        font-size: 1rem;
        font-weight: 700;
        color: var(--ui-text);
        text-shadow: var(--glow-text-cyan);
        font-variant-numeric: tabular-nums;
      }

      .gameover-options {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-md);
      }

      .gameover-options .menu-item {
        width: 240px;
      }
    `;
    this.container!.appendChild(style);
  }

  showWithStats(score: number, wave: number, enemies: number, isNewHighScore: boolean): void {
    if (!this.container) return;

    this.container.style.display = 'flex';
    this.selectedIndex = 0;

    const scoreEl = document.getElementById('gameover-score');
    const waveEl = document.getElementById('gameover-wave');
    const enemiesEl = document.getElementById('gameover-enemies');
    const newhiEl = document.getElementById('gameover-newhi');

    if (scoreEl) scoreEl.textContent = score.toLocaleString();
    if (waveEl) waveEl.textContent = wave.toString();
    if (enemiesEl) enemiesEl.textContent = enemies.toString();
    if (newhiEl) newhiEl.style.display = isNewHighScore ? 'block' : 'none';

    const buttons = this.container.querySelectorAll('.menu-item');
    buttons.forEach((btn, i) => btn.classList.toggle('selected', i === 0));
  }

  navigate(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + this.menuItems.length) % this.menuItems.length;
    const buttons = this.container?.querySelectorAll('.menu-item');
    buttons?.forEach((btn, i) => btn.classList.toggle('selected', i === this.selectedIndex));
  }

  confirm(): void {
    switch (this.selectedIndex) {
      case 0:
        eventBus.emit('game:start');
        break;
      case 1:
        eventBus.emit('game:menu');
        break;
    }
  }

  hide(): void {
    if (this.container) this.container.style.display = 'none';
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
