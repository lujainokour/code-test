# Phase 1 — database cleanup review

> Historical snapshot — not a current implementation inventory. Dated counts and outcomes below describe that snapshot only. See [the code-derived current implementation](CURRENT-IMPLEMENTATION.md) for current curriculum counts, roles and limitations. Sample credential literals in historical excerpts have been redacted.

Date: November 4, 2026 (Asia/Amman). Status: inspection and verified backup complete; awaiting approval for archival. No existing file has been moved, deleted, or edited. No new database design or documentation website has been built. No SQL command, database connection, or legacy build/test tool was executed.

## Project inventory

Inspected 652 accessible files, including application source, documentation, tests, delivery copies, previews, output, temporary proposal files, vendor files, and existing backup files. The detailed inventory with byte lengths and SHA-256 hashes is [inventory.json](../.local-backups/sql-phase1-2026-11-04/inventory.json). Four directories could not be enumerated: tmp/proposal/python-libs/bin, fontTools, fonttools-4.68.0.dist-info, and share. These are outside the proposed cleanup and remain untouched. Do not interpret this inspection as covering their inaccessible contents. No AGENTS.md was found in the accessible project tree.

| Root entry | Accessible files |
| --- | ---: |
| .gitignore | 1 |
| .local-backups | 10 |
| assets | 7 |
| CodeMentor-AI-Claude.zip | 1 |
| css | 2 |
| database | 27 |
| delivery | 284 |
| docs | 60 |
| index.html | 1 |
| js | 68 |
| output | 4 |
| pages | 51 |
| previews | 30 |
| README.md | 1 |
| tests | 52 |
| tmp | 46 |
| vendor | 7 |

## Exact proposed cleanup targets

33 files, 367,878 bytes. Each source below would move to `.local-backups/sql-phase1-2026-11-04/archived-original/<original-relative-path>`. This preserves the complete database subtree and its internal relative paths, together with database-specific documentation and reports. These are archival candidates, not deletion targets. Runtime dependency inspection found no frontend dependency on them; approval is still required by your explicit instruction.

| Original relative path | Bytes | Classification |
| --- | ---: | --- |
| database/01-schema.sql | 11212 | Legacy SQL implementation / curriculum |
| database/02-seed.sql | 3979 | Legacy SQL implementation / curriculum |
| database/03-programmability.sql | 7866 | Legacy SQL implementation / curriculum |
| database/04-queries.sql | 3615 | Legacy SQL implementation / curriculum |
| database/05-classroom-lab.sql | 1259 | Legacy SQL implementation / curriculum |
| database/06-database-lifecycle-lab.sql | 802 | Legacy SQL implementation / curriculum |
| database/07-verify.sql | 6593 | Legacy SQL implementation / curriculum |
| database/CodeMentorAI_Learning_Submission.sql | 31631 | Legacy SQL implementation / curriculum |
| database/CodeMentorAI_Learning_Verification.sql | 65929 | Legacy SQL implementation / curriculum |
| database/README.md | 28260 | Legacy database documentation |
| database/reports/existing-test-guard.txt | 237 | Generated SQL test copies / execution evidence |
| database/reports/original-after.txt | 2027 | Generated SQL test copies / execution evidence |
| database/reports/original-before.txt | 2027 | Generated SQL test copies / execution evidence |
| database/reports/original-readonly-verification.txt | 5610 | Generated SQL test copies / execution evidence |
| database/reports/original-source-hashes.json | 998 | Generated SQL test copies / execution evidence |
| database/reports/original-target-guard.txt | 215 | Generated SQL test copies / execution evidence |
| database/reports/submission-execution.txt | 1551 | Generated SQL test copies / execution evidence |
| database/reports/submission-summary.json | 853 | Generated SQL test copies / execution evidence |
| database/reports/submission-test.sql | 31653 | Generated SQL test copies / execution evidence |
| database/reports/test-preflight-results.txt | 35 | Generated SQL test copies / execution evidence |
| database/reports/test-preflight.sql | 158 | Generated SQL test copies / execution evidence |
| database/reports/verification-results.txt | 9165 | Generated SQL test copies / execution evidence |
| database/reports/verification-test.sql | 65951 | Generated SQL test copies / execution evidence |
| database/tools/build-submission.js | 6000 | Legacy SQL build / test tooling |
| database/tools/build-verification.js | 15550 | Legacy SQL build / test tooling |
| database/tools/original-fingerprint.sql | 2796 | Legacy SQL build / test tooling |
| database/tools/test-submission.ps1 | 5786 | Legacy SQL build / test tooling |
| docs/DATABASE-DESIGN.md | 16224 | Legacy database documentation |
| docs/database-existing-name-guard-results.txt | 188 | Legacy SQL execution report |
| docs/database-lifecycle-results.txt | 48 | Legacy SQL execution report |
| docs/database-query-results.txt | 31724 | Legacy SQL execution report |
| docs/database-schema-results.txt | 93 | Legacy SQL execution report |
| docs/database-verification-results.txt | 7843 | Legacy SQL execution report |

## Backup verification

New independent backup: [database-before-cleanup-verified.zip](../.local-backups/sql-phase1-2026-11-04/database-before-cleanup-verified.zip).

- Contains exactly 35 files: the 33 cleanup candidates, README.md, and docs/FRONTEND-STABILITY-AUDIT-2026-11-04.md. Archive entry paths are relative to the project root.
- Extracted into a separate restore-check directory. Every restored file matched the source manifest in byte length and SHA-256; every backed-up source remained unchanged.
- ZIP SHA-256: `241EC7850FD85A57F0197BFBD591DBBF976459E1682B04F23CC24BE2C157F3BF`.
- [Per-file restoration checks](../.local-backups/sql-phase1-2026-11-04/backup-verification.json) and [backup manifest](../.local-backups/sql-phase1-2026-11-04/backup-manifest.json).
- The restore-check directory is retained as additional recoverable evidence. This is a project-file archive, not a SQL Server .bak or backup of live SQL data.
- An initial unsuccessful archive attempt left database-before-cleanup.zip empty; it is NOT the verified backup and must not be used for recovery. It was retained to honor the no-deletion instruction. Only the explicitly named verified ZIP above is valid.

Existing backup ZIPs were opened read-only and every file entry stream was read and hashed. Their outer SHA-256 hashes matched before and after inspection. This demonstrates readable archive contents, not full-project restore validity or semantic correctness. The exact downloaded backup was not identified by the request; these are the three project ZIPs found locally.

| Existing archive | Readable file entries | Current cleanup paths present | Current cleanup contents matching |
| --- | ---: | ---: | ---: |
| CodeMentor-AI-Claude.zip | 226 | 0/33 | 0/33 |
| .local-backups/before-reorganization.zip | 175 | 0/33 | 0/33 |
| .local-backups/saved-project-20261015-235632.zip | 321 | 0/33 | 0/33 |

None of those ZIPs can substitute for the new database-file backup. See [existing backup verification](../.local-backups/sql-phase1-2026-11-04/existing-backups-verification.json). Other backup directories were inventoried and preserved, not certified as complete backups.

## Dependencies discovered

1. database/01-schema.sql declares 21 tables. The numbered files separate schema, seed data, programmable objects, query examples, classroom examples, an optional database lifecycle lab, and verification. This is an inventory observation, not an endorsement of the design.
2. database/tools/build-submission.js reads the numbered source files and writes CodeMentorAI_Learning_Submission.sql. build-verification.js emits the standalone verifier and encodes expected schema, seed counts, and behavioral checks. They belong with the old implementation and should move together.
3. database/tools/test-submission.ps1 depends on sqlcmd, both generated SQL files, original-fingerprint.sql, and database/reports/. Running it would create a test database and overwrite generated report files. It was inspected as text only.
4. database/reports/ contains generated SQL copies, fingerprints, name-guard results, and prior execution reports. Historical pass claims in these files and database/README.md were not rerun or newly certified.
5. docs/DATABASE-DESIGN.md mixes a broader proposed design with notes about the old 21-table implementation. It links to database/README.md. Archiving both beneath the same root preserves that link.
6. README.md:6 links to database/README.md. This is the only active external link identified that needs retargeting after archival. Proposed edit: point it to .local-backups/sql-phase1-2026-11-04/archived-original/database/README.md and label the SQL implementation as archived, with rebuild pending. Do not claim a replacement exists.
7. docs/FRONTEND-STABILITY-AUDIT-2026-11-04.md:170 mentions database files and backups as historical preservation evidence. Preserve the audit unchanged; it is not a live runtime dependency or a cleanup target.
8. Application inspection: signup.js and login.js persist demo sessions through cmStorage; learning-storage.js wraps localStorage/sessionStorage. admin-account-access.js uses adminStudentData/adminStudentStore from admin-student-data.js; account status is saved through cmStorage. The active admin HTML loads frontend resources, not SQL files. No database-file imports, SQL Server connection configuration, or SQL execution calls were identified in the inspected frontend.
9. tests/ contains frontend/browser tests and a static development server. No tests under tests/ were identified as depending on the old SQL files. The SQL-specific test runner is under database/tools/ and is included in the proposed archive. A test name such as submission-completion.ps1 concerns coding task completion, not SQL submission packaging.
10. delivery/, output/proposal/, tmp/proposal/, previews/, and vendor/ are separate deliverable, proposal, visual, and runtime-support material. Generic mentions of a future server database are not obsolete implementation links and should remain.

Full reference evidence: [references.json](../.local-backups/sql-phase1-2026-11-04/references.json).

## Files preserved

All existing files are currently preserved in place, including all 33 candidates. After approval, retain index.html, pages/ (including all student and admin dashboards), css/, js/, assets/ (images and videos), vendor/, tests/, delivery/, previews/, output/, tmp/, all pre-existing backups, .gitignore, and all unrelated docs. Preserve the learning, assessment, task, project, mentor, account-access, and browser-storage functionality. Only README.md's database section needs a planned wording/link edit; do not change frontend files.

Final preservation check: 652 pre-existing accessible files with baseline hashes were rehashed; zero were changed or missing. The inaccessible temporary library subdirectories are excluded from this claim. See [preservation-verification.json](../.local-backups/sql-phase1-2026-11-04/preservation-verification.json).

## Unresolved references and limitations

- README.md still targets the active database guide intentionally, until archival is approved and completed. It is not currently broken.
- docs/DATABASE-DESIGN.md:171 names database/03-queries.sql, but the actual query file is 04-queries.sql; 03-programmability.sql exists instead. This stale historical reference would remain inside the isolated archive; preserve the old document byte-for-byte and explain the mismatch in the archive index.
- No current docs/database/ website exists. Creating one belongs to a later phase and has not started.
- No live SQL Server state was inspected. Existing database reports do not establish today's server state. CodeMentorAI_Learning and any existing test databases remain untouched.
- The optional 06-database-lifecycle-lab.sql contains DROP DATABASE for CodeMentorAI_DDL_Lab_Only behind an opt-in flag. It was not executed. Do not run any legacy SQL as part of archival.
- No claim is made that frontend-to-SQL integration exists, that SQL tests passed in this turn, or that a model has been trained.

## Exact plan after approval — Phase 1 cleanup only

1. Rehash all 33 sources and the verified backup; compare to the saved manifest. Stop on any mismatch, missing source, or existing destination. Reconfirm that the archive and every resolved move target stay inside this workspace and outside active database/.
2. Create .local-backups/sql-phase1-2026-11-04/archived-original/. Move exactly the 33 listed files to their original relative paths beneath it. Do not execute scripts, remove unrelated files, overwrite any backup, or connect to SQL Server. Leave any empty source directories unless separately needed; no recursive deletion is required.
3. Rehash all 33 destination files and compare with the original manifest. Record the move results and add an archive index explaining its historical status and stale query filename.
4. Update only the database section of root README.md to link to the archived guide and state that rebuilding is pending. Preserve the original README from the verified ZIP for reversal. Leave historical audits and unrelated documentation unchanged.
5. Scan active source/documentation for old implementation references, excluding the isolated archive, backup artifacts, and intentionally historical evidence. Check the new README link and ensure all frontend baseline hashes still match.
6. Report exactly what moved, what remained, dependency checks, and remaining references. Stop before Phase 2 or any rebuild unless separately authorized.

Recovery: copy the archived files back to their manifest paths (stop if a destination already exists), or restore those same paths from the verified ZIP. Restore README.md from the verified ZIP if its database section was changed. Verify recovered hashes. Recovery concerns project files only and never requires altering any SQL Server database.

Approval requested: move these exact 33 files into the isolated archive and make the single root README database-section update. This pause is required by your attached request: “Wait for my approval before moving or deleting any files.”
