const params = new URLSearchParams(location.search);
const portalId = params.get("id");
console.log(portalId);

let portal = null;
let layers = [];
let activeLayer = null;
let highlights = [];
let selectedColour = "#7c6aff";
let justSelectedText = false;
let verseTextCache = {};
let layerToDelete = null;


// ── INIT ──
async function init() {
  portal = await BNApi.get(`/portals/${portalId}`);
  document.getElementById("portal-title").textContent = portal.title;
  await loadVerses();
  await loadLayers();
  setupSidebarBehaviour();
  setupHighlighting();
}

function openDeleteLayerModal(event, id, title) {
  event.stopPropagation();
  layerToDelete = id;
  document.getElementById("delete-layer-name").textContent = title || "Untitled";
  document.getElementById("delete-layer-modal-overlay").classList.add("open");
}

function closeDeleteLayerModal() {
  layerToDelete = null;
  document.getElementById("delete-layer-modal-overlay").classList.remove("open");
}

async function confirmDeleteLayer() {
  if (!layerToDelete) return;
  await BNApi.del(`/layers/${layerToDelete}`);
  if (activeLayer?.id === layerToDelete) {
    activeLayer = null;
    clearHighlightsUI();
    clearNotesUI();
  }
  closeDeleteLayerModal();
  await loadLayers();
}

// ── VERSES ──
async function loadVerses() {
  const verses = await BNApi.get(`/portals/${portalId}/verses`);
  let currentChapter = null;
  let html = "";

  for (const v of verses) {
    if (v.chapter !== currentChapter) {
      currentChapter = v.chapter;
      html += `<span class="chapter-heading">${portal.book} --- Chapter ${v.chapter}</span>`;
    }
    html += `
      <span class="verse" data-verse-id="${v.id}" data-verse="${v.verse_number}" data-chapter="${v.chapter}">
        <span class="verse-number">${v.verse_number}</span><span class="verse-text">${v.text} </span>
      </span>
    `;
  }

  document.getElementById("verse-list").innerHTML = html;

  document.querySelectorAll(".verse").forEach(v => {
    const textEl = v.querySelector(".verse-text");
    if (textEl) verseTextCache[v.dataset.verseId] = textEl.textContent;
  });
}

// ── LAYERS ──
async function loadLayers() {
  layers = await BNApi.get(`/portals/${portalId}/layers`);
  renderLayers();
  if (layers.length > 0 && !activeLayer) {
    await new Promise(r => setTimeout(r, 0));
    await setActiveLayer(layers[0]);
  }
}

function renderLayers() {
  const list = document.getElementById("layer-list");
  list.innerHTML = layers.map(l => `
    <div class="layer-pill ${activeLayer?.id === l.id ? 'active' : ''}"
         onclick="setActiveLayer(${JSON.stringify(l).replace(/"/g, '&quot;')})">
      <div class="layer-dot" style="background:${l.colour}"></div>
      <span class="layer-pill-label">${l.title || 'Untitled'}</span>
      <button class="layer-delete" onclick="openDeleteLayerModal(event, ${l.id}, '${l.title || ''}')">✕</button>
    </div>
  `).join("");
}

async function setActiveLayer(layer) {
  activeLayer = typeof layer === "string" ? JSON.parse(layer) : layer;
  renderLayers();
  clearHighlightsUI();
  clearNotesUI();
  highlights = await BNApi.get(`/layers/${activeLayer.id}/highlights`);
  renderHighlights();
  renderNotes();
}

async function deleteLayer(event, id) {
  event.stopPropagation();
  await BNApi.del(`/layers/${id}`);
  if (activeLayer?.id === id) {
    activeLayer = null;
    clearHighlightsUI();
    clearNotesUI();
  }
  await loadLayers();
}

function openLayerModal() {
  document.getElementById("layer-modal-overlay").classList.add("open");
}

function closeLayerModal() {
  document.getElementById("layer-modal-overlay").classList.remove("open");
  document.getElementById("layer-title-input").value = "";
  selectedColour = "#7c6aff";
  document.querySelectorAll(".colour-swatch").forEach(s => s.classList.remove("selected"));
  document.querySelector(".colour-swatch").classList.add("selected");
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".colour-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".colour-swatch").forEach(s => s.classList.remove("selected"));
      swatch.classList.add("selected");
      selectedColour = swatch.dataset.colour;
    });
  });
});

async function saveLayer() {
  const title = document.getElementById("layer-title-input").value.trim() || null;
  const layer = await BNApi.post(`/portals/${portalId}/layers`, {
    title,
    colour: selectedColour,
    order: layers.length
  });

  closeLayerModal();
  await loadLayers();
  await setActiveLayer(layer);
}

// ── HIGHLIGHTING ──
function setupHighlighting() {
  const verseList = document.getElementById("verse-list");

  // Click whole verse
  verseList.addEventListener("click", async (e) => {
    if (justSelectedText) return;
    const verse = e.target.closest(".verse");
    if (!verse || !activeLayer) return;

    // If text was selected, don't also do a full verse highlight
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;

    const verseId = parseInt(verse.dataset.verseId);
    const existing = highlights.find(h => h.verse_id === verseId && h.full_verse);
    if (existing) return;

    const result = await BNApi.post(`/layers/${activeLayer.id}/highlights`, {
      verse_id: verseId,
      full_verse: true
    });

    console.log("full result:", JSON.stringify(result));

    highlights.push(result);
    applyHighlight(result);
    appendNote(result);
  });

  // Text selection
  document.addEventListener("mouseup", async (e) => {
    if (!activeLayer) return;
    const sel = window.getSelection();
    if (!sel || sel.toString().trim().length === 0) return;

    const range = sel.getRangeAt(0);
    const verseEl = range.startContainer.parentElement.closest(".verse");
    if (!verseEl) { sel.removeAllRanges(); return; }

    const verseText = verseEl.querySelector(".verse-text");
    if (!verseText) return;

    const verseId = parseInt(verseEl.dataset.verseId);
    const fullText = verseText.textContent;
    const selText = sel.toString();
    const startOffset = fullText.indexOf(selText);
    if (startOffset === -1) { sel.removeAllRanges(); return; }
    const endOffset = startOffset + selText.length;

    sel.removeAllRanges();
    justSelectedText = true;
    setTimeout(() => { justSelectedText = false; }, 100);

    const result = await BNApi.post(`/layers/${activeLayer.id}/highlights`, {
      verse_id: verseId,
      start_offset: startOffset,
      end_offset: endOffset,
      full_verse: false
    });

    highlights.push(result);
    applyHighlight(result);
    appendNote(result);
  });
}

// ── RENDER HIGHLIGHTS ──
function clearHighlightsUI() {
  document.querySelectorAll(".verse").forEach(v => {
    const textEl = v.querySelector(".verse-text");
    if (textEl) {
      textEl.innerHTML = verseTextCache[v.dataset.verseId] || textEl.textContent;
      textEl.removeAttribute("style");
    }
    v.classList.remove("highlighted");
  });
}

function applyHighlight(h) {
  console.log("cache for", h.verse_id, verseTextCache[h.verse_id]);
  const colour = activeLayer.colour;
  const verseEl = document.querySelector(`.verse[data-verse-id="${h.verse_id}"]`);
  if (!verseEl) return;
  const textEl = verseEl.querySelector(".verse-text");
  if (!textEl) return;

  if (h.full_verse) {
    textEl.style.background = colour + "44";
    textEl.style.borderRadius = "3px";
    textEl.style.padding = "0 2px";
    verseEl.classList.add("highlighted");
  } else {
    const raw = verseTextCache[h.verse_id];
    const before = raw.slice(0, h.start_offset);
    const marked = raw.slice(h.start_offset, h.end_offset);
    const after = raw.slice(h.end_offset);
    textEl.innerHTML = `${before}<mark style="background:${colour}44;border-radius:3px;padding:0 2px;color:inherit;">${marked}</mark>${after}`;
  }
}

function appendNote(h) {
  if (!h.note) return;
  const container = document.getElementById("notes-layer");
  const note = h.note;
  const colour = activeLayer.colour;

  const box = document.createElement("div");
  box.className = "note-box";
  box.id = `note-${note.id}`;
  box.style.left = note.x + "px";
  box.style.top = note.y + "px";
  box.style.borderTop = `3px solid ${colour}`;

  box.innerHTML = `
    <div class="note-box-header">
      <div class="note-colour-bar" style="background:${colour}"></div>
      <button class="note-close" onclick="deleteHighlight(${h.id})">✕</button>
    </div>
    <textarea class="note-textarea" placeholder="Add a note..."
      onblur="saveNote(${note.id}, this.value)">${note.content}</textarea>
  `;

  box.addEventListener("mousedown", () => pulseHighlight(h));
  makeDraggable(box, note.id);
  container.appendChild(box);
}

function renderHighlights() {
  if (!activeLayer) return;
  const colour = activeLayer.colour;

  highlights.forEach(h => {
    const verseEl = document.querySelector(`.verse[data-verse-id="${h.verse_id}"]`);
    if (!verseEl) return;
    const textEl = verseEl.querySelector(".verse-text");
    if (!textEl) return;

    if (h.full_verse) {
      textEl.style.background = colour + "44";
      textEl.style.borderRadius = "3px";
      textEl.style.padding = "0 2px";
      verseEl.classList.add("highlighted");
    } else {
      const raw = textEl.textContent;
      const before = raw.slice(0, h.start_offset);
      const marked = raw.slice(h.start_offset, h.end_offset);
      const after = raw.slice(h.end_offset);
      textEl.innerHTML = `${before}<mark style="background:${colour}44;border-radius:3px;padding:0 2px;color:inherit;">${marked}</mark>${after}`;
    }
  });
}

// ── RENDER NOTES ──
function clearNotesUI() {
  document.getElementById("notes-layer").innerHTML = "";
}

function renderNotes() {
  const container = document.getElementById("notes-layer");
  highlights.forEach(h => {
    if (!h.note) return;
    const note = h.note;
    const colour = activeLayer.colour;

    const box = document.createElement("div");
    box.className = "note-box";
    box.id = `note-${note.id}`;
    box.style.left = note.x + "px";
    box.style.top = note.y + "px";
    box.style.borderTop = `3px solid ${colour}`;

    box.innerHTML = `
      <div class="note-box-header">
        <div class="note-colour-bar" style="background:${colour}"></div>
        <button class="note-close" onclick="deleteHighlight(${h.id})">✕</button>
      </div>
      <textarea class="note-textarea" placeholder="Add a note..."
        onblur="saveNote(${note.id}, this.value)">${note.content}</textarea>
    `;

    box.addEventListener("mousedown", () => pulseHighlight(h));

    makeDraggable(box, note.id);
    container.appendChild(box);
  });
}

function pulseHighlight(h) {
  // Clear any existing pulses
  document.querySelectorAll(".active-highlight").forEach(el => {
    el.classList.remove("active-highlight");
  });

  const verseEl = document.querySelector(`.verse[data-verse-id="${h.verse_id}"]`);
  if (!verseEl) return;

  if (h.full_verse) {
    const textEl = verseEl.querySelector(".verse-text");
    if (textEl) {
      textEl.classList.add("active-highlight");
      setTimeout(() => textEl.classList.remove("active-highlight"), 1500);
    }
  } else {
    const mark = verseEl.querySelector("mark");
    if (mark) {
      mark.classList.add("active-highlight");
      setTimeout(() => mark.classList.remove("active-highlight"), 1500);
    }
  }
}

async function saveNote(noteId, content) {
  await BNApi.put(`/notes/${noteId}`, { content });
}

async function deleteHighlight(highlightId) {
  await BNApi.del(`/highlights/${highlightId}`);
  highlights = highlights.filter(h => h.id !== highlightId);
  clearHighlightsUI();
  clearNotesUI();
  renderHighlights();
  renderNotes();
}

// ── DRAG NOTES ──
function makeDraggable(el, noteId) {
  let startX, startY, startLeft, startTop;

  el.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") return;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(el.style.left);
    startTop = parseInt(el.style.top);

    const onMove = (e) => {
      el.style.left = (startLeft + e.clientX - startX) + "px";
      el.style.top = (startTop + e.clientY - startY) + "px";
    };

    const onUp = async () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      await BNApi.put(`/notes/${noteId}`, {
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top)
      });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

// ── SIDEBAR BEHAVIOUR ──
function setupSidebarBehaviour() {
  const sidebar = document.getElementById("sidebar");
  let timeout;

  sidebar.addEventListener("mouseenter", () => {
    clearTimeout(timeout);
    sidebar.classList.remove("dimmed");
    sidebar.classList.add("active");
  });

  sidebar.addEventListener("mouseleave", () => {
    timeout = setTimeout(() => {
      sidebar.classList.remove("active");
      sidebar.classList.add("dimmed");
    }, 1500);
  });
}

init();