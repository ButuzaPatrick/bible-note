const API = "http://localhost:8000";
let currentBook = null;
let currentChapter = null;

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
  const grid = document.getElementById("book-grid");
  grid.innerHTML = `<p class="loading">Loading...</p>`;

  const books = await fetch(`${API}/books`).then(r => r.json());
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

  const chapters = await fetch(`${API}/chapters/${currentBook.abbrev}`).then(r => r.json());
  document.getElementById("chapter-grid").innerHTML = chapters.map(c => `
    <div class="chapter-card" onclick="showReader(${c})">
      ${c}
    </div>
  `).join("");
}

// READER
async function showReader(chapter) {
  currentChapter = chapter;
  showScreen("screen-reader");
  document.getElementById("reader-title").textContent = `${currentBook.name} ${chapter}`;

  const verses = await fetch(`${API}/verses/${currentBook.abbrev}/${chapter}`).then(r => r.json());
  document.getElementById("verse-list").innerHTML = verses.map(v => `
    <span class="verse" data-verse="${v.verse_number}">
      <span class="verse-number">${v.verse_number}</span>
      <span class="verse-text">${v.text} </span>
    </span>
  `).join("");
}

showBooks();