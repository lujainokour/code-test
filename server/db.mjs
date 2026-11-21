// SQLite through Node's built-in node:sqlite driver, with a small reversible migration runner.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

function listMigrations() {
    return fs.readdirSync(migrationsDir)
        .map(name => /^(\d{3})_([a-z0-9_]+)\.up\.sql$/.exec(name))
        .filter(Boolean)
        .map(([file, version, label]) => ({ version: Number(version), label, up: file, down: file.replace(".up.sql", ".down.sql") }))
        .sort((a, b) => a.version - b.version);
}

export function openDatabase(dbPath) {
    if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, label TEXT NOT NULL, applied_at INTEGER NOT NULL)");
    return db;
}

export function transaction(db, fn) {
    db.exec("BEGIN IMMEDIATE");
    try { const result = fn(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
}

export function migrateUp(db) {
    const applied = new Set(db.prepare("SELECT version FROM schema_migrations").all().map(row => row.version));
    const ran = [];
    for (const migration of listMigrations()) {
        if (applied.has(migration.version)) continue;
        const sql = fs.readFileSync(path.join(migrationsDir, migration.up), "utf8");
        transaction(db, () => {
            db.exec(sql);
            db.prepare("INSERT INTO schema_migrations (version, label, applied_at) VALUES (?, ?, ?)").run(migration.version, migration.label, Date.now());
        });
        ran.push(migration.version);
    }
    // Per-database random salt for hashing IP addresses in the audit log.
    db.prepare("INSERT OR IGNORE INTO app_meta (key, value) VALUES ('audit_salt', ?)").run(crypto.randomBytes(32).toString("base64url"));
    return ran;
}

export function migrateDown(db) {
    const last = db.prepare("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1").get();
    if (!last) return null;
    const migration = listMigrations().find(item => item.version === last.version);
    if (!migration) throw new Error(`No migration file for applied version ${last.version}.`);
    const sql = fs.readFileSync(path.join(migrationsDir, migration.down), "utf8");
    transaction(db, () => {
        db.exec(sql);
        db.prepare("DELETE FROM schema_migrations WHERE version = ?").run(migration.version);
    });
    return migration.version;
}
