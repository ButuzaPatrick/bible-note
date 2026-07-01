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
let activeTool = null;
let isSelectionDrag = false;
let mouse_x = 0;
let mouse_y = 0;
let commentaryCache = {};
let commentaryScrollPositions = {};
let sermonsCache = {};
let sermonsScrollPositions = {};

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
  setupCommentaryScrollTracking();

  await loadToolbeltButtons();
  await prefetchCommentary();
  await prefetchSermons();
}

async function applyTheme(modId) {
  const data = await BNApi.post(`/mods/${modId}/run`, {});
  for (const [key, value] of Object.entries(data.result)) {
    document.documentElement.style.setProperty(key, value);
  }
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
      <span class="layer-pill-label" 
            oncontextmenu="startEditingLayer(event, ${layer.id}, '${(layer.title || '').replace(/'/g, "\\'")}')">
        ${layer.title || 'Untitled'}
      </span>
      <button class="layer-delete" onclick="openDeleteLayerModal(event, ${layer.id}, '${layer.title || ''}')">✕</button>
    </div>
  `).join("");
}

function startEditingLayer(event, layerId, currentTitle) {
  event.preventDefault();
  event.stopPropagation();
  const label = event.target;
  const original = currentTitle;

  label.innerHTML = `<input 
    class="layer-title-edit" 
    value="${currentTitle}" 
    onclick="event.stopPropagation()"
    onkeydown="handleLayerEditKey(event, ${layerId})"
    onblur="finishEditingLayer(event, ${layerId}, '${original}')"
  />`;

  const input = label.querySelector("input");
  input.focus();
  input.select();
}

function handleLayerEditKey(event, layerId) {
  if (event.key === "Enter") {
    event.target.blur();
  } else if (event.key === "Escape") {
    loadLayers(); // just reload to reset
  }
}

async function finishEditingLayer(event, layerId, original) {
  const newTitle = event.target.value.trim() || null;
  if (newTitle === original) {
    await loadLayers();
    return;
  }

  await BNApi.put(`/layers/${layerId}`, { title: newTitle });
  await loadLayers();

  // If this is the active layer, update it in state too
  if (activeLayer?.id === layerId) {
    activeLayer = { ...activeLayer, title: newTitle };
  }
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

  // deals with clicking a verse to highlight it
  verseList.addEventListener("click", async (e) => {
    if (justSelectedText) return;
    const verse = e.target.closest(".verse");
    if (!verse || !activeLayer) return;

    // note position! this is what we pass to the backend to process
    mouse_x = e.clientX;
    mouse_y = e.clientY + document.getElementById("app").scrollTop;

    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;

    const verseId = parseInt(verse.dataset.verseId);

    // Check if the verse is already highlighted in full; if so, do not add another highlight
    // This prevents duplicate full-verse highlights, but could be removed if you want to allow multiple highlights on the same verse
    // but that's what the layers are for!
    // const existing = highlights.find(h => h.verse_id === verseId && h.full_verse);
    // if (existing) return;

    const result = await BNApi.post(`/layers/${activeLayer.id}/highlights`, {
      verse_id: verseId,
      full_verse: true,
      mouse_x: mouse_x,
      mouse_y: mouse_y,
    });

    addHighlightToState(result);
  });

  // deals with dragging selection to highlight a verse
  document.addEventListener("mouseup", async (event) => {
    if (!activeLayer) return;

    mouse_x = event.clientX;
    mouse_y = event.clientY + document.getElementById("app").scrollTop;

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

  // Always rebuild from the clean cached text with ALL partial highlights for this verse
  rebuildPartialHighlights(highlight.verse_id);
}

function rebuildPartialHighlights(verseId) {
  const colour = activeLayer?.colour || "#7c6aff";
  const verseEl = document.querySelector(`.verse[data-verse-id="${verseId}"]`);
  if (!verseEl) return;
  const textEl = verseEl.querySelector(".verse-text");
  if (!textEl) return;

  const raw = verseTextCache[verseId];
  if (!raw) return;

  // Get all partial highlights for this verse, sorted by start offset
  const partials = highlights
    .filter(h => h.verse_id === verseId && !h.full_verse && h.start_offset != null)
    .sort((a, b) => a.start_offset - b.start_offset);

  if (partials.length === 0) {
    textEl.innerHTML = raw;
    return;
  }

  // Build the HTML by walking through the raw text and inserting marks
  let result = "";
  let cursor = 0;

  for (const h of partials) {
    const start = h.start_offset;
    const end = h.end_offset;
    if (start < cursor) continue; // skip overlapping highlights
    result += raw.slice(cursor, start);
    result += `<mark style="background:${colour}44;border-radius:3px;padding:0 2px;color:inherit;">${raw.slice(start, end)}</mark>`;
    cursor = end;
  }

  result += raw.slice(cursor);
  textEl.innerHTML = result;
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
    <div class="note-resize-handle"></div>
  `;

  box.addEventListener("mousedown", () => pulseHighlight(highlight));
  makeDraggable(box, note.id);
  makeResizable(box, note.id);
  container.appendChild(box);
}

function renderHighlights() {
  if (!activeLayer) return;
  clearHighlightsUI();
  
  // Apply full verse highlights first
  highlights.forEach(h => {
    if (h.full_verse) applyHighlightToVerse(h);
  });

  // Then rebuild all partial highlights per verse in one pass
  const partialVerseIds = [...new Set(
    highlights.filter(h => !h.full_verse).map(h => h.verse_id)
  )];
  partialVerseIds.forEach(rebuildPartialHighlights);
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
    box.style.width = (note.width || 300) + "px";
    box.style.height = (note.height || 120) + "px";
    box.style.borderTop = `3px solid ${colour}`;

    box.innerHTML = `
      <div class="note-box-header">
        <div class="note-colour-bar" style="background:${colour}"></div>
        <button class="note-close" onclick="deleteHighlight(${highlight.id})">✕</button>
      </div>
      <textarea class="note-textarea" placeholder="Add a note..."
        onblur="saveNote(${note.id}, this.value)">${note.content}</textarea>
      <div class="note-resize-handle"></div>
    `;

    box.addEventListener("mousedown", () => pulseHighlight(highlight));
    makeDraggable(box, note.id);
    makeResizable(box, note.id);
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
    // Find which index this highlight is among all partials for this verse
    // sorted the same way as rebuildPartialHighlights
    const partials = highlights
      .filter(h => h.verse_id === highlight.verse_id && !h.full_verse && h.start_offset != null)
      .sort((a, b) => a.start_offset - b.start_offset);

    // After merging, find which merged group this highlight falls into
    const merged = [];
    let current = { start: partials[0].start_offset, end: partials[0].end_offset, index: 0 };

    for (let i = 1; i < partials.length; i++) {
      const h = partials[i];
      if (h.start_offset <= current.end) {
        current.end = Math.max(current.end, h.end_offset);
      } else {
        merged.push(current);
        current = { start: h.start_offset, end: h.end_offset, index: merged.length };
      }
    }
    merged.push(current);

    // Find which merged group contains this highlight's start offset
    const groupIndex = merged.findIndex(g =>
      highlight.start_offset >= g.start && highlight.start_offset < g.end
    );

    const marks = verseEl.querySelectorAll("mark");
    const mark = marks[groupIndex >= 0 ? groupIndex : 0];

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

function makeResizable(el, noteId) {
  const handle = el.querySelector(".note-resize-handle");
  if (!handle) return;

  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = el.offsetWidth;
    const startHeight = el.offsetHeight;

    const onMove = (e) => {
      const newWidth = Math.min(Math.max(startWidth + (e.clientX - startX), 180), 500);
      const newHeight = Math.min(Math.max(startHeight + (e.clientY - startY), 100), 500);
      el.style.width = newWidth + "px";
      el.style.height = newHeight + "px";
    };

    const onUp = async () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      await BNApi.put(`/notes/${noteId}`, {
        width: el.offsetWidth,
        height: el.offsetHeight
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

// TOOLBELT

async function toggleTool(tool) {
  if (activeTool === tool) {
    closeTool();
    return;
  }

  activeTool = tool;
  document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tool-btn[data-tool="${tool}"]`).classList.add("active");

  document.getElementById("tool-panel-title").textContent = "Loading...";
  document.getElementById("tool-panel-content").innerHTML = `<p>Loading...</p>`;
  document.getElementById("tool-panel").classList.add("open");

  if (tool === "commentary") {
    await loadCommentary();
  } else if (tool === "sermons") {
    await loadSermons();
  } else if (tool === "search") {
    await loadSearch();
  } else if (tool.startsWith("mod-")) {
    const modId = tool.replace("mod-", "");
    await loadModPanel(modId);
  }
}

async function loadModPanel(modId) {
  const contentEl = document.getElementById("tool-panel-content");
  
  const mods = await BNApi.get('/mods');
  const mod = mods.find(m => m.id === modId);
  document.getElementById("tool-panel-title").textContent = mod?.description || modId;

  const book = portal?.book_abbrev || "";
  const chapter = portal?.chapter_start || "";

  console.log("Loading mod panel with book:", book, "chapter:", chapter);

  contentEl.innerHTML = `<iframe src="${BNApi.baseUrl}/mods/${modId}/panel?book=${book}&chapter=${chapter}" style="width:100%;height:100%;border:none;"></iframe>`;
}

function closeTool() {
  activeTool = null;
  document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tool-panel").classList.remove("open");
}

async function prefetchCommentary() {
  if (!portal) return;
  const chapter = portal.chapter_start;
  const cacheKey = `${portal.book_abbrev}-${chapter}`;
  if (commentaryCache[cacheKey]) return;

  const data = await BNApi.get(`/commentary/${portal.book}/${chapter}`);
  commentaryCache[cacheKey] = data;
}

async function prefetchSermons() {
  if (!portal) return;
  const chapter = portal.chapter_start;
  const cacheKey = `${portal.book_abbrev}-${chapter}`;
  if (sermonsCache[cacheKey]) return;

  const data = await BNApi.get(`/sermons/${portal.book_abbrev}/${chapter}`);
  sermonsCache[cacheKey] = data.videos;
}

async function loadCommentary() {
  if (!portal) return;
  const chapter = portal.chapter_start;
  const cacheKey = `${portal.book_abbrev}-${chapter}`;

  const contentEl = document.getElementById("tool-panel-content");

  if (commentaryCache[cacheKey]) {
    document.getElementById("tool-panel-title").textContent = `The Enduring Word - ${commentaryCache[cacheKey].book} ${chapter}`;
    contentEl.innerHTML = `<p>${commentaryCache[cacheKey].content}</p>`;
    contentEl.scrollTop = commentaryScrollPositions[cacheKey] || 0;
    return;
  }

  document.getElementById("tool-panel-title").textContent = "Loading...";
  contentEl.innerHTML = `<p>Loading...</p>`;

  const data = await BNApi.get(`/commentary/${portal.book}/${chapter}`);
  commentaryCache[cacheKey] = data;

  document.getElementById("tool-panel-title").textContent = `The Enduring Word - ${data.book} ${chapter}`;
  contentEl.innerHTML = `<p>${data.content}</p>`;
}

async function loadSermons() {
  if (!portal) return;
  const chapter = portal.chapter_start;
  const cacheKey = `${portal.book_abbrev}-${chapter}`;

  const contentEl = document.getElementById("tool-panel-content");

  if (sermonsCache[cacheKey]) {
    document.getElementById("tool-panel-title").textContent = `Sermons - ${portal.book} ${chapter}`;
    contentEl.innerHTML = renderSermonsHtml(sermonsCache[cacheKey]);
    contentEl.scrollTop = sermonsScrollPositions[cacheKey] || 0;
    return;
  }

  document.getElementById("tool-panel-title").textContent = "Loading...";
  contentEl.innerHTML = `<p>Loading...</p>`;

  const data = await BNApi.get(`/sermons/${portal.book_abbrev}/${chapter}`);
  sermonsCache[cacheKey] = data.videos;

  document.getElementById("tool-panel-title").textContent = `Sermons - ${portal.book} ${chapter}`;

  if (data.videos.length === 0) {
    contentEl.innerHTML = `<p>No sermons found for this chapter.</p>`;
    return;
  }

  contentEl.innerHTML = renderSermonsHtml(data.videos);
}

function renderSermonsHtml(videos) {
  return videos.map(v => `
    <div class="sermon-item">
      <h4>${v.title}</h4>
      <p class="sermon-meta">${v.channel} • ${v.duration || ""}</p>
      ${v.embed_html}
    </div>
  `).join("");
}

function setupSermonsScrollTracking() {
  const contentEl = document.getElementById("tool-panel-content");
  contentEl.addEventListener("scroll", () => {
    if (!portal || activeTool !== "sermons") return;
    const cacheKey = `${portal.book_abbrev}-${portal.chapter_start}`;
    sermonsScrollPositions[cacheKey] = contentEl.scrollTop;
  });
}

function setupCommentaryScrollTracking() {
  const contentEl = document.getElementById("tool-panel-content");
  contentEl.addEventListener("scroll", () => {
    if (!portal) return;
    const cacheKey = `${portal.book_abbrev}-${portal.chapter_start}`;
    commentaryScrollPositions[cacheKey] = contentEl.scrollTop;
  });
}

async function loadSearch() {
  const contentEl = document.getElementById("tool-panel-content");
  document.getElementById("tool-panel-title").textContent = "Search";

  contentEl.innerHTML = `
    <input id="panel-search-input" type="text" placeholder="Search verses and notes..." autofocus />
    <div id="panel-search-results"><p class="empty">Type something to search.</p></div>
  `;

  const input = document.getElementById("panel-search-input");
  let searchTimeout = null;

  input.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const query = input.value.trim();
    const resultsEl = document.getElementById("panel-search-results");

    if (query.length === 0) {
      resultsEl.innerHTML = `<p class="empty">Type something to search.</p>`;
      return;
    }

    searchTimeout = setTimeout(() => runPanelSearch(query), 300);
  });
}

async function runPanelSearch(query) {
  const resultsEl = document.getElementById("panel-search-results");
  resultsEl.innerHTML = `<p class="empty">Searching...</p>`;

  const data = await BNApi.get(`/search/${encodeURIComponent(query)}`);

  if (data.verses.length === 0 && data.notes.length === 0) {
    resultsEl.innerHTML = `<p class="empty">No results found for "${query}".</p>`;
    return;
  }

  let html = "";

  if (data.notes.length > 0) {
    html += `<h4 class="results-heading">Notes (${data.notes.length})</h4>`;
    html += data.notes.map(n => `
      <div class="result-card" onclick="goToSearchResult('${n.verse.book_abbrev}', ${n.verse.chapter})">

        <span class="result-ref">
          ${n.verse.book} ${n.verse.chapter}:${n.verse.verse_number}

          ${n.layer_title ? `<span class="layer-title">${n.layer_title}</span>` : ""}
        </span>

        <p class="result-text">${highlightMatch(n.content, query)}</p>
        <p class="result-meta">Note on: ${n.verse.text}</p>

      </div>
    `).join("");
  }



  if (data.verses.length > 0) {
    html += `<h4 class="results-heading">Verses (${data.verses.length})</h4>`;
    html += data.verses.map(v => `
      <div class="result-card" onclick="goToSearchResult('${v.book_abbrev}', ${v.chapter})">
        <span class="result-ref">${v.book} ${v.chapter}:${v.verse_number}</span>
        <p class="result-text">${highlightMatch(v.text, query)}</p>
      </div>
    `).join("");
  }

  resultsEl.innerHTML = html;
}

function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, "ig");
  return text.replace(regex, `<mark>$1</mark>`);
}

// CURRENTLY DOES NOT REDIRECT PROPERLY TO PASSAGE, BETTER TO HAVE A POP-UP?
function goToSearchResult(bookAbbrev, chapter) {
  location.href = `read.html?book=${bookAbbrev}&chapter=${chapter}`;
}

async function loadToolbeltButtons() {
  const container = document.getElementById("toolbelt-buttons");

  // Built-in tools stay as-is
  let html = `
    <button class="tool-btn" data-tool="commentary" onclick="toggleTool('commentary')">Commentary</button>
    <button class="tool-btn" data-tool="sermons" onclick="toggleTool('sermons')">Sermons</button>
    <button class="tool-btn" data-tool="search" onclick="toggleTool('search')">Search</button>
  `;

  const mods = await BNApi.get('/mods');
  const panelMods = mods.filter(m => m.type === "panel");

  html += panelMods.map(m => `
    <button class="tool-btn" data-tool="mod-${m.id}" onclick="toggleTool('mod-${m.id}')">${m.name}</button>
  `).join("");

  container.innerHTML = html;
}

init();