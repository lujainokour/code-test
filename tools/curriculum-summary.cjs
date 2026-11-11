const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function describe() {
    const window = { cmStorage: { getItem: () => null } };
    const context = vm.createContext({ window, URLSearchParams, location: { pathname: '/index.html', search: '' } });
    for (const file of ['language-catalog', 'python-lessons', 'python-extension', 'python-curriculum']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' });
    }
    const levels = window.pythonCurriculum.levels;
    const milestone = levels.filter(level => level.id <= 3);
    return {
        catalogLanguages: window.languageCatalog.entries.map(({ id, name, builtInContent }) => ({ id, name, builtInContent })),
        python: { levels: levels.length, lessons: levels.flatMap(level => level.lessons).length,
            tasks: new Set(levels.flatMap(level => level.tasks)).size,
            levelDetails: levels.map(level => ({ id: level.id, title: level.title, lessons: level.lessons.length, tasks: [...level.tasks], quizQuestions: level.quiz.length })) },
        foundations: { levels: milestone.length, lessons: milestone.flatMap(level => level.lessons).length, tasks: new Set(milestone.flatMap(level => level.tasks)).size }
    };
}
module.exports = { describe };
function markdown() {
    const data = describe();
    return `# Current implementation — generated from code\n\n` +
        `Regenerate with: \`node tools/curriculum-summary.cjs --markdown\`. This describes the current browser-local implementation, not planned phases.\n\n` +
        `The catalog contains **${data.catalogLanguages.length} languages**. Only Python has a built-in executable learning path. Other catalog entries may show locally authored admin content; they do not have built-in runners or complete paths.\n\n` +
        `Python: **${data.python.levels} levels, ${data.python.lessons} lessons, ${data.python.tasks} coding tasks**. Each level has four lessons and a four-question quiz.\n\n` +
        `| Level | Title | Lessons | Tasks | Quiz questions |\n|---|---|---|---|---|\n` +
        data.python.levelDetails.map(level => `| ${level.id} | ${level.title} | ${level.lessons} | ${level.tasks.length} | ${level.quizQuestions} |`).join('\n') + '\n\n' +
        `The Foundations milestone covers Levels 1–${data.foundations.levels}: **${data.foundations.lessons} lessons and ${data.foundations.tasks} tasks**, including the Study Task Manager. It does not require the advanced levels. Lessons and a best quiz score of at least 70% unlock the next level; coding tasks are additional practice for progression and required for the Foundations milestone. Levels 1–5 are free; Level 6 uses a local Premium preview without payment.\n\n` +
        `Python executes with the bundled Pyodide worker. Mentor replies are prepared hints; no LLM endpoint is connected. Awards use local browser records, not trusted server grading. Accounts, progress, community and service workflows remain browser-local; SQL Server is separate from the frontend.\n\n` +
        `Platform sessions are administered through the admin portal. Student-led teaching has a separate application, review and booking workflow. Old teacher URLs redirect to administration; there is no independent teacher login role. Demo credentials are displayed only on the relevant demo login screens.\n`;
}
module.exports.markdown = markdown;
if (require.main === module) process.stdout.write(process.argv.includes('--markdown') ? markdown() : JSON.stringify(describe(), null, 2) + '\n');
