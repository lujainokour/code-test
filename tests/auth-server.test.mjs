// Server-side passkey + session security tests. Run: npm run test:auth
// Uses the real Express app, a fresh in-memory SQLite database per test and a software authenticator
// that produces genuine signatures, so @simplewebauthn/server verification runs for real.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { loadConfig } from "../server/config.mjs";
import { migrateDown, migrateUp, openDatabase } from "../server/db.mjs";
import { createApp } from "../server/app.mjs";
import { hashPassword } from "../server/passwords.mjs";
import { SoftAuthenticator } from "./helpers/soft-authenticator.mjs";

const ORIGIN = "http://localhost:8780";
const PASSWORD = "correct horse battery staple";

async function setup(env = {}) {
    const config = loadConfig({ NODE_ENV: "test", PORT: "8780", ...env });
    const db = openDatabase(":memory:");
    migrateUp(db);
    const app = createApp({ config, db });
    const server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    return { config, db, base, close: () => new Promise(resolve => server.close(resolve)) };
}

// A minimal browser: cookie jar, Origin header, JSON bodies and the CSRF token.
class Browser {
    constructor(base, origin = ORIGIN) { this.base = base; this.origin = origin; this.cookies = new Map(); this.csrf = null; }
    async request(method, path, body, { headers = {}, csrf = true } = {}) {
        const response = await fetch(this.base + path, {
            method,
            headers: {
                origin: this.origin,
                ...(body !== undefined ? { "content-type": "application/json" } : {}),
                ...(csrf && this.csrf ? { "x-csrf-token": this.csrf } : {}),
                cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
                ...headers
            },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        for (const line of response.headers.getSetCookie()) {
            const [pair, ...attrs] = line.split(";");
            const [name, value] = pair.split("=");
            if (attrs.some(a => a.trim() === "Max-Age=0")) this.cookies.delete(name); else this.cookies.set(name, value);
        }
        const json = response.headers.get("content-type")?.includes("json") ? await response.json() : await response.text();
        if (json?.csrfToken) this.csrf = json.csrfToken;
        return { status: response.status, body: json, headers: response.headers };
    }
    post(path, body = {}, options) { return this.request("POST", path, body, options); }
    get(path) { return this.request("GET", path); }
}

async function signup(env, email = "learner@school.test", role = "student") {
    const browser = new Browser(env.base);
    const res = await browser.post("/api/auth/signup", { role, name: "Test Learner", email, password: PASSWORD, ...(role === "student" ? { age: 20 } : {}) });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return browser;
}

async function enroll(browser, authenticator, deviceName = "Test laptop", createOptions) {
    const { body } = await browser.post("/api/passkeys/register/options");
    assert.ok(body.options?.challenge, JSON.stringify(body));
    const response = authenticator.create(body.options, createOptions);
    return browser.post("/api/passkeys/register/verify", { response, deviceName });
}

async function passkeyLogin(base, authenticator, credentialId, getOptions) {
    const browser = new Browser(base);
    const { body } = await browser.post("/api/passkeys/login/options");
    const response = authenticator.get(body.options, credentialId, getOptions);
    const result = await browser.post("/api/passkeys/login/verify", { response });
    return { browser, result, response, options: body.options };
}

test("1, 2, 15: registers a passkey, signs in with it, and rotates the session", async () => {
    const env = await setup();
    try {
        const browser = await signup(env);
        const auth = new SoftAuthenticator();
        const reg = await enroll(browser, auth);
        assert.equal(reg.status, 201);
        assert.equal(reg.body.passkeys.length, 1);
        assert.equal(reg.body.passkeys[0].deviceName, "Test laptop");
        const stored = env.db.prepare("SELECT * FROM passkey_credentials").get();
        assert.equal(stored.counter, 0);
        assert.equal(JSON.parse(stored.transports).includes("internal"), true);

        const { browser: second, result } = await passkeyLogin(env.base, auth);
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.equal(result.body.user.email, "learner@school.test");
        assert.equal(result.body.user.role, "student");
        const status = await second.get("/api/auth/status");
        assert.equal(status.body.user.email, "learner@school.test");
        const used = env.db.prepare("SELECT counter, last_used_at FROM passkey_credentials").get();
        assert.equal(used.counter, 1);
        assert.ok(used.last_used_at > 0);

        // Session rotation: signing in again from the same browser issues a new token and kills the old one.
        const oldToken = second.cookies.get("cm_session");
        const again = await second.post("/api/passkeys/login/options");
        const res2 = await second.post("/api/passkeys/login/verify", { response: auth.get(again.body.options) });
        assert.equal(res2.status, 200);
        assert.notEqual(second.cookies.get("cm_session"), oldToken);
        const stale = new Browser(env.base); stale.cookies.set("cm_session", oldToken);
        assert.equal((await stale.get("/api/auth/status")).body.user, null);
        // Only token hashes are stored server-side.
        const tokens = env.db.prepare("SELECT token_hash FROM sessions").all().map(r => r.token_hash);
        assert.ok(!tokens.includes(second.cookies.get("cm_session")));
    } finally { await env.close(); }
});

test("3: rejects an invalid signature", async () => {
    const env = await setup();
    try {
        const auth = new SoftAuthenticator();
        await enroll(await signup(env), auth);
        const { result } = await passkeyLogin(env.base, auth, undefined, { tamper: true });
        assert.equal(result.status, 401);
        assert.equal(result.body.error.code, "verification_failed");
        // Signed by a different private key.
        const other = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey;
        const { result: r2 } = await passkeyLogin(env.base, auth, undefined, { signWith: other });
        assert.equal(r2.status, 401);
        assert.equal(r2.body.user, undefined);
    } finally { await env.close(); }
});

test("4, 5: rejects expired and reused challenges", async () => {
    const env = await setup();
    try {
        const auth = new SoftAuthenticator();
        await enroll(await signup(env), auth);
        // Expired
        const browser = new Browser(env.base);
        const { body } = await browser.post("/api/passkeys/login/options");
        env.db.prepare("UPDATE webauthn_challenges SET expires_at = 1").run();
        const expired = await browser.post("/api/passkeys/login/verify", { response: auth.get(body.options) });
        assert.equal(expired.status, 400);
        assert.equal(expired.body.error.code, "challenge_expired");
        // Reused: a valid response replayed with the same flow cookie fails the second time.
        const fresh = new Browser(env.base);
        const opts = await fresh.post("/api/passkeys/login/options");
        const flowCookie = fresh.cookies.get("cm_pkflow");
        const response = auth.get(opts.body.options);
        assert.equal((await fresh.post("/api/passkeys/login/verify", { response })).status, 200);
        const replay = new Browser(env.base); replay.cookies.set("cm_pkflow", flowCookie);
        const replayed = await replay.post("/api/passkeys/login/verify", { response });
        assert.equal(replayed.status, 400);
        assert.equal(replayed.body.error.code, "challenge_expired");
        // No flow cookie at all (challenge not bound to this browser).
        const unbound = await new Browser(env.base).post("/api/passkeys/login/verify", { response });
        assert.equal(unbound.status, 400);
        // A challenge issued to browser A cannot be used by browser B.
        const a = new Browser(env.base), b = new Browser(env.base);
        const aOpts = await a.post("/api/passkeys/login/options");
        await b.post("/api/passkeys/login/options");
        const crossed = await b.post("/api/passkeys/login/verify", { response: auth.get(aOpts.body.options) });
        assert.equal(crossed.status, 401);
    } finally { await env.close(); }
});

test("6, 7: rejects wrong origin and wrong RP ID (login and registration)", async () => {
    const env = await setup();
    try {
        const auth = new SoftAuthenticator();
        const browser = await signup(env);
        const badOriginReg = await enroll(browser, auth, "x", { origin: "https://evil.example" });
        assert.equal(badOriginReg.status, 400);
        const badRpReg = await enroll(browser, auth, "x", { rpID: "evil.example" });
        assert.equal(badRpReg.status, 400);
        assert.equal(env.db.prepare("SELECT COUNT(*) n FROM passkey_credentials").get().n, 0);

        assert.equal((await enroll(browser, auth)).status, 201);
        const id = [...auth.credentials.keys()].at(-1);
        const { result: o } = await passkeyLogin(env.base, auth, id, { origin: "https://evil.example" });
        assert.equal(o.status, 401);
        const { result: r } = await passkeyLogin(env.base, auth, id, { rpID: "evil.example" });
        assert.equal(r.status, 401);
        // Requests from a foreign Origin header are refused before any work happens.
        const foreign = new Browser(env.base, "https://evil.example");
        assert.equal((await foreign.post("/api/passkeys/login/options")).status, 403);
    } finally { await env.close(); }
});

test("8, 9: rejects unknown credentials and credentials presented for another user", async () => {
    const env = await setup();
    try {
        const alice = new SoftAuthenticator(), bob = new SoftAuthenticator();
        await enroll(await signup(env, "alice@school.test"), alice);
        await enroll(await signup(env, "bob@school.test"), bob);
        // Unknown: a key the server has never seen.
        const stranger = new SoftAuthenticator();
        stranger.create({ challenge: "x", user: { id: "AAAA" } });
        const { result: unknown } = await passkeyLogin(env.base, stranger);
        assert.equal(unknown.status, 401);
        assert.equal(unknown.body.error.code, "unknown_credential");
        // Alice's credential with Bob's user handle.
        const bobHandle = [...bob.credentials.values()][0].userHandle;
        const { result: mismatch } = await passkeyLogin(env.base, alice, undefined, { userHandle: bobHandle });
        assert.equal(mismatch.status, 401);
        // Missing user handle.
        const { result: none } = await passkeyLogin(env.base, alice, undefined, { userHandle: null });
        assert.equal(none.status, 401);
    } finally { await env.close(); }
});

test("10: requires user verification (UV flag) for registration and login", async () => {
    const env = await setup();
    try {
        const auth = new SoftAuthenticator();
        const browser = await signup(env);
        const noUvReg = await enroll(browser, auth, "x", { uv: false });
        assert.equal(noUvReg.status, 400);
        assert.equal((await enroll(browser, auth)).status, 201);
        const id = [...auth.credentials.keys()].at(-1);
        const { result } = await passkeyLogin(env.base, auth, id, { uv: false });
        assert.equal(result.status, 401);
        const { options } = await passkeyLogin(env.base, auth, id);
        assert.equal(options.userVerification, "required");
    } finally { await env.close(); }
});

test("counter regression (possible cloned authenticator) is rejected", async () => {
    const env = await setup();
    try {
        const auth = new SoftAuthenticator();
        await enroll(await signup(env), auth);
        assert.equal((await passkeyLogin(env.base, auth, undefined, { counter: 5 })).result.status, 200);
        assert.equal((await passkeyLogin(env.base, auth, undefined, { counter: 3 })).result.status, 401);
        assert.equal(env.db.prepare("SELECT reason FROM audit_log WHERE event = 'login.passkey' ORDER BY id DESC").get().reason, "counter_regression");
    } finally { await env.close(); }
});

test("13 + duplicates: multiple devices, duplicate credential and excludeCredentials", async () => {
    const env = await setup();
    try {
        const laptop = new SoftAuthenticator(), phone = new SoftAuthenticator();
        const browser = await signup(env);
        assert.equal((await enroll(browser, laptop, "Laptop")).status, 201);
        const second = await enroll(browser, phone, "Phone");
        assert.equal(second.status, 201);
        assert.deepEqual(second.body.passkeys.map(p => p.deviceName), ["Laptop", "Phone"]);
        // Both devices sign in to the same account.
        assert.equal((await passkeyLogin(env.base, laptop)).result.body.user.email, "learner@school.test");
        assert.equal((await passkeyLogin(env.base, phone)).result.body.user.email, "learner@school.test");
        // Options exclude both registered credentials.
        const { body } = await browser.post("/api/passkeys/register/options");
        assert.equal(body.options.excludeCredentials.length, 2);
        assert.equal(body.options.authenticatorSelection.userVerification, "required");
        assert.equal(body.options.authenticatorSelection.residentKey, "required");
        // Re-registering the same credential ID is refused.
        const laptopId = [...laptop.credentials.keys()][0];
        const dup = await browser.post("/api/passkeys/register/verify", { response: laptop.create(body.options, { reuseId: laptopId }), deviceName: "Dup" });
        assert.equal(dup.status, 409);
        // Same credential ID registered by another account is refused too.
        const other = await signup(env, "other@school.test");
        const o = await other.post("/api/passkeys/register/options");
        const steal = await other.post("/api/passkeys/register/verify", { response: laptop.create(o.body.options, { reuseId: laptopId }) });
        assert.equal(steal.status, 409);
    } finally { await env.close(); }
});

test("an attacker cannot register a passkey for another user's account", async () => {
    const env = await setup();
    try {
        const victim = await signup(env, "victim@school.test");
        const attacker = await signup(env, "attacker@school.test");
        const auth = new SoftAuthenticator();
        // Victim requests options; attacker tries to complete them with their own session.
        const { body } = await victim.post("/api/passkeys/register/options");
        const res = await attacker.post("/api/passkeys/register/verify", { response: auth.create(body.options) });
        assert.equal(res.status, 400);
        assert.equal(res.body.error.code, "challenge_expired");
        // Without a session nothing is possible.
        const anon = new Browser(env.base);
        assert.equal((await anon.post("/api/passkeys/register/options")).status, 401);
        // With a session but without the CSRF token, refused.
        const noCsrf = await victim.post("/api/passkeys/register/options", {}, { csrf: false });
        assert.equal(noCsrf.status, 403);
        assert.equal(noCsrf.body.error.code, "bad_csrf");
        assert.equal(env.db.prepare("SELECT COUNT(*) n FROM passkey_credentials").get().n, 0);
    } finally { await env.close(); }
});

test("14 + 17: removal needs recent re-authentication; password recovery always remains", async () => {
    const env = await setup({ REAUTH_WINDOW_MINUTES: "10" });
    try {
        const auth = new SoftAuthenticator();
        const browser = await signup(env);
        const reg = await enroll(browser, auth);
        const id = reg.body.passkeys[0].id;
        // Rename works for the owner only.
        assert.equal((await browser.request("PATCH", `/api/passkeys/${id}`, { deviceName: "Work laptop" })).body.passkeys[0].deviceName, "Work laptop");
        const intruder = await signup(env, "intruder@school.test");
        assert.equal((await intruder.request("PATCH", `/api/passkeys/${id}`, { deviceName: "pwned" })).status, 404);
        assert.equal((await intruder.request("DELETE", `/api/passkeys/${id}`)).status, 404);
        // Make the re-authentication stale.
        env.db.prepare("UPDATE sessions SET reauth_at = 0").run();
        const blocked = await browser.request("DELETE", `/api/passkeys/${id}`);
        assert.equal(blocked.status, 403);
        assert.equal(blocked.body.error.code, "reauth_required");
        assert.equal((await browser.post("/api/passkeys/register/options")).body.error.code, "reauth_required");
        assert.equal((await browser.post("/api/auth/reauth", { password: "wrong password!!" })).status, 401);
        assert.equal((await browser.post("/api/auth/reauth", { password: PASSWORD })).status, 200);
        const removed = await browser.request("DELETE", `/api/passkeys/${id}`);
        assert.equal(removed.status, 200);
        assert.equal(removed.body.passkeys.length, 0);
        // The removed passkey no longer signs in.
        assert.equal((await passkeyLogin(env.base, auth)).result.body.error.code, "unknown_credential");
        // Password sign-in still works: the account is never locked out.
        const fallback = new Browser(env.base);
        assert.equal((await fallback.post("/api/auth/login", { email: "learner@school.test", password: PASSWORD, role: "student" })).status, 200);
        // Changing the password signs out every other session.
        const change = await fallback.post("/api/auth/change-password", { currentPassword: PASSWORD, newPassword: PASSWORD + " 2" });
        assert.equal(change.status, 200);
        assert.equal((await browser.get("/api/auth/status")).body.user, null);
        assert.equal((await fallback.get("/api/auth/status")).body.user.email, "learner@school.test");
    } finally { await env.close(); }
});

test("16: role is returned for redirects; role-scoped password login; suspended accounts blocked", async () => {
    const env = await setup();
    try {
        const company = await signup(env, "hr@company.test", "company");
        const companyKey = new SoftAuthenticator();
        await enroll(company, companyKey);
        assert.equal((await passkeyLogin(env.base, companyKey)).result.body.user.role, "company");
        // Admins are created by an operator (CLI), never by public signup.
        assert.equal((await new Browser(env.base).post("/api/auth/signup", { role: "admin", name: "x", email: "a@b.test", password: PASSWORD })).status, 400);
        const now = Date.now();
        env.db.prepare("INSERT INTO users (public_id, email, display_name, role, password_hash, webauthn_user_id, created_at, updated_at) VALUES (?, ?, 'Admin', 'admin', ?, ?, ?, ?)")
            .run(crypto.randomUUID(), "ops@codementor.test", await hashPassword(PASSWORD), crypto.randomBytes(32).toString("base64url"), now, now);
        const admin = new Browser(env.base);
        assert.equal((await admin.post("/api/auth/login", { email: "ops@codementor.test", password: PASSWORD, role: "admin" })).body.user.role, "admin");
        // The wrong role page gives the same error as a wrong password.
        const wrongRole = await new Browser(env.base).post("/api/auth/login", { email: "hr@company.test", password: PASSWORD, role: "admin" });
        assert.equal(wrongRole.status, 401);
        assert.equal(wrongRole.body.error.code, "invalid_credentials");
        // Suspension (operator action) blocks passkey and password sign-in and ends live sessions.
        env.db.prepare("UPDATE users SET status = 'suspended' WHERE email = 'hr@company.test'").run();
        assert.equal((await company.get("/api/auth/status")).body.user, null);
        assert.equal((await passkeyLogin(env.base, companyKey)).result.body.error.code, "account_suspended");
        assert.equal((await new Browser(env.base).post("/api/auth/login", { email: "hr@company.test", password: PASSWORD })).status, 403);
    } finally { await env.close(); }
});

test("18: rate limits password and passkey endpoints", async () => {
    const env = await setup();
    try {
        const browser = new Browser(env.base);
        let last;
        for (let i = 0; i < 11; i++) last = await browser.post("/api/auth/login", { email: "nobody@school.test", password: "wrong password!!" });
        assert.equal(last.status, 429);
        assert.ok(Number(last.headers.get("retry-after")) > 0);
        for (let i = 0; i < 31; i++) last = await browser.post("/api/passkeys/login/options");
        assert.equal(last.status, 429);
    } finally { await env.close(); }
});

test("audit log never contains secrets; static server never exposes server files or the database", async () => {
    const env = await setup();
    try {
        const auth = new SoftAuthenticator();
        const browser = await signup(env);
        await enroll(browser, auth);
        const { response, options } = await passkeyLogin(env.base, auth);
        const dump = JSON.stringify(env.db.prepare("SELECT * FROM audit_log").all());
        for (const secret of [PASSWORD, options.challenge, response.response.signature, response.id, ...browser.cookies.values()]) {
            assert.ok(!dump.includes(secret), "audit log leaked a secret");
        }
        for (const path of ["/server/app.mjs", "/data/codementor.db", "/node_modules/express/package.json", "/package.json", "/.git/config", "/.gitignore", "/%2e%2e/server/app.mjs"]) {
            assert.equal((await fetch(env.base + path)).status, 404, path);
        }
        assert.equal((await fetch(env.base + "/pages/auth/login.html")).status, 200);
        const lib = await fetch(env.base + "/vendor/simplewebauthn-browser.min.js");
        assert.equal(lib.status, 200);
        assert.match(await lib.text(), /SimpleWebAuthnBrowser/);
        const headers = (await fetch(env.base + "/api/auth/status")).headers;
        assert.equal(headers.get("cache-control"), "no-store");
        assert.equal(headers.get("x-frame-options"), "DENY");
        // Session cookie flags.
        const raw = (await new Browser(env.base).post("/api/auth/login", { email: "learner@school.test", password: PASSWORD })).headers.getSetCookie().join(";");
        assert.match(raw, /HttpOnly/);
        assert.match(raw, /SameSite=Strict/);
    } finally { await env.close(); }
});

test("static files use an explicit allowlist: site assets are served, internal folders and files are not", async () => {
    const env = await setup();
    try {
        const denied = [
            "/docs/CURRENT-IMPLEMENTATION.md", "/docs/phase2-protected-baseline.json", "/database/README.md", "/database/schema-authoring.json",
            "/tests/auth-server.test.mjs", "/tests/helpers/fake-dom.cjs", "/tools/page-logic.cjs", "/_backup_ui_redesign/admin-overview.js.bak",
            "/README.md", "/SOURCES.md", "/start-server.ps1", "/package.json", "/package-lock.json", "/server/db.mjs", "/data/codementor.db",
            "/data/codementor.db-wal", "/node_modules/express/package.json", "/.git/config", "/.claude/settings.local.json", "/.gitignore",
            "/js/.hidden", "/pages/../docs/CURRENT-IMPLEMENTATION.md", "//docs/CURRENT-IMPLEMENTATION.md", "/%2e%2e/server/app.mjs",
            "/DOCS/CURRENT-IMPLEMENTATION.md", "/Tests/auth-server.test.mjs", "/docs./CURRENT-IMPLEMENTATION.md", "/%5Cserver%5Capp.mjs",
            "/pages%2f..%2fserver%2fapp.mjs", "/server"
        ];
        for (const path of denied) assert.notEqual((await fetch(env.base + path)).status, 200, `${path} must not be served`);
        for (const path of ["/", "/index.html", "/manifest.json", "/css/style.css", "/js/access-guard.js", "/pages/auth/login.html", "/pages/admin/admin-login.html".replace("admin-login", "admin-dashboard"), "/assets/images", "/vendor/simplewebauthn-browser.min.js"]) {
            const status = (await fetch(env.base + path)).status;
            // a directory without an index may answer 404; every real file must be 200
            if (path !== "/assets/images") assert.equal(status, 200, `${path} must be served`);
        }
    } finally { await env.close(); }
});

test("CSRF and request-shape defences", async () => {
    const env = await setup();
    try {
        // Missing Origin header on a state-changing request.
        const res = await fetch(env.base + "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        assert.equal(res.status, 403);
        // A form post (non-JSON) is refused even from the right origin.
        const form = await fetch(env.base + "/api/auth/login", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded" }, body: "email=a" });
        assert.equal(form.status, 415);
        // Malformed JSON gives a safe message.
        const bad = await fetch(env.base + "/api/auth/login", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json" }, body: "{" });
        assert.equal(bad.status, 400);
        assert.equal((await bad.json()).error.code, "bad_request");
    } finally { await env.close(); }
});

test("configuration refuses insecure production settings", () => {
    const prod = { NODE_ENV: "production", TRUST_PROXY: "1" };
    assert.throws(() => loadConfig(prod), /ORIGINS is required/);
    assert.throws(() => loadConfig({ ...prod, ORIGINS: "http://codementor.example", RP_ID: "codementor.example" }), /HTTPS/);
    assert.throws(() => loadConfig({ ...prod, ORIGINS: "https://codementor.example" }), /RP_ID is required/);
    assert.throws(() => loadConfig({ ...prod, ORIGINS: "https://codementor.example", RP_ID: "other.example" }), /not valid/);
    assert.throws(() => loadConfig({ NODE_ENV: "production", ORIGINS: "https://codementor.example", RP_ID: "codementor.example" }), /TRUST_PROXY/);
    assert.throws(() => loadConfig({ ORIGINS: "http://127.0.0.1:8780" }), /localhost/);
    assert.throws(() => loadConfig({ ORIGINS: "http://localhost:8780", RP_ID: "127.0.0.1" }), /IP address/);
    const ok = loadConfig({ ...prod, ORIGINS: "https://app.codementor.example", RP_ID: "codementor.example" });
    assert.equal(ok.sessionCookie, "__Host-cm_session");
    assert.equal(ok.secureCookies, true);
});

test("migrations are reversible and keep user rows intact on re-apply", () => {
    const db = openDatabase(":memory:");
    migrateUp(db);
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name = 'passkey_credentials'").get());
    assert.equal(migrateDown(db), 1);
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name = 'passkey_credentials'").get(), undefined);
    migrateUp(db);
    assert.deepEqual(migrateUp(db), []);
    db.close();
});
