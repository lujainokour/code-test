const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
const context={window:{cmStorage:{getItem:()=>null}},URLSearchParams,location:{search:'',pathname:'/seed'},document:{},Object,Map,console};
context.window.location=context.location;vm.createContext(context);
const inputs=['js/language-catalog.js','js/python-lessons.js','js/python-curriculum.js','js/placement-data.js','js/learning-support.js','js/workspace.js'];
for(const f of inputs){let s=fs.readFileSync(path.join(root,f),'utf8');if(f==='js/workspace.js')s=s.slice(0,s.indexOf('const taskId ='))+'})();';vm.runInContext(s,context,{timeout:2000,filename:f});}
const w=context.window;
const n=s=>s==null?'NULL':"N'"+String(s).replaceAll("'","''")+"'";
let sql=`/* Fictional academic seed. Source curriculum, no browser backup imported.
   Evaluation rows below are illustrative SQL fixtures, not Python runs. */\n`;
function insert(table,rows){if(!rows.length)return;const cols=Object.keys(rows[0]);sql+=`INSERT dbo.${table} (${cols.join(',')}) VALUES\n`+rows.map(row=>'('+cols.map(c=>row[c]===null?'NULL':typeof row[c]==='number'?row[c]:n(row[c])).join(',')+')').join(',\n')+';\n';}
insert('Users',[{Email:'seed-admin@example.invalid',FullName:'Academic administrator (fictional)',RoleCode:'Admin'},{Email:'seed-student@example.invalid',FullName:'Academic learner (fictional)',RoleCode:'Student'},{Email:'seed-learner2@example.invalid',FullName:'Second learner (fictional)',RoleCode:'Student'}]);
insert('Languages',w.languageCatalog.entries.map(x=>({Slug:x.id,Name:x.name,Description:x.description,ContentReadinessCode:x.builtInContent?'Ready':'ComingSoon'})));
insert('StudentProfiles',[{UserId:2,PreferredLanguageId:1,ExperienceCode:'Beginner',LearningGoalCode:'Foundations'},{UserId:3,PreferredLanguageId:1,ExperienceCode:'SomeExperience',LearningGoalCode:'Projects'}]);
insert('Courses',[{LanguageId:1,Slug:'python-core',Title:'Python learning path',Description:'Three assessed levels from the active application.',PublicationStatus:'Published',CreatedByUserId:1},{LanguageId:2,Slug:'csharp-boundary-fixture',Title:'C# integrity fixture',Description:'Draft only; not an implemented assessed curriculum.',PublicationStatus:'Draft',CreatedByUserId:1}]);
const levels=w.pythonCurriculum.levels;
insert('Levels',levels.map((l,i)=>({CourseId:1,Title:l.title,Description:l.title,SortOrder:i+1,PublicationStatus:'Published'})).concat([{CourseId:2,Title:'Unrelated course fixture',Description:'For cross-course rejection checks only.',SortOrder:1,PublicationStatus:'Draft'}]));
insert('LevelObjectives',levels.flatMap(l=>l.lessons.map((x,i)=>({LevelId:l.id,ObjectiveNo:i+1,ObjectiveText:x.conceptTitle}))));
const lessons=levels.flatMap(l=>l.lessons.map((x,i)=>({...x,level:l.id,order:i+1})));
const topicMap=Object.fromEntries(lessons.map((l,i)=>[l.id,i+1]));
insert('Topics',lessons.map(l=>({LanguageId:1,Code:l.id,Name:l.title})));
insert('Lessons',lessons.map(l=>({LevelId:l.level,TopicId:topicMap[l.id],Slug:l.id,Title:l.title,Summary:l.intro,Body:l.paragraphs.join('\n\n'),ExampleCode:l.code,PreparedOutput:l.output,EstimatedMinutes:l.minutes,SortOrder:l.order,PublicationStatus:'Published'})));
insert('LessonResources',lessons.flatMap((l,i)=>(w.pythonLessonSources[l.id]||[]).map((r,j)=>({LessonId:i+1,Title:r.title,Url:r.url,ResourceType:r.type,ResourceLanguage:r.language,SortOrder:j+1}))));
let questions=[],options=[],assessmentId=0,questionId=0;
const placementTopic=['variables','variables','numbers','input-output','conditions','boolean-logic','for-loops','for-loops','functions','problem-solving'];
function assessment(code,kind,scope,qs,topics){const aid=++assessmentId;insert('Assessments',[{LogicalCode:code,VersionNo:1,Kind:kind,ScopeCourseId:kind==='Placement'?scope:null,ScopeLevelId:kind==='LevelQuiz'?scope:null,ScopeLessonId:kind==='LessonCheck'?scope:null,Title:code,PassPercent:kind==='Placement'?null:kind==='LevelQuiz'?70:100}]);qs.forEach((q,i)=>{const qid=++questionId;questions.push({QuestionId:qid,AssessmentId:aid,TopicId:topicMap[topics[i]],Prompt:q.question||q.title,CodeSnippet:q.code||null,Explanation:q.explanation||null,SortOrder:i+1});q.options.forEach((o,j)=>options.push({QuestionId:qid,OptionText:o,IsCorrect:j===q.correct?1:0,SortOrder:j+1}));});}
assessment('python-placement','Placement',1,w.placementQuestions,placementTopic);
for(const l of levels)assessment('python-level-'+l.id,'LevelQuiz',l.id,l.quiz,l.lessons.map(x=>x.id));
lessons.forEach((l,i)=>assessment('lesson-'+l.id,'LessonCheck',i+1,[l],[l.id]));
// Question identities are deterministic because this database starts empty.
insert('Questions',questions.map(({QuestionId,...q})=>q));insert('QuestionOptions',options);
sql+="UPDATE dbo.Assessments SET PublicationStatus='Published';\n";
insert('Enrollments',[{StudentId:2,CourseId:1,EvidenceOrigin:'academic-seed'},{StudentId:3,CourseId:1,EvidenceOrigin:'academic-seed'}]);
insert('LessonCompletions',[1,2,3,4].map(id=>({EnrollmentId:1,LessonId:id,CompletedAtUtc:'2026-11-05T08:00:00.000',CompletionMethod:'manual',EvidenceOrigin:'academic-seed'})));
insert('AssessmentAttempts',[{UserId:2,AssessmentId:1,EvidenceOrigin:'academic-seed'},{UserId:2,AssessmentId:2,EvidenceOrigin:'academic-seed'}]);
sql+=`INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,OptionId,ResponseKind,AnsweredAtUtc)
 SELECT a.AttemptId,q.QuestionId,a.AssessmentId,CASE WHEN a.AttemptId=1 AND q.SortOrder=10 THEN NULL ELSE o.OptionId END,CASE WHEN a.AttemptId=1 AND q.SortOrder=10 THEN 'unsure' ELSE 'option' END,SYSUTCDATETIME()
 FROM dbo.AssessmentAttempts a JOIN dbo.Questions q ON q.AssessmentId=a.AssessmentId JOIN dbo.QuestionOptions o ON o.QuestionId=q.QuestionId AND o.IsCorrect=1;
UPDATE dbo.AssessmentAttempts SET Status='Submitted',SubmittedAtUtc=SYSUTCDATETIME();\n`;
const tasks=w.pythonWorkspaceTasks;
const taskEntries=Object.entries(tasks);
insert('CodingTasks',taskEntries.map(([code,x],i)=>{const guide=w.learningSupport.tasks[code];return {LevelId:levels.find(l=>l.tasks.includes(code)).id,TaskCode:code,VersionNo:1,TaskKind:code==='task-manager'?'FinalProject':'Exercise',Title:x.title,Description:x.description,RequirementsText:x.requirements.map((s,j)=>`${j+1}. ${s}`).join('\n'),StarterCode:x.starter,SampleInput:x.input,SampleOutput:x.output,ReferenceSolution:guide.solution,SolutionExplanation:guide.explanation,VerificationCode:x.verify||null,SortOrder:i%2+1}}));
insert('CodingTaskTopics',taskEntries.flatMap(([code],i)=>w.learningSupport.tasks[code].topics.map(topic=>({TaskId:i+1,TopicId:topicMap[topic]}))));
insert('TaskTestCases',taskEntries.flatMap(([code,x],i)=>x.tests.map((tc,j)=>({TaskId:i+1,CaseNo:j+1,InputText:tc.input,ExpectedOutput:tc.output,IsPublic:1}))));
insert('TaskHints',taskEntries.flatMap(([code],i)=>w.learningSupport.tasks[code].hints.map((text,j)=>({TaskId:i+1,HintNo:j+1,HintText:text}))));
sql+="UPDATE dbo.CodingTasks SET PublicationStatus='Published';\n";
insert('TaskWorkspaceState',[{EnrollmentId:1,TaskId:1,DraftCode:'# Mutable academic draft',DraftInput:'',HasAttempted:1,HintsRevealedCount:1,SolutionViewed:0}]);
insert('CodeSubmissions',[
 {EnrollmentId:1,TaskId:1,CodeText:w.learningSupport.tasks['student-profile'].solution,ExecutionEnvironment:'Academic SQL fixture',RuntimeVersion:null,EvaluatorVersion:'fixture-v1',EvidenceOrigin:'academic-seed'},
 {EnrollmentId:1,TaskId:2,CodeText:'print("wrong")',ExecutionEnvironment:'Academic SQL fixture',RuntimeVersion:null,EvaluatorVersion:'fixture-v1',EvidenceOrigin:'academic-seed'},
 {EnrollmentId:1,TaskId:2,CodeText:'while True: pass',ExecutionEnvironment:'Academic SQL fixture',RuntimeVersion:null,EvaluatorVersion:'fixture-v1',EvidenceOrigin:'academic-seed'}]);
sql+="UPDATE dbo.CodeSubmissions SET EvaluationStatus='Running';\n";
sql+=`INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 1,TestCaseId,TaskId,1,ExpectedOutput,NULL,NULL,'Success' FROM dbo.TaskTestCases WHERE TaskId=1;
INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 2,TestCaseId,TaskId,0,N'wrong',NULL,NULL,'Success' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;
INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 3,TestCaseId,TaskId,0,N'',N'Illustrative timeout; Python was not executed.',NULL,'Timeout' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;
UPDATE dbo.CodeSubmissions SET EvaluationStatus='Completed',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId IN(1,2);
UPDATE dbo.CodeSubmissions SET EvaluationStatus='Error',FinishedAtUtc=SYSUTCDATETIME(),EvaluationError=N'Illustrative timeout' WHERE SubmissionId=3;\n`;
fs.writeFileSync(path.join(__dirname,'seed.sql'),sql);
fs.writeFileSync(path.join(root,'database/reports/seed-sources.json'),JSON.stringify({notice:'Content extracted from active source; learner records are explicitly fictional academic fixtures.',files:inputs.map(f=>({path:f,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')}))},null,2));
console.log({lessons:lessons.length,assessments:assessmentId,questions:questions.length,tasks:taskEntries.length});
