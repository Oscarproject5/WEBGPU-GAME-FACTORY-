/**
 * Game State Machine
 * Manages transitions between Menu, Playing, Paused, and GameOver states.
 */

import { eventBus } from '../core/event-bus';

export enum GameState {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'gameover',
}

export class GameStateMachine {
  private state = GameState.Menu;
  private previousState = GameState.Menu;

  init(): void {
    // Listen for game events that trigger state transitions
    eventBus.on('input:pause', () => {
      if (this.state === GameState.Playing) {
        this.transition(GameState.Paused);
      } else if (this.state === GameState.Paused) {
        this.transition(GameState.Playing);
      }
    });

    eventBus.on('game:start', () => {
      this.transition(GameState.Playing);
    });

    eventBus.on('game:over', () => {
      this.transition(GameState.GameOver);
    });

    eventBus.on('game:menu', () => {
      this.transition(GameState.Menu);
    });

    eventBus.on('game:resume', () => {
      if (this.state === GameState.Paused) {
        this.transition(GameState.Playing);
      }
    });
  }

  transition(newState: GameState): void {
    if (this.state === newState) return;

    this.previousState = this.state;
    this.state = newState;

    eventBus.emit('state:change', {
      from: this.previousState,
      to: this.state,
    });

    // Emit specific state events for UI
    eventBus.emit(`state:${newState}`);
  }

  getState(): GameState {
    return this.state;
  }

  getPreviousState(): GameState {
    return this.previousState;
  }

  isPlaying(): boolean {
    return this.state === GameState.Playing;
  }

  isPaused(): boolean {
    return this.state === GameState.Paused;
  }

  isMenu(): boolean {
    return this.state === GameState.Menu;
  }

  isGameOver(): boolean {
    return this.state === GameState.GameOver;
  }
}
