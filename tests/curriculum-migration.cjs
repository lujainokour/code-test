const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const legacy = {
    version: 1,
    lessons: ['variables', 'data-types', 'input-output', 'numbers', 'conditions', 'boolean-logic', 'for-loops', 'while-loops', 'functions', 'lists', 'dictionaries', 'problem-solving'],
    tasks: ['student-profile', 'receipt', 'grade-checker', 'sum-numbers', 'list-summary', 'task-manager'],
    assessments: { 1: { score: 75 }, 2: { score: 100 }, 3: { score: 80 } },
    submissions: { receipt: { code: '# historical passing Python', passed: 4, total: 4 } }
};
const original = JSON.stringify(legacy);
const window = { cmStorage: { activeLanguage: () => 'python', getItem: key => key === 'codementor-demo-learning' ? original : null } };
const context = vm.createContext({ window, URLSearchParams, location: { pathname: '/index.html', search: '' } });
for (const file of ['language-catalog', 'python-lessons', 'python-extension', 'curriculum-registry', 'curricula/python', 'curricula/javascript', 'python-curriculum']) vm.runInContext(fs.readFileSync('js/' + file + '.js', 'utf8'), context);
let checks = 0;
function check(name, condition) { assert.ok(condition, name); checks++; console.log('PASS ' + name); }
const course = window.pythonCurriculum, progress = course.read();
check('Every legacy Python lesson id remains in the schema', legacy.lessons.every(id => course.allLessons.some(lesson => lesson.id === id)));
check('Every legacy Python task id remains in the schema', legacy.tasks.every(id => course.tasks[id]));
check('Old completed Foundations levels retain their completion', course.levels.slice(0, 3).every(level => course.completed(level, progress)));
check('Old Foundations record advances to Level 4 without fabricated completion', course.current(progress).id === 4 && course.available(course.levels[3], progress));
check('Legacy passing submissions and metadata remain unchanged', JSON.stringify(progress) === original);
const js = window.curriculumRegistry.get('javascript');
check('JavaScript schema has the required complete path', js.runner === 'javascript' && js.levels.length >= 3 && js.levels.every(level => level.lessons.length === 4 && level.quiz.length === 4) && Object.keys(js.tasks).length >= 6);
check('Only languages with implemented paths advertise ready status', window.languageCatalog.entries.every(entry => entry.status === 'ready' ? Boolean(window.curriculumRegistry.get(entry.id)) : entry.status === 'coming-soon'));
const summaries = [{ textContent: 'Six JavaScript levels' }], access = [{ textContent: 'Level 6 Premium' }];
const jsWindow = { curriculumRegistry: window.curriculumRegistry, cmStorage: { activeLanguage: () => 'javascript', getItem: () => null } };
const jsContext = vm.createContext({ window: jsWindow, document: { querySelectorAll: selector => selector === '[data-curriculum-summary]' ? summaries : selector === '[data-curriculum-access]' ? access : [] }, URLSearchParams, location: { pathname: '/index.html', search: '' } });
vm.runInContext(fs.readFileSync('js/python-curriculum.js', 'utf8'), jsContext);
check('Active JavaScript summaries use its real level count and free access', summaries[0].textContent.startsWith(`${js.levels.length} JavaScript levels`) && !summaries[0].textContent.includes('Six') && access[0].textContent.includes('All published JavaScript levels are included in Free'));
console.log(`${checks} curriculum migration checks passed.`);
