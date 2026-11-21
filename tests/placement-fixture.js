const fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
const account = email => ({ name: 'Placement learner', email, role: 'student', isDemo: true });
const memory = map => ({ getItem: key => map.has(key) ? map.get(key) : null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) });
function fixture({ shared = { local: new Map(), session: new Map() }, owner = 'placement-a@example.com', language = 'python' } = {}) {
    shared.local.set('codementor-profile-v1', JSON.stringify(account(owner)));
    shared.local.set(`codementor-learning-v1:${encodeURIComponent(owner)}:codementor-demo-language`, JSON.stringify(language));
    const ids = new Map(), selectors = new Map(), events = new Map();
    function element(tag = 'div') {
        const handlers = new Map(), classes = new Set();
        return { tagName: tag.toUpperCase(), children: [], textContent: '', hidden: false, disabled: false, style: {}, open: false,
            classList: { add: name => classes.add(name), remove: name => classes.delete(name), toggle(name, state) { if (state) classes.add(name); else classes.delete(name); return Boolean(state); } },
            append(...nodes) { this.children.push(...nodes); for (const node of nodes) if (node?.id) ids.set(node.id, node); },
            replaceChildren(...nodes) { this.children = []; this.append(...nodes); }, setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; },
            addEventListener(type, handler) { const list = handlers.get(type) || []; list.push(handler); handlers.set(type, list); },
            fire(type) { for (const handler of handlers.get(type) || []) handler({ preventDefault() {} }); },
            showModal() { this.open = true; }, close() { this.open = false; }, focus() {},
            querySelector() { return null; }, querySelectorAll() { return []; }
        };
    }
    const document = { body: element('body'), createElement: element,
        getElementById(id) { if (!ids.has(id)) ids.set(id, element()); return ids.get(id); },
        querySelector(selector) { if (!selectors.has(selector)) selectors.set(selector, element()); return selectors.get(selector); }, querySelectorAll: () => [] };
    let printed = 0;
    const window = { dispatchEvent(event) { for (const handler of events.get(event.type) || []) handler(event); }, addEventListener(type, handler) { const list = events.get(type) || []; list.push(handler); events.set(type, list); }, print() { printed++; } };
    class CustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
    const location = { pathname: '/index.html', search: '', href: '', replace(value) { this.href = value; } };
    const context = vm.createContext({ window, document, location, localStorage: memory(shared.local), sessionStorage: memory(shared.session), crypto, URL, URLSearchParams, CustomEvent });
    const load = file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
    for (const file of ['learning-storage', 'language-catalog', 'placement-banks', 'placement-engine', 'placement-store', 'python-lessons', 'python-extension', 'curriculum-registry', 'curricula/python', 'curricula/javascript', 'domain/learning', 'data/learning-repository', 'python-curriculum']) load('js/' + file + '.js');
    function finish(answers) {
        let attempt = window.placementStore.begin(window.placementStore.capture());
        attempt = window.placementStore.save({ answers, currentQuestion: answers.length - 1 }, JSON.stringify(attempt), window.placementStore.capture());
        return window.placementStore.submit(JSON.stringify(attempt), window.placementStore.capture());
    }
    return { shared, window, document, location, load, finish, ids, selectors, printed: () => printed, owner, language, store: window.placementStore, course: window.pythonCurriculum, storage: window.cmStorage };
}
module.exports = { fixture, account };
