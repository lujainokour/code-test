/* Community v2: feed, highlights, weekly challenge (and later groups: open channels, post view,
   reputation, learning integration, admin). Every number must come from the store. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { memory, tab, A, B, approve } = require('./helpers/community-harness.cjs');
let count = 0;
const plain = v => JSON.parse(JSON.stringify(v));
const deq = (actual, expected, message) => assert.deepEqual(plain(actual), plain(expected), message);
let beforeEach = () => {};
async function check(name, body) { beforeEach(); await body(); count++; console.log('PASS ' + name); }
const EXTRA = ['js/community-challenges.js', 'js/community-highlight.js'];

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
    // Tests that are not about rate limits start with an empty rate window (the limit itself is tested separately).
    beforeEach = () => { const raw = shared.getItem('codementor-community-v1'); if (!raw) return; const d = JSON.parse(raw); d.activity = {}; shared.setItem('codementor-community-v1', JSON.stringify(d)); };

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

    // ---------- group 2: composer and post view ----------
    await check('Highlighting: tokens join back to the exact code; HTML stays literal text; four languages', async () => {
        const hl = a.window.communityHighlight;
        assert.ok(hl, 'highlighter loaded');
        const samples = {
            python: 'def total(xs):\n    # sum it\n    return sum(xs) + 1.5  # "</script>"\nprint(f"{total([1, 2])}")',
            javascript: 'const n = [1, 2].map(x => x * 2); // ok\n/* block */ console.log(`<img src=x onerror=alert(1)>`);',
            csharp: 'using System;\nclass P { static void Main() { Console.WriteLine("Hi \\"there\\""); } }',
            cpp: '#include <iostream>\nint main() { std::cout << 42 << std::endl; return 0; } // done'
        };
        for (const [language, code] of Object.entries(samples)) {
            const tokens = plain(hl.tokens(code, language));
            assert.equal(tokens.map(t => t.text).join(''), code, language + ' round-trips');
            assert.ok(tokens.some(t => t.type === 'kw'), language + ' keywords');
            assert.ok(tokens.every(t => ['plain', 'kw', 'str', 'com', 'num', 'fn'].includes(t.type)));
        }
        const js = plain(hl.tokens(samples.javascript, 'javascript'));
        assert.ok(js.some(t => t.type === 'str' && t.text === '`<img src=x onerror=alert(1)>`'), 'HTML inside a string is one text token');
        assert.ok(js.some(t => t.type === 'com' && t.text === '// ok'));
        deq(hl.tokens('<b>x</b>', 'text'), [{ type: 'plain', text: '<b>x</b>' }]);
    });

    await check('Threaded replies: answers to a nested reply attach to its thread; edit marks "edited"; only the author edits', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Thread test about dictionaries', body: 'How?', tags: 'dict' }, A.email);
        const first = await b.s.reply(post, 'Use get().', B.email);
        const nested = await a.s.reply(post, 'Thanks, what about defaults?', A.email, first);
        const deeper = await b.s.reply(post, 'get(key, default).', B.email, nested);
        const view = a.s.get(post, A.email);
        deq(view.replies.map(r => r.parentId), [null, first, first], 'one level deep');
        await assert.rejects(a.s.editReply(post, first, 'hijack', A.email), /only edit your own replies/);
        assert.equal(await b.s.editReply(post, first, 'Use get().', B.email), false, 'unchanged edit is not an edit');
        assert.equal(await b.s.editReply(post, first, 'Use dict.get().', B.email), true);
        const edited = a.s.get(post, A.email).replies.find(r => r.id === first);
        assert.equal(edited.body, 'Use dict.get().'); assert.ok(edited.editedAt);
        await b.s.deleteReply(post, first, B.email);
        deq(a.s.get(post, A.email).replies.map(r => [r.id, r.parentId]), [[nested, null], [deeper, null]], 'answers to a deleted reply are kept');
        await assert.rejects(a.s.reply(post, 'x', A.email, 'missing-reply'), /was deleted/);
    });

    await check('Accepted answer: author only, never your own reply; marks solved; Undo restores exactly; deleting it clears it', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Accept test question', body: 'Which loop?' }, A.email);
        const answer = await b.s.reply(post, 'Use for.', B.email), own = await a.s.reply(post, 'Or while?', A.email);
        await assert.rejects(b.s.acceptAnswer(post, answer, B.email), /Only the author/);
        await assert.rejects(a.s.acceptAnswer(post, own, A.email), /cannot accept your own reply/);
        const before = await a.s.acceptAnswer(post, answer, A.email);
        deq(before, { replyId: null, solved: false, solvedAt: null });
        let view = a.s.get(post, A.email);
        assert.equal(view.acceptedReplyId, answer); assert.equal(view.solved, true); assert.ok(view.solvedAt);
        assert.equal(view.replies.find(r => r.id === answer).accepted, true);
        await a.s.restoreAcceptance(post, before, A.email);
        view = a.s.get(post, A.email);
        assert.equal(view.acceptedReplyId, null); assert.equal(view.solved, false); assert.equal(view.solvedAt, null);
        await a.s.acceptAnswer(post, answer, A.email);
        await b.s.deleteReply(post, answer, B.email);
        assert.equal(a.s.get(post, A.email).acceptedReplyId, null);
    });

    await check('Helpful on replies: toggles, never on your own reply', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Helpful reply test', body: 'b' }, A.email);
        const r = await b.s.reply(post, 'An answer', B.email);
        await assert.rejects(b.s.reactReply(post, r, B.email), /cannot mark your own reply/);
        assert.equal(await a.s.reactReply(post, r, A.email), true);
        assert.equal(a.s.get(post, A.email).replies[0].helpful.count, 1);
        assert.equal(await a.s.reactReply(post, r, A.email), false);
        assert.equal(a.s.get(post, A.email).replies[0].helpful.count, 0);
    });

    await check('Rate limit: an 11th reply within five minutes is refused and not saved', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Reply rate test', body: 'b' }, A.email);
        const c = tab(shared, { name: 'Test Learner C', email: 'learner-c@example.test', role: 'student', isDemo: true }, { extraScripts: EXTRA });
        await c.m.request('python', 'Learning.', 'learner-c@example.test'); await approve(admin, 'learner-c@example.test', 'python');
        for (let i = 0; i < 10; i++) await c.s.reply(post, `Reply ${i}`, 'learner-c@example.test');
        await assert.rejects(c.s.reply(post, 'One too many', 'learner-c@example.test'), /posting quickly/);
        assert.equal(a.s.get(post, A.email).replies.length, 10);
    });

    await check('Similar questions: keyword and tag matching over readable posts; unrelated, hidden and private posts never appear', async () => {
        const target = await b.s.createPost({ channel: 'python', title: 'Why does my for loop skip the last number?', body: 'range question', tags: 'loops, range' }, B.email);
        const found = a.s.similar({ title: 'for loop skips last number', tags: 'range' }, A.email);
        assert.equal(found[0].id, target); assert.ok(found.length <= 3); assert.ok(found[0].score >= 4);
        deq(a.s.similar({ title: 'How do classes work?' }, A.email).filter(x => x.id === target), [], 'unrelated words do not match');
        deq(a.s.similar({ title: 'loop' }, A.email), [], 'a single word is not enough');
        await a.m.request('javascript', 'JS too.', A.email); await approve(admin, A.email, 'javascript');
        const privateOne = await a.s.createPost({ channel: 'javascript', title: 'Private loop number skip question', body: 'x', tags: 'loops' }, A.email);
        assert.ok(!b.s.similar({ title: 'loop number skip', tags: 'loops' }, B.email).some(x => x.id === privateOne), 'no posts from channels B cannot read');
        await b.s.report(target, 'Testing hidden posts.', B.email).catch(() => {});
        await a.s.report(target, 'Testing hidden posts.', A.email);
        await admin.s.moderate(target, 'hide', 'Test hide');
        assert.ok(!a.s.similar({ title: 'for loop skips last number', tags: 'range' }, A.email).some(x => x.id === target), 'hidden posts are never suggested');
        await admin.s.moderate(target, 'restore', 'Test restore');
    });

    await check('Post drawer: opens from the card, threads replies, highlights code, offers Accept only to the author', async () => {
        const post = await a.s.createPost({ channel: 'python', title: 'Drawer code question', body: 'See code', code: 'for i in range(3):\n    print("<b>", i)', language: 'python' }, A.email);
        const r1 = await b.s.reply(post, 'Top level answer', B.email);
        await a.s.reply(post, 'Nested follow-up', A.email, r1);
        a.window.dispatchEvent({ type: 'community-changed' });
        const opener = a.dom.walk().find(n => n.tagName === 'BUTTON' && n.className.includes('community-card-open') && n.textContent === 'Drawer code question');
        await opener.fire('click');
        const dialog = a.dom.ids.get('community-post-dialog');
        assert.equal(dialog.open, true);
        const inside = (function walk(n) { return n.children.flatMap(c => [c, ...walk(c)]); })(dialog);
        assert.ok(inside.some(n => n.id === 'community-drawer-title' && n.textContent === 'Drawer code question' && n.tabIndex === -1), 'focusable heading');
        const code = inside.find(n => n.tagName === 'CODE');
        assert.equal(code.textContent, 'for i in range(3):\n    print("<b>", i)');
        assert.ok(code.children.some(n => n.tagName === 'SPAN' && n.className === 'tok-kw' && n.textContent === 'for'));
        assert.ok(!inside.some(n => ['SCRIPT', 'IMG', 'B'].includes(n.tagName) && n.textContent === '<b>'), 'no element from code text');
        const rows = inside.filter(n => n.tagName === 'ARTICLE' && n.className.includes('community-reply'));
        deq(rows.map(r => r.className.includes('is-nested')), [false, true]);
        assert.ok(inside.some(n => n.tagName === 'BUTTON' && n.textContent === 'Accept answer'), 'author can accept B’s reply');
        b.run('js/community.js');
        await b.dom.walk().find(n => n.tagName === 'BUTTON' && n.className.includes('community-card-open') && n.textContent === 'Drawer code question').fire('click');
        assert.ok(!b.dom.walk().some(n => n.tagName === 'BUTTON' && n.textContent === 'Accept answer'), 'others cannot accept');
    });

    console.log(`${count} community v2 checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
