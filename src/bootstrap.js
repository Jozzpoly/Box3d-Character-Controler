const requestedMode = new URLSearchParams(window.location.search).get('mode');

if (requestedMode === 'balance' || requestedMode === 'e3') {
  import('./e3-balance-browser.js');
} else {
  import('./main.js');
}
