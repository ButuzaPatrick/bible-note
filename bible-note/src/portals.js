let books = [];
let portalToDelete = null
let allPortals = [];
let portalToRename = null;

async function init() {
  books = await BNApi.get('/books');
  setupBookSearch();
  loadPortals();

  document.getElementById("rename-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmRename();
    if (e.key === "Escape") closeRenameModal();
  });
}

function setupBookSearch() {
  const input = document.getElementById("modal-book-search");
  const dropdown = document.getElementById("book-dropdown");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    const matches = books.filter(b => b.book.toLowerCase().includes(q));
    renderBookDropdown(matches);
  });

  input.addEventListener("focus", () => {
    renderBookDropdown(books);
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".book-search-wrapper")) {
      dropdown.classList.remove("open");
    }
  });
}

function renderBookDropdown(filtered) {
  const dropdown = document.getElementById("book-dropdown");
  const currentAbbrev = document.getElementById("modal-book-abbrev").value;

  if (filtered.length === 0) {
    dropdown.innerHTML = `<div class="book-option" style="color:var(--text-muted)">No books found</div>`;
    dropdown.classList.add("open");
    return;
  }

  dropdown.innerHTML = filtered.map(b => `
    <div class="book-option ${b.abbrev === currentAbbrev ? 'selected' : ''}" 
         onclick="selectBook('${b.abbrev}', '${b.book}')">
      ${b.book}
    </div>
  `).join("");
  dropdown.classList.add("open");
}

function selectBook(abbrev, name) {
  document.getElementById("modal-book-abbrev").value = abbrev;
  document.getElementById("modal-book-name").value = name;
  document.getElementById("modal-book-search").value = name;
  document.getElementById("book-dropdown").classList.remove("open");
}

function openRenameModal(event, id, currentTitle) {
  event.stopPropagation();
  portalToRename = id;
  document.getElementById("rename-input").value = currentTitle;
  document.getElementById("rename-modal-overlay").classList.add("open");
  setTimeout(() => document.getElementById("rename-input").focus(), 50);
}

function closeRenameModal() {
  portalToRename = null;
  document.getElementById("rename-modal-overlay").classList.remove("open");
}

async function confirmRename() {
  if (!portalToRename) return;
  const newTitle = document.getElementById("rename-input").value.trim();
  if (!newTitle) return;

  await BNApi.put(`/portals/${portalToRename}`, { title: newTitle });
  closeRenameModal();
  loadPortals();
}

document.getElementById("rename-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmRename();
  if (e.key === "Escape") closeRenameModal();
});

function renderPortals(portals) {
  const list = document.getElementById("portal-list");

  if (portals.length === 0) {
    list.innerHTML = `<p class="empty">No portals found.</p>`;
    return;
  }

  list.innerHTML = portals.map((p, index) => `
    <div class="portal-card-shell" style="animation-delay: ${index * 60}ms">
      <div class="portal-card" onclick="openPortal(${p.id})">
        <div class="portal-card-info">
          <h3 id="portal-title-${p.id}">${p.title}</h3>
          <p>${formatPassage(p)}</p>
        </div>
      </div>
      <div class="portal-card-actions">
        <button class="delete-btn" data-id="${p.id}" data-title="${p.title}" onclick="openRenameModal(event, ${p.id}, '${p.title.replace(/'/g, "\\'")}')">✎</button>
        <button class="delete-btn" data-id="${p.id}" data-title="${p.title}" onclick="openDeleteModal(event, this)">✕</button>
      </div>
    </div>
  `).join("");
}

async function loadPortals() {
  allPortals = await BNApi.get('/portals');
  renderPortals(allPortals);
  const list = document.getElementById("portal-list");

  document.getElementById("portal-search").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allPortals.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.book.toLowerCase().includes(q)
    );
    renderPortals(filtered);
  };
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
    await BNApi.del(`/portals/${portalToDelete}`);
    closeDeleteModal();
    loadPortals();
}

function openModal() {
  document.getElementById("modal-overlay").classList.add("open");
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.getElementById("modal-book-search").value = "";
  document.getElementById("modal-book-abbrev").value = "";
  document.getElementById("modal-book-name").value = "";
  document.getElementById("modal-book-search").value = "";
  document.getElementById("modal-chapter-start").value = 1;
  document.getElementById("modal-verse-start").value = "";
  document.getElementById("modal-chapter-end").value = "";
  document.getElementById("modal-verse-end").value = "";
  document.getElementById("modal-title").value = "";
  document.getElementById("book-dropdown").classList.remove("open");
}

async function savePortal() {
  const abbrev = document.getElementById("modal-book-abbrev").value;
  const bookName = document.getElementById("modal-book-name").value;

  if (!abbrev) {
    document.getElementById("modal-book-search").focus();
    return;
  }

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

  await BNApi.post('/portals', {
    title,
    book: bookName,
    book_abbrev: abbrev,
    chapter_start: chapterStart,
    verse_start: verseStart,
    chapter_end: chapterEnd,
    verse_end: verseEnd
  });

  closeModal();
  loadPortals();
}

function openPortal(id) {
  location.href = `portal_reader.html?id=${id}`;
}

init();