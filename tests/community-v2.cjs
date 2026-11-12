/* Community v2: feed, highlights, weekly challenge (and later groups: open channels, post view,
   reputation, learning integration, admin). Every number must come from the store. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { memory, tab, A, B, approve } = require('./helpers/community-harness.cjs');
let count = 0;
const plain = v => JSON.parse(JSON.stringify(v));
const deq = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);
async function check(name, body) { await body(); count++; console.log('PASS ' + name); }
const EXTRA = ['js/community-challenges.js'];

function curricula() {
    const ctx = { window: {} }; ctx.window.window = ctx.window; vm.createContext(ctx);
    for (const f of ['js/curriculum-registry.js', 'js/python-lessons.js', 'js/python-extension.js', 'js/curricula/python.js', 'js/curricula/javascript.js'])
        vm.runInContext(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''), ctx, { filename: f });
    return ctx.window.curriculumRegistry;
}

(async () => {
    await check('Weekly challenge: every task is a real level 1-5 practice task with the same title; none for C#/C++', async () => {
        const shared = memory(), t = tab(shared, A, { extraScripts: EXTRA }), registry = curricula(), ch = t.window.communityChallenges;
        for (const [language, list] of Object.entries(ch.TASKS)) {
            const course = registry.get(language), allowed = new Set(course.levels.filter(l => l.id <= 5).flatMap(l => l.tasks));
            for (const [id, title] of list) { assert.ok(allowed.has(id), `${language}/${id} is a level 1-5 task`); assert.equal(course.tasks[id].title, title, `${language}/${id} title`); }
            assert.equal(list.length, allowed.size, `${language} covers every level 1-5 task`);
        }
        const a = ch.weekly('python', new Date(2026, 10, 12)), b = ch.weekly('python', new Date(2026, 10, 12, 23)), c = ch.weekly('python', new Date(2026, 10, 19));
        deq(a, b, 'same week, same challenge'); assert.notEqual(a.id, c.id, 'next week, next task');
        assert.equal(a.href, `../student/workspace.html?task=${a.id}`);
        assert.equal(ch.weekly('csharp'), null); assert.equal(ch.weekly('cpp'), null);
    });

    const shared = memory();
    const a = tab(shared, A, { extraScripts: EXTRA }), b = tab(shared, B, { extraScripts: EXTRA }), admin = tab(shared, null, { admin: true });
    await a.m.request('python', 'Learning Python.', A.email); await b.m.request('python', 'Learning Python too.', B.email);
    await approve(admin, A.email, 'python'); await approve(admin, B.email, 'python');

    await check('First run: an approved student with no posts sees a welcome with three ways in, never a dead end', async () => {
        a.run('js/community.js');
        const nodes = a.dom.walk(), labels = nodes.filter(n => n.tagName === 'BUTTON').map(n => n.textContent);
        assert.ok(nodes.some(n => n.className === 'community-welcome'));
        for (const label of ['Ask your first question', 'Introduce yourself', 'Browse channels']) assert.ok(labels.includes(label), label);
        const tabs = a.dom.ids.get('community-tabs').children;
        deq(tabs.map(t => t.textContent), ['Latest', 'Unanswered', 'Solved', 'Top', 'My posts']);
        deq(tabs.map(t => t.getAttribute('aria-selected')), ['true', 'false', 'false', 'false', 'false']);
        assert.match(a.dom.ids.get('community-challenge').textContent, /^Week \d+: /, 'weekly challenge names a real task');
        assert.match(a.dom.ids.get('community-unanswered').textContent, /Every question has a reply/);
    });

    await check('Highlights are counted from saved posts only: unanswered excludes my posts and answered ones', async () => {
        const mine = await a.s.createPost({ channel: 'python', title: 'My own question', body: 'x', tags: 'loops' }, A.email);
        const theirs = await b.s.createPost({ channel: 'python', title: 'Their open question', body: 'y', tags: 'loops, lists' }, B.email);
        const answered = await b.s.createPost({ channel: 'python', title: 'Their answered question', body: 'z' }, B.email);
        await a.s.reply(answered, 'Here is an idea.', A.email);
        const h = a.s.highlights(A.email);
        deq(h.unanswered.map(p => p.id), [theirs]); assert.equal(h.unansweredCount, 1);
        assert.ok(!h.unanswered.some(p => p.id === mine), 'my own post is not "can you help?"');
        deq(h.trending, [{ tag: 'loops', count: 2 }, { tag: 'lists', count: 1 }]);
        assert.equal(h.total, 3);
        assert.equal(b.s.highlights(B.email).unanswered.map(p => p.id).join(), mine);
    });

    await check('Solved today needs a solvedAt from today; older solves and unsolved posts are not counted', async () => {
        const id = b.s.query({ search: 'Their open question' }, B.email).items[0].id;
        assert.equal(a.s.highlights(A.email).solvedTodayCount, 0);
        await b.s.setSolved(id, true, B.email);
        const h = a.s.highlights(A.email);
        assert.equal(h.solvedTodayCount, 1); assert.equal(h.solvedToday[0].id, id);
        assert.ok(!h.unanswered.some(p => p.id === id), 'solved posts leave "can you help?"');
        assert.equal(a.s.highlights(A.email, Date.now() + 2 * 86400000).solvedTodayCount, 0, 'yesterday’s solve is not "today"');
        await b.s.setSolved(id, false, B.email);
        assert.equal(a.s.query({ search: 'Their open question' }, A.email).items[0].solvedAt, null);
    });

    await check('Tabs: "My posts" shows only mine; "Top" ranks by helpful reactions and replies', async () => {
        deq(a.s.query({ mine: true }, A.email).items.map(p => p.title), ['My own question']);
        const open = b.s.query({ search: 'Their open question' }, B.email).items[0].id;
        await a.s.react(open, 'helpful', A.email);
        assert.equal(a.s.query({ sort: 'top' }, A.email).items[0].id, open);
    });

    await check('Page: cards show a 2-line preview, reply count and a Solved pill; the full post opens from the title', async () => {
        const id = b.s.query({ search: 'Their answered question' }, B.email).items[0].id;
        await b.s.setSolved(id, true, B.email);
        a.window.dispatchEvent({ type: 'community-changed' });
        const nodes = a.dom.walk();
        const card = nodes.find(n => n.tagName === 'ARTICLE' && n.dataset.postId === id);
        assert.ok(card.className.includes('community-card') && card.className.includes('is-solved'));
        const text = card.textContent;
        assert.match(text, /1 reply/); assert.match(text, /Solved ✓/); assert.match(text, /Test Learner B/);
        assert.ok(nodes.some(n => n.className === 'community-card-preview'));
        assert.ok(!card.children.some(n => n.className === 'community-detail'), 'collapsed by default');
        const opener = a.dom.walk().find(n => n.tagName === 'BUTTON' && n.className.includes('community-card-open') && n.textContent === 'Their answered question');
        await opener.fire('click');
        assert.ok(a.dom.walk().some(n => n.className === 'community-reply-body' && n.textContent === 'Here is an idea.'));
    });

    console.log(`${count} community v2 checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
