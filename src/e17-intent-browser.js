import { createE17IntentManipulatorCharacter } from './e17-intent-manipulator-character.js';
import { reportE17BrowserFailure, startE17ManipulationBrowser } from './e17-manipulation-browser-shell.js';

startE17ManipulationBrowser({
  createCharacter: createE17IntentManipulatorCharacter,
  phaseText: 'E17 · INTENT-FIRST PHYSICAL MANIPULATOR',
  secondaryHtml: '<strong>LMB directly on a nearby dynamic object + drag</strong> = manipulate its clicked surface point in 3D · object mass/collision still win · <strong>release LMB</strong> let go · <strong>R</strong> reset · <strong>H</strong> telemetry',
  statusText: ({ baseCounts, toyboxCounts }) => `E17 architecture reset · NO green end-effector aiming · direct object intent -> finite physical execution · ${baseCounts.dynamicCount + toyboxCounts.dynamicBodies + 1} dynamic bodies`,
  failureLabel: 'E17',
}).catch((error) => reportE17BrowserFailure('E17', error));
