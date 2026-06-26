// Builds share.html — a password-protected, AES-256-GCM encrypted single-file app.
// Data is encrypted at rest; only someone with the password can decrypt it in-browser.
// Usage:
//   APP_PASSWORD='your-pass' node encrypt.mjs      (bash / git-bash)
//   $env:APP_PASSWORD='your-pass'; node encrypt.mjs (PowerShell)
// If APP_PASSWORD is not set, a strong random passphrase is generated and printed.

import fs from 'node:fs';
import crypto from 'node:crypto';

const plaintext = fs.readFileSync(new URL('./members.json', import.meta.url));

// --- password ---
let password = process.env.APP_PASSWORD;
let generated = false;
if (!password) {
  const words = ['tiger','river','amber','comet','maple','delta','orbit','quartz','ember','lotus','pixel','raven'];
  const pick = () => words[crypto.randomInt(words.length)];
  password = `${pick()}-${pick()}-${crypto.randomInt(1000, 9999)}`;
  generated = true;
}

// --- crypto params (must match the browser SubtleCrypto code below) ---
const ITER = 250000;
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(password, salt, ITER, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();
// Web Crypto expects ciphertext||tag together:
const blob = Buffer.concat([enc, tag]);

const b64 = (b) => b.toString('base64');
const payload = { salt: b64(salt), iv: b64(iv), iter: ITER, data: b64(blob) };

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Member Dashboard</title>
<style>
  :root{
    --bg:#0b0f17; --panel:#141a24; --panel2:#1b2330; --line:#26303f;
    --txt:#e6edf3; --muted:#8b97a7; --accent:#4f8cff; --good:#3fbf7f;
    --warn:#f5a623; --bad:#ef5b6b; --chip:#222d3d;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang HK","Microsoft JhengHei",sans-serif;
    background:var(--bg);color:var(--txt);font-size:14px}
  header{padding:20px 24px;border-bottom:1px solid var(--line);display:flex;align-items:baseline;gap:14px;flex-wrap:wrap}
  header h1{margin:0;font-size:19px;font-weight:650}
  header .sub{color:var(--muted);font-size:13px}
  .wrap{padding:20px 24px;max-width:1280px;margin:0 auto}
  .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:20px}
  .kpi{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .kpi .label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .kpi .val{font-size:26px;font-weight:700;margin-top:6px}
  .kpi .val small{font-size:13px;font-weight:500;color:var(--muted)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  @media(max-width:880px){.grid2{grid-template-columns:1fr}}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px}
  .card h2{margin:0 0 14px;font-size:14px;font-weight:600;color:var(--txt)}
  .bar-row{display:flex;align-items:center;gap:10px;margin:9px 0}
  .bar-row .name{width:150px;font-size:13px;color:var(--muted);flex-shrink:0}
  .bar-track{flex:1;background:var(--panel2);border-radius:6px;height:22px;overflow:hidden}
  .bar-fill{height:100%;border-radius:6px;display:flex;align-items:center;padding:0 8px;font-size:12px;font-weight:600;color:#fff;white-space:nowrap}
  .controls{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center}
  input[type=search],input[type=password],select{background:var(--panel2);border:1px solid var(--line);color:var(--txt);
    border-radius:8px;padding:9px 12px;font-size:13px;outline:none}
  input[type=search]{flex:1;min-width:200px}
  input:focus,select:focus{border-color:var(--accent)}
  .chip{background:var(--chip);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:12px;
    color:var(--muted);cursor:pointer;user-select:none}
  .chip.active{background:var(--accent);color:#fff;border-color:var(--accent)}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.03em;cursor:pointer;white-space:nowrap}
  th:hover{color:var(--txt)}
  tbody tr:hover{background:var(--panel2)}
  .tag{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap}
  .t-monthly{background:#1e3a5f;color:#7db4ff}
  .t-annual{background:#1f3d2e;color:#6fd6a0}
  .t-none{background:#33271a;color:#f5b86a}
  .t-other{background:#3a2740;color:#d59cf0}
  .due-soon{color:var(--warn);font-weight:600}
  .due-over{color:var(--bad);font-weight:600}
  .muted{color:var(--muted)}
  .right{text-align:right}
  .tablecard{overflow-x:auto}
  .count{color:var(--muted);font-size:13px;margin-left:auto}
  footer{padding:18px 24px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);margin-top:24px}
  a{color:var(--accent);text-decoration:none}
  /* lock screen */
  #lock{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg);z-index:10}
  #lock .box{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:28px;width:330px;max-width:90vw;text-align:center}
  #lock h1{font-size:20px;margin:0 0 6px}
  #lock p{color:var(--muted);font-size:13px;margin:0 0 18px}
  #lock input{width:100%;margin-bottom:12px;padding:11px 12px;font-size:14px}
  #lock button{width:100%;background:var(--accent);color:#fff;border:0;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer}
  #lock button:disabled{opacity:.6;cursor:default}
  #lockErr{color:var(--bad);font-size:13px;min-height:18px;margin-top:10px}
  #app{display:none}
</style>
</head>
<body>
<div id="lock">
  <div class="box">
    <h1>🔒 Member Dashboard</h1>
    <p>請輸入密碼睇資料<br/>Enter password to view</p>
    <input id="pw" type="password" placeholder="Password" autofocus />
    <button id="go">解鎖 Unlock</button>
    <div id="lockErr"></div>
  </div>
</div>

<div id="app">
<header>
  <h1>📊 Member Dashboard</h1>
  <span class="sub">Trading-signal membership · Vantage / TradingView / Telegram &nbsp;|&nbsp; data as of <b id="asof"></b></span>
</header>
<div class="wrap">
  <div class="kpis" id="kpis"></div>
  <div class="grid2">
    <div class="card"><h2>Members by segment</h2><div id="segChart"></div></div>
    <div class="card"><h2>Monthly recurring revenue by segment <span class="muted">(HKD / mo)</span></h2><div id="revChart"></div></div>
  </div>
  <div class="card" style="margin-bottom:20px">
    <h2>⏰ Renewals due in next 60 days</h2>
    <div class="tablecard"><table id="renewTable">
      <thead><tr><th>Name</th><th>Segment</th><th>Next payment</th><th>In</th><th class="right">Monthly</th><th>Contact</th></tr></thead>
      <tbody></tbody></table></div>
    <div id="renewEmpty" class="muted" style="display:none;padding:8px 2px">No parseable renewal dates fall in the next 60 days.</div>
  </div>
  <div class="card">
    <h2>Member directory</h2>
    <div class="controls">
      <input type="search" id="q" placeholder="Search name, email, Telegram, Vantage acct, TradingView ID…" />
      <select id="seg"></select>
    </div>
    <div class="controls" id="chips"></div>
    <div class="tablecard"><table id="memTable">
      <thead><tr>
        <th data-k="realName">Name</th><th data-k="tgName">Telegram</th><th data-k="email">Email</th>
        <th data-k="vantage">Vantage acct</th><th data-k="segment">Segment</th>
        <th data-k="monthly" class="right">Monthly</th><th data-k="nextPay">Next pay</th>
      </tr></thead><tbody></tbody></table></div>
    <div class="controls"><span class="count" id="count"></span></div>
  </div>
</div>
<footer>
  All amounts in HKD. Data encrypted at rest (AES-256-GCM). Estimated MRR = sum of per-month value of active paying members.
  “Vantage / Old client” rows are non-paying broker-only contacts.
</footer>
</div>

<script id="payload" type="application/json">${JSON.stringify(payload)}</script>
<script>
const PAYLOAD = JSON.parse(document.getElementById('payload').textContent);
const b64ToBuf = (s)=>Uint8Array.from(atob(s), c=>c.charCodeAt(0));

async function decrypt(password){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    {name:'PBKDF2', salt:b64ToBuf(PAYLOAD.salt), iterations:PAYLOAD.iter, hash:'SHA-256'},
    keyMaterial, {name:'AES-GCM', length:256}, false, ['decrypt']);
  const plainBuf = await crypto.subtle.decrypt({name:'AES-GCM', iv:b64ToBuf(PAYLOAD.iv)}, key, b64ToBuf(PAYLOAD.data));
  return JSON.parse(new TextDecoder().decode(plainBuf));
}

const pw=document.getElementById('pw'), go=document.getElementById('go'), err=document.getElementById('lockErr');
async function attempt(){
  err.textContent=''; go.disabled=true; go.textContent='解緊…';
  try{
    const DB = await decrypt(pw.value);
    document.getElementById('lock').style.display='none';
    document.getElementById('app').style.display='block';
    init(DB);
  }catch(e){
    err.textContent='密碼錯誤 Wrong password';
    go.disabled=false; go.textContent='解鎖 Unlock'; pw.select();
  }
}
go.onclick=attempt;
pw.onkeydown=(e)=>{ if(e.key==='Enter') attempt(); };

// ---------------- dashboard ----------------
function init(DB){
  const M = DB.members;
  const TODAY = new Date(DB.generated + 'T00:00:00');
  document.getElementById('asof').textContent = DB.generated;
  const fmt = n => n.toLocaleString('en-US',{maximumFractionDigits:0});
  const cadTag = c => ({monthly:'t-monthly',annual:'t-annual',none:'t-none',other:'t-other'}[c]||'t-other');

  const paying = M.filter(m=>m.cadence!=='none' && m.monthly>0);
  const mrr = paying.reduce((s,m)=>s+m.monthly,0);
  const annual = M.filter(m=>m.cadence==='annual');
  const monthly = M.filter(m=>m.cadence==='monthly');
  const vantageOnly = M.filter(m=>m.cadence==='none');
  const kpis = [
    ['Total contacts', fmt(M.length), ''],
    ['Paying members', fmt(paying.length), ''],
    ['Est. MRR', fmt(Math.round(mrr)), 'HKD / mo'],
    ['Annualised run-rate', fmt(Math.round(mrr*12)), 'HKD / yr'],
    ['Annual members', fmt(annual.length), fmt(monthly.length)+' monthly'],
    ['Vantage-only', fmt(vantageOnly.length), 'non-paying'],
  ];
  document.getElementById('kpis').innerHTML = kpis.map(k=>
    \`<div class="kpi"><div class="label">\${k[0]}</div><div class="val">\${k[1]} <small>\${k[2]}</small></div></div>\`).join('');

  const segColors = {
    'Monthly · Rakosell':'#4f8cff','Monthly · Stripe':'#6aa2ff','Annual':'#3fbf7f',
    'Annual · FPS':'#52d6a0','News':'#d59cf0','Vantage / Old client':'#f5a623'
  };
  function groupBy(arr,key,val){const o={};for(const m of arr){o[m[key]]=(o[m[key]]||0)+(val?val(m):1);}return o;}
  function barChart(el,obj,fmtv){
    const entries=Object.entries(obj).sort((a,b)=>b[1]-a[1]);
    const max=Math.max(...entries.map(e=>e[1]),1);
    el.innerHTML=entries.map(([k,v])=>{
      const c=segColors[k]||'#4f8cff';const w=Math.max(v/max*100,2);
      return \`<div class="bar-row"><div class="name" title="\${k}">\${k}</div>
        <div class="bar-track"><div class="bar-fill" style="width:\${w}%;background:\${c}">\${fmtv(v)}</div></div></div>\`;
    }).join('');
  }
  barChart(document.getElementById('segChart'), groupBy(M,'segment'), v=>fmt(v));
  barChart(document.getElementById('revChart'), groupBy(paying,'segment',m=>m.monthly), v=>fmt(Math.round(v)));

  const DAY=86400000;
  const withDates = M.map(m=>{
    if(!m.nextPay) return null;
    const d=new Date(m.nextPay+'T00:00:00'); const days=Math.round((d-TODAY)/DAY);
    return {...m,_d:d,_days:days};
  }).filter(Boolean);
  const renew = withDates.filter(m=>m._days>=0 && m._days<=60).sort((a,b)=>a._days-b._days);
  const rt=document.querySelector('#renewTable tbody');
  if(renew.length){
    rt.innerHTML=renew.map(m=>\`<tr>
      <td>\${m.realName||m.tgName||'<span class=muted>—</span>'}</td>
      <td><span class="tag \${cadTag(m.cadence)}">\${m.segment}</span></td>
      <td>\${m.nextPay}</td>
      <td class="\${m._days<=14?'due-soon':''}">\${m._days} d</td>
      <td class="right">\${m.monthly?fmt(Math.round(m.monthly)):'—'}</td>
      <td class="muted">\${m.tgName||m.email||''}</td></tr>\`).join('');
  }else{ document.getElementById('renewEmpty').style.display='block'; }

  const segSel=document.getElementById('seg');
  const segs=[...new Set(M.map(m=>m.segment))];
  segSel.innerHTML='<option value="">All segments</option>'+segs.map(s=>\`<option>\${s}</option>\`).join('');
  const cadFilters=[['all','All'],['monthly','Monthly'],['annual','Annual'],['none','Vantage / old']];
  let curCad='all';
  document.getElementById('chips').innerHTML=cadFilters.map(([k,l])=>
    \`<span class="chip \${k==='all'?'active':''}" data-cad="\${k}">\${l}</span>\`).join('');
  document.querySelectorAll('#chips .chip').forEach(c=>c.onclick=()=>{
    curCad=c.dataset.cad;
    document.querySelectorAll('#chips .chip').forEach(x=>x.classList.toggle('active',x===c));
    render();
  });

  let sortK='monthly', sortDir=-1;
  document.querySelectorAll('#memTable th').forEach(th=>th.onclick=()=>{
    const k=th.dataset.k;
    if(k===sortK) sortDir*=-1; else {sortK=k;sortDir=1;}
    render();
  });

  const tb=document.querySelector('#memTable tbody');
  const q=document.getElementById('q');
  q.oninput=render; segSel.onchange=render;

  function render(){
    const term=q.value.toLowerCase().trim(); const seg=segSel.value;
    let rows=M.filter(m=>{
      if(curCad!=='all' && m.cadence!==curCad) return false;
      if(seg && m.segment!==seg) return false;
      if(term){
        const hay=[m.realName,m.tgName,m.tgId,m.email,m.vantage,m.tvId,m.segment].join(' ').toLowerCase();
        if(!hay.includes(term)) return false;
      }
      return true;
    });
    rows.sort((a,b)=>{
      let x=a[sortK],y=b[sortK];
      if(typeof x==='number'||typeof y==='number'){x=+x||0;y=+y||0;return (x-y)*sortDir;}
      return String(x).localeCompare(String(y))*sortDir;
    });
    tb.innerHTML=rows.map(m=>{
      const due = m.nextPay ? (()=>{const dd=Math.round((new Date(m.nextPay+'T00:00:00')-TODAY)/DAY);
        const cls=dd<0?'due-over':(dd<=60?'due-soon':'');return \`<span class="\${cls}">\${m.nextPay}</span>\`;})() :
        (m.nextPayRaw?\`<span class="muted" title="unparsed">\${m.nextPayRaw}</span>\`:'<span class="muted">—</span>');
      return \`<tr>
        <td>\${m.realName||'<span class=muted>—</span>'}</td>
        <td>\${m.tgName||'<span class=muted>—</span>'}</td>
        <td class="muted">\${m.email||'—'}</td>
        <td class="muted">\${m.vantage||'—'}</td>
        <td><span class="tag \${cadTag(m.cadence)}">\${m.segment}</span></td>
        <td class="right">\${m.monthly?fmt(Math.round(m.monthly)):'—'}</td>
        <td>\${due}</td></tr>\`;
    }).join('');
    document.getElementById('count').textContent=\`\${rows.length} of \${M.length} contacts · MRR shown \${fmt(Math.round(rows.reduce((s,m)=>s+(m.monthly||0),0)))} HKD/mo\`;
  }
  render();
}
</script>
</body>
</html>`;

fs.writeFileSync(new URL('./share.html', import.meta.url), html);
console.log('Wrote share.html (' + (html.length/1024).toFixed(1) + ' KB)');
if (generated) {
  console.log('\\n==================================================');
  console.log('  GENERATED PASSWORD:  ' + password);
  console.log('==================================================');
  console.log('Share this password with your boss (separately from the link).');
  console.log('To set your own: re-run with APP_PASSWORD set.');
}
