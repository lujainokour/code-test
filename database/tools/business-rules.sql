
/* Each GO-delimited batch is embedded in submission.sql by build-phase3.cjs.
   Triggers are set based. UPDLOCK,HOLDLOCK serialize child writes with parent
   finalization/publication. Direct privileged DDL/disabled triggers are outside
   the threat model; runtime principals must never own the schema. */
CREATE TRIGGER dbo.TR_Users_StudentRole ON dbo.Users AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.StudentProfiles p WITH(UPDLOCK,HOLDLOCK) ON p.UserId=i.UserId WHERE i.RoleCode<>'Student')
 THROW 51100,'A student-profile owner cannot become an administrator.',1;
END;

GO

CREATE TRIGGER dbo.TR_StudentProfiles_Role ON dbo.StudentProfiles AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Users u WITH(UPDLOCK,HOLDLOCK) ON u.UserId=i.UserId WHERE u.RoleCode<>'Student')
 THROW 51101,'StudentProfiles requires the Student role.',1;
END;

GO

CREATE TRIGGER dbo.TR_Courses_Structure ON dbo.Courses AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.CourseId=d.CourseId WHERE i.LanguageId<>d.LanguageId)
 THROW 51102,'Course language is immutable; create a new course.',1;
END;

GO

CREATE TRIGGER dbo.TR_Levels_Structure ON dbo.Levels AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.LevelId=d.LevelId WHERE i.CourseId<>d.CourseId)
 THROW 51103,'A level cannot be moved to another course.',1;
END;

GO

CREATE TRIGGER dbo.TR_Topics_Structure ON dbo.Topics AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.TopicId=d.TopicId WHERE i.LanguageId<>d.LanguageId OR ISNULL(i.ParentTopicId,0)<>ISNULL(d.ParentTopicId,0))
 THROW 51104,'Topic language/parent links are immutable; create a new topic.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Topics p WITH(UPDLOCK,HOLDLOCK) ON p.TopicId=i.ParentTopicId WHERE p.LanguageId<>i.LanguageId)
 THROW 51105,'A topic parent must use the same language.',1;
 ;WITH ancestors AS (
 SELECT i.TopicId AS StartId,i.ParentTopicId,1 AS Depth FROM inserted i WHERE i.ParentTopicId IS NOT NULL
 UNION ALL SELECT a.StartId,p.ParentTopicId,a.Depth+1 FROM ancestors a JOIN dbo.Topics p ON p.TopicId=a.ParentTopicId WHERE a.Depth<100 AND a.ParentTopicId<>a.StartId
 )
 SELECT StartId INTO #cycles FROM ancestors WHERE StartId=ParentTopicId OR Depth=100 OPTION(MAXRECURSION 100);
 IF EXISTS(SELECT 1 FROM #cycles) THROW 51106,'Topic hierarchy must be acyclic and shorter than 100 links.',1;
END;

GO

CREATE TRIGGER dbo.TR_Lessons_Structure ON dbo.Lessons AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.LessonId=d.LessonId WHERE i.LevelId<>d.LevelId OR i.TopicId<>d.TopicId)
 THROW 51107,'Lesson level/topic links are immutable.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Levels l ON l.LevelId=i.LevelId JOIN dbo.Courses c ON c.CourseId=l.CourseId JOIN dbo.Topics t ON t.TopicId=i.TopicId WHERE c.LanguageId<>t.LanguageId)
 THROW 51108,'Lesson topic must match its course language.',1;
END;

GO

CREATE TRIGGER dbo.TR_Enrollments_Ownership ON dbo.Enrollments AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.EnrollmentId=d.EnrollmentId WHERE i.StudentId<>d.StudentId OR i.CourseId<>d.CourseId OR i.EvidenceOrigin<>d.EvidenceOrigin OR i.EnrolledAtUtc<>d.EnrolledAtUtc)
 THROW 51109,'Enrollment identity and provenance are immutable.',1;
END;

GO

CREATE TRIGGER dbo.TR_LessonCompletions_Integrity ON dbo.LessonCompletions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted) THROW 51110,'Completion facts are append-only.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.Lessons l ON l.LessonId=i.LessonId JOIN dbo.Levels lv ON lv.LevelId=l.LevelId WHERE e.CourseId<>lv.CourseId OR e.ParticipationStatus<>'Active')
 THROW 51111,'Completion requires an active enrollment in the lesson course.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e ON e.EnrollmentId=i.EnrollmentId WHERE i.CompletionMethod='correct-answer' AND NOT EXISTS(
 SELECT 1 FROM dbo.AssessmentAttempts a JOIN dbo.Assessments s ON s.AssessmentId=a.AssessmentId
 WHERE a.UserId=e.StudentId AND s.ScopeLessonId=i.LessonId AND a.Status='Submitted' AND a.EvidenceOrigin=i.EvidenceOrigin
 AND NOT EXISTS(SELECT 1 FROM dbo.Questions q LEFT JOIN dbo.AttemptAnswers x ON x.AttemptId=a.AttemptId AND x.QuestionId=q.QuestionId LEFT JOIN dbo.QuestionOptions o ON o.OptionId=x.OptionId WHERE q.AssessmentId=s.AssessmentId AND (x.OptionId IS NULL OR o.IsCorrect=0))))
 THROW 51112,'Correct-answer completion requires matching submitted correct-answer evidence.',1;
END;

GO

CREATE TRIGGER dbo.TR_Assessments_Version ON dbo.Assessments AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d WHERE d.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts a WITH(UPDLOCK,HOLDLOCK) WHERE a.AssessmentId=d.AssessmentId))
 THROW 51113,'Published/attempted assessment versions are immutable; create a new version.',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublicationStatus='Published' AND (
 NOT EXISTS(SELECT 1 FROM dbo.Questions q WHERE q.AssessmentId=i.AssessmentId) OR EXISTS(
 SELECT q.QuestionId FROM dbo.Questions q LEFT JOIN dbo.QuestionOptions o ON o.QuestionId=q.QuestionId WHERE q.AssessmentId=i.AssessmentId GROUP BY q.QuestionId HAVING COUNT(o.OptionId)<2 OR SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)<>1)))
 THROW 51114,'Publication requires questions with at least two options and exactly one correct option each.',1;
END;

GO

CREATE TRIGGER dbo.TR_Questions_Version ON dbo.Questions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT AssessmentId FROM inserted UNION SELECT AssessmentId FROM deleted) x JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=x.AssessmentId WHERE a.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts atp WHERE atp.AssessmentId=a.AssessmentId))
 THROW 51115,'Questions in published/attempted assessment versions are immutable.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId LEFT JOIN dbo.Lessons ls ON ls.LessonId=a.ScopeLessonId LEFT JOIN dbo.Levels lv ON lv.LevelId=COALESCE(a.ScopeLevelId,ls.LevelId) JOIN dbo.Courses c ON c.CourseId=COALESCE(a.ScopeCourseId,lv.CourseId) JOIN dbo.Topics t ON t.TopicId=i.TopicId WHERE t.LanguageId<>c.LanguageId)
 THROW 51116,'Question topic language must match its assessment course.',1;
END;

GO

CREATE TRIGGER dbo.TR_QuestionOptions_Version ON dbo.QuestionOptions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT QuestionId FROM inserted UNION SELECT QuestionId FROM deleted) x JOIN dbo.Questions q ON q.QuestionId=x.QuestionId JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=q.AssessmentId WHERE a.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts atp WHERE atp.AssessmentId=a.AssessmentId))
 THROW 51117,'Options and grading keys in published/attempted versions are immutable.',1;
END;

GO

CREATE TRIGGER dbo.TR_AssessmentAttempts_Lifecycle ON dbo.AssessmentAttempts AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.AttemptId=d.AttemptId WHERE i.AttemptId IS NULL OR d.Status<>'InProgress')
 THROW 51118,'Attempts cannot be deleted; terminal attempts are immutable.',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.AttemptId=i.AttemptId WHERE d.AttemptId IS NULL AND i.Status<>'InProgress')
 THROW 51119,'Attempts must start InProgress.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.AttemptId=i.AttemptId WHERE i.UserId<>d.UserId OR i.AssessmentId<>d.AssessmentId OR ISNULL(i.StartedAtUtc,'19000101')<>ISNULL(d.StartedAtUtc,'19000101') OR i.EvidenceOrigin<>d.EvidenceOrigin OR ISNULL(i.ImportedAtUtc,'19000101')<>ISNULL(d.ImportedAtUtc,'19000101'))
 THROW 51120,'Attempt owner, assessment version, start time and provenance are immutable.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=i.AssessmentId WHERE a.PublicationStatus<>'Published')
 THROW 51121,'Only published assessments may be attempted.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId LEFT JOIN dbo.Lessons ls ON ls.LessonId=a.ScopeLessonId JOIN dbo.Levels lv ON lv.LevelId=COALESCE(a.ScopeLevelId,ls.LevelId) WHERE a.Kind<>'Placement' AND NOT EXISTS(SELECT 1 FROM dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) WHERE e.StudentId=i.UserId AND e.CourseId=lv.CourseId AND e.ParticipationStatus='Active'))
 THROW 51122,'Lesson and level attempts require active enrollment; placement may precede enrollment.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId WHERE a.Kind='LevelQuiz' AND EXISTS(SELECT 1 FROM dbo.Lessons ls WHERE ls.LevelId=a.ScopeLevelId AND ls.PublicationStatus='Published' AND NOT EXISTS(SELECT 1 FROM dbo.LessonCompletions lc JOIN dbo.Enrollments e ON e.EnrollmentId=lc.EnrollmentId WHERE lc.LessonId=ls.LessonId AND e.StudentId=i.UserId)))
 THROW 51123,'Complete the published lessons in the level before attempting its quiz.',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.Status='Submitted' AND EXISTS(SELECT 1 FROM dbo.Questions q WHERE q.AssessmentId=i.AssessmentId AND NOT EXISTS(SELECT 1 FROM dbo.AttemptAnswers x WITH(UPDLOCK,HOLDLOCK) WHERE x.AttemptId=i.AttemptId AND x.QuestionId=q.QuestionId)))
 THROW 51124,'Submission requires one response to every question; unsure is allowed.',1;
END;

GO

CREATE TRIGGER dbo.TR_AttemptAnswers_Lifecycle ON dbo.AttemptAnswers AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT AttemptId FROM inserted UNION SELECT AttemptId FROM deleted) x JOIN dbo.AssessmentAttempts a WITH(UPDLOCK,HOLDLOCK) ON a.AttemptId=x.AttemptId WHERE a.Status<>'InProgress')
 THROW 51125,'Only in-progress answers can be changed.',1;
END;

GO

CREATE TRIGGER dbo.TR_CodingTasks_Version ON dbo.CodingTasks AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d WHERE d.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.CodeSubmissions s WITH(UPDLOCK,HOLDLOCK) WHERE s.TaskId=d.TaskId))
 THROW 51126,'Published/submitted coding tasks are immutable; create a new version.',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublicationStatus='Published' AND (NOT EXISTS(SELECT 1 FROM dbo.TaskTestCases tc WHERE tc.TaskId=i.TaskId) OR NOT EXISTS(SELECT 1 FROM dbo.CodingTaskTopics tt WHERE tt.TaskId=i.TaskId)))
 THROW 51127,'Publish a task only after adding tests and concept links.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.TaskId=i.TaskId WHERE i.LevelId<>d.LevelId)
 THROW 51128,'Task level link is immutable.',1;
END;

GO

CREATE TRIGGER dbo.TR_TaskTestCases_Version ON dbo.TaskTestCases AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.CodeSubmissions s WHERE s.TaskId=t.TaskId))
 THROW 51129,'Tests in published/submitted task versions are immutable.',1;
END;

GO

CREATE TRIGGER dbo.TR_TaskHints_Version ON dbo.TaskHints AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus='Published')
 THROW 51130,'Hints in published task versions are immutable.',1;
END;

GO

CREATE TRIGGER dbo.TR_CodingTaskTopics_Version ON dbo.CodingTaskTopics AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus='Published')
 THROW 51131,'Concept links in published task versions are immutable.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.CodingTasks t ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId JOIN dbo.Courses c ON c.CourseId=l.CourseId JOIN dbo.Topics tp ON tp.TopicId=i.TopicId WHERE c.LanguageId<>tp.LanguageId)
 THROW 51132,'Task topics must match course language.',1;
END;

GO

CREATE TRIGGER dbo.TR_TaskWorkspaceState_Integrity ON dbo.TaskWorkspaceState AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.CodingTasks t ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId WHERE e.CourseId<>l.CourseId OR e.ParticipationStatus<>'Active' OR t.PublicationStatus<>'Published')
 THROW 51133,'Workspace requires an active matching course enrollment and published task.',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.HintsRevealedCount>(SELECT COUNT(*) FROM dbo.TaskHints h WHERE h.TaskId=i.TaskId))
 THROW 51134,'Revealed hints cannot exceed available hints.',1;
END;

GO

CREATE TRIGGER dbo.TR_CodeSubmissions_Lifecycle ON dbo.CodeSubmissions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.SubmissionId=d.SubmissionId WHERE i.SubmissionId IS NULL OR d.EvaluationStatus NOT IN('Pending','Running'))
 THROW 51135,'Submissions are append-only; terminal evaluations are immutable.',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE d.SubmissionId IS NULL AND i.EvaluationStatus<>'Pending')
 THROW 51136,'A submission must begin Pending.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE i.EnrollmentId<>d.EnrollmentId OR i.TaskId<>d.TaskId OR i.CodeText COLLATE Latin1_General_100_BIN2<>d.CodeText COLLATE Latin1_General_100_BIN2 OR DATALENGTH(i.CodeText)<>DATALENGTH(d.CodeText) OR ISNULL(i.SubmittedAtUtc,'19000101')<>ISNULL(d.SubmittedAtUtc,'19000101') OR i.ExecutionEnvironment<>d.ExecutionEnvironment OR ISNULL(i.RuntimeVersion,N'')<>ISNULL(d.RuntimeVersion,N'') OR ISNULL(i.EvaluatorVersion,N'')<>ISNULL(d.EvaluatorVersion,N'') OR i.EvidenceOrigin<>d.EvidenceOrigin OR ISNULL(i.ImportedAtUtc,'19000101')<>ISNULL(d.ImportedAtUtc,'19000101'))
 THROW 51137,'Submitted code, ownership, environment and provenance are immutable.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE NOT((d.EvaluationStatus='Pending' AND i.EvaluationStatus IN('Running','Cancelled')) OR (d.EvaluationStatus='Running' AND i.EvaluationStatus IN('Completed','Error','Cancelled'))))
 THROW 51138,'Invalid evaluation status transition.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId WHERE e.CourseId<>l.CourseId OR e.ParticipationStatus<>'Active' OR t.PublicationStatus<>'Published')
 THROW 51139,'Submission requires active matching enrollment and a published task.',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.EvaluationStatus='Completed' AND (
 NOT EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId) OR EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId AND r.ExecutionStatus<>'Success') OR (
 NOT EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId AND r.Passed=0) AND (SELECT COUNT(*) FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId)<>(SELECT COUNT(*) FROM dbo.TaskTestCases tc WHERE tc.TaskId=i.TaskId))))
 THROW 51140,'Completed means successful execution with a failed test or all tests passed; runtime errors require Error.',1;
END;

GO

CREATE TRIGGER dbo.TR_SubmissionTestResults_Integrity ON dbo.SubmissionTestResults AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted) THROW 51141,'Executed case results are immutable.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.CodeSubmissions s WITH(UPDLOCK,HOLDLOCK) ON s.SubmissionId=i.SubmissionId WHERE s.EvaluationStatus<>'Running')
 THROW 51142,'Record executed cases only while evaluation is Running.',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.TaskTestCases tc ON tc.TestCaseId=i.TestCaseId WHERE i.Passed=1 AND (i.ActualOutput COLLATE Latin1_General_100_BIN2<>tc.ExpectedOutput COLLATE Latin1_General_100_BIN2 OR DATALENGTH(i.ActualOutput)<>DATALENGTH(tc.ExpectedOutput)))
 THROW 51143,'Passing output must exactly match the expected output; evaluator must also verify assertions.',1;
END;

GO

CREATE VIEW dbo.vAssessmentScores AS
 SELECT a.AttemptId,a.UserId,a.AssessmentId,a.Status,a.EvidenceOrigin,a.SubmittedAtUtc,
 COUNT(q.QuestionId) AS QuestionCount,
 SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END) AS CorrectCount,
 CAST(100.0*SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)/NULLIF(COUNT(q.QuestionId),0) AS decimal(5,2)) AS ScorePercent
 FROM dbo.AssessmentAttempts a JOIN dbo.Questions q ON q.AssessmentId=a.AssessmentId
 LEFT JOIN dbo.AttemptAnswers x ON x.AttemptId=a.AttemptId AND x.QuestionId=q.QuestionId
 LEFT JOIN dbo.QuestionOptions o ON o.OptionId=x.OptionId
 GROUP BY a.AttemptId,a.UserId,a.AssessmentId,a.Status,a.EvidenceOrigin,a.SubmittedAtUtc;

GO

CREATE VIEW dbo.vSubmissionOutcomes AS
 SELECT s.SubmissionId,s.EnrollmentId,s.TaskId,s.EvaluationStatus,s.EvidenceOrigin,
 tc.ExpectedCaseCount, r.ExecutedCaseCount,r.PassedCaseCount,r.FailedCaseCount,
 tc.ExpectedCaseCount-r.ExecutedCaseCount AS NotRunCaseCount,
 CAST(CASE WHEN s.EvaluationStatus='Completed' AND r.ExecutedCaseCount=tc.ExpectedCaseCount AND tc.ExpectedCaseCount>0 AND r.PassedCaseCount=tc.ExpectedCaseCount THEN 1 ELSE 0 END AS bit) AS AllTestsPassed
 FROM dbo.CodeSubmissions s
 CROSS APPLY(SELECT COUNT(*) ExpectedCaseCount FROM dbo.TaskTestCases t WHERE t.TaskId=s.TaskId)tc
 CROSS APPLY(SELECT COUNT(*) ExecutedCaseCount,COALESCE(SUM(CONVERT(int,Passed)),0) PassedCaseCount,COALESCE(SUM(CASE WHEN Passed=0 THEN 1 ELSE 0 END),0) FailedCaseCount FROM dbo.SubmissionTestResults x WHERE x.SubmissionId=s.SubmissionId)r;

GO

CREATE VIEW dbo.vEnrollmentProgress AS
 SELECT e.EnrollmentId,e.StudentId,e.CourseId,
 (SELECT COUNT(*) FROM dbo.Lessons l JOIN dbo.Levels lv ON lv.LevelId=l.LevelId WHERE lv.CourseId=e.CourseId AND l.PublicationStatus='Published') AS LessonCount,
 (SELECT COUNT(*) FROM dbo.LessonCompletions lc WHERE lc.EnrollmentId=e.EnrollmentId) AS CompletedLessonCount,
 (SELECT COUNT(DISTINCT t.TaskCode) FROM dbo.vSubmissionOutcomes o JOIN dbo.CodingTasks t ON t.TaskId=o.TaskId WHERE o.EnrollmentId=e.EnrollmentId AND o.AllTestsPassed=1) AS PassedTaskCount
 FROM dbo.Enrollments e;

GO

CREATE FUNCTION dbo.fnPercentage(@Numerator int,@Denominator int) RETURNS decimal(6,2) WITH SCHEMABINDING AS
BEGIN
 RETURN CASE WHEN @Denominator>0 AND @Numerator>=0 THEN CONVERT(decimal(6,2),100.0*@Numerator/@Denominator) ELSE NULL END;
END;

GO

CREATE FUNCTION dbo.fnStudentCourseSummary(@StudentId int) RETURNS TABLE AS RETURN
 SELECT p.EnrollmentId,c.Title,p.LessonCount,p.CompletedLessonCount,p.PassedTaskCount,
 dbo.fnPercentage(p.CompletedLessonCount,p.LessonCount) AS CompletionPercent
 FROM dbo.vEnrollmentProgress p JOIN dbo.Courses c ON c.CourseId=p.CourseId WHERE p.StudentId=@StudentId;

GO

CREATE PROCEDURE dbo.uspEnrollStudent @StudentId int,@CourseId int AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRANSACTION;
 IF NOT EXISTS(SELECT 1 FROM dbo.StudentProfiles p JOIN dbo.Users u WITH(UPDLOCK,HOLDLOCK) ON u.UserId=p.UserId WHERE p.UserId=@StudentId AND u.AccountStatus='Enabled') THROW 51200,'An enabled student account is required.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Courses WITH(UPDLOCK,HOLDLOCK) WHERE CourseId=@CourseId AND PublicationStatus='Published') THROW 51201,'An available published course is required.',1;
 IF EXISTS(SELECT 1 FROM dbo.Enrollments WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@StudentId AND CourseId=@CourseId) THROW 51202,'Student is already enrolled.',1;
 INSERT dbo.Enrollments(StudentId,CourseId) VALUES(@StudentId,@CourseId);
 SELECT CONVERT(int,SCOPE_IDENTITY()) EnrollmentId;
 COMMIT;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;

GO

CREATE PROCEDURE dbo.uspSubmitAssessment @AttemptId int AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRANSACTION;
 IF NOT EXISTS(SELECT 1 FROM dbo.AssessmentAttempts WITH(UPDLOCK,HOLDLOCK) WHERE AttemptId=@AttemptId AND Status='InProgress') THROW 51203,'An in-progress attempt is required.',1;
 UPDATE dbo.AssessmentAttempts SET Status='Submitted',SubmittedAtUtc=SYSUTCDATETIME() WHERE AttemptId=@AttemptId;
 SELECT * FROM dbo.vAssessmentScores WHERE AttemptId=@AttemptId;
 COMMIT;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;

GO

CREATE PROCEDURE dbo.uspQueueCodeSubmission @EnrollmentId int,@TaskId int,@CodeText nvarchar(max),@ExecutionEnvironment nvarchar(100),@RuntimeVersion nvarchar(80)=NULL,@EvaluatorVersion nvarchar(80)=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment,RuntimeVersion,EvaluatorVersion) VALUES(@EnrollmentId,@TaskId,@CodeText,@ExecutionEnvironment,@RuntimeVersion,@EvaluatorVersion);
 SELECT CONVERT(int,SCOPE_IDENTITY()) SubmissionId;
END;

