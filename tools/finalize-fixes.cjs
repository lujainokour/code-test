const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));
const array=value=>Array.isArray(value)?value:[value];
const primary=array(read('docs/verified-fixes-2026-11-08-harness-results.json'));
const repeated=array(read('docs/workflow-final-2026-11-08-harness-results.json'));
const final=new Map(primary.map(run=>[run.harness,{...run,source:'verified-fixes-2026-11-08-harness-results.json'}]));
for(const run of repeated)final.set(run.harness,{...run,source:'workflow-final-2026-11-08-harness-results.json'});
const suites=[...final.values()];
for(const run of suites)assert(run.done&&run.result.total>0&&run.result.passed===run.result.total,run.harness);
for(const prefix of ['verified-fixes-2026-11-08','workflow-final-2026-11-08']){
 assert.equal(read('docs/'+prefix+'-reference-results.json').missing.length,0);
 assert.equal(read('docs/'+prefix+'-js-errors.json').length,0);
}
const previous=read('docs/fixes-2026-11-08-supplemental.json');
assert(previous.suites.every(run=>run.failed===0&&run.exitCode===0&&run.jsErrors===0&&run.consoleErrors===0&&run.completed>0));
const sql=read('docs/fixes-2026-11-08-sql-results.json'),sqlSummary=sql.verification.resultSets.flat().find(row=>row.TotalChecks);
assert.equal(sqlSummary.FailedChecks,0);assert(sql.academicExamplesPassed);assert.equal(sql.constraintViolations,0);
const design=read('docs/fixes-2026-11-08-design-results.json');assert(design.preserved.every(file=>file.unchanged));assert(design.screenshots.every(shot=>!shot.metrics.overflow));
for(const file of design.preserved){const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file.file))).digest('hex').toUpperCase();assert.equal(hash,file.sha256);}
const refs=read('docs/workflow-final-2026-11-08-reference-results.json');
const report={date:'2026-11-08',status:'LOCAL IMPLEMENTATION VERIFIED; EXTERNAL INTEGRATIONS STILL REQUIRE SERVICES',browser:{suites:suites.length,passed:suites.reduce((sum,run)=>sum+run.result.passed,0),failed:0,sourceRuns:suites.map(run=>({harness:run.harness,checks:run.result.total,source:run.source})),note:'Affected workflow harness was rerun after its expected Premium-block behavior changed from an inline message to a redirect.',pageVisits:refs.pages.length,checkedReferences:refs.checkedReferences,missingReferences:0,uncaughtJavaScriptExceptions:0},additionalBrowserChecks:{suites:previous.suites.length,passed:previous.suites.reduce((sum,run)=>sum+run.passed,0),failed:0},sql:{database:sql.database,passed:sqlSummary.PassedChecks,failed:sqlSummary.FailedChecks,academicExamplesPassed:true,constraintViolations:0},design:{unchanged:design.preserved.map(file=>file.file),screenshots:design.screenshots.length,noHorizontalOverflow:true},curriculum:{levels:6,freeLevels:[1,2,3,4,5],premiumPreviewLevels:[6],lessons:24,codingTasks:12},remaining:['Backend/API and server identity/authorization across devices','Real billing provider and verified payment webhooks','Official Discord invitation','Live AI provider through a backend','Built-in curricula for languages other than Python']};
fs.writeFileSync(path.join(root,'docs/fixes-2026-11-08-final-results.json'),JSON.stringify(report,null,2));
const markdown=path.join(root,'docs/FIXES-2026-11-08.md');
const marker='\n## Final verification totals\n';let text=fs.readFileSync(markdown,'utf8').split(marker)[0];
text+=marker+`\n- Browser: ${report.browser.passed}/${report.browser.passed} checks across ${report.browser.suites} harnesses (including the affected-harness rerun).\n- Additional current PowerShell suites: ${report.additionalBrowserChecks.passed}/${report.additionalBrowserChecks.passed}, ${report.additionalBrowserChecks.suites} suites.\n- References: ${refs.pages.length} page visits, ${refs.checkedReferences} local references, zero missing and zero uncaught JavaScript exceptions.\n- SQL: ${sqlSummary.PassedChecks}/${sqlSummary.PassedChecks}, academic examples passed, zero constraint violations.\n- Design: homepage and both stylesheets remain byte-identical; ${design.screenshots.length} desktop/mobile captures.\n- Machine-readable summary: [final verification](fixes-2026-11-08-final-results.json).\n`;
fs.writeFileSync(markdown,text);console.log(JSON.stringify(report,null,2));
