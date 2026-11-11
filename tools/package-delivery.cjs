/* Build a self-contained local delivery from the verified active source.
   Existing delivery files are backed up; no unrelated files are deleted. */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const root=path.resolve(__dirname,'..'),target=path.join(root,'delivery/CodeMentor-AI');
assert(target.startsWith(root+path.sep+'delivery'+path.sep));
const dirs=['js','css','pages','assets','vendor','database','tests','docs','tools'];
const top=['index.html','dashboard.html','teacher-dashboard.html','company-dashboard.html','README.md'];
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=[...top,...dirs.flatMap(dir=>walk(path.join(root,dir)).map(file=>path.relative(root,file)))];
const reportFile='docs/fixes-2026-11-08-delivery-results.json';
if(!files.some(file=>file.replaceAll('\\','/')===reportFile))files.push(reportFile);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const backup=path.join(root,'.local-backups/delivery-before-fixes-2026-11-08');
const extras=['SOURCES.md','start-server.ps1'].filter(file=>fs.existsSync(path.join(target,file))&&!files.includes(file)).map(file=>({path:file,sha256:hash(path.join(target,file))}));
const report={date:'2026-11-08',target:path.relative(root,target).replaceAll('\\','/'),files:files.length,allFilesByteIdentical:false,preservedDeliveryExtras:extras,repositoryMetadata:'Existing .git directory is preserved in place and excluded from the manifest/archive.',missingHtmlReferences:[],previousDeliveryBackup:path.relative(root,backup).replaceAll('\\','/')};
fs.writeFileSync(path.join(root,reportFile),JSON.stringify(report,null,2));
if(fs.existsSync(target)&&!fs.existsSync(backup))fs.cpSync(target,backup,{recursive:true,errorOnExist:true,force:false});
const allowed=new Set([...files.map(file=>file.replaceAll('\\','/')),...extras.map(file=>file.path),'manifest.json']);
if(fs.existsSync(target))for(const file of walk(target))assert(allowed.has(path.relative(target,file).replaceAll('\\','/')),`Unexpected delivery file was preserved; review before rebuilding: ${file}`);
for(const file of files){const destination=path.join(target,file);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(root,file),destination);}
const missing=[];
for(const file of files.filter(file=>file.endsWith('.html'))){
 const source=fs.readFileSync(path.join(target,file),'utf8');
 for(const match of source.matchAll(/\b(?:href|src|poster|action)\s*=\s*["']([^"']+)["']/gi)){
  const raw=match[1];if(/^(?:[a-z]+:|\/\/|#)/i.test(raw))continue;
  const clean=decodeURIComponent(raw.split(/[?#]/)[0]);if(!clean)continue;
  const destination=path.resolve(clean.startsWith('/')?target:path.dirname(path.join(target,file)),'.'+(clean.startsWith('/')?clean:'/'+clean));
  if(!fs.existsSync(destination))missing.push({file,reference:raw});
 }
}
assert.equal(missing.length,0,JSON.stringify(missing));
for(const file of files)assert.equal(hash(path.join(target,file)),hash(path.join(root,file)),file);
report.allFilesByteIdentical=true;
fs.writeFileSync(path.join(root,reportFile),JSON.stringify(report,null,2));
fs.copyFileSync(path.join(root,reportFile),path.join(target,reportFile));
const manifest=files.map(file=>({path:file.replaceAll('\\','/'),sha256:hash(path.join(root,file))}));
fs.writeFileSync(path.join(target,'manifest.json'),JSON.stringify({date:'2026-11-08',files:manifest,preservedExtras:extras},null,2));
console.log(JSON.stringify(report,null,2));
