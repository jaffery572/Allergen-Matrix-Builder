// Allergen Matrix Builder v3 (4 files only) — Cells UI, No popups, Multi-takeaway, CSV/Bulk CSV, QR Sheet
const ALLERGENS = [
  { key:"celery", label:"Celery" },
  { key:"gluten", label:"Cereals containing gluten" },
  { key:"crustaceans", label:"Crustaceans" },
  { key:"eggs", label:"Eggs" },
  { key:"fish", label:"Fish" },
  { key:"lupin", label:"Lupin" },
  { key:"milk", label:"Milk" },
  { key:"molluscs", label:"Molluscs" },
  { key:"mustard", label:"Mustard" },
  { key:"nuts", label:"Nuts" },
  { key:"peanuts", label:"Peanuts" },
  { key:"sesame", label:"Sesame" },
  { key:"soya", label:"Soya" },
  { key:"sulphites", label:"Sulphur dioxide / sulphites" }
];

const STORAGE_KEY = "amb_state_v3";

const $ = (s)=>document.querySelector(s);

function nowISO(){ return new Date().toISOString(); }

function slugify(s){
  return (s||"")
    .toLowerCase()
    .trim()
    .replace(/&/g," and ")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"")
    .slice(0,60) || ("tw-" + Math.random().toString(16).slice(2,8));
}

function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._tm);
  toast._tm = setTimeout(()=>t.classList.add("hidden"), 2200);
}

function loadState(){
  try{
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return null;
    return JSON.parse(s);
  } catch { return null; }
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function defaultTakeaway(){
  const name = "Default Takeaway";
  const slug = slugify(name);
  return {
    active: slug,
    takeaways: {
      [slug]: { slug, name, items: [], createdAt: nowISO(), updatedAt: nowISO() }
    },
    order: [slug]
  };
}

let state = loadState() || defaultTakeaway();

function getActiveSlug(){ return state.active; }
function getTakeaway(){ return state.takeaways[getActiveSlug()]; }

function setActive(slug){
  state.active = slug;
  saveState();
  renderAll();
}

function ensureActiveValid(){
  const keys = Object.keys(state.takeaways || {});
  if (!keys.length) {
    state = defaultTakeaway();
    saveState();
  }
  if (!state.takeaways[state.active]) {
    state.active = state.order?.[0] || keys[0];
    saveState();
  }
}

function escapeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function escapeAttr(s){ return escapeHtml(s); }

// ---------- UI: Tabs ----------
function setTab(tab){
  if (tab === "items"){
    $("#viewItems").classList.remove("hidden");
    $("#viewExport").classList.add("hidden");
    $("#tabItems").classList.add("primary");
    $("#tabExport").classList.remove("primary");
  } else {
    $("#viewItems").classList.add("hidden");
    $("#viewExport").classList.remove("hidden");
    $("#tabItems").classList.remove("primary");
    $("#tabExport").classList.add("primary");
  }
}

// ---------- Takeaway selector ----------
function renderTakeawaySelect(){
  ensureActiveValid();
  const sel = $("#takeawaySelect");
  const slugs = state.order && state.order.length ? state.order : Object.keys(state.takeaways);
  sel.innerHTML = slugs.map(sl=>{
    const t = state.takeaways[sl];
    return `<option value="${escapeAttr(sl)}">${escapeHtml(t.name || sl)}</option>`;
  }).join("");
  sel.value = state.active;

  const t = getTakeaway();
  $("#takeawayMeta").textContent =
    `Selected: ${t.name} • items: ${t.items.length} • last update: ${new Date(t.updatedAt).toLocaleString()} • slug: ${t.slug}`;
}

// ---------- Items View (cells grid) ----------
function renderItemsView(){
  const t = getTakeaway();

  const controls = `
    <div class="row space wrap">
      <div>
        <div class="h2">Menu Items (Cells Grid)</div>
        <div class="p muted small">Row = item, Columns = allergens. Tick ✓ to mark allergens.</div>
      </div>
      <div class="row wrap gap">
        <input id="itemSearch" class="input" style="min-width:260px" placeholder="Search item name / category..." />
        <button id="btnAddRow" class="btn primary">+ Add Row</button>
        <button id="btnClearSearch" class="btn">Clear</button>
      </div>
    </div>
    <hr class="hr"/>
  `;

  const table = `
    <div class="table-wrap">
      <table class="grid" id="itemsTable">
        <thead>
          <tr>
            <th class="sticky">Item</th>
            <th>Category</th>
            <th>Ingredients</th>
            <th>Note</th>
            ${ALLERGENS.map(a=>`<th class="rot">${escapeHtml(a.label)}</th>`).join("")}
            <th class="center">Del</th>
          </tr>
        </thead>
        <tbody>
          ${t.items.map(it=>rowHtml(it)).join("")}
        </tbody>
      </table>
    </div>
  `;

  $("#viewItems").innerHTML = controls + table;
}

function rowHtml(it){
  const alls = it.allergens || {};
  return `
    <tr data-id="${escapeAttr(it.id)}">
      <td class="sticky">
        <input class="cell-input" data-field="name" value="${escapeAttr(it.name||"")}" placeholder="Item name"/>
      </td>
      <td><input class="cell-input" data-field="category" value="${escapeAttr(it.category||"")}" placeholder="Category"/></td>
      <td><input class="cell-input" data-field="ingredients" value="${escapeAttr(it.ingredients||"")}" placeholder="Ingredients"/></td>
      <td><input class="cell-input" data-field="note" value="${escapeAttr(it.note||"")}" placeholder="Note"/></td>
      ${ALLERGENS.map(a=>{
        const checked = alls[a.key] ? "checked" : "";
        return `<td class="center"><input class="checkbox" type="checkbox" data-allergen="${escapeAttr(a.key)}" ${checked}/></td>`;
      }).join("")}
      <td class="center">
        <button class="btn danger btnDelRow" title="Delete row">✕</button>
      </td>
    </tr>
  `;
}

function bindItemsView(){
  const t = getTakeaway();

  $("#btnAddRow").addEventListener("click", ()=>{
    const it = {
      id: "it-" + Math.random().toString(16).slice(2),
      name: "",
      category: "",
      ingredients: "",
      note: "",
      allergens: {},
      createdAt: nowISO(),
      updatedAt: nowISO()
    };
    t.items.unshift(it);
    t.updatedAt = nowISO();
    saveState();
    renderItemsView();
    bindItemsView();
    toast("Row added. Type item name…");
  });

  $("#btnClearSearch").addEventListener("click", ()=>{
    $("#itemSearch").value = "";
    renderItemsView();
    bindItemsView();
  });

  $("#itemSearch").addEventListener("input", ()=>{
    const q = $("#itemSearch").value.trim().toLowerCase();
    const tw = getTakeaway();
    const items = tw.items.filter(it=>{
      return (it.name||"").toLowerCase().includes(q) || (it.category||"").toLowerCase().includes(q);
    });
    // render filtered table (quick)
    const body = items.map(it=>rowHtml(it)).join("");
    $("#itemsTable tbody").innerHTML = body;
  });

  // Live edits
  $("#itemsTable").addEventListener("input", (e)=>{
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const id = tr.getAttribute("data-id");
    const item = t.items.find(x=>x.id===id);
    if (!item) return;

    const field = e.target.dataset.field;
    if (field){
      item[field] = e.target.value;
      item.updatedAt = nowISO();
      t.updatedAt = nowISO();
      saveState();
    }
  });

  $("#itemsTable").addEventListener("change", (e)=>{
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const id = tr.getAttribute("data-id");
    const item = t.items.find(x=>x.id===id);
    if (!item) return;

    const ak = e.target.dataset.allergen;
    if (ak){
      item.allergens = item.allergens || {};
      item.allergens[ak] = !!e.target.checked;
      item.updatedAt = nowISO();
      t.updatedAt = nowISO();
      saveState();
    }
  });

  // Delete row (NO confirm popup — safe delete: only if empty name OR shift key)
  $("#itemsTable").addEventListener("click", (e)=>{
    const btn = e.target.closest(".btnDelRow");
    if (!btn) return;

    const tr = btn.closest("tr[data-id]");
    const id = tr.getAttribute("data-id");
    const item = t.items.find(x=>x.id===id);

    // safer: allow delete if name empty OR user holds Shift
    const canDelete = (!item?.name?.trim()) || e.shiftKey;
    if (!canDelete){
      toast("To delete a named item: hold SHIFT and click ✕");
      return;
    }

    t.items = t.items.filter(x=>x.id!==id);
    t.updatedAt = nowISO();
    saveState();
    renderItemsView();
    bindItemsView();
    toast("Row deleted.");
  });
}

// ---------- Export View ----------
function currentBaseUrl(){
  // Works on GitHub Pages & local
  const u = new URL(location.href);
  u.pathname = u.pathname.replace(/\/index\.html?$/,"/"); // keep folder root
  u.search = "";
  u.hash = "";
  return u.toString();
}

function customerLinkFor(slug){
  return `${currentBaseUrl()}customer.html?t=${encodeURIComponent(slug)}`;
}

function renderExportView(){
  const t = getTakeaway();
  const slug = t.slug;

  const link = customerLinkFor(slug);

  $("#viewExport").innerHTML = `
    <div class="row space wrap">
      <div>
        <div class="h2">Export</div>
        <div class="p muted small">Website / JustEat / UberEats pe ye link ya QR use karo.</div>
      </div>
      <button id="btnBackToItems" class="btn">Back</button>
    </div>

    <hr class="hr"/>

    <div class="row wrap gap" style="margin-bottom:12px">
      <div style="flex:1; min-width:260px">
        <div class="p small muted">Business name (customer page)</div>
        <input id="bizName" class="input" value="${escapeAttr(t.name)}" />
      </div>
      <div class="row wrap gap" style="align-self:end">
        <button id="btnSaveBizName" class="btn primary">Save name</button>
        <button id="btnResetTakeaway" class="btn danger">Reset this takeaway</button>
      </div>
    </div>

    <div class="row wrap gap">
      <div class="card" style="flex:1; min-width:280px; box-shadow:none">
        <div class="h2" style="font-size:15px">Share link (Ordering Platforms)</div>
        <div class="p small muted">Copy this link and paste into: website, JustEat, UberEats, flyers, menus.</div>
        <div style="margin-top:10px" class="p small"><b>Link:</b></div>
        <div class="p small muted" style="word-break:break-all">${escapeHtml(link)}</div>
        <div class="row wrap gap" style="margin-top:10px">
          <button id="btnOpenLink" class="btn primary">Open</button>
          <button id="btnCopyLink" class="btn">Copy</button>
        </div>
      </div>

      <div class="card" style="flex:1; min-width:280px; box-shadow:none">
        <div class="h2" style="font-size:15px">QR (PNG download)</div>
        <div class="p small muted">QR ko website / flyers / counter / JustEat bio etc me use karo.</div>

        <div class="row wrap gap" style="margin-top:10px">
          <img id="qrImg" alt="QR" class="qr-img" style="width:180px;height:180px;border-radius:16px;border:1px solid var(--border)" />
          <div style="flex:1">
            <button id="btnQRopen" class="btn primary">Open Link</button>
            <button id="btnQRcopy" class="btn">Copy Link</button>
            <button id="btnQRdownload" class="btn">Download QR PNG</button>
            <div class="p small muted" style="margin-top:10px">No 404 ✅ (QR is generated online & downloaded)</div>
          </div>
        </div>
      </div>
    </div>

    <hr class="hr"/>

    <div class="row wrap gap">
      <div class="card" style="flex:1; min-width:320px; box-shadow:none">
        <div class="h2" style="font-size:15px">CSV Import / Export (Selected takeaway)</div>
        <div class="p small muted">1 takeaway ke items ko CSV me export/import.</div>
        <div class="row wrap gap" style="margin-top:10px">
          <button id="btnDlTemplate" class="btn">Download CSV Template</button>
          <button id="btnExportCSV" class="btn primary">Export items as CSV</button>
          <label class="btn">
            Import CSV
            <input id="fileImportCSV" type="file" accept=".csv,text/csv" style="display:none">
          </label>
        </div>
      </div>

      <div class="card" style="flex:1; min-width:320px; box-shadow:none">
        <div class="h2" style="font-size:15px">Bulk CSV (100 takeaways in ONE file)</div>
        <div class="p small muted">Ek CSV me 100 takeaways + items. Import auto create takeaways.</div>
        <div class="row wrap gap" style="margin-top:10px">
          <button id="btnDlBulkTemplate" class="btn">Download Bulk Template</button>
          <button id="btnExportBulkCSV" class="btn primary">Export ALL as Bulk CSV</button>
          <label class="btn">
            Import BULK CSV
            <input id="fileImportBulk" type="file" accept=".csv,text/csv" style="display:none">
          </label>
        </div>
      </div>
    </div>

    <hr class="hr"/>

    <div class="card" style="box-shadow:none">
      <div class="h2" style="font-size:15px">QR Sheet (ALL takeaways)</div>
      <div class="p small muted">Ek page par sab takeaways ke QR + link. Print/Save PDF.</div>
      <button id="btnOpenQRsheet" class="btn primary" style="margin-top:10px">Open QR Sheet (Print / Save PDF)</button>
    </div>
  `;
}

function bindExportView(){
  $("#btnBackToItems").addEventListener("click", ()=>setTab("items"));

  $("#btnSaveBizName").addEventListener("click", ()=>{
    const t = getTakeaway();
    t.name = $("#bizName").value.trim() || t.name;
    t.updatedAt = nowISO();
    saveState();
    renderTakeawaySelect();
    renderExportView();
    bindExportView();
    toast("Saved.");
  });

  $("#btnResetTakeaway").addEventListener("click", ()=>{
    // no confirm popup: safe reset requires user typing RESET in promptless way -> use second click within 2 sec
    const t = getTakeaway();
    const k = "reset_armed_" + t.slug;
    const armed = sessionStorage.getItem(k) === "1";
    if (!armed){
      sessionStorage.setItem(k, "1");
      toast("Click again within 2s to RESET this takeaway");
      setTimeout(()=>sessionStorage.removeItem(k), 2000);
      return;
    }
    t.items = [];
    t.updatedAt = nowISO();
    saveState();
    renderItemsView(); bindItemsView();
    renderExportView(); bindExportView();
    toast("Reset done.");
  });

  const t = getTakeaway();
  const link = customerLinkFor(t.slug);

  $("#btnOpenLink").addEventListener("click", ()=>window.open(link, "_blank"));
  $("#btnCopyLink").addEventListener("click", async ()=>{
    await navigator.clipboard.writeText(link);
    toast("Link copied.");
  });

  // QR generation via free QR service (no 404)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;
  $("#qrImg").src = qrUrl;

  $("#btnQRopen").addEventListener("click", ()=>window.open(link, "_blank"));
  $("#btnQRcopy").addEventListener("click", async ()=>{
    await navigator.clipboard.writeText(link);
    toast("Link copied.");
  });

  $("#btnQRdownload").addEventListener("click", async ()=>{
    // download QR PNG (fetch blob)
    try{
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slugify(getTakeaway().name)}-qr.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
      toast("QR PNG downloaded.");
    }catch{
      toast("Download failed. Try right-click QR image → Save image as…");
    }
  });

  // CSV template
  $("#btnDlTemplate").addEventListener("click", ()=>{
    const header = ["name","category","ingredients","note", ...ALLERGENS.map(a=>a.key)];
    downloadText(header.join(",")+"\n", "items-template.csv");
  });

  $("#btnExportCSV").addEventListener("click", ()=>{
    const t = getTakeaway();
    const csv = itemsToCSV(t.items);
    downloadText(csv, `${slugify(t.name)}-items.csv`);
  });

  $("#fileImportCSV").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const rows = parseCSV(text);
    const items = csvToItems(rows);
    const t = getTakeaway();
    t.items = items;
    t.updatedAt = nowISO();
    saveState();
    renderItemsView(); bindItemsView();
    toast(`Imported ${items.length} items.`);
    e.target.value = "";
  });

  // Bulk template
  $("#btnDlBulkTemplate").addEventListener("click", ()=>{
    const header = ["takeaway_slug","takeaway_name","name","category","ingredients","note", ...ALLERGENS.map(a=>a.key)];
    downloadText(header.join(",")+"\n", "bulk-template.csv");
  });

  $("#btnExportBulkCSV").addEventListener("click", ()=>{
    const csv = exportAllToBulkCSV();
    downloadText(csv, "bulk-all-takeaways.csv");
  });

  $("#fileImportBulk").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    const rows = parseCSV(text);
    const report = importBulkCSV(rows);
    saveState();
    renderTakeawaySelect();
    renderItemsView(); bindItemsView();
    toast(`Bulk imported: ${report.takeaways} takeaways, ${report.items} items.`);
    e.target.value = "";
  });

  $("#btnOpenQRsheet").addEventListener("click", ()=>{
    openQRsheetWindow();
  });
}

// ---------- CSV Helpers ----------
function csvEscape(v){
  const s = (v ?? "").toString();
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"','""')}"`;
  return s;
}

function downloadText(text, filename){
  const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
}

function parseCSV(text){
  // simple CSV parser (handles quotes)
  const rows = [];
  let row = [];
  let cur = "";
  let inQ = false;

  for (let i=0;i<text.length;i++){
    const ch = text[i];
    const next = text[i+1];

    if (ch === '"' ){
      if (inQ && next === '"'){ cur+='"'; i++; }
      else inQ = !inQ;
      continue;
    }

    if (!inQ && ch === ","){
      row.push(cur); cur="";
      continue;
    }

    if (!inQ && (ch === "\n" || ch === "\r")){
      if (ch === "\r" && next === "\n") i++;
      row.push(cur); cur="";
      // skip empty line
      if (row.some(x=>x.trim()!=="")) rows.push(row);
      row = [];
      continue;
    }

    cur += ch;
  }
  row.push(cur);
  if (row.some(x=>x.trim()!=="")) rows.push(row);

  // map to objects by header
  const header = (rows[0] || []).map(h=>h.trim());
  const out = [];
  for (let i=1;i<rows.length;i++){
    const obj = {};
    for (let c=0;c<header.length;c++){
      obj[header[c]] = rows[i][c] ?? "";
    }
    out.push(obj);
  }
  return out;
}

function itemsToCSV(items){
  const header = ["name","category","ingredients","note", ...ALLERGENS.map(a=>a.key)];
  const lines = [header.join(",")];

  for (const it of items){
    const alls = it.allergens || {};
    const vals = [
      it.name||"",
      it.category||"",
      it.ingredients||"",
      it.note||"",
      ...ALLERGENS.map(a=>alls[a.key] ? "1" : "0")
    ].map(csvEscape);
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

function csvToItems(rows){
  const items = [];
  for (const r of rows){
    const allergens = {};
    for (const a of ALLERGENS){
      const v = (r[a.key] ?? "").toString().trim().toLowerCase();
      allergens[a.key] = (v === "1" || v === "true" || v === "yes" || v === "y");
    }
    items.push({
      id: "it-" + Math.random().toString(16).slice(2),
      name: (r.name||"").trim(),
      category: (r.category||"").trim(),
      ingredients: (r.ingredients||"").trim(),
      note: (r.note||"").trim(),
      allergens,
      createdAt: nowISO(),
      updatedAt: nowISO()
    });
  }
  // remove empty names
  return items.filter(x=>x.name.trim()!=="");
}

function exportAllToBulkCSV(){
  const header = ["takeaway_slug","takeaway_name","name","category","ingredients","note", ...ALLERGENS.map(a=>a.key)];
  const lines = [header.join(",")];

  const slugs = state.order && state.order.length ? state.order : Object.keys(state.takeaways);
  for (const sl of slugs){
    const tw = state.takeaways[sl];
    for (const it of (tw.items||[])){
      const alls = it.allergens || {};
      const vals = [
        tw.slug,
        tw.name,
        it.name||"",
        it.category||"",
        it.ingredients||"",
        it.note||"",
        ...ALLERGENS.map(a=>alls[a.key] ? "1" : "0")
      ].map(csvEscape);
      lines.push(vals.join(","));
    }
    // if no items, still allow create takeaway by one blank row? skip
  }
  return lines.join("\n");
}

function importBulkCSV(rows){
  let takeawaysCount = 0;
  let itemsCount = 0;

  for (const r of rows){
    const twSlug = slugify((r.takeaway_slug||"").trim() || (r.takeaway_name||"").trim());
    const twName = (r.takeaway_name||"").trim() || twSlug;

    if (!twSlug) continue;

    if (!state.takeaways[twSlug]){
      state.takeaways[twSlug] = { slug: twSlug, name: twName, items: [], createdAt: nowISO(), updatedAt: nowISO() };
      state.order = state.order || [];
      state.order.push(twSlug);
      takeawaysCount++;
    } else {
      // update name if provided
      if (twName) state.takeaways[twSlug].name = twName;
    }

    const name = (r.name||"").trim();
    if (!name) continue;

    const allergens = {};
    for (const a of ALLERGENS){
      const v = (r[a.key] ?? "").toString().trim().toLowerCase();
      allergens[a.key] = (v === "1" || v === "true" || v === "yes" || v === "y");
    }

    state.takeaways[twSlug].items.push({
      id: "it-" + Math.random().toString(16).slice(2),
      name,
      category: (r.category||"").trim(),
      ingredients: (r.ingredients||"").trim(),
      note: (r.note||"").trim(),
      allergens,
      createdAt: nowISO(),
      updatedAt: nowISO()
    });

    itemsCount++;
    state.takeaways[twSlug].updatedAt = nowISO();
  }

  // ensure active
  ensureActiveValid();
  return { takeaways: takeawaysCount, items: itemsCount };
}

// ---------- QR Sheet ----------
function openQRsheetWindow(){
  const slugs = state.order && state.order.length ? state.order : Object.keys(state.takeaways);
  const base = currentBaseUrl();

  const cards = slugs.map(sl=>{
    const tw = state.takeaways[sl];
    const link = customerLinkFor(sl);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(link)}`;
    return `
      <div style="border:1px solid rgba(255,255,255,.12); border-radius:16px; padding:14px; margin:10px; width:300px; display:inline-block; vertical-align:top; background:rgba(0,0,0,.25)">
        <div style="font-weight:900; font-size:16px">${escapeHtml(tw.name)}</div>
        <div style="color:rgba(255,255,255,.70); font-size:12px">Items: ${(tw.items||[]).length}</div>
        <img src="${qr}" style="width:240px;height:240px;border-radius:14px;border:1px solid rgba(255,255,255,.10); margin-top:10px"/>
        <div style="margin-top:10px; font-size:12px; word-break:break-all; color:rgba(255,255,255,.80)">${escapeHtml(link)}</div>
      </div>
    `;
  }).join("");

  const w = window.open("", "_blank");
  w.document.write(`
    <html>
      <head>
        <title>QR Sheet</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
      </head>
      <body style="background:#070b14; color:#e8edf7; font-family:system-ui; padding:16px">
        <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap">
          <div>
            <div style="font-weight:900; font-size:18px">QR Sheet (All takeaways)</div>
            <div style="opacity:.7; font-size:12px">${escapeHtml(base)}</div>
          </div>
          <div>
            <button onclick="window.print()" style="padding:10px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.08); color:#e8edf7; font-weight:800; cursor:pointer">Print / Save PDF</button>
          </div>
        </div>
        <div style="margin-top:14px">${cards}</div>
      </body>
    </html>
  `);
  w.document.close();
}

// ---------- Takeaway CRUD (no popups) ----------
function inlineModal(html){
  // tiny inline modal inside page (not browser prompt)
  let m = document.getElementById("inlineModal");
  if (m) m.remove();
  m = document.createElement("div");
  m.id = "inlineModal";
  m.style.position="fixed";
  m.style.inset="0";
  m.style.background="rgba(0,0,0,.55)";
  m.style.display="grid";
  m.style.placeItems="center";
  m.style.zIndex="999";
  m.innerHTML = `
    <div style="width:min(520px,92vw); background:#0b1326; border:1px solid rgba(255,255,255,.12); border-radius:18px; padding:16px; box-shadow:0 20px 80px rgba(0,0,0,.65)">
      ${html}
    </div>
  `;
  document.body.appendChild(m);
  return m;
}

function closeInlineModal(){
  const m = document.getElementById("inlineModal");
  if (m) m.remove();
}

function openTakeawayForm(mode){
  const t = getTakeaway();
  const title = mode === "new" ? "Create new takeaway" : (mode==="rename" ? "Rename takeaway" : "Delete takeaway");
  const note =
    mode === "delete"
      ? "Type the takeaway name to confirm delete (no popup)."
      : "Name enter karo. Slug auto banay ga (link ke liye).";

  const defaultVal = mode==="rename" ? t.name : "";

  const m = inlineModal(`
    <div class="h2">${title}</div>
    <div class="p muted small">${note}</div>
    <div style="margin-top:12px">
      <input id="twNameInput" class="input" placeholder="e.g. Crust Blackburn" value="${escapeAttr(defaultVal)}"/>
    </div>
    <div class="row" style="margin-top:12px; justify-content:flex-end">
      <button id="twCancel" class="btn">Cancel</button>
      <button id="twOk" class="btn primary">${mode==="delete" ? "Delete" : "Save"}</button>
    </div>
    ${mode==="delete" ? `<div class="p small muted" style="margin-top:10px">Delete will remove items for this takeaway.</div>` : ""}
  `);

  m.querySelector("#twCancel").addEventListener("click", closeInlineModal);

  m.querySelector("#twOk").addEventListener("click", ()=>{
    const val = (m.querySelector("#twNameInput").value || "").trim();

    if (mode === "new"){
      if (!val) return toast("Name required.");
      const sl = slugify(val);
      if (state.takeaways[sl]) return toast("This slug already exists. Use different name.");
      state.takeaways[sl] = { slug: sl, name: val, items: [], createdAt: nowISO(), updatedAt: nowISO() };
      state.order = state.order || [];
      state.order.push(sl);
      state.active = sl;
      saveState();
      closeInlineModal();
      renderAll();
      toast("Takeaway created.");
      return;
    }

    if (mode === "rename"){
      if (!val) return toast("Name required.");
      const tw = getTakeaway();
      tw.name = val;
      tw.updatedAt = nowISO();
      saveState();
      closeInlineModal();
      renderAll();
      toast("Renamed.");
      return;
    }

    if (mode === "delete"){
      const tw = getTakeaway();
      if (val.toLowerCase() !== (tw.name||"").toLowerCase()){
        toast("Type exact takeaway name to delete.");
        return;
      }
      // remove
      delete state.takeaways[tw.slug];
      state.order = (state.order||[]).filter(x=>x!==tw.slug);
      ensureActiveValid();
      saveState();
      closeInlineModal();
      renderAll();
      toast("Deleted.");
      return;
    }
  });
}

// ---------- Main render ----------
function renderAll(){
  renderTakeawaySelect();
  renderItemsView();
  renderExportView();
  bindTop();
  bindItemsView();
  bindExportView();
}

function bindTop(){
  $("#tabItems").onclick = ()=>setTab("items");
  $("#tabExport").onclick = ()=>setTab("export");
  $("#takeawaySelect").onchange = (e)=>setActive(e.target.value);

  $("#btnNewTakeaway").onclick = ()=>openTakeawayForm("new");
  $("#btnRenameTakeaway").onclick = ()=>openTakeawayForm("rename");
  $("#btnDeleteTakeaway").onclick = ()=>openTakeawayForm("delete");
}

(function init(){
  ensureActiveValid();
  setTab("items");
  renderAll();
})();
