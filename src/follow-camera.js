import * as THREE from 'three';
import { clamp } from './math.js';

function damp(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export class FollowCamera {
  constructor(camera, canvas, options = {}) {
    this.camera = camera;
    this.canvas = canvas;
    this.dragButtons = new Set(options.dragButtons ?? [0, 2]);
    this.allowWheelZoom = options.allowWheelZoom ?? (() => true);
    this.desiredYaw = 0;
    this.desiredPitch = 0.31;
    this.desiredDistance = 6.0;
    this.yaw = this.desiredYaw;
    this.pitch = this.desiredPitch;
    this.distance = this.desiredDistance;
    this.target = new THREE.Vector3();
    this.smoothedTarget = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.verticalFocus = 0;
    this.dragPointerId = null;
    this.lastX = 0;
    this.lastY = 0;

    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('pointerdown', (event) => {
      if (!this.dragButtons.has(event.button)) return;
      if (this.dragPointerId !== null) return;
      this.dragPointerId = event.pointerId;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.dragPointerId) return;
      const dx = event.clientX - this.lastX;
      const dy = event.clientY - this.lastY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.desiredYaw -= dx * 0.0052;
      this.desiredPitch = clamp(this.desiredPitch - dy * 0.0038, -0.04, 0.92);
    });
    const stopDrag = (event) => {
      if (event?.pointerId !== this.dragPointerId) return;
      this.dragPointerId = null;
      if (event?.pointerId !== undefined && canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture?.(event.pointerId);
      }
    };
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    canvas.addEventListener('lostpointercapture', (event) => {
      if (event.pointerId === this.dragPointerId) this.dragPointerId = null;
    });
    canvas.addEventListener('wheel', (event) => {
      if (!this.allowWheelZoom(event)) return;
      event.preventDefault();
      this.desiredDistance = clamp(this.desiredDistance * Math.exp(event.deltaY * 0.0008), 4.0, 10.5);
    }, { passive: false });
  }

  reset() {
    this.desiredYaw = 0;
    this.desiredPitch = 0.31;
    this.desiredDistance = 6.0;
    this.yaw = this.desiredYaw;
    this.pitch = this.desiredPitch;
    this.distance = this.desiredDistance;
    this.dragPointerId = null;
  }

  basis() {
    return {
      forward: [-Math.sin(this.yaw), 0, -Math.cos(this.yaw)],
      right: [Math.cos(this.yaw), 0, -Math.sin(this.yaw)],
    };
  }

  snap(target) {
    const focusY = target[1] + 0.62;
    this.target.set(target[0], focusY, target[2]);
    this.smoothedTarget.copy(this.target);
    this.verticalFocus = focusY;
    this.yaw = this.desiredYaw;
    this.pitch = this.desiredPitch;
    this.distance = this.desiredDistance;
    this._placeCamera(1);
  }

  update(target, grounded, dt) {
    this.yaw = damp(this.yaw, this.desiredYaw, 17, dt);
    this.pitch = damp(this.pitch, this.desiredPitch, 15, dt);
    this.distance = damp(this.distance, this.desiredDistance, 12, dt);

    const rawFocusY = target[1] + 0.62;
    if (grounded) {
      this.verticalFocus = damp(this.verticalFocus, rawFocusY, 7.5, dt);
    } else {
      const upper = this.verticalFocus + 1.0;
      const lower = this.verticalFocus - 0.72;
      let desiredVertical = this.verticalFocus;
      if (rawFocusY > upper) desiredVertical = rawFocusY - 1.0;
      else if (rawFocusY < lower) desiredVertical = rawFocusY + 0.72;
      this.verticalFocus = damp(this.verticalFocus, desiredVertical, 4.5, dt);
    }

    this.target.set(target[0], this.verticalFocus, target[2]);
    const horizontalBlend = 1 - Math.exp(-dt * 11.5);
    this.smoothedTarget.x += (this.target.x - this.smoothedTarget.x) * horizontalBlend;
    this.smoothedTarget.z += (this.target.z - this.smoothedTarget.z) * horizontalBlend;
    this.smoothedTarget.y = this.verticalFocus;
    this._placeCamera(1 - Math.exp(-dt * 13));
  }

  _placeCamera(blend) {
    const horizontal = Math.cos(this.pitch) * this.distance;
    this.desiredPosition.set(
      this.smoothedTarget.x + Math.sin(this.yaw) * horizontal,
      this.smoothedTarget.y + Math.sin(this.pitch) * this.distance + 0.2,
      this.smoothedTarget.z + Math.cos(this.yaw) * horizontal,
    );
    this.camera.position.lerp(this.desiredPosition, blend);
    this.camera.lookAt(this.smoothedTarget);
  }
}
