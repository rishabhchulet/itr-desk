// Turns data/due-dates.json rules into the next N upcoming deadlines.

let cache = null;

export async function loadRules() {
  if (cache) return cache;
  const url = chrome.runtime.getURL('data/due-dates.json');
  const res = await fetch(url);
  cache = await res.json();
  return cache;
}

function dateFor(year, month, day) {
  return new Date(year, month - 1, day, 23, 59, 59);
}

/** @returns {Promise<Array<{id:string,label:string,date:Date,daysLeft:number,note?:string}>>} */
export async function upcoming(limit = 5, from = new Date()) {
  const { rules } = await loadRules();
  const items = [];
  const y = from.getFullYear();
  for (const r of rules) {
    if (r.every === 'month') {
      for (let m = 0; m < 14; m++) {
        const d = new Date(y, from.getMonth() + m, r.day, 23, 59, 59);
        if ((r.skipMonths || []).includes(d.getMonth() + 1)) continue;
        if (d >= from) { items.push({ ...r, date: d }); break; }
      }
    } else {
      let d = dateFor(y, r.month, r.day);
      if (d < from) d = dateFor(y + 1, r.month, r.day);
      items.push({ ...r, date: d });
    }
  }
  items.sort((a, b) => a.date - b.date);
  const dayMs = 24 * 60 * 60 * 1000;
  return items.slice(0, limit).map((i) => ({
    ...i,
    daysLeft: Math.ceil((i.date - from) / dayMs)
  }));
}

export function formatDate(d) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
