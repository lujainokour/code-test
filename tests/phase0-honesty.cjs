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
console.log(`${passed} Phase 0 honesty checks passed.`);
