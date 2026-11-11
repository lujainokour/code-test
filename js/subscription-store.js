/* Local Freemium access state. This is a UI prototype, not a billing system. */
(() => {
    "use strict";
    const key = "codementor-demo-subscription";
    function student(expectedOwner) {
        const raw = window.cmStorage.getItem("codementor-demo-session");
        if (raw === null) throw new Error("Sign in to your student account before changing a plan.");
        let account;
        try { account = JSON.parse(raw); } catch { throw new Error("The student account could not be read. No subscription data was changed."); }
        if (!account || account.role !== "student" || account.isDemo !== true || typeof account.email !== "string" || !account.email.trim()) {
            throw new Error("A valid student demo account is required to manage a plan.");
        }
        if (expectedOwner !== undefined && account.email.trim().toLowerCase() !== expectedOwner) throw new Error("Your student account changed. Reload before changing a plan.");
        return account;
    }
    function read() {
        const raw = window.cmStorage.getItem(key);
        if (raw === null) return { version: 1, plan: "free", status: "active" };
        let value;
        try { value = JSON.parse(raw); } catch { throw new Error("Saved plan information could not be read. It has not been changed."); }
        if (!value || value.version !== 1 || !["free", "premium"].includes(value.plan) ||
            !["active", "demo-active"].includes(value.status) ||
            (value.plan === "premium" && value.status !== "demo-active") ||
            (value.updatedAt !== undefined && !Number.isFinite(Date.parse(value.updatedAt)))) {
            throw new Error("Saved plan information is invalid. It has not been changed.");
        }
        return value;
    }
    function hasPremium() {
        const plan = read();
        return plan.plan === "premium" && plan.status === "demo-active";
    }
    function canAccessLevel(levelNumber) {
        if (!Number.isInteger(levelNumber) || levelNumber < 1) return false;
        return levelNumber <= 5 || hasPremium();
    }
    function activateDemoPremium(expectedOwner) {
        student(expectedOwner);
        read(); // Preserve unreadable saved plans instead of replacing them.
        const next = { version: 1, plan: "premium", status: "demo-active", updatedAt: new Date().toISOString() };
        window.cmStorage.setItem(key, JSON.stringify(next));
        return next;
    }
    function returnToFree(expectedOwner) {
        student(expectedOwner);
        read();
        window.cmStorage.setItem(key, JSON.stringify({ version: 1, plan: "free", status: "active", updatedAt: new Date().toISOString() }));
        return read();
    }
    window.subscriptionStore = Object.freeze({ read, hasPremium, canAccessLevel, activateDemoPremium, returnToFree });
    function refreshProtectedAccess() {
        if (!/\/(lesson|module|level-assessment|workspace)\.html$/.test(location.pathname)) return;
        const course = window.pythonCurriculum;
        if (!course) return;
        const task = new URLSearchParams(location.search).get("task");
        const level = location.pathname.endsWith("/workspace.html") ? course.levels.find(level => level.tasks.includes(task)) : course.selected;
        if (!level || level.id <= 5) return;
        try { if (hasPremium()) return; } catch { /* Unreadable entitlements fail closed. */ }
        window.learningUnavailable = true;
        window.pythonRunner?.stop();
        location.replace("subscription.html?access=premium-required");
    }
    window.addEventListener("storage", event => { if (event.key === null || event.key?.endsWith(":codementor-demo-subscription")) refreshProtectedAccess(); });
    window.addEventListener("learning-progress-changed", event => { if (event.detail?.key === key) refreshProtectedAccess(); });
    window.addEventListener("pageshow", refreshProtectedAccess);
})();
