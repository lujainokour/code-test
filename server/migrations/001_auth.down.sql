-- Reverts 001. Drops only the tables this migration created.
DROP TABLE IF EXISTS app_meta;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS webauthn_challenges;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS passkey_credentials;
DROP TABLE IF EXISTS users;
