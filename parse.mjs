import fs from 'node:fs';

const raw = fs.readFileSync(new URL('./sheet.csv', import.meta.url), 'utf8');

// --- minimal RFC-4180 CSV parser (handles quotes, escaped quotes, multiline) ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCSV(raw);
const header = rows[0];

const num = (v) => {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
};
const clean = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

// Classify payment method into a segment + cadence
function classify(method) {
  const m = clean(method);
  if (/Vantage Only|Old client/i.test(m)) return { segment: 'Vantage / Old client', cadence: 'none' };
  if (/Month_Rakosell/i.test(m)) return { segment: 'Monthly · Rakosell', cadence: 'monthly' };
  if (/Month_Stripe/i.test(m)) return { segment: 'Monthly · Stripe', cadence: 'monthly' };
  if (/年費FPS/i.test(m)) return { segment: 'Annual · FPS', cadence: 'annual' };
  if (/年費/.test(m)) return { segment: 'Annual', cadence: 'annual' };
  if (/新聞/.test(m)) return { segment: 'News', cadence: 'other' };
  return { segment: m || 'Unknown', cadence: 'other' };
}

// Robust-ish date parse for the messy date column. Returns YYYY-MM-DD or ''.
function parseDate(v) {
  const s = clean(v);
  if (!s) return '';
  // formats seen: 2026/7/9, 2026-7-9, 15/11/2025, 27/2/2026, 2026/01/02
  let m;
  if ((m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/))) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  if ((m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/))) {
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return ''; // unparseable free-text note
}

const members = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  if (!r) continue;
  const email = clean(r[1]);
  const realName = clean(r[2]);
  const tgName = clean(r[3]);
  const tgId = clean(r[4]);
  const vantage = clean(r[5]);
  const tvId = clean(r[6]);
  const method = clean(r[8]);
  // skip fully empty spacer rows
  if (!email && !realName && !tgName && !tgId && !vantage && !method) continue;

  const { segment, cadence } = classify(method);
  const paymentAmt = num(r[9]);   // amount actually paid (annual lump or monthly)
  const monthly = num(r[10]);     // normalised per-month value
  const lastPay = parseDate(r[11]);
  const nextPayRaw = clean(r[12]);
  const nextPay = parseDate(r[12]);
  const promo = clean(r[13]);

  members.push({
    email, realName, tgName, tgId, vantage, tvId,
    method, segment, cadence,
    paymentAmt, monthly,
    lastPay, nextPay, nextPayRaw,
    promo,
    survey: clean(r[7]),
  });
}

const out = { generated: '2026-06-26', members };
fs.writeFileSync(new URL('./members.json', import.meta.url), JSON.stringify(out));

// quick console summary
const bySeg = {};
let mrr = 0, paying = 0;
for (const m of members) {
  bySeg[m.segment] = (bySeg[m.segment] || 0) + 1;
  if (m.cadence !== 'none' && m.monthly > 0) { mrr += m.monthly; paying++; }
}
console.log('Total records:', members.length);
console.log('Paying members:', paying);
console.log('Est. MRR (HKD):', Math.round(mrr));
console.log('By segment:', bySeg);
