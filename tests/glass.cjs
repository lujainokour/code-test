/* Glass design language: WCAG AA contrast against the WORST point of the backdrop, fallbacks,
   user preferences, screen-only scope (print unchanged) and the "never translucent" rules. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
let count = 0;
function check(name, body) { body(); count++; console.log('PASS ' + name); }
const css = fs.readFileSync('css/student-premium.css', 'utf8');
const section = css.slice(css.indexOf('/* 19. GLASS DESIGN LANGUAGE'));
const token = name => {
    const m = section.match(new RegExp(`${name}:\\s*([^;]+);`)) || css.match(new RegExp(`${name}:\\s*([^;]+);`));
    assert.ok(m, 'token ' + name); return m[1].trim();
};
function parse(value) {
    let m = value.match(/^#([0-9a-f]{6})$/i);
    if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4), 16), a: 1 };
    m = value.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: +m[4] };
    throw Error('Unsupported colour ' + value);
}
const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Every point of the backdrop is a mix of the gradient (between its two stops) and any overlap of the
// blobs at their peak opacity. Sampling the gradient ends plus every blob subset over them covers the
// extremes; blur only averages these, so it cannot go beyond them.
function backdropSamples() {
    const bases = [token('--glass-backdrop-top'), token('--glass-backdrop-bottom')].map(parse);
    const blobs = ['--glass-blob-burgundy', '--glass-blob-blue', '--glass-blob-teal'].map(t => parse(token(t)));
    const samples = [];
    for (const base of bases) for (let mask = 0; mask < 8; mask++) {
        let c = base; blobs.forEach((blob, i) => { if (mask & (1 << i)) c = over(blob, c); }); samples.push(c);
    }
    return samples;
}
const worst = (fg, surfaceToken) => Math.min(...backdropSamples().map(bg => contrast(over(parse(fg), parse('#ffffff')), over(parse(token(surfaceToken)), bg))));

check('Tokens and components exist: glass backgrounds, border, blur, shadow, radius and the five components', () => {
    for (const t of ['--glass-bg', '--glass-bg-strong', '--glass-border', '--glass-blur', '--glass-shadow', '--glass-radius']) token(t);
    for (const c of ['.glass,', '.glass-card', '.glass-panel', '.glass-bar', '.glass-chip']) assert.ok(section.includes(c), c);
    assert.match(token('--glass-bg'), /rgba\(255, 255, 255, \.(5[5-9]|6\d|70)\)/, 'translucent white about 55-70%');
    assert.match(token('--glass-blur'), /^1[4-9]px|20px$/, 'blur about 14-20px');
});
check('WCAG AA: body, muted and link text on every glass surface, against the WORST backdrop point', () => {
    const texts = { ink: token('--cm-ink'), ink2: token('--cm-ink-2'), muted: '#405761', burgundy: token('--cm-burgundy-700'), success: '#176139', amber: '#844800' };
    for (const surface of ['--glass-bg', '--glass-bg-item', '--glass-bg-strong']) for (const [name, fg] of Object.entries(texts)) {
        const ratio = worst(fg, surface);
        assert.ok(ratio >= 4.5, `${name} on ${surface}: ${ratio.toFixed(2)} < 4.5`);
    }
});
check('WCAG AA: sidebar nav text on the translucent burgundy glass against the LIGHTEST backdrop; current page item too', () => {
    const sidebarOver = bg => over(parse(token('--glass-sidebar')), bg);
    for (const bg of backdropSamples()) {
        const side = sidebarOver(bg);
        assert.ok(contrast(parse('#ffffff'), side) >= 7, 'white nav text');
        assert.ok(contrast(over(parse(token('--glass-sidebar-muted')), side), side) >= 4.5, 'muted sidebar labels');
        const current = over(parse('rgba(255, 255, 255, .9)'), side);
        assert.ok(contrast(parse('#3a0610'), current) >= 4.5, 'current page item');
    }
});
check('The guard really fails on a weak surface (sanity check of the method)', () => {
    const tooThin = Math.min(...backdropSamples().map(bg => contrast(parse('#4a5b63'), over(parse('rgba(255, 255, 255, .05)'), over(parse('rgba(122, 31, 61, .9)'), bg)))));
    assert.ok(tooThin < 4.5);
});
check('Fallbacks and preferences: no backdrop-filter -> solid; reduced transparency, more contrast, reduced motion respected', () => {
    assert.match(section, /@supports not \(\(-webkit-backdrop-filter: blur\(1px\)\) or \(backdrop-filter: blur\(1px\)\)\) \{\s*body\.glass-ui \{ --glass-bg: #f3f8fa; --glass-bg-strong: #ffffff;/);
    assert.match(section, /@media \(prefers-reduced-transparency: reduce\) \{\s*body\.glass-ui \{ --glass-bg: #f3f8fa; --glass-bg-strong: #ffffff;[^}]*--glass-blur: 0px;/);
    assert.match(section, /@media \(prefers-contrast: more\) \{[^}]*--glass-bg: #ffffff;[^}]*\}\s*body\.glass-ui::before \{ display: none; \}/);
    assert.match(section, /@media \(prefers-reduced-motion: no-preference\) \{\s*body\.glass-ui::before \{ animation:/, 'drift only when motion is allowed');
    const standard = (section.match(/[^-]backdrop-filter: blur/g) || []).length, webkit = (section.match(/-webkit-backdrop-filter: blur/g) || []).length;
    assert.ok(standard > 0 && standard === webkit, 'every backdrop-filter has a -webkit- twin');
});
check('Screen only: print (incl. the Completion badge print view) is untouched; no backdrop-filter outside the glass section', () => {
    const body = section.slice(section.indexOf('}', section.indexOf(':root {')) + 1);
    assert.ok(body.trimStart().startsWith('@media screen {'), 'everything after the tokens is inside @media screen');
    assert.ok(!/@media print/.test(section));
    // Glass lives in one place: no other stylesheet uses the opt-in class or the glass tokens.
    for (const file of fs.readdirSync('css').filter(f => f.endsWith('.css') && f !== 'student-premium.css'))
        assert.ok(!/glass-ui|--glass-/.test(fs.readFileSync('css/' + file, 'utf8')), file);
});
check('Never translucent: code, editor, tables, long reading text and fields have no backdrop blur; code blocks are solid white', () => {
    assert.match(section, /body\.glass-ui :is\(pre, code, \.community-code, \.question-code, \.code-editor, \.program-input, table, #learning-report, #lesson-explanation, input, textarea, select\) \{ -webkit-backdrop-filter: none; backdrop-filter: none; \}/);
    assert.match(section, /body\.glass-ui :is\(\.community-code, \.community-code pre, \.coding-output-panel pre, #learning-report, table\) \{ background: #fff; \}/);
    assert.ok(!/body\.glass-ui :is\([^)]*\.(community-card|practice-task-card|roadmap-card|badge-card)[^)]*\) \{[^}]*backdrop-filter/.test(section), 'repeated items get no blur');
});
check('Backdrop is CSS only: gradient + radial blobs, fixed, no images, video or url()', () => {
    const before = section.slice(section.indexOf('body.glass-ui::before {'), section.indexOf('@media (prefers-reduced-motion'));
    assert.match(before, /position: fixed/); assert.match(before, /linear-gradient\(160deg/); assert.equal((before.match(/radial-gradient/g) || []).length, 3);
    assert.ok(!/url\(|<img|video/.test(section));
});
console.log(`${count} glass checks passed.`);
