/* CodeMentor AI Phase 3. SQL Server 2019+; SSMS, no SQLCMD mode.
   Change ONLY @DatabaseName. Existing targets fail before any modification.
   Exactly 23 core tables; sample identities are fictional, no authentication. */
USE [master];
SET NOCOUNT ON;
SET XACT_ABORT ON;
DECLARE @DatabaseName sysname = N'CodeMentorAI_Phase3_Test_20261105_R3';
IF @DatabaseName IS NULL OR @DatabaseName NOT LIKE N'CodeMentorAI_Phase3[_]%' OR @DatabaseName COLLATE Latin1_General_100_CI_AS = N'CodeMentorAI_Learning'
    THROW 51000, 'Use a distinct CodeMentorAI_Phase3_ database name.', 1;
IF DB_ID(@DatabaseName) IS NOT NULL THROW 51001, 'Target already exists; nothing was changed. Choose an unused name.', 1;
DECLARE @Create nvarchar(max)=N'CREATE DATABASE '+QUOTENAME(@DatabaseName)+N' COLLATE Latin1_General_100_CI_AS_SC;';
BEGIN TRY
 EXEC sys.sp_executesql @Create;
END TRY
BEGIN CATCH
 THROW;
END CATCH;
DECLARE @Install nvarchar(max)=N'USE '+QUOTENAME(@DatabaseName)+N'; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; BEGIN TRY BEGIN TRANSACTION; '+N'EXEC sys.sp_executesql N''CREATE TABLE dbo.[Users] (
    [UserId] int IDENTITY(1,1) NOT NULL,
    [Email] nvarchar(254) NOT NULL,
    [FullName] nvarchar(160) NOT NULL,
    [ReportedAge] tinyint NULL,
    [AgeRecordedAtUtc] datetime2(3) NULL,
    [RoleCode] varchar(10) NOT NULL CONSTRAINT [DF_Users_RoleCode] DEFAULT (''''Student''''),
    [AccountStatus] varchar(12) NOT NULL CONSTRAINT [DF_Users_AccountStatus] DEFAULT (''''Enabled''''),
    [ExternalAuthSubject] nvarchar(256) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Users_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [UQ_Users_1] UNIQUE NONCLUSTERED (Email),
    CONSTRAINT [CK_Users_1] CHECK (RoleCode IN (''''Student'''',''''Admin'''')),
    CONSTRAINT [CK_Users_2] CHECK (AccountStatus IN (''''Enabled'''',''''Suspended'''')),
    CONSTRAINT [CK_Users_3] CHECK (Email = LOWER(LTRIM(RTRIM(Email))) COLLATE Latin1_General_100_BIN2 AND Email LIKE N''''%_@_%._%'''' AND Email NOT LIKE N''''% %''''),
    CONSTRAINT [CK_Users_4] CHECK (LEN(LTRIM(RTRIM(FullName))) > 0),
    CONSTRAINT [CK_Users_5] CHECK ((ReportedAge IS NULL AND AgeRecordedAtUtc IS NULL) OR (ReportedAge IS NOT NULL AND ReportedAge BETWEEN 1 AND 120 AND AgeRecordedAtUtc IS NOT NULL))
);

CREATE TABLE dbo.[Languages] (
    [LanguageId] int IDENTITY(1,1) NOT NULL,
    [Slug] varchar(40) NOT NULL,
    [Name] nvarchar(80) NOT NULL,
    [Description] nvarchar(600) NOT NULL,
    [ContentReadinessCode] varchar(12) NOT NULL CONSTRAINT [DF_Languages_ContentReadinessCode] DEFAULT (''''ComingSoon''''),
    CONSTRAINT [PK_Languages] PRIMARY KEY CLUSTERED ([LanguageId]),
    CONSTRAINT [UQ_Languages_1] UNIQUE NONCLUSTERED (Slug),
    CONSTRAINT [UQ_Languages_2] UNIQUE NONCLUSTERED (Name),
    CONSTRAINT [CK_Languages_1] CHECK (ContentReadinessCode IN (''''Ready'''',''''ComingSoon''''))
);

CREATE TABLE dbo.[StudentProfiles] (
    [UserId] int NOT NULL,
    [PreferredLanguageId] int NOT NULL,
    [ExperienceCode] varchar(20) NOT NULL,
    [LearningGoalCode] varchar(30) NOT NULL,
    [UpdatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_StudentProfiles_UpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_StudentProfiles] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [CK_StudentProfiles_1] CHECK (ExperienceCode IN (''''Beginner'''',''''SomeExperience'''',''''Experienced'''')),
    CONSTRAINT [CK_StudentProfiles_2] CHECK (LearningGoalCode IN (''''Foundations'''',''''Projects'''',''''Career'''')),
    CONSTRAINT [FK_StudentProfiles_1_Users_UserId] FOREIGN KEY (UserId) REFERENCES dbo.[Users] (UserId),
    CONSTRAINT [FK_StudentProfiles_2_Languages_PreferredLanguageId] FOREIGN KEY (PreferredLanguageId) REFERENCES dbo.[Languages] (LanguageId)
);

CREATE TABLE dbo.[Courses] (
    [CourseId] int IDENTITY(1,1) NOT NULL,
    [LanguageId] int NOT NULL,
    [Slug] varchar(80) NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Courses_PublicationStatus] DEFAULT (''''Draft''''),
    [CreatedByUserId] int NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Courses_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ContentVersion] rowversion NOT NULL,
    CONSTRAINT [PK_Courses] PRIMARY KEY CLUSTERED ([CourseId]),
    CONSTRAINT [UQ_Courses_1] UNIQUE NONCLUSTERED (Slug),
    CONSTRAINT [CK_Courses_1] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''',''''Archived'''')),
    CONSTRAINT [FK_Courses_1_Languages_LanguageId] FOREIGN KEY (LanguageId) REFERENCES dbo.[Languages] (LanguageId),
    CONSTRAINT [FK_Courses_2_Users_CreatedByUserId] FOREIGN KEY (CreatedByUserId) REFERENCES dbo.[Users] (UserId)
);

CREATE TABLE dbo.[Levels] (
    [LevelId] int IDENTITY(1,1) NOT NULL,
    [CourseId] int NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [SortOrder] smallint NOT NULL,
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Levels_PublicationStatus] DEFAULT (''''Draft''''),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Levels_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Levels] PRIMARY KEY CLUSTERED ([LevelId]),
    CONSTRAINT [UQ_Levels_1] UNIQUE NONCLUSTERED (CourseId, SortOrder),
    CONSTRAINT [CK_Levels_1] CHECK (SortOrder > 0),
    CONSTRAINT [CK_Levels_2] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''',''''Archived'''')),
    CONSTRAINT [FK_Levels_1_Courses_CourseId] FOREIGN KEY (CourseId) REFERENCES dbo.[Courses] (CourseId)
);

CREATE TABLE dbo.[LevelObjectives] (
    [LevelId] int NOT NULL,
    [ObjectiveNo] smallint NOT NULL,
    [ObjectiveText] nvarchar(1000) NOT NULL,
    CONSTRAINT [PK_LevelObjectives] PRIMARY KEY CLUSTERED ([LevelId], [ObjectiveNo]),
    CONSTRAINT [CK_LevelObjectives_1] CHECK (ObjectiveNo > 0),
    CONSTRAINT [FK_LevelObjectives_1_Levels_LevelId] FOREIGN KEY (LevelId) REFERENCES dbo.[Levels] (LevelId)
);

CREATE TABLE dbo.[Topics] (
    [TopicId] int IDENTITY(1,1) NOT NULL,
    [LanguageId] int NOT NULL,
    [ParentTopicId] int NULL,
    [Code] varchar(80) NOT NULL,
    [Name] nvarchar(160) NOT NULL,
    CONSTRAINT [PK_Topics] PRIMARY KEY CLUSTERED ([TopicId]),
    CONSTRAINT [UQ_Topics_1] UNIQUE NONCLUSTERED (LanguageId, Code),
    CONSTRAINT [CK_Topics_1] CHECK (ParentTopicId IS NULL OR ParentTopicId <> TopicId),
    CONSTRAINT [FK_Topics_1_Languages_LanguageId] FOREIGN KEY (LanguageId) REFERENCES dbo.[Languages] (LanguageId),
    CONSTRAINT [FK_Topics_2_Topics_ParentTopicId] FOREIGN KEY (ParentTopicId) REFERENCES dbo.[Topics] (TopicId)
);

CREATE TABLE dbo.[Lessons] (
    [LessonId] int IDENTITY(1,1) NOT NULL,
    [LevelId] int NOT NULL,
    [TopicId] int NOT NULL,
    [Slug] varchar(80) NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Summary] nvarchar(1000) NOT NULL,
    [Body] nvarchar(max) NOT NULL,
    [ExampleCode] nvarchar(max) NOT NULL,
    [PreparedOutput] nvarchar(max) NOT NULL,
    [EstimatedMinutes] smallint NOT NULL,
    [SortOrder] smallint NOT NULL,
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Lessons_PublicationStatus] DEFAULT (''''Draft''''),
    [UpdatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Lessons_UpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Lessons] PRIMARY KEY CLUSTERED ([LessonId]),
    CONSTRAINT [UQ_Lessons_1] UNIQUE NONCLUSTERED (LevelId, Slug),
    CONSTRAINT [UQ_Lessons_2] UNIQUE NONCLUSTERED (LevelId, SortOrder),
    CONSTRAINT [CK_Lessons_1] CHECK (EstimatedMinutes > 0),
    CONSTRAINT [CK_Lessons_2] CHECK (SortOrder > 0),
    CONSTRAINT [CK_Lessons_3] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''',''''Archived'''')),
    CONSTRAINT [FK_Lessons_1_Levels_LevelId] FOREIGN KEY (LevelId) REFERENCES dbo.[Levels] (LevelId),
    CONSTRAINT [FK_Lessons_2_Topics_TopicId] FOREIGN KEY (TopicId) REFERENCES dbo.[Topics] (TopicId)
);

CREATE TABLE dbo.[LessonResources] (
    [ResourceId] int IDENTITY(1,1) NOT NULL,
    [LessonId] int NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Url] nvarchar(2048) NOT NULL,
    [ResourceType] varchar(20) NOT NULL,
    [ResourceLanguage] nvarchar(40) NULL,
    [SortOrder] smallint NOT NULL,
    CONSTRAINT [PK_LessonResources] PRIMARY KEY CLUSTERED ([ResourceId]),
    CONSTRAINT [UQ_LessonResources_1] UNIQUE NONCLUSTERED (LessonId, SortOrder),
    CONSTRAINT [CK_LessonResources_1] CHECK (SortOrder > 0),
    CONSTRAINT [CK_LessonResources_2] CHECK (ResourceType IN (''''Video'''',''''Documentation'''',''''Other'''')),
    CONSTRAINT [FK_LessonResources_1_Lessons_LessonId] FOREIGN KEY (LessonId) REFERENCES dbo.[Lessons] (LessonId)
);

CREATE TABLE dbo.[Assessments] (
    [AssessmentId] int IDENTITY(1,1) NOT NULL,
    [LogicalCode] varchar(100) NOT NULL,
    [VersionNo] smallint NOT NULL,
    [Kind] varchar(12) NOT NULL,
    [ScopeCourseId] int NULL,
    [ScopeLevelId] int NULL,
    [ScopeLessonId] int NULL,
    [Title] nvarchar(200) NOT NULL,
    [PassPercent] decimal(5,2) NULL,
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Assessments_PublicationStatus] DEFAULT (''''Draft''''),
    CONSTRAINT [PK_Assessments] PRIMARY KEY CLUSTERED ([AssessmentId]),
    CONSTRAINT [UQ_Assessments_1] UNIQUE NONCLUSTERED (LogicalCode, VersionNo),
    CONSTRAINT [CK_Assessments_1] CHECK (VersionNo > 0),
    CONSTRAINT [CK_Assessments_2] CHECK ((Kind=''''Placement'''' AND ScopeCourseId IS NOT NULL AND ScopeLevelId IS NULL AND ScopeLessonId IS NULL AND PassPercent IS NULL) OR (Kind=''''LevelQuiz'''' AND ScopeCourseId IS NULL AND ScopeLevelId IS NOT NULL AND ScopeLessonId IS NULL AND PassPercent IS NOT NULL AND PassPercent BETWEEN 0 AND 100) OR (Kind=''''LessonCheck'''' AND ScopeCourseId IS NULL AND ScopeLevelId IS NULL AND ScopeLessonId IS NOT NULL AND PassPercent IS NOT NULL AND PassPercent=100)),
    CONSTRAINT [CK_Assessments_3] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''')),
    CONSTRAINT [FK_Assessments_1_Courses_ScopeCourseId] FOREIGN KEY (ScopeCourseId) REFERENCES dbo.[Courses] (CourseId),
    CONSTRAINT [FK_Assessments_2_Levels_ScopeLevelId] FOREIGN KEY (ScopeLevelId) REFERENCES dbo.[Levels] (LevelId),
    CONSTRAINT [FK_Assessments_3_Lessons_ScopeLessonId] FOREIGN KEY (ScopeLessonId) REFERENCES dbo.[Lessons] (LessonId)
);

CREATE TABLE dbo.[Questions] (
    [QuestionId] int IDENTITY(1,1) NOT NULL,
    [AssessmentId] int NOT NULL,
    [TopicId] int NOT NULL,
    [Prompt] nvarchar(max) NOT NULL,
    [CodeSnippet] nvarchar(max) NULL,
    [Explanation] nvarchar(max) NULL,
    [SortOrder] smallint NOT NULL,
    CONSTRAINT [PK_Questions] PRIMARY KEY CLUSTERED ([QuestionId]),
    CONSTRAINT [UQ_Questions_1] UNIQUE NONCLUSTERED (AssessmentId, SortOrder),
    CONSTRAINT [UQ_Questions_2] UNIQUE NONCLUSTERED (AssessmentId, QuestionId),
    CONSTRAINT [CK_Questions_1] CHECK (SortOrder > 0),
    CONSTRAINT [FK_Questions_1_Assessments_AssessmentId] FOREIGN KEY (AssessmentId) REFERENCES dbo.[Assessments] (AssessmentId),
    CONSTRAINT [FK_Questions_2_Topics_TopicId] FOREIGN KEY (TopicId) REFERENCES dbo.[Topics] (TopicId)
);

CREATE TABLE dbo.[QuestionOptions] (
    [OptionId] int IDENTITY(1,1) NOT NULL,
    [QuestionId] int NOT NULL,
    [OptionText] nvarchar(1000) NOT NULL,
    [IsCorrect] bit NOT NULL,
    [SortOrder] smallint NOT NULL,
    CONSTRAINT [PK_QuestionOptions] PRIMARY KEY CLUSTERED ([OptionId]),
    CONSTRAINT [UQ_QuestionOptions_1] UNIQUE NONCLUSTERED (QuestionId, SortOrder),
    CONSTRAINT [UQ_QuestionOptions_2] UNIQUE NONCLUSTERED (QuestionId, OptionId),
    CONSTRAINT [CK_QuestionOptions_1] CHECK (SortOrder > 0),
    CONSTRAINT [FK_QuestionOptions_1_Questions_QuestionId] FOREIGN KEY (QuestionId) REFERENCES dbo.[Questions] (QuestionId)
);

CREATE TABLE dbo.[AssessmentAttempts] (
    [AttemptId] int IDENTITY(1,1) NOT NULL,
    [UserId] int NOT NULL,
    [AssessmentId] int NOT NULL,
    [Status] varchar(12) NOT NULL CONSTRAINT [DF_AssessmentAttempts_Status] DEFAULT (''''InProgress''''),
    [CurrentQuestionNo] smallint NULL,
    [StartedAtUtc] datetime2(3) NULL CONSTRAINT [DF_AssessmentAttempts_StartedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [SubmittedAtUtc] datetime2(3) NULL,
    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_AssessmentAttempts_EvidenceOrigin] DEFAULT (''''server''''),
    [ImportedAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_AssessmentAttempts] PRIMARY KEY CLUSTERED ([AttemptId]),
    CONSTRAINT [UQ_AssessmentAttempts_1] UNIQUE NONCLUSTERED (AttemptId, AssessmentId),
    CONSTRAINT [CK_AssessmentAttempts_1] CHECK (Status IN (''''InProgress'''',''''Submitted'''',''''Cancelled'''')),
    CONSTRAINT [CK_AssessmentAttempts_2] CHECK (CurrentQuestionNo IS NULL OR CurrentQuestionNo > 0),
    CONSTRAINT [CK_AssessmentAttempts_3] CHECK ((Status=''''Submitted'''' AND (EvidenceOrigin=''''browser-import'''' OR SubmittedAtUtc IS NOT NULL) AND (SubmittedAtUtc IS NULL OR StartedAtUtc IS NULL OR SubmittedAtUtc >= StartedAtUtc)) OR (Status <> ''''Submitted'''' AND SubmittedAtUtc IS NULL)),
    CONSTRAINT [CK_AssessmentAttempts_4] CHECK (EvidenceOrigin IN (''''server'''',''''academic-seed'''',''''browser-import'''')),
    CONSTRAINT [CK_AssessmentAttempts_5] CHECK (EvidenceOrigin=''''browser-import'''' OR StartedAtUtc IS NOT NULL),
    CONSTRAINT [CK_AssessmentAttempts_6] CHECK ((EvidenceOrigin=''''browser-import'''' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>''''browser-import'''' AND ImportedAtUtc IS NULL)),
    CONSTRAINT [FK_AssessmentAttempts_1_StudentProfiles_UserId] FOREIGN KEY (UserId) REFERENCES dbo.[StudentProfiles] (UserId),
    CONSTRAINT [FK_AssessmentAttempts_2_Assessments_AssessmentId] FOREIGN KEY (AssessmentId) REFERENCES dbo.[Assessments] (AssessmentId)
);

CREATE TABLE dbo.[AttemptAnswers] (
    [AttemptId] int NOT NULL,
    [QuestionId] int NOT NULL,
    [AssessmentId] int NOT NULL,
    [OptionId] int NULL,
    [ResponseKind] varchar(8) NOT NULL,
    [AnsweredAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_AttemptAnswers] PRIMARY KEY CLUSTERED ([AttemptId], [QuestionId]),
    CONSTRAINT [CK_AttemptAnswers_1] CHECK ((ResponseKind=''''option'''' AND OptionId IS NOT NULL) OR (ResponseKind=''''unsure'''' AND OptionId IS NULL)),
    CONSTRAINT [FK_AttemptAnswers_1_Answer_AttemptVersion] FOREIGN KEY (AttemptId, AssessmentId) REFERENCES dbo.[AssessmentAttempts] (AttemptId, AssessmentId),
    CONSTRAINT [FK_AttemptAnswers_2_Answer_QuestionVersion] FOREIGN KEY (AssessmentId, QuestionId) REFERENCES dbo.[Questions] (AssessmentId, QuestionId),
    CONSTRAINT [FK_AttemptAnswers_3_Answer_QuestionOption] FOREIGN KEY (QuestionId, OptionId) REFERENCES dbo.[QuestionOptions] (QuestionId, OptionId)
);

CREATE TABLE dbo.[Enrollments] (
    [EnrollmentId] int IDENTITY(1,1) NOT NULL,
    [StudentId] int NOT NULL,
    [CourseId] int NOT NULL,
    [EnrolledAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Enrollments_EnrolledAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ParticipationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Enrollments_ParticipationStatus] DEFAULT (''''Active''''),
    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_Enrollments_EvidenceOrigin] DEFAULT (''''server''''),
    CONSTRAINT [PK_Enrollments] PRIMARY KEY CLUSTERED ([EnrollmentId]),
    CONSTRAINT [UQ_Enrollments_1] UNIQUE NONCLUSTERED (StudentId, CourseId),
    CONSTRAINT [CK_Enrollments_1] CHECK (ParticipationStatus IN (''''Active'''',''''Paused'''',''''Completed'''')),
    CONSTRAINT [CK_Enrollments_2] CHECK (EvidenceOrigin IN (''''server'''',''''academic-seed'''',''''browser-import'''')),
    CONSTRAINT [FK_Enrollments_1_StudentProfiles_StudentId] FOREIGN KEY (StudentId) REFERENCES dbo.[StudentProfiles] (UserId),
    CONSTRAINT [FK_Enrollments_2_Courses_CourseId] FOREIGN KEY (CourseId) REFERENCES dbo.[Courses] (CourseId)
);

CREATE TABLE dbo.[LessonCompletions] (
    [EnrollmentId] int NOT NULL,
    [LessonId] int NOT NULL,
    [CompletedAtUtc] datetime2(3) NULL,
    [CompletionMethod] varchar(16) NOT NULL,
    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_LessonCompletions_EvidenceOrigin] DEFAULT (''''server''''),
    [ImportedAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_LessonCompletions] PRIMARY KEY CLUSTERED ([EnrollmentId], [LessonId]),
    CONSTRAINT [CK_LessonCompletions_1] CHECK (CompletionMethod IN (''''manual'''',''''correct-answer'''',''''imported'''')),
    CONSTRAINT [CK_LessonCompletions_2] CHECK (EvidenceOrigin IN (''''server'''',''''academic-seed'''',''''browser-import'''')),
    CONSTRAINT [CK_LessonCompletions_3] CHECK ((EvidenceOrigin=''''browser-import'''' AND CompletionMethod=''''imported'''' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>''''browser-import'''' AND CompletionMethod<>''''imported'''' AND ImportedAtUtc IS NULL AND CompletedAtUtc IS NOT NULL)),
    CONSTRAINT [FK_LessonCompletions_1_Enrollments_EnrollmentId] FOREIGN KEY (EnrollmentId) REFERENCES dbo.[Enrollments] (EnrollmentId),
    CONSTRAINT [FK_LessonCompletions_2_Lessons_LessonId] FOREIGN KEY (LessonId) REFERENCES dbo.[Lessons] (LessonId)
);

CREATE TABLE dbo.[CodingTasks] (
    [TaskId] int IDENTITY(1,1) NOT NULL,
    [LevelId] int NOT NULL,
    [TaskCode] varchar(80) NOT NULL,
    [VersionNo] smallint NOT NULL,
    [TaskKind] varchar(12) NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [RequirementsText] nvarchar(max) NOT NULL,
    [StarterCode] nvarchar(max) NOT NULL,
    [SampleInput] nvarchar(max) NOT NULL,
    [SampleOutput] nvarchar(max) NOT NULL,
    [ReferenceSolution] nvarchar(max) NOT NULL,
    [SolutionExplanation] nvarchar(max) NOT NULL,
    [VerificationCode] nvarchar(max) NULL,
    [SortOrder] smallint NOT NULL,
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_CodingTasks_PublicationStatus] DEFAULT (''''Draft''''),
    CONSTRAINT [PK_CodingTasks] PRIMARY KEY CLUSTERED ([TaskId]),
    CONSTRAINT [UQ_CodingTasks_1] UNIQUE NONCLUSTERED (TaskCode, VersionNo),
    CONSTRAINT [CK_CodingTasks_1] CHECK (VersionNo > 0),
    CONSTRAINT [CK_CodingTasks_2] CHECK (SortOrder > 0),
    CONSTRAINT [CK_CodingTasks_3] CHECK (TaskKind IN (''''Exercise'''',''''FinalProject'''')),
    CONSTRAINT [CK_CodingTasks_4] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''')),
    CONSTRAINT [FK_CodingTasks_1_Levels_LevelId] FOREIGN KEY (LevelId) REFERENCES dbo.[Levels] (LevelId)
);

CREATE TABLE dbo.[CodingTaskTopics] (
    [TaskId] int NOT NULL,
    [TopicId] int NOT NULL,
    CONSTRAINT [PK_CodingTaskTopics] PRIMARY KEY CLUSTERED ([TaskId], [TopicId]),
    CONSTRAINT [FK_CodingTaskTopics_1_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId),
    CONSTRAINT [FK_CodingTaskTopics_2_Topics_TopicId] FOREIGN KEY (TopicId) REFERENCES dbo.[Topics] (TopicId)
);

CREATE TABLE dbo.[TaskTestCases] (
    [TestCaseId] int IDENTITY(1,1) NOT NULL,
    [TaskId] int NOT NULL,
    [CaseNo] smallint NOT NULL,
    [InputText] nvarchar(max) NOT NULL,
    [ExpectedOutput] nvarchar(max) NOT NULL,
    [IsPublic] bit NOT NULL CONSTRAINT [DF_TaskTestCases_IsPublic] DEFAULT (1),
    CONSTRAINT [PK_TaskTestCases] PRIMARY KEY CLUSTERED ([TestCaseId]),
    CONSTRAINT [UQ_TaskTestCases_1] UNIQUE NONCLUSTERED (TaskId, CaseNo),
    CONSTRAINT [UQ_TaskTestCases_2] UNIQUE NONCLUSTERED (TaskId, TestCaseId),
    CONSTRAINT [CK_TaskTestCases_1] CHECK (CaseNo > 0),
    CONSTRAINT [FK_TaskTestCases_1_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId)
);

CREATE TABLE dbo.[TaskHints] (
    [TaskId] int NOT NULL,
    [HintNo] smallint NOT NULL,
    [HintText] nvarchar(2000) NOT NULL,
    CONSTRAINT [PK_TaskHints] PRIMARY KEY CLUSTERED ([TaskId], [HintNo]),
    CONSTRAINT [CK_TaskHints_1] CHECK (HintNo > 0),
    CONSTRAINT [FK_TaskHints_1_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId)
);

CREATE TABLE dbo.[TaskWorkspaceState] (
    [EnrollmentId] int NOT NULL,
    [TaskId] int NOT NULL,
    [DraftCode] nvarchar(max) NULL,
    [DraftInput] nvarchar(max) NULL,
    [DraftUpdatedAtUtc] datetime2(3) NULL,
    [HintsRevealedCount] smallint NOT NULL CONSTRAINT [DF_TaskWorkspaceState_HintsRevealedCount] DEFAULT (0),
    [HasAttempted] bit NOT NULL CONSTRAINT [DF_TaskWorkspaceState_HasAttempted] DEFAULT (0),
    [SolutionViewed] bit NOT NULL CONSTRAINT [DF_TaskWorkspaceState_SolutionViewed] DEFAULT (0),
    [StateUpdatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_TaskWorkspaceState_StateUpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_TaskWorkspaceState] PRIMARY KEY CLUSTERED ([EnrollmentId], [TaskId]),
    CONSTRAINT [CK_TaskWorkspaceState_1] CHECK (HintsRevealedCount >= 0),
    CONSTRAINT [CK_TaskWorkspaceState_2] CHECK (SolutionViewed=0 OR HasAttempted=1),
    CONSTRAINT [FK_TaskWorkspaceState_1_Enrollments_EnrollmentId] FOREIGN KEY (EnrollmentId) REFERENCES dbo.[Enrollments] (EnrollmentId),
    CONSTRAINT [FK_TaskWorkspaceState_2_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId)
);

CREATE TABLE dbo.[CodeSubmissions] (
    [SubmissionId] int IDENTITY(1,1) NOT NULL,
    [EnrollmentId] int NOT NULL,
    [TaskId] int NOT NULL,
    [CodeText] nvarchar(max) NOT NULL,
    [SubmittedAtUtc] datetime2(3) NULL CONSTRAINT [DF_CodeSubmissions_SubmittedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [EvaluationStatus] varchar(12) NOT NULL CONSTRAINT [DF_CodeSubmissions_EvaluationStatus] DEFAULT (''''Pending''''),
    [FinishedAtUtc] datetime2(3) NULL,
    [EvaluationError] nvarchar(2000) NULL,
    [ExecutionEnvironment] nvarchar(100) NOT NULL,
    [RuntimeVersion] nvarchar(80) NULL,
    [EvaluatorVersion] nvarchar(80) NULL,
    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_CodeSubmissions_EvidenceOrigin] DEFAULT (''''server''''),
    [ImportedAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_CodeSubmissions] PRIMARY KEY CLUSTERED ([SubmissionId]),
    CONSTRAINT [UQ_CodeSubmissions_1] UNIQUE NONCLUSTERED (SubmissionId, TaskId),
    CONSTRAINT [CK_CodeSubmissions_1] CHECK (EvaluationStatus IN (''''Pending'''',''''Running'''',''''Completed'''',''''Error'''',''''Cancelled'''')),
    CONSTRAINT [CK_CodeSubmissions_2] CHECK (EvidenceOrigin IN (''''server'''',''''academic-seed'''',''''browser-import'''')),
    CONSTRAINT [CK_CodeSubmissions_3] CHECK (EvidenceOrigin=''''browser-import'''' OR SubmittedAtUtc IS NOT NULL),
    CONSTRAINT [CK_CodeSubmissions_4] CHECK ((EvaluationStatus IN (''''Pending'''',''''Running'''') AND FinishedAtUtc IS NULL) OR (EvaluationStatus IN (''''Completed'''',''''Error'''',''''Cancelled'''') AND (EvidenceOrigin=''''browser-import'''' OR FinishedAtUtc IS NOT NULL) AND (FinishedAtUtc IS NULL OR SubmittedAtUtc IS NULL OR FinishedAtUtc >= SubmittedAtUtc))),
    CONSTRAINT [CK_CodeSubmissions_5] CHECK ((EvaluationStatus=''''Error'''' AND EvaluationError IS NOT NULL) OR (EvaluationStatus<>''''Error'''' AND EvaluationError IS NULL)),
    CONSTRAINT [CK_CodeSubmissions_6] CHECK ((EvidenceOrigin=''''browser-import'''' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>''''browser-import'''' AND ImportedAtUtc IS NULL)),
    CONSTRAINT [FK_CodeSubmissions_1_Enrollments_EnrollmentId] FOREIGN KEY (EnrollmentId) REFERENCES dbo.[Enrollments] (EnrollmentId),
    CONSTRAINT [FK_CodeSubmissions_2_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId)
);

CREATE TABLE dbo.[SubmissionTestResults] (
    [SubmissionId] int NOT NULL,
    [TestCaseId] int NOT NULL,
    [TaskId] int NOT NULL,
    [Passed] bit NOT NULL,
    [ActualOutput] nvarchar(max) NOT NULL,
    [ErrorText] nvarchar(2000) NULL,
    [RuntimeMs] int NULL,
    [ExecutionStatus] varchar(16) NOT NULL,
    CONSTRAINT [PK_SubmissionTestResults] PRIMARY KEY CLUSTERED ([SubmissionId], [TestCaseId]),
    CONSTRAINT [CK_SubmissionTestResults_1] CHECK (RuntimeMs IS NULL OR RuntimeMs >= 0),
    CONSTRAINT [CK_SubmissionTestResults_2] CHECK ((ExecutionStatus=''''Success'''' AND ErrorText IS NULL) OR (ExecutionStatus IN (''''RuntimeError'''',''''Timeout'''') AND Passed=0 AND ErrorText IS NOT NULL)),
    CONSTRAINT [FK_SubmissionTestResults_1_Result_SubmissionVersion] FOREIGN KEY (SubmissionId, TaskId) REFERENCES dbo.[CodeSubmissions] (SubmissionId, TaskId),
    CONSTRAINT [FK_SubmissionTestResults_2_Result_TestVersion] FOREIGN KEY (TaskId, TestCaseId) REFERENCES dbo.[TaskTestCases] (TaskId, TestCaseId)
);

CREATE NONCLUSTERED INDEX [IX_StudentProfiles_PreferredLanguageId] ON dbo.[StudentProfiles] (PreferredLanguageId);
CREATE NONCLUSTERED INDEX [IX_Courses_LanguageId] ON dbo.[Courses] (LanguageId);
CREATE NONCLUSTERED INDEX [IX_Courses_CreatedByUserId] ON dbo.[Courses] (CreatedByUserId);
CREATE NONCLUSTERED INDEX [IX_Topics_ParentTopicId] ON dbo.[Topics] (ParentTopicId);
CREATE NONCLUSTERED INDEX [IX_Lessons_TopicId] ON dbo.[Lessons] (TopicId);
CREATE NONCLUSTERED INDEX [IX_Assessments_ScopeCourseId] ON dbo.[Assessments] (ScopeCourseId);
CREATE NONCLUSTERED INDEX [IX_Assessments_ScopeLevelId] ON dbo.[Assessments] (ScopeLevelId);
CREATE NONCLUSTERED INDEX [IX_Assessments_ScopeLessonId] ON dbo.[Assessments] (ScopeLessonId);
CREATE NONCLUSTERED INDEX [IX_Questions_TopicId] ON dbo.[Questions] (TopicId);
CREATE NONCLUSTERED INDEX [IX_AssessmentAttempts_UserId] ON dbo.[AssessmentAttempts] (UserId);
CREATE NONCLUSTERED INDEX [IX_AssessmentAttempts_AssessmentId] ON dbo.[AssessmentAttempts] (AssessmentId);
CREATE NONCLUSTERED INDEX [IX_AttemptAnswers_AttemptId_AssessmentId] ON dbo.[AttemptAnswers] (AttemptId, AssessmentId);
CREATE NONCLUSTERED INDEX [IX_AttemptAnswers_AssessmentId_QuestionId] ON dbo.[AttemptAnswers] (AssessmentId, QuestionId);
CREATE NONCLUSTERED INDEX [IX_AttemptAnswers_QuestionId_OptionId] ON dbo.[AttemptAnswers] (QuestionId, OptionId);
CREATE NONCLUSTERED INDEX [IX_Enrollments_CourseId] ON dbo.[Enrollments] (CourseId);
CREATE NONCLUSTERED INDEX [IX_LessonCompletions_LessonId] ON dbo.[LessonCompletions] (LessonId);
CREATE NONCLUSTERED INDEX [IX_CodingTasks_LevelId] ON dbo.[CodingTasks] (LevelId);
CREATE NONCLUSTERED INDEX [IX_CodingTaskTopics_TopicId] ON dbo.[CodingTaskTopics] (TopicId);
CREATE NONCLUSTERED INDEX [IX_TaskWorkspaceState_TaskId] ON dbo.[TaskWorkspaceState] (TaskId);
CREATE NONCLUSTERED INDEX [IX_CodeSubmissions_EnrollmentId] ON dbo.[CodeSubmissions] (EnrollmentId);
CREATE NONCLUSTERED INDEX [IX_CodeSubmissions_TaskId] ON dbo.[CodeSubmissions] (TaskId);
CREATE NONCLUSTERED INDEX [IX_SubmissionTestResults_SubmissionId_TaskId] ON dbo.[SubmissionTestResults] (SubmissionId, TaskId);
CREATE NONCLUSTERED INDEX [IX_SubmissionTestResults_TaskId_TestCaseId] ON dbo.[SubmissionTestResults] (TaskId, TestCaseId);
'';
EXEC sys.sp_executesql N''
/* Each GO-delimited batch is embedded in submission.sql by build-phase3.cjs.
   Triggers are set based. UPDLOCK,HOLDLOCK serialize child writes with parent
   finalization/publication. Direct privileged DDL/disabled triggers are outside
   the threat model; runtime principals must never own the schema. */
CREATE TRIGGER dbo.TR_Users_StudentRole ON dbo.Users AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.StudentProfiles p WITH(UPDLOCK,HOLDLOCK) ON p.UserId=i.UserId WHERE i.RoleCode<>''''Student'''')
 THROW 51100,''''A student-profile owner cannot become an administrator.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_StudentProfiles_Role ON dbo.StudentProfiles AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Users u WITH(UPDLOCK,HOLDLOCK) ON u.UserId=i.UserId WHERE u.RoleCode<>''''Student'''')
 THROW 51101,''''StudentProfiles requires the Student role.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_Courses_Structure ON dbo.Courses AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.CourseId=d.CourseId WHERE i.LanguageId<>d.LanguageId)
 THROW 51102,''''Course language is immutable; create a new course.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_Levels_Structure ON dbo.Levels AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.LevelId=d.LevelId WHERE i.CourseId<>d.CourseId)
 THROW 51103,''''A level cannot be moved to another course.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_Topics_Structure ON dbo.Topics AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.TopicId=d.TopicId WHERE i.LanguageId<>d.LanguageId OR ISNULL(i.ParentTopicId,0)<>ISNULL(d.ParentTopicId,0))
 THROW 51104,''''Topic language/parent links are immutable; create a new topic.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Topics p WITH(UPDLOCK,HOLDLOCK) ON p.TopicId=i.ParentTopicId WHERE p.LanguageId<>i.LanguageId)
 THROW 51105,''''A topic parent must use the same language.'''',1;
 ;WITH ancestors AS (
 SELECT i.TopicId AS StartId,i.ParentTopicId,1 AS Depth FROM inserted i WHERE i.ParentTopicId IS NOT NULL
 UNION ALL SELECT a.StartId,p.ParentTopicId,a.Depth+1 FROM ancestors a JOIN dbo.Topics p ON p.TopicId=a.ParentTopicId WHERE a.Depth<100 AND a.ParentTopicId<>a.StartId
 )
 SELECT StartId INTO #cycles FROM ancestors WHERE StartId=ParentTopicId OR Depth=100 OPTION(MAXRECURSION 100);
 IF EXISTS(SELECT 1 FROM #cycles) THROW 51106,''''Topic hierarchy must be acyclic and shorter than 100 links.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_Lessons_Structure ON dbo.Lessons AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.LessonId=d.LessonId WHERE i.LevelId<>d.LevelId OR i.TopicId<>d.TopicId)
 THROW 51107,''''Lesson level/topic links are immutable.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Levels l ON l.LevelId=i.LevelId JOIN dbo.Courses c ON c.CourseId=l.CourseId JOIN dbo.Topics t ON t.TopicId=i.TopicId WHERE c.LanguageId<>t.LanguageId)
 THROW 51108,''''Lesson topic must match its course language.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_Enrollments_Ownership ON dbo.Enrollments AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.EnrollmentId=d.EnrollmentId WHERE i.StudentId<>d.StudentId OR i.CourseId<>d.CourseId OR i.EvidenceOrigin<>d.EvidenceOrigin OR i.EnrolledAtUtc<>d.EnrolledAtUtc)
 THROW 51109,''''Enrollment identity and provenance are immutable.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_LessonCompletions_Integrity ON dbo.LessonCompletions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted) THROW 51110,''''Completion facts are append-only.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.Lessons l ON l.LessonId=i.LessonId JOIN dbo.Levels lv ON lv.LevelId=l.LevelId WHERE e.CourseId<>lv.CourseId OR e.ParticipationStatus<>''''Active'''')
 THROW 51111,''''Completion requires an active enrollment in the lesson course.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e ON e.EnrollmentId=i.EnrollmentId WHERE i.CompletionMethod=''''correct-answer'''' AND NOT EXISTS(
 SELECT 1 FROM dbo.AssessmentAttempts a JOIN dbo.Assessments s ON s.AssessmentId=a.AssessmentId
 WHERE a.UserId=e.StudentId AND s.ScopeLessonId=i.LessonId AND a.Status=''''Submitted'''' AND a.EvidenceOrigin=i.EvidenceOrigin
 AND NOT EXISTS(SELECT 1 FROM dbo.Questions q LEFT JOIN dbo.AttemptAnswers x ON x.AttemptId=a.AttemptId AND x.QuestionId=q.QuestionId LEFT JOIN dbo.QuestionOptions o ON o.OptionId=x.OptionId WHERE q.AssessmentId=s.AssessmentId AND (x.OptionId IS NULL OR o.IsCorrect=0))))
 THROW 51112,''''Correct-answer completion requires matching submitted correct-answer evidence.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_Assessments_Version ON dbo.Assessments AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d WHERE d.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts a WITH(UPDLOCK,HOLDLOCK) WHERE a.AssessmentId=d.AssessmentId))
 THROW 51113,''''Published/attempted assessment versions are immutable; create a new version.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublicationStatus=''''Published'''' AND (
 NOT EXISTS(SELECT 1 FROM dbo.Questions q WHERE q.AssessmentId=i.AssessmentId) OR EXISTS(
 SELECT q.QuestionId FROM dbo.Questions q LEFT JOIN dbo.QuestionOptions o ON o.QuestionId=q.QuestionId WHERE q.AssessmentId=i.AssessmentId GROUP BY q.QuestionId HAVING COUNT(o.OptionId)<2 OR SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)<>1)))
 THROW 51114,''''Publication requires questions with at least two options and exactly one correct option each.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_Questions_Version ON dbo.Questions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT AssessmentId FROM inserted UNION SELECT AssessmentId FROM deleted) x JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=x.AssessmentId WHERE a.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts atp WHERE atp.AssessmentId=a.AssessmentId))
 THROW 51115,''''Questions in published/attempted assessment versions are immutable.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId LEFT JOIN dbo.Lessons ls ON ls.LessonId=a.ScopeLessonId LEFT JOIN dbo.Levels lv ON lv.LevelId=COALESCE(a.ScopeLevelId,ls.LevelId) JOIN dbo.Courses c ON c.CourseId=COALESCE(a.ScopeCourseId,lv.CourseId) JOIN dbo.Topics t ON t.TopicId=i.TopicId WHERE t.LanguageId<>c.LanguageId)
 THROW 51116,''''Question topic language must match its assessment course.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_QuestionOptions_Version ON dbo.QuestionOptions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT QuestionId FROM inserted UNION SELECT QuestionId FROM deleted) x JOIN dbo.Questions q ON q.QuestionId=x.QuestionId JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=q.AssessmentId WHERE a.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts atp WHERE atp.AssessmentId=a.AssessmentId))
 THROW 51117,''''Options and grading keys in published/attempted versions are immutable.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_AssessmentAttempts_Lifecycle ON dbo.AssessmentAttempts AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.AttemptId=d.AttemptId WHERE i.AttemptId IS NULL OR d.Status<>''''InProgress'''')
 THROW 51118,''''Attempts cannot be deleted; terminal attempts are immutable.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.AttemptId=i.AttemptId WHERE d.AttemptId IS NULL AND i.Status<>''''InProgress'''')
 THROW 51119,''''Attempts must start InProgress.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.AttemptId=i.AttemptId WHERE i.UserId<>d.UserId OR i.AssessmentId<>d.AssessmentId OR ISNULL(i.StartedAtUtc,''''19000101'''')<>ISNULL(d.StartedAtUtc,''''19000101'''') OR i.EvidenceOrigin<>d.EvidenceOrigin OR ISNULL(i.ImportedAtUtc,''''19000101'''')<>ISNULL(d.ImportedAtUtc,''''19000101''''))
 THROW 51120,''''Attempt owner, assessment version, start time and provenance are immutable.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=i.AssessmentId WHERE a.PublicationStatus<>''''Published'''')
 THROW 51121,''''Only published assessments may be attempted.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId LEFT JOIN dbo.Lessons ls ON ls.LessonId=a.ScopeLessonId JOIN dbo.Levels lv ON lv.LevelId=COALESCE(a.ScopeLevelId,ls.LevelId) WHERE a.Kind<>''''Placement'''' AND NOT EXISTS(SELECT 1 FROM dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) WHERE e.StudentId=i.UserId AND e.CourseId=lv.CourseId AND e.ParticipationStatus=''''Active''''))
 THROW 51122,''''Lesson and level attempts require active enrollment; placement may precede enrollment.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId WHERE a.Kind=''''LevelQuiz'''' AND EXISTS(SELECT 1 FROM dbo.Lessons ls WHERE ls.LevelId=a.ScopeLevelId AND ls.PublicationStatus=''''Published'''' AND NOT EXISTS(SELECT 1 FROM dbo.LessonCompletions lc JOIN dbo.Enrollments e ON e.EnrollmentId=lc.EnrollmentId WHERE lc.LessonId=ls.LessonId AND e.StudentId=i.UserId)))
 THROW 51123,''''Complete the published lessons in the level before attempting its quiz.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.Status=''''Submitted'''' AND EXISTS(SELECT 1 FROM dbo.Questions q WHERE q.AssessmentId=i.AssessmentId AND NOT EXISTS(SELECT 1 FROM dbo.AttemptAnswers x WITH(UPDLOCK,HOLDLOCK) WHERE x.AttemptId=i.AttemptId AND x.QuestionId=q.QuestionId)))
 THROW 51124,''''Submission requires one response to every question; unsure is allowed.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_AttemptAnswers_Lifecycle ON dbo.AttemptAnswers AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT AttemptId FROM inserted UNION SELECT AttemptId FROM deleted) x JOIN dbo.AssessmentAttempts a WITH(UPDLOCK,HOLDLOCK) ON a.AttemptId=x.AttemptId WHERE a.Status<>''''InProgress'''')
 THROW 51125,''''Only in-progress answers can be changed.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_CodingTasks_Version ON dbo.CodingTasks AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d WHERE d.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.CodeSubmissions s WITH(UPDLOCK,HOLDLOCK) WHERE s.TaskId=d.TaskId))
 THROW 51126,''''Published/submitted coding tasks are immutable; create a new version.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublicationStatus=''''Published'''' AND (NOT EXISTS(SELECT 1 FROM dbo.TaskTestCases tc WHERE tc.TaskId=i.TaskId) OR NOT EXISTS(SELECT 1 FROM dbo.CodingTaskTopics tt WHERE tt.TaskId=i.TaskId)))
 THROW 51127,''''Publish a task only after adding tests and concept links.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.TaskId=i.TaskId WHERE i.LevelId<>d.LevelId)
 THROW 51128,''''Task level link is immutable.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_TaskTestCases_Version ON dbo.TaskTestCases AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.CodeSubmissions s WHERE s.TaskId=t.TaskId))
 THROW 51129,''''Tests in published/submitted task versions are immutable.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_TaskHints_Version ON dbo.TaskHints AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus=''''Published'''')
 THROW 51130,''''Hints in published task versions are immutable.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_CodingTaskTopics_Version ON dbo.CodingTaskTopics AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus=''''Published'''')
 THROW 51131,''''Concept links in published task versions are immutable.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.CodingTasks t ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId JOIN dbo.Courses c ON c.CourseId=l.CourseId JOIN dbo.Topics tp ON tp.TopicId=i.TopicId WHERE c.LanguageId<>tp.LanguageId)
 THROW 51132,''''Task topics must match course language.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_TaskWorkspaceState_Integrity ON dbo.TaskWorkspaceState AFTER INSERT,UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.CodingTasks t ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId WHERE e.CourseId<>l.CourseId OR e.ParticipationStatus<>''''Active'''' OR t.PublicationStatus<>''''Published'''')
 THROW 51133,''''Workspace requires an active matching course enrollment and published task.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.HintsRevealedCount>(SELECT COUNT(*) FROM dbo.TaskHints h WHERE h.TaskId=i.TaskId))
 THROW 51134,''''Revealed hints cannot exceed available hints.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_CodeSubmissions_Lifecycle ON dbo.CodeSubmissions AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.SubmissionId=d.SubmissionId WHERE i.SubmissionId IS NULL OR d.EvaluationStatus NOT IN(''''Pending'''',''''Running''''))
 THROW 51135,''''Submissions are append-only; terminal evaluations are immutable.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE d.SubmissionId IS NULL AND i.EvaluationStatus<>''''Pending'''')
 THROW 51136,''''A submission must begin Pending.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE i.EnrollmentId<>d.EnrollmentId OR i.TaskId<>d.TaskId OR i.CodeText COLLATE Latin1_General_100_BIN2<>d.CodeText COLLATE Latin1_General_100_BIN2 OR DATALENGTH(i.CodeText)<>DATALENGTH(d.CodeText) OR ISNULL(i.SubmittedAtUtc,''''19000101'''')<>ISNULL(d.SubmittedAtUtc,''''19000101'''') OR i.ExecutionEnvironment<>d.ExecutionEnvironment OR ISNULL(i.RuntimeVersion,N'''''''')<>ISNULL(d.RuntimeVersion,N'''''''') OR ISNULL(i.EvaluatorVersion,N'''''''')<>ISNULL(d.EvaluatorVersion,N'''''''') OR i.EvidenceOrigin<>d.EvidenceOrigin OR ISNULL(i.ImportedAtUtc,''''19000101'''')<>ISNULL(d.ImportedAtUtc,''''19000101''''))
 THROW 51137,''''Submitted code, ownership, environment and provenance are immutable.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE NOT((d.EvaluationStatus=''''Pending'''' AND i.EvaluationStatus IN(''''Running'''',''''Cancelled'''')) OR (d.EvaluationStatus=''''Running'''' AND i.EvaluationStatus IN(''''Completed'''',''''Error'''',''''Cancelled''''))))
 THROW 51138,''''Invalid evaluation status transition.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId WHERE e.CourseId<>l.CourseId OR e.ParticipationStatus<>''''Active'''' OR t.PublicationStatus<>''''Published'''')
 THROW 51139,''''Submission requires active matching enrollment and a published task.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i WHERE i.EvaluationStatus=''''Completed'''' AND (
 NOT EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId) OR EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId AND r.ExecutionStatus<>''''Success'''') OR (
 NOT EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId AND r.Passed=0) AND (SELECT COUNT(*) FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId)<>(SELECT COUNT(*) FROM dbo.TaskTestCases tc WHERE tc.TaskId=i.TaskId))))
 THROW 51140,''''Completed means successful execution with a failed test or all tests passed; runtime errors require Error.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE TRIGGER dbo.TR_SubmissionTestResults_Integrity ON dbo.SubmissionTestResults AFTER INSERT,UPDATE,DELETE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM deleted) THROW 51141,''''Executed case results are immutable.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.CodeSubmissions s WITH(UPDLOCK,HOLDLOCK) ON s.SubmissionId=i.SubmissionId WHERE s.EvaluationStatus<>''''Running'''')
 THROW 51142,''''Record executed cases only while evaluation is Running.'''',1;
 IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.TaskTestCases tc ON tc.TestCaseId=i.TestCaseId WHERE i.Passed=1 AND (i.ActualOutput COLLATE Latin1_General_100_BIN2<>tc.ExpectedOutput COLLATE Latin1_General_100_BIN2 OR DATALENGTH(i.ActualOutput)<>DATALENGTH(tc.ExpectedOutput)))
 THROW 51143,''''Passing output must exactly match the expected output; evaluator must also verify assertions.'''',1;
END;
'';
EXEC sys.sp_executesql N''
CREATE VIEW dbo.vAssessmentScores AS
 SELECT a.AttemptId,a.UserId,a.AssessmentId,a.Status,a.EvidenceOrigin,a.SubmittedAtUtc,
 COUNT(q.QuestionId) AS QuestionCount,
 SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END) AS CorrectCount,
 CAST(100.0*SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)/NULLIF(COUNT(q.QuestionId),0) AS decimal(5,2)) AS ScorePercent
 FROM dbo.AssessmentAttempts a JOIN dbo.Questions q ON q.AssessmentId=a.AssessmentId
 LEFT JOIN dbo.AttemptAnswers x ON x.AttemptId=a.AttemptId AND x.QuestionId=q.QuestionId
 LEFT JOIN dbo.QuestionOptions o ON o.OptionId=x.OptionId
 GROUP BY a.AttemptId,a.UserId,a.AssessmentId,a.Status,a.EvidenceOrigin,a.SubmittedAtUtc;
'';
EXEC sys.sp_executesql N''
CREATE VIEW dbo.vSubmissionOutcomes AS
 SELECT s.SubmissionId,s.EnrollmentId,s.TaskId,s.EvaluationStatus,s.EvidenceOrigin,
 tc.ExpectedCaseCount, r.ExecutedCaseCount,r.PassedCaseCount,r.FailedCaseCount,
 tc.ExpectedCaseCount-r.ExecutedCaseCount AS NotRunCaseCount,
 CAST(CASE WHEN s.EvaluationStatus=''''Completed'''' AND r.ExecutedCaseCount=tc.ExpectedCaseCount AND tc.ExpectedCaseCount>0 AND r.PassedCaseCount=tc.ExpectedCaseCount THEN 1 ELSE 0 END AS bit) AS AllTestsPassed
 FROM dbo.CodeSubmissions s
 CROSS APPLY(SELECT COUNT(*) ExpectedCaseCount FROM dbo.TaskTestCases t WHERE t.TaskId=s.TaskId)tc
 CROSS APPLY(SELECT COUNT(*) ExecutedCaseCount,COALESCE(SUM(CONVERT(int,Passed)),0) PassedCaseCount,COALESCE(SUM(CASE WHEN Passed=0 THEN 1 ELSE 0 END),0) FailedCaseCount FROM dbo.SubmissionTestResults x WHERE x.SubmissionId=s.SubmissionId)r;
'';
EXEC sys.sp_executesql N''
CREATE VIEW dbo.vEnrollmentProgress AS
 SELECT e.EnrollmentId,e.StudentId,e.CourseId,
 (SELECT COUNT(*) FROM dbo.Lessons l JOIN dbo.Levels lv ON lv.LevelId=l.LevelId WHERE lv.CourseId=e.CourseId AND l.PublicationStatus=''''Published'''') AS LessonCount,
 (SELECT COUNT(*) FROM dbo.LessonCompletions lc WHERE lc.EnrollmentId=e.EnrollmentId) AS CompletedLessonCount,
 (SELECT COUNT(DISTINCT t.TaskCode) FROM dbo.vSubmissionOutcomes o JOIN dbo.CodingTasks t ON t.TaskId=o.TaskId WHERE o.EnrollmentId=e.EnrollmentId AND o.AllTestsPassed=1) AS PassedTaskCount
 FROM dbo.Enrollments e;
'';
EXEC sys.sp_executesql N''
CREATE FUNCTION dbo.fnPercentage(@Numerator int,@Denominator int) RETURNS decimal(6,2) WITH SCHEMABINDING AS
BEGIN
 RETURN CASE WHEN @Denominator>0 AND @Numerator>=0 THEN CONVERT(decimal(6,2),100.0*@Numerator/@Denominator) ELSE NULL END;
END;
'';
EXEC sys.sp_executesql N''
CREATE FUNCTION dbo.fnStudentCourseSummary(@StudentId int) RETURNS TABLE AS RETURN
 SELECT p.EnrollmentId,c.Title,p.LessonCount,p.CompletedLessonCount,p.PassedTaskCount,
 dbo.fnPercentage(p.CompletedLessonCount,p.LessonCount) AS CompletionPercent
 FROM dbo.vEnrollmentProgress p JOIN dbo.Courses c ON c.CourseId=p.CourseId WHERE p.StudentId=@StudentId;
'';
EXEC sys.sp_executesql N''
CREATE PROCEDURE dbo.uspEnrollStudent @StudentId int,@CourseId int AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRANSACTION;
 IF NOT EXISTS(SELECT 1 FROM dbo.StudentProfiles p JOIN dbo.Users u WITH(UPDLOCK,HOLDLOCK) ON u.UserId=p.UserId WHERE p.UserId=@StudentId AND u.AccountStatus=''''Enabled'''') THROW 51200,''''An enabled student account is required.'''',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.Courses WITH(UPDLOCK,HOLDLOCK) WHERE CourseId=@CourseId AND PublicationStatus=''''Published'''') THROW 51201,''''An available published course is required.'''',1;
 IF EXISTS(SELECT 1 FROM dbo.Enrollments WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@StudentId AND CourseId=@CourseId) THROW 51202,''''Student is already enrolled.'''',1;
 INSERT dbo.Enrollments(StudentId,CourseId) VALUES(@StudentId,@CourseId);
 SELECT CONVERT(int,SCOPE_IDENTITY()) EnrollmentId;
 COMMIT;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
'';
EXEC sys.sp_executesql N''
CREATE PROCEDURE dbo.uspSubmitAssessment @AttemptId int AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRANSACTION;
 IF NOT EXISTS(SELECT 1 FROM dbo.AssessmentAttempts WITH(UPDLOCK,HOLDLOCK) WHERE AttemptId=@AttemptId AND Status=''''InProgress'''') THROW 51203,''''An in-progress attempt is required.'''',1;
 UPDATE dbo.AssessmentAttempts SET Status=''''Submitted'''',SubmittedAtUtc=SYSUTCDATETIME() WHERE AttemptId=@AttemptId;
 SELECT * FROM dbo.vAssessmentScores WHERE AttemptId=@AttemptId;
 COMMIT;
 END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;
END;
'';
EXEC sys.sp_executesql N''
CREATE PROCEDURE dbo.uspQueueCodeSubmission @EnrollmentId int,@TaskId int,@CodeText nvarchar(max),@ExecutionEnvironment nvarchar(100),@RuntimeVersion nvarchar(80)=NULL,@EvaluatorVersion nvarchar(80)=NULL AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment,RuntimeVersion,EvaluatorVersion) VALUES(@EnrollmentId,@TaskId,@CodeText,@ExecutionEnvironment,@RuntimeVersion,@EvaluatorVersion);
 SELECT CONVERT(int,SCOPE_IDENTITY()) SubmissionId;
END;
'';
EXEC sys.sp_executesql N''
/* Fictional academic seed. Source curriculum, no browser backup imported.
   Evaluation rows below are illustrative SQL fixtures, not Python runs. */
INSERT dbo.Users (Email,FullName,RoleCode) VALUES
(N''''seed-admin@example.invalid'''',N''''Academic administrator (fictional)'''',N''''Admin''''),
(N''''seed-student@example.invalid'''',N''''Academic learner (fictional)'''',N''''Student''''),
(N''''seed-learner2@example.invalid'''',N''''Second learner (fictional)'''',N''''Student'''');
INSERT dbo.Languages (Slug,Name,Description,ContentReadinessCode) VALUES
(N''''python'''',N''''Python'''',N''''Readable programming for scripting, automation and data.'''',N''''Ready''''),
(N''''csharp'''',N''''C#'''',N''''Structured applications with the .NET ecosystem.'''',N''''ComingSoon''''),
(N''''cpp'''',N''''C++'''',N''''Systems programming and performance-oriented applications.'''',N''''ComingSoon''''),
(N''''javascript'''',N''''JavaScript'''',N''''Interactive web experiences and general-purpose scripting.'''',N''''ComingSoon''''),
(N''''typescript'''',N''''TypeScript'''',N''''Typed JavaScript for maintainable applications.'''',N''''ComingSoon''''),
(N''''java'''',N''''Java'''',N''''Object-oriented applications on the Java platform.'''',N''''ComingSoon''''),
(N''''c'''',N''''C'''',N''''Low-level programming and systems foundations.'''',N''''ComingSoon''''),
(N''''go'''',N''''Go'''',N''''Simple, concurrent server and systems applications.'''',N''''ComingSoon''''),
(N''''rust'''',N''''Rust'''',N''''Memory-conscious systems programming.'''',N''''ComingSoon''''),
(N''''php'''',N''''PHP'''',N''''Server-side web application development.'''',N''''ComingSoon''''),
(N''''ruby'''',N''''Ruby'''',N''''Expressive scripting and web applications.'''',N''''ComingSoon''''),
(N''''swift'''',N''''Swift'''',N''''Applications for the Apple platform ecosystem.'''',N''''ComingSoon''''),
(N''''kotlin'''',N''''Kotlin'''',N''''Modern applications on Android and the JVM.'''',N''''ComingSoon'''');
INSERT dbo.StudentProfiles (UserId,PreferredLanguageId,ExperienceCode,LearningGoalCode) VALUES
(2,1,N''''Beginner'''',N''''Foundations''''),
(3,1,N''''SomeExperience'''',N''''Projects'''');
INSERT dbo.Courses (LanguageId,Slug,Title,Description,PublicationStatus,CreatedByUserId) VALUES
(1,N''''python-core'''',N''''Python learning path'''',N''''Three assessed levels from the active application.'''',N''''Published'''',1),
(2,N''''csharp-boundary-fixture'''',N''''C# integrity fixture'''',N''''Draft only; not an implemented assessed curriculum.'''',N''''Draft'''',1);
INSERT dbo.Levels (CourseId,Title,Description,SortOrder,PublicationStatus) VALUES
(1,N''''Python Foundations'''',N''''Python Foundations'''',1,N''''Published''''),
(1,N''''Logic and Control Flow'''',N''''Logic and Control Flow'''',2,N''''Published''''),
(1,N''''Functions and Collections'''',N''''Functions and Collections'''',3,N''''Published''''),
(2,N''''Unrelated course fixture'''',N''''For cross-course rejection checks only.'''',1,N''''Draft'''');
INSERT dbo.LevelObjectives (LevelId,ObjectiveNo,ObjectiveText) VALUES
(1,1,N''''Give a value a name.''''),
(1,2,N''''Different values, different types.''''),
(1,3,N''''Let your program communicate.''''),
(1,4,N''''Turn input into a calculation.''''),
(2,1,N''''Choose a branch with if.''''),
(2,2,N''''Combine conditions carefully.''''),
(2,3,N''''Repeat work for each value.''''),
(2,4,N''''Repeat until a condition changes.''''),
(3,1,N''''Give reusable work a name.''''),
(3,2,N''''Keep related values together.''''),
(3,3,N''''Look up a value by its key.''''),
(3,4,N''''Break a task into smaller steps.'''');
INSERT dbo.Topics (LanguageId,Code,Name) VALUES
(1,N''''variables'''',N''''Variables and values''''),
(1,N''''data-types'''',N''''Data types''''),
(1,N''''input-output'''',N''''Input and output''''),
(1,N''''numbers'''',N''''Working with numbers''''),
(1,N''''conditions'''',N''''Conditions and decisions''''),
(1,N''''boolean-logic'''',N''''Boolean logic''''),
(1,N''''for-loops'''',N''''For loops and ranges''''),
(1,N''''while-loops'''',N''''While loops''''),
(1,N''''functions'''',N''''Functions and return values''''),
(1,N''''lists'''',N''''Lists and indexing''''),
(1,N''''dictionaries'''',N''''Dictionaries''''),
(1,N''''problem-solving'''',N''''Build a small program'''');
INSERT dbo.Lessons (LevelId,TopicId,Slug,Title,Summary,Body,ExampleCode,PreparedOutput,EstimatedMinutes,SortOrder,PublicationStatus) VALUES
(1,1,N''''variables'''',N''''Variables and values'''',N''''Learn how a name refers to a value and how that value can change.'''',N''''A variable is a name that refers to a value in your program.

Use the equals sign (=) to assign a value. Choose names that describe the data.

Assigning another value to the same name changes what that name refers to.'''',N''''name = "Lujain"
print(name)

name = "Loji"
print(name)'''',N''''Lujain
Loji'''',10,1,N''''Published''''),
(1,2,N''''data-types'''',N''''Data types'''',N''''Recognize the types of common Python values.'''',N''''Python values have types. Text uses str, whole numbers use int, and decimal numbers commonly use float.

The bool type has two values: True and False.

Use type() to inspect the type of a value.'''',N''''name = "Lujain"
age = 21
height = 1.64
is_learning = True

print(type(age))
print(type(is_learning))'''',N''''<class ''''''''int''''''''>
<class ''''''''bool''''''''>'''',10,2,N''''Published''''),
(1,3,N''''input-output'''',N''''Input and output'''',N''''Read a value from the user and display a useful message.'''',N''''input() reads a line of text and returns it as a string.

print() displays values. An f-string lets you insert a value inside text using braces.

The example below assumes the user enters Lujain.'''',N''''name = input()
print(f"Hello, {name}!")'''',N''''Hello, Lujain!'''',10,3,N''''Published''''),
(1,4,N''''numbers'''',N''''Working with numbers'''',N''''Convert numeric input and calculate a result.'''',N''''Convert numeric text using int() for whole numbers or float() for decimal numbers.

Use +, -, * and / for arithmetic. Converting text that is not a valid number raises an error.

This example uses a price of 2.5 and a quantity of 3. The .2f format displays two decimal places.'''',N''''price = float(input())
quantity = int(input())
total = price * quantity

print(f"Total: {total:.2f}")'''',N''''Total: 7.50'''',15,4,N''''Published''''),
(2,5,N''''conditions'''',N''''Conditions and decisions'''',N''''An if statement runs its indented block only when its condition is true.'''',N''''An if statement runs its indented block only when its condition is true.

Use elif for another condition and else for the remaining cases. Python uses indentation to group statements.

Compare values with ==, !=, <, <=, > and >=. The equals sign = assigns a value; == compares two values.'''',N''''score = 72
if score >= 70:
    print("Passed")
else:
    print("Try again")'''',N''''Passed'''',15,1,N''''Published''''),
(2,6,N''''boolean-logic'''',N''''Boolean logic'''',N''''Use and when both conditions must be true, or when at least one must be true, and not to reverse a boolean.'''',N''''Use and when both conditions must be true, or when at least one must be true, and not to reverse a boolean.

Parentheses make combined conditions easier to read. Comparisons are evaluated before and/or.

Test values at the boundaries. A minimum age of 18 includes 18 when you use >=.'''',N''''age = 18
has_ticket = True
print(age >= 18 and has_ticket)
print(not has_ticket)'''',N''''True
False'''',15,2,N''''Published''''),
(2,7,N''''for-loops'''',N''''For loops and ranges'''',N''''A for loop visits each item in a sequence. range(1, 4) produces 1, 2 and 3: the stop value is excluded.'''',N''''A for loop visits each item in a sequence. range(1, 4) produces 1, 2 and 3: the stop value is excluded.

Place repeated statements inside the indented loop body.

An accumulator starts before the loop and is updated on each iteration. += adds to the existing value.'''',N''''total = 0
for number in range(1, 4):
    total += number
print(total)'''',N''''6'''',15,3,N''''Published''''),
(2,8,N''''while-loops'''',N''''While loops'''',N''''A while loop repeats while its condition remains true. It can execute zero times.'''',N''''A while loop repeats while its condition remains true. It can execute zero times.

Update the condition inside the loop so it eventually becomes false. Missing that update often creates an infinite loop.

Use break to exit a loop early. The coding workspace lets you stop a program and enforces a time limit.'''',N''''count = 3
while count > 0:
    print(count)
    count -= 1
print("Go")'''',N''''3
2
1
Go'''',15,4,N''''Published''''),
(3,9,N''''functions'''',N''''Functions and return values'''',N''''Define a function with def, give its inputs meaningful parameter names and indent its body.'''',N''''Define a function with def, give its inputs meaningful parameter names and indent its body.

return sends a result to the caller. print displays text and does not replace a return value.

Call a function with arguments. A function without an explicit return returns None.'''',N''''def double(number):
    return number * 2

result = double(4)
print(result)'''',N''''8'''',15,1,N''''Published''''),
(3,10,N''''lists'''',N''''Lists and indexing'''',N''''A list stores an ordered collection. Indexes start at zero: items[0] is the first item.'''',N''''A list stores an ordered collection. Indexes start at zero: items[0] is the first item.

append adds an item at the end. len returns the number of items. A negative index such as -1 selects from the end.

Loop over a list to process each value. Check that a list is not empty before accessing its first item.'''',N''''scores = [70, 85]
scores.append(90)
print(scores[0])
print(len(scores))'''',N''''70
3'''',15,2,N''''Published''''),
(3,11,N''''dictionaries'''',N''''Dictionaries'''',N''''A dictionary maps unique keys to values. Use square brackets to read an existing key.'''',N''''A dictionary maps unique keys to values. Use square brackets to read an existing key.

Assign to a key to add or update a value. Use .get(key, default) when the key might be missing.

Dictionary values can include lists, numbers, strings and other dictionaries.'''',N''''student = {"name": "Lujain", "score": 85}
student["score"] = 90
print(student["name"])
print(student.get("level", 1))'''',N''''Lujain
1'''',15,3,N''''Published''''),
(3,12,N''''problem-solving'''',N''''Build a small program'''',N''''Start with the required inputs and outputs, then split the program into functions you can test separately.'''',N''''Start with the required inputs and outputs, then split the program into functions you can test separately.

Use a list of dictionaries to represent several records with named fields.

Test normal cases, empty collections and boundary values. A passing sample alone does not prove that a program handles every case.'''',N''''def count_done(tasks):
    return sum(1 for task in tasks if task["done"])

tasks = [{"title": "Read", "done": True},
         {"title": "Code", "done": False}]
print(count_done(tasks))'''',N''''1'''',15,4,N''''Published'''');
INSERT dbo.LessonResources (LessonId,Title,Url,ResourceType,ResourceLanguage,SortOrder) VALUES
(1,N''''Elzero: Variables Part One'''',N''''https://www.youtube.com/watch?v=hQnZxqp3Q0Y'''',N''''Video'''',N''''Arabic'''',1),
(1,N''''Python documentation: Numbers and variable assignment'''',N''''https://docs.python.org/3/tutorial/introduction.html#numbers'''',N''''Documentation'''',N''''English'''',2),
(2,N''''Elzero: Some Data Types Overviews'''',N''''https://www.youtube.com/watch?v=43lT7k0Zws0'''',N''''Video'''',N''''Arabic'''',1),
(2,N''''Python documentation: Built-in types'''',N''''https://docs.python.org/3/library/stdtypes.html'''',N''''Documentation'''',N''''English'''',2),
(2,N''''Python documentation: type()'''',N''''https://docs.python.org/3/library/functions.html#type'''',N''''Documentation'''',N''''English'''',3),
(3,N''''DigiTech Academy: Input() and Print()'''',N''''https://www.youtube.com/watch?v=9h5Y7GpR9Oo'''',N''''Video'''',N''''Arabic (Darija)'''',1),
(3,N''''Python documentation: input()'''',N''''https://docs.python.org/3/library/functions.html#input'''',N''''Documentation'''',N''''English'''',2),
(3,N''''Python documentation: print()'''',N''''https://docs.python.org/3/library/functions.html#print'''',N''''Documentation'''',N''''English'''',3),
(3,N''''Python documentation: Formatted string literals'''',N''''https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals'''',N''''Documentation'''',N''''English'''',4),
(4,N''''Elzero: Numbers'''',N''''https://www.youtube.com/watch?v=x7fFnKVAzDI'''',N''''Video'''',N''''Arabic'''',1),
(4,N''''Elzero: Arithmetic Operators'''',N''''https://www.youtube.com/watch?v=prv7cVm2dxE'''',N''''Video'''',N''''Arabic'''',2),
(4,N''''Python documentation: Numbers and arithmetic'''',N''''https://docs.python.org/3/tutorial/introduction.html#numbers'''',N''''Documentation'''',N''''English'''',3),
(4,N''''Python documentation: int()'''',N''''https://docs.python.org/3/library/functions.html#int'''',N''''Documentation'''',N''''English'''',4),
(4,N''''Python documentation: float()'''',N''''https://docs.python.org/3/library/functions.html#float'''',N''''Documentation'''',N''''English'''',5),
(4,N''''Python documentation: Formatted string literals'''',N''''https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals'''',N''''Documentation'''',N''''English'''',6),
(5,N''''Elzero: Conditions and decisions'''',N''''https://www.youtube.com/watch?v=v8ZehXS3XF0'''',N''''Video'''',N''''Arabic'''',1),
(5,N''''Python documentation: Conditions and decisions'''',N''''https://docs.python.org/3/tutorial/controlflow.html#if-statements'''',N''''Documentation'''',N''''English'''',2),
(6,N''''Elzero: Boolean logic'''',N''''https://elzero.org/python-boolean-operators/'''',N''''Video'''',N''''Arabic'''',1),
(6,N''''Python documentation: Boolean logic'''',N''''https://docs.python.org/3/library/stdtypes.html#boolean-operations-and-or-not'''',N''''Documentation'''',N''''English'''',2),
(7,N''''Elzero: For loops and ranges'''',N''''https://www.youtube.com/watch?v=4YolrVX6f1Q'''',N''''Video'''',N''''Arabic'''',1),
(7,N''''Python documentation: For loops and ranges'''',N''''https://docs.python.org/3/tutorial/controlflow.html#for-statements'''',N''''Documentation'''',N''''English'''',2),
(8,N''''Elzero: While loops'''',N''''https://elzero.org/python-loop-while-and-else/'''',N''''Video'''',N''''Arabic'''',1),
(8,N''''Python documentation: While loops'''',N''''https://docs.python.org/3/reference/compound_stmts.html#while'''',N''''Documentation'''',N''''English'''',2),
(9,N''''Elzero: Functions and return values'''',N''''https://www.youtube.com/watch?v=Izwd_n-Ufqo'''',N''''Video'''',N''''Arabic'''',1),
(9,N''''Python documentation: Functions and return values'''',N''''https://docs.python.org/3/tutorial/controlflow.html#defining-functions'''',N''''Documentation'''',N''''English'''',2),
(10,N''''Elzero: Lists and indexing'''',N''''https://elzero.org/python-lists/'''',N''''Video'''',N''''Arabic'''',1),
(10,N''''Python documentation: Lists and indexing'''',N''''https://docs.python.org/3/tutorial/datastructures.html#more-on-lists'''',N''''Documentation'''',N''''English'''',2),
(11,N''''Elzero: Dictionaries'''',N''''https://elzero.org/python-dictionary/'''',N''''Video'''',N''''Arabic'''',1),
(11,N''''Python documentation: Dictionaries'''',N''''https://docs.python.org/3/tutorial/datastructures.html#dictionaries'''',N''''Documentation'''',N''''English'''',2),
(12,N''''Elzero: Functions refresher for your project'''',N''''https://www.youtube.com/watch?v=Izwd_n-Ufqo'''',N''''Video'''',N''''Arabic'''',1),
(12,N''''Python documentation: Build a small program'''',N''''https://docs.python.org/3/tutorial/datastructures.html#looping-techniques'''',N''''Documentation'''',N''''English'''',2);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''python-placement'''',1,N''''Placement'''',1,NULL,NULL,N''''python-placement'''',NULL);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''python-level-1'''',1,N''''LevelQuiz'''',NULL,1,NULL,N''''python-level-1'''',70);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''python-level-2'''',1,N''''LevelQuiz'''',NULL,2,NULL,N''''python-level-2'''',70);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''python-level-3'''',1,N''''LevelQuiz'''',NULL,3,NULL,N''''python-level-3'''',70);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-variables'''',1,N''''LessonCheck'''',NULL,NULL,1,N''''lesson-variables'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-data-types'''',1,N''''LessonCheck'''',NULL,NULL,2,N''''lesson-data-types'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-input-output'''',1,N''''LessonCheck'''',NULL,NULL,3,N''''lesson-input-output'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-numbers'''',1,N''''LessonCheck'''',NULL,NULL,4,N''''lesson-numbers'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-conditions'''',1,N''''LessonCheck'''',NULL,NULL,5,N''''lesson-conditions'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-boolean-logic'''',1,N''''LessonCheck'''',NULL,NULL,6,N''''lesson-boolean-logic'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-for-loops'''',1,N''''LessonCheck'''',NULL,NULL,7,N''''lesson-for-loops'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-while-loops'''',1,N''''LessonCheck'''',NULL,NULL,8,N''''lesson-while-loops'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-functions'''',1,N''''LessonCheck'''',NULL,NULL,9,N''''lesson-functions'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-lists'''',1,N''''LessonCheck'''',NULL,NULL,10,N''''lesson-lists'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-dictionaries'''',1,N''''LessonCheck'''',NULL,NULL,11,N''''lesson-dictionaries'''',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N''''lesson-problem-solving'''',1,N''''LessonCheck'''',NULL,NULL,12,N''''lesson-problem-solving'''',100);
INSERT dbo.Questions (AssessmentId,TopicId,Prompt,CodeSnippet,Explanation,SortOrder) VALUES
(1,1,N''''What is the type of this value?'''',N''''name = "Lujain"'''',NULL,1),
(1,1,N''''What does this code print?'''',N''''x = 3
x = 7
print(x)'''',NULL,2),
(1,4,N''''What does this code print?'''',N''''print(2 + 3 * 4)'''',NULL,3),
(1,3,N''''What is the type returned by input()?'''',N''''age = input("Enter your age: ")'''',NULL,4),
(1,5,N''''What does this code print?'''',N''''score = 70
if score >= 70:
    print("Passed")
else:
    print("Try again")'''',NULL,5),
(1,6,N''''What does this expression evaluate to?'''',N''''True and False'''',NULL,6),
(1,7,N''''Which values does this loop print?'''',N''''for number in range(1, 4):
    print(number)'''',NULL,7),
(1,7,N''''What is the final printed value?'''',N''''total = 0
for number in [1, 2, 3]:
    total += number
print(total)'''',NULL,8),
(1,9,N''''What does this code print?'''',N''''def double(number):
    return number * 2

print(double(4))'''',NULL,9),
(1,12,N''''What does this code print?'''',N''''def greet(name):
    return "Hello, " + name

print(greet("Lujain"))'''',NULL,10),
(2,1,N''''What is printed?'''',N''''count = 2
count = count + 3
print(count)'''',N''''The addition creates the integer 5, which is assigned back to count.'''',1),
(2,2,N''''Which value is a float?'''',NULL,N''''A decimal number without quotation marks is a float.'''',2),
(2,3,N''''What is printed for input 4?'''',N''''value = input()
print(value + "1")'''',N''''input returns a string, so + joins the two strings.'''',3),
(2,4,N''''What is printed?'''',N''''price = 1.5
quantity = 2
print(f"{price * quantity:.2f}")'''',N''''The product is 3.0; .2f displays two decimal places.'''',4),
(3,5,N''''What is printed?'''',N''''score = 70
if score > 70:
    print("A")
else:
    print("B")'''',N''''> excludes equality, so 70 > 70 is false.'''',1),
(3,6,N''''What is the value?'''',N''''not (True or False)'''',N''''True or False is True, then not reverses it.'''',2),
(3,7,N''''What is printed?'''',N''''total = 0
for number in range(2, 5):
    total += number
print(total)'''',N''''The loop adds 2, 3 and 4.'''',3),
(3,8,N''''What is printed?'''',N''''count = 1
while count < 4:
    count += 1
print(count)'''',N''''The last update makes count 4, so the next condition is false.'''',4),
(4,9,N''''What is printed?'''',N''''def add(a, b):
    return a + b
print(add(3, 4))'''',N''''return sends the sum back to print.'''',1),
(4,10,N''''What is printed?'''',N''''values = [2, 4]
values.append(6)
print(values[-1])'''',N''''Index -1 selects the last item, which is now 6.'''',2),
(4,11,N''''What is printed?'''',N''''task = {"done": False}
task["done"] = True
print(task["done"])'''',N''''Assigning to the existing key updates its value.'''',3),
(4,12,N''''Which extra test checks a boundary?'''',N''''def total(values):
    return sum(values)'''',N''''An empty collection checks the zero-item case.'''',4),
(5,1,N''''What does the second print(name) display?'''',N''''name = "Lujain"
print(name)

name = "Loji"
print(name)'''',N''''The second assignment makes name refer to "Loji".'''',1),
(6,2,N''''Which value has the type bool?'''',N''''name = "Lujain"
age = 21
height = 1.64
is_learning = True

print(type(age))
print(type(is_learning))'''',N''''True without quotation marks is a boolean. "True" is a string.'''',1),
(7,3,N''''What type does input() return?'''',N''''name = input()
print(f"Hello, {name}!")'''',N''''input() returns a string, even when the user enters digits.'''',1),
(8,4,N''''What is the result of int("3") * 2?'''',N''''price = float(input())
quantity = int(input())
total = price * quantity

print(f"Total: {total:.2f}")'''',N''''int("3") converts the text to the integer 3, and 3 * 2 is 6.'''',1),
(9,5,N''''What is printed when score is 69?'''',N''''score = 72
if score >= 70:
    print("Passed")
else:
    print("Try again")'''',N''''69 >= 70 is false, so the else branch runs.'''',1),
(10,6,N''''What does True and False evaluate to?'''',N''''age = 18
has_ticket = True
print(age >= 18 and has_ticket)
print(not has_ticket)'''',N''''and is true only when both operands are true.'''',1),
(11,7,N''''What does range(1, 4) produce?'''',N''''total = 0
for number in range(1, 4):
    total += number
print(total)'''',N''''The start is included and the stop is excluded.'''',1),
(12,8,N''''How many times does the loop body run when count starts at 0?'''',N''''count = 3
while count > 0:
    print(count)
    count -= 1
print("Go")'''',N''''The condition count > 0 is false before the first iteration.'''',1),
(13,9,N''''What value does double(5) return?'''',N''''def double(number):
    return number * 2

result = double(4)
print(result)'''',N''''The return expression multiplies the argument by two.'''',1),
(14,10,N''''Which expression gets the first score?'''',N''''scores = [70, 85]
scores.append(90)
print(scores[0])
print(len(scores))'''',N''''Python lists use zero-based indexing.'''',1),
(15,11,N''''What does student.get("missing", 0) return?'''',N''''student = {"name": "Lujain", "score": 85}
student["score"] = 90
print(student["name"])
print(student.get("level", 1))'''',N''''get returns its default argument when the key does not exist.'''',1),
(16,12,N''''Which extra case is most useful when testing count_done?'''',N''''def count_done(tasks):
    return sum(1 for task in tasks if task["done"])

tasks = [{"title": "Read", "done": True},
         {"title": "Code", "done": False}]
print(count_done(tasks))'''',N''''An empty collection checks a case that the normal example does not cover.'''',1);
INSERT dbo.QuestionOptions (QuestionId,OptionText,IsCorrect,SortOrder) VALUES
(1,N''''int'''',0,1),
(1,N''''str'''',1,2),
(1,N''''float'''',0,3),
(1,N''''bool'''',0,4),
(2,N''''3'''',0,1),
(2,N''''7'''',1,2),
(2,N''''10'''',0,3),
(2,N''''An error'''',0,4),
(3,N''''20'''',0,1),
(3,N''''14'''',1,2),
(3,N''''24'''',0,3),
(3,N''''9'''',0,4),
(4,N''''int'''',0,1),
(4,N''''float'''',0,2),
(4,N''''str'''',1,3),
(4,N''''bool'''',0,4),
(5,N''''Passed'''',1,1),
(5,N''''Try again'''',0,2),
(5,N''''Both messages'''',0,3),
(5,N''''Nothing'''',0,4),
(6,N''''True'''',0,1),
(6,N''''False'''',1,2),
(6,N''''None'''',0,3),
(6,N''''An error'''',0,4),
(7,N''''1, 2, 3'''',1,1),
(7,N''''1, 2, 3, 4'''',0,2),
(7,N''''0, 1, 2, 3'''',0,3),
(7,N''''4'''',0,4),
(8,N''''3'''',0,1),
(8,N''''5'''',0,2),
(8,N''''6'''',1,3),
(8,N''''0'''',0,4),
(9,N''''4'''',0,1),
(9,N''''6'''',0,2),
(9,N''''8'''',1,3),
(9,N''''An error'''',0,4),
(10,N''''Hello, name'''',0,1),
(10,N''''Hello, Lujain'''',1,2),
(10,N''''greet'''',0,3),
(10,N''''Nothing'''',0,4),
(11,N''''2'''',0,1),
(11,N''''5'''',1,2),
(11,N''''23'''',0,3),
(12,N''''"2.5"'''',0,1),
(12,N''''2'''',0,2),
(12,N''''2.5'''',1,3),
(13,N''''5'''',0,1),
(13,N''''41'''',1,2),
(13,N''''An error'''',0,3),
(14,N''''3'''',0,1),
(14,N''''3.00'''',1,2),
(14,N''''1.52'''',0,3),
(15,N''''A'''',0,1),
(15,N''''B'''',1,2),
(15,N''''A and B'''',0,3),
(16,N''''True'''',0,1),
(16,N''''False'''',1,2),
(16,N''''None'''',0,3),
(17,N''''9'''',1,1),
(17,N''''14'''',0,2),
(17,N''''5'''',0,3),
(18,N''''3'''',0,1),
(18,N''''4'''',1,2),
(18,N''''5'''',0,3),
(19,N''''34'''',0,1),
(19,N''''7'''',1,2),
(19,N''''None'''',0,3),
(20,N''''2'''',0,1),
(20,N''''3'''',0,2),
(20,N''''6'''',1,3),
(21,N''''False'''',0,1),
(21,N''''True'''',1,2),
(21,N''''done'''',0,3),
(22,N''''total([1, 2]) twice'''',0,1),
(22,N''''total([])'''',1,2),
(22,N''''Renaming total'''',0,3),
(23,N''''Lujain'''',0,1),
(23,N''''Loji'''',1,2),
(23,N''''name'''',0,3),
(24,N''''"True"'''',0,1),
(24,N''''21'''',0,2),
(24,N''''True'''',1,3),
(25,N''''str'''',1,1),
(25,N''''int'''',0,2),
(25,N''''bool'''',0,3),
(26,N''''"33"'''',0,1),
(26,N''''6'''',1,2),
(26,N''''An error'''',0,3),
(27,N''''Passed'''',0,1),
(27,N''''Try again'''',1,2),
(27,N''''Both messages'''',0,3),
(28,N''''True'''',0,1),
(28,N''''False'''',1,2),
(28,N''''None'''',0,3),
(29,N''''1, 2, 3'''',1,1),
(29,N''''1, 2, 3, 4'''',0,2),
(29,N''''0, 1, 2, 3'''',0,3),
(30,N''''0'''',1,1),
(30,N''''1'''',0,2),
(30,N''''Forever'''',0,3),
(31,N''''5'''',0,1),
(31,N''''10'''',1,2),
(31,N''''None'''',0,3),
(32,N''''scores[1]'''',0,1),
(32,N''''scores[0]'''',1,2),
(32,N''''scores.first'''',0,3),
(33,N''''An error'''',0,1),
(33,N''''0'''',1,2),
(33,N''''None'''',0,3),
(34,N''''Only the same example again'''',0,1),
(34,N''''An empty task list'''',1,2),
(34,N''''Changing the function name'''',0,3);
UPDATE dbo.Assessments SET PublicationStatus=''''Published'''';
INSERT dbo.Enrollments (StudentId,CourseId,EvidenceOrigin) VALUES
(2,1,N''''academic-seed''''),
(3,1,N''''academic-seed'''');
INSERT dbo.LessonCompletions (EnrollmentId,LessonId,CompletedAtUtc,CompletionMethod,EvidenceOrigin) VALUES
(1,1,N''''2026-11-05T08:00:00.000'''',N''''manual'''',N''''academic-seed''''),
(1,2,N''''2026-11-05T08:00:00.000'''',N''''manual'''',N''''academic-seed''''),
(1,3,N''''2026-11-05T08:00:00.000'''',N''''manual'''',N''''academic-seed''''),
(1,4,N''''2026-11-05T08:00:00.000'''',N''''manual'''',N''''academic-seed'''');
INSERT dbo.AssessmentAttempts (UserId,AssessmentId,EvidenceOrigin) VALUES
(2,1,N''''academic-seed''''),
(2,2,N''''academic-seed'''');
INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,OptionId,ResponseKind,AnsweredAtUtc)
 SELECT a.AttemptId,q.QuestionId,a.AssessmentId,CASE WHEN a.AttemptId=1 AND q.SortOrder=10 THEN NULL ELSE o.OptionId END,CASE WHEN a.AttemptId=1 AND q.SortOrder=10 THEN ''''unsure'''' ELSE ''''option'''' END,SYSUTCDATETIME()
 FROM dbo.AssessmentAttempts a JOIN dbo.Questions q ON q.AssessmentId=a.AssessmentId JOIN dbo.QuestionOptions o ON o.QuestionId=q.QuestionId AND o.IsCorrect=1;
UPDATE dbo.AssessmentAttempts SET Status=''''Submitted'''',SubmittedAtUtc=SYSUTCDATETIME();
INSERT dbo.CodingTasks (LevelId,TaskCode,VersionNo,TaskKind,Title,Description,RequirementsText,StarterCode,SampleInput,SampleOutput,ReferenceSolution,SolutionExplanation,VerificationCode,SortOrder) VALUES
(1,N''''student-profile'''',1,N''''Exercise'''',N''''Create a student profile'''',N''''Create three variables and display a student''''''''s details.'''',N''''1. Set name to "Lujain", age to 21 and track to "Python".
2. Print one labeled value per line.
3. Match the expected output exactly.
4. Do not print additional text.'''',N''''# Create the three variables

# Print the labeled values
'''',N'''''''',N''''Name: Lujain
Age: 21
Track: Python'''',N''''name = "Lujain"
age = 21
track = "Python"

print(f"Name: {name}")
print(f"Age: {age}")
print(f"Track: {track}")'''',N''''The variables store three different values. Each f-string adds the required label. Three print calls produce exactly three output lines.'''',N''''
assert name == "Lujain" and age == 21 and track == "Python", "Create the requested variables with the correct values."'''',1),
(1,N''''receipt'''',1,N''''Exercise'''',N''''Build a simple receipt'''',N''''Read a price and quantity, then calculate the total.'''',N''''1. Read the price from the first input line using float(input()).
2. Read the quantity from the second line using int(input()).
3. Use input() without prompt text.
4. Print Total: followed by the result with two decimal places.
5. Assume the inputs are valid non-negative numbers.'''',N''''# Read price and quantity

# Calculate the total

# Print the formatted result
'''',N''''2.5
3'''',N''''Total: 7.50'''',N''''price = float(input())
quantity = int(input())
total = price * quantity
print(f"Total: {total:.2f}")'''',N''''float preserves decimal prices, while int represents a whole quantity. Multiplication calculates the total for any test input. The format specifier .2f produces the required money format.'''',NULL,2),
(2,N''''grade-checker'''',1,N''''Exercise'''',N''''Check a grade'''',N''''Use a condition to classify a score.'''',N''''1. Read one integer score with input().
2. Print "Passed" for 70 or more; otherwise print "Try again".
3. Do not print input prompts.'''',N''''# Read a score and choose a message
'''',N''''70'''',N''''Passed'''',N''''score = int(input())
if score >= 70:
    print("Passed")
else:
    print("Try again")'''',N''''Converting input to an integer allows numeric comparison. The inclusive boundary >= handles 70 correctly. Only one branch runs, so the output contains one message.'''',NULL,1),
(2,N''''sum-numbers'''',1,N''''Exercise'''',N''''Sum a range'''',N''''Practise loops and accumulators.'''',N''''1. Read a non-negative integer n.
2. Calculate the sum of integers from 1 through n, including n.
3. Print only the sum.'''',N''''# Read n, accumulate a total and print it
'''',N''''5'''',N''''15'''',N''''n = int(input())
total = 0
for number in range(1, n + 1):
    total += number
print(total)'''',N''''The accumulator lives outside the loop. Each iteration adds the next number. Including n + 1 as the stop includes n in the sum. An empty range leaves total at zero.'''',NULL,2),
(3,N''''list-summary'''',1,N''''Exercise'''',N''''Summarise a list'''',N''''Combine functions and lists to process input.'''',N''''1. Read space-separated integers from a single input line.
2. Print the count on the first line and their sum on the second.
3. An empty input line should produce a count and sum of zero.'''',N''''# Read, split and convert the input values
# Print the count and total
'''',N''''2 4 6'''',N''''3
12'''',N''''values = [int(value) for value in input().split()]
print(len(values))
print(sum(values))'''',N''''split() returns an empty list for an empty line. The comprehension converts each available item. len and sum return zero for the empty case, so no special output branch is needed.'''',NULL,1),
(3,N''''task-manager'''',1,N''''FinalProject'''',N''''Build a Study Task Manager'''',N''''Your final project: model tasks and report how many are complete.'''',N''''1. Read an integer n, then n lines containing a task title and a status separated by a comma.
2. Status is "done" or "todo". Store records in a list of dictionaries.
3. Define count_done(tasks) to return the number of completed records. Each record uses the boolean key done.
4. Print "Completed: X/N" using the completed count and total. Handle n = 0.'''',N''''def count_done(tasks):
    # Return the number of completed tasks
    return 0

# Read the task records and print the summary
'''',N''''2
Read,done
Code,todo'''',N''''Completed: 1/2'''',N''''def count_done(tasks):
    count = 0
    for task in tasks:
        if task["done"]:
            count += 1
    return count

n = int(input())
tasks = []
for _ in range(n):
    title, status = input().split(",")
    tasks.append({"title": title, "done": status == "done"})

print(f"Completed: {count_done(tasks)}/{len(tasks)}")'''',N''''The function receives data and returns a count without reading input. Each dictionary keeps related fields together. Comparing status with done creates a boolean. An empty list produces Completed: 0/0 naturally.'''',N''''
assert callable(count_done), "Define count_done(tasks)."
assert count_done([]) == 0, "Handle an empty list."
assert count_done([{"done": True}, {"done": False}, {"done": True}]) == 2, "Count completed records."
assert isinstance(tasks, list) and all(isinstance(t, dict) and isinstance(t.get("done"), bool) for t in tasks), "Store tasks as dictionaries with boolean done values."'''',2);
INSERT dbo.CodingTaskTopics (TaskId,TopicId) VALUES
(1,1),
(1,3),
(2,4),
(2,3),
(3,5),
(3,6),
(4,7),
(4,8),
(5,10),
(5,9),
(6,12),
(6,11),
(6,9);
INSERT dbo.TaskTestCases (TaskId,CaseNo,InputText,ExpectedOutput,IsPublic) VALUES
(1,1,N'''''''',N''''Name: Lujain
Age: 21
Track: Python'''',1),
(2,1,N''''2.5
3'''',N''''Total: 7.50'''',1),
(2,2,N''''4
2'''',N''''Total: 8.00'''',1),
(2,3,N''''0
5'''',N''''Total: 0.00'''',1),
(2,4,N''''1.25
4'''',N''''Total: 5.00'''',1),
(3,1,N''''70'''',N''''Passed'''',1),
(3,2,N''''69'''',N''''Try again'''',1),
(3,3,N''''0'''',N''''Try again'''',1),
(3,4,N''''100'''',N''''Passed'''',1),
(4,1,N''''5'''',N''''15'''',1),
(4,2,N''''0'''',N''''0'''',1),
(4,3,N''''1'''',N''''1'''',1),
(4,4,N''''10'''',N''''55'''',1),
(5,1,N''''2 4 6'''',N''''3
12'''',1),
(5,2,N'''''''',N''''0
0'''',1),
(5,3,N''''-2 2'''',N''''2
0'''',1),
(5,4,N''''7'''',N''''1
7'''',1),
(6,1,N''''2
Read,done
Code,todo'''',N''''Completed: 1/2'''',1),
(6,2,N''''0'''',N''''Completed: 0/0'''',1),
(6,3,N''''1
Revise,todo'''',N''''Completed: 0/1'''',1),
(6,4,N''''2
Learn,done
Build,done'''',N''''Completed: 2/2'''',1);
INSERT dbo.TaskHints (TaskId,HintNo,HintText) VALUES
(1,1,N''''Separate the data from its display: create a name, an age and a track before printing anything.''''),
(1,2,N''''Use one print per line. An f-string such as f"Name: {name}" inserts the value while keeping the label.''''),
(2,1,N''''Read the price and quantity separately. input() returns text, so convert both values before multiplying them.''''),
(2,2,N''''Use float for the price and int for the quantity. Format the calculated total with :.2f so zero and whole-number totals also show two decimal places.''''),
(3,1,N''''There are only two outcomes. Use an if branch for scores that pass and an else branch for everything else.''''),
(3,2,N''''The pass mark includes 70 itself. Compare using >= rather than >, and print exactly the message requested.''''),
(4,1,N''''Start a running total at zero before the loop. Add each number to that same total.''''),
(4,2,N''''range excludes its stop value. To include n, use range(1, n + 1). For n = 0 the loop should execute zero times.''''),
(5,1,N''''Split the input line into separate pieces, then convert each piece to an integer.''''),
(5,2,N''''A list comprehension can build the numeric list. len(values) gives its size and sum(values) its total; both handle an empty list.''''),
(6,1,N''''Represent each record as a dictionary with title and done keys. Convert the status text to a boolean as you read the input.''''),
(6,2,N''''Keep counting separate from input: count_done(tasks) should loop over the records and count those whose done value is True. Use len(tasks) for the total.'''');
UPDATE dbo.CodingTasks SET PublicationStatus=''''Published'''';
INSERT dbo.TaskWorkspaceState (EnrollmentId,TaskId,DraftCode,DraftInput,HasAttempted,HintsRevealedCount,SolutionViewed) VALUES
(1,1,N''''# Mutable academic draft'''',N'''''''',1,1,0);
INSERT dbo.CodeSubmissions (EnrollmentId,TaskId,CodeText,ExecutionEnvironment,RuntimeVersion,EvaluatorVersion,EvidenceOrigin) VALUES
(1,1,N''''name = "Lujain"
age = 21
track = "Python"

print(f"Name: {name}")
print(f"Age: {age}")
print(f"Track: {track}")'''',N''''Academic SQL fixture'''',NULL,N''''fixture-v1'''',N''''academic-seed''''),
(1,2,N''''print("wrong")'''',N''''Academic SQL fixture'''',NULL,N''''fixture-v1'''',N''''academic-seed''''),
(1,2,N''''while True: pass'''',N''''Academic SQL fixture'''',NULL,N''''fixture-v1'''',N''''academic-seed'''');
UPDATE dbo.CodeSubmissions SET EvaluationStatus=''''Running'''';
INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 1,TestCaseId,TaskId,1,ExpectedOutput,NULL,NULL,''''Success'''' FROM dbo.TaskTestCases WHERE TaskId=1;
INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 2,TestCaseId,TaskId,0,N''''wrong'''',NULL,NULL,''''Success'''' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;
INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 3,TestCaseId,TaskId,0,N'''''''',N''''Illustrative timeout; Python was not executed.'''',NULL,''''Timeout'''' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;
UPDATE dbo.CodeSubmissions SET EvaluationStatus=''''Completed'''',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId IN(1,2);
UPDATE dbo.CodeSubmissions SET EvaluationStatus=''''Error'''',FinishedAtUtc=SYSUTCDATETIME(),EvaluationError=N''''Illustrative timeout'''' WHERE SubmissionId=3;
'';'+N' COMMIT TRANSACTION; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK TRANSACTION; THROW; END CATCH;';
EXEC sys.sp_executesql @Install;
PRINT N'Installed '+QUOTENAME(@DatabaseName)+N'. Run verification.sql explicitly in this database.';
