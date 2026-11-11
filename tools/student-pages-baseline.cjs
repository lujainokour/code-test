/* Records every id, name, data-* attribute and class token of the student pages before the visual
   pass, so tests/student-ui.cjs can prove that no hook scripts or tests depend on was removed.
   Usage: node tools/student-pages-baseline.cjs   (writes docs/evidence/student-pages/hook-baseline.json) */
const fs = require('node:fs'), path = require('node:path');
const PAGES = ['learning-path', 'module', 'lesson', 'level-assessment', 'practice', 'workspace', 'code-review', 'placement-intro', 'placement-question', 'placement-review', 'placement-results', 'skill-analysis', 'learning-report', 'profile', 'onboarding', 'subscription', 'career', 'virtual-internship', 'requests', 'messages', 'local-portfolio', 'mentor', 'mentor-studio', 'project', 'project-evaluation'];
function hooks(html) {
    const set = new Set();
    for (const m of html.matchAll(/\s(id|name)="([^"]+)"/g)) set.add(`${m[1]}=${m[2]}`);
    for (const m of html.matchAll(/\s(data-[a-z0-9-]+)(?:="([^"]*)")?/g)) set.add(`${m[1]}${m[2] !== undefined ? '=' + m[2] : ''}`);
    for (const m of html.matchAll(/\sclass="([^"]+)"/g)) for (const c of m[1].split(/\s+/).filter(Boolean)) set.add(`class=${c}`);
    return [...set].sort();
}
if (require.main === module) {
    const root = path.resolve(__dirname, '..');
    const out = Object.fromEntries(PAGES.map(p => [p, hooks(fs.readFileSync(path.join(root, 'pages/student', p + '.html'), 'utf8'))]));
    fs.mkdirSync(path.join(root, 'docs/evidence/student-pages'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/evidence/student-pages/hook-baseline.json'), JSON.stringify(out, null, 1) + '\n');
    console.log(`Recorded hooks for ${PAGES.length} pages.`);
}
module.exports = { PAGES, hooks };
