/* Allergen Matrix Builder — Final (Short links + QR PNG + Public JSON publish)
   Files: index.html, app.js, style.css, customer.html
*/

const STORAGE_KEY = "amxb_v2";
const ALLERGENS = [
  { key: "celery", label: "Celery" },
  { key: "gluten", label: "Cereals containing gluten" },
  { key: "crustaceans", label: "Crustaceans" },
  { key: "eggs", label: "Eggs" },
  { key: "fish", label: "Fish" },
  { key: "lupin", label: "Lupin" },
  { key: "milk", label: "Milk" },
  { key: "molluscs", label: "Molluscs" },
  { key: "mustard", label: "Mustard" },
  { key: "nuts", label: "Nuts" },
  { key: "peanuts", label: "Peanuts" },
  { key: "sesame", label: "Sesame" },
  { key: "soya", label: "Soya" },
  { key: "sulphites", label: "Sulphur dioxide / sulphites" },
];

const $ = (sel) => document.querySelector(sel);

function nowISO() { return new Date().toISOString(); }
function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 7); }

function slugify(input) {
  return (input || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60) || "takeaway";
}

function baseSiteUrl() {
  // Example: https://jaffery572.github.io/Allergen-Matrix-Builder/
  const u = new URL(location.href);
  // Ensure ends with repo path + "/"
  // If you are at /index.html it becomes /
  u.hash = "";
  // keep path directory only
  u.pathname = u.pathname.replace(/\/[^\/]*$/, "/");
  u.search = "";
  return u.toString();
}

function qrImageUrl(text, size=320) {
  // Free + simple QR image generator
  const chl = encodeURIComponent(text);
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chld=M|1&chl=${chl}`;
}

function downloadText(filename, text, mime="application/json") {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}

function parseCSV(text) {
  // Simple CSV parser (supports quoted cells)
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i+1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    } else {
      if (c === '"') { inQuotes = true; i++; continue; }
      if (c === ",") { row.push(field); field=""; i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row=[]; field=""; i++; continue; }
      if (c === "\r") { i++; continue; }
      field += c; i++; continue;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter(r => r.some(x => (x||"").trim() !== ""));
}

function toCSV(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[,"\n\r]/.test(s)) return `"${s.replaceAll('"','""')}"`;
    return s;
  };
  return rows.map(r => r.map(esc).join(",")).join("\n");
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  // Default state
  const id = uid();
  return {
    version: 2,
    selectedTakeawayId: id,
    takeawaysOrder: [id],
    takeaways: {
      [id]: {
        id,
        name: "Default Takeaway",
        slug: "default-takeaway",
        createdAt: nowISO(),
        updatedAt: nowISO(),
        items: []
      }
    },
    pin: { enabled: false, value: "" }, // simple pin (owner side)
    ui: { view: "items", sort: "newest", search: "" }
  };
}

function saveState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

let state = loadState();

function getTakeaway() {
  return state.takeaways[state.selectedTakeawayId];
}

function ensureUniqueSlug(desired, excludeId=null) {
  let slug = slugify(desired);
  const used = new Set(Object.values(state.takeaways)
    .filter(t => t.id !== excludeId)
    .map(t => t.slug));
  if (!used.has(slug)) return slug;
  let n = 2;
  while (used.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

function formatDT(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch { return iso; }
}

// ---------- UI ----------
const app = $("#app");
$("#navItems").addEventListener("click", () => { state.ui.view="items"; saveState(state); render(); });
$("#navExport").addEventListener("click", () => { state.ui.view="export"; saveState(state); render(); });

function render() {
  const t = getTakeaway();
  if (!t) return;

  app.innerHTML = `
    <div class="stack">
      ${renderTakeawayProfileCard()}
      ${state.ui.view === "items" ? renderItemsView() : renderExportView()}
    </div>
  `;

  // Bind profile actions
  bindProfileActions();

  if (state.ui.view === "items") bindItemsActions();
  if (state.ui.view === "export") bindExportActions();
}

function renderTakeawayProfileCard() {
  const t = getTakeaway();
  const options = state.takeawaysOrder.map(id => {
    const x = state.takeaways[id];
    const sel = id === state.selectedTakeawayId ? "selected" : "";
    return `<option value="${x.id}" ${sel}>${escapeHtml(x.name)}</option>`;
  }).join("");

  return `
  <section class="card">
    <div class="row space">
      <div>
        <p class="h2">Takeaway Profile</p>
        <p class="p">Each takeaway has separate data (items, export, QR, CSV).</p>
        <p class="p">
          Selected: <b>${escapeHtml(t.name)}</b>
          <span class="badge">items: ${t.items.length}</span>
          <span class="badge">last update: ${formatDT(t.updatedAt)}</span>
          <span class="badge">slug: <span class="kbd">${escapeHtml(t.slug)}</span></span>
        </p>
      </div>
      <div class="row">
        <select id="takeawaySelect" class="input">${options}</select>
        <button id="btnAddTakeaway" class="btn primary">+ New</button>
        <button id="btnRenameTakeaway" class="btn">Rename</button>
        <button id="btnDeleteTakeaway" class="btn danger">Delete</button>
      </div>
    </div>
  </section>
  `;
}

function renderItemsView() {
  const t = getTakeaway();
  const search = state.ui.search || "";
  const sort = state.ui.sort || "newest";

  let items = [...t.items];
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter(it =>
      (it.name||"").toLowerCase().includes(q) ||
      (it.category||"").toLowerCase().includes(q) ||
      (it.ingredients||"").toLowerCase().includes(q)
    );
  }
  items.sort((a,b)=>{
    if (sort==="newest") return (b.updatedAt||"").localeCompare(a.updatedAt||"");
    if (sort==="az") return (a.name||"").localeCompare(b.name||"");
    if (sort==="cat") return (a.category||"").localeCompare(b.category||"");
    return 0;
  });

  return `
  <section class="card">
    <div class="row space">
      <div>
        <p class="h2">Menu Items</p>
        <p class="p">Search, sort, manage items for selected takeaway.</p>
      </div>
      <button id="btnNewItem" class="btn primary">+ New Item</button>
    </div>

    <div class="row" style="margin-top:12px">
      <input id="searchBox" class="input" style="min-width:240px; flex:1" placeholder="Search item name / category..." value="${escapeAttr(search)}"/>
      <select id="sortSelect" class="input">
        <option value="newest" ${sort==="newest"?"selected":""}>Sort: Newest</option>
        <option value="az" ${sort==="az"?"selected":""}>Sort: A → Z</option>
        <option value="cat" ${sort==="cat"?"selected":""}>Sort: Category</option>
      </select>
      <button id="btnClearSearch" class="btn">Clear</button>
    </div>

    <hr class="sep"/>

    ${items.length ? renderItemsTable(items) : `
      <div class="notice" style="text-align:center">
        <div style="font-weight:900; color: var(--text); margin-bottom:4px">No items yet</div>
        Click <span class="kbd">New Item</span> to add your first menu item.
      </div>
    `}
  </section>
  `;
}

function renderItemsTable(items) {
  const head = `
    <tr>
      <th style="width:26%">Item</th>
      <th style="width:14%">Category</th>
      <th>Ingredients</th>
      <th style="width:26%">Allergens</th>
      <th style="width:12%">Actions</th>
    </tr>
  `;
  const rows = items.map(it=>{
    const active = ALLERGENS.filter(a => it.allergens?.[a.key]).map(a=>a.label);
    return `
      <tr>
        <td>
          <div style="font-weight:900">${escapeHtml(it.name)}</div>
          <div class="muted">${escapeHtml(it.note || "")}</div>
        </td>
        <td>${escapeHtml(it.category || "")}</td>
        <td class="muted">${escapeHtml(it.ingredients || "")}</td>
        <td>
          <div class="chips">
            ${active.length ? active.map(x=>`<span class="chip red">${escapeHtml(x)}</span>`).join("") : `<span class="chip green">No declared allergens</span>`}
          </div>
        </td>
        <td>
          <div class="row">
            <button class="btn small" data-edit="${it.id}">Edit</button>
            <button class="btn small danger" data-del="${it.id}">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
  return `<table class="table">${head}${rows}</table>`;
}

function renderExportView() {
  const t = getTakeaway();
  const site = baseSiteUrl();
  const shortLink = `${site}?t=${encodeURIComponent(t.slug)}`;
  const customerDirect = `${site}customer.html?t=${encodeURIComponent(t.slug)}`;
  const qrUrl = qrImageUrl(shortLink, 360);

  return `
  <section class="card">
    <div class="row space">
      <div>
        <p class="h2">Export</p>
        <p class="p">Business name (shown on customer page) — per takeaway</p>
      </div>
      <button id="btnBackToItems" class="btn">Back</button>
    </div>

    <div class="row" style="margin-top:12px">
      <input id="bizName" class="input" style="flex:1; min-width:260px" value="${escapeAttr(t.name)}"/>
      <button id="btnSaveBizName" class="btn primary">Save name</button>
      <button id="btnResetTakeaway" class="btn danger">Reset this takeaway</button>
    </div>

    <hr class="sep"/>

    <div class="grid2">
      <div class="card" style="background: rgba(0,0,0,.16); box-shadow:none">
        <p class="h2">Share link (Platforms: Website / JustEat / UberEats)</p>
        <p class="p">
          ✅ Use this clean link on ordering platforms. It stays short because customer page reads <span class="kbd">public-data.json</span>.
        </p>

        <div class="notice" style="margin-top:10px">
          <div style="font-weight:900; color: var(--text); margin-bottom:6px">Short link</div>
          <div class="smalllink">${escapeHtml(shortLink)}</div>
          <div class="row" style="margin-top:10px">
            <button id="btnOpenShort" class="btn primary">Open</button>
            <button id="btnCopyShort" class="btn">Copy</button>
          </div>
        </div>

        <div class="notice" style="margin-top:10px">
          <div style="font-weight:900; color: var(--text); margin-bottom:6px">Customer page direct</div>
          <div class="smalllink">${escapeHtml(customerDirect)}</div>
          <div class="row" style="margin-top:10px">
            <button id="btnOpenCustomer" class="btn">Open</button>
            <button id="btnCopyCustomer" class="btn">Copy</button>
          </div>
        </div>

        <hr class="sep"/>

        <p class="h2">Publish (required for short links)</p>
        <p class="p">
          Short links only work for customers after you upload <b>public-data.json</b> to your GitHub repo root.
        </p>
        <div class="row" style="margin-top:10px">
          <button id="btnDownloadPublicJSON" class="btn primary">Download public-data.json</button>
        </div>

        <div class="notice" style="margin-top:10px">
          <b>How to upload:</b><br/>
          GitHub → repo → <span class="kbd">Add file</span> → <span class="kbd">Upload files</span> → upload <span class="kbd">public-data.json</span> → Commit.<br/>
          After upload, customer short links work everywhere.
        </div>
      </div>

      <div class="card" style="background: rgba(0,0,0,.16); box-shadow:none">
        <p class="h2">QR (PNG download)</p>
        <p class="p">Put QR on your takeaway website, flyers, shop counter, menu boards.</p>

        <img class="qr-img" alt="QR" src="${qrUrl}"/>

        <div class="row" style="margin-top:10px">
          <button id="btnOpenShort2" class="btn primary">Open Link</button>
          <button id="btnCopyShort2" class="btn">Copy Link</button>
          <a id="btnDownloadQR" class="btn" href="${qrUrl}" download="${escapeAttr(t.slug)}-qr.png">Download QR PNG</a>
        </div>

        <hr class="sep"/>

        <p class="h2">CSV Import / Export (selected takeaway)</p>
        <div class="row" style="margin-top:10px">
          <button id="btnCSVTemplate" class="btn">Download CSV Template</button>
          <button id="btnExportCSV" class="btn">Export Items as CSV</button>
          <input id="csvFile" type="file" accept=".csv" style="display:none"/>
          <button id="btnImportCSV" class="btn primary">Import CSV</button>
        </div>

        <hr class="sep"/>

        <p class="h2">Bulk CSV (100 takeaways in ONE file)</p>
        <div class="row" style="margin-top:10px">
          <button id="btnBulkTemplate" class="btn">Download Bulk Template</button>
          <button id="btnExportBulk" class="btn">Export ALL as Bulk CSV</button>
          <input id="bulkFile" type="file" accept=".csv" style="display:none"/>
          <button id="btnImportBulk" class="btn primary">Import BULK CSV (auto creates takeaways)</button>
        </div>

        <hr class="sep"/>

        <p class="h2">QR Sheet (ALL takeaways)</p>
        <div class="row" style="margin-top:10px">
          <button id="btnOpenQRSheet" class="btn primary">Open QR Sheet (Print / Save PDF)</button>
        </div>

        <hr class="sep"/>

        <p class="h2">Backup & Security (Owner)</p>
        <div class="row" style="margin-top:10px">
          <button id="btnDownloadBackup" class="btn">Download Backup (ALL Takeaways JSON)</button>
          <input id="backupFile" type="file" accept=".json" style="display:none"/>
          <button id="btnImportBackup" class="btn">Import Backup (JSON)</button>
        </div>

        <div class="row" style="margin-top:10px">
          <button id="btnTogglePIN" class="btn">${state.pin.enabled ? "Disable PIN Lock" : "Enable PIN Lock"}</button>
          <button id="btnSetPIN" class="btn">Set / Change PIN</button>
          <span class="badge">${state.pin.enabled ? "PIN Lock: ON" : "PIN Lock: OFF"}</span>
        </div>
      </div>
    </div>
  </section>
  `;
}

function bindProfileActions() {
  $("#takeawaySelect").addEventListener("change", (e)=>{
    state.selectedTakeawayId = e.target.value;
    state.ui.search = "";
    saveState(state);
    render();
  });

  $("#btnAddTakeaway").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    const name = prompt("New takeaway name? (e.g. Crust Blackburn)");
    if (!name) return;
    const id = uid();
    const slug = ensureUniqueSlug(name);
    state.takeaways[id] = { id, name, slug, createdAt: nowISO(), updatedAt: nowISO(), items: [] };
    state.takeawaysOrder.unshift(id);
    state.selectedTakeawayId = id;
    saveState(state);
    render();
  });

  $("#btnRenameTakeaway").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    const t = getTakeaway();
    const name = prompt("Rename takeaway:", t.name);
    if (!name) return;
    t.name = name.trim();
    t.slug = ensureUniqueSlug(t.name, t.id);
    t.updatedAt = nowISO();
    saveState(state);
    render();
  });

  $("#btnDeleteTakeaway").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    const t = getTakeaway();
    if (Object.keys(state.takeaways).length === 1) {
      alert("You must keep at least 1 takeaway.");
      return;
    }
    const ok = confirm(`Delete takeaway "${t.name}"? This removes all its items.`);
    if (!ok) return;
    delete state.takeaways[t.id];
    state.takeawaysOrder = state.takeawaysOrder.filter(x=>x!==t.id);
    state.selectedTakeawayId = state.takeawaysOrder[0];
    saveState(state);
    render();
  });
}

function bindItemsActions() {
  $("#searchBox").addEventListener("input", (e)=>{ state.ui.search = e.target.value; saveState(state); render(); });
  $("#sortSelect").addEventListener("change", (e)=>{ state.ui.sort = e.target.value; saveState(state); render(); });
  $("#btnClearSearch").addEventListener("click", ()=>{ state.ui.search=""; saveState(state); render(); });

  $("#btnNewItem").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    openItemEditor(null);
  });

  app.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if (!checkPIN()) return;
      const id = btn.getAttribute("data-edit");
      openItemEditor(id);
    });
  });

  app.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if (!checkPIN()) return;
      const id = btn.getAttribute("data-del");
      const t = getTakeaway();
      const it = t.items.find(x=>x.id===id);
      if (!it) return;
      if (!confirm(`Delete item "${it.name}"?`)) return;
      t.items = t.items.filter(x=>x.id!==id);
      t.updatedAt = nowISO();
      saveState(state);
      render();
    });
  });
}

function openItemEditor(itemId) {
  const t = getTakeaway();
  const existing = itemId ? t.items.find(x=>x.id===itemId) : null;

  const name = prompt("Item name:", existing?.name || "");
  if (!name) return;

  const category = prompt("Category (optional):", existing?.category || "") || "";
  const ingredients = prompt("Ingredients (optional):", existing?.ingredients || "") || "";
  const note = prompt("Note (optional):", existing?.note || "") || "";

  // Allergens selection via confirm prompts (simple & beginner-friendly)
  const allergens = { ...(existing?.allergens || {}) };
  for (const a of ALLERGENS) {
    const cur = !!allergens[a.key];
    const ans = confirm(`${a.label}\n\nOK = YES (contains)\nCancel = NO\n\nCurrent: ${cur ? "YES" : "NO"}`);
    allergens[a.key] = ans;
  }

  const it = existing || { id: uid(), createdAt: nowISO() };
  it.name = name.trim();
  it.category = category.trim();
  it.ingredients = ingredients.trim();
  it.note = note.trim();
  it.allergens = allergens;
  it.updatedAt = nowISO();

  if (!existing) t.items.unshift(it);
  t.updatedAt = nowISO();
  saveState(state);
  render();
}

function bindExportActions() {
  $("#btnBackToItems").addEventListener("click", ()=>{ state.ui.view="items"; saveState(state); render(); });

  $("#btnSaveBizName").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    const t = getTakeaway();
    const v = $("#bizName").value.trim();
    if (!v) return alert("Business name cannot be empty.");
    t.name = v;
    t.slug = ensureUniqueSlug(v, t.id);
    t.updatedAt = nowISO();
    saveState(state);
    render();
  });

  $("#btnResetTakeaway").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    const t = getTakeaway();
    if (!confirm(`Reset "${t.name}"? This clears its items only.`)) return;
    t.items = [];
    t.updatedAt = nowISO();
    saveState(state);
    render();
  });

  const site = baseSiteUrl();
  const t = getTakeaway();
  const shortLink = `${site}?t=${encodeURIComponent(t.slug)}`;
  const customerDirect = `${site}customer.html?t=${encodeURIComponent(t.slug)}`;

  const copy = async (txt) => {
    try { await navigator.clipboard.writeText(txt); alert("Copied!"); }
    catch { prompt("Copy this:", txt); }
  };

  $("#btnOpenShort").addEventListener("click", ()=> window.open(shortLink, "_blank"));
  $("#btnCopyShort").addEventListener("click", ()=> copy(shortLink));
  $("#btnOpenCustomer").addEventListener("click", ()=> window.open(customerDirect, "_blank"));
  $("#btnCopyCustomer").addEventListener("click", ()=> copy(customerDirect));
  $("#btnOpenShort2").addEventListener("click", ()=> window.open(shortLink, "_blank"));
  $("#btnCopyShort2").addEventListener("click", ()=> copy(shortLink));

  // Public JSON publish
  $("#btnDownloadPublicJSON").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    const publicData = buildPublicDataJSON();
    downloadText("public-data.json", JSON.stringify(publicData, null, 2), "application/json");
  });

  // CSV
  $("#btnCSVTemplate").addEventListener("click", ()=>{
    const rows = [
      ["name","category","ingredients","note", ...ALLERGENS.map(a=>a.key)],
      ["Chicken Burger","Burgers","chicken, bun, mayo","", "0","1","0","1","0","0","1","0","0","0","0","0","0","0"],
    ];
    downloadText("items-template.csv", toCSV(rows), "text/csv");
  });

  $("#btnExportCSV").addEventListener("click", ()=>{
    const t = getTakeaway();
    const rows = [
      ["name","category","ingredients","note", ...ALLERGENS.map(a=>a.key)]
    ];
    t.items.forEach(it=>{
      const row = [
        it.name||"", it.category||"", it.ingredients||"", it.note||"",
        ...ALLERGENS.map(a => it.allergens?.[a.key] ? "1" : "0")
      ];
      rows.push(row);
    });
    downloadText(`${t.slug}-items.csv`, toCSV(rows), "text/csv");
  });

  $("#btnImportCSV").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    $("#csvFile").click();
  });

  $("#csvFile").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    importItemsCSV(text);
    e.target.value = "";
  });

  // Bulk CSV
  $("#btnBulkTemplate").addEventListener("click", ()=>{
    const rows = [
      ["takeaway_name","takeaway_slug","item_name","category","ingredients","note", ...ALLERGENS.map(a=>a.key)],
      ["Crust Blackburn","crust-blackburn","Chicken Burger","Burgers","chicken, bun, mayo","", "0","1","0","1","0","0","1","0","0","0","0","0","0","0"],
      ["Crust Blackburn","crust-blackburn","Fish & Chips","Mains","fish, potato","", "0","0","0","0","1","0","0","0","0","0","0","0","0","0"],
      ["Khan Takeaway","khan-takeaway","Veg Curry","Mains","veg, spices","", "0","0","0","0","0","0","0","0","0","0","0","0","1","0"],
    ];
    downloadText("bulk-template.csv", toCSV(rows), "text/csv");
  });

  $("#btnExportBulk").addEventListener("click", ()=>{
    const rows = [["takeaway_name","takeaway_slug","item_name","category","ingredients","note", ...ALLERGENS.map(a=>a.key)]];
    for (const id of state.takeawaysOrder) {
      const tw = state.takeaways[id];
      tw.items.forEach(it=>{
        rows.push([
          tw.name, tw.slug, it.name||"", it.category||"", it.ingredients||"", it.note||"",
          ...ALLERGENS.map(a => it.allergens?.[a.key] ? "1" : "0")
        ]);
      });
      // If no items, still include takeaway row (blank item)
      if (tw.items.length === 0) {
        rows.push([tw.name, tw.slug, "", "", "", "", ...ALLERGENS.map(()=> "0")]);
      }
    }
    downloadText("bulk-all-takeaways.csv", toCSV(rows), "text/csv");
  });

  $("#btnImportBulk").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    $("#bulkFile").click();
  });

  $("#bulkFile").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    importBulkCSV(text);
    e.target.value = "";
  });

  // QR Sheet
  $("#btnOpenQRSheet").addEventListener("click", ()=>{
    openQRSheet();
  });

  // Backup
  $("#btnDownloadBackup").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    downloadText("all-takeaways-backup.json", JSON.stringify(state, null, 2), "application/json");
  });
  $("#btnImportBackup").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    $("#backupFile").click();
  });
  $("#backupFile").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    try {
      const obj = JSON.parse(text);
      if (!obj.takeaways) throw new Error("Invalid backup");
      state = obj;
      saveState(state);
      alert("Backup imported!");
      render();
    } catch(err) {
      alert("Invalid backup file.");
    }
    e.target.value = "";
  });

  // PIN
  $("#btnTogglePIN").addEventListener("click", ()=>{
    if (state.pin.enabled) {
      const ok = confirm("Disable PIN lock?");
      if (!ok) return;
      state.pin.enabled = false;
      saveState(state);
      render();
    } else {
      const pin = prompt("Set a PIN (4-8 digits) then it will be required for edits:");
      if (!pin) return;
      state.pin.value = pin.trim();
      state.pin.enabled = true;
      saveState(state);
      alert("PIN lock enabled.");
      render();
    }
  });
  $("#btnSetPIN").addEventListener("click", ()=>{
    if (!checkPIN()) return;
    const pin = prompt("New PIN (4-8 digits):");
    if (!pin) return;
    state.pin.value = pin.trim();
    state.pin.enabled = true;
    saveState(state);
    alert("PIN updated.");
    render();
  });
}

// ---------- Data helpers ----------
function importItemsCSV(text) {
  const t = getTakeaway();
  const rows = parseCSV(text);
  const header = rows[0].map(x => (x||"").trim());
  const idx = (name) => header.indexOf(name);

  if (idx("name") === -1) return alert("CSV missing required column: name");

  const imported = [];
  for (let i=1; i<rows.length; i++) {
    const r = rows[i];
    const name = (r[idx("name")]||"").trim();
    if (!name) continue;
    const it = { id: uid(), createdAt: nowISO(), updatedAt: nowISO() };
    it.name = name;
    it.category = (r[idx("category")]||"").trim();
    it.ingredients = (r[idx("ingredients")]||"").trim();
    it.note = (r[idx("note")]||"").trim();
    it.allergens = {};
    ALLERGENS.forEach(a=>{
      const j = idx(a.key);
      it.allergens[a.key] = j>=0 ? (String(r[j]||"").trim() === "1") : false;
    });
    imported.push(it);
  }

  if (!imported.length) return alert("No items found in CSV.");
  t.items = imported.concat(t.items);
  t.updatedAt = nowISO();
  saveState(state);
  alert(`Imported ${imported.length} items into ${t.name}.`);
  render();
}

function importBulkCSV(text) {
  const rows = parseCSV(text);
  const header = rows[0].map(x => (x||"").trim());
  const idx = (name) => header.indexOf(name);

  const need = ["takeaway_name","takeaway_slug","item_name"];
  for (const n of need) if (idx(n) === -1) return alert(`Bulk CSV missing column: ${n}`);

  // Map existing takeaways by slug
  const slugToId = {};
  for (const id of state.takeawaysOrder) {
    slugToId[state.takeaways[id].slug] = id;
  }

  let createdTW = 0, addedItems = 0;

  for (let i=1; i<rows.length; i++) {
    const r = rows[i];
    const twName = (r[idx("takeaway_name")]||"").trim();
    const twSlugRaw = (r[idx("takeaway_slug")]||"").trim();
    const twSlug = ensureUniqueSlug(twSlugRaw || twName || "takeaway");
    if (!twName) continue;

    let twId = slugToId[twSlug];
    if (!twId) {
      twId = uid();
      state.takeaways[twId] = { id: twId, name: twName, slug: twSlug, createdAt: nowISO(), updatedAt: nowISO(), items: [] };
      state.takeawaysOrder.unshift(twId);
      slugToId[twSlug] = twId;
      createdTW++;
    }

    const itemName = (r[idx("item_name")]||"").trim();
    if (!itemName) continue;

    const it = { id: uid(), createdAt: nowISO(), updatedAt: nowISO() };
    it.name = itemName;
    it.category = (r[idx("category")]||"").trim();
    it.ingredients = (r[idx("ingredients")]||"").trim();
    it.note = (r[idx("note")]||"").trim();
    it.allergens = {};
    ALLERGENS.forEach(a=>{
      const j = idx(a.key);
      it.allergens[a.key] = j>=0 ? (String(r[j]||"").trim() === "1") : false;
    });

    state.takeaways[twId].items.unshift(it);
    state.takeaways[twId].updatedAt = nowISO();
    addedItems++;
  }

  saveState(state);
  alert(`Bulk import done.\nCreated takeaways: ${createdTW}\nAdded items: ${addedItems}`);
  render();
}

function buildPublicDataJSON() {
  // Only what's needed for customer view (no owner controls)
  const takeaways = state.takeawaysOrder.map(id=>{
    const t = state.takeaways[id];
    return {
      slug: t.slug,
      name: t.name,
      updatedAt: t.updatedAt,
      items: t.items.map(it => ({
        name: it.name,
        category: it.category || "",
        ingredients: it.ingredients || "",
        note: it.note || "",
        allergens: ALLERGENS.filter(a => it.allergens?.[a.key]).map(a => a.key)
      }))
    };
  });
  return { generatedAt: nowISO(), takeaways, allergens: ALLERGENS };
}

function openQRSheet() {
  const site = baseSiteUrl();
  const list = state.takeawaysOrder.map(id => state.takeaways[id]).map(t=>{
    const link = `${site}?t=${encodeURIComponent(t.slug)}`;
    const qr = qrImageUrl(link, 320);
    return { name: t.name, slug: t.slug, items: t.items.length, link, qr };
  });

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>QR Sheet</title>
  <style>
    body{margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0b0f17; color:#e7eefc}
    .bar{position:sticky; top:0; background:rgba(11,15,23,.85); backdrop-filter: blur(8px); padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.10); display:flex; gap:10px; align-items:center}
    button{padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06); color:#e7eefc; font-weight:700; cursor:pointer}
    button:hover{background:rgba(255,255,255,.09)}
    .wrap{max-width:1200px; margin:16px auto; padding:0 14px 40px}
    .grid{display:grid; grid-template-columns:repeat(3,1fr); gap:14px}
    @media(max-width:950px){.grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:650px){.grid{grid-template-columns:1fr}}
    .card{background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10); border-radius:18px; padding:12px}
    .name{font-weight:900; margin:0}
    .sub{opacity:.75; margin:6px 0 10px; font-size:12px}
    img{width:100%; max-width:340px; background:white; border-radius:14px; padding:10px}
    a{color:#9bd0ff; text-decoration:none}
    a:hover{text-decoration:underline}
    .link{word-break: break-all; font-size:12px; opacity:.9; margin-top:10px}
  </style>
</head>
<body>
  <div class="bar">
    <button onclick="window.print()">Print / Save PDF</button>
    <button onclick="location.reload()">Reload</button>
    <div style="margin-left:auto; opacity:.8; font-weight:800">QR Sheet • Total: ${list.length}</div>
  </div>

  <div class="wrap">
    <div class="grid">
      ${list.map(x=>`
        <div class="card">
          <p class="name">${escapeHtml(x.name)}</p>
          <div class="sub">${x.items} items • slug: ${escapeHtml(x.slug)}</div>
          <img src="${x.qr}" alt="qr"/>
          <div style="margin-top:10px"><a href="${x.link}" target="_blank">Open Link</a></div>
          <div class="link">${escapeHtml(x.link)}</div>
        </div>
      `).join("")}
    </div>
  </div>
</body>
</html>
  `;
  const w = window.open("", "_blank");
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ---------- PIN ----------
function checkPIN() {
  if (!state.pin.enabled) return true;
  const pin = prompt("Enter PIN to edit:");
  return pin !== null && pin.trim() === state.pin.value;
}

// ---------- Utils ----------
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

// init
render();
