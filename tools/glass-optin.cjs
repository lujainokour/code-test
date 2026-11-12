/* Opts pages in to the glass design language: adds body class "glass-ui" and links
   css/student-premium.css (the design layer that holds the glass tokens) after css/style.css when
   missing. Never removes or renames anything. Usage: node tools/glass-optin.cjs pages/x/y.html ... */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const page of process.argv.slice(2)) {
    const file = path.join(root, page);
    let s = fs.readFileSync(file, 'utf8');
    s = s.replace(/<body([^>]*)>/, (m, attrs) => {
        if (/\bglass-ui\b/.test(attrs)) return m;
        if (/\bclass="/.test(attrs)) return `<body${attrs.replace(/class="([^"]*)"/, (c, v) => `class="${v ? v + ' ' : ''}glass-ui"`)}>`;
        return `<body class="glass-ui"${attrs}>`;
    });
    if (!s.includes('css/student-premium.css')) {
        const style = s.match(/<link rel="stylesheet" href="([./]*)css\/style\.css">/);
        if (!style) throw new Error(page + ': style.css link not found');
        s = s.replace(style[0], style[0] + `<link rel="stylesheet" href="${style[1]}css/student-premium.css">`);
    }
    fs.writeFileSync(file, s);
    console.log('glass-ui: ' + page);
}
