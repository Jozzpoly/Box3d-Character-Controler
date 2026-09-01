import { createDonorIntent, normalizeMoveAxes } from './donor/intent.js';

function clampUnit(value) {
  return Math.max(-1, Math.min(1, value));
}

export function normalizeVirtualStick(dx, dy, radius, deadZone = 0.12) {
  const safeRadius = Math.max(1, radius);
  const rawX = dx / safeRadius;
  const rawY = dy / safeRadius;
  const rawLength = Math.hypot(rawX, rawY);
  if (rawLength <= deadZone) {
    return { moveRight: 0, moveForward: 0, knobX: 0, knobY: 0 };
  }

  const limitedLength = Math.min(1, rawLength);
  const scaledLength = (limitedLength - deadZone) / (1 - deadZone);
  const unitX = rawX / rawLength;
  const unitY = rawY / rawLength;
  return {
    moveRight: clampUnit(unitX * scaledLength),
    moveForward: clampUnit(-unitY * scaledLength),
    knobX: unitX * limitedLength * safeRadius,
    knobY: unitY * limitedLength * safeRadius,
  };
}

export function mergeMovement(keyboardForward, keyboardRight, touchForward, touchRight) {
  return normalizeMoveAxes(
    keyboardForward + touchForward,
    keyboardRight + touchRight,
  );
}

export function detectTouchCapability(force = null) {
  if (force === true || force === false) return force;
  const maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0;
  const coarsePointer = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  return maxTouchPoints > 0 || coarsePointer;
}

export class PlayerInput {
  constructor({ touchRoot = null, forceTouch = null } = {}) {
    this.keys = new Set();
    this.jumpQueued = false;
    this.touchMoveForward = 0;
    this.touchMoveRight = 0;
    this.touchJumpHeld = false;
    this.touchSprintHeld = false;
    this.touchEnabled = detectTouchCapability(forceTouch);
    this.touchRoot = touchRoot;
    this.movePad = touchRoot?.querySelector('#touch-move-pad') ?? null;
    this.moveKnob = touchRoot?.querySelector('#touch-move-knob') ?? null;
    this.jumpButton = touchRoot?.querySelector('#touch-jump') ?? null;
    this.sprintButton = touchRoot?.querySelector('#touch-sprint') ?? null;
    this.movePointerId = null;

    this._onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (event.code === 'Space') {
        if (!event.repeat) this.jumpQueued = true;
        event.preventDefault();
      }
    };
    this._onKeyUp = (event) => this.keys.delete(event.key.toLowerCase());
    this._onBlur = () => this.clear();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);

    if (touchRoot) {
      touchRoot.hidden = !this.touchEnabled;
      document.body.classList.toggle('touch-ui', this.touchEnabled);
    }
    if (this.touchEnabled) this._installTouchControls();
  }

  _installTouchControls() {
    if (!this.movePad || !this.moveKnob || !this.jumpButton || !this.sprintButton) return;

    const updateMove = (event) => {
      if (event.pointerId !== this.movePointerId) return;
      const rect = this.movePad.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
      const result = normalizeVirtualStick(event.clientX - centerX, event.clientY - centerY, radius);
      this.touchMoveForward = result.moveForward;
      this.touchMoveRight = result.moveRight;
      this.moveKnob.style.transform = `translate(${result.knobX.toFixed(2)}px, ${result.knobY.toFixed(2)}px)`;
    };

    const stopMove = (event) => {
      if (event.pointerId !== this.movePointerId) return;
      this.movePointerId = null;
      this.touchMoveForward = 0;
      this.touchMoveRight = 0;
      this.moveKnob.style.transform = 'translate(0px, 0px)';
      if (this.movePad.hasPointerCapture?.(event.pointerId)) {
        this.movePad.releasePointerCapture?.(event.pointerId);
      }
    };

    this.movePad.addEventListener('pointerdown', (event) => {
      if (this.movePointerId !== null) return;
      event.preventDefault();
      this.movePointerId = event.pointerId;
      this.movePad.setPointerCapture?.(event.pointerId);
      updateMove(event);
    });
    this.movePad.addEventListener('pointermove', updateMove);
    this.movePad.addEventListener('pointerup', stopMove);
    this.movePad.addEventListener('pointercancel', stopMove);
    this.movePad.addEventListener('lostpointercapture', (event) => {
      if (event.pointerId === this.movePointerId) {
        this.movePointerId = null;
        this.touchMoveForward = 0;
        this.touchMoveRight = 0;
        this.moveKnob.style.transform = 'translate(0px, 0px)';
      }
    });

    const bindHeldButton = (button, onDown, onUp) => {
      const release = (event) => {
        onUp();
        button.classList.remove('is-held');
        button.setAttribute('aria-pressed', 'false');
        if (button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture?.(event.pointerId);
      };
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.setPointerCapture?.(event.pointerId);
        onDown();
        button.classList.add('is-held');
        button.setAttribute('aria-pressed', 'true');
      });
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', () => {
        onUp();
        button.classList.remove('is-held');
        button.setAttribute('aria-pressed', 'false');
      });
    };

    bindHeldButton(
      this.jumpButton,
      () => {
        if (!this.touchJumpHeld) this.jumpQueued = true;
        this.touchJumpHeld = true;
      },
      () => { this.touchJumpHeld = false; },
    );
    bindHeldButton(
      this.sprintButton,
      () => { this.touchSprintHeld = true; },
      () => { this.touchSprintHeld = false; },
    );
  }

  clear() {
    this.keys.clear();
    this.jumpQueued = false;
    this.touchMoveForward = 0;
    this.touchMoveRight = 0;
    this.touchJumpHeld = false;
    this.touchSprintHeld = false;
    this.movePointerId = null;
    if (this.moveKnob) this.moveKnob.style.transform = 'translate(0px, 0px)';
    this.jumpButton?.classList.remove('is-held');
    this.sprintButton?.classList.remove('is-held');
    this.jumpButton?.setAttribute('aria-pressed', 'false');
    this.sprintButton?.setAttribute('aria-pressed', 'false');
  }

  sample(basis) {
    let keyboardForward = 0;
    let keyboardRight = 0;
    if (this.keys.has('w')) keyboardForward += 1;
    if (this.keys.has('s')) keyboardForward -= 1;
    if (this.keys.has('d')) keyboardRight += 1;
    if (this.keys.has('a')) keyboardRight -= 1;

    const movement = mergeMovement(
      keyboardForward,
      keyboardRight,
      this.touchMoveForward,
      this.touchMoveRight,
    );
    const jump = this.jumpQueued;
    this.jumpQueued = false;

    return createDonorIntent({
      ...movement,
      forward: basis.forward,
      right: basis.right,
      jump,
      jumpHeld: this.keys.has(' ') || this.touchJumpHeld,
      sprint: this.keys.has('shift') || this.touchSprintHeld,
    });
  }
}
