import { createE17PointMassManipulatorCharacter } from './e17-point-mass-manipulator-character.js';
import { reportE17BrowserFailure, startE17ManipulationBrowser } from './e17-manipulation-browser-shell.js';

startE17ManipulationBrowser({
  createCharacter: createE17PointMassManipulatorCharacter,
  loadingText: 'Loading E17-depth…',
  phaseText: 'E17-depth · ONE-POINT, INERTIA-AWARE',
  secondaryHtml: '<strong>LMB directly on a nearby dynamic object + drag</strong> = same E17 one-point intent · only point effective-mass accounting changed · <strong>release LMB</strong> let go · <strong>R</strong> reset · <strong>H</strong> telemetry',
  statusText: 'E17-depth A/B · same one-point gameplay shell · rotational inertia participates only in actuator effective mass',
  failureLabel: 'E17-depth',
}).catch((error) => reportE17BrowserFailure('E17-depth', error));
