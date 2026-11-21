-- 001: server-side accounts, sessions, WebAuthn passkeys, challenges and audit log.
-- No biometric data is stored anywhere: a passkey row holds only the public key the
-- authenticator created; the private key and any face/fingerprint data never leave the device.

CREATE TABLE users (
    id                INTEGER PRIMARY KEY,
    public_id         TEXT    NOT NULL UNIQUE,                      -- random UUID exposed to the browser
    email             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    display_name      TEXT    NOT NULL CHECK (length(display_name) BETWEEN 1 AND 160),
    role              TEXT    NOT NULL CHECK (role IN ('student', 'company', 'admin')),
    age               INTEGER CHECK (age IS NULL OR age BETWEEN 1 AND 120),
    status            TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    password_hash     TEXT    NOT NULL,                             -- scrypt$N$r$p$salt$hash; never plain text
    webauthn_user_id  TEXT    NOT NULL UNIQUE,                      -- random 32-byte user handle (base64url), not the email
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL
);

CREATE TABLE passkey_credentials (
    id               INTEGER PRIMARY KEY,
    credential_id    TEXT    NOT NULL UNIQUE,                       -- base64url credential ID from the authenticator
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_key       BLOB    NOT NULL,                              -- COSE public key; the private key stays on the device
    counter          INTEGER NOT NULL DEFAULT 0 CHECK (counter >= 0),
    transports       TEXT    NOT NULL DEFAULT '[]',                 -- JSON array of AuthenticatorTransport hints
    device_name      TEXT    NOT NULL CHECK (length(device_name) BETWEEN 1 AND 60),
    aaguid           TEXT,
    backup_eligible  INTEGER NOT NULL CHECK (backup_eligible IN (0, 1)),
    backup_state     INTEGER NOT NULL CHECK (backup_state IN (0, 1)),
    created_at       INTEGER NOT NULL,
    last_used_at     INTEGER
);
CREATE INDEX ix_passkey_credentials_user ON passkey_credentials(user_id);

CREATE TABLE sessions (
    id            INTEGER PRIMARY KEY,
    token_hash    TEXT    NOT NULL UNIQUE,                          -- SHA-256 of the cookie token; the token itself is never stored
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token    TEXT    NOT NULL,
    auth_method   TEXT    NOT NULL CHECK (auth_method IN ('password', 'passkey', 'signup')),
    created_at    INTEGER NOT NULL,
    last_seen_at  INTEGER NOT NULL,
    expires_at    INTEGER NOT NULL,
    reauth_at     INTEGER NOT NULL                                  -- last time the user proved possession of a factor
);
CREATE INDEX ix_sessions_user ON sessions(user_id);
CREATE INDEX ix_sessions_expires ON sessions(expires_at);

-- Pending WebAuthn ceremonies. Each row is single use: it is deleted before verification starts.
CREATE TABLE webauthn_challenges (
    id          TEXT    PRIMARY KEY,                                -- SHA-256 of the flow cookie (authentication) or random id (registration)
    purpose     TEXT    NOT NULL CHECK (purpose IN ('registration', 'authentication')),
    challenge   TEXT    NOT NULL,
    session_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,  -- registration: bound to the signed-in session
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    expires_at  INTEGER NOT NULL,
    CHECK ((purpose = 'registration' AND session_id IS NOT NULL AND user_id IS NOT NULL) OR (purpose = 'authentication' AND session_id IS NULL))
);
CREATE INDEX ix_webauthn_challenges_session ON webauthn_challenges(session_id);
CREATE INDEX ix_webauthn_challenges_expires ON webauthn_challenges(expires_at);

CREATE TABLE audit_log (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    event       TEXT    NOT NULL,
    outcome     TEXT    NOT NULL CHECK (outcome IN ('success', 'failure', 'blocked')),
    reason      TEXT,
    ip_hash     TEXT,                                               -- salted hash; raw IPs are not stored
    user_agent  TEXT,
    created_at  INTEGER NOT NULL
);
CREATE INDEX ix_audit_log_user ON audit_log(user_id, created_at);
CREATE INDEX ix_audit_log_created ON audit_log(created_at);

CREATE TABLE app_meta (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);
