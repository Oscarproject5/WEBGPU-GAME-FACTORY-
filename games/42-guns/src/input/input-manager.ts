/**
 * Unified Input Manager - Keyboard + Gamepad
 * Provides a single input state interface regardless of input source.
 */

import { eventBus } from '../core/event-bus';

export interface InputState {
  moveX: number;     // -1 to 1
  moveY: number;     // -1 to 1
  fire: boolean;     // held
  bomb: boolean;     // held
  pause: boolean;    // held
  confirm: boolean;  // held
  back: boolean;     // held
  // Edge-detected (true only on the frame pressed)
  fireJustPressed: boolean;
  bombJustPressed: boolean;
  pauseJustPressed: boolean;
  confirmJustPressed: boolean;
  backJustPressed: boolean;
}

const GAMEPAD_DEADZONE = 0.15;

export class InputManager {
  private keys = new Set<string>();
  private prevKeys = new Set<string>();
  private state: InputState = this.createEmptyState();
  private prevState: InputState = this.createEmptyState();

  private keydownHandler = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    // Prevent default for game keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private keyupHandler = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private blurHandler = (): void => {
    this.keys.clear();
  };

  init(): void {
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    window.addEventListener('blur', this.blurHandler);
  }

  update(): void {
    // Save previous state for edge detection
    this.prevState = { ...this.state };

    // Reset state
    this.state = this.createEmptyState();

    // Read keyboard
    this.readKeyboard();

    // Read gamepad (overrides/merges with keyboard)
    this.readGamepad();

    // Edge detection
    this.state.fireJustPressed = this.state.fire && !this.prevState.fire;
    this.state.bombJustPressed = this.state.bomb && !this.prevState.bomb;
    this.state.pauseJustPressed = this.state.pause && !this.prevState.pause;
    this.state.confirmJustPressed = this.state.confirm && !this.prevState.confirm;
    this.state.backJustPressed = this.state.back && !this.prevState.back;

    // Emit events for edge-detected actions
    if (this.state.pauseJustPressed) {
      eventBus.emit('input:pause');
    }
    if (this.state.bombJustPressed) {
      eventBus.emit('input:bomb');
    }

    // Update prev keys
    this.prevKeys = new Set(this.keys);
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    window.removeEventListener('blur', this.blurHandler);
  }

  private createEmptyState(): InputState {
    return {
      moveX: 0,
      moveY: 0,
      fire: false,
      bomb: false,
      pause: false,
      confirm: false,
      back: false,
      fireJustPressed: false,
      bombJustPressed: false,
      pauseJustPressed: false,
      confirmJustPressed: false,
      backJustPressed: false,
    };
  }

  private readKeyboard(): void {
    // Movement - WASD
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.state.moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.state.moveX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.state.moveY -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.state.moveY += 1;

    // Normalize diagonal movement
    if (this.state.moveX !== 0 && this.state.moveY !== 0) {
      const len = Math.sqrt(this.state.moveX * this.state.moveX + this.state.moveY * this.state.moveY);
      this.state.moveX /= len;
      this.state.moveY /= len;
    }

    // Actions
    this.state.fire = this.keys.has('Space');
    this.state.bomb = this.keys.has('KeyE') || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    this.state.pause = this.keys.has('Escape');
    this.state.confirm = this.keys.has('Enter') || this.keys.has('Space');
    this.state.back = this.keys.has('Escape');
  }

  private readGamepad(): void {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    for (const gamepad of gamepads) {
      if (!gamepad || !gamepad.connected) continue;

      // Left stick
      const lx = this.applyDeadzone(gamepad.axes[0] ?? 0);
      const ly = this.applyDeadzone(gamepad.axes[1] ?? 0);

      if (lx !== 0 || ly !== 0) {
        this.state.moveX = lx;
        this.state.moveY = ly;
      }

      // D-Pad (buttons 12-15: up, down, left, right)
      if (gamepad.buttons[14]?.pressed) this.state.moveX = -1; // Left
      if (gamepad.buttons[15]?.pressed) this.state.moveX = 1;  // Right
      if (gamepad.buttons[12]?.pressed) this.state.moveY = -1; // Up
      if (gamepad.buttons[13]?.pressed) this.state.moveY = 1;  // Down

      // A button (index 0) = fire / confirm
      if (gamepad.buttons[0]?.pressed) {
        this.state.fire = true;
        this.state.confirm = true;
      }

      // B button (index 1) = bomb / back
      if (gamepad.buttons[1]?.pressed) {
        this.state.bomb = true;
        this.state.back = true;
      }

      // Right trigger (index 7) = fire
      if (gamepad.buttons[7]?.value > 0.1) {
        this.state.fire = true;
      }

      // Left trigger (index 6) = bomb
      if (gamepad.buttons[6]?.value > 0.1) {
        this.state.bomb = true;
      }

      // Start button (index 9) = pause
      if (gamepad.buttons[9]?.pressed) {
        this.state.pause = true;
      }

      // Only use first connected gamepad
      break;
    }
  }

  private applyDeadzone(value: number): number {
    if (Math.abs(value) < GAMEPAD_DEADZONE) return 0;
    // Remap from deadzone..1 to 0..1
    const sign = Math.sign(value);
    const magnitude = (Math.abs(value) - GAMEPAD_DEADZONE) / (1 - GAMEPAD_DEADZONE);
    return sign * Math.min(magnitude, 1);
  }
}
