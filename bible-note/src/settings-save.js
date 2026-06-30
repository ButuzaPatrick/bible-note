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

let currentScale = 1;

function setZoom(scale) {
  currentScale = scale;
  document.documentElement.style.transform = `scale(${scale})`;
  document.documentElement.style.width = `${100 / scale}%`;
  document.documentElement.style.height = `${100 / scale}%`;
}

function zoomIn() { setZoom(Math.min(currentScale + 0.1, 2)); }
function zoomOut() { setZoom(Math.max(currentScale - 0.1, 0.5)); }

function setZoom(scale) {
  currentScale = scale;
  document.documentElement.style.transform = `scale(${scale})`;
  document.documentElement.style.width = `${100 / scale}%`;
  document.documentElement.style.height = `${100 / scale}%`;
  localStorage.setItem("zoom", scale);
}

// On page load, restore saved zoom
const savedZoom = parseFloat(localStorage.getItem("zoom") || "1");
setZoom(savedZoom);

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "=") { e.preventDefault(); zoomIn(); }
  if (e.ctrlKey && e.key === "-") { e.preventDefault(); zoomOut(); }
  if (e.ctrlKey && e.key === "0") { e.preventDefault(); setZoom(1); }
});

document.addEventListener('wheel', (e) => {
  if (e.ctrlKey && e.deltaY < 0) { e.preventDefault(); zoomIn(); }
  if (e.ctrlKey && e.deltaY > 0) { e.preventDefault(); zoomOut(); }
});