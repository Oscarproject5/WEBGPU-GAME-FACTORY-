/**
 * Pause Menu Component
 * Glassmorphism overlay with resume/settings/quit options.
 */

import { eventBus } from '../../core/event-bus';

export class PauseMenu {
  private container: HTMLElement | null = null;
  private selectedIndex = 0;
  private menuItems = ['RESUME', 'MAIN MENU'];

  create(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'pause-menu';
    this.container.innerHTML = `
      <div class="pause-overlay"></div>
      <div class="pause-panel glass-panel">
        <h2 class="pause-title neon-text">PAUSED</h2>
        <div class="pause-options">
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
      #pause-menu {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 60;
        pointer-events: auto;
      }

      .pause-overlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: oklch(0.05 0.02 270 / 0.6);
      }

      .pause-panel {
        position: relative;
        padding: var(--space-2xl) var(--space-2xl);
        text-align: center;
        min-width: 280px;
        animation: pause-slide-in 0.3s var(--ease-smooth);
      }

      @keyframes pause-slide-in {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .pause-title {
        font-family: var(--font-primary);
        font-size: 2rem;
        font-weight: 700;
        margin-bottom: var(--space-xl);
        letter-spacing: 0.15em;
      }

      .pause-options {
        display: flex;
        flex-direction: column;
        gap: var(--space-md);
      }

      .pause-options .menu-item {
        width: 100%;
      }
    `;
    this.container!.appendChild(style);
  }

  navigate(direction: number): void {
    this.selectedIndex = (this.selectedIndex + direction + this.menuItems.length) % this.menuItems.length;
    const buttons = this.container?.querySelectorAll('.menu-item');
    buttons?.forEach((btn, i) => {
      btn.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  confirm(): void {
    switch (this.selectedIndex) {
      case 0:
        eventBus.emit('game:resume');
        break;
      case 1:
        eventBus.emit('game:menu');
        break;
    }
  }

  show(): void {
    if (this.container) {
      this.container.style.display = 'flex';
      this.selectedIndex = 0;
      const buttons = this.container.querySelectorAll('.menu-item');
      buttons.forEach((btn, i) => btn.classList.toggle('selected', i === 0));
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
