/**
 * Title Screen Component
 * Synthwave aesthetic title with menu options.
 */

import { eventBus } from '../../core/event-bus';

export class TitleScreen {
  private container: HTMLElement | null = null;
  private selectedIndex = 0;
  private menuItems = ['START GAME', 'HIGH SCORES'];

  create(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'title-screen';
    this.container.innerHTML = `
      <div class="title-content">
        <div class="title-glow-bg"></div>
        <h1 class="game-title">
          <span class="title-42">42</span>
          <span class="title-guns">GUNS</span>
        </h1>
        <p class="subtitle">ENDLESS SYNTHWAVE SHOOTER</p>
        <div class="menu-options">
          ${this.menuItems.map((item, i) => `
            <button class="menu-item ui-button ${i === 0 ? 'selected' : ''}" data-index="${i}">
              ${item}
            </button>
          `).join('')}
        </div>
        <p class="controls-hint">WASD / Arrows to move | Space to fire | Gamepad supported</p>
      </div>
    `;

    this.applyStyles();
    parent.appendChild(this.container);

    // Click handlers
    const buttons = this.container.querySelectorAll('.menu-item');
    buttons.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this.selectItem(i);
        this.confirm();
      });
    });
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #title-screen {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        pointer-events: auto;
      }

      .title-content {
        text-align: center;
        position: relative;
        z-index: 1;
      }

      .title-glow-bg {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 600px; height: 400px;
        background: radial-gradient(ellipse, oklch(0.78 0.18 200 / 0.08) 0%, transparent 70%);
        animation: title-pulse 3s ease-in-out infinite;
        pointer-events: none;
      }

      @keyframes title-pulse {
        0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
      }

      .game-title {
        font-family: var(--font-primary);
        font-size: 5rem;
        font-weight: 900;
        line-height: 1;
        margin-bottom: var(--space-md);
        letter-spacing: 0.15em;
      }

      .title-42 {
        display: block;
        color: var(--player-primary);
        text-shadow: var(--glow-cyan), 0 0 60px oklch(0.78 0.18 200 / 0.4);
        font-size: 7rem;
      }

      .title-guns {
        display: block;
        color: var(--ui-neon);
        text-shadow: var(--glow-neon), 0 0 60px oklch(0.70 0.20 350 / 0.3);
        font-size: 4rem;
        letter-spacing: 0.3em;
      }

      .subtitle {
        font-family: var(--font-secondary);
        font-size: 0.875rem;
        color: var(--ui-text-dim);
        letter-spacing: 0.3em;
        text-transform: uppercase;
        margin-bottom: var(--space-2xl);
      }

      .menu-options {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-md);
      }

      .menu-item {
        width: 240px;
        font-size: 1.1rem;
        padding: var(--space-md) var(--space-xl);
      }

      .controls-hint {
        font-family: var(--font-secondary);
        font-size: 0.75rem;
        color: oklch(0.4 0.05 200);
        margin-top: var(--space-2xl);
        letter-spacing: 0.05em;
      }
    `;
    this.container!.appendChild(style);
  }

  updateSelection(index: number): void {
    this.selectedIndex = index;
    const buttons = this.container?.querySelectorAll('.menu-item');
    buttons?.forEach((btn, i) => {
      btn.classList.toggle('selected', i === index);
    });
  }

  navigate(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + this.menuItems.length) % this.menuItems.length;
    this.updateSelection(this.selectedIndex);
  }

  confirm(): void {
    switch (this.selectedIndex) {
      case 0:
        eventBus.emit('game:start');
        break;
      case 1:
        // High scores (just show a notification for now)
        break;
    }
  }

  private selectItem(index: number): void {
    this.selectedIndex = index;
    this.updateSelection(index);
  }

  show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
      this.container.style.opacity = '0';
      requestAnimationFrame(() => {
        if (this.container) {
          this.container.style.transition = 'opacity 0.5s var(--ease-smooth)';
          this.container.style.opacity = '1';
        }
      });
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.transition = 'opacity 0.3s var(--ease-smooth)';
      this.container.style.opacity = '0';
      setTimeout(() => {
        if (this.container) this.container.style.display = 'none';
      }, 300);
    }
  }

  destroy(): void {
    this.container?.remove();
    this.container = null;
  }
}
