const params = new URLSearchParams(location.search);
const portalId = params.get("id");

let portal = null;
let layers = [];
let activeLayer = null;
let highlights = [];
let selectedColour = "#7c6aff";
let justSelectedText = false;
let verseTextCache = {};
let layerToDelete = null;
let selectionStart = null;
let isSelectionDrag = false;
let mouse_x = 0;
let mouse_y = 0;

function setPortalState(nextPortal) {
  portal = nextPortal;
  const titleEl = document.getElementById("portal-title");
  if (titleEl) {
    titleEl.textContent = portal?.title || "Loading...";
  }
}

function setLayersState(nextLayers) {
  layers = nextLayers;
  renderLayers();
}

function setActiveLayerState(nextLayer) {
  activeLayer = nextLayer;
  renderLayers();
  renderLayerContent();
}

function setHighlightsState(nextHighlights) {
  highlights = nextHighlights;
  renderHighlights();
  renderNotes();
}

function clearLayerContent() {
  clearHighlightsUI();
  clearNotesUI();
}

async function init() {
  if (!portalId) {
    BNApi.showError("Portal ID is missing");
    return;
  }

  const portalData = await BNApi.get(`/portals/${portalId}`);
  setPortalState(portalData);
  await loadVerses();
  await loadLayers();
  setupSidebarBehaviour();
  setupHighlighting();
  bindColourSwatches();
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
    clearLayerContent();
  }
  closeDeleteLayerModal();
  await loadLayers();
}

async function loadVerses() {
  const verses = await BNApi.get(`/portals/${portalId}/verses`);
  renderVerses(verses);
}

function renderVerses(verses) {
  let currentChapter = null;
  let html = "";

  for (const verse of verses) {
    if (verse.chapter !== currentChapter) {
      currentChapter = verse.chapter;
      html += `<span class="chapter-heading">${portal?.book || "Book"} --- Chapter ${verse.chapter}</span>`;
    }

    html += `
      <span class="verse" data-verse-id="${verse.id}" data-verse="${verse.verse_number}" data-chapter="${verse.chapter}">
        <span class="verse-number">${verse.verse_number}</span><span class="verse-text">${verse.text} </span>
      </span>
    `;
  }

  document.getElementById("verse-list").innerHTML = html;
  cacheVerseText();
}

function cacheVerseText() {
  document.querySelectorAll(".verse").forEach(verseEl => {
    const textEl = verseEl.querySelector(".verse-text");
    if (textEl) {
      verseTextCache[verseEl.dataset.verseId] = textEl.textContent;
    }
  });
}

async function loadLayers() {
  const nextLayers = await BNApi.get(`/portals/${portalId}/layers`);
  setLayersState(nextLayers);

  if (nextLayers.length > 0 && !activeLayer) {
    await setActiveLayer(nextLayers[0]);
  }
}

function renderLayers() {
  const list = document.getElementById("layer-list");
  list.innerHTML = layers.map(layer => `
    <div class="layer-pill ${activeLayer?.id === layer.id ? 'active' : ''}"
         onclick="setActiveLayer(${JSON.stringify(layer).replace(/"/g, '&quot;')})">
      <div class="layer-dot" style="background:${layer.colour}"></div>
      <span class="layer-pill-label">${layer.title || 'Untitled'}</span>
      <button class="layer-delete" onclick="openDeleteLayerModal(event, ${layer.id}, '${layer.title || ''}')">✕</button>
    </div>
  `).join("");
}

async function setActiveLayer(layer) {
  const nextLayer = typeof layer === "string" ? JSON.parse(layer) : layer;
  setActiveLayerState(nextLayer);
  const nextHighlights = await BNApi.get(`/layers/${nextLayer.id}/highlights`);
  setHighlightsState(nextHighlights);
}

function renderLayerContent() {
  clearLayerContent();
  if (!activeLayer) return;
  renderHighlights();
  renderNotes();
}

async function deleteLayer(event, id) {
  event.stopPropagation();
  await BNApi.del(`/layers/${id}`);
  if (activeLayer?.id === id) {
    activeLayer = null;
    clearLayerContent();
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

function bindColourSwatches() {
  document.querySelectorAll(".colour-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".colour-swatch").forEach(s => s.classList.remove("selected"));
      swatch.classList.add("selected");
      selectedColour = swatch.dataset.colour;
    });
  });
}

async function saveLayer() {
  const title = document.getElementById("layer-title-input").value.trim() || null;
  const layer = await BNApi.post(`/portals/${portalId}/layers`, {
    title,
    colour: selectedColour,
    order: layers.length
  });

  closeLayerModal();
  setLayersState([...layers, layer]);
  await setActiveLayer(layer);
}

function setupHighlighting() {
  const verseList = document.getElementById("verse-list");

  verseList.addEventListener("mousedown", (e) => {
    const verse = e.target.closest(".verse");
    if (!verse) {
      selectionStart = null;
      isSelectionDrag = false;
      return;
    }

    selectionStart = { x: e.clientX, y: e.clientY };
    isSelectionDrag = false;
  });

  document.addEventListener("mousemove", (e) => {
    if (!selectionStart) return;
    const dx = e.clientX - selectionStart.x;
    const dy = e.clientY - selectionStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isSelectionDrag = true;
    }
  });

  verseList.addEventListener("click", async (e) => {
    if (justSelectedText) return;
    const verse = e.target.closest(".verse");
    if (!verse || !activeLayer) return;

    mouse_x = e.clientX;
    mouse_y = e.clientY;

    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;

    const verseId = parseInt(verse.dataset.verseId);

    // Check if the verse is already highlighted in full; if so, do not add another highlight
    // This prevents duplicate full-verse highlights, but could be removed if you want to allow multiple highlights on the same verse
    // but that's what the layers are for!
    const existing = highlights.find(h => h.verse_id === verseId && h.full_verse);
    if (existing) return;

    const result = await BNApi.post(`/layers/${activeLayer.id}/highlights`, {
      verse_id: verseId,
      full_verse: true,
      mouse_x: mouse_x,
      mouse_y: mouse_y,
    });

    addHighlightToState(result);
  });

  document.addEventListener("mouseup", async (event) => {
    if (!activeLayer) return;

    mouse_x = event.clientX;
    mouse_y = event.clientY;

    const sel = window.getSelection();
    if (!sel || sel.toString().trim().length === 0) {
      selectionStart = null;
      isSelectionDrag = false;
      return;
    }

    if (!isSelectionDrag) {
      selectionStart = null;
      isSelectionDrag = false;
      return;
    }

    const range = sel.getRangeAt(0);
    const verseEl = range.startContainer.parentElement.closest(".verse");
    if (!verseEl) {
      sel.removeAllRanges();
      return;
    }

    const verseText = verseEl.querySelector(".verse-text");
    if (!verseText) return;

    const verseId = parseInt(verseEl.dataset.verseId);
    const fullText = verseText.textContent;
    const selText = sel.toString();
    const startOffset = fullText.indexOf(selText);
    if (startOffset === -1) {
      sel.removeAllRanges();
      return;
    }
    const endOffset = startOffset + selText.length;

    sel.removeAllRanges();
    justSelectedText = true;
    setTimeout(() => { justSelectedText = false; }, 100);

    const result = await BNApi.post(`/layers/${activeLayer.id}/highlights`, {
      verse_id: verseId,
      start_offset: startOffset,
      end_offset: endOffset,
      full_verse: false,
      mouse_x: mouse_x,
      mouse_y: mouse_y,
    });

    addHighlightToState(result);
  });
}

function addHighlightToState(highlight) {
  setHighlightsState([...highlights, highlight]);
}

function clearHighlightsUI() {
  document.querySelectorAll(".verse").forEach(verseEl => {
    const textEl = verseEl.querySelector(".verse-text");
    if (textEl) {
      textEl.innerHTML = verseTextCache[verseEl.dataset.verseId] || textEl.textContent;
      textEl.removeAttribute("style");
    }
    verseEl.classList.remove("highlighted");
  });
}

function applyHighlightToVerse(highlight) {
  const colour = activeLayer?.colour || "#7c6aff";
  const verseEl = document.querySelector(`.verse[data-verse-id="${highlight.verse_id}"]`);
  if (!verseEl) return;
  const textEl = verseEl.querySelector(".verse-text");
  if (!textEl) return;

  if (highlight.full_verse) {
    textEl.style.background = colour + "44";
    textEl.style.borderRadius = "3px";
    textEl.style.padding = "0 2px";
    verseEl.classList.add("highlighted");
    return;
  }

  const raw = verseTextCache[highlight.verse_id] || textEl.textContent;
  const before = raw.slice(0, highlight.start_offset || 0);
  const marked = raw.slice(highlight.start_offset || 0, highlight.end_offset || 0);
  const after = raw.slice(highlight.end_offset || 0);
  textEl.innerHTML = `${before}<mark style="background:${colour}44;border-radius:3px;padding:0 2px;color:inherit;">${marked}</mark>${after}`;
}

function appendNote(highlight) {
  if (!highlight.note) return;
  const container = document.getElementById("notes-layer");
  const note = highlight.note;
  const colour = activeLayer?.colour || "#7c6aff";

  const box = document.createElement("div");
  box.className = "note-box";
  box.id = `note-${note.id}`;

  const isNewNote = note.x === 100 && note.y === 100;
  if (isNewNote) {
    console.log("Rendering new note at", mouse_x, mouse_y);
    box.style.left = "50px";
    box.style.top = "100px";
  } else {
    console.log("Rendering note at", note.x, note.y);
    box.style.left = note.x + "px";
    box.style.top = note.y + "px";
  }

  box.style.borderTop = `3px solid ${colour}`;

  box.innerHTML = `
    <div class="note-box-header">
      <div class="note-colour-bar" style="background:${colour}"></div>
      <button class="note-close" onclick="deleteHighlight(${highlight.id})">✕</button>
    </div>
    <textarea class="note-textarea" placeholder="Add a note..."
      onblur="saveNote(${note.id}, this.value)">${note.content}</textarea>
  `;

  box.addEventListener("mousedown", () => pulseHighlight(highlight));
  makeDraggable(box, note.id);
  container.appendChild(box);
}

function renderHighlights() {
  if (!activeLayer) return;
  clearHighlightsUI();
  highlights.forEach(applyHighlightToVerse);
}

function clearNotesUI() {
  document.getElementById("notes-layer").innerHTML = "";
}

function renderNotes() {
  const container = document.getElementById("notes-layer");
  container.innerHTML = "";
  highlights.forEach(highlight => {
    if (!highlight.note) return;
    const note = highlight.note;
    const colour = activeLayer?.colour || "#7c6aff";

    const box = document.createElement("div");
    box.className = "note-box";
    box.id = `note-${note.id}`;
    box.style.left = note.x + "px";
    box.style.top = note.y + "px";
    box.style.borderTop = `3px solid ${colour}`;

    box.innerHTML = `
      <div class="note-box-header">
        <div class="note-colour-bar" style="background:${colour}"></div>
        <button class="note-close" onclick="deleteHighlight(${highlight.id})">✕</button>
      </div>
      <textarea class="note-textarea" placeholder="Add a note..."
        onblur="saveNote(${note.id}, this.value)">${note.content}</textarea>
    `;

    box.addEventListener("mousedown", () => pulseHighlight(highlight));
    makeDraggable(box, note.id);
    container.appendChild(box);
  });
}

function updateNoteInState(noteId, patch) {
  setHighlightsState(
    highlights.map(highlight => {
      if (highlight.note?.id !== noteId) return highlight;
      return {
        ...highlight,
        note: {
          ...highlight.note,
          ...patch
        }
      };
    })
  );
}

function pulseHighlight(highlight) {
  document.querySelectorAll(".active-highlight").forEach(el => {
    el.classList.remove("active-highlight");
  });

  const verseEl = document.querySelector(`.verse[data-verse-id="${highlight.verse_id}"]`);
  if (!verseEl) return;

  if (highlight.full_verse) {
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
  const updatedNote = await BNApi.put(`/notes/${noteId}`, { content });
  if (updatedNote) {
    updateNoteInState(noteId, updatedNote);
  }
}

async function deleteHighlight(highlightId) {
  await BNApi.del(`/highlights/${highlightId}`);
  setHighlightsState(highlights.filter(highlight => highlight.id !== highlightId));
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
      const updatedNote = await BNApi.put(`/notes/${noteId}`, {
        x: parseFloat(el.style.left),
        y: parseFloat(el.style.top)
      });
      if (updatedNote) {
        updateNoteInState(noteId, updatedNote);
      }
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