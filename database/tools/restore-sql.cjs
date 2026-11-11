/* Recover the verified SQL bytes embedded in the local database atlas.
   File recovery only: this script never connects to SQL Server. */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto'), assert = require('assert');
const root = path.resolve(__dirname, '../..'), context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'docs/database/database-data.js'), 'utf8'), context);
const data = context.window.databaseData;
assert.equal(crypto.createHash('sha256').update(data.sql).digest('hex'), data.sqlSha256, 'Embedded SQL hash does not match its verified manifest');
const strings = text => [...text.matchAll(/N'((?:''|[^'])*)'/g)].map(match => match[1].replaceAll("''", "'"));
const installer = strings(data.sql).find(text => text.startsWith('EXEC sys.sp_executesql'));
assert(installer, 'Missing embedded installation batches');
const batches = strings(installer);
assert(batches[0].startsWith('CREATE TABLE'), 'Unexpected first installation batch');
assert(batches.at(-1).includes('INSERT dbo.Users'), 'Unexpected seed batch');
const outputs = { 'submission.sql': data.sql, 'tools/generated-ddl.sql': batches[0], 'tools/seed.sql': batches.at(-1), 'tools/business-rules.sql': batches.slice(1, -1).join('\nGO\n') + '\n' };
for (const [file, text] of Object.entries(outputs)) {
    const target = path.join(root, 'database', file);
    if (fs.existsSync(target)) { assert.equal(fs.readFileSync(target, 'utf8'), text, `Existing ${file} differs; recovery will not overwrite it`); }
    else fs.writeFileSync(target, text);
}
console.log(JSON.stringify({ restored: Object.keys(outputs), submissionSha256: data.sqlSha256, installationBatches: batches.length, sqlServerExecuted: false }, null, 2));
