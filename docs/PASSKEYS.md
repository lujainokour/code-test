# Passkeys and Face ID sign-in (server authentication)

CodeMentor AI can now run with a small Node.js server. In that mode, accounts, sessions and
passkeys live on the server, and anyone with an account can sign in with **Face ID, Windows Hello,
Touch ID, an Android device, a phone or a device PIN** through WebAuthn / FIDO2 passkeys.

The fingerprint or face check happens only inside the user's device. The server never receives or
stores images, templates or any biometric data. It stores only the public key the device created and
checks a fresh signature on every sign-in.

Served as static files (the old `tests/serve.ps1` setup), the site behaves exactly as before:
browser-local accounts, the demo samples, and no passkey button.

## Quick start (development)

```powershell
npm install
npm start                     # http://localhost:8780/  (open "localhost", not 127.0.0.1)
node server/cli.mjs create-admin admin@yourdomain.org "Your Name"   # prompts for a password
```

WebAuthn only works in a secure context. `http://localhost` counts as one; `http://127.0.0.1` cannot be
an RP ID. The SQLite database is created at `data/codementor.db`, which Git ignores.

## Architecture

```
Browser (existing pages)                        Node server (server/)                 SQLite (data/)
 login / signup / security pages ──JSON /api──▶ Express 5 + @simplewebauthn/server ──▶ users, passkey_credentials,
 js/server-auth.js (client)                      sessions (HttpOnly cookie)              sessions, webauthn_challenges,
 js/access-guard.js (re-checks server session)   rate limits, audit log                  audit_log, app_meta
 OS authenticator (Face ID / Windows Hello…)     serves the static site, same origin
```

* **One server, same origin.** `server/app.mjs` serves the existing site and `/api`. No second backend.
* **The server session is the authority.** After the server verifies a password or passkey, it sets an
  HttpOnly, `SameSite=Strict` session cookie. The page code then writes the browser keys the existing
  pages already read (`codementor-demo-session`, `codementor-company-session`,
  `codementor-admin-session`). `js/access-guard.js` checks those keys against `/api/auth/status` on every
  protected page. Any mismatch is cleared and the visitor is sent to sign in. Network or server errors
  fail closed.
* **Learning data stays browser-local.** Progress, community, company workspace records and so on are
  still stored in the browser, as before. Only identity, sign-in and sessions moved to the server.
* **Static fallback.** If `/api` returns 404 (static hosting), every page keeps its original behaviour.

### Libraries

| Package | Version | Why |
|---|---|---|
| `@simplewebauthn/server` | 14.1.0 | Maintained WebAuthn L3 verification (challenge, origin, RP ID, signature, UV flag, counter) |
| `@simplewebauthn/browser` | 14.0.0 | `startRegistration` / `startAuthentication`, feature detection. Served by the server at `/vendor/simplewebauthn-browser.min.js` |
| `express` | 5.3.0 | Routing, JSON body limits, static files with range requests (needed for the videos) |
| `node:sqlite` | built into Node ≥ 22.13 | SQLite with no native module to compile |

## API

All endpoints take and return JSON. State-changing calls must come from a configured origin (`Origin`
header) with `Content-Type: application/json`. Signed-in calls also need the `X-CSRF-Token` header,
which `/api/auth/status` returns to same-origin scripts.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/auth/status` | – | Server mode flag, current user, CSRF token, passkey count |
| `POST /api/auth/signup` | – | Create a **student** or **company** account (admins are CLI-only) and start a session |
| `POST /api/auth/login` | – | Password sign-in. An optional `role` must match, and a mismatch looks exactly like a wrong password |
| `POST /api/auth/logout` | – | End the session |
| `POST /api/auth/reauth` | session + CSRF | Confirm the password; opens a 10-minute window for sensitive changes |
| `POST /api/auth/change-password` | session + CSRF | New password; rotates this session and signs out every other device |
| `POST /api/passkeys/login/options` | – | Fresh challenge, bound to this browser by an HttpOnly flow cookie |
| `POST /api/passkeys/login/verify` | flow cookie | Verify the assertion, then start a new session |
| `GET /api/passkeys` | session | List the user's passkeys |
| `POST /api/passkeys/register/options` | session + CSRF + recent auth | Registration options with `excludeCredentials` |
| `POST /api/passkeys/register/verify` | session + CSRF + recent auth | Verify attestation and store the credential |
| `PATCH /api/passkeys/:id` | session + CSRF | Rename (owner only) |
| `DELETE /api/passkeys/:id` | session + CSRF + recent auth | Remove (owner only) |

Errors look like `{ "error": { "code": "...", "message": "..." } }`. The message is safe to show users;
internal details are never sent.

## Database (`server/migrations/001_auth.up.sql`, reversible with `.down.sql`)

* `users`: `public_id` (UUID shown to the browser), unique case-insensitive `email`, `role`
  (`student` / `company` / `admin`), `status` (`active` / `suspended`), scrypt `password_hash`, and
  `webauthn_user_id` (a random 32-byte user handle, never the email).
* `passkey_credentials`: unique `credential_id`, `user_id` FK (cascade), COSE `public_key`, `counter`,
  `transports`, `device_name`, `aaguid`, `backup_eligible`, `backup_state`, `created_at`,
  `last_used_at`. Indexed by user. One user can have many devices (limit 20).
* `sessions`: SHA-256 of the cookie token (the token itself is never stored), CSRF token,
  `auth_method`, absolute and idle expiry, `reauth_at`.
* `webauthn_challenges`: pending ceremonies. Registration is bound to the session; sign-in is bound to
  the hash of the flow cookie. Single use, with a 5-minute expiry.
* `audit_log`: event, outcome, short reason code, salted IP hash and user agent. **Never** passwords,
  challenges, credential responses, keys or tokens.

Commands: `npm run migrate`, `npm run migrate:down`. Existing browser data is never touched.

## Security measures

| Requirement | How it is met |
|---|---|
| Random, single-use, expiring challenges | SimpleWebAuthn (32 random bytes). The row is deleted *before* verification; 5-minute TTL |
| Challenge bound to the session | Sign-in: HttpOnly flow cookie. Registration: the signed-in session row |
| RP ID and origin | `expectedRPID` and `expectedOrigin` come from `RP_ID` and `ORIGINS`. Config refuses mismatched or IP RP IDs and plain HTTP outside localhost |
| Signature, UV flag | `verify*Response` with `requireUserVerification: true`. Options ask for `userVerification: "required"` |
| Credential ownership | Lookup by credential ID, plus the authenticator's `userHandle` must equal that user's handle |
| Counter | Stored and updated. A counter that goes backwards is rejected and logged (`counter_regression`) |
| No passkey for someone else's account | Registration needs that account's session, CSRF token and recent auth, and the challenge is tied to that session |
| Duplicate credentials | `excludeCredentials` plus a unique constraint, also across accounts |
| Rate limiting | Per IP and per email for passwords; per IP for passkey sign-in; per user for registration; per session for re-auth. HTTP 429 with `Retry-After` |
| CSRF | `SameSite=Strict`, Origin allow-list, JSON-only, and an `X-CSRF-Token` for signed-in calls |
| Sessions | New random token on every sign-in (old one deleted). Hashed at rest. 12 h absolute, 2 h idle. `__Host-` prefix and `Secure` on HTTPS |
| Re-authentication | Adding or removing a passkey needs a password check in the last 10 minutes |
| Recovery | Every account keeps its password, so removing the last passkey never locks anyone out. Operators can `reset-password`, `remove-passkeys`, `suspend`, `activate` |
| Account restrictions | Suspended accounts can't sign in by any method, and their live sessions end. The browser-local admin suspension list is still checked after server sign-in, and the server session is ended if it refuses |
| HTTPS | Production refuses to start without `https://` origins and `TRUST_PROXY=1`, redirects HTTP, sends HSTS |
| Headers | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, COOP, a `Permissions-Policy` that allows WebAuthn only for this origin, and `no-store` on `/api` |
| Files never served | `server/`, `node_modules/`, `data/`, `package*.json`, dotfiles |

## User interface

* **Login pages** (`login.html`, `admin-login.html`, `company-login.html`) have a **"Sign in with Face
  ID"** button (navy/ocean gradient, distinct from the burgundy password button). It handles these
  states: initial, waiting for the device, success, cancelled, unsupported (no button, with an
  explanation), unregistered passkey, failed and network error. It appears only when the server is
  present and the browser supports WebAuthn. Passkey sign-in sends each role to its own dashboard,
  whichever page it started from.
* **Security & passkeys** (`pages/auth/security.html`), linked from the workspace sidebar in server
  mode, offers: enable or register another device, the device list (added date, last used date,
  synced or device-bound), rename, remove (password confirmation, and a warning on the last passkey),
  and status.
* Sign-up, change-password and company sign-up/login use the server in server mode. Signing in with a
  browser-only account links it to the server once, after its local password is checked.

## Tests

```powershell
npm run test:auth              # 16 server tests (node:test), software authenticator with real P-256 signatures
npm run test:passkey-browser   # 34 end-to-end checks in headless Chrome/Edge with a DevTools virtual authenticator
node tools/verify-local.cjs    # existing project suites
```

`test:auth` covers: registration, sign-in, invalid signature (tampered and wrong key), expired /
reused / unbound / cross-browser challenges, wrong origin, wrong RP ID, unknown credential, another
user's user handle, missing UV (registration and sign-in), counter regression, multiple devices,
duplicate credentials across accounts, registering for another account, missing CSRF, removal with
and without recent auth, rename and delete by a non-owner, password fallback, password change signing
out other sessions, role scoping, suspension, rate limits, secrets absent from the audit log, files
never served, cookie flags, config validation, and migration up/down.

## Compatibility

| Environment | Status |
|---|---|
| Chrome (Windows, headless + virtual authenticator) | **Automated: 34/34 passed** |
| Microsoft Edge (Windows, headless + virtual authenticator) | **Automated: 34/34 passed** |
| Windows Hello (real face / PIN) | Implemented, **not physically tested** |
| macOS Touch ID / Safari, iOS Face ID | Implemented to the standard, **not tested** (no Apple device available) |
| Android biometrics | Implemented, **not tested** |
| Firefox | Implemented, **not tested** (supports WebAuthn and passkeys) |
| Browsers without WebAuthn | Automated: the button is hidden and password sign-in is explained |

## Production deployment

1. Put an HTTPS reverse proxy (nginx, Caddy, IIS, a cloud load balancer) in front of the server, and
   forward `X-Forwarded-Proto`.
2. Set the environment:
   `NODE_ENV=production`, `TRUST_PROXY=1`, `ORIGINS=https://app.example.org` (comma-separated),
   `RP_ID=example.org` (the domain the passkeys belong to; changing it later invalidates every
   passkey), `DB_PATH=/var/lib/codementor/codementor.db`, optionally `RP_NAME` and `PORT`.
3. `npm ci --omit=dev && npm run migrate && npm start`, under a process manager.
4. Create administrators with `node server/cli.mjs create-admin`.
5. Back up the database file. It holds password hashes and public keys, but no biometric data.

### Known limits and pending work

* Rate limits are in memory, so they apply per process. Several instances need a shared store such as Redis.
* There is no Content-Security-Policy yet: the existing pages use inline scripts and styles.
* There is no email service, so self-service password reset isn't available for server accounts.
  Recovery is a passkey, a known password, or an operator `reset-password`.
* Company and admin accounts change their password through the operator CLI. The change-password
  page is the student page.
* Learning and workspace records are still browser-local; only identity and sessions are server-side.
* The per-email password limit (10 tries / 15 min) means someone who knows an address can temporarily
  block password sign-in for it. Passkey sign-in is limited per IP, so it still works for the owner.
* Sign-up says when an email is already registered (needed for a useful form), so it can reveal whether
  an account exists. It is rate limited per IP.
* The admin browser identity is kept per tab (`sessionStorage`), as before. Opening the student
  sign-in page in a new tab while signed in as admin ends that admin's server session (it fails safe).

## Approved changes to protected pages

`pages/auth/login.html` and `pages/auth/admin-login.html` are protected sign-in pages. The owner
approved the passkey changes as **Part 7** (`docs/evidence/authorized-baseline-changes.json`).
`tests/qa-sweep.cjs` lists the three exact insertions: the `passkeys.css` link, the `server-auth.js`
script and the "Sign in with Face ID" block. Each must appear exactly once, and after removing them
(and the favicon) the page must still match its original baseline byte for byte. Any other edit, a
duplicate, or a missing insertion fails the test.
