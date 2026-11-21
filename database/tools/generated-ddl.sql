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
