/* Admin dashboard insights from real, timestamped records only (no sample rows).
   - Range tabs (7 / 30 days) are offered only when dated records exist.
   - A trend vs the previous period is shown only when dated history reaches back before the
     current period, so a brand-new installation never shows a fake "+100%". */
(() => {
    "use strict";
    const DAY = 86400000;
    const valid = d => typeof d === "string" && Number.isFinite(Date.parse(d));
    function windowCounts(dates, days, now = Date.now()) {
        const ts = dates.filter(valid).map(d => Date.parse(d)).filter(t => t <= now);
        const start = now - days * DAY, prevStart = now - 2 * days * DAY;
        const current = ts.filter(t => t > start).length, previous = ts.filter(t => t > prevStart && t <= start).length;
        const hasHistory = ts.some(t => t <= start);
        return { current, previous, hasHistory, delta: hasHistory ? current - previous : null };
    }
    const supportsRanges = (...lists) => lists.some(list => (list || []).some(valid));
    function distribution(items, key, order = []) {
        const counts = new Map(order.map(k => [k, 0]));
        for (const item of items || []) { const k = item?.[key]; if (typeof k === "string") counts.set(k, (counts.get(k) || 0) + 1); }
        const total = [...counts.values()].reduce((a, b) => a + b, 0);
        return { total, rows: [...counts.entries()].map(([label, count]) => ({ label, count, percent: total ? Math.round(count / total * 100) : 0 })) };
    }
    window.adminInsights = Object.freeze({ windowCounts, supportsRanges, distribution });
})();
