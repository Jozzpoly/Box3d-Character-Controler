import * as THREE from 'three';
import { clamp } from './math.js';

export class FollowCamera {
  constructor(camera, canvas) {
    this.camera = camera;
    this.canvas = canvas;
    this.yaw = 0;
    this.pitch = 0.38;
    this.distance = 7.2;
    this.target = new THREE.Vector3();
    this.smoothedTarget = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.button !== 2) return;
      this.dragging = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.dragging) return;
      const dx = event.clientX - this.lastX;
      const dy = event.clientY - this.lastY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.yaw -= dx * 0.006;
      this.pitch = clamp(this.pitch - dy * 0.0045, -0.10, 1.05);
    });
    const stopDrag = (event) => {
      this.dragging = false;
      if (event?.pointerId !== undefined) canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener('pointerup', stopDrag);
    canvas.addEventListener('pointercancel', stopDrag);
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.distance = clamp(this.distance * Math.exp(event.deltaY * 0.001), 3.4, 12.5);
    }, { passive: false });
  }

  reset() {
    this.yaw = 0;
    this.pitch = 0.38;
    this.distance = 7.2;
  }

  basis() {
    return { forward: [-Math.sin(this.yaw), 0, -Math.cos(this.yaw)], right: [Math.cos(this.yaw), 0, -Math.sin(this.yaw)] };
  }

  snap(target) {
    this.target.set(target[0], target[1] + 0.75, target[2]);
    this.smoothedTarget.copy(this.target);
    this._placeCamera(1);
  }

  update(target, dt) {
    this.target.set(target[0], target[1] + 0.75, target[2]);
    this.smoothedTarget.lerp(this.target, 1 - Math.exp(-dt * 10));
    this._placeCamera(1 - Math.exp(-dt * 12));
  }

  _placeCamera(blend) {
    const horizontal = Math.cos(this.pitch) * this.distance;
    this.desiredPosition.set(this.smoothedTarget.x + Math.sin(this.yaw) * horizontal, this.smoothedTarget.y + Math.sin(this.pitch) * this.distance + 0.35, this.smoothedTarget.z + Math.cos(this.yaw) * horizontal);
    this.camera.position.lerp(this.desiredPosition, blend);
    this.camera.lookAt(this.smoothedTarget);
  }
}
