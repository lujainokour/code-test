/* Navigation checks for the local demo. Production authorization belongs on a server. */
(() => {
    "use strict";
    const root = new URL("../", document.currentScript.src);
    const companyPages = new Set([
        "showcase.html", "student-public-profile.html", "freelance-services.html", "service-details.html"
    ]);
    function valid(account, role) {
        return account?.role === role && account.isDemo === true &&
            typeof account.name === "string" && Boolean(account.name.trim()) &&
            typeof account.email === "string" && Boolean(account.email.trim());
    }
    function student() {
        try { return valid(JSON.parse(window.cmStorage.getItem("codementor-demo-session")), "student"); }
        catch { return false; }
    }
    function company() {
        try { return valid(JSON.parse(localStorage.getItem("codementor-company-session")), "company"); }
        catch { return false; }
    }
    function protectedRoute(url) {
        if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return false;
        const path = url.pathname.slice(root.pathname.length);
        return /^pages\/(student|services)\/[a-z0-9-]+\.html$/.test(path) || path === "pages/auth/change-password.html";
    }
    function returnTarget(value) {
        if (!value) return null;
        try {
            const url = new URL(value, root);
            return protectedRoute(url) ? url.href : null;
        } catch { return null; }
    }
    function check() {
        const current = new URL(location.href);
        const adminPath = current.pathname.slice(root.pathname.length);
        const adminPage = current.origin === root.origin && current.pathname.startsWith(root.pathname) && /^pages\/admin\/admin-[a-z0-9-]+\.html$/.test(adminPath) ? adminPath : null;
        if (adminPage) {
            let allowed = false;
            try { const account = JSON.parse(sessionStorage.getItem("codementor-admin-session") || "null"); allowed = account?.role === "admin" && account.isDemo === true && Number.isFinite(account.signedInAt) && account.signedInAt <= Date.now() && Date.now() - account.signedInAt < 8 * 3600000; } catch { /* Fail closed. */ }
            if (!allowed) { document.documentElement.style.visibility = "hidden"; const login = new URL("pages/auth/admin-login.html", root); login.searchParams.set("next", adminPage); location.replace(login.href); return false; }
            document.documentElement.style.removeProperty("visibility"); return true;
        }
        // Company workspace pages: same pattern as the admin branch, with the company session.
        const companyPage = current.origin === root.origin && current.pathname.startsWith(root.pathname) && /^pages\/company\/company-[a-z0-9-]+\.html$/.test(adminPath) ? adminPath : null;
        if (companyPage) {
            if (!company()) { document.documentElement.style.visibility = "hidden"; const login = new URL("pages/auth/company-login.html", root); login.searchParams.set("next", companyPage + current.search + current.hash); location.replace(login.href); return false; }
            document.documentElement.style.removeProperty("visibility"); return true;
        }
        if (!protectedRoute(current)) return true;
        const path = current.pathname.slice(root.pathname.length);
        if (student() || (path.startsWith("pages/services/") && companyPages.has(path.split("/").pop()) && company())) {
            document.documentElement.style.removeProperty("visibility");
            return true;
        }
        // Also hide cached content when Back or another tab invalidates the account.
        document.documentElement.style.visibility = "hidden";
        const login = new URL("pages/auth/login.html", root);
        login.searchParams.set("next", path + current.search + current.hash);
        location.replace(login.href);
        return false;
    }
    window.cmAccess = Object.freeze({ student, company, returnTarget, check });
    check();
    window.addEventListener("pageshow", check);
    window.addEventListener("storage", event => {
        if (event.key === null || ["codementor-profile-v1", "codementor-company-session", "codementor-platform-v1"].includes(event.key)) check();
    });
    window.addEventListener("student-account-changed", check);
})();
