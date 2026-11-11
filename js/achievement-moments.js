/* Achievement unlock moments. Earned badges come from progressInsights.achievements() (real data;
   placed-out levels are never earned). A per-account, per-language seen list decides what is new:
     notified  badges already announced with a toast
     shined    badges whose one-time shine already played in My progress
   The first run only records the current state, so existing badges are never replayed. */
(() => {
    "use strict";
    const listName = language => `achievements:${language}`;
    // Pure: next seen state plus what to announce/shine now.
    function diff(earnedIds, seen, { shineHere = false } = {}) {
        const earned = [...new Set(earnedIds)];
        if (!seen || !Array.isArray(seen.notified) || !Array.isArray(seen.shined)) return { next: { notified: earned, shined: earned }, announce: [], shine: [], initialised: true };
        const announce = earned.filter(id => !seen.notified.includes(id));
        const shine = shineHere ? earned.filter(id => !seen.shined.includes(id)) : [];
        return { next: { notified: [...new Set([...seen.notified, ...announce])], shined: [...new Set([...seen.shined, ...shine])] }, announce, shine, initialised: false };
    }
    function run(model, { page = "dashboard", root = document } = {}) {
        const kit = window.interactionKit;
        if (!kit || !model?.account || !model.ready || model.learningError || !model.language) return null;
        const owner = model.account.email.trim().toLowerCase();
        try { if (window.cmStorage.captureOwner() !== owner) return null; } catch { return null; }
        const store = kit.seenStore(owner); if (!store) return null;
        const earned = model.achievements.filter(a => a.earned);
        const result = diff(earned.map(a => a.id), store.get(listName(model.language.id)), { shineHere: page === "progress" });
        if (!store.set(listName(model.language.id), result.next)) return null; // account changed or unreadable: do nothing
        const titles = result.announce.map(id => earned.find(a => a.id === id)?.title).filter(Boolean);
        if (titles.length) kit.toast(titles.length === 1 ? `Badge unlocked: ${titles[0]}` : `${titles.length} badges unlocked: ${titles.join(", ")}`, { tone: "celebrate", duration: 6000 });
        for (const id of result.shine) {
            const card = root.querySelector?.(`[data-achievement="${id}"]`);
            if (card) { card.classList.add("ik-shine"); card.setAttribute("aria-label", `${earned.find(a => a.id === id)?.title || "Badge"}: newly unlocked`); }
        }
        return result;
    }
    window.achievementMoments = Object.freeze({ diff, run, listName });
})();
