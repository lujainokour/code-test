/* Builds a defects list from docs/evidence/qa-sweep/results.json (written by tests/qa-sweep-browser.ps1).
   Usage: node tools/qa-sweep-report.cjs            prints JSON defects to stdout
          node tools/qa-sweep-report.cjs --table    prints a Markdown table */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/qa-sweep/results.json'), 'utf8').replace(/^﻿/, ''));
const results = Array.isArray(data.results) ? data.results : [data.results];
const events = data.events || {};
const defects = [];
const add = (role, page, viewport, defect, severity) => defects.push({ role, page, viewport, defect, severity });
const list = value => Array.isArray(value) ? value : value ? [value] : [];
for (const entry of results) {
    const { role, page } = entry;
    const widths = entry.widths;
    const at1440 = widths['1440'];
    const redirected = at1440.url.replace(/\?.*$/, '') !== page.replace(/\?.*$/, '');
    if (at1440.sheets === 0) add(role, page, 'all', 'Unstyled: no stylesheet loaded', 'High');
    if (at1440.hasMain && at1440.mainText < 40 && !redirected) add(role, page, 'all', `Main content nearly empty (${at1440.mainText} characters)`, 'High');
    if (!at1440.favicon && !redirected) add(role, page, 'all', 'No favicon link', 'Low');
    if (at1440.h1 === 0 && !redirected) add(role, page, 'all', 'No h1 page title', 'Low');
    for (const msg of list(at1440.errs)) add(role, page, 'all', `Visible error message: "${msg.slice(0, 120)}"`, 'High');
    for (const [w, m] of Object.entries(widths)) {
        if (m.over) add(role, page, w, `Horizontal scroll (page ${m.scrollWidth}px wide)${list(m.outer).length ? ': ' + list(m.outer).join(', ') : ''}`, w === '390' ? 'High' : 'Medium');
        else if (list(m.outer).length) add(role, page, w, `Element extends past the viewport (clipped, no scroll): ${list(m.outer).join(', ')}`, 'Low');
        if (list(m.small).length) add(role, page, w, `Touch targets under 44px: ${list(m.small).join(', ')}`, 'Medium');
        if (list(m.imgs).length) add(role, page, w, `Image failed to load: ${list(m.imgs).join(', ')}`, 'Medium');
        if (list(m.vids).length) add(role, page, w, `Video failed to load: ${list(m.vids).join(', ')}`, 'Medium');
        if (list(m.clipped).length) add(role, page, w, `Text clipped inside its box: ${list(m.clipped).join(', ')}`, 'Low');
    }
    for (const text of list(events[`${role} ${page}`])) add(role, page, 'all', text.slice(0, 220), /exception/.test(text) ? 'High' : 'Medium');
}
// Collapse the same defect repeated across widths into one row.
const merged = new Map();
for (const d of defects) {
    const key = `${d.role}|${d.page}|${d.defect.replace(/\d+px wide/, 'Npx wide')}`;
    if (merged.has(key)) { const m = merged.get(key); if (!m.viewport.split(', ').includes(d.viewport)) m.viewport += ', ' + d.viewport; }
    else merged.set(key, { ...d });
}
const rows = [...merged.values()].sort((a, b) => ['High', 'Medium', 'Low'].indexOf(a.severity) - ['High', 'Medium', 'Low'].indexOf(b.severity) || a.role.localeCompare(b.role) || a.page.localeCompare(b.page));
if (process.argv.includes('--table')) {
    console.log('| # | Role | Page | Viewport | Defect | Severity |\n|---|---|---|---|---|---|');
    rows.forEach((r, i) => console.log(`| ${i + 1} | ${r.role} | ${r.page} | ${r.viewport} | ${r.defect.replace(/\|/g, '\\|')} | ${r.severity} |`));
} else console.log(JSON.stringify({ pages: results.length, redirects: results.filter(e => e.widths['1440'].url.replace(/\?.*$/, '') !== e.page.replace(/\?.*$/, '')).map(e => `${e.role} ${e.page} -> ${e.widths['1440'].url}`), defects: rows }, null, 1));
