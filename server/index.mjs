// Start: npm start  (see docs/PASSKEYS.md for environment variables and production setup)
import { loadConfig } from "./config.mjs";
import { migrateUp, openDatabase } from "./db.mjs";
import { createApp } from "./app.mjs";

const config = loadConfig();
const db = openDatabase(config.dbPath);
const applied = migrateUp(db);
if (applied.length) console.log(`Applied migrations: ${applied.join(", ")}`);

const app = createApp({ config, db });
const server = app.listen(config.port, config.host, () => {
    console.log(`CodeMentor AI server listening on ${config.host}:${config.port}`);
    console.log(`Open ${config.origins[0]}/  (RP ID: ${config.rpID})`);
});

function shutdown() {
    server.close(() => { db.close(); process.exit(0); });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
