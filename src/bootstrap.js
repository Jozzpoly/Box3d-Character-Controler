const requestedMode = new URLSearchParams(window.location.search).get('mode');

if (requestedMode === 'balance' || requestedMode === 'e3') {
  import('./e3-balance-browser.js');
} else if (requestedMode === 'reaction' || requestedMode === 'e14') {
  import('./e14-reaction-browser.js');
} else {
  import('./main.js');
}
