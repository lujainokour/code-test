/* CodeMentor AI - readable schema (23 tables, keys, constraints, views, functions, procedures, triggers).
   Assembled unchanged from tools/generated-ddl.sql and tools/business-rules.sql, which were recovered from the verified submission.sql.
   Structure only: no sample data. To create a real database use submission.sql. Do NOT run this on CodeMentorAI_Phase3_Test_20261105_R3.
   Run only in a new empty database if you want to try it. */

-- ===== PART 1: TABLES, PRIMARY KEYS, UNIQUE KEYS, DEFAULTS =====
CREATE TABLE dbo.[Users] (
    [UserId] int IDENTITY(1,1) NOT NULL,
    [Email] nvarchar(254) NOT NULL,
    [FullName] nvarchar(160) NOT NULL,
    [ReportedAge] tinyint NULL,
    [AgeRecordedAtUtc] datetime2(3) NULL,
    [RoleCode] varchar(10) NOT NULL CONSTRAINT [DF_Users_RoleCode] DEFAULT ('Student'),
    [AccountStatus] varchar(12) NOT NULL CONSTRAINT [DF_Users_AccountStatus] DEFAULT ('Enabled'),
    [ExternalAuthSubject] nvarchar(256) NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Users_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [UQ_Users_1] UNIQUE NONCLUSTERED (Email),
    CONSTRAINT [CK_Users_1] CHECK (RoleCode IN ('Student','Admin')),
    CONSTRAINT [CK_Users_2] CHECK (AccountStatus IN ('Enabled','Suspended')),
    CONSTRAINT [CK_Users_3] CHECK (Email = LOWER(LTRIM(RTRIM(Email))) COLLATE Latin1_General_100_BIN2 AND Email LIKE N'%_@_%._%' AND Email NOT LIKE N'% %'),
    CONSTRAINT [CK_Users_4] CHECK (LEN(LTRIM(RTRIM(FullName))) > 0),
    CONSTRAINT [CK_Users_5] CHECK ((ReportedAge IS NULL AND AgeRecordedAtUtc IS NULL) OR (ReportedAge IS NOT NULL AND ReportedAge BETWEEN 1 AND 120 AND AgeRecordedAtUtc IS NOT NULL))
);

CREATE TABLE dbo.[Languages] (
    [LanguageId] int IDENTITY(1,1) NOT NULL,
    [Slug] varchar(40) NOT NULL,
    [Name] nvarchar(80) NOT NULL,
    [Description] nvarchar(600) NOT NULL,
    [ContentReadinessCode] varchar(12) NOT NULL CONSTRAINT [DF_Languages_ContentReadinessCode] DEFAULT ('ComingSoon'),
    CONSTRAINT [PK_Languages] PRIMARY KEY CLUSTERED ([LanguageId]),
    CONSTRAINT [UQ_Languages_1] UNIQUE NONCLUSTERED (Slug),
    CONSTRAINT [UQ_Languages_2] UNIQUE NONCLUSTERED (Name),
    CONSTRAINT [CK_Languages_1] CHECK (ContentReadinessCode IN ('Ready','ComingSoon'))
);

CREATE TABLE dbo.[StudentProfiles] (
    [UserId] int NOT NULL,
    [PreferredLanguageId] int NOT NULL,
    [ExperienceCode] varchar(20) NOT NULL,
    [LearningGoalCode] varchar(30) NOT NULL,
    [UpdatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_StudentProfiles_UpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_StudentProfiles] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [CK_StudentProfiles_1] CHECK (ExperienceCode IN ('Beginner','SomeExperience','Experienced')),
    CONSTRAINT [CK_StudentProfiles_2] CHECK (LearningGoalCode IN ('Foundations','Projects','Career')),
    CONSTRAINT [FK_StudentProfiles_1_Users_UserId] FOREIGN KEY (UserId) REFERENCES dbo.[Users] (UserId),
    CONSTRAINT [FK_StudentProfiles_2_Languages_PreferredLanguageId] FOREIGN KEY (PreferredLanguageId) REFERENCES dbo.[Languages] (LanguageId)
);

CREATE TABLE dbo.[Courses] (
    [CourseId] int IDENTITY(1,1) NOT NULL,
    [LanguageId] int NOT NULL,
    [Slug] varchar(80) NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Courses_PublicationStatus] DEFAULT ('Draft'),
    [CreatedByUserId] int NULL,
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Courses_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ContentVersion] rowversion NOT NULL,
    CONSTRAINT [PK_Courses] PRIMARY KEY CLUSTERED ([CourseId]),
    CONSTRAINT [UQ_Courses_1] UNIQUE NONCLUSTERED (Slug),
    CONSTRAINT [CK_Courses_1] CHECK (PublicationStatus IN ('Draft','Published','Archived')),
    CONSTRAINT [FK_Courses_1_Languages_LanguageId] FOREIGN KEY (LanguageId) REFERENCES dbo.[Languages] (LanguageId),
    CONSTRAINT [FK_Courses_2_Users_CreatedByUserId] FOREIGN KEY (CreatedByUserId) REFERENCES dbo.[Users] (UserId)
);

CREATE TABLE dbo.[Levels] (
    [LevelId] int IDENTITY(1,1) NOT NULL,
    [CourseId] int NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [SortOrder] smallint NOT NULL,
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Levels_PublicationStatus] DEFAULT ('Draft'),
    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Levels_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Levels] PRIMARY KEY CLUSTERED ([LevelId]),
    CONSTRAINT [UQ_Levels_1] UNIQUE NONCLUSTERED (CourseId, SortOrder),
    CONSTRAINT [CK_Levels_1] CHECK (SortOrder > 0),
    CONSTRAINT [CK_Levels_2] CHECK (PublicationStatus IN ('Draft','Published','Archived')),
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
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Lessons_PublicationStatus] DEFAULT ('Draft'),
    [UpdatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Lessons_UpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Lessons] PRIMARY KEY CLUSTERED ([LessonId]),
    CONSTRAINT [UQ_Lessons_1] UNIQUE NONCLUSTERED (LevelId, Slug),
    CONSTRAINT [UQ_Lessons_2] UNIQUE NONCLUSTERED (LevelId, SortOrder),
    CONSTRAINT [CK_Lessons_1] CHECK (EstimatedMinutes > 0),
    CONSTRAINT [CK_Lessons_2] CHECK (SortOrder > 0),
    CONSTRAINT [CK_Lessons_3] CHECK (PublicationStatus IN ('Draft','Published','Archived')),
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
    CONSTRAINT [CK_LessonResources_2] CHECK (ResourceType IN ('Video','Documentation','Other')),
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
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Assessments_PublicationStatus] DEFAULT ('Draft'),
    CONSTRAINT [PK_Assessments] PRIMARY KEY CLUSTERED ([AssessmentId]),
    CONSTRAINT [UQ_Assessments_1] UNIQUE NONCLUSTERED (LogicalCode, VersionNo),
    CONSTRAINT [CK_Assessments_1] CHECK (VersionNo > 0),
    CONSTRAINT [CK_Assessments_2] CHECK ((Kind='Placement' AND ScopeCourseId IS NOT NULL AND ScopeLevelId IS NULL AND ScopeLessonId IS NULL AND PassPercent IS NULL) OR (Kind='LevelQuiz' AND ScopeCourseId IS NULL AND ScopeLevelId IS NOT NULL AND ScopeLessonId IS NULL AND PassPercent IS NOT NULL AND PassPercent BETWEEN 0 AND 100) OR (Kind='LessonCheck' AND ScopeCourseId IS NULL AND ScopeLevelId IS NULL AND ScopeLessonId IS NOT NULL AND PassPercent IS NOT NULL AND PassPercent=100)),
    CONSTRAINT [CK_Assessments_3] CHECK (PublicationStatus IN ('Draft','Published')),
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
    [Status] varchar(12) NOT NULL CONSTRAINT [DF_AssessmentAttempts_Status] DEFAULT ('InProgress'),
    [CurrentQuestionNo] smallint NULL,
    [StartedAtUtc] datetime2(3) NULL CONSTRAINT [DF_AssessmentAttempts_StartedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [SubmittedAtUtc] datetime2(3) NULL,
    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_AssessmentAttempts_EvidenceOrigin] DEFAULT ('server'),
    [ImportedAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_AssessmentAttempts] PRIMARY KEY CLUSTERED ([AttemptId]),
    CONSTRAINT [UQ_AssessmentAttempts_1] UNIQUE NONCLUSTERED (AttemptId, AssessmentId),
    CONSTRAINT [CK_AssessmentAttempts_1] CHECK (Status IN ('InProgress','Submitted','Cancelled')),
    CONSTRAINT [CK_AssessmentAttempts_2] CHECK (CurrentQuestionNo IS NULL OR CurrentQuestionNo > 0),
    CONSTRAINT [CK_AssessmentAttempts_3] CHECK ((Status='Submitted' AND (EvidenceOrigin='browser-import' OR SubmittedAtUtc IS NOT NULL) AND (SubmittedAtUtc IS NULL OR StartedAtUtc IS NULL OR SubmittedAtUtc >= StartedAtUtc)) OR (Status <> 'Submitted' AND SubmittedAtUtc IS NULL)),
    CONSTRAINT [CK_AssessmentAttempts_4] CHECK (EvidenceOrigin IN ('server','academic-seed','browser-import')),
    CONSTRAINT [CK_AssessmentAttempts_5] CHECK (EvidenceOrigin='browser-import' OR StartedAtUtc IS NOT NULL),
    CONSTRAINT [CK_AssessmentAttempts_6] CHECK ((EvidenceOrigin='browser-import' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>'browser-import' AND ImportedAtUtc IS NULL)),
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
    CONSTRAINT [CK_AttemptAnswers_1] CHECK ((ResponseKind='option' AND OptionId IS NOT NULL) OR (ResponseKind='unsure' AND OptionId IS NULL)),
    CONSTRAINT [FK_AttemptAnswers_1_Answer_AttemptVersion] FOREIGN KEY (AttemptId, AssessmentId) REFERENCES dbo.[AssessmentAttempts] (AttemptId, AssessmentId),
    CONSTRAINT [FK_AttemptAnswers_2_Answer_QuestionVersion] FOREIGN KEY (AssessmentId, QuestionId) REFERENCES dbo.[Questions] (AssessmentId, QuestionId),
    CONSTRAINT [FK_AttemptAnswers_3_Answer_QuestionOption] FOREIGN KEY (QuestionId, OptionId) REFERENCES dbo.[QuestionOptions] (QuestionId, OptionId)
);

CREATE TABLE dbo.[Enrollments] (
    [EnrollmentId] int IDENTITY(1,1) NOT NULL,
    [StudentId] int NOT NULL,
    [CourseId] int NOT NULL,
    [EnrolledAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Enrollments_EnrolledAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ParticipationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Enrollments_ParticipationStatus] DEFAULT ('Active'),
    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_Enrollments_EvidenceOrigin] DEFAULT ('server'),
    CONSTRAINT [PK_Enrollments] PRIMARY KEY CLUSTERED ([EnrollmentId]),
    CONSTRAINT [UQ_Enrollments_1] UNIQUE NONCLUSTERED (StudentId, CourseId),
    CONSTRAINT [CK_Enrollments_1] CHECK (ParticipationStatus IN ('Active','Paused','Completed')),
    CONSTRAINT [CK_Enrollments_2] CHECK (EvidenceOrigin IN ('server','academic-seed','browser-import')),
    CONSTRAINT [FK_Enrollments_1_StudentProfiles_StudentId] FOREIGN KEY (StudentId) REFERENCES dbo.[StudentProfiles] (UserId),
    CONSTRAINT [FK_Enrollments_2_Courses_CourseId] FOREIGN KEY (CourseId) REFERENCES dbo.[Courses] (CourseId)
);

CREATE TABLE dbo.[LessonCompletions] (
    [EnrollmentId] int NOT NULL,
    [LessonId] int NOT NULL,
    [CompletedAtUtc] datetime2(3) NULL,
    [CompletionMethod] varchar(16) NOT NULL,
    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_LessonCompletions_EvidenceOrigin] DEFAULT ('server'),
    [ImportedAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_LessonCompletions] PRIMARY KEY CLUSTERED ([EnrollmentId], [LessonId]),
    CONSTRAINT [CK_LessonCompletions_1] CHECK (CompletionMethod IN ('manual','correct-answer','imported')),
    CONSTRAINT [CK_LessonCompletions_2] CHECK (EvidenceOrigin IN ('server','academic-seed','browser-import')),
    CONSTRAINT [CK_LessonCompletions_3] CHECK ((EvidenceOrigin='browser-import' AND CompletionMethod='imported' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>'browser-import' AND CompletionMethod<>'imported' AND ImportedAtUtc IS NULL AND CompletedAtUtc IS NOT NULL)),
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
    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_CodingTasks_PublicationStatus] DEFAULT ('Draft'),
    CONSTRAINT [PK_CodingTasks] PRIMARY KEY CLUSTERED ([TaskId]),
    CONSTRAINT [UQ_CodingTasks_1] UNIQUE NONCLUSTERED (TaskCode, VersionNo),
    CONSTRAINT [CK_CodingTasks_1] CHECK (VersionNo > 0),
    CONSTRAINT [CK_CodingTasks_2] CHECK (SortOrder > 0),
    CONSTRAINT [CK_CodingTasks_3] CHECK (TaskKind IN ('Exercise','FinalProject')),
    CONSTRAINT [CK_CodingTasks_4] CHECK (PublicationStatus IN ('Draft','Published')),
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
    [EvaluationStatus] varchar(12) NOT NULL CONSTRAINT [DF_CodeSubmissions_EvaluationStatus] DEFAULT ('Pending'),
    [FinishedAtUtc] datetime2(3) NULL,
    [EvaluationError] nvarchar(2000) NULL,
    [ExecutionEnvironment] nvarchar(100) NOT NULL,
    [RuntimeVersion] nvarchar(80) NULL,
    [EvaluatorVersion] nvarchar(80) NULL,
    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_CodeSubmissions_EvidenceOrigin] DEFAULT ('server'),
    [ImportedAtUtc] datetime2(3) NULL,
    CONSTRAINT [PK_CodeSubmissions] PRIMARY KEY CLUSTERED ([SubmissionId]),
    CONSTRAINT [UQ_CodeSubmissions_1] UNIQUE NONCLUSTERED (SubmissionId, TaskId),
    CONSTRAINT [CK_CodeSubmissions_1] CHECK (EvaluationStatus IN ('Pending','Running','Completed','Error','Cancelled')),
    CONSTRAINT [CK_CodeSubmissions_2] CHECK (EvidenceOrigin IN ('server','academic-seed','browser-import')),
    CONSTRAINT [CK_CodeSubmissions_3] CHECK (EvidenceOrigin='browser-import' OR SubmittedAtUtc IS NOT NULL),
    CONSTRAINT [CK_CodeSubmissions_4] CHECK ((EvaluationStatus IN ('Pending','Running') AND FinishedAtUtc IS NULL) OR (EvaluationStatus IN ('Completed','Error','Cancelled') AND (EvidenceOrigin='browser-import' OR FinishedAtUtc IS NOT NULL) AND (FinishedAtUtc IS NULL OR SubmittedAtUtc IS NULL OR FinishedAtUtc >= SubmittedAtUtc))),
    CONSTRAINT [CK_CodeSubmissions_5] CHECK ((EvaluationStatus='Error' AND EvaluationError IS NOT NULL) OR (EvaluationStatus<>'Error' AND EvaluationError IS NULL)),
    CONSTRAINT [CK_CodeSubmissions_6] CHECK ((EvidenceOrigin='browser-import' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>'browser-import' AND ImportedAtUtc IS NULL)),
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
    CONSTRAINT [CK_SubmissionTestResults_2] CHECK ((ExecutionStatus='Success' AND ErrorText IS NULL) OR (ExecutionStatus IN ('RuntimeError','Timeout') AND Passed=0 AND ErrorText IS NOT NULL)),
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

GO

-- ===== PART 2: FOREIGN KEYS, CHECKS, INDEXES, VIEWS, FUNCTIONS, PROCEDURES, TRIGGERS =====

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

