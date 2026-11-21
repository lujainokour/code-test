/* Server authentication client (CodeMentor AI server, see docs/PASSKEYS.md).
   When the site is served by `npm start`, sign-in, sign-up and passkeys go through /api and the server
   session cookie is the authority. When the site is served as static files (no /api), every page keeps
   its original browser-local behaviour and passkeys are not offered.
   Biometric checks (Face ID, Windows Hello, Touch ID, Android) happen inside the device's authenticator;
   this file only ever handles the WebAuthn public-key response, never any biometric data. */
(() => {
    "use strict";
    const root = new URL("../", document.currentScript.src);
    const apiUrl = path => new URL("api/" + path, root).href;
    let csrfToken = null;

    class AuthFailure extends Error {
        constructor(code, message, status = 0) { super(message); this.code = code; this.status = status; }
    }

    async function fetchStatus() {
        if (location.protocol === "file:") return { server: false };
        let response;
        try { response = await fetch(apiUrl("auth/status"), { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } }); }
        catch { return { server: false, unreachable: true }; }
        if (!response.ok || !(response.headers.get("content-type") || "").includes("json")) return { server: false };
        try {
            const body = await response.json();
            csrfToken = body.csrfToken || null;
            return body.server === true ? body : { server: false };
        } catch { return { server: false }; }
    }
    let statusPromise = fetchStatus();
    const status = () => statusPromise;
    const refreshStatus = () => (statusPromise = fetchStatus());

    async function api(path, { method = "GET", body } = {}) {
        let response;
        try {
            response = await fetch(apiUrl(path), {
                method,
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    accept: "application/json",
                    ...(body !== undefined ? { "content-type": "application/json" } : {}),
                    ...(csrfToken ? { "x-csrf-token": csrfToken } : {})
                },
                body: body === undefined ? undefined : JSON.stringify(body)
            });
        } catch {
            throw new AuthFailure("network", "Can't reach CodeMentor AI. Check your connection and try again.");
        }
        let data = null;
        try { data = await response.json(); } catch { /* handled below */ }
        if (!response.ok) {
            throw new AuthFailure(data?.error?.code || "server_error", data?.error?.message || "Something went wrong. Try again.", response.status);
        }
        if (data?.csrfToken) csrfToken = data.csrfToken;
        return data;
    }

    // ---------- WebAuthn library + feature detection ----------
    let libraryPromise = null;
    function library() {
        if (window.SimpleWebAuthnBrowser) return Promise.resolve(window.SimpleWebAuthnBrowser);
        libraryPromise ??= new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = new URL("vendor/simplewebauthn-browser.min.js", root).href;
            script.onload = () => window.SimpleWebAuthnBrowser ? resolve(window.SimpleWebAuthnBrowser) : reject(new Error("missing"));
            script.onerror = () => { libraryPromise = null; reject(new Error("load")); };
            document.head.append(script);
        });
        return libraryPromise;
    }

    // Returns { supported, platform } — `platform` is true when a built-in authenticator
    // (Face ID, Touch ID, Windows Hello, Android biometrics or device PIN) is reported.
    async function passkeySupport() {
        const info = await status();
        if (!info.server || !window.isSecureContext || !window.PublicKeyCredential) return { supported: false, platform: false, server: info.server };
        try {
            const lib = await library();
            if (!lib.browserSupportsWebAuthn()) return { supported: false, platform: false, server: true };
            let platform = false;
            try { platform = await lib.platformAuthenticatorIsAvailable(); } catch { platform = false; }
            return { supported: true, platform, server: true };
        } catch {
            return { supported: false, platform: false, server: true };
        }
    }

    function ceremonyFailure(error, kind) {
        const name = error?.name, code = error?.code;
        if (code === "ERROR_CEREMONY_ABORTED" || name === "AbortError" || name === "NotAllowedError") {
            return new AuthFailure("cancelled", kind === "register"
                ? "Passkey setup was cancelled or timed out. Nothing was saved."
                : "Sign-in was cancelled or timed out. Try again, or sign in with your password.");
        }
        if (name === "InvalidStateError" || code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
            return new AuthFailure("credential_exists", "This device already has a passkey for your account.");
        }
        if (name === "SecurityError" || name === "NotSupportedError" || code === "ERROR_INVALID_DOMAIN" || code === "ERROR_INVALID_RP_ID") {
            return new AuthFailure("unsupported", "Passkeys aren't available on this page or device. Use your password instead.");
        }
        return new AuthFailure("failed", kind === "register"
            ? "Your device couldn't create a passkey. Try again or use another device."
            : "We couldn't verify your passkey. Try again or sign in with your password.");
    }

    // ---------- local session bridge ----------
    // The existing pages read these browser keys. They are written only after the server has verified
    // the sign-in, and access-guard.js re-checks them against the server session on every protected page.
    function establishLocalSession(user) {
        const clearOtherRoles = keep => {
            try { if (keep !== "admin") sessionStorage.removeItem("codementor-admin-session"); } catch { /* ignore */ }
            try { if (keep !== "company") localStorage.removeItem("codementor-company-session"); } catch { /* ignore */ }
            try { if (keep !== "student") window.cmStorage?.removeItem("codementor-demo-session"); } catch { /* ignore */ }
        };
        clearOtherRoles(user.role);
        if (user.role === "student") {
            window.platformStore?.assertAccess(user.email);
            let previous = null;
            try { previous = JSON.parse(window.cmStorage.getItem("codementor-demo-session") || "null"); } catch { previous = null; }
            const same = previous && typeof previous.email === "string" && previous.email.toLowerCase() === user.email;
            window.cmStorage.setItem("codementor-demo-session", JSON.stringify({
                ...(same ? previous : {}),
                name: user.name, email: user.email, ...(user.age ? { age: user.age } : {}),
                role: "student", isDemo: true, server: true
            }));
            try { window.platformStore?.registerStudent({ name: user.name, email: user.email, role: "student", isDemo: true }); } catch { /* registry is optional */ }
        } else if (user.role === "company") {
            localStorage.setItem("codementor-company-session", JSON.stringify({
                email: user.email, name: user.name, role: "company", isDemo: true, server: true, loginTime: new Date().toISOString()
            }));
        } else if (user.role === "admin") {
            sessionStorage.setItem("codementor-admin-session", JSON.stringify({ role: "admin", isDemo: true, server: true, signedInAt: Date.now() }));
        } else {
            throw new AuthFailure("invalid_role", "This account type can't sign in here.");
        }
    }

    // Role-based destination. `next` is honoured only when it is a page that role may open.
    function destinationFor(user, next = new URLSearchParams(location.search).get("next")) {
        const page = path => new URL(path, root).href;
        if (user.role === "admin") {
            return /^pages\/admin\/admin-[a-z0-9-]+\.html$/.test(next || "") ? page(next) : page("pages/admin/admin-dashboard.html");
        }
        if (user.role === "company") {
            return /^pages\/company\/company-[a-z0-9-]+\.html(\?[^#\s]*)?(#[\w-]*)?$/.test(next || "") ? page(next) : page("pages/company/company-dashboard.html");
        }
        const requested = window.cmAccess?.returnTarget(next);
        if (requested) return requested;
        try {
            const saved = window.cmStorage.getItem("codementor-demo-onboarding");
            const preferences = saved === null ? null : JSON.parse(saved);
            return page(preferences && typeof preferences.language === "string" ? "pages/student/dashboard.html" : "pages/student/onboarding.html");
        } catch { return page("pages/student/profile.html"); }
    }

    // If the browser-side checks refuse the account (for example a student suspended in the local admin
    // records), the just-created server session is ended so no signed-in session is left behind.
    function completeSignIn(user, next) {
        try { establishLocalSession(user); }
        catch (error) { logout(); throw error; }
        location.href = destinationFor(user, next);
    }

    // ---------- flows ----------
    const passwordLogin = (email, password, role) => api("auth/login", { method: "POST", body: { email, password, role } }).then(data => data.user);
    const signup = details => api("auth/signup", { method: "POST", body: details }).then(data => data.user);

    async function passkeyLogin() {
        const lib = await library().catch(() => { throw new AuthFailure("unsupported", "Passkeys aren't available in this browser. Use your password instead."); });
        const { options } = await api("passkeys/login/options", { method: "POST", body: {} });
        let response;
        try { response = await lib.startAuthentication({ optionsJSON: options }); }
        catch (error) { throw ceremonyFailure(error, "login"); }
        const { user } = await api("passkeys/login/verify", { method: "POST", body: { response } });
        return user;
    }

    async function registerPasskey(deviceName) {
        const lib = await library();
        const { options } = await api("passkeys/register/options", { method: "POST", body: {} });
        let response;
        try { response = await lib.startRegistration({ optionsJSON: options }); }
        catch (error) { throw ceremonyFailure(error, "register"); }
        return (await api("passkeys/register/verify", { method: "POST", body: { response, deviceName } })).passkeys;
    }

    async function logout() {
        try { await fetch(apiUrl("auth/logout"), { method: "POST", credentials: "same-origin", keepalive: true, headers: { "content-type": "application/json" }, body: "{}" }); }
        catch { /* the server session also expires on its own */ }
    }

    // A friendly default name; users can rename it on the Security page.
    function guessDeviceName() {
        const ua = navigator.userAgent;
        const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android device"
            : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows PC" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux PC" : "This device";
        const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
        return browser ? `${os} · ${browser}` : os;
    }

    // ---------- login-page widget ----------
    // Markup: [data-passkey-signin] containing .passkey-button and .passkey-status.
    async function mountLoginWidget() {
        const box = document.querySelector("[data-passkey-signin]");
        const info = await status();
        if (!info.server) return;
        // The public sample credentials do not exist on the server; hide them so nobody is misled.
        document.querySelectorAll(".demo-account").forEach(node => { node.hidden = true; });
        if (!box) return;
        const button = box.querySelector(".passkey-button");
        const note = box.querySelector(".passkey-status");
        const say = (text, state = "") => { note.textContent = text; box.dataset.state = state; };
        box.hidden = false;
        const support = await passkeySupport();
        if (!support.supported) {
            button.hidden = true;
            say(window.isSecureContext
                ? "Face ID and passkey sign-in aren't supported in this browser. Sign in with your password below."
                : "Passkeys need a secure (HTTPS) connection. Sign in with your password below.", "unsupported");
            return;
        }
        if (!support.platform) box.querySelector(".passkey-sub")?.replaceChildren(document.createTextNode("Use a phone, security key or saved passkey"));
        let busy = false;
        button.addEventListener("click", async () => {
            if (busy) return;
            busy = true; button.disabled = true; button.setAttribute("aria-busy", "true");
            say("Waiting for Face ID, Windows Hello, Touch ID or your device PIN…", "busy");
            try {
                const user = await passkeyLogin();
                say(`Signed in as ${user.name}. Opening your workspace…`, "success");
                completeSignIn(user);
                return;
            } catch (error) {
                say(error instanceof AuthFailure ? error.message : "We couldn't verify your passkey. Try again or sign in with your password.", error?.code === "cancelled" ? "cancelled" : "error");
            }
            busy = false; button.disabled = false; button.removeAttribute("aria-busy");
        });
        window.addEventListener("pageshow", () => { busy = false; button.disabled = false; button.removeAttribute("aria-busy"); });
    }

    window.cmServerAuth = Object.freeze({
        status, refreshStatus, api, passkeySupport, passwordLogin, signup, passkeyLogin, registerPasskey,
        establishLocalSession, destinationFor, completeSignIn, logout, guessDeviceName, AuthFailure
    });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountLoginWidget);
    else mountLoginWidget();
})();
