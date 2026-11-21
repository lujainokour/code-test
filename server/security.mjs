// Cross-cutting request security: errors, cookies, rate limits, origin/CSRF checks and audit logging.
import crypto from "node:crypto";

// Errors carry a stable public code and a safe message. Internal details are never sent to the browser.
export class ApiError extends Error {
    constructor(status, code, message, extra = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.extra = extra;
    }
}

export const sha256 = value => crypto.createHash("sha256").update(value).digest("base64url");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

export function safeEqual(a, b) {
    const left = Buffer.from(String(a ?? "")), right = Buffer.from(String(b ?? ""));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function parseCookies(header) {
    const cookies = Object.create(null);
    for (const part of String(header || "").split(";")) {
        const index = part.indexOf("=");
        if (index < 1) continue;
        const name = part.slice(0, index).trim();
        if (!(name in cookies)) {
            try { cookies[name] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* ignore malformed */ }
        }
    }
    return cookies;
}

export function cookieHeader(config, name, value, maxAgeSeconds) {
    const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Strict"];
    if (config.secureCookies) parts.push("Secure");
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
    return parts.join("; ");
}

export function appendCookie(res, cookie) {
    const existing = res.getHeader("Set-Cookie");
    res.setHeader("Set-Cookie", existing ? [].concat(existing, cookie) : [cookie]);
}

// Fixed-window in-memory limiter. Suitable for a single server process; a multi-instance deployment
// needs a shared store (documented in docs/PASSKEYS.md).
export class RateLimiter {
    constructor(scale = 1) { this.scale = scale; this.buckets = new Map(); this.sweepAt = Date.now() + 60_000; }
    hit(key, limit, windowMs) {
        const now = Date.now();
        if (now > this.sweepAt) {
            for (const [k, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(k);
            this.sweepAt = now + 60_000;
        }
        let bucket = this.buckets.get(key);
        if (!bucket || bucket.resetAt <= now) { bucket = { count: 0, resetAt: now + windowMs }; this.buckets.set(key, bucket); }
        bucket.count += 1;
        if (bucket.count > Math.max(1, Math.round(limit * this.scale))) {
            throw new ApiError(429, "rate_limited", "Too many attempts. Wait a few minutes and try again.", { retryAfter: Math.ceil((bucket.resetAt - now) / 1000) });
        }
    }
}

// State-changing API requests must come from a configured origin and carry JSON. Together with
// SameSite=Strict cookies this blocks cross-site form posts and login CSRF.
export function requireSameOrigin(config) {
    return (req, _res, next) => {
        if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
        const origin = req.get("origin");
        if (!origin || !config.origins.includes(origin)) return next(new ApiError(403, "bad_origin", "This request was blocked. Reload the page and try again."));
        const hasBody = Number(req.headers["content-length"] || 0) > 0 || Boolean(req.headers["transfer-encoding"]);
        if ((hasBody || req.method !== "DELETE") && !req.is("application/json")) return next(new ApiError(415, "json_required", "Unsupported request format."));
        next();
    };
}

export function createAudit(db) {
    const salt = () => db.prepare("SELECT value FROM app_meta WHERE key = 'audit_salt'").get()?.value || "";
    const insert = db.prepare("INSERT INTO audit_log (user_id, event, outcome, reason, ip_hash, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    // Only event names, outcomes and short reason codes are logged: never passwords, challenges,
    // credential responses, public keys, session tokens or biometric data.
    return function audit(req, event, outcome, { userId = null, reason = null } = {}) {
        try {
            const ip = req.ip || req.socket?.remoteAddress || "";
            insert.run(userId, event, outcome, reason, ip ? sha256(salt() + ip).slice(0, 22) : null, String(req.get?.("user-agent") || "").slice(0, 160) || null, Date.now());
        } catch (error) {
            console.error("audit log write failed:", error.message);
        }
    };
}

export function securityHeaders(config) {
    return (req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Referrer-Policy", "same-origin");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Permissions-Policy", "publickey-credentials-create=(self), publickey-credentials-get=(self), camera=(), microphone=(), geolocation=()");
        if (config.production) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
        next();
    };
}
