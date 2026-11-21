// Runtime configuration. Every origin / RP ID comes from the environment; nothing production-specific
// is hardcoded. Development defaults target http://localhost:<PORT> (WebAuthn treats localhost as a
// secure context; an IP such as 127.0.0.1 can never be an RP ID).
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function int(value, fallback, name) {
    if (value === undefined || value === "") return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} must be a positive integer.`);
    return n;
}

// The RP ID must equal the origin's host or be a registrable suffix of it (WebAuthn §5.1.3 / §13.4.9).
function rpIdMatches(rpID, host) {
    return host === rpID || host.endsWith("." + rpID);
}

export function loadConfig(env = process.env) {
    const production = env.NODE_ENV === "production";
    const port = int(env.PORT, 8780, "PORT");
    const host = env.HOST || "127.0.0.1";
    const origins = (env.ORIGINS || (production ? "" : `http://localhost:${port}`))
        .split(",").map(value => value.trim()).filter(Boolean);
    if (!origins.length) throw new Error("ORIGINS is required in production (comma-separated https:// origins).");
    const parsed = origins.map(value => {
        let url;
        try { url = new URL(value); } catch { throw new Error(`ORIGINS contains an invalid URL: ${value}`); }
        if (url.origin !== value) throw new Error(`ORIGINS entries must be bare origins without a path: ${value}`);
        if (production && url.protocol !== "https:") throw new Error(`Production origins must use HTTPS: ${value}`);
        if (!production && url.protocol !== "https:" && url.hostname !== "localhost") {
            throw new Error(`Plain HTTP is only allowed for localhost during development: ${value}`);
        }
        return url;
    });
    const rpID = env.RP_ID || (production ? "" : "localhost");
    if (!rpID) throw new Error("RP_ID is required in production (for example: codementor.example).");
    if (/^\d+\.\d+\.\d+\.\d+$/.test(rpID) || rpID.includes(":")) throw new Error("RP_ID must be a domain name, not an IP address.");
    for (const url of parsed) {
        if (!rpIdMatches(rpID, url.hostname)) throw new Error(`RP_ID ${rpID} is not valid for origin ${url.origin}.`);
    }
    const trustProxy = env.TRUST_PROXY === "1" || env.TRUST_PROXY === "true";
    // Node does not terminate TLS here; production runs behind an HTTPS reverse proxy that sets
    // X-Forwarded-Proto. Without trusting it, HTTPS could not be detected or enforced.
    if (production && !trustProxy) throw new Error("Production must run behind an HTTPS reverse proxy: set TRUST_PROXY=1.");
    const secureCookies = production || parsed.every(url => url.protocol === "https:");
    return Object.freeze({
        production,
        port,
        host,
        origins,
        rpID,
        rpName: env.RP_NAME || "CodeMentor AI",
        dbPath: env.DB_PATH || path.join(projectRoot, "data", "codementor.db"),
        trustProxy,
        secureCookies,
        sessionCookie: secureCookies ? "__Host-cm_session" : "cm_session",
        flowCookie: secureCookies ? "__Host-cm_pkflow" : "cm_pkflow",
        sessionAbsoluteMs: int(env.SESSION_ABSOLUTE_MINUTES, 12 * 60, "SESSION_ABSOLUTE_MINUTES") * 60_000,
        sessionIdleMs: int(env.SESSION_IDLE_MINUTES, 120, "SESSION_IDLE_MINUTES") * 60_000,
        challengeTtlMs: int(env.CHALLENGE_TTL_SECONDS, 300, "CHALLENGE_TTL_SECONDS") * 1000,
        // Adding or removing a sign-in method needs a password / passkey check this recent.
        reauthWindowMs: int(env.REAUTH_WINDOW_MINUTES, 10, "REAUTH_WINDOW_MINUTES") * 60_000,
        rateLimitScale: Number(env.RATE_LIMIT_SCALE || 1)
    });
}
