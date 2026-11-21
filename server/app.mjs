// CodeMentor AI server: serves the existing static site and the /api authentication endpoints.
// Passkeys follow WebAuthn Level 3 using @simplewebauthn/server; every ceremony is verified here.
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse
} from "@simplewebauthn/server";
import { projectRoot } from "./config.mjs";
import { transaction } from "./db.mjs";
import { dummyVerify, hashPassword, passwordRules, validatePassword, verifyPassword } from "./passwords.mjs";
import {
    ApiError, RateLimiter, appendCookie, cookieHeader, createAudit, parseCookies,
    randomToken, requireSameOrigin, safeEqual, securityHeaders, sha256
} from "./security.mjs";

const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const MINUTE = 60_000;

// ---- public static files: explicit allowlist (first path segment) ----
const PUBLIC_DIRS = new Set(["assets", "css", "js", "pages", "vendor"]);
const PUBLIC_ROOT_FILES = new Set(["index.html", "dashboard.html", "company-dashboard.html", "teacher-dashboard.html", "manifest.json"]);
export function isPublicPath(decodedPath) {
    const segments = String(decodedPath).replace(/\\/g, "/").split("/").filter(Boolean);
    if (segments.some(part => part === "." || part === ".." || part.startsWith(".") || part.includes("\0"))) return false;
    if (!segments.length) return true; // "/" is served as index.html
    const first = segments[0].toLowerCase();
    if (segments.length === 1) return PUBLIC_ROOT_FILES.has(first);
    return PUBLIC_DIRS.has(first);
}
const publicUser = user => ({ id: user.public_id, email: user.email, name: user.display_name, role: user.role, age: user.age ?? null });

function cleanName(value, max) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function createApp({ config, db }) {
    const app = express();
    const limiter = new RateLimiter(config.rateLimitScale);
    const audit = createAudit(db);
    if (config.trustProxy) app.set("trust proxy", 1);
    app.disable("x-powered-by");

    const q = {
        userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
        userById: db.prepare("SELECT * FROM users WHERE id = ?"),
        insertUser: db.prepare(`INSERT INTO users (public_id, email, display_name, role, age, password_hash, webauthn_user_id, created_at, updated_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
        updatePassword: db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"),
        sessionByHash: db.prepare(`SELECT s.*, u.status AS user_status FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`),
        insertSession: db.prepare(`INSERT INTO sessions (token_hash, user_id, csrf_token, auth_method, created_at, last_seen_at, expires_at, reauth_at)
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
        deleteSession: db.prepare("DELETE FROM sessions WHERE id = ?"),
        deleteOtherSessions: db.prepare("DELETE FROM sessions WHERE user_id = ? AND id <> ?"),
        touchSession: db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?"),
        setReauth: db.prepare("UPDATE sessions SET reauth_at = ? WHERE id = ?"),
        purgeSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ? OR last_seen_at <= ?"),
        insertChallenge: db.prepare("INSERT INTO webauthn_challenges (id, purpose, challenge, session_id, user_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)"),
        challengeById: db.prepare("SELECT * FROM webauthn_challenges WHERE id = ? AND purpose = ?"),
        registrationChallenge: db.prepare("SELECT * FROM webauthn_challenges WHERE session_id = ? AND purpose = 'registration'"),
        deleteChallenge: db.prepare("DELETE FROM webauthn_challenges WHERE id = ?"),
        deleteSessionChallenges: db.prepare("DELETE FROM webauthn_challenges WHERE session_id = ?"),
        purgeChallenges: db.prepare("DELETE FROM webauthn_challenges WHERE expires_at <= ?"),
        credentialsForUser: db.prepare("SELECT * FROM passkey_credentials WHERE user_id = ? ORDER BY created_at"),
        credentialById: db.prepare("SELECT * FROM passkey_credentials WHERE credential_id = ?"),
        credentialCount: db.prepare("SELECT COUNT(*) AS n FROM passkey_credentials WHERE user_id = ?"),
        insertCredential: db.prepare(`INSERT INTO passkey_credentials (credential_id, user_id, public_key, counter, transports, device_name, aaguid, backup_eligible, backup_state, created_at)
                                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
        useCredential: db.prepare("UPDATE passkey_credentials SET counter = ?, backup_state = ?, last_used_at = ? WHERE id = ?"),
        renameCredential: db.prepare("UPDATE passkey_credentials SET device_name = ? WHERE id = ? AND user_id = ?"),
        deleteCredential: db.prepare("DELETE FROM passkey_credentials WHERE id = ? AND user_id = ?")
    };

    // ---------- sessions ----------
    function clearCookie(res, name) { appendCookie(res, cookieHeader(config, name, "", 0)); }

    // Always issues a brand-new session (fixation defence) and removes the one the browser held.
    function startSession(req, res, user, method) {
        const now = Date.now(), token = randomToken(32);
        if (req.session) q.deleteSession.run(req.session.id);
        q.purgeSessions.run(now, now - config.sessionIdleMs);
        q.insertSession.run(sha256(token), user.id, randomToken(24), method, now, now, now + config.sessionAbsoluteMs, now);
        appendCookie(res, cookieHeader(config, config.sessionCookie, token, config.sessionAbsoluteMs / 1000));
        const session = q.sessionByHash.get(sha256(token));
        req.session = { id: session.id, userId: user.id, csrf: session.csrf_token, reauthAt: session.reauth_at };
        return session.csrf_token;
    }

    function loadSession(req, res, next) {
        const token = parseCookies(req.headers.cookie)[config.sessionCookie];
        req.session = null;
        if (token) {
            const row = q.sessionByHash.get(sha256(token)), now = Date.now();
            if (row && row.expires_at > now && row.last_seen_at + config.sessionIdleMs > now && row.user_status === "active") {
                if (now - row.last_seen_at > MINUTE) q.touchSession.run(now, row.id);
                req.session = { id: row.id, userId: row.user_id, csrf: row.csrf_token, reauthAt: row.reauth_at };
            } else {
                if (row) q.deleteSession.run(row.id);
                clearCookie(res, config.sessionCookie);
            }
        }
        next();
    }

    function requireAuth(req, _res, next) {
        if (!req.session) return next(new ApiError(401, "not_signed_in", "Your session has ended. Sign in again."));
        req.user = q.userById.get(req.session.userId);
        next();
    }

    function requireCsrf(req, _res, next) {
        if (!safeEqual(req.get("x-csrf-token"), req.session?.csrf)) return next(new ApiError(403, "bad_csrf", "This request was blocked. Reload the page and try again."));
        next();
    }

    function requireRecentAuth(req) {
        if (Date.now() - req.session.reauthAt > config.reauthWindowMs) {
            throw new ApiError(403, "reauth_required", "For your security, confirm your password before changing sign-in methods.");
        }
    }

    // ---------- middleware ----------
    app.use(securityHeaders(config));
    if (config.production) {
        app.use((req, res, next) => {
            if (req.secure) return next();
            const target = config.origins.find(origin => new URL(origin).host === req.headers.host) || config.origins[0];
            res.redirect(308, target + req.originalUrl);
        });
    }
    const api = express.Router();
    api.use(express.json({ limit: "64kb", strict: true }));
    api.use(requireSameOrigin(config));
    api.use(loadSession);

    // ---------- accounts ----------
    api.get("/health", (_req, res) => res.json({ ok: true }));

    api.get("/auth/status", (req, res) => {
        const user = req.session ? q.userById.get(req.session.userId) : null;
        res.json({
            server: true,
            passkeys: true,
            user: user ? publicUser(user) : null,
            csrfToken: user ? req.session.csrf : null,
            passkeyCount: user ? q.credentialCount.get(user.id).n : 0,
            reauthValidUntil: user ? req.session.reauthAt + config.reauthWindowMs : null,
            passwordRules
        });
    });

    api.post("/auth/signup", async (req, res) => {
        limiter.hit("signup:" + req.ip, 10, 60 * MINUTE);
        const { role, password } = req.body || {};
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const name = cleanName(req.body?.name, 160);
        const age = req.body?.age === undefined || req.body?.age === null ? null : req.body.age;
        if (!["student", "company"].includes(role)) throw new ApiError(400, "invalid_role", "This account type cannot be created here.");
        if (!EMAIL.test(email) || email.length > 254) throw new ApiError(400, "invalid_email", "Enter a valid email address.");
        if (name.length < 2) throw new ApiError(400, "invalid_name", "Enter your name.");
        if (role === "student" && !(Number.isInteger(age) && age >= 1 && age <= 120)) throw new ApiError(400, "invalid_age", "Enter a valid age.");
        if (!validatePassword(password)) throw new ApiError(400, "weak_password", `Use a password between ${passwordRules.min} and ${passwordRules.max} characters.`);
        if (["student@example.com", "admin@example.com", "company@example.com"].includes(email)) throw new ApiError(400, "reserved_email", "Use your own email address. Sample account addresses are reserved.");
        const hash = await hashPassword(password);
        if (q.userByEmail.get(email)) {
            audit(req, "signup", "failure", { reason: "exists" });
            throw new ApiError(409, "account_exists", "An account with this email already exists. Sign in instead.");
        }
        const now = Date.now();
        const result = q.insertUser.run(crypto.randomUUID(), email, name, role, role === "student" ? age : null, hash, randomToken(32), now, now);
        const user = q.userById.get(result.lastInsertRowid);
        const csrfToken = startSession(req, res, user, "signup");
        audit(req, "signup", "success", { userId: user.id });
        res.status(201).json({ user: publicUser(user), csrfToken });
    });

    api.post("/auth/login", async (req, res) => {
        const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        const { password, role } = req.body || {};
        limiter.hit("login-ip:" + req.ip, 30, 15 * MINUTE);
        limiter.hit("login-email:" + email, 10, 15 * MINUTE);
        const user = EMAIL.test(email) ? q.userByEmail.get(email) : null;
        const valid = user ? await verifyPassword(String(password ?? ""), user.password_hash) : await dummyVerify(password);
        // A wrong role is reported exactly like a wrong password so login pages cannot be used to probe roles.
        if (!valid || (role !== undefined && role !== user.role)) {
            audit(req, "login.password", "failure", { userId: user?.id ?? null, reason: valid ? "role_mismatch" : "bad_credentials" });
            throw new ApiError(401, "invalid_credentials", "Email or password is incorrect.");
        }
        if (user.status !== "active") {
            audit(req, "login.password", "blocked", { userId: user.id, reason: "suspended" });
            throw new ApiError(403, "account_suspended", "This account is suspended. Contact the CodeMentor AI administrator.");
        }
        const csrfToken = startSession(req, res, user, "password");
        audit(req, "login.password", "success", { userId: user.id });
        res.json({ user: publicUser(user), csrfToken });
    });

    api.post("/auth/logout", (req, res) => {
        if (req.session) {
            q.deleteSession.run(req.session.id);
            audit(req, "logout", "success", { userId: req.session.userId });
        }
        clearCookie(res, config.sessionCookie);
        res.json({ ok: true });
    });

    api.post("/auth/reauth", requireAuth, requireCsrf, async (req, res) => {
        limiter.hit("reauth:" + req.session.id, 8, 15 * MINUTE);
        if (!(await verifyPassword(String(req.body?.password ?? ""), req.user.password_hash))) {
            audit(req, "reauth", "failure", { userId: req.user.id, reason: "bad_password" });
            throw new ApiError(401, "invalid_password", "That password is incorrect.");
        }
        const now = Date.now();
        q.setReauth.run(now, req.session.id);
        audit(req, "reauth", "success", { userId: req.user.id });
        res.json({ reauthValidUntil: now + config.reauthWindowMs });
    });

    api.post("/auth/change-password", requireAuth, requireCsrf, async (req, res) => {
        limiter.hit("change-password:" + req.session.id, 8, 15 * MINUTE);
        const { currentPassword, newPassword } = req.body || {};
        if (!validatePassword(newPassword)) throw new ApiError(400, "weak_password", `Use a new password between ${passwordRules.min} and ${passwordRules.max} characters.`);
        if (newPassword === currentPassword) throw new ApiError(400, "same_password", "Choose a password different from your current one.");
        if (!(await verifyPassword(String(currentPassword ?? ""), req.user.password_hash))) {
            audit(req, "password.change", "failure", { userId: req.user.id, reason: "bad_password" });
            throw new ApiError(401, "invalid_password", "Your current password is incorrect. Nothing was changed.");
        }
        q.updatePassword.run(await hashPassword(newPassword), Date.now(), req.user.id);
        const csrfToken = startSession(req, res, req.user, "password");
        q.deleteOtherSessions.run(req.user.id, req.session.id);   // sign out every other device
        audit(req, "password.change", "success", { userId: req.user.id });
        res.json({ ok: true, csrfToken });
    });

    // ---------- passkey sign-in (discoverable credentials, no username needed) ----------
    api.post("/passkeys/login/options", async (req, res) => {
        limiter.hit("pk-login-options:" + req.ip, 30, 5 * MINUTE);
        const now = Date.now();
        q.purgeChallenges.run(now);
        const options = await generateAuthenticationOptions({ rpID: config.rpID, userVerification: "required", timeout: 120_000 });
        // The challenge is bound to this browser by an HttpOnly flow cookie; only its hash is stored.
        const flow = randomToken(32);
        q.insertChallenge.run(sha256(flow), "authentication", options.challenge, null, null, now + config.challengeTtlMs);
        appendCookie(res, cookieHeader(config, config.flowCookie, flow, config.challengeTtlMs / 1000));
        res.json({ options });
    });

    api.post("/passkeys/login/verify", async (req, res) => {
        limiter.hit("pk-login-verify:" + req.ip, 20, 5 * MINUTE);
        const flow = parseCookies(req.headers.cookie)[config.flowCookie];
        clearCookie(res, config.flowCookie);
        // Single use: the challenge row is removed before any verification work happens.
        const pending = flow ? transaction(db, () => {
            const row = q.challengeById.get(sha256(flow), "authentication");
            if (row) q.deleteChallenge.run(row.id);
            return row;
        }) : null;
        if (!pending || pending.expires_at <= Date.now()) {
            audit(req, "login.passkey", "failure", { reason: pending ? "challenge_expired" : "challenge_missing" });
            throw new ApiError(400, "challenge_expired", "This sign-in request expired. Try again.");
        }
        const response = req.body?.response;
        if (!response || typeof response.id !== "string" || response.type !== "public-key" || typeof response.response?.authenticatorData !== "string") {
            throw new ApiError(400, "bad_response", "The passkey response could not be read. Try again.");
        }
        const credential = q.credentialById.get(response.id);
        if (!credential) {
            audit(req, "login.passkey", "failure", { reason: "unknown_credential" });
            throw new ApiError(401, "unknown_credential", "This passkey isn't registered with CodeMentor AI. Sign in with your password, then add a passkey in Security settings.");
        }
        const user = q.userById.get(credential.user_id);
        // Credential ownership: the authenticator's user handle must match the account that registered it.
        if (typeof response.response.userHandle !== "string" || !safeEqual(response.response.userHandle, user.webauthn_user_id)) {
            audit(req, "login.passkey", "failure", { userId: user.id, reason: "user_handle_mismatch" });
            throw new ApiError(401, "verification_failed", "We couldn't verify this passkey. Try again or use your password.");
        }
        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response,
                expectedChallenge: pending.challenge,
                expectedOrigin: config.origins,
                expectedRPID: config.rpID,
                requireUserVerification: true,
                credential: {
                    id: credential.credential_id,
                    publicKey: new Uint8Array(credential.public_key),
                    counter: credential.counter,
                    transports: JSON.parse(credential.transports)
                }
            });
        } catch (error) {
            audit(req, "login.passkey", "failure", { userId: user.id, reason: /counter/i.test(error.message) ? "counter_regression" : "verification_error" });
            throw new ApiError(401, "verification_failed", "We couldn't verify this passkey. Try again or use your password.");
        }
        const info = verification.authenticationInfo;
        if (!verification.verified || !info.userVerified) {
            audit(req, "login.passkey", "failure", { userId: user.id, reason: "not_verified" });
            throw new ApiError(401, "verification_failed", "We couldn't verify this passkey. Try again or use your password.");
        }
        if (user.status !== "active") {
            audit(req, "login.passkey", "blocked", { userId: user.id, reason: "suspended" });
            throw new ApiError(403, "account_suspended", "This account is suspended. Contact the CodeMentor AI administrator.");
        }
        q.useCredential.run(info.newCounter, info.credentialBackedUp ? 1 : 0, Date.now(), credential.id);
        const csrfToken = startSession(req, res, user, "passkey");
        audit(req, "login.passkey", "success", { userId: user.id });
        res.json({ user: publicUser(user), csrfToken });
    });

    // ---------- passkey management (signed-in user only) ----------
    const listCredentials = userId => q.credentialsForUser.all(userId).map(row => ({
        id: row.id,
        deviceName: row.device_name,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
        backupEligible: row.backup_eligible === 1,
        backupState: row.backup_state === 1,
        transports: JSON.parse(row.transports)
    }));

    api.get("/passkeys", requireAuth, (req, res) => {
        res.json({ passkeys: listCredentials(req.user.id), reauthValidUntil: req.session.reauthAt + config.reauthWindowMs });
    });

    api.post("/passkeys/register/options", requireAuth, requireCsrf, async (req, res) => {
        limiter.hit("pk-register:" + req.user.id, 20, 15 * MINUTE);
        requireRecentAuth(req);
        const existing = q.credentialsForUser.all(req.user.id);
        if (existing.length >= 20) throw new ApiError(400, "too_many_passkeys", "You have reached the limit of 20 passkeys. Remove one first.");
        const options = await generateRegistrationOptions({
            rpName: config.rpName,
            rpID: config.rpID,
            userName: req.user.email,
            userDisplayName: req.user.display_name,
            userID: Buffer.from(req.user.webauthn_user_id, "base64url"),
            attestationType: "none",
            timeout: 120_000,
            supportedAlgorithmIDs: [-7, -8, -257],
            // Already-registered authenticators are excluded so one device cannot be enrolled twice.
            excludeCredentials: existing.map(row => ({ id: row.credential_id, transports: JSON.parse(row.transports) })),
            authenticatorSelection: { residentKey: "required", userVerification: "required" }
        });
        const now = Date.now();
        q.purgeChallenges.run(now);
        q.deleteSessionChallenges.run(req.session.id);
        q.insertChallenge.run(randomToken(24), "registration", options.challenge, req.session.id, req.user.id, now + config.challengeTtlMs);
        res.json({ options });
    });

    api.post("/passkeys/register/verify", requireAuth, requireCsrf, async (req, res) => {
        limiter.hit("pk-register:" + req.user.id, 20, 15 * MINUTE);
        requireRecentAuth(req);
        const pending = transaction(db, () => {
            const row = q.registrationChallenge.get(req.session.id);
            if (row) q.deleteChallenge.run(row.id);
            return row;
        });
        if (!pending || pending.expires_at <= Date.now() || pending.user_id !== req.user.id) {
            audit(req, "passkey.register", "failure", { userId: req.user.id, reason: "challenge_expired" });
            throw new ApiError(400, "challenge_expired", "This setup request expired. Try again.");
        }
        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: req.body?.response,
                expectedChallenge: pending.challenge,
                expectedOrigin: config.origins,
                expectedRPID: config.rpID,
                requireUserVerification: true
            });
        } catch {
            audit(req, "passkey.register", "failure", { userId: req.user.id, reason: "verification_error" });
            throw new ApiError(400, "verification_failed", "This passkey could not be verified. Try again.");
        }
        if (!verification.verified || !verification.registrationInfo.userVerified) {
            audit(req, "passkey.register", "failure", { userId: req.user.id, reason: "not_verified" });
            throw new ApiError(400, "verification_failed", "This passkey could not be verified. Try again.");
        }
        const info = verification.registrationInfo;
        if (q.credentialById.get(info.credential.id)) {
            audit(req, "passkey.register", "failure", { userId: req.user.id, reason: "duplicate" });
            throw new ApiError(409, "credential_exists", "This passkey is already registered.");
        }
        const deviceName = cleanName(req.body?.deviceName, 60) || "Passkey";
        q.insertCredential.run(
            info.credential.id, req.user.id, Buffer.from(info.credential.publicKey), info.credential.counter,
            JSON.stringify(Array.isArray(info.credential.transports) ? info.credential.transports : []),
            deviceName, info.aaguid || null, info.credentialDeviceType === "multiDevice" ? 1 : 0, info.credentialBackedUp ? 1 : 0, Date.now()
        );
        audit(req, "passkey.register", "success", { userId: req.user.id });
        res.status(201).json({ passkeys: listCredentials(req.user.id) });
    });

    api.patch("/passkeys/:id", requireAuth, requireCsrf, (req, res) => {
        const deviceName = cleanName(req.body?.deviceName, 60);
        if (!deviceName) throw new ApiError(400, "invalid_name", "Enter a device name (up to 60 characters).");
        const changed = q.renameCredential.run(deviceName, Number(req.params.id), req.user.id).changes;
        if (!changed) throw new ApiError(404, "not_found", "This passkey no longer exists.");
        audit(req, "passkey.rename", "success", { userId: req.user.id });
        res.json({ passkeys: listCredentials(req.user.id) });
    });

    api.delete("/passkeys/:id", requireAuth, requireCsrf, (req, res) => {
        requireRecentAuth(req);
        const changed = q.deleteCredential.run(Number(req.params.id), req.user.id).changes;
        if (!changed) throw new ApiError(404, "not_found", "This passkey no longer exists.");
        audit(req, "passkey.remove", "success", { userId: req.user.id });
        // Every account keeps its password, so removing the last passkey never locks the user out.
        res.json({ passkeys: listCredentials(req.user.id) });
    });

    api.use((_req, _res, next) => next(new ApiError(404, "not_found", "Not found.")));
    api.use((error, _req, res, _next) => {
        if (error?.type === "entity.parse.failed" || error?.type === "entity.too.large") error = new ApiError(400, "bad_request", "The request could not be read.");
        if (!(error instanceof ApiError)) {
            console.error("API error:", error?.message || error);
            error = new ApiError(500, "server_error", "Something went wrong. Try again.");
        }
        if (error.extra.retryAfter) res.setHeader("Retry-After", String(error.extra.retryAfter));
        res.status(error.status).json({ error: { code: error.code, message: error.message } });
    });
    app.use("/api", api);

    // ---------- static site ----------
    app.get("/vendor/simplewebauthn-browser.min.js", (_req, res) => {
        res.sendFile(path.join(projectRoot, "node_modules", "@simplewebauthn", "browser", "dist", "bundle", "index.umd.min.js"));
    });
    // Public files are an explicit ALLOWLIST. Everything else in the project folder (server code, the database,
    // dependencies, docs, tests, tools, backups, README, package metadata, dotfiles, ...) is never served.
    app.use((req, res, next) => {
        let decoded;
        try { decoded = decodeURIComponent(req.path); } catch { return res.status(400).type("text").send("Bad request"); }
        if (!isPublicPath(decoded)) return res.status(404).type("text").send("Not found");
        next();
    });
    app.use(express.static(projectRoot, { dotfiles: "deny", index: "index.html", fallthrough: true }));
    app.use((_req, res) => res.status(404).type("text").send("Not found"));
    return app;
}
