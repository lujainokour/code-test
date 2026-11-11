/* Optional external assignments. Paste the real Kahoot Assignment share link here.
   No scores, completion tracking, storage or level-unlock rules belong in this data. */
(() => {
    "use strict";
    const levels = {
        python: {
            "1": {
                title: "Level 01 Challenge",
                description: "Review what you learned with an optional Kahoot! challenge.",
                assignmentUrl: null
            }
        }
    };
    function assignmentUrl(value) {
        if (typeof value !== "string" || !/^https:\/\//i.test(value.trim())) return null;
        try {
            const url = new URL(value.trim());
            // Exact official participant host and direct Assignment path only.
            // Deliberately reject the homepage, public quiz/share pages and lookalikes.
            if (url.protocol !== "https:" || url.hostname !== "kahoot.it" || url.port || url.username || url.password || !/^\/challenge\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) return null;
            return url.href;
        } catch { return null; }
    }
    window.levelChallenges = Object.freeze({
        get: (language, levelId) => levels[language]?.[String(levelId)] || null,
        assignmentUrl
    });
})();
