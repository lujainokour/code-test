/* Select the NEW Phase 3 test database in SSMS before executing.
   Every test mutation is rolled back. Identity allocations can leave gaps;
   this is normal SQL Server behavior. Row content/count hashes must match. */
SET NOCOUNT ON;
IF DB_NAME() NOT LIKE N'CodeMentorAI_Phase3[_]%' THROW 51800,'Select the approved Phase 3 test database.',1;
IF @@TRANCOUNT<>0 THROW 51801,'Run verification outside an existing transaction.',1;
CREATE TABLE #Cases(Id int IDENTITY PRIMARY KEY,Name nvarchar(200),SqlText nvarchar(max),ExpectedError int NULL);
CREATE TABLE #Results(Id int,Name nvarchar(200),Passed bit,ExpectedError int NULL,ActualError int NULL,Detail nvarchar(4000));
CREATE TABLE #Before(TableName sysname PRIMARY KEY,Digest varbinary(32));
DECLARE @Table sysname,@Sql nvarchar(max);
DECLARE Snap CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM sys.tables WHERE is_ms_shipped=0 ORDER BY name;
OPEN Snap; FETCH NEXT FROM Snap INTO @Table;
WHILE @@FETCH_STATUS=0 BEGIN
 SET @Sql=N'INSERT #Before SELECT N'''+@Table+N''',HASHBYTES(''SHA2_256'',(SELECT * FROM dbo.'+QUOTENAME(@Table)+N' ORDER BY (SELECT NULL) FOR JSON PATH,INCLUDE_NULL_VALUES));';
 EXEC sys.sp_executesql @Sql; FETCH NEXT FROM Snap INTO @Table;
END; CLOSE Snap; DEALLOCATE Snap;
INSERT #Cases(Name,SqlText,ExpectedError) VALUES
(N'Exactly 23 application tables',N'IF NOT ((SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0)=23) THROW 51999, ''Assertion failed: Exactly 23 application tables'',1;',NULL),
(N'23 primary keys',N'IF NOT ((SELECT COUNT(*) FROM sys.key_constraints WHERE type=''PK'')=23) THROW 51999, ''Assertion failed: 23 primary keys'',1;',NULL),
(N'All constraints enabled and trusted',N'IF NOT (NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) AND NOT EXISTS(SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)) THROW 51999, ''Assertion failed: All constraints enabled and trusted'',1;',NULL),
(N'All 20 triggers enabled',N'IF NOT ((SELECT COUNT(*) FROM sys.triggers WHERE parent_class=1)=20 AND NOT EXISTS(SELECT 1 FROM sys.triggers WHERE is_disabled=1)) THROW 51999, ''Assertion failed: All 20 triggers enabled'',1;',NULL),
(N'37 declared foreign keys',N'IF NOT ((SELECT COUNT(*) FROM sys.foreign_keys)=37) THROW 51999, ''Assertion failed: 37 declared foreign keys'',1;',NULL),
(N'Fictional seed has 13 languages',N'IF NOT ((SELECT COUNT(*) FROM dbo.Languages)=13) THROW 51999, ''Assertion failed: Fictional seed has 13 languages'',1;',NULL),
(N'Source seed has 12 lessons',N'IF NOT ((SELECT COUNT(*) FROM dbo.Lessons)=12) THROW 51999, ''Assertion failed: Source seed has 12 lessons'',1;',NULL),
(N'Source seed has six coding tasks',N'IF NOT ((SELECT COUNT(*) FROM dbo.CodingTasks)=6) THROW 51999, ''Assertion failed: Source seed has six coding tasks'',1;',NULL),
(N'Assessment score derived correctly',N'IF NOT ((SELECT ScorePercent FROM dbo.vAssessmentScores WHERE AttemptId=1)=90 AND (SELECT ScorePercent FROM dbo.vAssessmentScores WHERE AttemptId=2)=100) THROW 51999, ''Assertion failed: Assessment score derived correctly'',1;',NULL),
(N'Passed snapshot distinct from execution completion',N'IF NOT ((SELECT CONVERT(int,AllTestsPassed) FROM dbo.vSubmissionOutcomes WHERE SubmissionId=1)=1 AND (SELECT CONVERT(int,AllTestsPassed) FROM dbo.vSubmissionOutcomes WHERE SubmissionId=2)=0) THROW 51999, ''Assertion failed: Passed snapshot distinct from execution completion'',1;',NULL),
(N'Missing results are not failed cases',N'IF NOT ((SELECT NotRunCaseCount FROM dbo.vSubmissionOutcomes WHERE SubmissionId=2)=3 AND (SELECT FailedCaseCount FROM dbo.vSubmissionOutcomes WHERE SubmissionId=2)=1) THROW 51999, ''Assertion failed: Missing results are not failed cases'',1;',NULL),
(N'Timeout represented separately',N'IF NOT (EXISTS(SELECT 1 FROM dbo.CodeSubmissions s JOIN dbo.SubmissionTestResults r ON s.SubmissionId=r.SubmissionId WHERE s.SubmissionId=3 AND s.EvaluationStatus=''Error'' AND r.ExecutionStatus=''Timeout'')) THROW 51999, ''Assertion failed: Timeout represented separately'',1;',NULL),
(N'Scalar function',N'IF NOT (dbo.fnPercentage(3,4)=75) THROW 51999, ''Assertion failed: Scalar function'',1;',NULL),
(N'Zero denominator returns unknown',N'IF NOT (dbo.fnPercentage(0,0) IS NULL) THROW 51999, ''Assertion failed: Zero denominator returns unknown'',1;',NULL),
(N'Inline TVF reports derived summary',N'IF NOT (EXISTS(SELECT 1 FROM dbo.fnStudentCourseSummary(2) WHERE CompletedLessonCount=4 AND LessonCount=12 AND PassedTaskCount=1 AND CompletionPercent=33.33)) THROW 51999, ''Assertion failed: Inline TVF reports derived summary'',1;',NULL),
(N'Administrator cannot have student profile',N'INSERT dbo.StudentProfiles(UserId,PreferredLanguageId,ExperienceCode,LearningGoalCode) VALUES(1,1,''Beginner'',''Foundations'');',51101),
(N'Multi-row profile insert rejects administrator atomically',N'INSERT dbo.Users(Email,FullName,RoleCode) VALUES(N''test-new@example.invalid'',N''New learner'',''Student''); DECLARE @u int=SCOPE_IDENTITY(); INSERT dbo.StudentProfiles(UserId,PreferredLanguageId,ExperienceCode,LearningGoalCode) VALUES(@u,1,''Beginner'',''Foundations''),(1,1,''Beginner'',''Foundations'');',51101),
(N'Student with records cannot change to Admin',N'UPDATE dbo.Users SET RoleCode=''Admin'' WHERE UserId IN(2,3);',51100),
(N'Admin enrollment rejected by student FK',N'INSERT dbo.Enrollments(StudentId,CourseId) VALUES(1,1);',547),
(N'Admin attempt rejected by student FK',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(1,1);',547),
(N'Duplicate enrollment rejected',N'INSERT dbo.Enrollments(StudentId,CourseId) VALUES(2,1);',2627),
(N'Unknown course rejected',N'INSERT dbo.Enrollments(StudentId,CourseId) VALUES(2,999999);',547),
(N'Enrollment owner immutable',N'UPDATE dbo.Enrollments SET CourseId=2 WHERE EnrollmentId=1;',51109),
(N'Level cannot change course',N'UPDATE dbo.Levels SET CourseId=2,SortOrder=9 WHERE LevelId=1;',51103),
(N'Lesson cannot change level',N'UPDATE dbo.Lessons SET LevelId=4,SortOrder=9 WHERE LessonId=1;',51107),
(N'Course language immutable',N'UPDATE dbo.Courses SET LanguageId=2 WHERE CourseId=1;',51102),
(N'Cross-course completion rejected',N'INSERT dbo.Enrollments(StudentId,CourseId,EvidenceOrigin) VALUES(2,2,''academic-seed''); DECLARE @e int=SCOPE_IDENTITY(); INSERT dbo.LessonCompletions(EnrollmentId,LessonId,CompletedAtUtc,CompletionMethod) VALUES(@e,1,SYSUTCDATETIME(),''manual'');',51111),
(N'Cross-course workspace rejected',N'INSERT dbo.Enrollments(StudentId,CourseId,EvidenceOrigin) VALUES(2,2,''academic-seed''); DECLARE @e int=SCOPE_IDENTITY(); INSERT dbo.TaskWorkspaceState(EnrollmentId,TaskId) VALUES(@e,1);',51133),
(N'Cross-course submission rejected',N'INSERT dbo.Enrollments(StudentId,CourseId,EvidenceOrigin) VALUES(2,2,''academic-seed''); DECLARE @e int=SCOPE_IDENTITY(); INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(@e,1,N''code'',N''test'');',51139),
(N'Paused enrollment cannot add learning',N'UPDATE dbo.Enrollments SET ParticipationStatus=''Paused'' WHERE EnrollmentId=1; INSERT dbo.TaskWorkspaceState(EnrollmentId,TaskId) VALUES(1,2);',51133),
(N'Manual completion allowed without correct answer',N'INSERT dbo.LessonCompletions(EnrollmentId,LessonId,CompletedAtUtc,CompletionMethod) VALUES(1,5,SYSUTCDATETIME(),''manual'');',NULL),
(N'Correct-answer completion requires evidence',N'INSERT dbo.LessonCompletions(EnrollmentId,LessonId,CompletedAtUtc,CompletionMethod) VALUES(1,5,SYSUTCDATETIME(),''correct-answer'');',51112),
(N'Completion facts immutable',N'UPDATE dbo.LessonCompletions SET CompletionMethod=''imported'' WHERE EnrollmentId=1 AND LessonId=1;',547),
(N'Imported completion preserves unknown time',N'INSERT dbo.LessonCompletions(EnrollmentId,LessonId,CompletionMethod,EvidenceOrigin,ImportedAtUtc) VALUES(1,5,''imported'',''browser-import'',SYSUTCDATETIME());',NULL),
(N'Import cannot claim correct-answer completion',N'INSERT dbo.LessonCompletions(EnrollmentId,LessonId,CompletedAtUtc,CompletionMethod,EvidenceOrigin,ImportedAtUtc) VALUES(1,5,SYSUTCDATETIME(),''correct-answer'',''browser-import'',SYSUTCDATETIME());',547),
(N'Question from different assessment rejected',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(2,1); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,OptionId,ResponseKind) SELECT @a,q.QuestionId,1,NULL,''unsure'' FROM dbo.Questions q WHERE q.AssessmentId=2 AND q.SortOrder=1;',547),
(N'Spoofed attempt assessment rejected',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(2,1); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,OptionId,ResponseKind) SELECT @a,q.QuestionId,2,NULL,''unsure'' FROM dbo.Questions q WHERE q.AssessmentId=2 AND q.SortOrder=1;',547),
(N'Option from different question rejected',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(2,1); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,OptionId,ResponseKind) SELECT @a,1,1,MIN(OptionId),''option'' FROM dbo.QuestionOptions WHERE QuestionId=2;',547),
(N'Unsure is a real permitted response',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(2,1); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,ResponseKind) VALUES(@a,1,1,''unsure'');',NULL),
(N'Unsure cannot also select an option',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(2,1); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,OptionId,ResponseKind) VALUES(@a,1,1,1,''unsure'');',547),
(N'Duplicate conflicting answers rejected',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(2,1); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,ResponseKind) VALUES(@a,1,1,''unsure''),(@a,1,1,''unsure'');',2627),
(N'Incomplete attempt cannot submit',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(2,1); DECLARE @a int=SCOPE_IDENTITY(); EXEC dbo.uspSubmitAssessment @AttemptId=@a;',51124),
(N'All unsure answers may submit',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(2,1); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,ResponseKind) SELECT @a,QuestionId,1,''unsure'' FROM dbo.Questions WHERE AssessmentId=1; EXEC dbo.uspSubmitAssessment @AttemptId=@a; IF (SELECT ScorePercent FROM dbo.vAssessmentScores WHERE AttemptId=@a)<>0 THROW 51999,''Unsure score wrong'',1;',NULL),
(N'Imported attempt preserves unknown start and submit times',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId,StartedAtUtc,EvidenceOrigin,ImportedAtUtc) VALUES(2,1,NULL,''browser-import'',SYSUTCDATETIME()); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,ResponseKind) SELECT @a,QuestionId,1,''unsure'' FROM dbo.Questions WHERE AssessmentId=1; UPDATE dbo.AssessmentAttempts SET Status=''Submitted'' WHERE AttemptId=@a; IF NOT EXISTS(SELECT 1 FROM dbo.AssessmentAttempts WHERE AttemptId=@a AND StartedAtUtc IS NULL AND SubmittedAtUtc IS NULL) THROW 51999,''Unknown times fabricated'',1;',NULL),
(N'Server attempt cannot omit start time',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId,StartedAtUtc) VALUES(2,1,NULL);',547),
(N'Submitted answer update blocked',N'UPDATE dbo.AttemptAnswers SET ResponseKind=''unsure'',OptionId=NULL WHERE AttemptId=2;',51125),
(N'Submitted answer delete blocked',N'DELETE dbo.AttemptAnswers WHERE AttemptId=2;',51125),
(N'Submitted attempt immutable',N'UPDATE dbo.AssessmentAttempts SET CurrentQuestionNo=1 WHERE AttemptId=2;',51118),
(N'Attempt starts only InProgress',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId,Status,SubmittedAtUtc) VALUES(2,1,''Submitted'',DATEADD(second,1,SYSUTCDATETIME()));',51119),
(N'Level quiz requires completed lessons',N'INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(3,2);',51123),
(N'Placement works before enrollment',N'DELETE dbo.Enrollments WHERE EnrollmentId=2; INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(3,1);',NULL),
(N'Lesson attempt requires active enrollment',N'DELETE dbo.Enrollments WHERE EnrollmentId=2; INSERT dbo.AssessmentAttempts(UserId,AssessmentId) VALUES(3,5);',51122),
(N'Published questions immutable multi-row',N'UPDATE dbo.Questions SET Prompt=N''changed'' WHERE AssessmentId=1;',51115),
(N'Published answer keys immutable multi-row',N'UPDATE dbo.QuestionOptions SET IsCorrect=1-IsCorrect WHERE QuestionId IN(1,2);',51117),
(N'Published options cannot be added',N'INSERT dbo.QuestionOptions(QuestionId,OptionText,IsCorrect,SortOrder) VALUES(1,N''extra'',0,99);',51117),
(N'Published assessment cannot unpublish',N'UPDATE dbo.Assessments SET PublicationStatus=''Draft'' WHERE AssessmentId=1;',51113),
(N'Publication rejects empty assessment',N'INSERT dbo.Assessments(LogicalCode,VersionNo,Kind,ScopeCourseId,Title) VALUES(''test-placement'',1,''Placement'',1,N''test''); DECLARE @a int=SCOPE_IDENTITY(); UPDATE dbo.Assessments SET PublicationStatus=''Published'' WHERE AssessmentId=@a;',51114),
(N'Publication rejects multiple correct options',N'INSERT dbo.Assessments(LogicalCode,VersionNo,Kind,ScopeCourseId,Title) VALUES(''test-placement'',1,''Placement'',1,N''test''); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.Questions(AssessmentId,TopicId,Prompt,SortOrder) VALUES(@a,1,N''Question'',1); DECLARE @q int=SCOPE_IDENTITY(); INSERT dbo.QuestionOptions(QuestionId,OptionText,IsCorrect,SortOrder) VALUES(@q,N''A'',1,1),(@q,N''B'',1,2); UPDATE dbo.Assessments SET PublicationStatus=''Published'' WHERE AssessmentId=@a;',51114),
(N'Publication rejects no correct option',N'INSERT dbo.Assessments(LogicalCode,VersionNo,Kind,ScopeCourseId,Title) VALUES(''test-placement'',1,''Placement'',1,N''test''); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.Questions(AssessmentId,TopicId,Prompt,SortOrder) VALUES(@a,1,N''Question'',1); DECLARE @q int=SCOPE_IDENTITY(); INSERT dbo.QuestionOptions(QuestionId,OptionText,IsCorrect,SortOrder) VALUES(@q,N''A'',0,1),(@q,N''B'',0,2); UPDATE dbo.Assessments SET PublicationStatus=''Published'' WHERE AssessmentId=@a;',51114),
(N'A new valid assessment version may publish',N'INSERT dbo.Assessments(LogicalCode,VersionNo,Kind,ScopeCourseId,Title) VALUES(''test-placement'',1,''Placement'',1,N''test''); DECLARE @a int=SCOPE_IDENTITY(); INSERT dbo.Questions(AssessmentId,TopicId,Prompt,SortOrder) VALUES(@a,1,N''Question'',1); DECLARE @q int=SCOPE_IDENTITY(); INSERT dbo.QuestionOptions(QuestionId,OptionText,IsCorrect,SortOrder) VALUES(@q,N''A'',1,1),(@q,N''B'',0,2); UPDATE dbo.Assessments SET PublicationStatus=''Published'' WHERE AssessmentId=@a;',NULL),
(N'Duplicate logical assessment version rejected',N'INSERT dbo.Assessments(LogicalCode,VersionNo,Kind,ScopeCourseId,Title) VALUES(''python-placement'',1,''Placement'',1,N''test'');',2627),
(N'Assessment requires exactly one correct scope',N'INSERT dbo.Assessments(LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,Title) VALUES(''test-invalid'',1,''Placement'',1,1,N''test'');',547),
(N'Level quiz requires nonnull pass mark',N'INSERT dbo.Assessments(LogicalCode,VersionNo,Kind,ScopeLevelId,Title) VALUES(''test-invalid'',1,''LevelQuiz'',1,N''test'');',547),
(N'Age cannot have a timestamp without an age',N'UPDATE dbo.Users SET AgeRecordedAtUtc=SYSUTCDATETIME() WHERE UserId=3;',547),
(N'Published tasks immutable',N'UPDATE dbo.CodingTasks SET ReferenceSolution=N''changed'' WHERE TaskId IN(1,2);',51126),
(N'Published test cases immutable multi-row',N'UPDATE dbo.TaskTestCases SET ExpectedOutput=N''changed'' WHERE TaskId IN(1,2);',51129),
(N'Published test case cannot be deleted',N'DELETE dbo.TaskTestCases WHERE TaskId=6;',51129),
(N'Published hints immutable',N'UPDATE dbo.TaskHints SET HintText=N''changed'' WHERE TaskId=1;',51130),
(N'Published task concept links immutable',N'DELETE dbo.CodingTaskTopics WHERE TaskId=1;',51131),
(N'Workspace draft may change independently',N'UPDATE dbo.TaskWorkspaceState SET DraftCode=N''new draft'',DraftUpdatedAtUtc=SYSUTCDATETIME() WHERE EnrollmentId=1 AND TaskId=1; IF (SELECT CodeText FROM dbo.CodeSubmissions WHERE SubmissionId=1)=N''new draft'' THROW 51999,''Snapshot changed'',1;',NULL),
(N'Hint count bounded by definitions',N'UPDATE dbo.TaskWorkspaceState SET HintsRevealedCount=99 WHERE EnrollmentId=1 AND TaskId=1;',51134),
(N'Solution gate requires attempted state',N'UPDATE dbo.TaskWorkspaceState SET HasAttempted=0,SolutionViewed=1 WHERE EnrollmentId=1 AND TaskId=1;',547),
(N'Submission procedure queues snapshot',N'EXEC dbo.uspQueueCodeSubmission @EnrollmentId=1,@TaskId=1,@CodeText=N''code'',@ExecutionEnvironment=N''test'';',NULL),
(N'Enrollment procedure creates explicit participation',N'UPDATE dbo.Courses SET PublicationStatus=''Published'' WHERE CourseId=2; EXEC dbo.uspEnrollStudent @StudentId=3,@CourseId=2;',NULL),
(N'Enrollment procedure rejects duplicate',N'EXEC dbo.uspEnrollStudent @StudentId=2,@CourseId=1;',51202),
(N'Submission cannot skip Running',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Completed'',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId=@s;',51138),
(N'Submitted code immutable before evaluation',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET CodeText=N''changed'' WHERE SubmissionId=@s;',51137),
(N'Submitted code trailing spaces protected',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET CodeText=CodeText+N'' '' WHERE SubmissionId=@s;',51137),
(N'Imported submission preserves unknown occurrence times',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,SubmittedAtUtc,ExecutionEnvironment,EvidenceOrigin,ImportedAtUtc) VALUES(1,2,N''legacy code'',NULL,N''Browser import'',''browser-import'',SYSUTCDATETIME()); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Error'',EvaluationError=N''Original error with unknown time'' WHERE SubmissionId=@s; IF NOT EXISTS(SELECT 1 FROM dbo.CodeSubmissions WHERE SubmissionId=@s AND SubmittedAtUtc IS NULL AND FinishedAtUtc IS NULL) THROW 51999,''Unknown times fabricated'',1;',NULL),
(N'Server submission cannot omit occurrence time',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,SubmittedAtUtc,ExecutionEnvironment) VALUES(1,2,N''code'',NULL,N''test'');',547),
(N'Pending submission can cancel',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Cancelled'',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId=@s;',NULL),
(N'Terminal submission immutable',N'UPDATE dbo.CodeSubmissions SET CodeText=N''changed'' WHERE SubmissionId=1;',51135),
(N'No-results evaluation cannot complete',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Completed'',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId=@s;',51140),
(N'Terminal status requires finished timestamp',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Completed'' WHERE SubmissionId=@s;',547),
(N'Wrong task test cannot attach to submission',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ExecutionStatus) SELECT @s,TestCaseId,2,0,N''wrong'',''Success'' FROM dbo.TaskTestCases WHERE TaskId=1;',547),
(N'Spoofed result task rejected',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ExecutionStatus) SELECT @s,TestCaseId,1,0,N''wrong'',''Success'' FROM dbo.TaskTestCases WHERE TaskId=1;',547),
(N'Pending cannot receive case results',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ExecutionStatus) SELECT @s,TestCaseId,TaskId,0,N''wrong'',''Success'' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;',51142),
(N'Wrong output cannot be marked passed',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ExecutionStatus) SELECT @s,TestCaseId,TaskId,1,N''wrong'',''Success'' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;',51143),
(N'Partial passing tests cannot imply completion',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ExecutionStatus) SELECT @s,TestCaseId,TaskId,1,ExpectedOutput,''Success'' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1; UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Completed'',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId=@s;',51140),
(N'All executed tests may complete as passed',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ExecutionStatus) SELECT @s,TestCaseId,TaskId,1,ExpectedOutput,''Success'' FROM dbo.TaskTestCases WHERE TaskId=2; UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Completed'',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId=@s; IF NOT EXISTS(SELECT 1 FROM dbo.vSubmissionOutcomes WHERE SubmissionId=@s AND AllTestsPassed=1) THROW 51999,''Pass query failed'',1;',NULL),
(N'First failed test can complete execution',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ExecutionStatus) SELECT @s,TestCaseId,TaskId,0,N''wrong'',''Success'' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1; UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Completed'',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId=@s; IF NOT EXISTS(SELECT 1 FROM dbo.vSubmissionOutcomes WHERE SubmissionId=@s AND AllTestsPassed=0 AND NotRunCaseCount=3) THROW 51999,''Not-run semantics failed'',1;',NULL),
(N'Runtime error cannot be Completed',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,ExecutionStatus) SELECT @s,TestCaseId,TaskId,0,N'''',N''Error'',''RuntimeError'' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1; UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Completed'',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId=@s;',51140),
(N'Runtime error may finalize Error',N'INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment) VALUES(1,2,N''print(1)'',N''test''); DECLARE @s int=SCOPE_IDENTITY(); UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Running'' WHERE SubmissionId=@s; UPDATE dbo.CodeSubmissions SET EvaluationStatus=''Error'',FinishedAtUtc=SYSUTCDATETIME(),EvaluationError=N''Runtime unavailable'' WHERE SubmissionId=@s;',NULL),
(N'Case results cannot be altered',N'UPDATE dbo.SubmissionTestResults SET ActualOutput=N''changed'' WHERE SubmissionId=1;',51141),
(N'Multi-row completions accepted for matching course',N'INSERT dbo.LessonCompletions(EnrollmentId,LessonId,CompletedAtUtc,CompletionMethod) VALUES(1,5,SYSUTCDATETIME(),''manual''),(1,6,SYSUTCDATETIME(),''manual'');',NULL),
(N'Multi-row invalid workspace batch rejected',N'INSERT dbo.Enrollments(StudentId,CourseId,EvidenceOrigin) VALUES(2,2,''academic-seed''); DECLARE @e int=SCOPE_IDENTITY(); INSERT dbo.TaskWorkspaceState(EnrollmentId,TaskId) VALUES(1,2),(@e,3);',51133),
(N'INNER JOIN example',N'IF NOT ((SELECT COUNT(*) FROM dbo.Users u INNER JOIN dbo.Enrollments e ON e.StudentId=u.UserId)=2) THROW 51999, ''Assertion failed: INNER JOIN example'',1;',NULL),
(N'LEFT JOIN example',N'IF NOT ((SELECT COUNT(*) FROM dbo.Users u LEFT JOIN dbo.Enrollments e ON e.StudentId=u.UserId)=3) THROW 51999, ''Assertion failed: LEFT JOIN example'',1;',NULL),
(N'RIGHT JOIN example',N'IF NOT ((SELECT COUNT(*) FROM dbo.Users u RIGHT JOIN dbo.Enrollments e ON e.StudentId=u.UserId)=2) THROW 51999, ''Assertion failed: RIGHT JOIN example'',1;',NULL),
(N'FULL OUTER JOIN example',N'IF NOT ((SELECT COUNT(*) FROM dbo.Users u FULL OUTER JOIN dbo.Enrollments e ON e.StudentId=u.UserId)=3) THROW 51999, ''Assertion failed: FULL OUTER JOIN example'',1;',NULL),
(N'GROUP BY HAVING with subquery',N'IF NOT ((SELECT COUNT(*) FROM (SELECT StudentId FROM dbo.Enrollments GROUP BY StudentId HAVING COUNT(*)>0)q)=2) THROW 51999, ''Assertion failed: GROUP BY HAVING with subquery'',1;',NULL),
(N'All required aggregate functions',N'IF NOT ((SELECT COUNT(*) FROM dbo.vAssessmentScores)=2 AND (SELECT SUM(CorrectCount) FROM dbo.vAssessmentScores)=13 AND (SELECT AVG(ScorePercent) FROM dbo.vAssessmentScores)=95 AND (SELECT MIN(ScorePercent) FROM dbo.vAssessmentScores)=90 AND (SELECT MAX(ScorePercent) FROM dbo.vAssessmentScores)=100) THROW 51999, ''Assertion failed: All required aggregate functions'',1;',NULL);
DECLARE @Id int,@Name nvarchar(200),@Expected int,@Actual int,@Detail nvarchar(4000);
DECLARE Tests CURSOR LOCAL FAST_FORWARD FOR SELECT Id,Name,SqlText,ExpectedError FROM #Cases ORDER BY Id;
OPEN Tests; FETCH NEXT FROM Tests INTO @Id,@Name,@Sql,@Expected;
WHILE @@FETCH_STATUS=0 BEGIN
 SET @Actual=NULL; SET @Detail=N'OK';
 BEGIN TRY
  SET XACT_ABORT ON; BEGIN TRANSACTION;
  EXEC sys.sp_executesql @Sql;
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 END TRY BEGIN CATCH
  SET @Actual=ERROR_NUMBER(); SET @Detail=ERROR_MESSAGE();
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 END CATCH;
 INSERT #Results VALUES(@Id,@Name,CASE WHEN @Expected=@Actual OR (@Expected IS NULL AND @Actual IS NULL) THEN 1 ELSE 0 END,@Expected,@Actual,@Detail);
 FETCH NEXT FROM Tests INTO @Id,@Name,@Sql,@Expected;
END; CLOSE Tests; DEALLOCATE Tests;
DECLARE SnapAfter CURSOR LOCAL FAST_FORWARD FOR SELECT name FROM sys.tables WHERE is_ms_shipped=0 ORDER BY name;
OPEN SnapAfter; FETCH NEXT FROM SnapAfter INTO @Table;
WHILE @@FETCH_STATUS=0 BEGIN
 SET @Sql=N'IF (SELECT Digest FROM #Before WHERE TableName=N'''+@Table+N''')<>HASHBYTES(''SHA2_256'',(SELECT * FROM dbo.'+QUOTENAME(@Table)+N' ORDER BY (SELECT NULL) FOR JSON PATH,INCLUDE_NULL_VALUES)) THROW 51802,''Verification changed seed rows'',1;';
 EXEC sys.sp_executesql @Sql; FETCH NEXT FROM SnapAfter INTO @Table;
END; CLOSE SnapAfter; DEALLOCATE SnapAfter;
SELECT Id,Name,Passed,ExpectedError,ActualError,Detail FROM #Results ORDER BY Id;
SELECT COUNT(*) TotalChecks,SUM(CONVERT(int,Passed)) PassedChecks,SUM(CASE WHEN Passed=0 THEN 1 ELSE 0 END) FailedChecks,N'All 23 table row hashes preserved; identity gaps expected' AS Preservation FROM #Results;
IF EXISTS(SELECT 1 FROM #Results WHERE Passed=0) THROW 51803,'Verification failed; inspect result rows.',1;
