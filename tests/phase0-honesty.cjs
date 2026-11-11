const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { describe, markdown } = require('../tools/curriculum-summary.cjs');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS ' + name); }
const summary = describe();
check('Published curriculum inventory matches executable content', () => {
    assert.equal(fs.readFileSync('docs/CURRENT-IMPLEMENTATION.md', 'utf8'), markdown());
    assert.equal(summary.python.lessons, summary.python.levelDetails.reduce((count, level) => count + level.lessons, 0));
    assert.ok(summary.python.tasks > summary.foundations.tasks);
});
check('Homepage labels the prepared mentor demo without promising connected AI', () => {
    const home = fs.readFileSync('index.html', 'utf8');
    const hero = home.match(/<h1 id="hero-title">([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.match(hero, /prepared mentor hints \(demo\)/i);
    assert.doesNotMatch(home, /with an AI mentor|Open AI Mentor|Personalized guidance/i);
});
const passwords = [];
check('Public sample credentials are visibly labelled demo only on login screens', () => {
    for (const file of ['login', 'admin-login', 'company-login']) {
        const html = fs.readFileSync(`pages/auth/${file}.html`, 'utf8');
        assert.match(html, /<h3 id="demo-title">Demo only/);
        const password = html.match(/<dt>Password<\/dt>\s*<dd>([^<]+)<\/dd>/)?.[1];
        assert.ok(password); passwords.push(password);
    }
});
check('README and all textual documentation omit hardcoded demo passwords', () => {
    function scan(file) {
        for (const password of passwords) assert.ok(!fs.readFileSync(file, 'utf8').includes(password), 'Credential found in ' + file);
    }
    function walk(dir) {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, item.name);
            if (item.isDirectory()) walk(file);
            else if (/\.(md|json|txt|html|js)$/i.test(item.name)) scan(file);
        }
    }
    scan('README.md'); walk('docs');
});
check('Sample teaching card directs users to login rather than displaying credentials', () => {
    const ui = fs.readFileSync('js/peer-mentoring-ui.js', 'utf8');
    for (const password of passwords) assert.ok(!ui.includes(password));
});
check('The earned item is a "Completion badge (local demo)" and never presented as a verifiable credential', () => {
    const B = 'Completion badge (local demo)';
    const page = fs.readFileSync('pages/student/certificates.html', 'utf8');
    assert.match(page, /<title>Completion badge \(local demo\) \| CodeMentor AI<\/title>/);
    assert.match(page, /not a verifiable credential and is not issued by a server/);
    assert.match(page, /class="certificate-disclaimer">Not a verifiable credential · not issued by a server/, 'the printed badge carries the disclaimer');
    assert.doesNotMatch(page, />CERTIFICATE<|This certificate is presented/);
    for (const id of ['print-certificate', 'certificate-status-title', 'certificate-requirements', 'certificate-recipient', 'certificate-date', 'certificate-preview-label', 'certificate-print-notice']) assert.ok(page.includes(`id="${id}"`), 'kept id ' + id);
    const status = fs.readFileSync('js/certificates.js', 'utf8');
    assert.ok(status.includes(`Your ${B} is ready`) && status.includes('NOT A VERIFIABLE CREDENTIAL') && !/Your certificate/.test(status));
    assert.ok(fs.readFileSync('js/workspace-completion.js', 'utf8').includes(`View your ${B}`));
    assert.ok(fs.readFileSync('js/workspace-shell.js', 'utf8').includes(`["certificates.html", "${B}"]`));
    assert.match(fs.readFileSync('index.html', 'utf8'), /not a verifiable credential and is not\s+issued by a server/);
    for (const file of fs.readdirSync('pages/student').filter(f => f.endsWith('.html'))) assert.doesNotMatch(fs.readFileSync(`pages/student/${file}`, 'utf8'), /certificates\.html"[^>]*>\s*Certificates\s*</, file + ' nav label');
});
console.log(`${passed} Phase 0 honesty checks passed.`);
