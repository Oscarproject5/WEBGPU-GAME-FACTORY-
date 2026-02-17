/**
 * Wave Announcement Overlay
 * "WAVE XX" text that scales up with chromatic split effect.
 */

export class WaveAnnouncement {
  private container: HTMLElement | null = null;
  private textEl: HTMLElement | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;

  create(parent: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'wave-announcement';
    this.container.innerHTML = `
      <div class="wave-text" id="wave-text"></div>
    `;

    this.applyStyles();
    parent.appendChild(this.container);
    this.textEl = document.getElementById('wave-text');
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #wave-announcement {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        display: none;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 30;
      }

      .wave-text {
        font-family: var(--font-primary);
        font-size: 3.5rem;
        font-weight: 900;
        color: var(--player-primary);
        text-shadow: var(--glow-cyan), 0 0 60px oklch(0.78 0.18 200 / 0.3);
        letter-spacing: 0.2em;
        animation: wave-entrance 1.5s var(--ease-smooth) forwards;
        position: relative;
      }

      .wave-text::before,
      .wave-text::after {
        content: attr(data-text);
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
      }

      .wave-text::before {
        color: oklch(0.78 0.18 200 / 0.5);
        animation: chromatic-r 1.5s var(--ease-smooth) forwards;
      }

      .wave-text::after {
        color: oklch(0.65 0.25 340 / 0.5);
        animation: chromatic-b 1.5s var(--ease-smooth) forwards;
      }

      @keyframes wave-entrance {
        0% { transform: scale(0); opacity: 0; }
        15% { transform: scale(1.2); opacity: 1; }
        25% { transform: scale(1); }
        75% { transform: scale(1); opacity: 1; }
        100% { transform: scale(1.5); opacity: 0; }
      }

      @keyframes chromatic-r {
        0% { transform: translateX(0); opacity: 0; }
        15% { transform: translateX(4px); opacity: 0.6; }
        25% { transform: translateX(2px); opacity: 0.4; }
        75% { transform: translateX(2px); opacity: 0.4; }
        100% { transform: translateX(6px); opacity: 0; }
      }

      @keyframes chromatic-b {
        0% { transform: translateX(0); opacity: 0; }
        15% { transform: translateX(-4px); opacity: 0.6; }
        25% { transform: translateX(-2px); opacity: 0.4; }
        75% { transform: translateX(-2px); opacity: 0.4; }
        100% { transform: translateX(-6px); opacity: 0; }
      }

      .wave-text.boss-warning {
        color: var(--ui-danger);
        text-shadow: 0 0 20px oklch(0.6 0.2 25 / 0.6), 0 0 40px oklch(0.6 0.2 25 / 0.3);
        font-size: 2.5rem;
      }
    `;
    this.container!.appendChild(style);
  }

  announceWave(wave: number): void {
    this.show(`WAVE ${wave}`, false);
  }

  announceBoss(): void {
    this.show('WARNING: BOSS INCOMING', true);
  }

  private show(text: string, isBoss: boolean): void {
    if (!this.container || !this.textEl) return;

    // Clear any existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.textEl.textContent = text;
    this.textEl.setAttribute('data-text', text);
    this.textEl.classList.toggle('boss-warning', isBoss);

    this.container.style.display = 'flex';

    // Force reflow to restart animation
    this.textEl.style.animation = 'none';
    void this.textEl.offsetHeight; // Trigger reflow
    this.textEl.style.animation = '';

    // Hide after animation
    this.timeout = setTimeout(() => {
      if (this.container) this.container.style.display = 'none';
    }, 1500);
  }

  destroy(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.container?.remove();
    this.container = null;
  }
}
