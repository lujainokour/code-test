const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function describe() {
    const window = { cmStorage: { getItem: () => null, activeLanguage: () => 'python' } };
    const context = vm.createContext({ window, URLSearchParams, location: { pathname: '/index.html', search: '' } });
    for (const file of ['language-catalog', 'placement-banks', 'python-lessons', 'python-extension', 'curriculum-registry', 'curricula/python', 'curricula/javascript', 'domain/learning', 'data/learning-repository', 'python-curriculum']) {
        vm.runInContext(fs.readFileSync(path.join(root, 'js', file + '.js'), 'utf8'), context, { filename: file + '.js' });
    }
    const levels = window.pythonCurriculum.levels;
    const milestone = levels.filter(level => level.id <= 3);
    return {
        placementBanks: window.placementBanks.all().map(bank => ({ language: bank.id, questions: bank.questions.length })),
        catalogLanguages: window.languageCatalog.entries.map(({ id, name, builtInContent }) => ({ id, name, builtInContent })),
        curricula: window.curriculumRegistry.all().map(course => ({ id: course.id, name: course.name, runner: course.runner, levels: course.levels.length, lessons: course.levels.flatMap(level => level.lessons).length, tasks: Object.keys(course.tasks).length })),
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
        `The catalog contains **${data.catalogLanguages.length} languages**. Python and JavaScript have built-in executable learning paths. Other catalog entries are coming soon and may show locally authored admin previews; they have no built-in runners or complete paths.\n\n` +
        data.curricula.map(course => `${course.name}: **${course.levels} levels, ${course.lessons} lessons, ${course.tasks} tasks**, runner: ${course.runner}.`).join('\n\n') + '\n\n' +
        `Python: **${data.python.levels} levels, ${data.python.lessons} lessons, ${data.python.tasks} coding tasks**. Each level has four lessons and a four-question quiz.\n\n` +
        `| Level | Title | Lessons | Tasks | Quiz questions |\n|---|---|---|---|---|\n` +
        data.python.levelDetails.map(level => `| ${level.id} | ${level.title} | ${level.lessons} | ${level.tasks.length} | ${level.quizQuestions} |`).join('\n') + '\n\n' +
        `The Foundations milestone covers Levels 1–${data.foundations.levels}: **${data.foundations.lessons} lessons and ${data.foundations.tasks} tasks**, including the Study Task Manager. It does not require the advanced levels. Lessons and a best quiz score of at least 70% unlock the next level; an explicitly applied placement choice can open a later starting level without completion credit; coding tasks are additional practice for progression and required for the Foundations milestone. Levels 1–5 are free; Level 6 uses a local Premium preview without payment.\n\n` +
        `Python executes with the bundled Pyodide worker. JavaScript executes in a worker inside an opaque-origin sandbox with a five-second limit and network access blocked by CSP. Language choices, progress, drafts and placement are isolated per account and language; existing Python progress keys are preserved. Python has a 10-question placement bank and JavaScript has 12 questions across its three levels. Placement requires at least 75% in every topic of a consecutive level, skips at most two levels, and saves the starting choice only after explicit application. Placed-out levels stay reviewable and award no completion or completion-badge progress. Retakes preserve all real learning records. See [placement rules](PLACEMENT-RULES.md). Coming-soon choices show an honest availability page and an optional local interest flag. Mentor replies are prepared hints; no LLM endpoint is connected. Awards use local browser records, not trusted server grading. Accounts, progress, community and service workflows remain browser-local; SQL Server is separate from the frontend.\n\n` +
        `Platform sessions are administered through the admin portal. Student-led teaching has a separate application, review and booking workflow. Old teacher URLs redirect to administration; there is no independent teacher login role. Demo credentials are displayed only on the relevant demo login screens.\n`;
}
module.exports.markdown = markdown;
if (require.main === module) process.stdout.write(process.argv.includes('--markdown') ? markdown() : JSON.stringify(describe(), null, 2) + '\n');
