/* Layering guard (Slice 1). Only the MIGRATED modules are checked: they must reach the learning-progress record through
   js/data/learning-repository.js and must not touch localStorage / sessionStorage or the progress key themselves.
   Modules are added to MIGRATED as later slices move them; unmigrated files are intentionally not checked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }

const MIGRATED = ['js/lesson.js', 'js/level-assessment.js', 'js/workspace.js', 'js/workspace-support.js', 'js/python-curriculum.js'];
const PURE = ['js/domain/learning.js', 'js/domain/onboarding.js'];
const text = file => fs.readFileSync(file, 'utf8');

check('Migrated modules never use the progress key or localStorage/sessionStorage directly', () => {
    for (const file of MIGRATED) {
        const source = text(file);
        assert.ok(!/codementor-demo-learning/.test(source), `${file} still names the progress key`);
        assert.ok(!/\b(localStorage|sessionStorage)\b/.test(source), `${file} touches web storage directly`);
        assert.ok(!/cmStorage\.(getItem|setItem|removeItem)\(\s*(progressKey|key)\b/.test(source), `${file} reads or writes a progress key variable directly`);
    }
});

check('Migrated modules use the repository and the domain', () => {
    for (const file of MIGRATED) assert.ok(/cmData\.learning/.test(text(file)) && /cmDomain\.learning|learning\./.test(text(file)), `${file} should use cmData.learning and the domain`);
});

check('The domain layer is pure: no DOM, storage, network, timers or randomness', () => {
    for (const file of PURE) {
        // the UMD wrapper (module.exports / window attach) is outside the factory body; only the rules are checked
        const full = text(file), body = full.slice(full.indexOf('"use strict"'));
        const source = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        for (const banned of [/\bdocument\b/, /\bwindow\b/, /\blocalStorage\b/, /\bsessionStorage\b/, /\bcmStorage\b/, /\bfetch\s*\(/, /\bXMLHttpRequest\b/, /\bsetTimeout\b/, /\bsetInterval\b/, /Math\.random/, /Date\.now|new Date\(/]) {
            assert.ok(!banned.test(source), `${file} must not use ${banned}`);
        }
    }
});

check('Every page that loads python-curriculum.js loads the domain and repository first', () => {
    const pages = fs.readdirSync('pages').flatMap(dir => fs.readdirSync(`pages/${dir}`).filter(name => name.endsWith('.html')).map(name => `pages/${dir}/${name}`));
    let checked = 0;
    for (const page of pages) {
        const html = text(page), curriculum = html.indexOf('js/python-curriculum.js');
        if (curriculum < 0) continue; checked++;
        const domain = html.indexOf('js/domain/learning.js'), repo = html.indexOf('js/data/learning-repository.js');
        assert.ok(domain >= 0 && repo > domain && curriculum > repo, `${page}: expected domain, repository, then python-curriculum.js`);
    }
    assert.ok(checked >= 14, 'the expected pages were found');
});

console.log(`${count} layering checks passed.`);
