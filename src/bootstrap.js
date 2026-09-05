const requestedMode = new URLSearchParams(window.location.search).get('mode');

if (requestedMode === 'balance' || requestedMode === 'e3') {
  import('./e3-balance-browser.js');
} else if (requestedMode === 'reaction' || requestedMode === 'e14') {
  import('./e14-reaction-browser.js');
} else if (requestedMode === 'e14lab' || requestedMode === 'contextual') {
  import('./e14-lab-browser.js');
} else if (requestedMode === 'e15' || requestedMode === 'hybrid') {
  import('./e15-hybrid-browser.js');
} else if (requestedMode === 'e19' || requestedMode === 'grip') {
  import('./e19-owner-browser.js');
} else if (requestedMode === 'e18p3' || requestedMode === 'p3') {
  import('./e18-immersive-keyboard-guard.js');
  import('./e18-p3-owner-browser.js');
} else if (requestedMode === 'e17depth' || requestedMode === 'pointmass') {
  import('./e17-depth-browser.js');
} else if (requestedMode === 'e17' || requestedMode === 'intent') {
  import('./e17-intent-browser.js');
} else if (requestedMode === 'e16direct' || requestedMode === 'direct') {
  import('./e16-direct-browser.js');
} else if (requestedMode === 'e16' || requestedMode === 'organ' || requestedMode === 'toybox') {
  import('./e16-toybox-browser.js');
} else {
  import('./main.js');
}
