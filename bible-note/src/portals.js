let books = [];
let portalToDelete = null
let allPortals = [];

async function init() {
  books = await BNApi.get('/books');

  const select = document.getElementById("modal-book");
  select.innerHTML = books.map(b =>
    `<option value="${b.abbrev}" data-name="${b.book}">${b.book}</option>`
  ).join("");

  loadPortals();
}

function renderPortals(portals) {
  const list = document.getElementById("portal-list");

  if (portals.length === 0) {
    list.innerHTML = `<p class="empty">No portals found.</p>`;
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