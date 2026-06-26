// Apply saved settings immediately and listen for changes across windows
function applySettingsFromStorage() {
  try {
    const s = JSON.parse(localStorage.getItem('bn_settings') || '{}');
    Object.keys(s).forEach(k => {
      document.documentElement.style.setProperty(k, s[k]);
    });
    if (s['--font-size']) document.body.style.fontSize = s['--font-size'];
  } catch (e) {
    // ignore
  }
}

// apply now
applySettingsFromStorage();

// update when other tabs/windows change settings
window.addEventListener('storage', (ev) => {
  if (ev.key === 'bn_settings') applySettingsFromStorage();
});

// also listen for a custom event in same window
window.addEventListener('bn_settings_saved', () => applySettingsFromStorage());
