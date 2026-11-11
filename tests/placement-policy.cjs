const assert = require('node:assert/strict');
const engine = require('../js/placement-engine.js'), banks = require('../js/placement-banks.js');
let checks = 0;
function check(name, condition) { assert.ok(condition, name); checks++; console.log('PASS ' + name); }
const attempt = (bank, answers) => ({ version: 1, languageId: bank.id, bankVersion: bank.version, status: 'submitted', answers });
for (const bank of banks.all()) {
    check(bank.id + ' has a valid bank across the first three real levels', engine.validateBank(bank) === bank && bank.questions.length >= 10 && [1, 2, 3].every(level => bank.questions.some(question => question.level === level)));
    const unsure = engine.evaluate(bank, attempt(bank, bank.questions.map(() => 'unsure')));
    check(bank.id + ' all-unsure starts at Level 1 and earns no placed-out levels', unsure.correct === 0 && unsure.recommendedStart === 1 && unsure.placedOutLevels.length === 0);
    const perfect = engine.evaluate(bank, attempt(bank, bank.questions.map(question => question.correct)));
    check(bank.id + ' all-correct is capped at two skipped levels', perfect.recommendedStart === 3 && perfect.placedOutLevels.join(',') === '1,2');
    const first = bank.questions.filter(question => question.level === 1)[0];
    const answers = bank.questions.map(question => question.level === 1 ? 'unsure' : question.correct);
    check(bank.id + ' strong later topics cannot skip a weak earlier level', engine.evaluate(bank, attempt(bank, answers)).recommendedStart === 1 && first.level === 1);
    assert.throws(() => engine.evaluate(bank, attempt(bank, bank.questions.map(() => null))));
    check(bank.id + ' unanswered submitted attempts are rejected', true);
}
const questions = Array.from({ length: 100 }, (_, index) => ({ id: 'boundary-' + index, level: 1, topic: 'Foundations', options: ['Correct', 'Wrong'], correct: 0 }));
questions.push({ id: 'next', level: 2, topic: 'Logic', options: ['Correct', 'Wrong'], correct: 0 });
const boundary = { id: 'python', version: 1, levelCount: 3, questions };
const score = correct => engine.evaluate(boundary, attempt(boundary, questions.map((question, index) => index < correct ? 0 : 'unsure')));
check('Exactly 75 percent on every Level 1 topic allows Level 2', score(75).recommendedStart === 2 && score(75).topicScores[0].percentage === 75);
check('One percentage point below 75 cannot skip Level 1', score(74).recommendedStart === 1 && !score(74).topicScores[0].meetsThreshold);
const mixed = { id: 'python', version: 1, levelCount: 3, questions: Array.from({ length: 8 }, (_, index) => ({ id: 'mixed-' + index, level: 1, topic: index < 4 ? 'Values' : 'Input', options: ['Correct', 'Wrong'], correct: 0 })) };
check('A 75 percent overall average cannot hide a topic below threshold', engine.evaluate(mixed, attempt(mixed, [0, 0, 0, 0, 0, 0, 'unsure', 'unsure'])).recommendedStart === 1);
const python = banks.get('python'), old = { version: 1, status: 'submitted', answers: python.questions.map(question => question.correct) };
const before = JSON.stringify(old);
check('Legacy Python order and result remain usable without rewriting the attempt', engine.evaluate(python, old).recommendedStart === 3 && JSON.stringify(old) === before);
assert.throws(() => engine.evaluate(banks.get('javascript'), { ...old, answers: banks.get('javascript').questions.map(question => question.correct) }));
check('A legacy Python attempt cannot be interpreted as JavaScript', true);
assert.throws(() => engine.evaluate(python, { ...old, languageId: 'javascript' }));
check('Explicitly wrong language metadata is rejected', true);
console.log(`${checks} placement policy checks passed.`);
