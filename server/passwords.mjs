// Password hashing with scrypt (OWASP Password Storage Cheat Sheet). Format: scrypt$N$r$p$salt$hash.
import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const N = 2 ** 15, r = 8, p = 1, keyLength = 32;
const maxmem = 128 * N * r * 2;

export const passwordRules = Object.freeze({ min: 12, max: 256 });

export function validatePassword(password) {
    return typeof password === "string" && password.length >= passwordRules.min && password.length <= passwordRules.max && password.trim().length > 0;
}

export async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = await scrypt(password.normalize("NFKC"), salt, keyLength, { N, r, p, maxmem });
    return ["scrypt", N, r, p, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

export async function verifyPassword(password, stored) {
    const parts = typeof stored === "string" ? stored.split("$") : [];
    if (parts.length !== 6 || parts[0] !== "scrypt" || typeof password !== "string") return false;
    const [, n, rr, pp, salt, expected] = parts;
    const expectedBytes = Buffer.from(expected, "base64url");
    const actual = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64url"), expectedBytes.length, {
        N: Number(n), r: Number(rr), p: Number(pp), maxmem: 128 * Number(n) * Number(rr) * 2
    });
    return crypto.timingSafeEqual(actual, expectedBytes);
}

// Compared against when the email is unknown so response time does not reveal which accounts exist.
let dummyHash;
export async function dummyVerify(password) {
    dummyHash ??= await hashPassword(crypto.randomBytes(18).toString("base64url"));
    await verifyPassword(String(password ?? ""), dummyHash);
    return false;
}
