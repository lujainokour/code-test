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
            document.documentElement.style.removeProperty("visibility");
            verifyServer("admin", "pages/auth/admin-login.html", adminPage);
            return true;
        }
        // Company workspace pages: same pattern as the admin branch, with the company session.
        const companyPage = current.origin === root.origin && current.pathname.startsWith(root.pathname) && /^pages\/company\/company-[a-z0-9-]+\.html$/.test(adminPath) ? adminPath : null;
        if (companyPage) {
            if (!company()) { document.documentElement.style.visibility = "hidden"; const login = new URL("pages/auth/company-login.html", root); login.searchParams.set("next", companyPage + current.search + current.hash); location.replace(login.href); return false; }
            document.documentElement.style.removeProperty("visibility");
            verifyServer("company", "pages/auth/company-login.html", companyPage + current.search + current.hash);
            return true;
        }
        if (!protectedRoute(current)) return true;
        const path = current.pathname.slice(root.pathname.length);
        const asStudent = student();
        if (asStudent || (path.startsWith("pages/services/") && companyPages.has(path.split("/").pop()) && company())) {
            document.documentElement.style.removeProperty("visibility");
            if (asStudent) verifyServer("student", "pages/auth/login.html", path + current.search + current.hash);
            else verifyServer("company", "pages/auth/company-login.html", null);
            return true;
        }
        // Also hide cached content when Back or another tab invalidates the account.
        document.documentElement.style.visibility = "hidden";
        const login = new URL("pages/auth/login.html", root);
        login.searchParams.set("next", path + current.search + current.hash);
        location.replace(login.href);
        return false;
    }
    // ---- Server mode (npm start): the server session is the authority. ----
    // Static hosting has no /api (404), so the original browser-local behaviour is kept there.
    // Under the server, a browser identity that the server session does not confirm is cleared
    // and the visitor is sent to sign in; network or server errors fail closed.
    let statusRequest = null, verifyRun = 0;
    function serverStatus(fresh = false) {
        if (location.protocol === "file:" || typeof fetch !== "function") return Promise.resolve({ server: false });
        if (!fresh && statusRequest) return statusRequest;
        statusRequest = fetch(new URL("api/auth/status", root).href, { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } })
            .then(response => {
                const json = (response.headers.get("content-type") || "").includes("json");
                if (response.status === 404 && !json) return { server: false };
                if (!response.ok || !json) throw new Error("status " + response.status);
                return response.json();
            })
            .then(body => body && body.server === true ? body : { server: false });
        return statusRequest;
    }
    function localEmail(kind) {
        try {
            const raw = kind === "student" ? window.cmStorage.getItem("codementor-demo-session") : localStorage.getItem("codementor-company-session");
            return String(JSON.parse(raw)?.email || "").trim().toLowerCase();
        } catch { return ""; }
    }
    function clearLocal(kind) {
        try {
            if (kind === "admin") sessionStorage.removeItem("codementor-admin-session");
            else if (kind === "company") localStorage.removeItem("codementor-company-session");
            else window.cmStorage.removeItem("codementor-demo-session");
        } catch { /* the redirect below still applies */ }
    }
    function verifyServer(kind, loginPath, next) {
        const html = document.documentElement, run = ++verifyRun;
        html.style.visibility = "hidden";
        const toLogin = () => {
            const login = new URL(loginPath, root);
            if (next) login.searchParams.set("next", next);
            location.replace(login.href);
        };
        serverStatus(true).then(info => {
            if (run !== verifyRun) return;
            if (!info.server) { html.style.removeProperty("visibility"); return; }
            const user = info.user;
            if (user && user.role === kind && (kind === "admin" || localEmail(kind) === user.email)) { html.style.removeProperty("visibility"); return; }
            clearLocal(kind);
            toLogin();
        }, () => { if (run === verifyRun) toLogin(); });
    }
    function serverLogout() {
        return fetch(new URL("api/auth/logout", root).href, { method: "POST", credentials: "same-origin", keepalive: true, headers: { "content-type": "application/json" }, body: "{}" })
            .catch(() => null);
    }
    // A server session whose browser identity was cleared (a "Log out" button that only removes the
    // local keys) is ended as soon as the sign-in page opens, so no orphaned session stays signed in.
    function hasLocalIdentity(role) {
        if (role === "admin") { try { return JSON.parse(sessionStorage.getItem("codementor-admin-session") || "null")?.role === "admin"; } catch { return false; } }
        return Boolean(localEmail(role));
    }
    function endOrphanedServerSession() {
        serverStatus(true).then(info => {
            if (info.server && info.user && !hasLocalIdentity(info.user.role)) serverLogout();
        }, () => {});
    }
    if (new URL(location.href).pathname.slice(root.pathname.length) === "pages/auth/login.html") endOrphanedServerSession();
    window.cmAccess = Object.freeze({ student, company, returnTarget, check, serverStatus, serverLogout, hasLocalIdentity });
    check();
    window.addEventListener("pageshow", check);
    window.addEventListener("storage", event => {
        if (event.key === null || ["codementor-profile-v1", "codementor-company-session", "codementor-platform-v1"].includes(event.key)) check();
    });
    window.addEventListener("student-account-changed", check);
})();
