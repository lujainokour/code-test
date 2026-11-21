// A software WebAuthn authenticator for automated tests. It produces genuine ES256 (P-256) key pairs,
// "none" attestation objects and signed assertions in the exact formats browsers send, so the server's
// real verification code runs unmodified. It is a test tool only and is never loaded by the site.
import crypto from "node:crypto";

const b64u = buffer => Buffer.from(buffer).toString("base64url");
const sha256 = data => crypto.createHash("sha256").update(data).digest();

// Minimal CBOR encoder (RFC 8949) covering the types WebAuthn needs.
function head(major, value) {
    if (value < 24) return Buffer.from([(major << 5) | value]);
    if (value < 256) return Buffer.from([(major << 5) | 24, value]);
    if (value < 65536) { const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(value, 1); return b; }
    const b = Buffer.alloc(5); b[0] = (major << 5) | 26; b.writeUInt32BE(value, 1); return b;
}
export function cbor(value) {
    if (Number.isInteger(value)) return value >= 0 ? head(0, value) : head(1, -1 - value);
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) return Buffer.concat([head(2, value.length), Buffer.from(value)]);
    if (typeof value === "string") { const s = Buffer.from(value, "utf8"); return Buffer.concat([head(3, s.length), s]); }
    if (value instanceof Map) return Buffer.concat([head(5, value.size), ...[...value].flatMap(([k, v]) => [cbor(k), cbor(v)])]);
    if (typeof value === "object") return cbor(new Map(Object.entries(value)));
    throw new Error("Unsupported CBOR value");
}

const FLAGS = { UP: 0x01, UV: 0x04, BE: 0x08, BS: 0x10, AT: 0x40 };

export class SoftAuthenticator {
    constructor({ rpID = "localhost", origin = "http://localhost:8780" } = {}) {
        this.rpID = rpID;
        this.origin = origin;
        this.credentials = new Map(); // id -> { privateKey, cose, userHandle, counter }
    }

    flags({ uv = true, up = true, backup = false } = {}) {
        return (up ? FLAGS.UP : 0) | (uv ? FLAGS.UV : 0) | (backup ? FLAGS.BE | FLAGS.BS : 0);
    }

    // Returns RegistrationResponseJSON for navigator.credentials.create().
    create(options, { uv = true, origin = this.origin, rpID = this.rpID, type = "webauthn.create", reuseId = null } = {}) {
        const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
        const jwk = publicKey.export({ format: "jwk" });
        const cose = cbor(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, "base64url")], [-3, Buffer.from(jwk.y, "base64url")]]));
        const id = reuseId ? Buffer.from(reuseId, "base64url") : crypto.randomBytes(32);
        const idLength = Buffer.alloc(2); idLength.writeUInt16BE(id.length);
        const authData = Buffer.concat([
            sha256(rpID), Buffer.from([this.flags({ uv }) | FLAGS.AT]), Buffer.alloc(4),
            Buffer.alloc(16), idLength, id, cose
        ]);
        const clientDataJSON = Buffer.from(JSON.stringify({ type, challenge: options.challenge, origin, crossOrigin: false }));
        const attestationObject = cbor(new Map([["fmt", "none"], ["attStmt", new Map()], ["authData", authData]]));
        if (!reuseId) this.credentials.set(b64u(id), { privateKey, userHandle: options.user.id, counter: 0 });
        return {
            id: b64u(id), rawId: b64u(id), type: "public-key", authenticatorAttachment: "platform", clientExtensionResults: {},
            response: { clientDataJSON: b64u(clientDataJSON), attestationObject: b64u(attestationObject), transports: ["internal", "hybrid"] }
        };
    }

    // Returns AuthenticationResponseJSON for navigator.credentials.get().
    get(options, credentialId = [...this.credentials.keys()][0], {
        uv = true, origin = this.origin, rpID = this.rpID, userHandle, tamper = false, counter, signWith
    } = {}) {
        const credential = this.credentials.get(credentialId);
        credential.counter = counter ?? credential.counter + 1;
        const count = Buffer.alloc(4); count.writeUInt32BE(credential.counter);
        const authData = Buffer.concat([sha256(rpID), Buffer.from([this.flags({ uv })]), count]);
        const clientDataJSON = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge: options.challenge, origin, crossOrigin: false }));
        let signature = crypto.sign("sha256", Buffer.concat([authData, sha256(clientDataJSON)]), signWith ?? credential.privateKey);
        if (tamper) { signature = Buffer.from(signature); signature[signature.length - 1] ^= 0xff; }
        return {
            id: credentialId, rawId: credentialId, type: "public-key", authenticatorAttachment: "platform", clientExtensionResults: {},
            response: {
                clientDataJSON: b64u(clientDataJSON), authenticatorData: b64u(authData), signature: b64u(signature),
                userHandle: userHandle === undefined ? credential.userHandle : userHandle
            }
        };
    }
}
