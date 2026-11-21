// Operator commands. Admin accounts are never created from the website; an operator creates them here.
//   node server/cli.mjs migrate
//   node server/cli.mjs migrate-down
//   node server/cli.mjs create-admin <email> "<display name>"      (prompts for the password)
//   node server/cli.mjs reset-password <email>                     (prompts; signs out every session)
//   node server/cli.mjs suspend <email> | activate <email>
//   node server/cli.mjs remove-passkeys <email>                    (account recovery for a lost device)
import crypto from "node:crypto";
import readline from "node:readline";
import { loadConfig } from "./config.mjs";
import { migrateDown, migrateUp, openDatabase, transaction } from "./db.mjs";
import { hashPassword, passwordRules, validatePassword } from "./passwords.mjs";

const [command, emailArg, nameArg] = process.argv.slice(2);
const config = loadConfig();
const db = openDatabase(config.dbPath);
const email = String(emailArg || "").trim().toLowerCase();

function fail(message) { console.error(message); process.exit(1); }

function askHidden(prompt) {
    if (process.env.CM_PASSWORD) return Promise.resolve(process.env.CM_PASSWORD); // for scripted setups only
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl._writeToOutput = text => { if (text.includes(prompt)) process.stdout.write(text); };
        rl.question(prompt, answer => { rl.close(); process.stdout.write("\n"); resolve(answer); });
    });
}

async function newPassword() {
    const password = await askHidden("New password: ");
    if (!validatePassword(password)) fail(`Password must be ${passwordRules.min}-${passwordRules.max} characters.`);
    if (!process.env.CM_PASSWORD && (await askHidden("Repeat password: ")) !== password) fail("Passwords do not match.");
    return hashPassword(password);
}

function userOrFail() {
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) fail(`No account with email ${email}.`);
    return user;
}

switch (command) {
    case "migrate": {
        const ran = migrateUp(db);
        console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Database is up to date.");
        break;
    }
    case "migrate-down": {
        const version = migrateDown(db);
        console.log(version === null ? "Nothing to revert." : `Reverted migration ${version}.`);
        break;
    }
    case "create-admin": {
        migrateUp(db);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Usage: create-admin <email> \"<display name>\"");
        if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) fail("An account with this email already exists.");
        const hash = await newPassword(), now = Date.now();
        db.prepare(`INSERT INTO users (public_id, email, display_name, role, age, password_hash, webauthn_user_id, created_at, updated_at)
                    VALUES (?, ?, ?, 'admin', NULL, ?, ?, ?, ?)`)
            .run(crypto.randomUUID(), email, (nameArg || "Administrator").slice(0, 160), hash, crypto.randomBytes(32).toString("base64url"), now, now);
        console.log(`Admin ${email} created.`);
        break;
    }
    case "reset-password": {
        const user = userOrFail(), hash = await newPassword();
        transaction(db, () => {
            db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hash, Date.now(), user.id);
            db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
        });
        console.log(`Password reset for ${email}; all sessions signed out.`);
        break;
    }
    case "suspend":
    case "activate": {
        const user = userOrFail();
        transaction(db, () => {
            db.prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?").run(command === "suspend" ? "suspended" : "active", Date.now(), user.id);
            if (command === "suspend") db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
        });
        console.log(`${email} is now ${command === "suspend" ? "suspended" : "active"}.`);
        break;
    }
    case "remove-passkeys": {
        const user = userOrFail();
        const removed = db.prepare("DELETE FROM passkey_credentials WHERE user_id = ?").run(user.id).changes;
        console.log(`Removed ${removed} passkey(s) for ${email}. Password sign-in is unchanged.`);
        break;
    }
    default:
        fail("Commands: migrate | migrate-down | create-admin <email> <name> | reset-password <email> | suspend <email> | activate <email> | remove-passkeys <email>");
}
db.close();
