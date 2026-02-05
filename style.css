:root{
  --bg:#070b12;
  --panel:#0c1322;
  --panel2:#0b1220;
  --text:#e7eefc;
  --muted:#9fb3d7;
  --line:rgba(255,255,255,.10);
  --good:#23c55e;
  --danger:#ef4444;
  --warn:#f59e0b;
  --chip:rgba(255,255,255,.08);
  --shadow: 0 20px 60px rgba(0,0,0,.35);
  --radius:18px;
  --radius2:22px;
  --pad:16px;
  --font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans";
}

*{box-sizing:border-box}
body{
  margin:0;
  background: radial-gradient(1200px 600px at 10% 0%, #0b1a34 0%, var(--bg) 60%);
  color:var(--text);
  font-family:var(--font);
}

a{color:#9bd0ff; text-decoration:none}
a:hover{text-decoration:underline}

.topbar{
  position:sticky; top:0;
  backdrop-filter: blur(10px);
  background: rgba(7,11,18,.65);
  border-bottom:1px solid var(--line);
  padding:14px 16px;
  display:flex; align-items:center; justify-content:space-between;
  z-index:10;
}

.brand{display:flex; gap:12px; align-items:center}
.logo{
  width:38px; height:38px; border-radius:12px;
  display:grid; place-items:center;
  background: rgba(255,255,255,.08);
  border:1px solid var(--line);
}
.title{font-weight:800; font-size:16px}
.subtitle{color:var(--muted); font-size:12px; margin-top:2px}

.container{
  max-width:1100px;
  margin:20px auto;
  padding:0 16px 60px;
}

.card{
  background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
  border:1px solid var(--line);
  border-radius: var(--radius2);
  box-shadow: var(--shadow);
  padding: var(--pad);
}

.row{display:flex; gap:12px; flex-wrap:wrap; align-items:center}
.row.space{justify-content:space-between}
.stack{display:flex; flex-direction:column; gap:12px}

.h1{font-size:22px; font-weight:800; margin:0}
.h2{font-size:16px; font-weight:800; margin:0}
.p{color:var(--muted); margin:6px 0 0; font-size:13px}

hr.sep{border:none; border-top:1px solid var(--line); margin:14px 0}

.btn{
  padding:10px 12px;
  border-radius: 14px;
  border:1px solid var(--line);
  background: rgba(255,255,255,.06);
  color:var(--text);
  cursor:pointer;
  font-weight:700;
  font-size:13px;
}
.btn:hover{background: rgba(255,255,255,.09)}
.btn.primary{
  background: rgba(35,197,94,.16);
  border-color: rgba(35,197,94,.35);
}
.btn.danger{
  background: rgba(239,68,68,.14);
  border-color: rgba(239,68,68,.35);
}
.btn.ghost{
  background: transparent;
}
.btn.small{padding:8px 10px; border-radius:12px; font-size:12px}

.input, select, textarea{
  background: rgba(0,0,0,.18);
  border:1px solid var(--line);
  border-radius: 14px;
  color: var(--text);
  padding:10px 12px;
  outline:none;
}
.input::placeholder, textarea::placeholder{color: rgba(231,238,252,.45)}
textarea{min-height:88px; resize:vertical}

.grid2{display:grid; grid-template-columns: 1.2fr .8fr; gap:14px}
@media (max-width: 900px){
  .grid2{grid-template-columns:1fr}
}

.table{
  width:100%;
  border-collapse:collapse;
  overflow:hidden;
  border-radius:16px;
  border:1px solid var(--line);
}
.table th, .table td{
  text-align:left;
  padding:10px 10px;
  border-bottom:1px solid var(--line);
  font-size:13px;
  vertical-align:top;
}
.table th{color:#cfe0ff; font-size:12px; letter-spacing:.02em}
.table tr:last-child td{border-bottom:none}
.table .muted{color:var(--muted); font-size:12px}

.chips{display:flex; flex-wrap:wrap; gap:8px}
.chip{
  background: var(--chip);
  border:1px solid var(--line);
  border-radius: 999px;
  padding:6px 10px;
  font-size:12px;
  color: #d8e6ff;
}
.chip.red{
  background: rgba(239,68,68,.14);
  border-color: rgba(239,68,68,.35);
}
.chip.green{
  background: rgba(35,197,94,.14);
  border-color: rgba(35,197,94,.35);
}
.badge{
  font-size:11px;
  padding:3px 8px;
  border-radius:999px;
  border:1px solid var(--line);
  background: rgba(255,255,255,.06);
  color: var(--muted);
}

.kbd{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono";
  font-size:12px;
  background: rgba(0,0,0,.25);
  border:1px solid var(--line);
  padding:2px 6px;
  border-radius:8px;
  color:#cfe0ff;
}

.notice{
  background: rgba(255,255,255,.05);
  border:1px solid var(--line);
  border-radius: 16px;
  padding:12px;
  color: var(--muted);
  font-size:13px;
}

.qr-grid{
  display:grid;
  grid-template-columns: repeat(3, 1fr);
  gap:14px;
}
@media(max-width: 950px){
  .qr-grid{grid-template-columns: repeat(2, 1fr);}
}
@media(max-width: 650px){
  .qr-grid{grid-template-columns: 1fr;}
}
.qr-card{
  background: rgba(0,0,0,.22);
  border:1px solid var(--line);
  border-radius: 18px;
  padding:12px;
}
.qr-title{font-weight:900; margin:0 0 6px}
.qr-sub{color:var(--muted); font-size:12px; margin:0 0 10px}
.qr-img{
  width:100%;
  max-width:320px;
  border-radius:14px;
  border:1px solid var(--line);
  background:white;
  padding:10px;
}
.smalllink{
  word-break: break-all;
  font-size:12px;
  color: #bcd2ff;
  margin-top:10px;
}
