/* Minimal DOM for Node/VM tests of page scripts. Not a browser: no layout, CSS or real events. */
function makeDocument({ selects = [] } = {}) {
    const ids = new Map();
    function el(tag = 'div') {
        const handlers = {}, attrs = {}, classes = new Set();
        const e = {
            tagName: String(tag).toUpperCase(), children: [], parent: null, _text: '', hidden: false, disabled: false, value: '', dataset: {}, style: { setProperty(k, v) { this[k] = v; } }, type: '', id: '', open: false, checked: false,
            get textContent() { return this.children.length ? this.children.map(c => c.textContent).join('') : this._text; },
            set textContent(v) { this.children = []; this._text = String(v); },
            get options() { return this.children.filter(c => c.tagName === 'OPTION'); },
            get isConnected() { let n = this; while (n.parent) n = n.parent; return n.tagName === 'BODY'; },
            classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, on) => (on ?? !classes.has(c)) ? classes.add(c) : classes.delete(c) },
            get className() { return [...classes].join(' '); }, set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => classes.add(c)); },
            setAttribute(n, v) { attrs[n] = String(v); }, getAttribute(n) { return attrs[n] ?? null; }, removeAttribute(n) { delete attrs[n]; },
            append(...nodes) { for (const n of nodes) { if (typeof n === 'string') { const t = el('#text'); t._text = n; this.children.push(t); continue; } if (n.parent) n.parent.children = n.parent.children.filter(c => c !== n); n.parent = this; this.children.push(n); if (n.id) ids.set(n.id, n); } },
            prepend(...nodes) { const rest = this.children; this.children = []; this.append(...nodes); this.children.push(...rest); },
            replaceChildren(...nodes) { this.children.forEach(c => { c.parent = null; }); this.children = []; this.append(...nodes); },
            before(...nodes) { const p = this.parent; if (!p) return; const i = p.children.indexOf(this); for (const n of nodes) { if (n.parent) n.parent.children = n.parent.children.filter(c => c !== n); n.parent = p; if (n.id) ids.set(n.id, n); } p.children.splice(i, 0, ...nodes); },
            after(...nodes) { const p = this.parent; if (!p) return; const i = p.children.indexOf(this); for (const n of nodes) { if (n.parent) n.parent.children = n.parent.children.filter(c => c !== n); n.parent = p; if (n.id) ids.set(n.id, n); } p.children.splice(p.children.indexOf(this) + 1, 0, ...nodes); },
            replaceWith(n) { this.before(n); this.remove(); },
            get firstElementChild() { return this.children[0] || null; },
            remove() { if (this.parent) { this.parent.children = this.parent.children.filter(c => c !== this); this.parent = null; } },
            addEventListener(t, fn) { (handlers[t] ||= []).push(fn); },
            async fire(t, extra = {}) { for (const fn of handlers[t] || []) await fn({ type: t, preventDefault() {}, currentTarget: e, target: e, ...extra }); },
            async emit(t, extra = {}) { let n = this; while (n) { await n.fire(t, { target: this, ...extra }); n = n.parent; } },
            focus() {}, scrollIntoView() {}, reportValidity: () => true, showModal() { this.open = true; }, close() { this.open = false; },
            reset() { walk(this).forEach(n => { if (['INPUT', 'TEXTAREA'].includes(n.tagName)) n.value = ''; }); },
            querySelector(sel) { return query(this, sel)[0] || null; }, querySelectorAll(sel) { return query(this, sel); }
        };
        return e;
    }
    const walk = root => root.children.flatMap(c => [c, ...walk(c)]);
    // Supports: tag, #id, .class, tag.class, [data-x="y"], 'a, b' lists and descendant-free simple selectors.
    function matches(n, sel) {
        const m = sel.trim().match(/^([a-z][a-z0-9]*)?(#[\w-]+)?(\.[\w-]+)?(\[[^\]]+\])?$/i);
        if (!m) return false;
        if (m[1] && n.tagName !== m[1].toUpperCase()) return false;
        if (m[2] && n.id !== m[2].slice(1)) return false;
        if (m[3] && !n.classList.contains(m[3].slice(1))) return false;
        if (m[4]) { const [k, v] = m[4].slice(1, -1).split('='); const name = k.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase()); const actual = k.startsWith('data-') ? n.dataset[name] : n.getAttribute(k); if (v === undefined ? actual === undefined || actual === null : actual !== v.replace(/["']/g, '')) return false; }
        return true;
    }
    function query(root, sel) { const parts = sel.split(','); return walk(root).filter(n => parts.some(p => matches(n, p))); }
    const body = el('body');
    const docHandlers = {};
    const document = {
        body, title: 'Dashboard | CodeMentor AI', readyState: 'complete', head: el('head'),
        addEventListener(t, fn) { (docHandlers[t] ||= []).push(fn); }, fire(t, e = {}) { for (const fn of docHandlers[t] || []) fn({ type: t, target: body, ...e }); },
        createTreeWalker: () => ({ nextNode: () => false }), createElementNS: (ns, tag) => el(tag),
        createElement: tag => el(tag),
        createTextNode: text => { const t = el('#text'); t._text = String(text); return t; },
        getElementById(id) { if (ids.has(id) && ids.get(id).isConnected) return ids.get(id); const found = walk(body).find(n => n.id === id); if (found) return found; if (!ids.has(id)) { const n = el(selects.includes(id) ? 'select' : 'div'); n.id = id; ids.set(id, n); body.append(n); } return ids.get(id); },
        querySelector: sel => query(body, sel)[0] || null,
        querySelectorAll: sel => query(body, sel)
    };
    return { document, body, walk: () => walk(body), text: () => walk(body).map(n => n.children.length ? '' : n._text).join(' ') };
}
function memory(map = new Map()) {
    return { map, get length() { return map.size; }, key: i => [...map.keys()][i] ?? null, getItem: k => map.has(k) ? map.get(k) : null, setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), clear: () => map.clear() };
}
function eventWindow(extra = {}) {
    const events = {};
    return Object.assign({
        addEventListener(t, fn) { (events[t] ||= []).push(fn); },
        dispatchEvent(e) { for (const fn of events[e.type] || []) fn(e); return true; },
        fire(t, detail = {}) { for (const fn of events[t] || []) fn({ type: t, ...detail }); },
        confirm: () => true
    }, extra);
}
module.exports = { makeDocument, memory, eventWindow };
