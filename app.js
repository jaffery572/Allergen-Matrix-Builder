const LS_KEY = "ab_items_v1";

const ALLERGENS = [
  "Celery",
  "Cereals containing gluten",
  "Crustaceans",
  "Eggs",
  "Fish",
  "Lupin",
  "Milk",
  "Molluscs",
  "Mustard",
  "Nuts",
  "Peanuts",
  "Sesame",
  "Soya",
  "Sulphur dioxide / sulphites"
];

const el = (id) => document.getElementById(id);

let state = {
  items: [],
  currentId: null
};

// ---- storage ----
function load() {
  try { state.items = JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { state.items = []; }
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.items));
}

// ---- views ----
function show(viewId) {
  ["viewItems","viewEditor","viewExport"].forEach(v => el(v).classList.add("hidden"));
  el(viewId).classList.remove("hidden");
}

function openItems() {
  state.currentId = null;
  show("viewItems");
  renderList();
}

function openExport() {
  show("viewExport");
  showMatrixView();     // default
  renderMatrix();
  el("qrWrap").classList.add("hidden");
  el("qrWrap").innerHTML = "";
}

function openEditor(id=null) {
  show("viewEditor");
  state.currentId = id;

  // reset form
  el("itemName").value = "";
  el("itemCat").value = "";
  el("itemIng").value = "";
  renderAllergenCheckboxes([]);

  el("btnDelete").classList.toggle("hidden", !id);
  el("editorTitle").textContent = id ? "Edit Item" : "New Item";

  if (id) {
    const it = state.items.find(x => x.id === id);
    if (!it) return openItems();
    el("itemName").value = it.name || "";
    el("itemCat").value = it.cat || "";
    el("itemIng").value = it.ingredients || "";
    renderAllergenCheckboxes(it.allergens || []);
  }
}

// ---- UI render ----
function renderList() {
  const list = el("itemsList");
  const empty = el("empty");
  list.innerHTML = "";

  if (!state.items.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  state.items.forEach(it => {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div>
        <div><b>${escapeHtml(it.name)}</b> <span class="small">${it.cat ? "• " + escapeHtml(it.cat) : ""}</span></div>
        <div class="small">${(it.allergens || []).length} allergen(s) ticked</div>
      </div>
      <div>
        <button class="btn">Edit</button>
      </div>
    `;
    div.querySelector("button").addEventListener("click", () => openEditor(it.id));
    list.appendChild(div);
  });
}

function renderAllergenCheckboxes(selected) {
  const wrap = el("allergenGrid");
  wrap.innerHTML = "";
  ALLERGENS.forEach(a => {
    const id = "al_" + a.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const div = document.createElement("label");
    div.className = "chk";
    div.innerHTML = `
      <input type="checkbox" id="${id}" ${selected.includes(a) ? "checked" : ""}/>
      <div>
        <div><b>${escapeHtml(a)}</b></div>
        <div class="small">Tick if this allergen is present in the item.</div>
      </div>
    `;
    wrap.appendChild(div);
  });
}

function getSelectedAllergens() {
  const selected = [];
  ALLERGENS.forEach(a => {
    const id = "al_" + a.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (el(id)?.checked) selected.push(a);
  });
  return selected;
}

function renderMatrix() {
  const wrap = el("matrixTableWrap");

  if (!state.items.length) {
    wrap.innerHTML = `<div class="small">No items to export yet. Add items first.</div>`;
    return;
  }

  let html = `<table><thead><tr><th>Item</th>`;
  ALLERGENS.forEach(a => html += `<th>${escapeHtml(a)}</th>`);
  html += `</tr></thead><tbody>`;

  state.items.forEach(it => {
    const set = new Set(it.allergens || []);
    html += `<tr><td><b>${escapeHtml(it.name)}</b>${it.cat ? `<div class="small">${escapeHtml(it.cat)}</div>` : ""}</td>`;
    ALLERGENS.forEach(a => {
      html += `<td class="right">${set.has(a) ? "✓" : ""}</td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}

// ---- Simple Customer View ----
function renderSimpleView(){
  const wrap = el("simpleWrap");
  const tableWrap = el("matrixTableWrap");

  if (!state.items.length){
    wrap.innerHTML = `<div class="small">No items yet.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="simple-cards">
      ${state.items.map(it => {
        const alls = (it.allergens || []);
        return `
          <div class="simple-card">
            <div><b>${escapeHtml(it.name)}</b> ${it.cat ? `<span class="badge">${escapeHtml(it.cat)}</span>` : ""}</div>
            ${it.ingredients ? `<div class="small" style="margin-top:6px;">Ingredients: ${escapeHtml(it.ingredients)}</div>` : ""}
            <div class="small" style="margin-top:8px;">Allergens:</div>
            <div class="pills">
              ${
                alls.length
                  ? alls.map(a => `<span class="pill on">${escapeHtml(a)}</span>`).join("")
                  : `<span class="pill">No allergens selected</span>`
              }
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  wrap.classList.remove("hidden");
  tableWrap.classList.add("hidden");
}

function showMatrixView(){
  el("simpleWrap").classList.add("hidden");
  el("matrixTableWrap").classList.remove("hidden");
}

// ---- actions ----
function newId() {
  return Math.random().toString(16).slice(2,8).toUpperCase() + "-" + Date.now().toString().slice(-5);
}

function saveItem() {
  const name = el("itemName").value.trim();
  if (!name) return alert("Item name is required.");

  const payload = {
    id: state.currentId || newId(),
    name,
    cat: el("itemCat").value.trim(),
    ingredients: el("itemIng").value.trim(),
    allergens: getSelectedAllergens(),
    updatedAt: Date.now()
  };

  if (state.currentId) {
    const idx = state.items.findIndex(x => x.id === state.currentId);
    state.items[idx] = { ...state.items[idx], ...payload };
  } else {
    state.items.unshift(payload);
    state.currentId = payload.id;
  }

  save();
  alert("Saved!");
  openItems();
}

function deleteItem() {
  if (!state.currentId) return;
  if (!confirm("Delete this item?")) return;
  state.items = state.items.filter(x => x.id !== state.currentId);
  save();
  openItems();
}

function resetAll() {
  if (!confirm("This will delete ALL items. Continue?")) return;
  localStorage.removeItem(LS_KEY);
  load();
  openItems();
}

function printMatrix() {
  openExport();
  setTimeout(() => window.print(), 150);
}

function generateShareLink(){
  openExport();

  const biz = (el("bizName")?.value || "").trim();

  const payload = {
    v: 1,
    biz,
    items: state.items.map(it => ({
      name: it.name,
      cat: it.cat,
      ingredients: it.ingredients,
      allergens: it.allergens || []
    }))
  };

  const json = JSON.stringify(payload);

  // URL-safe base64
  const b64url = btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+","-").replaceAll("/","_").replaceAll("=","");

  const url = new URL("customer.html", window.location.href);
  url.searchParams.set("d", b64url);

  const link = url.toString();

  const box = el("qrWrap");
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="small">Shareable customer link (works on any phone):</div>
    <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;">
      <a class="btn primary" href="${link}" target="_blank">Open Customer Page</a>
      <button class="btn" id="btnCopyLink">Copy Link</button>
    </div>
    <div class="small" style="margin-top:10px; word-break:break-all;">${link}</div>
    <div class="hint" style="margin-top:10px;">
      Tip: After GitHub Pages publish, this link becomes your real QR link.
    </div>
  `;

  setTimeout(() => {
    const btn = document.getElementById("btnCopyLink");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(link);
        alert("Link copied!");
      }catch{
        alert("Copy failed. Manually copy from the text shown.");
      }
    });
  }, 0);
}

// ---- helpers ----
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ---- wiring ----
function wire() {
  el("tabItems").addEventListener("click", openItems);
  el("tabExport").addEventListener("click", openExport);

  el("btnNew").addEventListener("click", () => openEditor(null));
  el("btnBack").addEventListener("click", openItems);
  el("btnBack2").addEventListener("click", openItems);

  el("btnSave").addEventListener("click", saveItem);
  el("btnDelete").addEventListener("click", deleteItem);

  el("btnPrint").addEventListener("click", printMatrix);

  el("btnSimple").addEventListener("click", () => {
    openExport();
    renderSimpleView();
  });

  el("btnQR").addEventListener("click", generateShareLink);
  el("btnReset").addEventListener("click", resetAll);
}

// init
load();
wire();
openItems();
