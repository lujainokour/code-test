// End-to-end passkey test in real Chrome (or Edge) with a Chrome DevTools WebAuthn *virtual authenticator*.
// It drives the actual pages: sign-up, Security settings, "Sign in with Face ID", re-authentication,
// removal, cancellation, unsupported browsers, role redirects and the static-hosting fallback.
// No physical Face ID / Windows Hello hardware is involved; the virtual authenticator stands in for it.
// Run: npm run test:passkey-browser   (CHROME_PATH=... to choose a browser)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import express from "express";
import { loadConfig, projectRoot } from "../server/config.mjs";
import { migrateUp, openDatabase } from "../server/db.mjs";
import { createApp } from "../server/app.mjs";
import { hashPassword } from "../server/passwords.mjs";

const PORT = 8791, STATIC_PORT = 8792;
const ORIGIN = `http://localhost:${PORT}`;
const PASSWORD = "Browser test password 42";
const chromePath = process.env.CHROME_PATH || [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(file => fs.existsSync(file));
if (!chromePath) { console.error("No Chrome/Edge found. Set CHROME_PATH."); process.exit(2); }

let passed = 0, failed = 0;
function check(name, condition, detail = "") {
    if (condition) { passed++; console.log("PASS " + name); }
    else { failed++; console.log("FAIL " + name + (detail ? " — " + detail : "")); }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---------- servers ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cm-passkey-e2e-"));
const config = loadConfig({ NODE_ENV: "test", PORT: String(PORT), DB_PATH: path.join(tmp, "test.db") });
const db = openDatabase(config.dbPath);
migrateUp(db);
const server = createApp({ config, db }).listen(PORT, "127.0.0.1");
const staticServer = express().use(express.static(projectRoot)).listen(STATIC_PORT, "127.0.0.1"); // the old static hosting: no /api

// ---------- Chrome + CDP ----------
const profile = path.join(tmp, "profile");
const chrome = spawn(chromePath, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--host-resolver-rules=MAP localhost 127.0.0.1", "about:blank"
], { stdio: "ignore" });
let wsUrl;
for (let i = 0; i < 100 && !wsUrl; i++) {
    await sleep(100);
    try { const [port, browserPath] = fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").trim().split("\n"); wsUrl = `ws://127.0.0.1:${port}${browserPath}`; } catch { /* not ready */ }
}
if (!wsUrl) { console.error("Chrome did not start."); process.exit(2); }

const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map(), listeners = [];
socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
        const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
        message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    } else if (message.method) listeners.forEach(listener => listener(message));
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++nextId; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});

async function newPage({ authenticator = true, removeWebAuthn = false } = {}) {
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const page = {
        sessionId, targetId,
        cmd: (method, params) => send(method, params, sessionId),
        async eval(expression) {
            const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
            if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
            return result.result.value;
        },
        async goto(url) { await send("Page.navigate", { url }, sessionId); await page.waitFor("document.readyState === 'complete'"); await sleep(150); },
        async waitFor(expression, timeout = 10000) {
            const end = Date.now() + timeout;
            while (Date.now() < end) { try { if (await page.eval(`(() => { try { return Boolean(${expression}); } catch { return false; } })()`)) return true; } catch { /* navigating */ } await sleep(100); }
            return false;
        },
        url: () => page.eval("location.href")
    };
    await page.cmd("Page.enable");
    await page.cmd("Runtime.enable");
    // Accept window.confirm() dialogs (used by "Remove passkey").
    listeners.push(message => { if (message.sessionId === sessionId && message.method === "Page.javascriptDialogOpening") page.cmd("Page.handleJavaScriptDialog", { accept: true }); });
    if (removeWebAuthn) await page.cmd("Page.addScriptToEvaluateOnNewDocument", { source: "delete window.PublicKeyCredential;" });
    if (authenticator) {
        await page.cmd("WebAuthn.enable", { enableUI: false });
        page.authenticatorId = (await page.cmd("WebAuthn.addVirtualAuthenticator", { options: {
            protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true,
            isUserVerified: true, automaticPresenceSimulation: true
        } })).authenticatorId;
    }
    return page;
}
const status = page => page.eval("fetch('/api/auth/status', {cache:'no-store'}).then(r => r.json())");
async function signOut(page) {
    await page.eval("fetch('/api/auth/logout', {method:'POST', headers:{'content-type':'application/json'}, body:'{}'}).then(() => { localStorage.clear(); sessionStorage.clear(); })");
}

try {
    // ===== Static hosting keeps the original behaviour =====
    const staticPage = await newPage({ authenticator: false });
    await staticPage.goto(`http://localhost:${STATIC_PORT}/pages/auth/login.html`);
    await sleep(400);
    check("Static hosting: passkey button stays hidden", await staticPage.eval("document.querySelector('[data-passkey-signin]').hidden === true"));
    check("Static hosting: original demo sample remains visible", await staticPage.eval("document.querySelector('.demo-account').hidden === false"));

    // ===== Student: sign up through the real form =====
    const page = await newPage();
    await page.goto(`${ORIGIN}/pages/auth/signup.html`);
    await page.eval(`(() => {
        const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', {bubbles:true})); };
        set('full-name', 'Lina Browser'); set('email', 'lina@school.test'); set('age', '19');
        set('password', ${JSON.stringify(PASSWORD)}); set('confirm-password', ${JSON.stringify(PASSWORD)});
        document.getElementById('signup-form').requestSubmit();
    })()`);
    check("Sign-up creates a server account and opens onboarding", await page.waitFor("location.pathname.endsWith('/pages/student/onboarding.html')"), await page.url());
    check("Server session belongs to the new student", (await status(page)).user?.email === "lina@school.test");

    // ===== Security settings: enrol a passkey =====
    await page.goto(`${ORIGIN}/pages/auth/security.html`);
    await page.waitFor("!document.getElementById('add-passkey').disabled");
    check("Security page shows 'Enable Face ID / Passkey' when none exist", (await page.eval("document.getElementById('add-passkey-label').textContent")) === "Enable Face ID / Passkey");
    await page.eval("document.getElementById('add-passkey').click()");
    check("Passkey enrolment succeeds via the virtual authenticator", await page.waitFor("document.querySelectorAll('#passkey-list li').length === 1"), await page.eval("document.getElementById('security-message').textContent"));
    check("Enrolment confirmation is shown", /Passkey added/.test(await page.eval("document.getElementById('security-message').textContent")));
    check("Button changes to 'Register another device'", (await page.eval("document.getElementById('add-passkey-label').textContent")) === "Register another device");
    const credentials = (await page.cmd("WebAuthn.getCredentials", { authenticatorId: page.authenticatorId })).credentials;
    check("The authenticator created a discoverable credential", credentials.length === 1 && credentials[0].isResidentCredential === true);
    check("Server stored only a public key (no biometric data columns)", db.prepare("SELECT COUNT(*) n FROM passkey_credentials").get().n === 1
        && !db.prepare("PRAGMA table_info(passkey_credentials)").all().some(c => /face|bio|image|template/i.test(c.name)));
    // Second registration on the same authenticator is blocked by excludeCredentials.
    await page.eval("document.getElementById('add-passkey').click()");
    await page.waitFor("!document.getElementById('add-passkey').disabled");
    check("Duplicate enrolment on the same device is refused", /already has a passkey|already registered/.test(await page.eval("document.getElementById('security-message').textContent")) && db.prepare("SELECT COUNT(*) n FROM passkey_credentials").get().n === 1,
        await page.eval("document.getElementById('security-message').textContent"));

    // Rename
    await page.eval("document.querySelector('#passkey-list li .pk-btn-secondary').click()");
    await page.eval("(() => { const i = document.querySelector('.passkey-rename input'); i.value = 'Lina laptop'; i.form.requestSubmit(); })()");
    check("Rename device", await page.waitFor("document.querySelector('.passkey-item-name')?.textContent === 'Lina laptop'"));

    // ===== Sign out, then "Sign in with Face ID" =====
    await signOut(page);
    await page.goto(`${ORIGIN}/pages/auth/login.html`);
    check("Server mode: passkey button visible", await page.waitFor("document.querySelector('[data-passkey-signin]').hidden === false && !document.querySelector('.passkey-button').hidden"));
    check("Server mode: sample demo credentials hidden", await page.eval("document.querySelector('.demo-account').hidden === true"));
    check("Button text is 'Sign in with Face ID'", (await page.eval("document.querySelector('.passkey-button strong').textContent")) === "Sign in with Face ID");

    // Cancelled / failed user verification
    await page.cmd("WebAuthn.setUserVerified", { authenticatorId: page.authenticatorId, isUserVerified: false });
    await page.eval("document.querySelector('.passkey-button').click()");
    await page.waitFor("['cancelled','error'].includes(document.querySelector('[data-passkey-signin]').dataset.state)", 15000);
    check("Failed/cancelled verification shows a clear message and no session", /cancelled|couldn't verify/i.test(await page.eval("document.querySelector('.passkey-status').textContent")) && !(await status(page)).user,
        await page.eval("document.querySelector('.passkey-status').textContent"));
    await page.cmd("WebAuthn.setUserVerified", { authenticatorId: page.authenticatorId, isUserVerified: true });

    await page.eval("document.querySelector('.passkey-button').click()");
    check("Passkey sign-in redirects the student to their workspace", await page.waitFor("/\\/pages\\/student\\/(onboarding|dashboard)\\.html$/.test(location.pathname)"), await page.url());
    check("Passkey sign-in created a server session", (await status(page)).user?.email === "lina@school.test");
    check("Local workspace identity matches the server user", await page.eval("JSON.parse(cmStorage.getItem('codementor-demo-session')).email === 'lina@school.test'"));
    check("Credential usage recorded (counter / last used)", db.prepare("SELECT last_used_at FROM passkey_credentials").get().last_used_at > 0);

    // ===== Guard: server session ended elsewhere => protected pages close =====
    await page.eval("fetch('/api/auth/logout', {method:'POST', headers:{'content-type':'application/json'}, body:'{}'})");
    await page.goto(`${ORIGIN}/pages/student/dashboard.html`);
    check("Protected page without a server session redirects to sign-in", await page.waitFor("location.pathname.endsWith('/pages/auth/login.html')"), await page.url());
    check("Stale local identity was cleared", await page.eval("cmStorage.getItem('codementor-demo-session') === null"));

    // ===== Unknown passkey (removed on the server) =====
    const keep = db.prepare("SELECT * FROM passkey_credentials").get();
    db.prepare("DELETE FROM passkey_credentials").run();
    await page.goto(`${ORIGIN}/pages/auth/login.html`);
    await page.waitFor("!document.querySelector('.passkey-button').hidden");
    await page.eval("document.querySelector('.passkey-button').click()");
    await page.waitFor("document.querySelector('[data-passkey-signin]').dataset.state === 'error'", 15000);
    check("Unregistered passkey shows the 'not registered' guidance", /isn't registered/.test(await page.eval("document.querySelector('.passkey-status').textContent")));
    db.prepare(`INSERT INTO passkey_credentials (id, credential_id, user_id, public_key, counter, transports, device_name, aaguid, backup_eligible, backup_state, created_at, last_used_at)
                VALUES (@id, @credential_id, @user_id, @public_key, @counter, @transports, @device_name, @aaguid, @backup_eligible, @backup_state, @created_at, @last_used_at)`).run(keep);

    // ===== Password fallback still works, then removal requires re-authentication =====
    await page.eval(`(() => { document.getElementById('email').value = 'lina@school.test'; document.getElementById('password').value = ${JSON.stringify(PASSWORD)}; document.getElementById('login-form').requestSubmit(); })()`);
    check("Password sign-in still works (fallback)", await page.waitFor("/\\/pages\\/student\\/(onboarding|dashboard)\\.html$/.test(location.pathname)"), await page.url());
    db.prepare("UPDATE sessions SET reauth_at = 0").run();
    await page.goto(`${ORIGIN}/pages/auth/security.html`);
    await page.waitFor("document.querySelectorAll('#passkey-list li').length === 1");
    await page.eval("document.querySelector('#passkey-list li .pk-btn-danger').click()");
    check("Removing a passkey asks for the password first", await page.waitFor("document.getElementById('reauth-dialog').open"));
    await page.eval(`(() => { document.getElementById('reauth-password').value = ${JSON.stringify(PASSWORD)}; document.getElementById('reauth-form').requestSubmit(); })()`);
    check("After re-authentication the passkey is removed", await page.waitFor("document.querySelectorAll('#passkey-list li').length === 0 && !document.getElementById('passkey-empty').hidden"));
    check("Status shows passkey sign-in is off", (await page.eval("document.getElementById('passkey-status-title').textContent")) === "Passkey sign-in is off");

    // ===== Unsupported browser =====
    const legacy = await newPage({ authenticator: false, removeWebAuthn: true });
    await legacy.goto(`${ORIGIN}/pages/auth/login.html`);
    await legacy.waitFor("document.querySelector('[data-passkey-signin]').dataset.state === 'unsupported'");
    check("Unsupported browser: no functional Face ID button", await legacy.eval("document.querySelector('.passkey-button').hidden === true"));
    check("Unsupported browser: explains to use the password", /aren't supported/.test(await legacy.eval("document.querySelector('.passkey-status').textContent")));

    // ===== Admin: password sign-in, enrol, then passkey sign-in from the student page => admin dashboard =====
    const now = Date.now();
    db.prepare("INSERT INTO users (public_id, email, display_name, role, password_hash, webauthn_user_id, created_at, updated_at) VALUES (?, ?, 'Ops Admin', 'admin', ?, ?, ?, ?)")
        .run(crypto.randomUUID(), "ops@codementor.test", await hashPassword(PASSWORD), crypto.randomBytes(32).toString("base64url"), now, now);
    const admin = await newPage();
    await admin.goto(`${ORIGIN}/pages/auth/admin-login.html`);
    await admin.eval(`(() => { document.getElementById('email').value = 'ops@codementor.test'; document.getElementById('password').value = ${JSON.stringify(PASSWORD)}; document.getElementById('login-form').requestSubmit(); })()`);
    check("Admin password sign-in opens the admin dashboard", await admin.waitFor("location.pathname.endsWith('/pages/admin/admin-dashboard.html')"), await admin.url());
    check("Admin sidebar links to Security & passkeys", await admin.waitFor("document.querySelector('.shell-security-link')"));
    await admin.goto(`${ORIGIN}/pages/auth/security.html`);
    await admin.waitFor("!document.getElementById('add-passkey').disabled");
    await admin.eval("document.getElementById('add-passkey').click()");
    check("Admin enrols a passkey", await admin.waitFor("document.querySelectorAll('#passkey-list li').length === 1"));
    await signOut(admin);
    await admin.goto(`${ORIGIN}/pages/auth/login.html`);
    await admin.waitFor("!document.querySelector('.passkey-button').hidden");
    await admin.eval("document.querySelector('.passkey-button').click()");
    check("Passkey sign-in redirects by role (admin => admin dashboard)", await admin.waitFor("location.pathname.endsWith('/pages/admin/admin-dashboard.html')"), await admin.url());

    // Wrong-role password page
    await signOut(admin);
    await admin.goto(`${ORIGIN}/pages/auth/admin-login.html`);
    await admin.eval(`(() => { document.getElementById('email').value = 'lina@school.test'; document.getElementById('password').value = ${JSON.stringify(PASSWORD)}; document.getElementById('login-form').requestSubmit(); })()`);
    await admin.waitFor("document.getElementById('login-message').classList.contains('is-error')");
    check("A student cannot use the admin sign-in page", (await admin.url()).endsWith("/pages/auth/admin-login.html") && !(await status(admin)).user);
} catch (error) {
    failed++;
    console.log("FAIL unexpected error — " + error.message);
} finally {
    try { await send("Browser.close"); } catch { chrome.kill(); }
    server.close(); staticServer.close(); db.close();
    await sleep(300);
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* Chrome may still hold files briefly */ }
}
console.log(`\n${passed} passed, ${failed} failed (browser: ${path.basename(chromePath)}, virtual authenticator)`);
process.exit(failed ? 1 : 0);
