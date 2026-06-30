// settings-apply.js
(async function applySavedTheme() {
  const modId = localStorage.getItem("activeThemeMod");
  if (!modId) return;

  try {
    const res = await fetch(`http://localhost:8000/mods/${modId}/run`, { method: "POST" });
    const data = await res.json();
    for (const [key, value] of Object.entries(data.result)) {
      document.documentElement.style.setProperty(key, value);
    }
  } catch (e) {
    console.warn("Could not apply saved theme:", e);
  }
})();