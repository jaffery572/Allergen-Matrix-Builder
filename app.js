// =========================
// Storage keys
// =========================
const LS_DB = "ab_db_v2";
const LS_ACTIVE_TAKEAWAY = "ab_active_tw_v2";

const LS_PIN_ENABLED = "ab_pin_enabled_v1";
const LS_PIN_VALUE = "ab_pin_value_v1";
const LS_PIN_UNLOCKED = "ab_pin_unlocked_v1";

// =========================
// Allergens
// =========================
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
  db: { v:2, takeaways: [] },
  activeId: null,
  currentItemId: null,
  search: "",
  sortBy: "newest",
};

// =========================
// PIN Lock (optional)
// =========================
function pinEnabled(){ return localStorage.getItem(LS_PIN_ENABLED) === "1"; }
function pinValue(){ return localStorage.getItem(LS_PIN_VALUE) || ""; }
function setPinEnabled(v){
  localStorage.setItem(LS_PIN_ENABLED, v ? "1" : "0");
  if (!v) localStorage.removeItem(LS_PIN_UNLOCKED);
}
function setUnlocked(){ localStorage.setItem(LS_PIN_UNLOCKED, "1"); }
function isUnlocked(){ return localStorage.getItem(LS_PIN_UNLOCKED) === "1"; }

function requirePinIfEnabled(){
  if (!pinEnabled()) return;
  if (isUnlocked()) return;

  const saved = pinValue();
  if (!saved) return;

  for (let tries = 0; tries < 5; tries++){
    const entered = prompt("Owner PIN required:");
    if (entered === null) return;
    if (String(entered).trim() === saved){
      setUnlocked();
      return;
    }
    alert("Wrong PIN. Try again.");
  }
  alert("Too many wrong attempts. Refresh and try again.");
}

// =========================
// Helpers
// =========================
function newId() {
  return Math.random().toString(16).slice(2,8).toUpperCase() + "-" + Date.now().toString().slice(-5);
}
function normalizeKey(s){
  return String(s||"").trim().toLowerCase().replace(/\s+/g," ");
}
function normalizeItem(it){
  return {
    id: it.id || newId(),
    name: String(it.name||"").trim(),
    cat: String(it.cat||"").trim(),
    ingredients: String(it.ingredients||"").trim(),
    allergens: Array.isArray(it.allergens) ? it.allergens : [],
    updatedAt: it.updatedAt || Date.now()
  };
}
function newTakeaway(name){
  return {
    id: newId(),
    name: String(name||"Takeaway").trim() || "Takeaway",
    biz: "",
    items: [],
    updatedAt: Date.now()
  };
}
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function downloadBlob(text, filename, mime){
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function csvEscape(value){
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"','""')}"`;
  return s;
}

// CSV parser (quotes supported)
function parseCsv(text){
  const rows = [];
  let row = [], cur = "", inQuotes = false;

  for (let i=0; i<text.length; i++){
    const ch = text[i], next = text[i+1];

    if (inQuotes){
      if (ch === '"' && next === '"'){ cur += '"'; i++; continue; }
      if (ch === '"'){ inQuotes = false; continue; }
      cur += ch; continue;
    }

    if (ch === '"'){ inQuotes = true; continue; }
    if (ch === ","){ row.push(cur); cur=""; continue; }
    if (ch === "\n"){
      row.push(cur); cur="";
      if (row.some(c => String(c).trim() !== "")) rows.push(row);
      row=[]; continue;
    }
    if (ch === "\r") continue;
    cur += ch;
  }
  row.push(cur);
  if (row.some(c => String(c).trim() !== "")) rows.push(row);
  return rows;
}

function parseAllergensList(s){
  if (!s) return [];
  const parts = String(s).split(/;|\|/).map(x => x.trim()).filter(Boolean);
  const canon = new Map(ALLERGENS.map(a => [normalizeKey(a), a]));
  const out = [];
  for (const p of parts){
    const key = normalizeKey(p);
    if (canon.has(key)) out.push(canon.get(key));
  }
  return [...new Set(out)];
}

// =========================
// DB
// =========================
function loadDB(){
  try{
    state.db = JSON.parse(localStorage.getItem(LS_DB) || "");
  }catch{
    state.db = { v:2, takeaways: [] };
  }
  if (!state.db || !Array.isArray(state.db.takeaways)) state.db = { v:2, takeaways: [] };

  if (state.db.takeaways.length === 0){
    const t = newTakeaway("Default Takeaway");
    state.db.takeaways.push(t);
    state.activeId = t.id;
    saveDB();
  }

  const savedActive = localStorage.getItem(LS_ACTIVE_TAKEAWAY);
  state.activeId = savedActive && state.db.takeaways.some(t => t.id === savedActive)
    ? savedActive
    : state.db.takeaways[0].id;

  localStorage.setItem(LS_ACTIVE_TAKEAWAY, state.activeId);
}
function saveDB(){ localStorage.setItem(LS_DB, JSON.stringify(state.db)); }

function activeTakeaway(){
  return state.db.takeaways.find(t => t.id === state.activeId) || state.db.takeaways[0];
}
function setActiveTakeaway(id){
  state.activeId = id;
  localStorage.setItem(LS_ACTIVE_TAKEAWAY, id);
  state.currentItemId = null;
}

// =========================
// Views
// =========================
function show(viewId) {
  ["viewItems","viewEditor","viewExport"].forEach(v => el(v).classList.add("hidden"));
  el(viewId).classList.remove("hidden");
}
function openItems(){
  state.currentItemId = null;
  show("viewItems");
  renderList();
  updateMetaBar();
}
function openExport(){
  show("viewExport");
  const tw = activeTakeaway();
  el("bizName").value = tw.biz || "";
  showMatrixView();
  renderMatrix();
  el("qrWrap").classList.add("hidden");
  el("qrWrap").innerHTML = "";
  refreshPinStatus();
  updateMetaBar();
}
function openEditor(id=null){
  show("viewEditor");
  state.currentItemId = id;

  el("itemName").value = "";
  el("itemCat").value = "";
  el("itemIng").value = "";
  renderAllergenCheckboxes([]);

  el("btnDelete").classList.toggle("hidden", !id);
  el("editorTitle").textContent = id ? "Edit Item" : "New Item";

  const tw = activeTakeaway();
  if (id){
    const it = (tw.items || []).find(x => x.id === id);
    if (!it) return openItems();
    el("itemName").value = it.name || "";
    el("itemCat").value = it.cat || "";
    el("itemIng").value = it.ingredients || "";
    renderAllergenCheckboxes(it.allergens || []);
  }
  updateMetaBar();
}

// =========================
// Takeaway UI
// =========================
function renderTakeawaySelect(){
  const sel = el("takeawaySelect");
  sel.innerHTML = "";
  state.db.takeaways.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    if (t.id === state.activeId) opt.selected = true;
    sel.appendChild(opt);
  });
  updateMetaBar();
}
function updateMetaBar(){
  const tw = activeTakeaway();
  el("takeawayMeta").textContent =
    `Selected: ${tw.name} • Items: ${(tw.items||[]).length} • Last update: ${new Date(tw.updatedAt||Date.now()).toLocaleString()}`;
}
function createTakeaway(){
  const name = prompt("New takeaway name:");
  if (name === null) return;
  const t = newTakeaway(name);
  state.db.takeaways.unshift(t);
  setActiveTakeaway(t.id);
  saveDB();
  renderTakeawaySelect();
  openItems();
}
function renameTakeaway(){
  const tw = activeTakeaway();
  const name = prompt("Rename takeaway:", tw.name);
  if (name === null) return;
  tw.name = String(name).trim() || tw.name;
  tw.updatedAt = Date.now();
  saveDB();
  renderTakeawaySelect();
  updateMetaBar();
}
function deleteTakeaway(){
  if (state.db.takeaways.length <= 1){
    alert("You must keep at least 1 takeaway.");
    return;
  }
  const tw = activeTakeaway();
  if (!confirm(`Delete takeaway "${tw.name}" and all its items?`)) return;

  state.db.takeaways = state.db.takeaways.filter(t => t.id !== tw.id);
  setActiveTakeaway(state.db.takeaways[0].id);
  saveDB();
  renderTakeawaySelect();
  openItems();
}
function resetThisTakeaway(){
  const tw = activeTakeaway();
  if (!confirm(`Reset ONLY "${tw.name}" items?`)) return;
  tw.items = [];
  tw.biz = "";
  tw.updatedAt = Date.now();
  saveDB();
  alert("Takeaway reset done.");
  openItems();
}

// =========================
// Item UI render
// =========================
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
function renderList(){
  const tw = activeTakeaway();
  const itemsAll = tw.items || [];

  const list = el("itemsList");
  const empty = el("empty");
  list.innerHTML = "";

  const q = (state.search || "").trim().toLowerCase();
  let items = [...itemsAll];

  if (q) {
    items = items.filter(it =>
      (it.name || "").toLowerCase().includes(q) ||
      (it.cat || "").toLowerCase().includes(q)
    );
  }

  if (state.sortBy === "az") items.sort((a,b) => (a.name||"").localeCompare(b.name||""));
  else if (state.sortBy === "za") items.sort((a,b) => (b.name||"").localeCompare(a.name||""));
  else items.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));

  if (!items.length) { empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");

  items.forEach(it => {
    const div = document.createElement("div");
    div.className = "item-card";
    div.innerHTML = `
      <div>
        <div><b>${escapeHtml(it.name)}</b> <span class="small">${it.cat ? "• " + escapeHtml(it.cat) : ""}</span></div>
        <div class="small">${(it.allergens || []).length} allergen(s) ticked</div>
      </div>
      <div><button class="btn">Edit</button></div>
    `;
    div.querySelector("button").addEventListener("click", () => openEditor(it.id));
    list.appendChild(div);
  });

  updateMetaBar();
}

// =========================
// Save/Delete item
// =========================
function saveItem(){
  const name = el("itemName").value.trim();
  if (!name) return alert("Item name is required.");

  const tw = activeTakeaway();
  const payload = {
    id: state.currentItemId || newId(),
    name,
    cat: el("itemCat").value.trim(),
    ingredients: el("itemIng").value.trim(),
    allergens: getSelectedAllergens(),
    updatedAt: Date.now()
  };

  if (state.currentItemId){
    const idx = tw.items.findIndex(x => x.id === state.currentItemId);
    if (idx >= 0) tw.items[idx] = { ...tw.items[idx], ...payload };
  } else {
    tw.items.unshift(payload);
    state.currentItemId = payload.id;
  }

  tw.updatedAt = Date.now();
  saveDB();
  alert("Saved!");
  openItems();
}
function deleteItem(){
  if (!state.currentItemId) return;
  const tw = activeTakeaway();
  if (!confirm("Delete this item?")) return;
  tw.items = (tw.items || []).filter(x => x.id !== state.currentItemId);
  tw.updatedAt = Date.now();
  saveDB();
  openItems();
}

// =========================
// Export views
// =========================
function renderMatrix(){
  const tw = activeTakeaway();
  const items = tw.items || [];

  const wrap = el("matrixTableWrap");
  if (!items.length){
    wrap.innerHTML = `<div class="small">No items to export yet. Add items first.</div>`;
    return;
  }

  let html = `<table><thead><tr><th>Item</th>`;
  ALLERGENS.forEach(a => html += `<th>${escapeHtml(a)}</th>`);
  html += `</tr></thead><tbody>`;

  items.forEach(it => {
    const set = new Set(it.allergens || []);
    html += `<tr><td><b>${escapeHtml(it.name)}</b>${it.cat ? `<div class="small">${escapeHtml(it.cat)}</div>` : ""}</td>`;
    ALLERGENS.forEach(a => html += `<td class="right">${set.has(a) ? "✓" : ""}</td>`);
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  wrap.innerHTML = html;
}
function renderSimpleView(){
  const tw = activeTakeaway();
  const items = tw.items || [];

  const wrap = el("simpleWrap");
  const tableWrap = el("matrixTableWrap");

  if (!items.length){
    wrap.innerHTML = `<div class="small">No items yet.</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="simple-cards">
      ${items.map(it => {
        const alls = (it.allergens || []);
        return `
          <div class="simple-card">
            <div><b>${escapeHtml(it.name)}</b> ${it.cat ? `<span class="badge">${escapeHtml(it.cat)}</span>` : ""}</div>
            ${it.ingredients ? `<div class="small" style="margin-top:6px;">Ingredients: ${escapeHtml(it.ingredients)}</div>` : ""}
            <div class="small" style="margin-top:8px;">Allergens:</div>
            <div class="pills">
              ${alls.length ? alls.map(a => `<span class="pill on">${escapeHtml(a)}</span>`).join("") : `<span class="pill">No allergens selected</span>`}
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
function printMatrix(){
  openExport();
  setTimeout(() => window.print(), 150);
}

// =========================
// Share link builder (per takeaway)
// =========================
function buildCustomerLinkForTakeaway(tw){
  const payload = {
    v: 1,
    biz: tw.biz || tw.name,
    items: (tw.items || []).map(it => ({
      name: it.name,
      cat: it.cat,
      ingredients: it.ingredients,
      allergens: it.allergens || []
    }))
  };
  const json = JSON.stringify(payload);
  const b64url = btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+","-").replaceAll("/","_").replaceAll("=","");

  const url = new URL("customer.html", window.location.href);
  url.searchParams.set("d", b64url);
  return url.toString();
}

// =========================
// Share link + QR (selected takeaway)
// =========================
function generateShareLink(){
  openExport();
  const tw = activeTakeaway();

  tw.biz = (el("bizName").value || "").trim();
  tw.updatedAt = Date.now();
  saveDB();

  const link = buildCustomerLinkForTakeaway(tw);

  const box = el("qrWrap");
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="small">Shareable customer link (works on any phone):</div>
    <div style="margin-top:8px; display:flex; gap:10px; flex-wrap:wrap;">
      <a class="btn primary" href="${link}" target="_blank">Open Customer Page</a>
      <button class="btn" id="btnCopyLink">Copy Link</button>
      <button class="btn" id="btnMakeQR">Generate QR Image</button>
      <button class="btn" id="btnDownloadQR" disabled>Download QR PNG</button>
    </div>
    <div class="small" style="margin-top:10px; word-break:break-all;">${link}</div>
    <div id="qrCanvasWrap" style="margin-top:12px;"></div>
  `;

  setTimeout(() => {
    document.getElementById("btnCopyLink")?.addEventListener("click", async () => {
      try{ await navigator.clipboard.writeText(link); alert("Link copied!"); }
      catch{ alert("Copy failed. Manually copy from the text shown."); }
    });

    const btnQR = document.getElementById("btnMakeQR");
    const btnDL = document.getElementById("btnDownloadQR");
    const wrap = document.getElementById("qrCanvasWrap");

    function makeQrImage(){
      const imgUrl = "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" + encodeURIComponent(link);
      wrap.innerHTML = `<div class="small">QR Preview:</div><img class="qr-img" alt="QR Code" src="${imgUrl}" />`;
      btnDL.disabled = false;
      btnDL.onclick = () => {
        const a = document.createElement("a");
        a.href = imgUrl;
        a.download = "allergen-qr.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
    }
    btnQR?.addEventListener("click", makeQrImage);
  }, 0);
}

// =========================
// ✅ QR SHEET (ALL TAKEAWAYS)
// =========================
function openQrSheetAllTakeaways(){
  // ensure selected takeaway biz is saved (nice)
  const current = activeTakeaway();
  if (el("bizName")) {
    current.biz = (el("bizName").value || "").trim();
    current.updatedAt = Date.now();
    saveDB();
  }

  const takeaways = [...state.db.takeaways]
    .sort((a,b) => (a.name||"").localeCompare(b.name||""));

  const rowsHtml = takeaways.map((tw) => {
    const link = buildCustomerLinkForTakeaway(tw);
    const qr = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(link);
    const displayName = escapeHtml(tw.biz || tw.name);
    const safeLinkText = escapeHtml(link);

    return `
      <div class="qcard">
        <div class="qname">${displayName}</div>
        <div class="qmeta">${(tw.items||[]).length} items</div>
        <img class="qimg" src="${qr}" alt="QR" />
        <a class="qlink" href="${link}" target="_blank">Open Link</a>
        <div class="qurl">${safeLinkText}</div>
      </div>
    `;
  }).join("");

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>QR Sheet - All Takeaways</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;margin:0;background:#fff;color:#111}
    .top{position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;padding:12px 14px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
    .btn{border:1px solid #111;background:#111;color:#fff;padding:10px 12px;border-radius:10px;cursor:pointer}
    .btn.secondary{background:#fff;color:#111}
    .wrap{padding:14px}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    @media(max-width:1000px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:650px){.grid{grid-template-columns:1fr}}
    .qcard{border:1px solid #ddd;border-radius:14px;padding:12px}
    .qname{font-weight:800;font-size:14px}
    .qmeta{color:#666;font-size:12px;margin-top:2px}
    .qimg{width:220px;height:220px;max-width:100%;margin-top:10px;border:1px solid #eee;border-radius:12px}
    .qlink{display:inline-block;margin-top:10px;text-decoration:none;color:#0b57d0;font-weight:700}
    .qurl{margin-top:8px;font-size:11px;color:#444;word-break:break-all}
    @media print{
      .top{display:none}
      .wrap{padding:0}
      .qcard{break-inside:avoid}
      .qurl{font-size:10px}
    }
  </style>
</head>
<body>
  <div class="top">
    <button class="btn" onclick="window.print()">Print / Save PDF</button>
    <button class="btn secondary" onclick="location.reload()">Reload</button>
    <div style="color:#444;font-size:12px;">QR Sheet • Total: ${takeaways.length}</div>
  </div>
  <div class="wrap">
    <div class="grid">
      ${rowsHtml}
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) {
    alert("Popup blocked. Allow popups and try again.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// =========================
// CSV (selected takeaway)
// =========================
function downloadCsvTemplate(){
  const header = ["name","category","ingredients","allergens"].join(",");
  const example1 = ["Chicken Burger","Burgers","Chicken; bun; mayo","Eggs; Milk; Cereals containing gluten"].map(csvEscape).join(",");
  const example2 = ["Fish & Chips","Mains","Fish; potatoes","Fish"].map(csvEscape).join(",");
  downloadBlob([header, example1, example2].join("\n"), "allergen-template.csv", "text/csv;charset=utf-8");
}
function exportItemsCsv(){
  const tw = activeTakeaway();
  const header = ["name","category","ingredients","allergens"].join(",");
  const rows = (tw.items||[]).map(it => {
    const allergens = (it.allergens || []).join("; ");
    return [it.name||"", it.cat||"", it.ingredients||"", allergens].map(csvEscape).join(",");
  });
  const safeName = (tw.name || "takeaway").replace(/[^a-z0-9]+/gi,"-").toLowerCase();
  downloadBlob([header, ...rows].join("\n"), `${safeName}-items.csv`, "text/csv;charset=utf-8");
}
function importCsvFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const tw = activeTakeaway();
      const text = String(reader.result || "");
      const rows = parseCsv(text);
      if (!rows.length) return alert("CSV empty.");

      const header = rows[0].map(h => String(h||"").trim().toLowerCase());
      const idxName = header.indexOf("name");
      const idxCat  = header.indexOf("category");
      const idxIng  = header.indexOf("ingredients");
      const idxAll  = header.indexOf("allergens");
      if (idxName === -1) return alert("CSV must include column: name");

      const byName = new Map((tw.items||[]).map(it => [normalizeKey(it.name), it]));
      let created=0, updated=0, skipped=0;

      for (let r=1; r<rows.length; r++){
        const cols = rows[r];
        const name = String(cols[idxName] ?? "").trim();
        if (!name){ skipped++; continue; }

        const cat = idxCat >= 0 ? String(cols[idxCat] ?? "").trim() : "";
        const ing = idxIng >= 0 ? String(cols[idxIng] ?? "").trim() : "";
        const allsRaw = idxAll >= 0 ? String(cols[idxAll] ?? "").trim() : "";
        const allergens = parseAllergensList(allsRaw);

        const key = normalizeKey(name);
        const existing = byName.get(key);

        if (existing){
          existing.cat = cat;
          existing.ingredients = ing;
          existing.allergens = allergens;
          existing.updatedAt = Date.now();
          updated++;
        } else {
          const it = normalizeItem({ id:newId(), name, cat, ingredients:ing, allergens, updatedAt:Date.now() });
          tw.items.unshift(it);
          byName.set(key, it);
          created++;
        }
      }

      tw.updatedAt = Date.now();
      saveDB();
      alert(`CSV imported ✅\nNew: ${created}\nUpdated: ${updated}\nSkipped: ${skipped}`);
      openItems();
    }catch{
      alert("CSV import failed. Make sure file is valid CSV.");
    }
  };
  reader.readAsText(file);
}

// =========================
// BULK CSV (ALL TAKEAWAYS)
// =========================
function downloadBulkTemplate(){
  const header = ["takeaway_name","biz","item_name","category","ingredients","allergens"].join(",");
  const r1 = ["Khan Takeaway","Khan Takeaway Ltd","Chicken Burger","Burgers","Chicken; bun; mayo","Eggs; Milk; Cereals containing gluten"].map(csvEscape).join(",");
  const r2 = ["Khan Takeaway","Khan Takeaway Ltd","Fish & Chips","Mains","Fish; potatoes","Fish"].map(csvEscape).join(",");
  const r3 = ["Spice Corner","Spice Corner","Chicken Biryani","Rice","Rice; chicken; spices",""].map(csvEscape).join(",");
  downloadBlob([header, r1, r2, r3].join("\n"), "bulk-takeaways-template.csv", "text/csv;charset=utf-8");
}
function exportBulkCsv(){
  const header = ["takeaway_name","biz","item_name","category","ingredients","allergens"].join(",");
  const rows = [];

  state.db.takeaways.forEach(tw => {
    (tw.items||[]).forEach(it => {
      rows.push([
        tw.name || "",
        tw.biz || "",
        it.name || "",
        it.cat || "",
        it.ingredients || "",
        (it.allergens || []).join("; ")
      ].map(csvEscape).join(","));
    });

    if ((tw.items||[]).length === 0){
      rows.push([tw.name||"", tw.biz||"", "", "", "", ""].map(csvEscape).join(","));
    }
  });

  downloadBlob([header, ...rows].join("\n"), "bulk-takeaways-export.csv", "text/csv;charset=utf-8");
}
function findOrCreateTakeawayByName(name){
  const key = normalizeKey(name);
  let tw = state.db.takeaways.find(t => normalizeKey(t.name) === key);
  if (!tw){
    tw = newTakeaway(name);
    state.db.takeaways.unshift(tw);
  }
  return tw;
}
function upsertItemInTakeaway(tw, item){
  const byName = new Map((tw.items||[]).map(it => [normalizeKey(it.name), it]));
  const key = normalizeKey(item.name);
  const existing = byName.get(key);

  if (existing){
    existing.cat = item.cat;
    existing.ingredients = item.ingredients;
    existing.allergens = item.allergens;
    existing.updatedAt = Date.now();
    return "updated";
  } else {
    const it = normalizeItem({ id:newId(), ...item, updatedAt:Date.now() });
    tw.items.unshift(it);
    return "created";
  }
}
function importBulkCsvFile(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const text = String(reader.result || "");
      const rows = parseCsv(text);
      if (!rows.length) return alert("Bulk CSV empty.");

      const header = rows[0].map(h => String(h||"").trim().toLowerCase());
      const iTw  = header.indexOf("takeaway_name");
      const iBiz = header.indexOf("biz");
      const iIt  = header.indexOf("item_name");
      const iCat = header.indexOf("category");
      const iIng = header.indexOf("ingredients");
      const iAll = header.indexOf("allergens");

      if (iTw === -1) return alert("Bulk CSV must include column: takeaway_name");
      if (iIt === -1) return alert("Bulk CSV must include column: item_name");

      let createdTw = 0, createdIt = 0, updatedIt = 0, skipped = 0;
      const existingTwKeys = new Set(state.db.takeaways.map(t => normalizeKey(t.name)));

      for (let r=1; r<rows.length; r++){
        const cols = rows[r];
        const twName = String(cols[iTw] ?? "").trim();
        const itemName = String(cols[iIt] ?? "").trim();
        if (!twName || !itemName){ skipped++; continue; }

        const biz = iBiz >= 0 ? String(cols[iBiz] ?? "").trim() : "";
        const cat = iCat >= 0 ? String(cols[iCat] ?? "").trim() : "";
        const ing = iIng >= 0 ? String(cols[iIng] ?? "").trim() : "";
        const allsRaw = iAll >= 0 ? String(cols[iAll] ?? "").trim() : "";

        const tw = findOrCreateTakeawayByName(twName);
        const twKey = normalizeKey(tw.name);
        if (!existingTwKeys.has(twKey)){
          createdTw++;
          existingTwKeys.add(twKey);
        }
        if (biz) tw.biz = biz;

        const allergens = parseAllergensList(allsRaw);

        const res = upsertItemInTakeaway(tw, {
          name: itemName,
          cat,
          ingredients: ing,
          allergens
        });

        if (res === "created") createdIt++;
        else updatedIt++;

        tw.updatedAt = Date.now();
      }

      if (!state.db.takeaways.some(t => t.id === state.activeId)){
        state.activeId = state.db.takeaways[0]?.id || null;
        if (state.activeId) localStorage.setItem(LS_ACTIVE_TAKEAWAY, state.activeId);
      }

      saveDB();
      renderTakeawaySelect();
      openItems();

      alert(`Bulk import ✅\nNew Takeaways: ${createdTw}\nNew Items: ${createdIt}\nUpdated Items: ${updatedIt}\nSkipped Rows: ${skipped}`);
    }catch{
      alert("Bulk CSV import failed. Check file columns & format.");
    }
  };
  reader.readAsText(file);
}

// =========================
// Backup (ALL takeaways)
// =========================
function downloadBackupAll(){
  const data = { v: 2, exportedAt: new Date().toISOString(), db: state.db };
  downloadBlob(JSON.stringify(data, null, 2), "allergen-multi-backup.json", "application/json");
}
function importBackupAll(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const obj = JSON.parse(String(reader.result || "{}"));
      const db = obj.db;
      if (!db || !Array.isArray(db.takeaways)) throw new Error("Invalid");

      state.db = {
        v:2,
        takeaways: db.takeaways.map(t => ({
          id: t.id || newId(),
          name: String(t.name||"Takeaway").trim() || "Takeaway",
          biz: String(t.biz||"").trim(),
          items: Array.isArray(t.items) ? t.items.map(normalizeItem).filter(i => i.name.trim()) : [],
          updatedAt: t.updatedAt || Date.now()
        }))
      };

      state.activeId = state.db.takeaways[0]?.id || null;
      if (!state.activeId){
        const t0 = newTakeaway("Default Takeaway");
        state.db.takeaways.push(t0);
        state.activeId = t0.id;
      }

      saveDB();
      localStorage.setItem(LS_ACTIVE_TAKEAWAY, state.activeId);
      alert("Backup imported ✅");
      renderTakeawaySelect();
      openItems();
    }catch{
      alert("Import failed: invalid backup JSON.");
    }
  };
  reader.readAsText(file);
}

// =========================
// PIN UI
// =========================
function refreshPinStatus(){
  const status = el("pinStatus");
  const enabled = pinEnabled();
  status.textContent = enabled ? "PIN Lock: ON" : "PIN Lock: OFF";
  el("btnPinToggle").textContent = enabled ? "Disable PIN Lock" : "Enable PIN Lock";
}
function togglePin(){
  const enabled = pinEnabled();
  if (enabled) {
    if (!confirm("Disable PIN lock?")) return;
    setPinEnabled(false);
    alert("PIN lock disabled.");
  } else {
    setPinEnabled(true);
    alert("PIN lock enabled. Now set a PIN.");
  }
  refreshPinStatus();
}
function setOrChangePin(){
  const p1 = prompt("Set a 4-8 digit PIN:");
  if (p1 === null) return;
  const pin = String(p1).trim();
  if (pin.length < 4 || pin.length > 8) return alert("PIN must be 4 to 8 characters.");
  localStorage.setItem(LS_PIN_VALUE, pin);
  setPinEnabled(true);
  localStorage.removeItem(LS_PIN_UNLOCKED);
  alert("PIN saved. Next refresh will ask PIN.");
  refreshPinStatus();
}

// =========================
// Wiring
// =========================
function wire(){
  el("tabItems").addEventListener("click", openItems);
  el("tabExport").addEventListener("click", openExport);

  el("takeawaySelect").addEventListener("change", (e) => {
    setActiveTakeaway(e.target.value);
    renderTakeawaySelect();
    openItems();
  });
  el("btnNewTakeaway").addEventListener("click", createTakeaway);
  el("btnRenameTakeaway").addEventListener("click", renameTakeaway);
  el("btnDeleteTakeaway").addEventListener("click", deleteTakeaway);

  el("btnNew").addEventListener("click", () => openEditor(null));
  el("btnBack").addEventListener("click", openItems);
  el("btnBack2").addEventListener("click", openItems);

  el("btnSave").addEventListener("click", saveItem);
  el("btnDelete").addEventListener("click", deleteItem);

  el("btnPrint").addEventListener("click", printMatrix);
  el("btnSimple").addEventListener("click", () => { openExport(); renderSimpleView(); });
  el("btnQR").addEventListener("click", generateShareLink);
  el("btnResetTakeaway").addEventListener("click", resetThisTakeaway);

  // ✅ QR sheet
  el("btnQrSheet").addEventListener("click", openQrSheetAllTakeaways);

  el("searchBox").addEventListener("input", (e) => { state.search = e.target.value || ""; renderList(); });
  el("sortBy").addEventListener("change", (e) => { state.sortBy = e.target.value || "newest"; renderList(); });
  el("btnClearSearch").addEventListener("click", () => { state.search=""; el("searchBox").value=""; renderList(); });

  el("btnDownloadCsvTemplate").addEventListener("click", downloadCsvTemplate);
  el("btnExportCsv").addEventListener("click", exportItemsCsv);
  el("importCsvFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importCsvFile(f);
    e.target.value = "";
  });

  el("btnBulkTemplate").addEventListener("click", downloadBulkTemplate);
  el("btnBulkExport").addEventListener("click", exportBulkCsv);
  el("importBulkCsvFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importBulkCsvFile(f);
    e.target.value = "";
  });

  el("btnDownloadBackup").addEventListener("click", downloadBackupAll);
  el("importFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importBackupAll(f);
    e.target.value = "";
  });

  el("btnPinToggle").addEventListener("click", togglePin);
  el("btnPinSet").addEventListener("click", setOrChangePin);
}

// init
loadDB();
requirePinIfEnabled();
wire();
renderTakeawaySelect();
openItems();
