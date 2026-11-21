/* Shared harness for community tests: a fake DOM, a browser tab per account and admin approval.
   Copied from tests/community-store.cjs (which keeps its own copy unchanged). */
const fs = require('node:fs');
const vm = require('node:vm');
function memory(map = new Map()) {
    return { map, get length() { return map.size; }, key: i => [...map.keys()][i] ?? null, getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), clear: () => map.clear() };
}
// ---- tiny DOM ----
function makeDocument() {
    const ids = new Map(), created = [];
    function el(tag = 'div') {
        const handlers = {}, attrs = {}, classes = new Set();
        const e = {
            tagName: tag.toUpperCase(), children: [], parent: null, _text: '', hidden: false, disabled: false, value: '', dataset: {}, style: {}, type: '', id: '',
            get textContent() { return this.children.length ? this.children.map(c => c.textContent).join('') : this._text; },
            set textContent(v) { this.children = []; this._text = String(v); },
            get options() { return this.children.filter(c => c.tagName === 'OPTION'); },
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, on) => (on ?? !classes.has(c)) ? classes.add(c) : classes.delete(c) },
            get className() { return [...classes].join(' '); }, set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
            setAttribute(n, v) { attrs[n] = String(v); }, getAttribute(n) { return attrs[n] ?? null; }, removeAttribute(n) { delete attrs[n]; },
            append(...nodes) { for (const n of nodes) { if (typeof n === 'string') { const t = el('#text'); t._text = n; this.children.push(t); continue; } n.parent = this; this.children.push(n); if (n.id) ids.set(n.id, n); } },
            replaceChildren(...nodes) { this.children = []; this.append(...nodes); },
            addEventListener(t, fn) { (handlers[t] ||= []).push(fn); },
            async fire(t, extra = {}) { for (const fn of handlers[t] || []) await fn({ preventDefault() {}, currentTarget: e, target: e, ...extra }); },
            focus() {}, scrollIntoView() {}, reset() { walk(this).forEach(n => { if (['INPUT', 'TEXTAREA'].includes(n.tagName)) n.value = ''; }); },
            querySelector(sel) { return query(this, sel)[0] || null; }, querySelectorAll(sel) { return query(this, sel); }
        };
        created.push(e);
        return e;
    }
    const walk = root => root.children.flatMap(c => [c, ...walk(c)]);
    function query(root, sel) {
        const all = walk(root);
        if (sel === 'textarea') return all.filter(n => n.tagName === 'TEXTAREA');
        if (sel === 'button[type=submit]') return all.filter(n => n.tagName === 'BUTTON' && n.type === 'submit');
        return [];
    }
    const body = el('body');
    const docHandlers = {};
    const document = {
        body, created,
        // The page registers document-level listeners (e.g. Escape closes the New Post dialog); record them like a browser would.
        addEventListener(t, fn) { (docHandlers[t] ||= []).push(fn); },
        fire(t, e = {}) { for (const fn of docHandlers[t] || []) fn({ type: t, target: body, ...e }); },
        createElement: tag => el(tag),
        getElementById(id) { if (!ids.has(id)) { const n = el(['post-channel', 'community-tag', 'community-filter', 'community-sort', 'membership-filter', 'membership-channel'].includes(id) ? 'select' : 'div'); n.id = id; ids.set(id, n); body.append(n); } return ids.get(id); },
        querySelector(sel) { if (!ids.has(sel)) { const n = el(); ids.set(sel, n); } return ids.get(sel); }
    };
    return { document, walk: () => walk(body), ids };
}
// ---- a browser tab ----
function tab(shared, account, { admin = false, extraScripts = [] } = {}) {
    const events = {}, session = memory();
    if (admin) session.setItem('codementor-admin-session', JSON.stringify({ role: 'admin', isDemo: true, signedInAt: Date.now() - 1000 }));
    const dom = makeDocument();
    const state = { account };
    const window = {
        addEventListener(t, fn) { (events[t] ||= []).push(fn); },
        dispatchEvent(e) { for (const fn of events[e.type] || []) fn(e); },
        fire(t, detail = {}) { for (const fn of events[t] || []) fn({ type: t, ...detail }); },
        confirm: () => true,
        platformStore: {
            student(expected) {
                const a = state.account;
                if (!a) throw new Error('Sign in to a student account to continue.');
                if (expected !== undefined && a.email.toLowerCase() !== String(expected).toLowerCase()) throw new Error('Your student account changed. Reload before continuing.');
                return a;
            }
        },
        cmStorage: { activeLanguage: () => state.language || 'python' }
    };
    const context = { window, localStorage: shared, sessionStorage: session, navigator: globalThis.navigator, crypto: globalThis.crypto, structuredClone, Event: class { constructor(type) { this.type = type; } }, CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o?.detail; } }, document: dom.document, setTimeout, console };
    vm.createContext(context);
    for (const file of ['js/community-membership.js', 'js/community-store.js', ...extraScripts]) vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    return { window, state, dom, context, m: window.communityMembership, s: window.communityStore, run(file) { vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }); } };
}
const A = { name: 'Test Learner A', email: 'learner-a@example.test', role: 'student', isDemo: true };
const B = { name: 'Test Learner B', email: 'learner-b@example.test', role: 'student', isDemo: true };
async function approve(adminTab, owner, channel) {
    const r = adminTab.m.requests().find(x => x.owner === owner && x.channel === channel && x.status === 'pending');
    await adminTab.m.decide(r.id, 'approved');
}

module.exports = { memory, makeDocument, tab, A, B, approve };
