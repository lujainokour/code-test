/* Layout audit: finds empty space and structural problems in a rendered page.
   Browser: window.layoutAudit.run() measures <main> (or <body>) and returns findings.
   Node: require('./tools/layout-audit.js').findIssues(tree, thresholds) on a synthetic tree
   (tests/layout-audit.cjs checks the thresholds). Measurement only; it never changes the page. */
(function (root) {
    "use strict";
    const THRESHOLDS = Object.freeze({
        gap: 120,          // px of vertical blank space between stacked siblings
        narrow: 0.5,       // content narrower than this share of the available width, with nothing beside it
        narrowMinWidth: 600, // only judge "narrow" when the available width is at least this
        columnDiff: 400,   // side-by-side columns: blank area below the shorter one (px)
        columnRatio: 3,    // ... and the taller one is at least this many times taller
        emptyMinHeight: 40 // sections shorter than this are not reported as empty
    });
    const CONTAINER = /(^|\s)[\w-]*(card|panel|section|widget|grid|column|col|rail|aside|sidebar|layout)[\w-]*(\s|$)/;
    const label = n => `${n.tag}${n.id ? "#" + n.id : ""}${n.cls ? "." + n.cls.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
    const totalText = n => n.text + n.children.reduce((s, c) => s + totalText(c), 0);
    const anyMedia = n => n.media || n.children.some(anyMedia);
    const overlapX = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));

    // tree node: {tag, id, cls, x, y, w, h, text (own text length), media (bool), children: [...]}
    function findIssues(tree, t = THRESHOLDS) {
        const issues = [];
        const add = (type, node, detail) => issues.push({ type, at: label(node), ...detail });
        // Narrow content with nothing beside it (only for the root container).
        const kids = tree.children;
        if (kids.length && tree.w >= t.narrowMinWidth) {
            const left = Math.min(...kids.map(k => k.x)), right = Math.max(...kids.map(k => k.x + k.w));
            if ((right - left) < t.narrow * tree.w) add("narrow-content", tree, { width: Math.round(right - left), available: Math.round(tree.w) });
        }
        (function walk(node, parent) {
            const visible = node.children;
            // Big vertical gaps between stacked siblings.
            const stacked = [...visible].sort((a, b) => a.y - b.y);
            for (let i = 1; i < stacked.length; i++) {
                const prev = stacked.slice(0, i).filter(p => overlapX(p, stacked[i]) > 0.5 * Math.min(p.w, stacked[i].w));
                if (!prev.length) continue;
                const bottom = Math.max(...prev.map(p => p.y + p.h)), gap = stacked[i].y - bottom;
                if (gap > t.gap) add("gap", node, { px: Math.round(gap), before: label(stacked[i]) });
            }
            // Unbalanced side-by-side columns (blank area under the shorter column).
            const rows = [];
            for (const c of visible) { const row = rows.find(r => Math.abs(r[0].y - c.y) < 12 && r.every(o => overlapX(o, c) === 0)); if (row) row.push(c); else rows.push([c]); }
            for (const row of rows.filter(r => r.length >= 2)) {
                const tall = Math.max(...row.map(c => c.h)), short = Math.min(...row.map(c => c.h));
                if (tall - short > t.columnDiff && tall / Math.max(short, 1) >= t.columnRatio) add("unbalanced-columns", node, { blank: Math.round(tall - short), columns: row.map(label) });
            }
            // Empty sections: a container-looking box with no text and no media inside.
            if (parent && (["section", "article", "aside"].includes(node.tag) || CONTAINER.test(node.cls)) && node.h >= t.emptyMinHeight && totalText(node) < 3 && !anyMedia(node))
                add("empty-section", node, { height: Math.round(node.h) });
            // Orphan headings: a heading with nothing else in its container.
            if (["h2", "h3"].includes(node.tag) && parent && parent.children.filter(c => c !== node).every(c => totalText(c) < 3 && !anyMedia(c)) && totalText(parent) - totalText(node) < 3)
                add("orphan-heading", node, { container: label(parent) });
            for (const c of visible) walk(c, node);
        })(tree, null);
        return issues;
    }

    // Browser side: reduce the DOM to visible boxes (depth-limited) and run the core.
    function measure(doc = document, win = window, depth = 6) {
        const start = doc.querySelector("main") || doc.body;
        const MEDIA = "img,svg,canvas,video,iframe,input,select,textarea,button,progress,meter";
        function box(el, d) {
            const r = el.getBoundingClientRect(), s = win.getComputedStyle(el);
            if (r.width <= 0 || r.height <= 0 || s.display === "none" || s.visibility === "hidden" || el.closest("dialog:not([open]), [hidden]")) return null;
            let own = 0; for (const n of el.childNodes) if (n.nodeType === 3) own += n.textContent.trim().length;
            const node = { tag: el.tagName.toLowerCase(), id: el.id || "", cls: typeof el.className === "string" ? el.className : "", x: r.left + win.scrollX, y: r.top + win.scrollY, w: r.width, h: r.height,
                text: own, media: el.matches(MEDIA), children: [] };
            if (d < depth) for (const c of el.children) { const b = box(c, d + 1); if (b) node.children.push(b); }
            else node.text += (el.innerText || "").trim().length; // deeper text still counts
            return node;
        }
        const tree = box(start, 0) || { tag: "main", id: "", cls: "", x: 0, y: 0, w: 0, h: 0, text: 0, media: false, children: [] };
        return tree;
    }
    function run(t = THRESHOLDS) { const tree = measure(); return { width: Math.round(tree.w), height: Math.round(tree.h), issues: findIssues(tree, t) }; }
    const api = { THRESHOLDS, findIssues, measure, run };
    root.layoutAudit = api;
    if (typeof module === "object" && module && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
