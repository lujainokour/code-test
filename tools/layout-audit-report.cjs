/* Summarises docs/evidence/layout-audit/<phase>/results.json (written by tests/layout-audit-browser.ps1).
   Usage: node tools/layout-audit-report.cjs before|after [--json]   */
const fs = require('node:fs'), path = require('node:path');
const phase = process.argv[2] || 'before';
const file = path.resolve(__dirname, '..', `docs/evidence/layout-audit/${phase}/results.json`);
const data = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const list = v => Array.isArray(v) ? v : v ? [v] : [];
const rows = list(data.results).map(r => {
    const per = {};
    for (const [w, m] of Object.entries(r.widths)) for (const i of list(m.issues)) {
        const key = `${i.type}|${i.at}`;
        (per[key] ||= { type: i.type, at: i.at, widths: [], detail: i })
        per[key].widths.push(w);
    }
    const g = r.glass || {};
    const glassProblems = [];
    if (g.glass) {
        if (!g.backdrop) glassProblems.push('no backdrop gradient');
        if (g.sidebarBlur === 'none') glassProblems.push('sidebar not blurred');
        for (const s of list(g.solid)) if (s.alpha < 1 || (s.blur && s.blur !== 'none')) glassProblems.push(`${s.el} not opaque`);
    }
    return { role: r.role, page: r.page, url: r.url, issues: Object.values(per), overflow: Object.entries(r.widths).filter(([, m]) => m.overflow).map(([w]) => w),
        glass: g.glass === true, glassProblems, events: list((data.events || {})[`${r.role} ${r.page}`]) };
});
const totals = {};
for (const r of rows) for (const i of r.issues) totals[i.type] = (totals[i.type] || 0) + 1;
if (process.argv.includes('--json')) { console.log(JSON.stringify({ phase, pages: rows.length, totals, rows }, null, 1)); process.exit(0); }
console.log(`# Layout audit (${phase}): ${rows.length} page visits`);
console.log('Totals: ' + Object.entries(totals).map(([k, v]) => `${k} ${v}`).join(', '));
console.log(`Overflow: ${rows.filter(r => r.overflow.length).length} visits; JS problems: ${rows.filter(r => r.events.length).length} visits; glass problems: ${rows.filter(r => r.glassProblems.length).length} visits; glass pages: ${rows.filter(r => r.glass).length}`);
for (const r of rows) {
    if (!r.issues.length && !r.overflow.length && !r.events.length && !r.glassProblems.length) continue;
    console.log(`\n## ${r.role} ${r.page}${r.url && !r.page.startsWith(r.url.split('?')[0]) ? ` (-> ${r.url})` : ''}`);
    for (const i of r.issues) console.log(`- ${i.type} at ${i.at} [${i.widths.join(',')}] ${JSON.stringify(Object.fromEntries(Object.entries(i.detail).filter(([k]) => !['type', 'at'].includes(k))))}`);
    if (r.overflow.length) console.log(`- horizontal overflow at ${r.overflow.join(',')}`);
    for (const e of r.events) console.log(`- ${e.slice(0, 200)}`);
    for (const g of r.glassProblems) console.log(`- glass: ${g}`);
}
