const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'../..'),db=path.join(root,'database');
const read=p=>JSON.parse(fs.readFileSync(path.join(db,p),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const baseline=read('reports/preservation-baseline.json');
const changes=[];for(const f of baseline.files){const p=path.join(root,f.path);if(!fs.existsSync(p)||hash(p)!==f.sha256)changes.push(f.path)}
const frontend=baseline.files.filter(f=>/^(pages\/|js\/|css\/|index\.html$)/.test(f.path));
const archive=baseline.files.filter(f=>f.path.startsWith('.local-backups/sql-phase1-2026-11-04/')||f.path==='CodeMentor-AI-Claude.zip');
const preservation={status:changes.length?'FAIL':'PASS',baselineFilesChecked:baseline.files.length,changedOrMissing:changes,frontendFilesChecked:frontend.length,phase1ArchiveAndVerifiedZipFilesChecked:archive.length,scope:baseline.excluded};
fs.writeFileSync(path.join(db,'reports/preservation-verification.json'),JSON.stringify(preservation,null,2));
assert.equal(changes.length,0,'Preexisting files must remain unchanged');
const sqlTests=read('reports/sql-verification.json'),summary=sqlTests.resultSets.flat().find(x=>x.TotalChecks),safety=read('reports/safety-concurrency.json'),dom=read('reports/documentation-tests.json'),consistency=read('reports/documentation-consistency.json');
assert.equal(summary.FailedChecks,0);assert.equal(safety.failed,0);assert.equal(dom.failed,0);
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'docs/database/database-data.js'),'utf8'),ctx);const d=ctx.window.databaseData;
assert.equal(hash(path.join(db,'submission.sql')),d.sqlSha256);assert.equal(d.sql,fs.readFileSync(path.join(db,'submission.sql'),'utf8'));assert.equal(d.databaseName,sqlTests.database);assert.equal(d.databaseName,safety.testAfter.database);
const result={status:'SQL VERIFIED; DOCUMENTATION DOM VERIFIED; REAL BROWSER QA BLOCKED',counts:d.counts,databaseName:d.databaseName,serverVersion:d.serverVersion,realSqlServerExecutionVerified:true,transactionalSqlChecks:{passed:summary.PassedChecks,failed:summary.FailedChecks},additionalSqlChecks:{passed:safety.passed,failed:safety.failed},totalSqlChecks:{passed:summary.PassedChecks+safety.passed,failed:summary.FailedChecks+safety.failed},documentationDomChecks:{passed:dom.passed,failed:dom.failed},realBrowserVerified:false,browserBlocker:dom.browserBlocker,preservation,submissionSha256:d.sqlSha256,documentationFiles:fs.readdirSync(path.join(root,'docs/database')),retainedTestDatabases:['CodeMentorAI_Phase3_Test_20261105','CodeMentorAI_Phase3_Test_20261105_R2',d.databaseName],limitations:['Real browser rendering, clipboard/download permissions, responsive visual layout and screen-reader behavior remain unverified.','Only SQL Server 2025 was executed; SQL Server 2019+ compatibility is a documented target, not separately tested.','The existing application remains browser-local; no backend authentication/authorization or server Python evaluator was implemented.','Seed learner outcomes are fictional SQL fixtures, not real Python runs or imported achievements.','Two composite evidence junctions deliberately carry constrained redundant version context; physical schema is not claimed to be strictly redundancy-free 3NF.','Earlier-level navigation authorization, full course-edition snapshots and all optional features remain separate backend/product scope.','Normal IDENTITY gaps can result from rollback tests. Earlier test databases were retained without cleanup.','Original-database hashes cover the final safety/concurrency run; no writes were issued to the original database during this task.']};
fs.writeFileSync(path.join(db,'reports/final-verification.json'),JSON.stringify(result,null,2));
const c=d.counts;
fs.writeFileSync(path.join(db,'FINAL-VERIFICATION.md'),`# Phase 3 final verification — November 5, 2026 (Asia/Amman)

**SQL implementation verified. Documentation passes static/DOM checks; real browser QA is blocked and the complete visual acceptance is not claimed.**

| Required metric | Actual result |
| --- | ---: |
| Implemented application tables | ${c.tables} |
| Columns | ${c.columns} |
| Primary keys | ${c.primaryKeys} |
| Foreign keys | ${c.foreignKeys} |
| Diagram relationships | ${c.relationships} (each composite FK counts once) |
| Views | ${c.views} |
| Functions | ${c.functions} (one scalar, one inline TVF) |
| Stored procedures | ${c.procedures} |
| Triggers | ${c.triggers} |
| Indexes | ${c.indexes} (23 clustered PK + 20 UQ + 23 extra nonclustered) |
| Transactional SQL tests | ${summary.PassedChecks} passed, ${summary.FailedChecks} failed |
| Additional SQL checks | ${safety.passed} passed, ${safety.failed} failed |
| Combined final SQL checks | ${result.totalSqlChecks.passed} passed, ${result.totalSqlChecks.failed} failed |
| Documentation static/DOM tests | ${dom.passed} passed, ${dom.failed} failed |
| Real SQL Server execution | **Verified**, SQL Server ${d.serverVersion} |
| Real browser rendering / accessibility | **Not verified** |

The final database is **${d.databaseName}**. The original **CodeMentorAI_Learning** was not written to. Read-only schema/module and table-data hashes matched before/after the final safety run, including academic examples, original/existing-target rejection, three two-session locking tests and DBCC CHECKCONSTRAINTS. The ${summary.TotalChecks} transactional tests preserve hashes of all 23 seed tables. Earlier test databases are retained: CodeMentorAI_Phase3_Test_20261105 and CodeMentorAI_Phase3_Test_20261105_R2. No DROP DATABASE/TABLE/TRUNCATE touched an application database; DROP/TRUNCATE examples use only #LanguagePractice in the testing session.

## Evidence and test meaning

- [SQL test rows](reports/sql-verification.json): each named check, exact expected/actual error numbers and final summary. An early R2 test fixture initially hit a uniqueness constraint before the intended trigger; that fixture was corrected and all final R3 tests pass. No failed test is represented as a pass.
- [Safety/concurrency checks](reports/safety-concurrency.json): database locks block concurrent writes until parent locks release; the write then receives its expected integrity error. It also executes all academic SQL examples and checks DBCC constraints without violations.
- [Live catalog metadata](reports/schema-metadata.json): exported from the final database and compared against the independent schema specification before generating documentation.
- [Documentation tests](reports/documentation-tests.json): tabs, selection/dimming, key navigation, search, filters, SVG table overlap/column endpoints, exact SQL copy/download bytes, all 23 tables and 37 foreign keys. These run in LinkeDOM and do not test a real layout engine.
- [Documentation consistency](reports/documentation-consistency.json): table/column/type/nullability/IDENTITY/FK mappings and script SHA-256.
- [Preservation checks](reports/preservation-verification.json): ${baseline.files.length} preexisting files hashed; ${frontend.length} frontend files and ${archive.length} Phase 1 archive/verified-ZIP files covered; **zero changes or missing files**. The four previously inaccessible tmp/proposal library directories remain outside hash coverage.

The browser host was unavailable. A native Chrome attempt was stopped by the computer-use tool because it could not determine the current Windows browser URL confidently enough to enforce policy. No bypass was attempted. Real rendering at desktop/mobile widths, system-dark visuals, actual clipboard/download behavior and assistive-technology behavior remain pending. Open docs/database/database.html to perform those acceptance checks.

## Submission paths

All paths below are relative to C:/Users/user/Desktop/CodeMentor-AI/:

- database/submission.sql — complete standalone SSMS script; SQLCMD mode not required.
- database/verification.sql — separate SQL test suite; select the new test database first.
- database/academic-examples.sql — SQL curriculum examples and isolated disposable DDL.
- database/README.md — execution, permissions, statuses, integrity/versioning, normalization tradeoffs, future integrations.
- database/ARABIC-STUDY-GUIDE.md — purpose/need/PK/FK/relationships of all 23 tables; SQL examples and interview questions.
- database/schema-authoring.json and database/reports/schema-metadata.json — schema references.
- database/reports/final-verification.json and database/FINAL-VERIFICATION.md — final machine-readable and human reports.
- docs/database/database.html, database.css, database.js, database-data.js — **exactly four** buildless documentation files.

The SQL embedded in the documentation is byte-identical to submission.sql. SHA-256: ${d.sqlSha256}.

## Remaining limitations

${result.limitations.map(x=>'- '+x).join('\n')}

No optional services, scheduling, portfolios, internship, chat, certificate, telemetry or ML tables were added. Those extension boundaries are documented in README and the Rules tab.
`);
console.log(JSON.stringify({sql:result.totalSqlChecks,documentation:result.documentationDomChecks,preservation:{checked:baseline.files.length,changed:changes.length},status:result.status},null,2));
