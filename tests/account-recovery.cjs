/* Part 1: local change-password and honest local recovery. Real WebCrypto PBKDF2 and Web Locks from Node. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let count = 0;
async function check(name, body) { await body(); count++; console.log('PASS ' + name); }

function memoryStorage(initial = {}) {
    const map = new Map(Object.entries(initial));
    return {
        get length() { return map.size; },
        key: i => [...map.keys()][i] ?? null,
        getItem: k => map.has(k) ? map.get(k) : null,
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: k => map.delete(k),
        dump: () => Object.fromEntries(map)
    };
}
function loadAccounts(localStorage) {
    const window = {};
    vm.runInNewContext(fs.readFileSync('js/student-account.js', 'utf8'), { window, localStorage, crypto: globalThis.crypto, navigator: globalThis.navigator, TextEncoder, Uint8Array, Array, Error, JSON });
    return window.studentAccount;
}
const ACCOUNTS = 'codementor-student-accounts-v1';
const learningKey = (email, key) => `codementor-learning-v1:${encodeURIComponent(email)}:${key}`;

// Minimal DOM for js/change-password.js
function element(id, extra = {}) {
    const attrs = {}, listeners = {}, classes = new Set();
    return Object.assign({
        id, value: '', textContent: '', type: 'password', disabled: false, dataset: {}, focused: false,
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, on) => on ? classes.add(c) : classes.delete(c), contains: c => classes.has(c) },
        getAttribute: n => attrs[n] ?? null, setAttribute: (n, v) => { attrs[n] = String(v); }, removeAttribute: n => { delete attrs[n]; },
        addEventListener: (t, fn) => { listeners[t] = fn; }, fire: (t, e = {}) => listeners[t]?.({ preventDefault() {}, ...e }),
        focus() { this.focused = true; }
    }, extra);
}
function changePasswordPage(localStorage, ownerRef) {
    const els = {};
    for (const id of ['current-password', 'new-password', 'confirm-password', 'current-password-error', 'new-password-error', 'confirm-password-error', 'password-message']) els[id] = element(id);
    const submit = element('submit');
    const form = element('change-password-form', {
        querySelectorAll: () => [], querySelector: () => submit,
        reset() { for (const id of ['current-password', 'new-password', 'confirm-password']) els[id].value = ''; }
    });
    els['change-password-form'] = form;
    const accounts = loadAccounts(localStorage);
    const window = {
        studentAccount: accounts,
        addEventListener() {},
        cmStorage: {
            captureOwner: () => ownerRef.current,
            assertOwner(expected) { if (ownerRef.current !== expected) throw new Error('Your account changed. Reload this page before saving. Existing records were kept.'); }
        }
    };
    vm.runInNewContext(fs.readFileSync('js/change-password.js', 'utf8'), { window, document: { getElementById: id => els[id] } });
    return {
        els, submit,
        async fill(current, next, confirm = next) {
            els['current-password'].value = current; els['new-password'].value = next; els['confirm-password'].value = confirm;
            await form.fire('submit');
        }
    };
}

(async () => {
    const storage = memoryStorage();
    const api = loadAccounts(storage);
    await api.register({ name: 'Test Learner A', email: 'a.learner@example.test', age: 17 }, 'first-password-123');
    await api.register({ name: 'Test Learner B', email: 'b.learner@example.test', age: 20 }, 'other-password-456');
    storage.setItem(learningKey('a.learner@example.test', 'codementor-demo-learning'), '{"lessons":["py-1-1"]}');
    storage.setItem(learningKey('a.learner@example.test', 'codementor-demo-code-py-1-1'), 'print("kept")');
    storage.setItem(learningKey('b.learner@example.test', 'codementor-demo-learning'), '{"lessons":["js-1-1"]}');
    const snapshot = () => JSON.stringify(storage.dump());

    await check('Wrong current password is rejected and nothing changes', async () => {
        const before = snapshot();
        await assert.rejects(api.changePassword('a.learner@example.test', 'not-my-password', 'brand-new-password-1'), /current password is incorrect/);
        assert.equal(snapshot(), before);
    });
    await check('New password shorter than 12 characters is rejected', async () => {
        const before = snapshot();
        await assert.rejects(api.changePassword('a.learner@example.test', 'first-password-123', 'short-11chr'), /between 12 and 256/);
        await assert.rejects(api.changePassword('a.learner@example.test', 'first-password-123', ' '.repeat(12)), /between 12 and 256/);
        assert.equal(snapshot(), before);
    });
    await check('New password equal to the current one is rejected', async () => {
        await assert.rejects(api.changePassword('a.learner@example.test', 'first-password-123', 'first-password-123'), /different/);
    });
    await check('Sample account password cannot be changed', async () => {
        await assert.rejects(api.changePassword('student@example.com', 'DemoStudent123!', 'another-password-99'), /sample account/i);
    });
    let oldSalt;
    await check('Correct change re-derives with a new salt and keeps all data', async () => {
        const before = JSON.parse(storage.getItem(ACCOUNTS)).accounts.find(a => a.email === 'a.learner@example.test');
        oldSalt = before.credential.salt;
        const learningBefore = storage.getItem(learningKey('a.learner@example.test', 'codementor-demo-learning'));
        const codeBefore = storage.getItem(learningKey('a.learner@example.test', 'codementor-demo-code-py-1-1'));
        const otherBefore = JSON.stringify(JSON.parse(storage.getItem(ACCOUNTS)).accounts.find(a => a.email === 'b.learner@example.test'));
        await api.changePassword('a.learner@example.test', 'first-password-123', 'second-password-789');
        const after = JSON.parse(storage.getItem(ACCOUNTS)).accounts.find(a => a.email === 'a.learner@example.test');
        assert.notEqual(after.credential.salt, oldSalt);
        assert.notEqual(after.credential.hash, before.credential.hash);
        assert.equal(after.name, before.name); assert.equal(after.age, before.age);
        assert.equal(storage.getItem(learningKey('a.learner@example.test', 'codementor-demo-learning')), learningBefore);
        assert.equal(storage.getItem(learningKey('a.learner@example.test', 'codementor-demo-code-py-1-1')), codeBefore);
        assert.equal(JSON.stringify(JSON.parse(storage.getItem(ACCOUNTS)).accounts.find(a => a.email === 'b.learner@example.test')), otherBefore);
        assert.ok(!storage.getItem(ACCOUNTS).includes('second-password-789'), 'plain password never stored');
    });
    await check('Old password stops working and the new one signs in', async () => {
        await assert.rejects(api.authenticate('a.learner@example.test', 'first-password-123'), /incorrect/);
        assert.equal((await api.authenticate('a.learner@example.test', 'second-password-789')).email, 'a.learner@example.test');
    });
    await check('Account switch during the change aborts without writing', async () => {
        const before = snapshot();
        const owner = { current: 'a.learner@example.test' };
        const pending = api.changePassword('a.learner@example.test', 'second-password-789', 'third-password-000', () => {
            if (owner.current !== 'a.learner@example.test') throw new Error('Your account changed. Reload this page before saving. Existing records were kept.');
        });
        owner.current = 'b.learner@example.test'; // another tab signs in as B while PBKDF2 runs
        await assert.rejects(pending, /account changed/);
        assert.equal(snapshot(), before);
    });
    await check('Concurrent change in another tab is detected (stale credential)', async () => {
        const otherTab = loadAccounts(storage);
        // Both tabs verified the same old credential; whichever writes second must be refused.
        const results = await Promise.allSettled([
            api.changePassword('a.learner@example.test', 'second-password-789', 'fifth-password-222'),
            otherTab.changePassword('a.learner@example.test', 'second-password-789', 'fifth-password-333')
        ]);
        const won = results.findIndex(r => r.status === 'fulfilled'), lost = results.find(r => r.status === 'rejected');
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.match(lost.reason.message, /changed in another tab/);
        const winner = won === 0 ? 'fifth-password-222' : 'fifth-password-333', loser = won === 0 ? 'fifth-password-333' : 'fifth-password-222';
        assert.equal((await api.authenticate('a.learner@example.test', winner)).email, 'a.learner@example.test');
        await assert.rejects(api.authenticate('a.learner@example.test', loser), /incorrect/);
        if (winner !== 'fifth-password-222') await api.changePassword('a.learner@example.test', winner, 'fifth-password-222');
    });

    // Change-password page wiring
    await check('Page: wrong current password shows a field error and keeps the account', async () => {
        const before = snapshot();
        const page = changePasswordPage(storage, { current: 'a.learner@example.test' });
        await page.fill('wrong-password-xx', 'sixth-password-333');
        assert.equal(page.els['current-password'].getAttribute('aria-invalid'), 'true');
        assert.match(page.els['password-message'].textContent, /incorrect/);
        assert.equal(snapshot(), before);
    });
    await check('Page: mismatch and short password are blocked before any crypto', async () => {
        const page = changePasswordPage(storage, { current: 'a.learner@example.test' });
        await page.fill('fifth-password-222', 'short', 'short');
        assert.equal(page.els['new-password'].getAttribute('aria-invalid'), 'true');
        await page.fill('fifth-password-222', 'long-enough-password', 'different-confirm');
        assert.equal(page.els['confirm-password'].getAttribute('aria-invalid'), 'true');
    });
    await check('Page: account switch mid-operation is reported and nothing is written', async () => {
        const before = snapshot(), owner = { current: 'a.learner@example.test' };
        const page = changePasswordPage(storage, owner);
        const run = page.fill('fifth-password-222', 'seventh-password-44');
        owner.current = 'b.learner@example.test';
        await run;
        assert.match(page.els['password-message'].textContent, /account changed/);
        assert.equal(snapshot(), before);
    });
    await check('Page: success changes the password and reports kept progress', async () => {
        const page = changePasswordPage(storage, { current: 'a.learner@example.test' });
        await page.fill('fifth-password-222', 'eighth-password-55');
        assert.match(page.els['password-message'].textContent, /Password changed/);
        assert.equal(page.els['new-password'].value, '');
        assert.equal((await api.authenticate('a.learner@example.test', 'eighth-password-55')).email, 'a.learner@example.test');
    });
    await check('Page: guest cannot change a password', async () => {
        const page = changePasswordPage(storage, { current: 'guest' });
        await page.fill('anything-long-1', 'anything-long-2');
        assert.match(page.els['password-message'].textContent, /Sign in/);
    });

    // Local recovery = reset this browser's account
    await check('Reset requires the exact typed confirmation', async () => {
        const before = snapshot();
        await assert.rejects(api.resetLocalAccount('a.learner@example.test', ''), /Type RESET a.learner@example.test/);
        await assert.rejects(api.resetLocalAccount('a.learner@example.test', 'reset a.learner@example.test'), /Type RESET/);
        await assert.rejects(api.resetLocalAccount('a.learner@example.test', 'RESET b.learner@example.test'), /Type RESET/);
        assert.equal(snapshot(), before);
    });
    await check('Reset refuses the sample account and unknown emails', async () => {
        await assert.rejects(api.resetLocalAccount('student@example.com', 'RESET student@example.com'), /sample account/i);
        await assert.rejects(api.resetLocalAccount('nobody@example.test', 'RESET nobody@example.test'), /No local account/);
    });
    await check('Reset removes only that account and its learning records', async () => {
        storage.setItem('codementor-profile-v1', JSON.stringify({ email: 'a.learner@example.test', role: 'student', isDemo: true, name: 'Test Learner A' }));
        const bAccount = JSON.stringify(JSON.parse(storage.getItem(ACCOUNTS)).accounts.find(a => a.email === 'b.learner@example.test'));
        const bLearning = storage.getItem(learningKey('b.learner@example.test', 'codementor-demo-learning'));
        const result = await api.resetLocalAccount('A.Learner@example.test ', 'RESET a.learner@example.test');
        assert.equal(result.removedRecords, 2);
        const data = JSON.parse(storage.getItem(ACCOUNTS));
        assert.deepEqual(data.accounts.map(a => a.email), ['b.learner@example.test']);
        assert.equal(JSON.stringify(data.accounts[0]), bAccount);
        assert.equal(storage.getItem(learningKey('b.learner@example.test', 'codementor-demo-learning')), bLearning);
        assert.equal(storage.getItem(learningKey('a.learner@example.test', 'codementor-demo-learning')), null);
        assert.equal(storage.getItem('codementor-profile-v1'), null, 'signed-in profile of the reset account is cleared');
    });
    await check('Reset keeps the signed-in profile when it belongs to another account', async () => {
        await api.register({ name: 'Test Learner C', email: 'c.learner@example.test', age: 30 }, 'c-password-000000');
        const profile = JSON.stringify({ email: 'b.learner@example.test', role: 'student', isDemo: true, name: 'Test Learner B' });
        storage.setItem('codementor-profile-v1', profile);
        await api.resetLocalAccount('c.learner@example.test', 'RESET c.learner@example.test');
        assert.equal(storage.getItem('codementor-profile-v1'), profile);
    });
    await check('The account can be registered again after a reset', async () => {
        await api.register({ name: 'Test Learner A', email: 'a.learner@example.test', age: 17 }, 'fresh-password-000');
        assert.equal((await api.authenticate('a.learner@example.test', 'fresh-password-000')).email, 'a.learner@example.test');
    });
    await check('Corrupt account storage is kept, not replaced, by change and reset', async () => {
        const broken = memoryStorage({ [ACCOUNTS]: '{broken' });
        const tool = loadAccounts(broken);
        await assert.rejects(tool.changePassword('x@example.test', 'a-password-123', 'b-password-456'), /could not be read/);
        await assert.rejects(tool.resetLocalAccount('x@example.test', 'RESET x@example.test'), /could not be read/);
        assert.equal(broken.getItem(ACCOUNTS), '{broken');
    });

    // Copy matches behaviour
    await check('Signup text describes the persistent, browser-only, hashed account', async () => {
        const html = fs.readFileSync('pages/auth/signup.html', 'utf8');
        assert.ok(!/temporary/i.test(html.match(/<aside class="demo-account">[\s\S]*?<\/aside>/)[0]));
        for (const phrase of [/only in this browser/, /survives closing the tab and restarting the browser/, /not synced/, /never stored in plain text/]) assert.match(html, phrase);
    });
    await check('Recovery pages never promise an email or a reset link', async () => {
        const forgot = fs.readFileSync('pages/auth/forgot-password.html', 'utf8');
        assert.match(forgot, /nobody can send you a reset link/);
        assert.match(forgot, /Reset this browser's account/);
        assert.ok(!/simulation/i.test(forgot));
        const reset = fs.readFileSync('pages/auth/reset-password.html', 'utf8');
        assert.match(reset, /reset links are never sent/);
        const change = fs.readFileSync('pages/auth/change-password.html', 'utf8');
        assert.ok(!/does not verify or change your password/.test(change));
        assert.ok(change.indexOf('student-account.js') < change.indexOf('change-password.js'));
    });
    await check('The sample student account uses a fictional, labelled display name', async () => {
        const login = fs.readFileSync('js/login.js', 'utf8');
        assert.ok(login.includes('{ name: "Demo Student (SAMPLE)", email: demoEmail, role: "student", isDemo: true }'));
        for (const file of ['js/login.js', 'js/admin-sessions-store.js', 'js/company-store.js', 'js/peer-mentoring-store.js'])
            assert.ok(!/Lujain|Okour/.test(fs.readFileSync(file, 'utf8')), file + ' contains no real name for the sample account');
    });
    console.log(`${count} account checks passed.`);
})().catch(error => { console.error(error); process.exit(1); });
