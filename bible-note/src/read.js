let currentBook = null;
let currentChapter = null;
let currentTranslation = "ESV";
const MAX_HISTORY = 7;

function setTranslation(t) {
  currentTranslation = t;
  document.querySelectorAll(".translation-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`t-${t}`).classList.add("active");
  showBooks();
}

// NAVIGATION
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function navTo(tab) {
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById(`nav-${tab}`).classList.add("active");
  if (tab === "read") showBooks();
}

// BOOKS
async function showBooks() {
  showScreen("screen-books");
  renderHistory();
  const grid = document.getElementById("book-grid");
  grid.innerHTML = `<p class="loading">Loading...</p>`;

  const books = await BNApi.get('/books', { translation: currentTranslation });
  renderBooks(books);

  document.getElementById("search-bar").oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderBooks(books.filter(b => b.book.toLowerCase().includes(q)));
  };
}

function renderBooks(books) {
  const grid = document.getElementById("book-grid");
  grid.innerHTML = books.map(b => `
    <div class="book-card" onclick="showChapters('${b.abbrev}', '${b.book}')">
      ${b.book}
    </div>
  `).join("");
}

// CHAPTERS
async function showChapters(abbrev, name) {
  if (abbrev) {
    currentBook = { abbrev, name };
  }
  showScreen("screen-chapters");
  document.getElementById("chapter-title").textContent = currentBook.name;

  const chapters = await BNApi.get(`/chapters/${currentBook.abbrev}`, { translation: currentTranslation });
  document.getElementById("chapter-grid").innerHTML = chapters.map(c => `
    <div class="chapter-card" onclick="showReader(${c})">
      ${c}
    </div>
  `).join("");
}

// READER
async function showReader(chapter) {
  currentChapter = chapter;
  saveToHistory(currentBook, chapter);
  showScreen("screen-reader");
  document.getElementById("reader-title").textContent = `${currentBook.name} ${chapter}`;

  const verses = await BNApi.get(`/verses/${currentBook.abbrev}/${chapter}`, { translation: currentTranslation });
  document.getElementById("verse-list").innerHTML = verses.map(v => `
    <span class="verse" data-verse="${v.verse_number}">
      <span class="verse-number">${v.verse_number}</span>
      <span class="verse-text">${v.text} </span>
    </span>
  `).join("");
}



function saveToHistory(book, chapter) {
  const history = getHistory();
  const entry = { abbrev: book.abbrev, name: book.name, chapter };
  const filtered = history.filter(h => !(h.abbrev === entry.abbrev && h.chapter === entry.chapter));
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem("readHistory", JSON.stringify(updated));
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("readHistory") || "[]");
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  const list = document.getElementById("history-list");

  if (history.length === 0) {
    list.innerHTML = `<p class="history-empty">Nothing yet — start reading!</p>`;
    return;
  }

  list.innerHTML = history.map(h => `
    <div class="history-item" onclick="quickOpen('${h.abbrev}', '${h.name}', ${h.chapter})">
      <span class="history-ref">${h.name} ${h.chapter}</span>
    </div>
  `).join("");
}

function quickOpen(abbrev, name, chapter) {
  currentBook = { abbrev, name };
  showReader(chapter);
}

showBooks();