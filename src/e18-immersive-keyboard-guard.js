const LOCKED_MOVEMENT_CODES = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];

function isEditableTarget(target) {
  return target instanceof HTMLElement && (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

function createImmersiveButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Toggle immersive fullscreen keyboard lock');
  Object.assign(button.style, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    zIndex: '10000',
    padding: '8px 11px',
    border: '1px solid rgba(255,255,255,0.32)',
    borderRadius: '8px',
    background: 'rgba(24,32,36,0.72)',
    color: '#f4f7f5',
    font: '600 11px/1.2 system-ui, sans-serif',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    backdropFilter: 'blur(6px)',
  });
  document.body.appendChild(button);
  return button;
}

const button = createImmersiveButton();
let transientMessage = null;

function updateButton() {
  if (transientMessage) {
    button.textContent = transientMessage;
    return;
  }
  button.textContent = document.fullscreenElement
    ? 'IMMERSIVE ON · F'
    : 'IMMERSIVE · F';
  button.title = document.fullscreenElement
    ? 'Fullscreen + keyboard lock active. F exits.'
    : 'Enter fullscreen and lock WASD so Ctrl+W does not become a browser shortcut. F toggles.';
}

function showTransient(message) {
  transientMessage = message;
  updateButton();
  window.setTimeout(() => {
    transientMessage = null;
    updateButton();
  }, 1800);
}

async function lockMovementKeys() {
  if (!navigator.keyboard?.lock) return false;
  try {
    await navigator.keyboard.lock(LOCKED_MOVEMENT_CODES);
    return true;
  } catch {
    return false;
  }
}

function unlockMovementKeys() {
  try {
    navigator.keyboard?.unlock?.();
  } catch {
    // Progressive enhancement only; exiting fullscreen still restores browser ownership.
  }
}

async function enterImmersive() {
  if (!document.fullscreenEnabled) {
    showTransient('FULLSCREEN UNAVAILABLE');
    return;
  }

  try {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen({
          navigationUI: 'hide',
          keyboardLock: 'browser',
        });
      } catch {
        // Older Fullscreen implementations may reject the newer keyboardLock option.
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    }

    const locked = await lockMovementKeys();
    if (!locked) showTransient('FULLSCREEN ON · KEY LOCK UNSUPPORTED');
  } catch {
    showTransient('FULLSCREEN BLOCKED');
  }
}

async function exitImmersive() {
  unlockMovementKeys();
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    showTransient('EXIT FULLSCREEN FAILED');
  }
}

async function toggleImmersive() {
  if (document.fullscreenElement) await exitImmersive();
  else await enterImmersive();
}

button.addEventListener('click', () => {
  void toggleImmersive();
});

window.addEventListener('keydown', (event) => {
  if (
    event.code !== 'KeyF' ||
    event.repeat ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    isEditableTarget(event.target)
  ) return;
  event.preventDefault();
  void toggleImmersive();
});

document.addEventListener('fullscreenchange', () => {
  if (document.fullscreenElement) void lockMovementKeys();
  else unlockMovementKeys();
  updateButton();
});

window.addEventListener('pagehide', unlockMovementKeys);
updateButton();
