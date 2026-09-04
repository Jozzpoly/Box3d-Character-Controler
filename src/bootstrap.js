const requestedMode = new URLSearchParams(window.location.search).get('mode');

if (requestedMode === 'balance' || requestedMode === 'e3') {
  import('./e3-balance-browser.js');
} else if (requestedMode === 'reaction' || requestedMode === 'e14') {
  import('./e14-reaction-browser.js');
} else if (requestedMode === 'e14lab' || requestedMode === 'contextual') {
  import('./e14-lab-browser.js');
} else if (requestedMode === 'e15' || requestedMode === 'hybrid') {
  import('./e15-hybrid-browser.js');
} else {
  import('./main.js');
}
