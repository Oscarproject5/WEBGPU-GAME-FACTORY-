/**
 * UI Manager
 * Manages all UI components and screen transitions.
 */

import { TitleScreen } from './components/title-screen';
import { HUD } from './components/hud';
import { PauseMenu } from './components/pause-menu';
import { GameOverScreen } from './components/game-over-screen';
import { WaveAnnouncement } from './components/wave-announcement';
import { eventBus } from '../core/event-bus';
import { GameState } from '../gameplay/game-state';

export class UIManager {
  private overlay: HTMLElement;
  private titleScreen: TitleScreen;
  private hud: HUD;
  private pauseMenu: PauseMenu;
  private gameOverScreen: GameOverScreen;
  private waveAnnouncement: WaveAnnouncement;
  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.overlay = document.getElementById('ui-overlay')!;
    this.titleScreen = new TitleScreen();
    this.hud = new HUD();
    this.pauseMenu = new PauseMenu();
    this.gameOverScreen = new GameOverScreen();
    this.waveAnnouncement = new WaveAnnouncement();
  }

  init(): void {
    // Import design tokens CSS
    this.loadDesignTokens();

    // Create all UI components
    this.titleScreen.create(this.overlay);
    this.hud.create(this.overlay);
    this.pauseMenu.create(this.overlay);
    this.gameOverScreen.create(this.overlay);
    this.waveAnnouncement.create(this.overlay);

    // Show title screen by default
    this.showScreen(GameState.Menu);

    // Listen for state changes
    this.unsubscribers.push(
      eventBus.on<{ from: GameState; to: GameState }>('state:change', (data) => {
        if (data) this.showScreen(data.to);
      })
    );

    // Listen for wave announcements
    this.unsubscribers.push(
      eventBus.on<{ wave: number }>('wave:start', (data) => {
        if (data) this.waveAnnouncement.announceWave(data.wave);
      })
    );

    this.unsubscribers.push(
      eventBus.on('boss:warning', () => {
        this.waveAnnouncement.announceBoss();
      })
    );
  }

  private loadDesignTokens(): void {
    // Inline the design tokens since they contain CSS custom properties
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/src/ui/styles/design-tokens.css';
    document.head.appendChild(link);
  }

  showScreen(state: GameState): void {
    switch (state) {
      case GameState.Menu:
        this.titleScreen.show();
        this.hud.hide();
        this.pauseMenu.hide();
        this.gameOverScreen.hide();
        break;

      case GameState.Playing:
        this.titleScreen.hide();
        this.hud.show();
        this.pauseMenu.hide();
        this.gameOverScreen.hide();
        break;

      case GameState.Paused:
        this.pauseMenu.show();
        break;

      case GameState.GameOver:
        this.pauseMenu.hide();
        break;
    }
  }

  showGameOver(score: number, wave: number, enemies: number, isNewHighScore: boolean): void {
    this.gameOverScreen.showWithStats(score, wave, enemies, isNewHighScore);
  }

  // HUD update methods (called from game loop)
  updateHUD(data: {
    score: number;
    multiplier: number;
    multiplierActive: boolean;
    wave: number;
    highScore: number;
    health: number;
    maxHealth: number;
    bombs: number;
    shieldHits: number;
  }): void {
    this.hud.updateScore(data.score);
    this.hud.updateMultiplier(data.multiplier, data.multiplierActive);
    this.hud.updateWave(data.wave);
    this.hud.updateHighScore(data.highScore);
    this.hud.updateHealth(data.health, data.maxHealth);
    this.hud.updateBombs(data.bombs);
    this.hud.updateShield(data.shieldHits);
  }

  // Input handling for menus
  handleMenuInput(input: {
    moveY: number;
    confirmJustPressed: boolean;
    backJustPressed: boolean;
  }, state: GameState): void {
    if (state === GameState.Menu) {
      if (input.moveY < -0.5) this.titleScreen.navigate(-1);
      if (input.moveY > 0.5) this.titleScreen.navigate(1);
      if (input.confirmJustPressed) this.titleScreen.confirm();
    } else if (state === GameState.Paused) {
      if (input.moveY < -0.5) this.pauseMenu.navigate(-1);
      if (input.moveY > 0.5) this.pauseMenu.navigate(1);
      if (input.confirmJustPressed) this.pauseMenu.confirm();
      if (input.backJustPressed) eventBus.emit('game:resume');
    } else if (state === GameState.GameOver) {
      if (input.moveY < -0.5) this.gameOverScreen.navigate(-1);
      if (input.moveY > 0.5) this.gameOverScreen.navigate(1);
      if (input.confirmJustPressed) this.gameOverScreen.confirm();
    }
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.titleScreen.destroy();
    this.hud.destroy();
    this.pauseMenu.destroy();
    this.gameOverScreen.destroy();
    this.waveAnnouncement.destroy();
  }
}
