/* Shared UI pieces for the redesigned Dashboard and My progress: progress ring, badge artwork,
   account menu and date labels. Presentation only; data comes from js/student-overview.js. */
(() => {
    "use strict";
    const SVG = "http://www.w3.org/2000/svg";
    const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    function el(tag, text, cls) { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = text; if (cls) n.className = cls; return n; }
    function svg(tag, attrs = {}) { const n = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); return n; }
    // Circular ring; animates once from 0 unless reduced motion is requested.
    function ring(host, percent, caption) {
        const value = Math.max(0, Math.min(100, Math.round(percent)));
        const r = 52, c = 2 * Math.PI * r;
        const box = svg("svg", { viewBox: "0 0 120 120", "aria-hidden": "true", class: "ring-svg" });
        box.append(svg("circle", { cx: 60, cy: 60, r, class: "ring-track" }));
        const arc = svg("circle", { cx: 60, cy: 60, r, class: "ring-arc", "stroke-dasharray": c.toFixed(2), "stroke-dashoffset": c.toFixed(2), transform: "rotate(-90 60 60)" });
        box.append(arc);
        const label = el("div", undefined, "ring-label");
        label.append(el("span", `${value}%`, "ring-value"), el("span", caption, "ring-caption"));
        host.replaceChildren(box, label);
        host.setAttribute("aria-label", `${value}% ${caption}`);
        host.dataset.percent = String(value);
        const target = (c * (1 - value / 100)).toFixed(2);
        if (reduceMotion() || !window.requestAnimationFrame) arc.setAttribute("stroke-dashoffset", target);
        else requestAnimationFrame(() => requestAnimationFrame(() => arc.setAttribute("stroke-dashoffset", target)));
    }
    // One consistent badge style: a rounded shield with a simple glyph. Locked badges are greyed.
    const GLYPHS = {
        spark: "M60 34l6 16 16 6-16 6-6 16-6-16-16-6 16-6z",
        book: "M40 42h16a6 6 0 0 1 6 6v32a5 5 0 0 0-5-5H40zM80 42H64a6 6 0 0 0-6 6",
        code: "M50 46 38 60l12 14M70 46l12 14-12 14M64 42l-8 36",
        gear: "M60 46a14 14 0 1 0 0 28 14 14 0 0 0 0-28zM60 36v6M60 78v6M36 60h6M78 60h6M43 43l4 4M73 73l4 4M43 77l4-4M73 47l4-4",
        flame: "M60 82c9 0 15-6 15-14 0-7-4-11-8-15-1 4-3 6-6 8 1-7-2-13-8-19 0 7-3 11-6 15-3 4-3 7-3 11 0 8 7 14 16 14z",
        compass: "M60 38a22 22 0 1 0 0 44 22 22 0 0 0 0-44zM68 52l-5 13-13 5 5-13z",
        shield: "M60 38l18 7v13c0 12-8 20-18 24-10-4-18-12-18-24V45zM52 60l6 6 11-12",
        trophy: "M46 40h28v10a14 14 0 0 1-28 0zM46 44h-6a6 6 0 0 0 6 10M74 44h6a6 6 0 0 1-6 10M60 64v10M50 80h20"
    };
    function badge(art, earned, title) {
        const box = svg("svg", { viewBox: "0 0 120 120", class: `badge-art ${earned ? "is-earned" : "is-locked"}`, role: "img", "aria-label": `${title} badge, ${earned ? "earned" : "locked"}` });
        box.append(svg("path", { d: "M60 8l42 16v34c0 26-18 44-42 54C36 102 18 84 18 58V24z", class: "badge-shape" }));
        box.append(svg("path", { d: "M60 18l32 12v28c0 20-14 35-32 43-18-8-32-23-32-43V30z", class: "badge-inner" }));
        box.append(svg("path", { d: GLYPHS[art] || GLYPHS.spark, class: "badge-glyph" }));
        if (!earned) box.append(svg("path", { d: "M84 82h16v14H84zM87 82v-4a5 5 0 0 1 10 0v4", class: "badge-lock" }));
        return box;
    }
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    function relativeDay(iso) {
        const d = new Date(iso), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
        const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        if (sameDay(d, now)) return `Today, ${time}`;
        if (sameDay(d, y)) return `Yesterday, ${time}`;
        return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    }
    // Account menu: the shell's profile pill becomes a small disclosure menu (Profile settings, Log out).
    function accountMenu() {
        const pill = document.querySelector(".workspace-topbar .account-pill");
        if (!pill || pill.dataset.menu) return;
        pill.dataset.menu = "true";
        const wrap = el("div", undefined, "sp-account");
        const button = el("button", undefined, "account-pill sp-account-button"); button.type = "button";
        button.setAttribute("aria-haspopup", "true"); button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-controls", "sp-account-menu");
        [...pill.childNodes].forEach(n => button.append(n));
        const menu = el("div", undefined, "sp-account-menu"); menu.id = "sp-account-menu"; menu.hidden = true;
        const profile = el("a", "Profile settings"); profile.href = pill.href;
        const out = el("button", "Log out"); out.type = "button";
        out.addEventListener("click", () => document.getElementById("logout-button")?.click());
        menu.append(profile, out);
        const close = (focus) => { menu.hidden = true; button.setAttribute("aria-expanded", "false"); if (focus) button.focus(); };
        button.addEventListener("click", () => { const open = menu.hidden; menu.hidden = !open; button.setAttribute("aria-expanded", String(open)); if (open) profile.focus(); });
        wrap.addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) { e.preventDefault(); close(true); } });
        document.addEventListener("click", e => { if (!wrap.contains(e.target)) close(false); });
        wrap.append(button, menu); pill.replaceWith(wrap);
    }
    window.studentPremium = Object.freeze({ el, svg, ring, badge, relativeDay, accountMenu, GLYPHS });
    document.addEventListener("DOMContentLoaded", accountMenu);
})();
