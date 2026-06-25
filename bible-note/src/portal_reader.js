const API = "http://localhost:8000";
const params = new URLSearchParams(location.search);
const portalId = params.get("id");

async function init() {
  const portal = await fetch(`${API}/portals/${portalId}`).then(r => r.json());
  document.getElementById("portal-title").textContent = portal.title;

  const verses = await fetch(`${API}/portals/${portalId}/verses`).then(r => r.json());

  let currentChapter = null;
  let html = "";

  for (const v of verses) {
    if (v.chapter !== currentChapter) {
      currentChapter = v.chapter;
      html += `<span class="chapter-heading">${portal.book} --- Chapter ${v.chapter}</span>`;
    }
    html += `
      <span class="verse" data-verse="${v.verse_number}" data-chapter="${v.chapter}">
        <span class="verse-number">${v.verse_number}</span>
        <span class="verse-text">${v.text} </span>
      </span>
    `;
  }

  document.getElementById("verse-list").innerHTML = html;
}

init()