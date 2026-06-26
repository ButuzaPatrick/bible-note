const API = "http://localhost:8000";
let books = [];
let portalToDelete = null

async function init() {
  books = await fetch(`${API}/books`).then(r => r.json());

  const select = document.getElementById("modal-book");
  select.innerHTML = books.map(b =>
    `<option value="${b.abbrev}" data-name="${b.book}">${b.book}</option>`
  ).join("");

  loadPortals();
}

async function loadPortals() {
  const portals = await fetch(`${API}/portals`).then(r => r.json());
  const list = document.getElementById("portal-list");

  if (portals.length === 0) {
    list.innerHTML = `<p class="empty">No portals yet.</p>`;
    return;
  }

  list.innerHTML = portals.map(p => `
    <div class="portal-card-shell">
      <div class="portal-card" onclick="openPortal(${p.id})">
        <div class="portal-card-info">
          <h3>${p.title}</h3>
          <p>${formatPassage(p)}</p>
        </div>
      </div>
      <div class="portal-card-actions">
          <button class="delete-btn" data-id="${p.id}" data-title="${p.title}" onclick="openDeleteModal(event, this)">Delete</button>
      </div>
    </div>
  `).join("");
}

function formatPassage(p) {
  let ref = `${p.book} ${p.chapter_start}`;
  if (p.verse_start) ref += `:${p.verse_start}`;
  if (p.chapter_end && p.chapter_end !== p.chapter_start) {
    ref += `–${p.chapter_end}`;
    if (p.verse_end) ref += `:${p.verse_end}`;
  } else if (p.verse_end) {
    ref += `–${p.verse_end}`;
  }
  return ref;
}

function openDeleteModal(event, btn) {
    event.stopPropagation();
    portalToDelete = btn.dataset.id;
    document.getElementById("delete-portal-name").textContent = btn.dataset.title;
    document.getElementById("delete-modal-overlay").classList.add("open");
}

function closeDeleteModal() {
    portalToDelete = null;
    document.getElementById("delete-modal-overlay").classList.remove("open");
}

async function confirmDelete() {
    if (!portalToDelete) return;
    await fetch(`${API}/portals/${portalToDelete}`, { method: "DELETE" });
    closeDeleteModal();
    loadPortals();
}

function openModal() {
  document.getElementById("modal-overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
}

async function savePortal() {
  const select = document.getElementById("modal-book");
  const abbrev = select.value;
  const bookName = select.options[select.selectedIndex].dataset.name;

  const chapterStart = parseInt(document.getElementById("modal-chapter-start").value);
  const verseStart = parseInt(document.getElementById("modal-verse-start").value) || null;
  const chapterEnd = parseInt(document.getElementById("modal-chapter-end").value) || null;
  const verseEnd = parseInt(document.getElementById("modal-verse-end").value) || null;
  let title = document.getElementById("modal-title").value || null; 

  if (!title) {
    title = formatPassage({
      book: bookName,
      chapter_start: chapterStart,
      verse_start: verseStart,
      chapter_end: chapterEnd,
      verse_end: verseEnd
    });
  }

  await fetch(`${API}/portals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      book: bookName,
      book_abbrev: abbrev,
      chapter_start: chapterStart,
      verse_start: verseStart,
      chapter_end: chapterEnd,
      verse_end: verseEnd
    })
  });

  closeModal();
  loadPortals();
}

function openPortal(id) {
  location.href = `portal_reader.html?id=${id}`;
}

init();