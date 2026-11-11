/* Exercise the real language controller against storage and lifecycle events. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
let count = 0;
const a = 'guard-a@example.com', b = 'guard-b@example.com';
function page(pathname = '/pages/student/workspace.html') {
    const local = new Map(), session = new Map(), listeners = new Map(), elements = new Map();
    const profile = email => JSON.stringify({ name: 'Guard learner', email, role: 'student', isDemo: true });
    local.set('codementor-profile-v1', profile(a));
    local.set(`codementor-learning-v1:${encodeURIComponent(a)}:codementor-demo-onboarding`, JSON.stringify({ language: 'python', experience: 'beginner', goal: 'foundations' }));
    const storage = map => ({ getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) });
    const element = () => ({ children: [], setAttribute() {}, append(...items) { this.children.push(...items); } });
    const main = { hidden: false, before(node) { elements.set(node.id, node); } };
    const document = { currentScript: { src: 'http://local.test/js/learning-language.js' }, head: element(), body: element(),
        createElement: element, querySelector: selector => selector === 'main' ? main : null,
        getElementById: id => elements.get(id) || null, createTreeWalker: () => ({ nextNode: () => false }) };
    let stopped = 0;
    const window = { addEventListener(type, handler) { const handlers = listeners.get(type) || []; handlers.push(handler); listeners.set(type, handlers); },
        dispatchEvent(event) { for (const handler of listeners.get(event.type) || []) handler(event); },
        pythonRunner: { stop() { stopped++; } }, javascriptRunner: { stop() { stopped++; } } };
    class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
    const context = vm.createContext({ window, document, localStorage: storage(local), sessionStorage: storage(session), URL, URLSearchParams, CustomEvent, NodeFilter: { SHOW_TEXT: 4 }, location: { pathname, search: '' } });
    for (const file of ['learning-storage', 'language-catalog', 'learning-language']) vm.runInContext(fs.readFileSync('js/' + file + '.js', 'utf8'), context);
    const fire = type => window.dispatchEvent(new CustomEvent(type));
    return { window, main, elements, local, fire, profile, stopped: () => stopped };
}
function check(name, condition) { assert.ok(condition, name); count++; console.log('PASS ' + name); }
let p = page();
p.window.learningLanguage.select('javascript', a);
check('Same-tab language selection hides the stale page and stops both runners', p.main.hidden && p.stopped() >= 2 && p.elements.has('language-change-notice'));
assert.throws(() => p.window.cmStorage.setItem('codementor-demo-learning', '{}'));
check('Stale page cannot write progress after its language changes', !p.local.has(`codementor-learning-v1:${encodeURIComponent(a)}:javascript:codementor-demo-learning`));
p.main.hidden = false; p.fire('pageshow');
check('Back navigation re-hides stale content even if another guard made it visible', p.main.hidden && p.elements.size === 1);
p.main.hidden = false; p.fire('focus');
check('Focus rechecks the current language without duplicating notices', p.main.hidden && p.elements.size === 1);
p = page();
p.window.cmStorage.setItem('codementor-demo-session', p.profile(b));
check('Same-tab account switch immediately hides the previous account page', p.main.hidden && p.window.learningUnavailable);
assert.throws(() => p.window.learningLanguage.select('javascript', a));
check('Stale language selection cannot affect the new account', p.window.cmStorage.activeLanguage() === 'python' && p.window.cmStorage.getItem('codementor-demo-language') === null);
p = page('/pages/student/onboarding.html');
p.window.learningLanguage.select('javascript', a);
check('Onboarding can change its own language without hiding its active form', !p.main.hidden);
p.window.cmStorage.setItem('codementor-demo-session', p.profile(b));
check('Onboarding still hides after a different account takes over', p.main.hidden);
console.log(`${count} language lifecycle guard checks passed.`);
