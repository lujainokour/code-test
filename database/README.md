# CodeMentor AI — Phase 3 SQL Server core

The implemented database contains **exactly 23 core tables**, 169 columns, 23 clustered primary keys, 37 foreign keys/relationships, 3 views, 2 functions, 3 stored procedures, 20 triggers and 66 indexes. Index totals include 23 PK indexes, 20 unique-constraint indexes and 23 additional nonclustered indexes. See the live metadata and verification report for authoritative counts.

This implements a standalone database. The existing HTML/CSS/JavaScript application remains browser-local and is not connected to it. No authentication provider, Python server evaluator, live AI, certificate issuer or optional tables were added. Learner seed records are fictional academic examples; SQL fixture outcomes are not claims that Python was executed.

## Files

Recovery verification — November 8, 2026: the missing submission and its DDL, business rules and seed inputs were recovered from the atlas after verifying its SHA-256. `tools/restore-sql.cjs` reproduces this recovery without connecting to SQL Server. The verification suite was regenerated from its source. Academic examples and the metadata export query were restored and executed on an isolated `CodeMentorAI_Phase3_Fixes_20261108` installation: 102/102 checks passed, academic examples passed, and DBCC CHECKCONSTRAINTS returned zero violations. Historical R3 reports were preserved. Current evidence: `../docs/fixes-2026-11-08-sql-results.json`.

The SQL fixture remains the verified original three-level educational dataset. The browser curriculum now has six levels. There is no automatic synchronization or claim that SQL fixtures mirror the expanded browser UI.

- [submission.sql](submission.sql): standalone creation, constraints, indexes, modules and seed. No external includes or SQLCMD mode.
- [verification.sql](verification.sql): rollback-isolated SQL tests; select the created database first.
- [academic-examples.sql](academic-examples.sql): all requested SQL curriculum topics, including isolated disposable DDL.
- [ARABIC-STUDY-GUIDE.md](ARABIC-STUDY-GUIDE.md): per-table Arabic discussion guide and coach questions.
- [Interactive atlas](../docs/database/database.html): exactly four buildless local files in `docs/database/`.
- [schema-authoring.json](schema-authoring.json): independent physical authoring specification.
- [reports/schema-metadata.json](reports/schema-metadata.json): actual SQL Server catalog export, including every constraint/index/trigger definition.
- [reports/sql-verification.json](reports/sql-verification.json): exact executed checks, errors, counts and UTC time.
- [reports/documentation-consistency.json](reports/documentation-consistency.json): metadata/authoring/layout/download consistency.
- [FINAL-VERIFICATION.md](FINAL-VERIFICATION.md): results, limitations and exact database names.

## Execute safely in SSMS

1. Use **SQL Server 2019+** Database Engine (tested on SQL Server 2025 17.0.1000.7). Open `submission.sql` with an account permitted to `CREATE DATABASE` and create tables, views, functions, procedures, triggers and indexes in the database it creates. Provisioning needs elevated database permissions; a future application principal must not have DDL, trigger-disable or schema-owner rights.
2. Change the one `@DatabaseName` literal near the top to an **unused** `CodeMentorAI_Phase3_...` name. The tested final target is `CodeMentorAI_Phase3_Test_20261105_R3`, so choose a new suffix on rerun. The prefix and explicit original-name guard forbid `CodeMentorAI_Learning`.
3. Execute the complete script normally in SSMS, with SQLCMD mode off. A single outer batch ensures an existing-target rejection cannot be bypassed by SSMS continuing with later `GO` batches. `CREATE DATABASE` runs outside the install transaction; object/seed creation is transactional and each module is created in its own nested batch. A creation race also throws before installation. On installation failure the fresh, empty database may remain; do not drop/reuse it automatically. Choose another unused name after fixing the script.
4. Select your new database from the SSMS database list. Run `verification.sql` outside any existing transaction. Expected failures are caught and checked by exact error number. Each mutation rolls back; all 23 table row hashes must stay unchanged. **IDENTITY allocations are not rolled back**, so tests/demo inserts can leave normal identity gaps. No reseeding is performed.
5. Run `academic-examples.sql` in the same database. Only `#LanguagePractice`, a session-local temporary table, receives `TRUNCATE` and `DROP`. Permanent sample DML rolls back.
6. Open `docs/database/database.html`. All four files can work together from disk; a local static HTTP server is preferable for clipboard permissions. Download and copy use the same SQL string embedded from `submission.sql`. Clipboard fallback selects the text for manual copying. No CDN or external script is required.

The local tool runner `tools/run-phase3.ps1` uses Windows integrated authentication and exports tests/metadata. It defaults to `lpc:.` and the R3 database; parameters allow another server and target. `-Install` first verifies that the name is unused and exactly matches the submission. On systems where script-file execution is disabled, execute the equivalent reviewed commands interactively; changing the system execution policy is unnecessary.

## Enforcement and design decisions

**Student ownership.** Profiles use a shared PK/FK. `TR_StudentProfiles_Role` checks the actual Users role with parent update/range locks; `TR_Users_StudentRole` prevents converting a profile owner to Admin. Attempts and enrollments reference StudentProfiles. Other learning records inherit that ownership through enrollment/attempt. A simple Users FK is not claimed to validate role. Enabled/suspended access and caller identity remain future backend authorization concerns; `uspEnrollStudent` additionally checks enabled state and course publication.

**Matching courses.** Completion/workspace/submission triggers join to the canonical course and require active enrollment. Course language, level-course, lesson-level/topic and enrollment-owner/course links cannot be reassigned. Task-level links are also fixed. Topic language and parent links are immutable; topic inserts require same-language parents and reject cycles. This blocks changing a parent later to invalidate previously valid evidence. A level quiz requires all of that level's published lessons. Earlier-level navigation progression remains an application policy to implement in the future backend; it is not falsely presented as a complete SQL navigation authorization system. Practice stays open within the enrolled course.

**Assessment integrity.** Composite FKs enforce attempt/version, question/version and option/question, including multi-row writes. The answer PK prevents conflicting responses. Publication validates a nonempty question bank and exactly one correct option among at least two options per question. Attempts begin InProgress; missing rows are unanswered and `unsure` is explicit. Complete responses are required to submit. Submitted/cancelled attempts and their answers are immutable. Placement is optional, has no pass percentage and can precede enrollment. The Python seed level quizzes use 70%; lesson checks use 100%.

**Version protection.** This implementation is deliberately stricter than the minimum: all published assessment/task versions are frozen, even before attempts. Create a new Draft parent with the same LogicalCode/TaskCode and increment VersionNo, copy/review children with new IDs, then publish. No auto-clone procedure is necessary for integrity. Course rowversion is an optimistic edit token, not full historical curriculum editions. Lessons may still receive text edits; immutable full course editions and certificate policy are deferred.

**Coding lifecycle.** Pending → Running → Completed/Error/Cancelled, or Pending → Cancelled. Snapshots and terminal rows cannot be edited/deleted. Running accepts append-only case results through composite submission/task/test FKs. Completed means successful execution with a failing test, or every defined test passing. RuntimeError/Timeout requires Error (or cancellation), never Completed. An Error can occur before any case runs. NotRun is derived from definitions minus recorded results. Missing results never become failed cases. Passed output must match exactly, including trailing spaces; a future trusted evaluator must also execute task verification assertions inside an isolated runtime. This phase does not provide that runtime.

**Normalization.** Options, resources, objectives, hints, topic junctions and case results are atomic rows (1NF). Junction attributes depend on the entire key (2NF). Account/language/content names and derived totals are not copied into evidence (3NF logical design). Two physical evidence junctions carry a controlled redundant assessment/task context to support declarative composite integrity. This is a deliberate exception to strictly redundancy-free physical 3NF: the extra value cannot diverge because both composite FKs enforce it. Cross-course ownership uses set-based triggers rather than copying CourseId across all descendants. Shared profile/junction PKs do not use IDENTITY; surrogate IDs do. All FKs use NO ACTION; no cascade removal of achievements.

**Concurrency.** Child lifecycle/content writes take `UPDLOCK,HOLDLOCK` on parent version/attempt/submission rows; terminal/publication writes lock those same rows. Multi-row triggers use set membership rather than assigning one arbitrary inserted row to scalar variables. Contending writes can deadlock, causing one transaction to roll back; the future backend should retry safe transactions on 1205. Concurrency smoke tests are separate from the 102 sequential SQL checks; see results for whether run. Privileged DDL/disabled constraints are outside these guarantees.

**Data and trust.** User text is NVARCHAR and dates are UTC `datetime2(3)`. UTC is a caller/storage contract; naive datetime values are not automatically converted. Email has canonical lowercase/trim validation and unique case-insensitive, accent-sensitive comparison; this is a chosen product comparison policy, not a complete RFC email parser. ExternalAuthSubject is a future identity link, with no demo credentials stored. Application-layer identity proof, authenticated ownership, URL validation, code/chat privacy and safe execution remain required before production use. Import origin is retained; browser claims do not become verified achievements. Score-only backups are not imported as invented answer attempts. No migration process was executed.

## Status codes

| Field | Allowed codes |
| --- | --- |
| Users.RoleCode / AccountStatus | Student, Admin / Enabled, Suspended |
| PublicationStatus (curriculum) | Draft, Published, Archived |
| PublicationStatus (versioned assessments/tasks) | Draft, Published; published is immutable |
| ContentReadinessCode | Ready, ComingSoon |
| Assessment Kind | Placement, LevelQuiz, LessonCheck |
| Attempt Status / ResponseKind | InProgress, Submitted, Cancelled / option, unsure |
| ParticipationStatus | Active, Paused, Completed |
| CompletionMethod | manual, correct-answer, imported |
| EvaluationStatus | Pending, Running, Completed, Error, Cancelled |
| ExecutionStatus | Success, RuntimeError, Timeout |
| EvidenceOrigin | server, academic-seed, browser-import |

`server` is a collection-origin marker, not proof of learner mastery or permission to expose it. Production writers must be authenticated and restricted. `academic-seed` explicitly denotes fictional demonstration evidence.

## Future extensions — no tables installed

| Area | Proposed integration point and prerequisite |
| --- | --- |
| AI mentor history | Users plus optional lesson/task context; real model provenance/retention before live AI |
| Student services / peer mentoring | Users/Languages and a separately approved Skills dictionary; publication consent; atomic global slot reservations before real calendars |
| Virtual internship | Separate Projects/Participations/TaskProgress/Deliveries pack, with self-reported states; do not duplicate Python final tasks |
| Public portfolios | Explicitly consented PublicProfiles and owner-controlled PortfolioItems; never auto-publish signup data |
| Certificates | Enrollment and policy-versioned immutable issuance snapshots, verifiable IDs, revocation and trust policy |
| ML models/predictions | Real longitudinal attempts/submissions, defined outcomes, as-of features, leakage-safe evaluation; optional ModelVersions and historical predictions only after real training |

## Rebuild documentation and audit

Authoring scripts use only Node built-ins. `build-seed.cjs` extracts curriculum from reviewed active JavaScript in a restricted VM; it never reads archived SQL. `build-phase3.cjs` combines independent schema rules/seed into the standalone script. `build-verification.cjs` authors the tests. Run the SQL runner after installation, then `node database/tools/build-documentation.cjs`; that final step refuses failed SQL tests and compares live columns/types/IDENTITY/FKs to the independent specification. It embeds the **identical** SQL text into `database-data.js`, the browser documentation's single data source. Recreating an unused database is required for substantive schema changes; never reapply over an existing target.

Microsoft references used in the implementation: [CREATE DATABASE / autocommit](https://learn.microsoft.com/en-us/sql/t-sql/statements/create-database-transact-sql?view=sql-server-ver17), [set-based multi-row triggers](https://learn.microsoft.com/en-us/sql/relational-databases/triggers/create-dml-triggers-to-handle-multiple-rows-of-data?view=sql-server-ver17), [PK/FK constraints](https://learn.microsoft.com/en-us/sql/relational-databases/tables/primary-and-foreign-key-constraints?view=sql-server-ver17), [transaction locking](https://learn.microsoft.com/en-us/sql/relational-databases/sql-server-transaction-locking-and-row-versioning-guide?view=sql-server-ver17).
