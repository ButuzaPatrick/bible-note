let allMods = [];

async function init() {
  allMods = await BNApi.get('/mods');
  renderSection("panel-mods", "panel", renderPanelMod);
  renderSection("importer-mods", "importer", renderImporterMod);
  renderSection("theme-mods", "theme", renderThemeMod);
}

function renderSection(containerId, type, renderFn) {
  const container = document.getElementById(containerId);
  const mods = allMods.filter(m => m.type === type);

  if (type === "theme") {
    const noneActive = !localStorage.getItem("activeThemeMod");
    let html = `
      <div class="mod-card">
        <div class="mod-info">
          <h4>Default</h4>
          <p>Reset to the app's built-in theme</p>
        </div>
        <button class="btn-run ${noneActive ? 'active' : ''}" onclick="deactivateTheme(this)">
          ${noneActive ? "Active" : "Apply"}
        </button>
      </div>
    `;
    html += mods.map(renderFn).join("");
    container.innerHTML = html;
    return;
  }

  if (mods.length === 0) {
    container.innerHTML = `<p class="empty">No ${type} mods installed.</p>`;
    return;
  }

  container.innerHTML = mods.map(renderFn).join("");
}

function renderPanelMod(mod) {
  return `
    <div class="mod-card">
      <div class="mod-info">
        <h4>${mod.name}</h4>
        <p>${mod.description || ""}</p>
      </div>
      <span class="mod-tag">v${mod.version}</span>
    </div>
  `;
}

function renderImporterMod(mod) {
  return `
    <div class="mod-card">
      <div class="mod-info">
        <h4>${mod.name}</h4>
        <p>${mod.description || ""}</p>
      </div>
      <button class="btn-run" onclick="runImporter('${mod.id}', this)">Import</button>
    </div>
  `;
}

function renderThemeMod(mod) {
  const isActive = localStorage.getItem("activeThemeMod") === mod.id;
  return `
    <div class="mod-card">
      <div class="mod-info">
        <h4>${mod.name}</h4>
        <p>${mod.description || ""}</p>
      </div>
      <button class="btn-run ${isActive ? 'active' : ''}" onclick="selectTheme('${mod.id}', this)">
        ${isActive ? "Active" : "Apply"}
      </button>
    </div>
  `;
}

async function runImporter(modId, btn) {
  btn.textContent = "Running...";
  btn.disabled = true;
  try {
    const data = await BNApi.post(`/mods/${modId}/run`, {});
    btn.textContent = "Done";
  } catch (e) {
    btn.textContent = "Failed";
  }
  setTimeout(() => {
    btn.textContent = "Import";
    btn.disabled = false;
  }, 2000);
}

async function selectTheme(modId, btn) {
  btn.textContent = "Applying...";
  try {
    const data = await BNApi.post(`/mods/${modId}/run`, {});
    for (const [key, value] of Object.entries(data.result)) {
      document.documentElement.style.setProperty(key, value);
    }
    localStorage.setItem("activeThemeMod", modId);
    renderSection("theme-mods", "theme", renderThemeMod);
  } catch (e) {
    btn.textContent = "Failed";
  }
}

function deactivateTheme(btn) {
  localStorage.removeItem("activeThemeMod");

  const vars = ["--bg", "--surface", "--surface2", "--border", "--text", "--text-muted", "--accent"];
  vars.forEach(v => document.documentElement.style.removeProperty(v));

  renderSection("theme-mods", "theme", renderThemeMod);
}

init();