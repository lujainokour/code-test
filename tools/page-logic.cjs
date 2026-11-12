/* Facts for docs/PAGE-LOGIC-AUDIT.md: per page its title, h1, primary action(s), outgoing page links,
   inbound links from other pages and from the workspace sidebar (js/workspace-shell.js), and whether
   it is a redirect stub. Static analysis of the HTML/JS only. Usage: node tools/page-logic.cjs [--json] */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', 'dashboard.html', 'company-dashboard.html', 'teacher-dashboard.html'];
for (const dir of fs.readdirSync(path.join(root, 'pages'))) for (const f of fs.readdirSync(path.join(root, 'pages', dir))) if (f.endsWith('.html')) pages.push(`pages/${dir}/${f}`);
const shell = fs.readFileSync(path.join(root, 'js/workspace-shell.js'), 'utf8');
const scripts = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n');
const strip = s => s.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const info = {};
for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const redirect = /http-equiv="refresh"\s+content="0;\s*url=([^"]+)"/.exec(html.replace(/<noscript>[\s\S]*?<\/noscript>/g, ''));
    const primary = [...html.matchAll(/<(a|button)[^>]*class="[^"]*button-primary[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)].map(m => strip(m[2])).filter(Boolean);
    const links = [...new Set([...html.matchAll(/href="([^"#?]+\.html)/g)].map(m => path.posix.normalize(path.posix.join(path.posix.dirname(page), m[1]))))];
    info[page] = { page, title: strip((/<title>([\s\S]*?)<\/title>/.exec(html) || [])[1] || ''), h1: strip((/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html) || [])[1] || ''),
        primary: primary.slice(0, 3), links: links.filter(l => pages.includes(l) && l !== page), redirect: redirect ? redirect[1] : null, inbound: [], sidebar: false, scriptLinked: false };
}
for (const p of Object.values(info)) for (const l of p.links) info[l].inbound.push(p.page);
for (const p of Object.values(info)) {
    const name = path.posix.basename(p.page);
    p.sidebar = new RegExp(`"${name.replace('.', '\\.')}"`).test(shell);
    p.scriptLinked = new RegExp(`["'\`/]${name.replace('.', '\\.')}`).test(scripts);
}
const rows = Object.values(info);
if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
console.log('| Page | H1 | Primary action | In (pages) | Sidebar | Script links | Redirect |\n|---|---|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.page} | ${r.h1.slice(0, 50)} | ${r.primary.join(' / ').slice(0, 50) || '—'} | ${r.inbound.length} | ${r.sidebar ? 'yes' : 'no'} | ${r.scriptLinked ? 'yes' : 'no'} | ${r.redirect || ''} |`);
