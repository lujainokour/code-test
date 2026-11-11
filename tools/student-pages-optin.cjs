/* Opts student pages in to the shared student UI: adds body class "student-ui" and links
   css/student-premium.css, css/interaction-kit.css and js/interaction-kit.js when missing.
   Never removes or renames anything. Usage: node tools/student-pages-optin.cjs page [page...] */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = process.argv.slice(2);
const listFile = path.join(root, 'docs/evidence/student-pages/opted-in.json');
const list = JSON.parse(fs.readFileSync(listFile, 'utf8'));
for (const page of pages) {
    const file = path.join(root, 'pages/student', page + '.html');
    let s = fs.readFileSync(file, 'utf8');
    s = s.replace(/<body([^>]*)>/, (m, attrs) => {
        if (/\bstudent-ui\b/.test(attrs)) return m;
        if (/\bclass="/.test(attrs)) return `<body${attrs.replace(/class="([^"]*)"/, (c, v) => `class="${v ? v + ' ' : ''}student-ui"`)}>`;
        return `<body class="student-ui"${attrs}>`;
    });
    const style = '<link rel="stylesheet" href="../../css/style.css">';
    if (!s.includes(style)) throw new Error(page + ': style.css link not found');
    let extra = '';
    if (!s.includes('../../css/student-premium.css')) extra += '<link rel="stylesheet" href="../../css/student-premium.css">';
    if (!s.includes('../../css/interaction-kit.css')) extra += '<link rel="stylesheet" href="../../css/interaction-kit.css">';
    if (extra) s = s.replace(style, style + extra);
    if (!s.includes('../../js/interaction-kit.js')) s = s.replace('</head>', '    <script src="../../js/interaction-kit.js" defer></script>\n</head>');
    fs.writeFileSync(file, s);
    if (!list.pages.includes(page)) list.pages.push(page);
}
fs.writeFileSync(listFile, JSON.stringify(list, null, 2) + '\n');
console.log(`Opted in: ${pages.join(', ')} (${list.pages.length} total)`);
