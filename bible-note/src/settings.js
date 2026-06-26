// Save settings to localStorage and update preview
const settings = {
  bg: document.getElementById('bg-color'),
  surface: document.getElementById('surface-color'),
  text: document.getElementById('text-color'),
  fontSize: document.getElementById('font-size'),
  fontSizeLabel: document.getElementById('font-size-label'),
  preview: document.getElementById('preview')
};

function loadValues() {
  const s = JSON.parse(localStorage.getItem('bn_settings') || '{}');
  settings.bg.value = s['--bg'] || '#0f0f0f';
  settings.surface.value = s['--surface'] || '#1a1a1a';
  settings.text.value = s['--text'] || '#e8e8e8';
  settings.fontSize.value = s['--font-size'] ? parseInt(s['--font-size']) : 16;
  settings.fontSizeLabel.textContent = settings.fontSize.value;
  applyPreview();
}

function applyPreview() {
  document.documentElement.style.setProperty('--bg', settings.bg.value);
  document.documentElement.style.setProperty('--surface', settings.surface.value);
  document.documentElement.style.setProperty('--text', settings.text.value);
  document.documentElement.style.setProperty('--font-size', settings.fontSize.value + 'px');
  settings.preview.style.fontSize = settings.fontSize.value + 'px';
}

document.addEventListener('DOMContentLoaded', () => {
  loadValues();

  ['bg-color','surface-color','text-color','font-size'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', applyPreview);
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    const s = {
      '--bg': settings.bg.value,
      '--surface': settings.surface.value,
      '--text': settings.text.value,
      '--font-size': settings.fontSize.value + 'px'
    };
    localStorage.setItem('bn_settings', JSON.stringify(s));
    // notify other scripts in this window and other windows
    window.dispatchEvent(new Event('bn_settings_saved'));
    // show toast instead of alert
    const toast = document.getElementById('settings-toast');
    if (toast) {
      toast.textContent = 'Settings saved';
      toast.hidden = false;
      clearTimeout(window._bn_toast_timeout);
      window._bn_toast_timeout = setTimeout(() => { toast.hidden = true; }, 2200);
    } else {
      alert('Saved');
    }
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    localStorage.removeItem('bn_settings');
    loadValues();
  });
});
