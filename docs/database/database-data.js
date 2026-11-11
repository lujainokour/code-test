/* Generated from live SQL Server sys.* metadata after passing SQL tests. */
window.databaseData = {
  "title": "CodeMentor AI",
  "databaseName": "CodeMentorAI_Phase3_Test_20261105_R3",
  "serverVersion": "17.0.1000.7",
  "verifiedAtUtc": "2026-11-05T02:56:42.3206862Z",
  "sqlTests": {
    "passed": 102,
    "failed": 0
  },
  "counts": {
    "tables": 23,
    "columns": 169,
    "primaryKeys": 23,
    "foreignKeys": 37,
    "relationships": 37,
    "views": 3,
    "functions": 2,
    "procedures": 3,
    "triggers": 20,
    "indexes": 66
  },
  "layout": [
    [
      "Users",
      "StudentProfiles",
      "Languages",
      "Courses"
    ],
    [
      "Levels",
      "LevelObjectives",
      "Topics",
      "Lessons",
      "LessonResources"
    ],
    [
      "Assessments",
      "Questions",
      "QuestionOptions"
    ],
    [
      "AssessmentAttempts",
      "AttemptAnswers",
      "Enrollments",
      "LessonCompletions"
    ],
    [
      "CodingTasks",
      "CodingTaskTopics",
      "TaskTestCases",
      "TaskHints"
    ],
    [
      "TaskWorkspaceState",
      "CodeSubmissions",
      "SubmissionTestResults"
    ]
  ],
  "tables": [
    {
      "name": "AssessmentAttempts",
      "columns": [
        {
          "name": "AttemptId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "UserId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "AssessmentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "Status",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('InProgress')",
          "ordinal": 4,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "CurrentQuestionNo",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "StartedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 6,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SubmittedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "EvidenceOrigin",
          "baseType": "varchar",
          "maxLength": 20,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('server')",
          "ordinal": 8,
          "type": "varchar(20)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ImportedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 9,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_AssessmentAttempts",
          "type": "PK",
          "columns": [
            {
              "name": "AttemptId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_AssessmentAttempts_1",
          "type": "UQ",
          "columns": [
            {
              "name": "AttemptId",
              "ordinal": 1
            },
            {
              "name": "AssessmentId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_AssessmentAttempts_1_StudentProfiles_UserId",
          "parent": "StudentProfiles",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "UserId",
              "parentColumn": "UserId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_AssessmentAttempts_2_Assessments_AssessmentId",
          "parent": "Assessments",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "AssessmentId",
              "parentColumn": "AssessmentId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_AssessmentAttempts_1",
          "definition": "([Status]='Cancelled' OR [Status]='Submitted' OR [Status]='InProgress')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_AssessmentAttempts_2",
          "definition": "([CurrentQuestionNo] IS NULL OR [CurrentQuestionNo]>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_AssessmentAttempts_3",
          "definition": "([Status]='Submitted' AND ([EvidenceOrigin]='browser-import' OR [SubmittedAtUtc] IS NOT NULL) AND ([SubmittedAtUtc] IS NULL OR [StartedAtUtc] IS NULL OR [SubmittedAtUtc]>=[StartedAtUtc]) OR [Status]<>'Submitted' AND [SubmittedAtUtc] IS NULL)",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_AssessmentAttempts_4",
          "definition": "([EvidenceOrigin]='browser-import' OR [EvidenceOrigin]='academic-seed' OR [EvidenceOrigin]='server')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_AssessmentAttempts_5",
          "definition": "([EvidenceOrigin]='browser-import' OR [StartedAtUtc] IS NOT NULL)",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_AssessmentAttempts_6",
          "definition": "([EvidenceOrigin]='browser-import' AND [ImportedAtUtc] IS NOT NULL OR [EvidenceOrigin]<>'browser-import' AND [ImportedAtUtc] IS NULL)",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_AssessmentAttempts",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "AttemptId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_AssessmentAttempts_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "AttemptId",
              "ordinal": 1
            },
            {
              "name": "AssessmentId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_AssessmentAttempts_UserId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "UserId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "IX_AssessmentAttempts_AssessmentId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "AssessmentId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_AssessmentAttempts_Lifecycle",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_AssessmentAttempts_Lifecycle ON dbo.AssessmentAttempts AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.AttemptId=d.AttemptId WHERE i.AttemptId IS NULL OR d.Status<>'InProgress')\n THROW 51118,'Attempts cannot be deleted; terminal attempts are immutable.',1;\n IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.AttemptId=i.AttemptId WHERE d.AttemptId IS NULL AND i.Status<>'InProgress')\n THROW 51119,'Attempts must start InProgress.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.AttemptId=i.AttemptId WHERE i.UserId<>d.UserId OR i.AssessmentId<>d.AssessmentId OR ISNULL(i.StartedAtUtc,'19000101')<>ISNULL(d.StartedAtUtc,'19000101') OR i.EvidenceOrigin<>d.EvidenceOrigin OR ISNULL(i.ImportedAtUtc,'19000101')<>ISNULL(d.ImportedAtUtc,'19000101'))\n THROW 51120,'Attempt owner, assessment version, start time and provenance are immutable.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=i.AssessmentId WHERE a.PublicationStatus<>'Published')\n THROW 51121,'Only published assessments may be attempted.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId LEFT JOIN dbo.Lessons ls ON ls.LessonId=a.ScopeLessonId JOIN dbo.Levels lv ON lv.LevelId=COALESCE(a.ScopeLevelId,ls.LevelId) WHERE a.Kind<>'Placement' AND NOT EXISTS(SELECT 1 FROM dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) WHERE e.StudentId=i.UserId AND e.CourseId=lv.CourseId AND e.ParticipationStatus='Active'))\n THROW 51122,'Lesson and level attempts require active enrollment; placement may precede enrollment.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId WHERE a.Kind='LevelQuiz' AND EXISTS(SELECT 1 FROM dbo.Lessons ls WHERE ls.LevelId=a.ScopeLevelId AND ls.PublicationStatus='Published' AND NOT EXISTS(SELECT 1 FROM dbo.LessonCompletions lc JOIN dbo.Enrollments e ON e.EnrollmentId=lc.EnrollmentId WHERE lc.LessonId=ls.LessonId AND e.StudentId=i.UserId)))\n THROW 51123,'Complete the published lessons in the level before attempting its quiz.',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.Status='Submitted' AND EXISTS(SELECT 1 FROM dbo.Questions q WHERE q.AssessmentId=i.AssessmentId AND NOT EXISTS(SELECT 1 FROM dbo.AttemptAnswers x WITH(UPDLOCK,HOLDLOCK) WHERE x.AttemptId=i.AttemptId AND x.QuestionId=q.QuestionId)))\n THROW 51124,'Submission requires one response to every question; unsure is allowed.',1;\nEND;\n"
        }
      ],
      "group": "Assessments",
      "description": "Each individual attempt, preserving chronology rather than only the current best result.",
      "reasonArabic": "يحفظ كل محاولة على حدة حتى نرى التحسن بمرور الزمن؛ لا يمكن اختراع محاولات قديمة من أفضل درجة وآخر درجة فقط.",
      "relationshipExplanation": "User 1 → many attempts; assessment version 1 → many attempts; attempt 1 → many answer rows.",
      "pk": [
        "AttemptId"
      ],
      "unique": [
        {
          "name": "UQ_AssessmentAttempts_1",
          "columns": [
            "AttemptId",
            "AssessmentId"
          ]
        }
      ]
    },
    {
      "name": "Assessments",
      "columns": [
        {
          "name": "AssessmentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "LogicalCode",
          "baseType": "varchar",
          "maxLength": 100,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "varchar(100)",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "VersionNo",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "Kind",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ScopeCourseId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "ScopeLevelId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 6,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "ScopeLessonId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "Title",
          "baseType": "nvarchar",
          "maxLength": 400,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 8,
          "type": "nvarchar(200)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "PassPercent",
          "baseType": "decimal",
          "maxLength": 5,
          "precision": 5,
          "scale": 2,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 9,
          "type": "decimal(5,2)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "PublicationStatus",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Draft')",
          "ordinal": 10,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_Assessments",
          "type": "PK",
          "columns": [
            {
              "name": "AssessmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Assessments_1",
          "type": "UQ",
          "columns": [
            {
              "name": "LogicalCode",
              "ordinal": 1
            },
            {
              "name": "VersionNo",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_Assessments_1_Courses_ScopeCourseId",
          "parent": "Courses",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "ScopeCourseId",
              "parentColumn": "CourseId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_Assessments_2_Levels_ScopeLevelId",
          "parent": "Levels",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "ScopeLevelId",
              "parentColumn": "LevelId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_Assessments_3_Lessons_ScopeLessonId",
          "parent": "Lessons",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "ScopeLessonId",
              "parentColumn": "LessonId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Assessments_1",
          "definition": "([VersionNo]>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Assessments_2",
          "definition": "([Kind]='Placement' AND [ScopeCourseId] IS NOT NULL AND [ScopeLevelId] IS NULL AND [ScopeLessonId] IS NULL AND [PassPercent] IS NULL OR [Kind]='LevelQuiz' AND [ScopeCourseId] IS NULL AND [ScopeLevelId] IS NOT NULL AND [ScopeLessonId] IS NULL AND [PassPercent] IS NOT NULL AND ([PassPercent]>=(0) AND [PassPercent]<=(100)) OR [Kind]='LessonCheck' AND [ScopeCourseId] IS NULL AND [ScopeLevelId] IS NULL AND [ScopeLessonId] IS NOT NULL AND [PassPercent] IS NOT NULL AND [PassPercent]=(100))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Assessments_3",
          "definition": "([PublicationStatus]='Published' OR [PublicationStatus]='Draft')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Assessments",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "AssessmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Assessments_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "LogicalCode",
              "ordinal": 1
            },
            {
              "name": "VersionNo",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_Assessments_ScopeCourseId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "ScopeCourseId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "IX_Assessments_ScopeLevelId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "ScopeLevelId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "IX_Assessments_ScopeLessonId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "ScopeLessonId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_Assessments_Version",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_Assessments_Version ON dbo.Assessments AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted d WHERE d.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts a WITH(UPDLOCK,HOLDLOCK) WHERE a.AssessmentId=d.AssessmentId))\n THROW 51113,'Published/attempted assessment versions are immutable; create a new version.',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublicationStatus='Published' AND (\n NOT EXISTS(SELECT 1 FROM dbo.Questions q WHERE q.AssessmentId=i.AssessmentId) OR EXISTS(\n SELECT q.QuestionId FROM dbo.Questions q LEFT JOIN dbo.QuestionOptions o ON o.QuestionId=q.QuestionId WHERE q.AssessmentId=i.AssessmentId GROUP BY q.QuestionId HAVING COUNT(o.OptionId)<2 OR SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)<>1)))\n THROW 51114,'Publication requires questions with at least two options and exactly one correct option each.',1;\nEND;\n"
        }
      ],
      "group": "Assessments",
      "description": "One immutable version of a placement test, level quiz, or lesson knowledge check.",
      "reasonArabic": "جدول موحد لأنواع الأسئلة الحالية يمنع تكرار تصميم الاختبارات؛ تحديد المستوى للتشخيص ولا نفترض أن له شرط نجاح أو أنه يفتح المستويات.",
      "relationshipExplanation": "Exactly one scope is present: course for placement, level for quiz, lesson for check. One version has many questions/attempts.",
      "pk": [
        "AssessmentId"
      ],
      "unique": [
        {
          "name": "UQ_Assessments_1",
          "columns": [
            "LogicalCode",
            "VersionNo"
          ]
        }
      ]
    },
    {
      "name": "AttemptAnswers",
      "columns": [
        {
          "name": "AttemptId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "QuestionId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "AssessmentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "OptionId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "ResponseKind",
          "baseType": "varchar",
          "maxLength": 8,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "varchar(8)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "AnsweredAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 6,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_AttemptAnswers",
          "type": "PK",
          "columns": [
            {
              "name": "AttemptId",
              "ordinal": 1
            },
            {
              "name": "QuestionId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_AttemptAnswers_1_Answer_AttemptVersion",
          "parent": "AssessmentAttempts",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "AttemptId",
              "parentColumn": "AttemptId",
              "ordinal": 1
            },
            {
              "childColumn": "AssessmentId",
              "parentColumn": "AssessmentId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "FK_AttemptAnswers_2_Answer_QuestionVersion",
          "parent": "Questions",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "AssessmentId",
              "parentColumn": "AssessmentId",
              "ordinal": 1
            },
            {
              "childColumn": "QuestionId",
              "parentColumn": "QuestionId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "FK_AttemptAnswers_3_Answer_QuestionOption",
          "parent": "QuestionOptions",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "QuestionId",
              "parentColumn": "QuestionId",
              "ordinal": 1
            },
            {
              "childColumn": "OptionId",
              "parentColumn": "OptionId",
              "ordinal": 2
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_AttemptAnswers_1",
          "definition": "([ResponseKind]='option' AND [OptionId] IS NOT NULL OR [ResponseKind]='unsure' AND [OptionId] IS NULL)",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_AttemptAnswers",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "AttemptId",
              "ordinal": 1
            },
            {
              "name": "QuestionId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_AttemptAnswers_AttemptId_AssessmentId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "AttemptId",
              "ordinal": 1
            },
            {
              "name": "AssessmentId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_AttemptAnswers_AssessmentId_QuestionId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "AssessmentId",
              "ordinal": 1
            },
            {
              "name": "QuestionId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_AttemptAnswers_QuestionId_OptionId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "QuestionId",
              "ordinal": 1
            },
            {
              "name": "OptionId",
              "ordinal": 2
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_AttemptAnswers_Lifecycle",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_AttemptAnswers_Lifecycle ON dbo.AttemptAnswers AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT AttemptId FROM inserted UNION SELECT AttemptId FROM deleted) x JOIN dbo.AssessmentAttempts a WITH(UPDLOCK,HOLDLOCK) ON a.AttemptId=x.AttemptId WHERE a.Status<>'InProgress')\n THROW 51125,'Only in-progress answers can be changed.',1;\nEND;\n"
        }
      ],
      "group": "Assessments",
      "description": "Selected option or explicit unsure response for a particular question in an attempt.",
      "reasonArabic": "يربط المحاولة بالسؤال ويحفظ «لست متأكدًا» دون اختراع اختيار؛ يجب أن يتبع الاختيار للسؤال وأن يتبع السؤال لاختبار المحاولة.",
      "relationshipExplanation": "Attempt/question junction. Missing row means unanswered; unsure is a real response, not a wrong-option ID.",
      "pk": [
        "AttemptId",
        "QuestionId"
      ],
      "unique": []
    },
    {
      "name": "CodeSubmissions",
      "columns": [
        {
          "name": "SubmissionId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "EnrollmentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "TaskId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "CodeText",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SubmittedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 5,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "EvaluationStatus",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Pending')",
          "ordinal": 6,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "FinishedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "EvaluationError",
          "baseType": "nvarchar",
          "maxLength": 4000,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 8,
          "type": "nvarchar(2000)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ExecutionEnvironment",
          "baseType": "nvarchar",
          "maxLength": 200,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 9,
          "type": "nvarchar(100)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "RuntimeVersion",
          "baseType": "nvarchar",
          "maxLength": 160,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 10,
          "type": "nvarchar(80)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "EvaluatorVersion",
          "baseType": "nvarchar",
          "maxLength": 160,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 11,
          "type": "nvarchar(80)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "EvidenceOrigin",
          "baseType": "varchar",
          "maxLength": 20,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('server')",
          "ordinal": 12,
          "type": "varchar(20)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ImportedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 13,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_CodeSubmissions",
          "type": "PK",
          "columns": [
            {
              "name": "SubmissionId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_CodeSubmissions_1",
          "type": "UQ",
          "columns": [
            {
              "name": "SubmissionId",
              "ordinal": 1
            },
            {
              "name": "TaskId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_CodeSubmissions_1_Enrollments_EnrollmentId",
          "parent": "Enrollments",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "EnrollmentId",
              "parentColumn": "EnrollmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_CodeSubmissions_2_CodingTasks_TaskId",
          "parent": "CodingTasks",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TaskId",
              "parentColumn": "TaskId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_CodeSubmissions_1",
          "definition": "([EvaluationStatus]='Cancelled' OR [EvaluationStatus]='Error' OR [EvaluationStatus]='Completed' OR [EvaluationStatus]='Running' OR [EvaluationStatus]='Pending')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_CodeSubmissions_2",
          "definition": "([EvidenceOrigin]='browser-import' OR [EvidenceOrigin]='academic-seed' OR [EvidenceOrigin]='server')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_CodeSubmissions_3",
          "definition": "([EvidenceOrigin]='browser-import' OR [SubmittedAtUtc] IS NOT NULL)",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_CodeSubmissions_4",
          "definition": "(([EvaluationStatus]='Running' OR [EvaluationStatus]='Pending') AND [FinishedAtUtc] IS NULL OR ([EvaluationStatus]='Cancelled' OR [EvaluationStatus]='Error' OR [EvaluationStatus]='Completed') AND ([EvidenceOrigin]='browser-import' OR [FinishedAtUtc] IS NOT NULL) AND ([FinishedAtUtc] IS NULL OR [SubmittedAtUtc] IS NULL OR [FinishedAtUtc]>=[SubmittedAtUtc]))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_CodeSubmissions_5",
          "definition": "([EvaluationStatus]='Error' AND [EvaluationError] IS NOT NULL OR [EvaluationStatus]<>'Error' AND [EvaluationError] IS NULL)",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_CodeSubmissions_6",
          "definition": "([EvidenceOrigin]='browser-import' AND [ImportedAtUtc] IS NOT NULL OR [EvidenceOrigin]<>'browser-import' AND [ImportedAtUtc] IS NULL)",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_CodeSubmissions",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "SubmissionId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_CodeSubmissions_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "SubmissionId",
              "ordinal": 1
            },
            {
              "name": "TaskId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_CodeSubmissions_EnrollmentId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "EnrollmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "IX_CodeSubmissions_TaskId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_CodeSubmissions_Lifecycle",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_CodeSubmissions_Lifecycle ON dbo.CodeSubmissions AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.SubmissionId=d.SubmissionId WHERE i.SubmissionId IS NULL OR d.EvaluationStatus NOT IN('Pending','Running'))\n THROW 51135,'Submissions are append-only; terminal evaluations are immutable.',1;\n IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE d.SubmissionId IS NULL AND i.EvaluationStatus<>'Pending')\n THROW 51136,'A submission must begin Pending.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE i.EnrollmentId<>d.EnrollmentId OR i.TaskId<>d.TaskId OR i.CodeText COLLATE Latin1_General_100_BIN2<>d.CodeText COLLATE Latin1_General_100_BIN2 OR DATALENGTH(i.CodeText)<>DATALENGTH(d.CodeText) OR ISNULL(i.SubmittedAtUtc,'19000101')<>ISNULL(d.SubmittedAtUtc,'19000101') OR i.ExecutionEnvironment<>d.ExecutionEnvironment OR ISNULL(i.RuntimeVersion,N'')<>ISNULL(d.RuntimeVersion,N'') OR ISNULL(i.EvaluatorVersion,N'')<>ISNULL(d.EvaluatorVersion,N'') OR i.EvidenceOrigin<>d.EvidenceOrigin OR ISNULL(i.ImportedAtUtc,'19000101')<>ISNULL(d.ImportedAtUtc,'19000101'))\n THROW 51137,'Submitted code, ownership, environment and provenance are immutable.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE NOT((d.EvaluationStatus='Pending' AND i.EvaluationStatus IN('Running','Cancelled')) OR (d.EvaluationStatus='Running' AND i.EvaluationStatus IN('Completed','Error','Cancelled'))))\n THROW 51138,'Invalid evaluation status transition.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId WHERE e.CourseId<>l.CourseId OR e.ParticipationStatus<>'Active' OR t.PublicationStatus<>'Published')\n THROW 51139,'Submission requires active matching enrollment and a published task.',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.EvaluationStatus='Completed' AND (\n NOT EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId) OR EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId AND r.ExecutionStatus<>'Success') OR (\n NOT EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId AND r.Passed=0) AND (SELECT COUNT(*) FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId)<>(SELECT COUNT(*) FROM dbo.TaskTestCases tc WHERE tc.TaskId=i.TaskId))))\n THROW 51140,'Completed means successful execution with a failed test or all tests passed; runtime errors require Error.',1;\nEND;\n"
        }
      ],
      "group": "Coding",
      "description": "Every checked solution snapshot and evaluation lifecycle.",
      "reasonArabic": "يحفظ الكود الذي اختُبر فعلًا؛ المسودة الحالية ليست بديلًا عنه. أحدث محاولة وأحدث محاولة ناجحة استعلامان مختلفان وليسا جدولين.",
      "relationshipExplanation": "Enrollment/task each have many immutable submissions; submission 1 → many case results.",
      "pk": [
        "SubmissionId"
      ],
      "unique": [
        {
          "name": "UQ_CodeSubmissions_1",
          "columns": [
            "SubmissionId",
            "TaskId"
          ]
        }
      ]
    },
    {
      "name": "CodingTasks",
      "columns": [
        {
          "name": "TaskId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "LevelId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "TaskCode",
          "baseType": "varchar",
          "maxLength": 80,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "varchar(80)",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "VersionNo",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "TaskKind",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Title",
          "baseType": "nvarchar",
          "maxLength": 400,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 6,
          "type": "nvarchar(200)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Description",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "RequirementsText",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 8,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "StarterCode",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 9,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SampleInput",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 10,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SampleOutput",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 11,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ReferenceSolution",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 12,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SolutionExplanation",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 13,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "VerificationCode",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 14,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SortOrder",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 15,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "PublicationStatus",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Draft')",
          "ordinal": 16,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_CodingTasks",
          "type": "PK",
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_CodingTasks_1",
          "type": "UQ",
          "columns": [
            {
              "name": "TaskCode",
              "ordinal": 1
            },
            {
              "name": "VersionNo",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_CodingTasks_1_Levels_LevelId",
          "parent": "Levels",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "LevelId",
              "parentColumn": "LevelId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_CodingTasks_1",
          "definition": "([VersionNo]>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_CodingTasks_2",
          "definition": "([SortOrder]>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_CodingTasks_3",
          "definition": "([TaskKind]='FinalProject' OR [TaskKind]='Exercise')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_CodingTasks_4",
          "definition": "([PublicationStatus]='Published' OR [PublicationStatus]='Draft')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_CodingTasks",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_CodingTasks_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TaskCode",
              "ordinal": 1
            },
            {
              "name": "VersionNo",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_CodingTasks_LevelId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_CodingTasks_Version",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_CodingTasks_Version ON dbo.CodingTasks AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted d WHERE d.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.CodeSubmissions s WITH(UPDLOCK,HOLDLOCK) WHERE s.TaskId=d.TaskId))\n THROW 51126,'Published/submitted coding tasks are immutable; create a new version.',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublicationStatus='Published' AND (NOT EXISTS(SELECT 1 FROM dbo.TaskTestCases tc WHERE tc.TaskId=i.TaskId) OR NOT EXISTS(SELECT 1 FROM dbo.CodingTaskTopics tt WHERE tt.TaskId=i.TaskId)))\n THROW 51127,'Publish a task only after adding tests and concept links.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.TaskId=i.TaskId WHERE i.LevelId<>d.LevelId)\n THROW 51128,'Task level link is immutable.',1;\nEND;\n"
        }
      ],
      "group": "Coding",
      "description": "An immutable version of a runnable exercise or the task-manager final project.",
      "reasonArabic": "المشروع النهائي الحالي تمرين برمجي له اختبارات فعلية؛ لا نكرر تسليمه في جدول مشاريع آخر. المتطلبات نص تعليمي، وليس قائمة كيانات لها علاقات مستقلة.",
      "relationshipExplanation": "Level 1 → many tasks; task 1 → many test cases/hints/submissions; many topics through CodingTaskTopics. Unique (TaskCode, VersionNo).",
      "pk": [
        "TaskId"
      ],
      "unique": [
        {
          "name": "UQ_CodingTasks_1",
          "columns": [
            "TaskCode",
            "VersionNo"
          ]
        }
      ]
    },
    {
      "name": "CodingTaskTopics",
      "columns": [
        {
          "name": "TaskId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "TopicId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_CodingTaskTopics",
          "type": "PK",
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "TopicId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_CodingTaskTopics_1_CodingTasks_TaskId",
          "parent": "CodingTasks",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TaskId",
              "parentColumn": "TaskId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_CodingTaskTopics_2_Topics_TopicId",
          "parent": "Topics",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TopicId",
              "parentColumn": "TopicId",
              "ordinal": 1
            }
          ]
        }
      ],
      "indexes": [
        {
          "name": "PK_CodingTaskTopics",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "TopicId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_CodingTaskTopics_TopicId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TopicId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_CodingTaskTopics_Version",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_CodingTaskTopics_Version ON dbo.CodingTaskTopics AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus='Published')\n THROW 51131,'Concept links in published task versions are immutable.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.CodingTasks t ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId JOIN dbo.Courses c ON c.CourseId=l.CourseId JOIN dbo.Topics tp ON tp.TopicId=i.TopicId WHERE c.LanguageId<>tp.LanguageId)\n THROW 51132,'Task topics must match course language.',1;\nEND;\n"
        }
      ],
      "checks": [],
      "group": "Coding",
      "description": "Explicit multi-concept links used by task review recommendations.",
      "reasonArabic": "التمرين الواحد يستخدم أكثر من مفهوم؛ جدول الربط يمنع تكرار بيانات التمرين ويعكس مصفوفة topics الموجودة في learning-support.js.",
      "relationshipExplanation": "Tasks/topics many-to-many junction.",
      "pk": [
        "TaskId",
        "TopicId"
      ],
      "unique": []
    },
    {
      "name": "Courses",
      "columns": [
        {
          "name": "CourseId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "LanguageId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "Slug",
          "baseType": "varchar",
          "maxLength": 80,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "varchar(80)",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "Title",
          "baseType": "nvarchar",
          "maxLength": 400,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "nvarchar(200)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Description",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "PublicationStatus",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Draft')",
          "ordinal": 6,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "CreatedByUserId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "CreatedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": false,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 8,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ContentVersion",
          "baseType": "timestamp",
          "maxLength": 8,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 9,
          "type": "rowversion",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_Courses",
          "type": "PK",
          "columns": [
            {
              "name": "CourseId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Courses_1",
          "type": "UQ",
          "columns": [
            {
              "name": "Slug",
              "ordinal": 1
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_Courses_1_Languages_LanguageId",
          "parent": "Languages",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "LanguageId",
              "parentColumn": "LanguageId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_Courses_2_Users_CreatedByUserId",
          "parent": "Users",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "CreatedByUserId",
              "parentColumn": "UserId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Courses_1",
          "definition": "([PublicationStatus]='Archived' OR [PublicationStatus]='Published' OR [PublicationStatus]='Draft')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Courses",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "CourseId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Courses_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "Slug",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "IX_Courses_LanguageId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "LanguageId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "IX_Courses_CreatedByUserId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "CreatedByUserId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_Courses_Structure",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_Courses_Structure ON dbo.Courses AFTER UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.CourseId=d.CourseId WHERE i.LanguageId<>d.LanguageId)\n THROW 51102,'Course language is immutable; create a new course.',1;\nEND;\n"
        }
      ],
      "group": "Curriculum",
      "description": "Canonical course/path, independent of a local admin draft or hardcoded source file.",
      "reasonArabic": "يمثل المسار التعليمي نفسه؛ المسودة حالة للكورس وليست جدول كورسات آخر، ولا نكرر اسم اللغة لأن العلاقة توفره.",
      "relationshipExplanation": "Language 1 → many courses; course 1 → many ordered levels and enrollments.",
      "pk": [
        "CourseId"
      ],
      "unique": [
        {
          "name": "UQ_Courses_1",
          "columns": [
            "Slug"
          ]
        }
      ]
    },
    {
      "name": "Enrollments",
      "columns": [
        {
          "name": "EnrollmentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "StudentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "CourseId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "EnrolledAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": false,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 4,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ParticipationStatus",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Active')",
          "ordinal": 5,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "EvidenceOrigin",
          "baseType": "varchar",
          "maxLength": 20,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('server')",
          "ordinal": 6,
          "type": "varchar(20)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_Enrollments",
          "type": "PK",
          "columns": [
            {
              "name": "EnrollmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Enrollments_1",
          "type": "UQ",
          "columns": [
            {
              "name": "StudentId",
              "ordinal": 1
            },
            {
              "name": "CourseId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_Enrollments_1_StudentProfiles_StudentId",
          "parent": "StudentProfiles",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "StudentId",
              "parentColumn": "UserId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_Enrollments_2_Courses_CourseId",
          "parent": "Courses",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "CourseId",
              "parentColumn": "CourseId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Enrollments_1",
          "definition": "([ParticipationStatus]='Completed' OR [ParticipationStatus]='Paused' OR [ParticipationStatus]='Active')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Enrollments_2",
          "definition": "([EvidenceOrigin]='browser-import' OR [EvidenceOrigin]='academic-seed' OR [EvidenceOrigin]='server')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Enrollments",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "EnrollmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Enrollments_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "StudentId",
              "ordinal": 1
            },
            {
              "name": "CourseId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_Enrollments_CourseId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "CourseId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_Enrollments_Ownership",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_Enrollments_Ownership ON dbo.Enrollments AFTER UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.EnrollmentId=d.EnrollmentId WHERE i.StudentId<>d.StudentId OR i.CourseId<>d.CourseId OR i.EvidenceOrigin<>d.EvidenceOrigin OR i.EnrolledAtUtc<>d.EnrolledAtUtc)\n THROW 51109,'Enrollment identity and provenance are immutable.',1;\nEND;\n"
        }
      ],
      "group": "Learning",
      "description": "Explicit student participation in a course for a future server-backed learning workflow.",
      "reasonArabic": "التسجيل غير منفذ حاليًا كعملية مستقلة؛ نقترحه أساسًا للربط بين الطالب والكورس عند الانتقال إلى الخادم، وليس حقيقة نستنتجها من اختيار اللغة.",
      "relationshipExplanation": "Student/course many-to-many junction; unique (StudentId, CourseId).",
      "pk": [
        "EnrollmentId"
      ],
      "unique": [
        {
          "name": "UQ_Enrollments_1",
          "columns": [
            "StudentId",
            "CourseId"
          ]
        }
      ]
    },
    {
      "name": "Languages",
      "columns": [
        {
          "name": "LanguageId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Slug",
          "baseType": "varchar",
          "maxLength": 40,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "varchar(40)",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "Name",
          "baseType": "nvarchar",
          "maxLength": 160,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "nvarchar(80)",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "Description",
          "baseType": "nvarchar",
          "maxLength": 1200,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "nvarchar(600)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ContentReadinessCode",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('ComingSoon')",
          "ordinal": 5,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_Languages",
          "type": "PK",
          "columns": [
            {
              "name": "LanguageId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Languages_1",
          "type": "UQ",
          "columns": [
            {
              "name": "Slug",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Languages_2",
          "type": "UQ",
          "columns": [
            {
              "name": "Name",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Languages_1",
          "definition": "([ContentReadinessCode]='ComingSoon' OR [ContentReadinessCode]='Ready')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Languages",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "LanguageId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Languages_2",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "Name",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Languages_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "Slug",
              "ordinal": 1
            }
          ]
        }
      ],
      "foreignKeys": [],
      "triggers": [],
      "group": "Curriculum",
      "description": "The programming-language catalog, including coming-soon entries.",
      "reasonArabic": "وجود اللغة في الفهرس لا يعني وجود منهج أو اختبار لها؛ نحتاج تمييز جاهزية المحتوى بدل اختراع إنجازات للغات غير المنفذة.",
      "relationshipExplanation": "One language has many courses and student preferences.",
      "pk": [
        "LanguageId"
      ],
      "unique": [
        {
          "name": "UQ_Languages_1",
          "columns": [
            "Slug"
          ]
        },
        {
          "name": "UQ_Languages_2",
          "columns": [
            "Name"
          ]
        }
      ]
    },
    {
      "name": "LessonCompletions",
      "columns": [
        {
          "name": "EnrollmentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "LessonId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "CompletedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "CompletionMethod",
          "baseType": "varchar",
          "maxLength": 16,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "varchar(16)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "EvidenceOrigin",
          "baseType": "varchar",
          "maxLength": 20,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('server')",
          "ordinal": 5,
          "type": "varchar(20)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ImportedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 6,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_LessonCompletions",
          "type": "PK",
          "columns": [
            {
              "name": "EnrollmentId",
              "ordinal": 1
            },
            {
              "name": "LessonId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_LessonCompletions_1_Enrollments_EnrollmentId",
          "parent": "Enrollments",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "EnrollmentId",
              "parentColumn": "EnrollmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_LessonCompletions_2_Lessons_LessonId",
          "parent": "Lessons",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "LessonId",
              "parentColumn": "LessonId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_LessonCompletions_1",
          "definition": "([CompletionMethod]='imported' OR [CompletionMethod]='correct-answer' OR [CompletionMethod]='manual')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_LessonCompletions_2",
          "definition": "([EvidenceOrigin]='browser-import' OR [EvidenceOrigin]='academic-seed' OR [EvidenceOrigin]='server')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_LessonCompletions_3",
          "definition": "([EvidenceOrigin]='browser-import' AND [CompletionMethod]='imported' AND [ImportedAtUtc] IS NOT NULL OR [EvidenceOrigin]<>'browser-import' AND [CompletionMethod]<>'imported' AND [ImportedAtUtc] IS NULL AND [CompletedAtUtc] IS NOT NULL)",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_LessonCompletions",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "EnrollmentId",
              "ordinal": 1
            },
            {
              "name": "LessonId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_LessonCompletions_LessonId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "LessonId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_LessonCompletions_Integrity",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_LessonCompletions_Integrity ON dbo.LessonCompletions AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted) THROW 51110,'Completion facts are append-only.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.Lessons l ON l.LessonId=i.LessonId JOIN dbo.Levels lv ON lv.LevelId=l.LevelId WHERE e.CourseId<>lv.CourseId OR e.ParticipationStatus<>'Active')\n THROW 51111,'Completion requires an active enrollment in the lesson course.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e ON e.EnrollmentId=i.EnrollmentId WHERE i.CompletionMethod='correct-answer' AND NOT EXISTS(\n SELECT 1 FROM dbo.AssessmentAttempts a JOIN dbo.Assessments s ON s.AssessmentId=a.AssessmentId\n WHERE a.UserId=e.StudentId AND s.ScopeLessonId=i.LessonId AND a.Status='Submitted' AND a.EvidenceOrigin=i.EvidenceOrigin\n AND NOT EXISTS(SELECT 1 FROM dbo.Questions q LEFT JOIN dbo.AttemptAnswers x ON x.AttemptId=a.AttemptId AND x.QuestionId=q.QuestionId LEFT JOIN dbo.QuestionOptions o ON o.OptionId=x.OptionId WHERE q.AssessmentId=s.AssessmentId AND (x.OptionId IS NULL OR o.IsCorrect=0))))\n THROW 51112,'Correct-answer completion requires matching submitted correct-answer evidence.',1;\nEND;\n"
        }
      ],
      "group": "Learning",
      "description": "First completion of a lesson per enrollment, with its actual basis.",
      "reasonArabic": "إكمال الدرس بالزر لا يثبت الإجابة الصحيحة؛ لذلك نحفظ طريقة الإكمال ونترك الإجابات في جدولها، ولا نكرر نسبة التقدم.",
      "relationshipExplanation": "Enrollment/lesson junction; the lesson must belong to that enrollment’s course.",
      "pk": [
        "EnrollmentId",
        "LessonId"
      ],
      "unique": []
    },
    {
      "name": "LessonResources",
      "columns": [
        {
          "name": "ResourceId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "LessonId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "Title",
          "baseType": "nvarchar",
          "maxLength": 400,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "nvarchar(200)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Url",
          "baseType": "nvarchar",
          "maxLength": 4096,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "nvarchar(2048)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ResourceType",
          "baseType": "varchar",
          "maxLength": 20,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "varchar(20)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ResourceLanguage",
          "baseType": "nvarchar",
          "maxLength": 80,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 6,
          "type": "nvarchar(40)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SortOrder",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        }
      ],
      "keys": [
        {
          "name": "PK_LessonResources",
          "type": "PK",
          "columns": [
            {
              "name": "ResourceId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_LessonResources_1",
          "type": "UQ",
          "columns": [
            {
              "name": "LessonId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_LessonResources_1_Lessons_LessonId",
          "parent": "Lessons",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "LessonId",
              "parentColumn": "LessonId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_LessonResources_1",
          "definition": "([SortOrder]>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_LessonResources_2",
          "definition": "([ResourceType]='Other' OR [ResourceType]='Documentation' OR [ResourceType]='Video')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_LessonResources",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "ResourceId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_LessonResources_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "LessonId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        }
      ],
      "triggers": [],
      "group": "Curriculum",
      "description": "Ordered external videos/documentation; kept separate from lesson body.",
      "reasonArabic": "الدرس قد يملك أكثر من فيديو أو مرجع؛ روابط المصادر بيانات محتوى ولا تحتاج ملفات الفيديو الخارجية أو سجل مشاهدة وهميًا.",
      "relationshipExplanation": "Lesson 1 → many resources.",
      "pk": [
        "ResourceId"
      ],
      "unique": [
        {
          "name": "UQ_LessonResources_1",
          "columns": [
            "LessonId",
            "SortOrder"
          ]
        }
      ]
    },
    {
      "name": "Lessons",
      "columns": [
        {
          "name": "LessonId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "LevelId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "TopicId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "Slug",
          "baseType": "varchar",
          "maxLength": 80,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "varchar(80)",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "Title",
          "baseType": "nvarchar",
          "maxLength": 400,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "nvarchar(200)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Summary",
          "baseType": "nvarchar",
          "maxLength": 2000,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 6,
          "type": "nvarchar(1000)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Body",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ExampleCode",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 8,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "PreparedOutput",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 9,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "EstimatedMinutes",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 10,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SortOrder",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 11,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "PublicationStatus",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Draft')",
          "ordinal": 12,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "UpdatedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": false,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 13,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_Lessons",
          "type": "PK",
          "columns": [
            {
              "name": "LessonId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Lessons_1",
          "type": "UQ",
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            },
            {
              "name": "Slug",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "UQ_Lessons_2",
          "type": "UQ",
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_Lessons_1_Levels_LevelId",
          "parent": "Levels",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "LevelId",
              "parentColumn": "LevelId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_Lessons_2_Topics_TopicId",
          "parent": "Topics",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TopicId",
              "parentColumn": "TopicId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Lessons_1",
          "definition": "([EstimatedMinutes]>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Lessons_2",
          "definition": "([SortOrder]>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Lessons_3",
          "definition": "([PublicationStatus]='Archived' OR [PublicationStatus]='Published' OR [PublicationStatus]='Draft')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Lessons",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "LessonId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Lessons_2",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "UQ_Lessons_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            },
            {
              "name": "Slug",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_Lessons_TopicId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TopicId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_Lessons_Structure",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_Lessons_Structure ON dbo.Lessons AFTER INSERT,UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.LessonId=d.LessonId WHERE i.LevelId<>d.LevelId OR i.TopicId<>d.TopicId)\n THROW 51107,'Lesson level/topic links are immutable.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Levels l ON l.LevelId=i.LevelId JOIN dbo.Courses c ON c.CourseId=l.CourseId JOIN dbo.Topics t ON t.TopicId=i.TopicId WHERE c.LanguageId<>t.LanguageId)\n THROW 51108,'Lesson topic must match its course language.',1;\nEND;\n"
        }
      ],
      "group": "Curriculum",
      "description": "Lesson explanation and demonstration content, not learner completion.",
      "reasonArabic": "نفصل المحتوى عن تقدّم الطالب؛ المدة تقديرية وليست وقتًا قيس فعلًا. معاينة درس محلي لا تعني إكماله أو اجتياز اختباره.",
      "relationshipExplanation": "Level 1 → many lessons; topic 1 → many lessons; lesson 1 → many resources/completions. Unique (LevelId, Slug) and (LevelId, SortOrder).",
      "pk": [
        "LessonId"
      ],
      "unique": [
        {
          "name": "UQ_Lessons_1",
          "columns": [
            "LevelId",
            "Slug"
          ]
        },
        {
          "name": "UQ_Lessons_2",
          "columns": [
            "LevelId",
            "SortOrder"
          ]
        }
      ]
    },
    {
      "name": "LevelObjectives",
      "columns": [
        {
          "name": "LevelId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "ObjectiveNo",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "smallint",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ObjectiveText",
          "baseType": "nvarchar",
          "maxLength": 2000,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "nvarchar(1000)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_LevelObjectives",
          "type": "PK",
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            },
            {
              "name": "ObjectiveNo",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_LevelObjectives_1_Levels_LevelId",
          "parent": "Levels",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "LevelId",
              "parentColumn": "LevelId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_LevelObjectives_1",
          "definition": "([ObjectiveNo]>(0))",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_LevelObjectives",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            },
            {
              "name": "ObjectiveNo",
              "ordinal": 2
            }
          ]
        }
      ],
      "triggers": [],
      "group": "Curriculum",
      "description": "Ordered, separately validated learning objectives from the admin level form.",
      "reasonArabic": "نموذج الأدمن يقبل قائمة أهداف؛ تخزين كل هدف في صف مستقل يحقق 1NF ويسمح بترتيبه دون قائمة داخل عمود.",
      "relationshipExplanation": "Level 1 → many atomic objective rows.",
      "pk": [
        "LevelId",
        "ObjectiveNo"
      ],
      "unique": []
    },
    {
      "name": "Levels",
      "columns": [
        {
          "name": "LevelId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "CourseId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "Title",
          "baseType": "nvarchar",
          "maxLength": 400,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "nvarchar(200)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Description",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SortOrder",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "PublicationStatus",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Draft')",
          "ordinal": 6,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "CreatedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": false,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 7,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_Levels",
          "type": "PK",
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Levels_1",
          "type": "UQ",
          "columns": [
            {
              "name": "CourseId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_Levels_1_Courses_CourseId",
          "parent": "Courses",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "CourseId",
              "parentColumn": "CourseId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Levels_1",
          "definition": "([SortOrder]>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Levels_2",
          "definition": "([PublicationStatus]='Archived' OR [PublicationStatus]='Published' OR [PublicationStatus]='Draft')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Levels",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "LevelId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Levels_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "CourseId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_Levels_Structure",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_Levels_Structure ON dbo.Levels AFTER UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.LevelId=d.LevelId WHERE i.CourseId<>d.CourseId)\n THROW 51103,'A level cannot be moved to another course.',1;\nEND;\n"
        }
      ],
      "group": "Curriculum",
      "description": "Ordered stages within a course, with the current linear progression model.",
      "reasonArabic": "كل مستوى يتبع كورسًا واحدًا؛ ترتيب المستويات يكفي للتدرج الحالي ولا نحتاج شبكة متطلبات سابقة معقدة.",
      "relationshipExplanation": "Course 1 → many levels; level 1 → many lessons/objectives/tasks. Unique (CourseId, SortOrder).",
      "pk": [
        "LevelId"
      ],
      "unique": [
        {
          "name": "UQ_Levels_1",
          "columns": [
            "CourseId",
            "SortOrder"
          ]
        }
      ]
    },
    {
      "name": "QuestionOptions",
      "columns": [
        {
          "name": "OptionId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "QuestionId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "OptionText",
          "baseType": "nvarchar",
          "maxLength": 2000,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "nvarchar(1000)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "IsCorrect",
          "baseType": "bit",
          "maxLength": 1,
          "precision": 1,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "bit",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SortOrder",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        }
      ],
      "keys": [
        {
          "name": "PK_QuestionOptions",
          "type": "PK",
          "columns": [
            {
              "name": "OptionId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_QuestionOptions_1",
          "type": "UQ",
          "columns": [
            {
              "name": "QuestionId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "UQ_QuestionOptions_2",
          "type": "UQ",
          "columns": [
            {
              "name": "QuestionId",
              "ordinal": 1
            },
            {
              "name": "OptionId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_QuestionOptions_1_Questions_QuestionId",
          "parent": "Questions",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "QuestionId",
              "parentColumn": "QuestionId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_QuestionOptions_1",
          "definition": "([SortOrder]>(0))",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_QuestionOptions",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "OptionId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_QuestionOptions_2",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "QuestionId",
              "ordinal": 1
            },
            {
              "name": "OptionId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "UQ_QuestionOptions_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "QuestionId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_QuestionOptions_Version",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_QuestionOptions_Version ON dbo.QuestionOptions AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT QuestionId FROM inserted UNION SELECT QuestionId FROM deleted) x JOIN dbo.Questions q ON q.QuestionId=x.QuestionId JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=q.AssessmentId WHERE a.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts atp WHERE atp.AssessmentId=a.AssessmentId))\n THROW 51117,'Options and grading keys in published/attempted versions are immutable.',1;\nEND;\n"
        }
      ],
      "group": "Assessments",
      "description": "Atomic single-choice options and their grading key.",
      "reasonArabic": "لا نضع الاختيارات في نص مفصول بفواصل؛ كل اختيار صف واضح، ومفتاح التصحيح لا يُرسل إلى واجهة الإنتاج بوصفه نتيجة موثوقة.",
      "relationshipExplanation": "Question 1 → many options; unique (QuestionId, SortOrder). Exactly one correct option before publishing.",
      "pk": [
        "OptionId"
      ],
      "unique": [
        {
          "name": "UQ_QuestionOptions_1",
          "columns": [
            "QuestionId",
            "SortOrder"
          ]
        },
        {
          "name": "UQ_QuestionOptions_2",
          "columns": [
            "QuestionId",
            "OptionId"
          ]
        }
      ]
    },
    {
      "name": "Questions",
      "columns": [
        {
          "name": "QuestionId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "AssessmentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "TopicId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "Prompt",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "CodeSnippet",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Explanation",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 6,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SortOrder",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        }
      ],
      "keys": [
        {
          "name": "PK_Questions",
          "type": "PK",
          "columns": [
            {
              "name": "QuestionId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Questions_1",
          "type": "UQ",
          "columns": [
            {
              "name": "AssessmentId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "UQ_Questions_2",
          "type": "UQ",
          "columns": [
            {
              "name": "AssessmentId",
              "ordinal": 1
            },
            {
              "name": "QuestionId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_Questions_1_Assessments_AssessmentId",
          "parent": "Assessments",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "AssessmentId",
              "parentColumn": "AssessmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_Questions_2_Topics_TopicId",
          "parent": "Topics",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TopicId",
              "parentColumn": "TopicId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Questions_1",
          "definition": "([SortOrder]>(0))",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Questions",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "QuestionId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Questions_2",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "AssessmentId",
              "ordinal": 1
            },
            {
              "name": "QuestionId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "UQ_Questions_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "AssessmentId",
              "ordinal": 1
            },
            {
              "name": "SortOrder",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_Questions_TopicId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TopicId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_Questions_Version",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_Questions_Version ON dbo.Questions AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT AssessmentId FROM inserted UNION SELECT AssessmentId FROM deleted) x JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=x.AssessmentId WHERE a.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts atp WHERE atp.AssessmentId=a.AssessmentId))\n THROW 51115,'Questions in published/attempted assessment versions are immutable.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId LEFT JOIN dbo.Lessons ls ON ls.LessonId=a.ScopeLessonId LEFT JOIN dbo.Levels lv ON lv.LevelId=COALESCE(a.ScopeLevelId,ls.LevelId) JOIN dbo.Courses c ON c.CourseId=COALESCE(a.ScopeCourseId,lv.CourseId) JOIN dbo.Topics t ON t.TopicId=i.TopicId WHERE t.LanguageId<>c.LanguageId)\n THROW 51116,'Question topic language must match its assessment course.',1;\nEND;\n"
        }
      ],
      "group": "Assessments",
      "description": "Question text, optional code, teaching topic, and explanation belonging to an assessment version.",
      "reasonArabic": "السؤال وحدة دليل على الفهم؛ ربطه بموضوع صريح يسمح بتحليل الضعف بدل افتراض أن السؤال الثالث يطابق الدرس الثالث.",
      "relationshipExplanation": "Assessment 1 → many questions; topic 1 → many questions; unique (AssessmentId, SortOrder).",
      "pk": [
        "QuestionId"
      ],
      "unique": [
        {
          "name": "UQ_Questions_1",
          "columns": [
            "AssessmentId",
            "SortOrder"
          ]
        },
        {
          "name": "UQ_Questions_2",
          "columns": [
            "AssessmentId",
            "QuestionId"
          ]
        }
      ]
    },
    {
      "name": "StudentProfiles",
      "columns": [
        {
          "name": "UserId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "PreferredLanguageId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "ExperienceCode",
          "baseType": "varchar",
          "maxLength": 20,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "varchar(20)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "LearningGoalCode",
          "baseType": "varchar",
          "maxLength": 30,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "varchar(30)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "UpdatedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": false,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 5,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_StudentProfiles",
          "type": "PK",
          "columns": [
            {
              "name": "UserId",
              "ordinal": 1
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_StudentProfiles_1_Users_UserId",
          "parent": "Users",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "UserId",
              "parentColumn": "UserId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_StudentProfiles_2_Languages_PreferredLanguageId",
          "parent": "Languages",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "PreferredLanguageId",
              "parentColumn": "LanguageId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_StudentProfiles_1",
          "definition": "([ExperienceCode]='Experienced' OR [ExperienceCode]='SomeExperience' OR [ExperienceCode]='Beginner')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_StudentProfiles_2",
          "definition": "([LearningGoalCode]='Career' OR [LearningGoalCode]='Projects' OR [LearningGoalCode]='Foundations')",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_StudentProfiles",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "UserId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "IX_StudentProfiles_PreferredLanguageId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "PreferredLanguageId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_StudentProfiles_Role",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_StudentProfiles_Role ON dbo.StudentProfiles AFTER INSERT,UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Users u WITH(UPDLOCK,HOLDLOCK) ON u.UserId=i.UserId WHERE u.RoleCode<>'Student')\n THROW 51101,'StudentProfiles requires the Student role.',1;\nEND;\n"
        }
      ],
      "group": "Identity",
      "description": "Student-specific learning preferences; not a public profile.",
      "reasonArabic": "يفصل تفضيلات الطالب عن حساب الأدمن بعلاقة واحد إلى واحد؛ تغيير اللغة المفضلة لا يغيّر سجل التعلّم أو ينشئ تسجيلًا تلقائيًا.",
      "relationshipExplanation": "Users 1 → 0..1 StudentProfiles; Languages 1 → many student preferences.",
      "pk": [
        "UserId"
      ],
      "unique": []
    },
    {
      "name": "SubmissionTestResults",
      "columns": [
        {
          "name": "SubmissionId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "TestCaseId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "TaskId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "Passed",
          "baseType": "bit",
          "maxLength": 1,
          "precision": 1,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "bit",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ActualOutput",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ErrorText",
          "baseType": "nvarchar",
          "maxLength": 4000,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 6,
          "type": "nvarchar(2000)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "RuntimeMs",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 7,
          "type": "int",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ExecutionStatus",
          "baseType": "varchar",
          "maxLength": 16,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 8,
          "type": "varchar(16)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_SubmissionTestResults",
          "type": "PK",
          "columns": [
            {
              "name": "SubmissionId",
              "ordinal": 1
            },
            {
              "name": "TestCaseId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_SubmissionTestResults_1_Result_SubmissionVersion",
          "parent": "CodeSubmissions",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "SubmissionId",
              "parentColumn": "SubmissionId",
              "ordinal": 1
            },
            {
              "childColumn": "TaskId",
              "parentColumn": "TaskId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "FK_SubmissionTestResults_2_Result_TestVersion",
          "parent": "TaskTestCases",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TaskId",
              "parentColumn": "TaskId",
              "ordinal": 1
            },
            {
              "childColumn": "TestCaseId",
              "parentColumn": "TestCaseId",
              "ordinal": 2
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_SubmissionTestResults_1",
          "definition": "([RuntimeMs] IS NULL OR [RuntimeMs]>=(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_SubmissionTestResults_2",
          "definition": "([ExecutionStatus]='Success' AND [ErrorText] IS NULL OR ([ExecutionStatus]='Timeout' OR [ExecutionStatus]='RuntimeError') AND [Passed]=(0) AND [ErrorText] IS NOT NULL)",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_SubmissionTestResults",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "SubmissionId",
              "ordinal": 1
            },
            {
              "name": "TestCaseId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_SubmissionTestResults_SubmissionId_TaskId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "SubmissionId",
              "ordinal": 1
            },
            {
              "name": "TaskId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_SubmissionTestResults_TaskId_TestCaseId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "TestCaseId",
              "ordinal": 2
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_SubmissionTestResults_Integrity",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_SubmissionTestResults_Integrity ON dbo.SubmissionTestResults AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted) THROW 51141,'Executed case results are immutable.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.CodeSubmissions s WITH(UPDLOCK,HOLDLOCK) ON s.SubmissionId=i.SubmissionId WHERE s.EvaluationStatus<>'Running')\n THROW 51142,'Record executed cases only while evaluation is Running.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.TaskTestCases tc ON tc.TestCaseId=i.TestCaseId WHERE i.Passed=1 AND (i.ActualOutput COLLATE Latin1_General_100_BIN2<>tc.ExpectedOutput COLLATE Latin1_General_100_BIN2 OR DATALENGTH(i.ActualOutput)<>DATALENGTH(tc.ExpectedOutput)))\n THROW 51143,'Passing output must exactly match the expected output; evaluator must also verify assertions.',1;\nEND;\n"
        }
      ],
      "group": "Coding",
      "description": "Actual results for each case that ran in a submission.",
      "reasonArabic": "نخزن المخرجات والخطأ للحالات المنفذة فقط؛ زمن التنفيذ المقترح يبدأ جمعه لاحقًا ولا يمكن استعادته من السجل الحالي.",
      "relationshipExplanation": "Submission/case junction; case must belong to submission’s task version.",
      "pk": [
        "SubmissionId",
        "TestCaseId"
      ],
      "unique": []
    },
    {
      "name": "TaskHints",
      "columns": [
        {
          "name": "TaskId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "HintNo",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "smallint",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "HintText",
          "baseType": "nvarchar",
          "maxLength": 4000,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "nvarchar(2000)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_TaskHints",
          "type": "PK",
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "HintNo",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_TaskHints_1_CodingTasks_TaskId",
          "parent": "CodingTasks",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TaskId",
              "parentColumn": "TaskId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_TaskHints_1",
          "definition": "([HintNo]>(0))",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_TaskHints",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "HintNo",
              "ordinal": 2
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_TaskHints_Version",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_TaskHints_Version ON dbo.TaskHints AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus='Published')\n THROW 51130,'Hints in published task versions are immutable.',1;\nEND;\n"
        }
      ],
      "group": "Coding",
      "description": "Ordered prepared hints, separate from generated mentor replies.",
      "reasonArabic": "التلميحات الحالية مكتوبة مسبقًا وتظهر بالتدريج؛ وجودها لا يعني استخدام نموذج ذكاء اصطناعي.",
      "relationshipExplanation": "Task 1 → many ordered hints.",
      "pk": [
        "TaskId",
        "HintNo"
      ],
      "unique": []
    },
    {
      "name": "TaskTestCases",
      "columns": [
        {
          "name": "TestCaseId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "TaskId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "CaseNo",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "InputText",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ExpectedOutput",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "IsPublic",
          "baseType": "bit",
          "maxLength": 1,
          "precision": 1,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "((1))",
          "ordinal": 6,
          "type": "bit",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_TaskTestCases",
          "type": "PK",
          "columns": [
            {
              "name": "TestCaseId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_TaskTestCases_1",
          "type": "UQ",
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "CaseNo",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "UQ_TaskTestCases_2",
          "type": "UQ",
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "TestCaseId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_TaskTestCases_1_CodingTasks_TaskId",
          "parent": "CodingTasks",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TaskId",
              "parentColumn": "TaskId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_TaskTestCases_1",
          "definition": "([CaseNo]>(0))",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_TaskTestCases",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "TestCaseId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_TaskTestCases_2",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "TestCaseId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "UQ_TaskTestCases_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            },
            {
              "name": "CaseNo",
              "ordinal": 2
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_TaskTestCases_Version",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_TaskTestCases_Version ON dbo.TaskTestCases AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus='Published' OR EXISTS(SELECT 1 FROM dbo.CodeSubmissions s WHERE s.TaskId=t.TaskId))\n THROW 51129,'Tests in published/submitted task versions are immutable.',1;\nEND;\n"
        }
      ],
      "group": "Coding",
      "description": "Immutable test cases belonging to a task version.",
      "reasonArabic": "نحتاج فصل حالات الاختبار حتى نعرف أي حالة نُفذت وأيها لم تُنفذ؛ لا نصنف الحالات المتبقية بعد أول فشل بأنها حالات فاشلة.",
      "relationshipExplanation": "Task 1 → many cases; unique (TaskId, CaseNo). Current browser cases are visible; private cases are a later server capability.",
      "pk": [
        "TestCaseId"
      ],
      "unique": [
        {
          "name": "UQ_TaskTestCases_1",
          "columns": [
            "TaskId",
            "CaseNo"
          ]
        },
        {
          "name": "UQ_TaskTestCases_2",
          "columns": [
            "TaskId",
            "TestCaseId"
          ]
        }
      ]
    },
    {
      "name": "TaskWorkspaceState",
      "columns": [
        {
          "name": "EnrollmentId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "TaskId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": true,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "DraftCode",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "DraftInput",
          "baseType": "nvarchar",
          "maxLength": -1,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "nvarchar(max)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "DraftUpdatedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "HintsRevealedCount",
          "baseType": "smallint",
          "maxLength": 2,
          "precision": 5,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "((0))",
          "ordinal": 6,
          "type": "smallint",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "HasAttempted",
          "baseType": "bit",
          "maxLength": 1,
          "precision": 1,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "((0))",
          "ordinal": 7,
          "type": "bit",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "SolutionViewed",
          "baseType": "bit",
          "maxLength": 1,
          "precision": 1,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "((0))",
          "ordinal": 8,
          "type": "bit",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "StateUpdatedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": false,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 9,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_TaskWorkspaceState",
          "type": "PK",
          "columns": [
            {
              "name": "EnrollmentId",
              "ordinal": 1
            },
            {
              "name": "TaskId",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_TaskWorkspaceState_1_Enrollments_EnrollmentId",
          "parent": "Enrollments",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "EnrollmentId",
              "parentColumn": "EnrollmentId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_TaskWorkspaceState_2_CodingTasks_TaskId",
          "parent": "CodingTasks",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "TaskId",
              "parentColumn": "TaskId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_TaskWorkspaceState_1",
          "definition": "([HintsRevealedCount]>=(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_TaskWorkspaceState_2",
          "definition": "([SolutionViewed]=(0) OR [HasAttempted]=(1))",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_TaskWorkspaceState",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "EnrollmentId",
              "ordinal": 1
            },
            {
              "name": "TaskId",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_TaskWorkspaceState_TaskId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "TaskId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_TaskWorkspaceState_Integrity",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_TaskWorkspaceState_Integrity ON dbo.TaskWorkspaceState AFTER INSERT,UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.CodingTasks t ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId WHERE e.CourseId<>l.CourseId OR e.ParticipationStatus<>'Active' OR t.PublicationStatus<>'Published')\n THROW 51133,'Workspace requires an active matching course enrollment and published task.',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.HintsRevealedCount>(SELECT COUNT(*) FROM dbo.TaskHints h WHERE h.TaskId=i.TaskId))\n THROW 51134,'Revealed hints cannot exceed available hints.',1;\nEND;\n"
        }
      ],
      "group": "Coding",
      "description": "Latest mutable draft and local learning-support state, separated from immutable submissions.",
      "reasonArabic": "المسودة تتغير بينما التسليم السابق يجب أن يبقى؛ نحفظ أيضًا حالة كشف التلميحات والحل لأن التطبيق يسجلها بالفعل. هذه حالة حالية وليست سجل أحداث كاملًا.",
      "relationshipExplanation": "One workspace-state row per enrollment/task version; many submissions stored separately.",
      "pk": [
        "EnrollmentId",
        "TaskId"
      ],
      "unique": []
    },
    {
      "name": "Topics",
      "columns": [
        {
          "name": "TopicId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "LanguageId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": true
        },
        {
          "name": "ParentTopicId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "int",
          "isPK": false,
          "isFK": true,
          "isUQ": false
        },
        {
          "name": "Code",
          "baseType": "varchar",
          "maxLength": 80,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "varchar(80)",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "Name",
          "baseType": "nvarchar",
          "maxLength": 320,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "nvarchar(160)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_Topics",
          "type": "PK",
          "columns": [
            {
              "name": "TopicId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Topics_1",
          "type": "UQ",
          "columns": [
            {
              "name": "LanguageId",
              "ordinal": 1
            },
            {
              "name": "Code",
              "ordinal": 2
            }
          ]
        }
      ],
      "foreignKeys": [
        {
          "name": "FK_Topics_1_Languages_LanguageId",
          "parent": "Languages",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "LanguageId",
              "parentColumn": "LanguageId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "FK_Topics_2_Topics_ParentTopicId",
          "parent": "Topics",
          "disabled": false,
          "untrusted": false,
          "columns": [
            {
              "childColumn": "ParentTopicId",
              "parentColumn": "TopicId",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Topics_1",
          "definition": "([ParentTopicId] IS NULL OR [ParentTopicId]<>[TopicId])",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Topics",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "TopicId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Topics_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "LanguageId",
              "ordinal": 1
            },
            {
              "name": "Code",
              "ordinal": 2
            }
          ]
        },
        {
          "name": "IX_Topics_ParentTopicId",
          "type": "NONCLUSTERED",
          "unique": false,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "ParentTopicId",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_Topics_Structure",
          "disabled": false,
          "definition": "\nCREATE TRIGGER dbo.TR_Topics_Structure ON dbo.Topics AFTER INSERT,UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.TopicId=d.TopicId WHERE i.LanguageId<>d.LanguageId OR ISNULL(i.ParentTopicId,0)<>ISNULL(d.ParentTopicId,0))\n THROW 51104,'Topic language/parent links are immutable; create a new topic.',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Topics p WITH(UPDLOCK,HOLDLOCK) ON p.TopicId=i.ParentTopicId WHERE p.LanguageId<>i.LanguageId)\n THROW 51105,'A topic parent must use the same language.',1;\n ;WITH ancestors AS (\n SELECT i.TopicId AS StartId,i.ParentTopicId,1 AS Depth FROM inserted i WHERE i.ParentTopicId IS NOT NULL\n UNION ALL SELECT a.StartId,p.ParentTopicId,a.Depth+1 FROM ancestors a JOIN dbo.Topics p ON p.TopicId=a.ParentTopicId WHERE a.Depth<100 AND a.ParentTopicId<>a.StartId\n )\n SELECT StartId INTO #cycles FROM ancestors WHERE StartId=ParentTopicId OR Depth=100 OPTION(MAXRECURSION 100);\n IF EXISTS(SELECT 1 FROM #cycles) THROW 51106,'Topic hierarchy must be acyclic and shorter than 100 links.',1;\nEND;\n"
        }
      ],
      "group": "Curriculum",
      "description": "Stable teaching concepts and optional broader topic groups.",
      "reasonArabic": "الموضوع موجود بالفعل في أسئلة تحديد المستوى وربط التمارين بالدروس؛ معرّف ثابت يزيل الاعتماد على ترتيب السؤال أو تشابه النصوص.",
      "relationshipExplanation": "Topic 1 → many lessons/questions and child topics; many tasks through CodingTaskTopics. Unique (LanguageId, Code).",
      "pk": [
        "TopicId"
      ],
      "unique": [
        {
          "name": "UQ_Topics_1",
          "columns": [
            "LanguageId",
            "Code"
          ]
        }
      ]
    },
    {
      "name": "Users",
      "columns": [
        {
          "name": "UserId",
          "baseType": "int",
          "maxLength": 4,
          "precision": 10,
          "scale": 0,
          "nullable": false,
          "identity": true,
          "default": null,
          "ordinal": 1,
          "type": "int",
          "isPK": true,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "Email",
          "baseType": "nvarchar",
          "maxLength": 508,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 2,
          "type": "nvarchar(254)",
          "isPK": false,
          "isFK": false,
          "isUQ": true
        },
        {
          "name": "FullName",
          "baseType": "nvarchar",
          "maxLength": 320,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": null,
          "ordinal": 3,
          "type": "nvarchar(160)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ReportedAge",
          "baseType": "tinyint",
          "maxLength": 1,
          "precision": 3,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 4,
          "type": "tinyint",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "AgeRecordedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 5,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "RoleCode",
          "baseType": "varchar",
          "maxLength": 10,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Student')",
          "ordinal": 6,
          "type": "varchar(10)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "AccountStatus",
          "baseType": "varchar",
          "maxLength": 12,
          "precision": 0,
          "scale": 0,
          "nullable": false,
          "identity": false,
          "default": "('Enabled')",
          "ordinal": 7,
          "type": "varchar(12)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "ExternalAuthSubject",
          "baseType": "nvarchar",
          "maxLength": 512,
          "precision": 0,
          "scale": 0,
          "nullable": true,
          "identity": false,
          "default": null,
          "ordinal": 8,
          "type": "nvarchar(256)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        },
        {
          "name": "CreatedAtUtc",
          "baseType": "datetime2",
          "maxLength": 7,
          "precision": 23,
          "scale": 3,
          "nullable": false,
          "identity": false,
          "default": "(sysutcdatetime())",
          "ordinal": 9,
          "type": "datetime2(3)",
          "isPK": false,
          "isFK": false,
          "isUQ": false
        }
      ],
      "keys": [
        {
          "name": "PK_Users",
          "type": "PK",
          "columns": [
            {
              "name": "UserId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Users_1",
          "type": "UQ",
          "columns": [
            {
              "name": "Email",
              "ordinal": 1
            }
          ]
        }
      ],
      "checks": [
        {
          "name": "CK_Users_1",
          "definition": "([RoleCode]='Admin' OR [RoleCode]='Student')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Users_2",
          "definition": "([AccountStatus]='Suspended' OR [AccountStatus]='Enabled')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Users_3",
          "definition": "([Email]=(lower(ltrim(rtrim([Email])))) collate Latin1_General_100_BIN2 AND [Email] like N'%_@_%._%' AND NOT [Email] like N'% %')",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Users_4",
          "definition": "(len(ltrim(rtrim([FullName])))>(0))",
          "disabled": false,
          "untrusted": false
        },
        {
          "name": "CK_Users_5",
          "definition": "([ReportedAge] IS NULL AND [AgeRecordedAtUtc] IS NULL OR [ReportedAge] IS NOT NULL AND ([ReportedAge]>=(1) AND [ReportedAge]<=(120)) AND [AgeRecordedAtUtc] IS NOT NULL)",
          "disabled": false,
          "untrusted": false
        }
      ],
      "indexes": [
        {
          "name": "PK_Users",
          "type": "CLUSTERED",
          "unique": true,
          "isPrimaryKey": true,
          "columns": [
            {
              "name": "UserId",
              "ordinal": 1
            }
          ]
        },
        {
          "name": "UQ_Users_1",
          "type": "NONCLUSTERED",
          "unique": true,
          "isPrimaryKey": false,
          "columns": [
            {
              "name": "Email",
              "ordinal": 1
            }
          ]
        }
      ],
      "triggers": [
        {
          "name": "TR_Users_StudentRole",
          "disabled": false,
          "definition": "\n/* Each GO-delimited batch is embedded in submission.sql by build-phase3.cjs.\n   Triggers are set based. UPDLOCK,HOLDLOCK serialize child writes with parent\n   finalization/publication. Direct privileged DDL/disabled triggers are outside\n   the threat model; runtime principals must never own the schema. */\nCREATE TRIGGER dbo.TR_Users_StudentRole ON dbo.Users AFTER UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.StudentProfiles p WITH(UPDLOCK,HOLDLOCK) ON p.UserId=i.UserId WHERE i.RoleCode<>'Student')\n THROW 51100,'A student-profile owner cannot become an administrator.',1;\nEND;\n"
        }
      ],
      "foreignKeys": [],
      "group": "Identity",
      "description": "One canonical account for each person, including administrators.",
      "reasonArabic": "يجمع هوية الحساب مرة واحدة؛ لا نكرر الاسم والبريد داخل كل محاولة. العمر قيمة صرّح بها المستخدم وليس تاريخ ميلاد مستنتجًا، وكلمة المرور التجريبية لا تُرحّل.",
      "relationshipExplanation": "One user has zero or one StudentProfiles row and many enrollments/attempts. Role is one code, Student or Admin, as in the current application.",
      "pk": [
        "UserId"
      ],
      "unique": [
        {
          "name": "UQ_Users_1",
          "columns": [
            "Email"
          ]
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "FK_AssessmentAttempts_1_StudentProfiles_UserId",
      "child": "AssessmentAttempts",
      "parent": "StudentProfiles",
      "columns": [
        {
          "childColumn": "UserId",
          "parentColumn": "UserId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_AssessmentAttempts_2_Assessments_AssessmentId",
      "child": "AssessmentAttempts",
      "parent": "Assessments",
      "columns": [
        {
          "childColumn": "AssessmentId",
          "parentColumn": "AssessmentId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Assessments_1_Courses_ScopeCourseId",
      "child": "Assessments",
      "parent": "Courses",
      "columns": [
        {
          "childColumn": "ScopeCourseId",
          "parentColumn": "CourseId",
          "ordinal": 1
        }
      ],
      "optional": true,
      "childMaxOne": false
    },
    {
      "id": "FK_Assessments_2_Levels_ScopeLevelId",
      "child": "Assessments",
      "parent": "Levels",
      "columns": [
        {
          "childColumn": "ScopeLevelId",
          "parentColumn": "LevelId",
          "ordinal": 1
        }
      ],
      "optional": true,
      "childMaxOne": false
    },
    {
      "id": "FK_Assessments_3_Lessons_ScopeLessonId",
      "child": "Assessments",
      "parent": "Lessons",
      "columns": [
        {
          "childColumn": "ScopeLessonId",
          "parentColumn": "LessonId",
          "ordinal": 1
        }
      ],
      "optional": true,
      "childMaxOne": false
    },
    {
      "id": "FK_AttemptAnswers_1_Answer_AttemptVersion",
      "child": "AttemptAnswers",
      "parent": "AssessmentAttempts",
      "columns": [
        {
          "childColumn": "AttemptId",
          "parentColumn": "AttemptId",
          "ordinal": 1
        },
        {
          "childColumn": "AssessmentId",
          "parentColumn": "AssessmentId",
          "ordinal": 2
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_AttemptAnswers_2_Answer_QuestionVersion",
      "child": "AttemptAnswers",
      "parent": "Questions",
      "columns": [
        {
          "childColumn": "AssessmentId",
          "parentColumn": "AssessmentId",
          "ordinal": 1
        },
        {
          "childColumn": "QuestionId",
          "parentColumn": "QuestionId",
          "ordinal": 2
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_AttemptAnswers_3_Answer_QuestionOption",
      "child": "AttemptAnswers",
      "parent": "QuestionOptions",
      "columns": [
        {
          "childColumn": "QuestionId",
          "parentColumn": "QuestionId",
          "ordinal": 1
        },
        {
          "childColumn": "OptionId",
          "parentColumn": "OptionId",
          "ordinal": 2
        }
      ],
      "optional": true,
      "childMaxOne": false
    },
    {
      "id": "FK_CodeSubmissions_1_Enrollments_EnrollmentId",
      "child": "CodeSubmissions",
      "parent": "Enrollments",
      "columns": [
        {
          "childColumn": "EnrollmentId",
          "parentColumn": "EnrollmentId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_CodeSubmissions_2_CodingTasks_TaskId",
      "child": "CodeSubmissions",
      "parent": "CodingTasks",
      "columns": [
        {
          "childColumn": "TaskId",
          "parentColumn": "TaskId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_CodingTasks_1_Levels_LevelId",
      "child": "CodingTasks",
      "parent": "Levels",
      "columns": [
        {
          "childColumn": "LevelId",
          "parentColumn": "LevelId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_CodingTaskTopics_1_CodingTasks_TaskId",
      "child": "CodingTaskTopics",
      "parent": "CodingTasks",
      "columns": [
        {
          "childColumn": "TaskId",
          "parentColumn": "TaskId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_CodingTaskTopics_2_Topics_TopicId",
      "child": "CodingTaskTopics",
      "parent": "Topics",
      "columns": [
        {
          "childColumn": "TopicId",
          "parentColumn": "TopicId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Courses_1_Languages_LanguageId",
      "child": "Courses",
      "parent": "Languages",
      "columns": [
        {
          "childColumn": "LanguageId",
          "parentColumn": "LanguageId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Courses_2_Users_CreatedByUserId",
      "child": "Courses",
      "parent": "Users",
      "columns": [
        {
          "childColumn": "CreatedByUserId",
          "parentColumn": "UserId",
          "ordinal": 1
        }
      ],
      "optional": true,
      "childMaxOne": false
    },
    {
      "id": "FK_Enrollments_1_StudentProfiles_StudentId",
      "child": "Enrollments",
      "parent": "StudentProfiles",
      "columns": [
        {
          "childColumn": "StudentId",
          "parentColumn": "UserId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Enrollments_2_Courses_CourseId",
      "child": "Enrollments",
      "parent": "Courses",
      "columns": [
        {
          "childColumn": "CourseId",
          "parentColumn": "CourseId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_LessonCompletions_1_Enrollments_EnrollmentId",
      "child": "LessonCompletions",
      "parent": "Enrollments",
      "columns": [
        {
          "childColumn": "EnrollmentId",
          "parentColumn": "EnrollmentId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_LessonCompletions_2_Lessons_LessonId",
      "child": "LessonCompletions",
      "parent": "Lessons",
      "columns": [
        {
          "childColumn": "LessonId",
          "parentColumn": "LessonId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_LessonResources_1_Lessons_LessonId",
      "child": "LessonResources",
      "parent": "Lessons",
      "columns": [
        {
          "childColumn": "LessonId",
          "parentColumn": "LessonId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Lessons_1_Levels_LevelId",
      "child": "Lessons",
      "parent": "Levels",
      "columns": [
        {
          "childColumn": "LevelId",
          "parentColumn": "LevelId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Lessons_2_Topics_TopicId",
      "child": "Lessons",
      "parent": "Topics",
      "columns": [
        {
          "childColumn": "TopicId",
          "parentColumn": "TopicId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_LevelObjectives_1_Levels_LevelId",
      "child": "LevelObjectives",
      "parent": "Levels",
      "columns": [
        {
          "childColumn": "LevelId",
          "parentColumn": "LevelId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Levels_1_Courses_CourseId",
      "child": "Levels",
      "parent": "Courses",
      "columns": [
        {
          "childColumn": "CourseId",
          "parentColumn": "CourseId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_QuestionOptions_1_Questions_QuestionId",
      "child": "QuestionOptions",
      "parent": "Questions",
      "columns": [
        {
          "childColumn": "QuestionId",
          "parentColumn": "QuestionId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Questions_1_Assessments_AssessmentId",
      "child": "Questions",
      "parent": "Assessments",
      "columns": [
        {
          "childColumn": "AssessmentId",
          "parentColumn": "AssessmentId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Questions_2_Topics_TopicId",
      "child": "Questions",
      "parent": "Topics",
      "columns": [
        {
          "childColumn": "TopicId",
          "parentColumn": "TopicId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_StudentProfiles_1_Users_UserId",
      "child": "StudentProfiles",
      "parent": "Users",
      "columns": [
        {
          "childColumn": "UserId",
          "parentColumn": "UserId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": true
    },
    {
      "id": "FK_StudentProfiles_2_Languages_PreferredLanguageId",
      "child": "StudentProfiles",
      "parent": "Languages",
      "columns": [
        {
          "childColumn": "PreferredLanguageId",
          "parentColumn": "LanguageId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_SubmissionTestResults_1_Result_SubmissionVersion",
      "child": "SubmissionTestResults",
      "parent": "CodeSubmissions",
      "columns": [
        {
          "childColumn": "SubmissionId",
          "parentColumn": "SubmissionId",
          "ordinal": 1
        },
        {
          "childColumn": "TaskId",
          "parentColumn": "TaskId",
          "ordinal": 2
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_SubmissionTestResults_2_Result_TestVersion",
      "child": "SubmissionTestResults",
      "parent": "TaskTestCases",
      "columns": [
        {
          "childColumn": "TaskId",
          "parentColumn": "TaskId",
          "ordinal": 1
        },
        {
          "childColumn": "TestCaseId",
          "parentColumn": "TestCaseId",
          "ordinal": 2
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_TaskHints_1_CodingTasks_TaskId",
      "child": "TaskHints",
      "parent": "CodingTasks",
      "columns": [
        {
          "childColumn": "TaskId",
          "parentColumn": "TaskId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_TaskTestCases_1_CodingTasks_TaskId",
      "child": "TaskTestCases",
      "parent": "CodingTasks",
      "columns": [
        {
          "childColumn": "TaskId",
          "parentColumn": "TaskId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_TaskWorkspaceState_1_Enrollments_EnrollmentId",
      "child": "TaskWorkspaceState",
      "parent": "Enrollments",
      "columns": [
        {
          "childColumn": "EnrollmentId",
          "parentColumn": "EnrollmentId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_TaskWorkspaceState_2_CodingTasks_TaskId",
      "child": "TaskWorkspaceState",
      "parent": "CodingTasks",
      "columns": [
        {
          "childColumn": "TaskId",
          "parentColumn": "TaskId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Topics_1_Languages_LanguageId",
      "child": "Topics",
      "parent": "Languages",
      "columns": [
        {
          "childColumn": "LanguageId",
          "parentColumn": "LanguageId",
          "ordinal": 1
        }
      ],
      "optional": false,
      "childMaxOne": false
    },
    {
      "id": "FK_Topics_2_Topics_ParentTopicId",
      "child": "Topics",
      "parent": "Topics",
      "columns": [
        {
          "childColumn": "ParentTopicId",
          "parentColumn": "TopicId",
          "ordinal": 1
        }
      ],
      "optional": true,
      "childMaxOne": false
    }
  ],
  "rules": [
    {
      "title": "One account, student-owned evidence",
      "text": "StudentProfiles has a shared primary/foreign key. Its trigger checks Users.RoleCode under update/range locks; Users cannot change that owner to Admin. Attempts and enrollments reference StudentProfiles, so administrator accounts cannot own learning records. Backend authentication and enabled/suspended access checks remain separate responsibilities."
    },
    {
      "title": "Course ownership stays consistent",
      "text": "Database triggers join enrollment → course and lesson/task → level → course on completion, workspace and submission writes. Enrollment ownership and curriculum parent links cannot be reassigned. Placement may precede enrollment; lesson/level attempts require active enrollment. A level quiz also requires every published lesson of that level to be completed. Open coding practice within the enrolled course is retained."
    },
    {
      "title": "Answers belong to the attempted version",
      "text": "AttemptAnswers uses composite foreign keys (AttemptId, AssessmentId), (AssessmentId, QuestionId) and (QuestionId, OptionId). Its PK prevents conflicting duplicate answers. AssessmentId here is controlled redundant key context for declarative integrity, never an independently editable fact. Missing row = unanswered; unsure = explicit response with no OptionId. Submitted attempts require all questions answered and become immutable."
    },
    {
      "title": "Publish once; version changes explicitly",
      "text": "Build assessment/task versions as Draft, add their children, then publish. Publication requires at least two options and exactly one correct option per question; coding publication needs tests and topic links. Published parents, grading keys, test definitions, hints and task-topic links are frozen, even before first submission. To revise, insert a new parent with the same logical code and a higher VersionNo, copy/review children with new IDs, and publish. Existing attempts keep their original IDs."
    },
    {
      "title": "Execution completion differs from passing",
      "text": "Pending → Running → Completed/Error/Cancelled; Pending may also become Cancelled. Submitted code/environment/provenance are immutable. Results are append-only and may only be inserted while Running. Completed requires successful executions and either a failed case or all defined cases passing; Error carries a diagnostic and may have zero results. A timeout/runtime error is not Completed. Missing cases remain NotRun, never silently failed. Exact output comparison is only one check: a future trusted evaluator must also run VerificationCode safely."
    },
    {
      "title": "Current state and historical evidence",
      "text": "TaskWorkspaceState is mutable; CodeSubmissions is a fixed code snapshot. First LessonCompletions facts are append-only and distinguish manual, correct-answer and imported methods. Correct-answer completion requires submitted, matching-origin correct evidence. Percentages, latest/best results and passing task counts are queries/views, not editable totals. Shared profile keys and junction keys do not use IDENTITY."
    },
    {
      "title": "Trust, Unicode, UTC and unknown facts",
      "text": "NVARCHAR stores user-facing Unicode. DATETIME2(3) timestamps use UTC; the Utc suffix is a caller contract, not automatic timezone conversion. Canonical email comparison is case insensitive, accent sensitive; trimmed lowercase is required. Academic seed records are fictional. Browser-import origin remains unverified; no migration UI or automatic trust promotion is implemented. Unknown imported completion times may stay null. Runtime/error text and submitted code need backend size, access and retention limits."
    },
    {
      "title": "Keys, normalization and indexes",
      "text": "23 clustered primary keys define row identity. Unique nonclustered constraints enforce logical/version pairs, ordering and enrollment uniqueness. Additional nonclustered indexes support foreign-key lookup paths. Atomic options, objectives, hints and result rows meet 1NF; junctions avoid partial dependencies; names/totals are not copied into learning records. AssessmentId/TaskId key context in two evidence junctions is a deliberate physical integrity tradeoff, documented rather than claimed to be strictly redundancy-free 3NF."
    },
    {
      "title": "Scope and future integration",
      "text": "No optional application tables are installed. Mentor history can later reference Users/Lessons/CodingTasks; services/peer mentoring and portfolios need consent and scheduling/publication policies; internships require their independent project-participation pack; certificates need immutable issuance evidence; ML needs real longitudinal data, labels, held-out evaluation and model lineage. The frontend remains browser-local, with prepared mentor replies and deterministic recommendations. SQL fixtures do not connect it to this database."
    }
  ],
  "modules": [
    {
      "name": "fnPercentage",
      "type": "FN",
      "definition": "\nCREATE FUNCTION dbo.fnPercentage(@Numerator int,@Denominator int) RETURNS decimal(6,2) WITH SCHEMABINDING AS\nBEGIN\n RETURN CASE WHEN @Denominator>0 AND @Numerator>=0 THEN CONVERT(decimal(6,2),100.0*@Numerator/@Denominator) ELSE NULL END;\nEND;\n"
    },
    {
      "name": "fnStudentCourseSummary",
      "type": "IF",
      "definition": "\nCREATE FUNCTION dbo.fnStudentCourseSummary(@StudentId int) RETURNS TABLE AS RETURN\n SELECT p.EnrollmentId,c.Title,p.LessonCount,p.CompletedLessonCount,p.PassedTaskCount,\n dbo.fnPercentage(p.CompletedLessonCount,p.LessonCount) AS CompletionPercent\n FROM dbo.vEnrollmentProgress p JOIN dbo.Courses c ON c.CourseId=p.CourseId WHERE p.StudentId=@StudentId;\n"
    },
    {
      "name": "uspEnrollStudent",
      "type": "P",
      "definition": "\nCREATE PROCEDURE dbo.uspEnrollStudent @StudentId int,@CourseId int AS\nBEGIN\n SET NOCOUNT ON; SET XACT_ABORT ON;\n BEGIN TRY\n BEGIN TRANSACTION;\n IF NOT EXISTS(SELECT 1 FROM dbo.StudentProfiles p JOIN dbo.Users u WITH(UPDLOCK,HOLDLOCK) ON u.UserId=p.UserId WHERE p.UserId=@StudentId AND u.AccountStatus='Enabled') THROW 51200,'An enabled student account is required.',1;\n IF NOT EXISTS(SELECT 1 FROM dbo.Courses WITH(UPDLOCK,HOLDLOCK) WHERE CourseId=@CourseId AND PublicationStatus='Published') THROW 51201,'An available published course is required.',1;\n IF EXISTS(SELECT 1 FROM dbo.Enrollments WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@StudentId AND CourseId=@CourseId) THROW 51202,'Student is already enrolled.',1;\n INSERT dbo.Enrollments(StudentId,CourseId) VALUES(@StudentId,@CourseId);\n SELECT CONVERT(int,SCOPE_IDENTITY()) EnrollmentId;\n COMMIT;\n END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;\nEND;\n"
    },
    {
      "name": "uspQueueCodeSubmission",
      "type": "P",
      "definition": "\nCREATE PROCEDURE dbo.uspQueueCodeSubmission @EnrollmentId int,@TaskId int,@CodeText nvarchar(max),@ExecutionEnvironment nvarchar(100),@RuntimeVersion nvarchar(80)=NULL,@EvaluatorVersion nvarchar(80)=NULL AS\nBEGIN\n SET NOCOUNT ON; SET XACT_ABORT ON;\n INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment,RuntimeVersion,EvaluatorVersion) VALUES(@EnrollmentId,@TaskId,@CodeText,@ExecutionEnvironment,@RuntimeVersion,@EvaluatorVersion);\n SELECT CONVERT(int,SCOPE_IDENTITY()) SubmissionId;\nEND;\n"
    },
    {
      "name": "uspSubmitAssessment",
      "type": "P",
      "definition": "\nCREATE PROCEDURE dbo.uspSubmitAssessment @AttemptId int AS\nBEGIN\n SET NOCOUNT ON; SET XACT_ABORT ON;\n BEGIN TRY\n BEGIN TRANSACTION;\n IF NOT EXISTS(SELECT 1 FROM dbo.AssessmentAttempts WITH(UPDLOCK,HOLDLOCK) WHERE AttemptId=@AttemptId AND Status='InProgress') THROW 51203,'An in-progress attempt is required.',1;\n UPDATE dbo.AssessmentAttempts SET Status='Submitted',SubmittedAtUtc=SYSUTCDATETIME() WHERE AttemptId=@AttemptId;\n SELECT * FROM dbo.vAssessmentScores WHERE AttemptId=@AttemptId;\n COMMIT;\n END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;\nEND;\n"
    },
    {
      "name": "vAssessmentScores",
      "type": "V",
      "definition": "\nCREATE VIEW dbo.vAssessmentScores AS\n SELECT a.AttemptId,a.UserId,a.AssessmentId,a.Status,a.EvidenceOrigin,a.SubmittedAtUtc,\n COUNT(q.QuestionId) AS QuestionCount,\n SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END) AS CorrectCount,\n CAST(100.0*SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)/NULLIF(COUNT(q.QuestionId),0) AS decimal(5,2)) AS ScorePercent\n FROM dbo.AssessmentAttempts a JOIN dbo.Questions q ON q.AssessmentId=a.AssessmentId\n LEFT JOIN dbo.AttemptAnswers x ON x.AttemptId=a.AttemptId AND x.QuestionId=q.QuestionId\n LEFT JOIN dbo.QuestionOptions o ON o.OptionId=x.OptionId\n GROUP BY a.AttemptId,a.UserId,a.AssessmentId,a.Status,a.EvidenceOrigin,a.SubmittedAtUtc;\n"
    },
    {
      "name": "vEnrollmentProgress",
      "type": "V",
      "definition": "\nCREATE VIEW dbo.vEnrollmentProgress AS\n SELECT e.EnrollmentId,e.StudentId,e.CourseId,\n (SELECT COUNT(*) FROM dbo.Lessons l JOIN dbo.Levels lv ON lv.LevelId=l.LevelId WHERE lv.CourseId=e.CourseId AND l.PublicationStatus='Published') AS LessonCount,\n (SELECT COUNT(*) FROM dbo.LessonCompletions lc WHERE lc.EnrollmentId=e.EnrollmentId) AS CompletedLessonCount,\n (SELECT COUNT(DISTINCT t.TaskCode) FROM dbo.vSubmissionOutcomes o JOIN dbo.CodingTasks t ON t.TaskId=o.TaskId WHERE o.EnrollmentId=e.EnrollmentId AND o.AllTestsPassed=1) AS PassedTaskCount\n FROM dbo.Enrollments e;\n"
    },
    {
      "name": "vSubmissionOutcomes",
      "type": "V",
      "definition": "\nCREATE VIEW dbo.vSubmissionOutcomes AS\n SELECT s.SubmissionId,s.EnrollmentId,s.TaskId,s.EvaluationStatus,s.EvidenceOrigin,\n tc.ExpectedCaseCount, r.ExecutedCaseCount,r.PassedCaseCount,r.FailedCaseCount,\n tc.ExpectedCaseCount-r.ExecutedCaseCount AS NotRunCaseCount,\n CAST(CASE WHEN s.EvaluationStatus='Completed' AND r.ExecutedCaseCount=tc.ExpectedCaseCount AND tc.ExpectedCaseCount>0 AND r.PassedCaseCount=tc.ExpectedCaseCount THEN 1 ELSE 0 END AS bit) AS AllTestsPassed\n FROM dbo.CodeSubmissions s\n CROSS APPLY(SELECT COUNT(*) ExpectedCaseCount FROM dbo.TaskTestCases t WHERE t.TaskId=s.TaskId)tc\n CROSS APPLY(SELECT COUNT(*) ExecutedCaseCount,COALESCE(SUM(CONVERT(int,Passed)),0) PassedCaseCount,COALESCE(SUM(CASE WHEN Passed=0 THEN 1 ELSE 0 END),0) FailedCaseCount FROM dbo.SubmissionTestResults x WHERE x.SubmissionId=s.SubmissionId)r;\n"
    }
  ],
  "sql": "/* CodeMentor AI Phase 3. SQL Server 2019+; SSMS, no SQLCMD mode.\n   Change ONLY @DatabaseName. Existing targets fail before any modification.\n   Exactly 23 core tables; sample identities are fictional, no authentication. */\nUSE [master];\nSET NOCOUNT ON;\nSET XACT_ABORT ON;\nDECLARE @DatabaseName sysname = N'CodeMentorAI_Phase3_Test_20261105_R3';\nIF @DatabaseName IS NULL OR @DatabaseName NOT LIKE N'CodeMentorAI_Phase3[_]%' OR @DatabaseName COLLATE Latin1_General_100_CI_AS = N'CodeMentorAI_Learning'\n    THROW 51000, 'Use a distinct CodeMentorAI_Phase3_ database name.', 1;\nIF DB_ID(@DatabaseName) IS NOT NULL THROW 51001, 'Target already exists; nothing was changed. Choose an unused name.', 1;\nDECLARE @Create nvarchar(max)=N'CREATE DATABASE '+QUOTENAME(@DatabaseName)+N' COLLATE Latin1_General_100_CI_AS_SC;';\nBEGIN TRY\n EXEC sys.sp_executesql @Create;\nEND TRY\nBEGIN CATCH\n THROW;\nEND CATCH;\nDECLARE @Install nvarchar(max)=N'USE '+QUOTENAME(@DatabaseName)+N'; SET XACT_ABORT ON; SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; BEGIN TRY BEGIN TRANSACTION; '+N'EXEC sys.sp_executesql N''CREATE TABLE dbo.[Users] (\n    [UserId] int IDENTITY(1,1) NOT NULL,\n    [Email] nvarchar(254) NOT NULL,\n    [FullName] nvarchar(160) NOT NULL,\n    [ReportedAge] tinyint NULL,\n    [AgeRecordedAtUtc] datetime2(3) NULL,\n    [RoleCode] varchar(10) NOT NULL CONSTRAINT [DF_Users_RoleCode] DEFAULT (''''Student''''),\n    [AccountStatus] varchar(12) NOT NULL CONSTRAINT [DF_Users_AccountStatus] DEFAULT (''''Enabled''''),\n    [ExternalAuthSubject] nvarchar(256) NULL,\n    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Users_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),\n    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([UserId]),\n    CONSTRAINT [UQ_Users_1] UNIQUE NONCLUSTERED (Email),\n    CONSTRAINT [CK_Users_1] CHECK (RoleCode IN (''''Student'''',''''Admin'''')),\n    CONSTRAINT [CK_Users_2] CHECK (AccountStatus IN (''''Enabled'''',''''Suspended'''')),\n    CONSTRAINT [CK_Users_3] CHECK (Email = LOWER(LTRIM(RTRIM(Email))) COLLATE Latin1_General_100_BIN2 AND Email LIKE N''''%_@_%._%'''' AND Email NOT LIKE N''''% %''''),\n    CONSTRAINT [CK_Users_4] CHECK (LEN(LTRIM(RTRIM(FullName))) > 0),\n    CONSTRAINT [CK_Users_5] CHECK ((ReportedAge IS NULL AND AgeRecordedAtUtc IS NULL) OR (ReportedAge IS NOT NULL AND ReportedAge BETWEEN 1 AND 120 AND AgeRecordedAtUtc IS NOT NULL))\n);\n\nCREATE TABLE dbo.[Languages] (\n    [LanguageId] int IDENTITY(1,1) NOT NULL,\n    [Slug] varchar(40) NOT NULL,\n    [Name] nvarchar(80) NOT NULL,\n    [Description] nvarchar(600) NOT NULL,\n    [ContentReadinessCode] varchar(12) NOT NULL CONSTRAINT [DF_Languages_ContentReadinessCode] DEFAULT (''''ComingSoon''''),\n    CONSTRAINT [PK_Languages] PRIMARY KEY CLUSTERED ([LanguageId]),\n    CONSTRAINT [UQ_Languages_1] UNIQUE NONCLUSTERED (Slug),\n    CONSTRAINT [UQ_Languages_2] UNIQUE NONCLUSTERED (Name),\n    CONSTRAINT [CK_Languages_1] CHECK (ContentReadinessCode IN (''''Ready'''',''''ComingSoon''''))\n);\n\nCREATE TABLE dbo.[StudentProfiles] (\n    [UserId] int NOT NULL,\n    [PreferredLanguageId] int NOT NULL,\n    [ExperienceCode] varchar(20) NOT NULL,\n    [LearningGoalCode] varchar(30) NOT NULL,\n    [UpdatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_StudentProfiles_UpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),\n    CONSTRAINT [PK_StudentProfiles] PRIMARY KEY CLUSTERED ([UserId]),\n    CONSTRAINT [CK_StudentProfiles_1] CHECK (ExperienceCode IN (''''Beginner'''',''''SomeExperience'''',''''Experienced'''')),\n    CONSTRAINT [CK_StudentProfiles_2] CHECK (LearningGoalCode IN (''''Foundations'''',''''Projects'''',''''Career'''')),\n    CONSTRAINT [FK_StudentProfiles_1_Users_UserId] FOREIGN KEY (UserId) REFERENCES dbo.[Users] (UserId),\n    CONSTRAINT [FK_StudentProfiles_2_Languages_PreferredLanguageId] FOREIGN KEY (PreferredLanguageId) REFERENCES dbo.[Languages] (LanguageId)\n);\n\nCREATE TABLE dbo.[Courses] (\n    [CourseId] int IDENTITY(1,1) NOT NULL,\n    [LanguageId] int NOT NULL,\n    [Slug] varchar(80) NOT NULL,\n    [Title] nvarchar(200) NOT NULL,\n    [Description] nvarchar(max) NOT NULL,\n    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Courses_PublicationStatus] DEFAULT (''''Draft''''),\n    [CreatedByUserId] int NULL,\n    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Courses_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),\n    [ContentVersion] rowversion NOT NULL,\n    CONSTRAINT [PK_Courses] PRIMARY KEY CLUSTERED ([CourseId]),\n    CONSTRAINT [UQ_Courses_1] UNIQUE NONCLUSTERED (Slug),\n    CONSTRAINT [CK_Courses_1] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''',''''Archived'''')),\n    CONSTRAINT [FK_Courses_1_Languages_LanguageId] FOREIGN KEY (LanguageId) REFERENCES dbo.[Languages] (LanguageId),\n    CONSTRAINT [FK_Courses_2_Users_CreatedByUserId] FOREIGN KEY (CreatedByUserId) REFERENCES dbo.[Users] (UserId)\n);\n\nCREATE TABLE dbo.[Levels] (\n    [LevelId] int IDENTITY(1,1) NOT NULL,\n    [CourseId] int NOT NULL,\n    [Title] nvarchar(200) NOT NULL,\n    [Description] nvarchar(max) NOT NULL,\n    [SortOrder] smallint NOT NULL,\n    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Levels_PublicationStatus] DEFAULT (''''Draft''''),\n    [CreatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Levels_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),\n    CONSTRAINT [PK_Levels] PRIMARY KEY CLUSTERED ([LevelId]),\n    CONSTRAINT [UQ_Levels_1] UNIQUE NONCLUSTERED (CourseId, SortOrder),\n    CONSTRAINT [CK_Levels_1] CHECK (SortOrder > 0),\n    CONSTRAINT [CK_Levels_2] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''',''''Archived'''')),\n    CONSTRAINT [FK_Levels_1_Courses_CourseId] FOREIGN KEY (CourseId) REFERENCES dbo.[Courses] (CourseId)\n);\n\nCREATE TABLE dbo.[LevelObjectives] (\n    [LevelId] int NOT NULL,\n    [ObjectiveNo] smallint NOT NULL,\n    [ObjectiveText] nvarchar(1000) NOT NULL,\n    CONSTRAINT [PK_LevelObjectives] PRIMARY KEY CLUSTERED ([LevelId], [ObjectiveNo]),\n    CONSTRAINT [CK_LevelObjectives_1] CHECK (ObjectiveNo > 0),\n    CONSTRAINT [FK_LevelObjectives_1_Levels_LevelId] FOREIGN KEY (LevelId) REFERENCES dbo.[Levels] (LevelId)\n);\n\nCREATE TABLE dbo.[Topics] (\n    [TopicId] int IDENTITY(1,1) NOT NULL,\n    [LanguageId] int NOT NULL,\n    [ParentTopicId] int NULL,\n    [Code] varchar(80) NOT NULL,\n    [Name] nvarchar(160) NOT NULL,\n    CONSTRAINT [PK_Topics] PRIMARY KEY CLUSTERED ([TopicId]),\n    CONSTRAINT [UQ_Topics_1] UNIQUE NONCLUSTERED (LanguageId, Code),\n    CONSTRAINT [CK_Topics_1] CHECK (ParentTopicId IS NULL OR ParentTopicId <> TopicId),\n    CONSTRAINT [FK_Topics_1_Languages_LanguageId] FOREIGN KEY (LanguageId) REFERENCES dbo.[Languages] (LanguageId),\n    CONSTRAINT [FK_Topics_2_Topics_ParentTopicId] FOREIGN KEY (ParentTopicId) REFERENCES dbo.[Topics] (TopicId)\n);\n\nCREATE TABLE dbo.[Lessons] (\n    [LessonId] int IDENTITY(1,1) NOT NULL,\n    [LevelId] int NOT NULL,\n    [TopicId] int NOT NULL,\n    [Slug] varchar(80) NOT NULL,\n    [Title] nvarchar(200) NOT NULL,\n    [Summary] nvarchar(1000) NOT NULL,\n    [Body] nvarchar(max) NOT NULL,\n    [ExampleCode] nvarchar(max) NOT NULL,\n    [PreparedOutput] nvarchar(max) NOT NULL,\n    [EstimatedMinutes] smallint NOT NULL,\n    [SortOrder] smallint NOT NULL,\n    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Lessons_PublicationStatus] DEFAULT (''''Draft''''),\n    [UpdatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Lessons_UpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),\n    CONSTRAINT [PK_Lessons] PRIMARY KEY CLUSTERED ([LessonId]),\n    CONSTRAINT [UQ_Lessons_1] UNIQUE NONCLUSTERED (LevelId, Slug),\n    CONSTRAINT [UQ_Lessons_2] UNIQUE NONCLUSTERED (LevelId, SortOrder),\n    CONSTRAINT [CK_Lessons_1] CHECK (EstimatedMinutes > 0),\n    CONSTRAINT [CK_Lessons_2] CHECK (SortOrder > 0),\n    CONSTRAINT [CK_Lessons_3] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''',''''Archived'''')),\n    CONSTRAINT [FK_Lessons_1_Levels_LevelId] FOREIGN KEY (LevelId) REFERENCES dbo.[Levels] (LevelId),\n    CONSTRAINT [FK_Lessons_2_Topics_TopicId] FOREIGN KEY (TopicId) REFERENCES dbo.[Topics] (TopicId)\n);\n\nCREATE TABLE dbo.[LessonResources] (\n    [ResourceId] int IDENTITY(1,1) NOT NULL,\n    [LessonId] int NOT NULL,\n    [Title] nvarchar(200) NOT NULL,\n    [Url] nvarchar(2048) NOT NULL,\n    [ResourceType] varchar(20) NOT NULL,\n    [ResourceLanguage] nvarchar(40) NULL,\n    [SortOrder] smallint NOT NULL,\n    CONSTRAINT [PK_LessonResources] PRIMARY KEY CLUSTERED ([ResourceId]),\n    CONSTRAINT [UQ_LessonResources_1] UNIQUE NONCLUSTERED (LessonId, SortOrder),\n    CONSTRAINT [CK_LessonResources_1] CHECK (SortOrder > 0),\n    CONSTRAINT [CK_LessonResources_2] CHECK (ResourceType IN (''''Video'''',''''Documentation'''',''''Other'''')),\n    CONSTRAINT [FK_LessonResources_1_Lessons_LessonId] FOREIGN KEY (LessonId) REFERENCES dbo.[Lessons] (LessonId)\n);\n\nCREATE TABLE dbo.[Assessments] (\n    [AssessmentId] int IDENTITY(1,1) NOT NULL,\n    [LogicalCode] varchar(100) NOT NULL,\n    [VersionNo] smallint NOT NULL,\n    [Kind] varchar(12) NOT NULL,\n    [ScopeCourseId] int NULL,\n    [ScopeLevelId] int NULL,\n    [ScopeLessonId] int NULL,\n    [Title] nvarchar(200) NOT NULL,\n    [PassPercent] decimal(5,2) NULL,\n    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Assessments_PublicationStatus] DEFAULT (''''Draft''''),\n    CONSTRAINT [PK_Assessments] PRIMARY KEY CLUSTERED ([AssessmentId]),\n    CONSTRAINT [UQ_Assessments_1] UNIQUE NONCLUSTERED (LogicalCode, VersionNo),\n    CONSTRAINT [CK_Assessments_1] CHECK (VersionNo > 0),\n    CONSTRAINT [CK_Assessments_2] CHECK ((Kind=''''Placement'''' AND ScopeCourseId IS NOT NULL AND ScopeLevelId IS NULL AND ScopeLessonId IS NULL AND PassPercent IS NULL) OR (Kind=''''LevelQuiz'''' AND ScopeCourseId IS NULL AND ScopeLevelId IS NOT NULL AND ScopeLessonId IS NULL AND PassPercent IS NOT NULL AND PassPercent BETWEEN 0 AND 100) OR (Kind=''''LessonCheck'''' AND ScopeCourseId IS NULL AND ScopeLevelId IS NULL AND ScopeLessonId IS NOT NULL AND PassPercent IS NOT NULL AND PassPercent=100)),\n    CONSTRAINT [CK_Assessments_3] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''')),\n    CONSTRAINT [FK_Assessments_1_Courses_ScopeCourseId] FOREIGN KEY (ScopeCourseId) REFERENCES dbo.[Courses] (CourseId),\n    CONSTRAINT [FK_Assessments_2_Levels_ScopeLevelId] FOREIGN KEY (ScopeLevelId) REFERENCES dbo.[Levels] (LevelId),\n    CONSTRAINT [FK_Assessments_3_Lessons_ScopeLessonId] FOREIGN KEY (ScopeLessonId) REFERENCES dbo.[Lessons] (LessonId)\n);\n\nCREATE TABLE dbo.[Questions] (\n    [QuestionId] int IDENTITY(1,1) NOT NULL,\n    [AssessmentId] int NOT NULL,\n    [TopicId] int NOT NULL,\n    [Prompt] nvarchar(max) NOT NULL,\n    [CodeSnippet] nvarchar(max) NULL,\n    [Explanation] nvarchar(max) NULL,\n    [SortOrder] smallint NOT NULL,\n    CONSTRAINT [PK_Questions] PRIMARY KEY CLUSTERED ([QuestionId]),\n    CONSTRAINT [UQ_Questions_1] UNIQUE NONCLUSTERED (AssessmentId, SortOrder),\n    CONSTRAINT [UQ_Questions_2] UNIQUE NONCLUSTERED (AssessmentId, QuestionId),\n    CONSTRAINT [CK_Questions_1] CHECK (SortOrder > 0),\n    CONSTRAINT [FK_Questions_1_Assessments_AssessmentId] FOREIGN KEY (AssessmentId) REFERENCES dbo.[Assessments] (AssessmentId),\n    CONSTRAINT [FK_Questions_2_Topics_TopicId] FOREIGN KEY (TopicId) REFERENCES dbo.[Topics] (TopicId)\n);\n\nCREATE TABLE dbo.[QuestionOptions] (\n    [OptionId] int IDENTITY(1,1) NOT NULL,\n    [QuestionId] int NOT NULL,\n    [OptionText] nvarchar(1000) NOT NULL,\n    [IsCorrect] bit NOT NULL,\n    [SortOrder] smallint NOT NULL,\n    CONSTRAINT [PK_QuestionOptions] PRIMARY KEY CLUSTERED ([OptionId]),\n    CONSTRAINT [UQ_QuestionOptions_1] UNIQUE NONCLUSTERED (QuestionId, SortOrder),\n    CONSTRAINT [UQ_QuestionOptions_2] UNIQUE NONCLUSTERED (QuestionId, OptionId),\n    CONSTRAINT [CK_QuestionOptions_1] CHECK (SortOrder > 0),\n    CONSTRAINT [FK_QuestionOptions_1_Questions_QuestionId] FOREIGN KEY (QuestionId) REFERENCES dbo.[Questions] (QuestionId)\n);\n\nCREATE TABLE dbo.[AssessmentAttempts] (\n    [AttemptId] int IDENTITY(1,1) NOT NULL,\n    [UserId] int NOT NULL,\n    [AssessmentId] int NOT NULL,\n    [Status] varchar(12) NOT NULL CONSTRAINT [DF_AssessmentAttempts_Status] DEFAULT (''''InProgress''''),\n    [CurrentQuestionNo] smallint NULL,\n    [StartedAtUtc] datetime2(3) NULL CONSTRAINT [DF_AssessmentAttempts_StartedAtUtc] DEFAULT (SYSUTCDATETIME()),\n    [SubmittedAtUtc] datetime2(3) NULL,\n    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_AssessmentAttempts_EvidenceOrigin] DEFAULT (''''server''''),\n    [ImportedAtUtc] datetime2(3) NULL,\n    CONSTRAINT [PK_AssessmentAttempts] PRIMARY KEY CLUSTERED ([AttemptId]),\n    CONSTRAINT [UQ_AssessmentAttempts_1] UNIQUE NONCLUSTERED (AttemptId, AssessmentId),\n    CONSTRAINT [CK_AssessmentAttempts_1] CHECK (Status IN (''''InProgress'''',''''Submitted'''',''''Cancelled'''')),\n    CONSTRAINT [CK_AssessmentAttempts_2] CHECK (CurrentQuestionNo IS NULL OR CurrentQuestionNo > 0),\n    CONSTRAINT [CK_AssessmentAttempts_3] CHECK ((Status=''''Submitted'''' AND (EvidenceOrigin=''''browser-import'''' OR SubmittedAtUtc IS NOT NULL) AND (SubmittedAtUtc IS NULL OR StartedAtUtc IS NULL OR SubmittedAtUtc >= StartedAtUtc)) OR (Status <> ''''Submitted'''' AND SubmittedAtUtc IS NULL)),\n    CONSTRAINT [CK_AssessmentAttempts_4] CHECK (EvidenceOrigin IN (''''server'''',''''academic-seed'''',''''browser-import'''')),\n    CONSTRAINT [CK_AssessmentAttempts_5] CHECK (EvidenceOrigin=''''browser-import'''' OR StartedAtUtc IS NOT NULL),\n    CONSTRAINT [CK_AssessmentAttempts_6] CHECK ((EvidenceOrigin=''''browser-import'''' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>''''browser-import'''' AND ImportedAtUtc IS NULL)),\n    CONSTRAINT [FK_AssessmentAttempts_1_StudentProfiles_UserId] FOREIGN KEY (UserId) REFERENCES dbo.[StudentProfiles] (UserId),\n    CONSTRAINT [FK_AssessmentAttempts_2_Assessments_AssessmentId] FOREIGN KEY (AssessmentId) REFERENCES dbo.[Assessments] (AssessmentId)\n);\n\nCREATE TABLE dbo.[AttemptAnswers] (\n    [AttemptId] int NOT NULL,\n    [QuestionId] int NOT NULL,\n    [AssessmentId] int NOT NULL,\n    [OptionId] int NULL,\n    [ResponseKind] varchar(8) NOT NULL,\n    [AnsweredAtUtc] datetime2(3) NULL,\n    CONSTRAINT [PK_AttemptAnswers] PRIMARY KEY CLUSTERED ([AttemptId], [QuestionId]),\n    CONSTRAINT [CK_AttemptAnswers_1] CHECK ((ResponseKind=''''option'''' AND OptionId IS NOT NULL) OR (ResponseKind=''''unsure'''' AND OptionId IS NULL)),\n    CONSTRAINT [FK_AttemptAnswers_1_Answer_AttemptVersion] FOREIGN KEY (AttemptId, AssessmentId) REFERENCES dbo.[AssessmentAttempts] (AttemptId, AssessmentId),\n    CONSTRAINT [FK_AttemptAnswers_2_Answer_QuestionVersion] FOREIGN KEY (AssessmentId, QuestionId) REFERENCES dbo.[Questions] (AssessmentId, QuestionId),\n    CONSTRAINT [FK_AttemptAnswers_3_Answer_QuestionOption] FOREIGN KEY (QuestionId, OptionId) REFERENCES dbo.[QuestionOptions] (QuestionId, OptionId)\n);\n\nCREATE TABLE dbo.[Enrollments] (\n    [EnrollmentId] int IDENTITY(1,1) NOT NULL,\n    [StudentId] int NOT NULL,\n    [CourseId] int NOT NULL,\n    [EnrolledAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_Enrollments_EnrolledAtUtc] DEFAULT (SYSUTCDATETIME()),\n    [ParticipationStatus] varchar(12) NOT NULL CONSTRAINT [DF_Enrollments_ParticipationStatus] DEFAULT (''''Active''''),\n    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_Enrollments_EvidenceOrigin] DEFAULT (''''server''''),\n    CONSTRAINT [PK_Enrollments] PRIMARY KEY CLUSTERED ([EnrollmentId]),\n    CONSTRAINT [UQ_Enrollments_1] UNIQUE NONCLUSTERED (StudentId, CourseId),\n    CONSTRAINT [CK_Enrollments_1] CHECK (ParticipationStatus IN (''''Active'''',''''Paused'''',''''Completed'''')),\n    CONSTRAINT [CK_Enrollments_2] CHECK (EvidenceOrigin IN (''''server'''',''''academic-seed'''',''''browser-import'''')),\n    CONSTRAINT [FK_Enrollments_1_StudentProfiles_StudentId] FOREIGN KEY (StudentId) REFERENCES dbo.[StudentProfiles] (UserId),\n    CONSTRAINT [FK_Enrollments_2_Courses_CourseId] FOREIGN KEY (CourseId) REFERENCES dbo.[Courses] (CourseId)\n);\n\nCREATE TABLE dbo.[LessonCompletions] (\n    [EnrollmentId] int NOT NULL,\n    [LessonId] int NOT NULL,\n    [CompletedAtUtc] datetime2(3) NULL,\n    [CompletionMethod] varchar(16) NOT NULL,\n    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_LessonCompletions_EvidenceOrigin] DEFAULT (''''server''''),\n    [ImportedAtUtc] datetime2(3) NULL,\n    CONSTRAINT [PK_LessonCompletions] PRIMARY KEY CLUSTERED ([EnrollmentId], [LessonId]),\n    CONSTRAINT [CK_LessonCompletions_1] CHECK (CompletionMethod IN (''''manual'''',''''correct-answer'''',''''imported'''')),\n    CONSTRAINT [CK_LessonCompletions_2] CHECK (EvidenceOrigin IN (''''server'''',''''academic-seed'''',''''browser-import'''')),\n    CONSTRAINT [CK_LessonCompletions_3] CHECK ((EvidenceOrigin=''''browser-import'''' AND CompletionMethod=''''imported'''' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>''''browser-import'''' AND CompletionMethod<>''''imported'''' AND ImportedAtUtc IS NULL AND CompletedAtUtc IS NOT NULL)),\n    CONSTRAINT [FK_LessonCompletions_1_Enrollments_EnrollmentId] FOREIGN KEY (EnrollmentId) REFERENCES dbo.[Enrollments] (EnrollmentId),\n    CONSTRAINT [FK_LessonCompletions_2_Lessons_LessonId] FOREIGN KEY (LessonId) REFERENCES dbo.[Lessons] (LessonId)\n);\n\nCREATE TABLE dbo.[CodingTasks] (\n    [TaskId] int IDENTITY(1,1) NOT NULL,\n    [LevelId] int NOT NULL,\n    [TaskCode] varchar(80) NOT NULL,\n    [VersionNo] smallint NOT NULL,\n    [TaskKind] varchar(12) NOT NULL,\n    [Title] nvarchar(200) NOT NULL,\n    [Description] nvarchar(max) NOT NULL,\n    [RequirementsText] nvarchar(max) NOT NULL,\n    [StarterCode] nvarchar(max) NOT NULL,\n    [SampleInput] nvarchar(max) NOT NULL,\n    [SampleOutput] nvarchar(max) NOT NULL,\n    [ReferenceSolution] nvarchar(max) NOT NULL,\n    [SolutionExplanation] nvarchar(max) NOT NULL,\n    [VerificationCode] nvarchar(max) NULL,\n    [SortOrder] smallint NOT NULL,\n    [PublicationStatus] varchar(12) NOT NULL CONSTRAINT [DF_CodingTasks_PublicationStatus] DEFAULT (''''Draft''''),\n    CONSTRAINT [PK_CodingTasks] PRIMARY KEY CLUSTERED ([TaskId]),\n    CONSTRAINT [UQ_CodingTasks_1] UNIQUE NONCLUSTERED (TaskCode, VersionNo),\n    CONSTRAINT [CK_CodingTasks_1] CHECK (VersionNo > 0),\n    CONSTRAINT [CK_CodingTasks_2] CHECK (SortOrder > 0),\n    CONSTRAINT [CK_CodingTasks_3] CHECK (TaskKind IN (''''Exercise'''',''''FinalProject'''')),\n    CONSTRAINT [CK_CodingTasks_4] CHECK (PublicationStatus IN (''''Draft'''',''''Published'''')),\n    CONSTRAINT [FK_CodingTasks_1_Levels_LevelId] FOREIGN KEY (LevelId) REFERENCES dbo.[Levels] (LevelId)\n);\n\nCREATE TABLE dbo.[CodingTaskTopics] (\n    [TaskId] int NOT NULL,\n    [TopicId] int NOT NULL,\n    CONSTRAINT [PK_CodingTaskTopics] PRIMARY KEY CLUSTERED ([TaskId], [TopicId]),\n    CONSTRAINT [FK_CodingTaskTopics_1_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId),\n    CONSTRAINT [FK_CodingTaskTopics_2_Topics_TopicId] FOREIGN KEY (TopicId) REFERENCES dbo.[Topics] (TopicId)\n);\n\nCREATE TABLE dbo.[TaskTestCases] (\n    [TestCaseId] int IDENTITY(1,1) NOT NULL,\n    [TaskId] int NOT NULL,\n    [CaseNo] smallint NOT NULL,\n    [InputText] nvarchar(max) NOT NULL,\n    [ExpectedOutput] nvarchar(max) NOT NULL,\n    [IsPublic] bit NOT NULL CONSTRAINT [DF_TaskTestCases_IsPublic] DEFAULT (1),\n    CONSTRAINT [PK_TaskTestCases] PRIMARY KEY CLUSTERED ([TestCaseId]),\n    CONSTRAINT [UQ_TaskTestCases_1] UNIQUE NONCLUSTERED (TaskId, CaseNo),\n    CONSTRAINT [UQ_TaskTestCases_2] UNIQUE NONCLUSTERED (TaskId, TestCaseId),\n    CONSTRAINT [CK_TaskTestCases_1] CHECK (CaseNo > 0),\n    CONSTRAINT [FK_TaskTestCases_1_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId)\n);\n\nCREATE TABLE dbo.[TaskHints] (\n    [TaskId] int NOT NULL,\n    [HintNo] smallint NOT NULL,\n    [HintText] nvarchar(2000) NOT NULL,\n    CONSTRAINT [PK_TaskHints] PRIMARY KEY CLUSTERED ([TaskId], [HintNo]),\n    CONSTRAINT [CK_TaskHints_1] CHECK (HintNo > 0),\n    CONSTRAINT [FK_TaskHints_1_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId)\n);\n\nCREATE TABLE dbo.[TaskWorkspaceState] (\n    [EnrollmentId] int NOT NULL,\n    [TaskId] int NOT NULL,\n    [DraftCode] nvarchar(max) NULL,\n    [DraftInput] nvarchar(max) NULL,\n    [DraftUpdatedAtUtc] datetime2(3) NULL,\n    [HintsRevealedCount] smallint NOT NULL CONSTRAINT [DF_TaskWorkspaceState_HintsRevealedCount] DEFAULT (0),\n    [HasAttempted] bit NOT NULL CONSTRAINT [DF_TaskWorkspaceState_HasAttempted] DEFAULT (0),\n    [SolutionViewed] bit NOT NULL CONSTRAINT [DF_TaskWorkspaceState_SolutionViewed] DEFAULT (0),\n    [StateUpdatedAtUtc] datetime2(3) NOT NULL CONSTRAINT [DF_TaskWorkspaceState_StateUpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),\n    CONSTRAINT [PK_TaskWorkspaceState] PRIMARY KEY CLUSTERED ([EnrollmentId], [TaskId]),\n    CONSTRAINT [CK_TaskWorkspaceState_1] CHECK (HintsRevealedCount >= 0),\n    CONSTRAINT [CK_TaskWorkspaceState_2] CHECK (SolutionViewed=0 OR HasAttempted=1),\n    CONSTRAINT [FK_TaskWorkspaceState_1_Enrollments_EnrollmentId] FOREIGN KEY (EnrollmentId) REFERENCES dbo.[Enrollments] (EnrollmentId),\n    CONSTRAINT [FK_TaskWorkspaceState_2_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId)\n);\n\nCREATE TABLE dbo.[CodeSubmissions] (\n    [SubmissionId] int IDENTITY(1,1) NOT NULL,\n    [EnrollmentId] int NOT NULL,\n    [TaskId] int NOT NULL,\n    [CodeText] nvarchar(max) NOT NULL,\n    [SubmittedAtUtc] datetime2(3) NULL CONSTRAINT [DF_CodeSubmissions_SubmittedAtUtc] DEFAULT (SYSUTCDATETIME()),\n    [EvaluationStatus] varchar(12) NOT NULL CONSTRAINT [DF_CodeSubmissions_EvaluationStatus] DEFAULT (''''Pending''''),\n    [FinishedAtUtc] datetime2(3) NULL,\n    [EvaluationError] nvarchar(2000) NULL,\n    [ExecutionEnvironment] nvarchar(100) NOT NULL,\n    [RuntimeVersion] nvarchar(80) NULL,\n    [EvaluatorVersion] nvarchar(80) NULL,\n    [EvidenceOrigin] varchar(20) NOT NULL CONSTRAINT [DF_CodeSubmissions_EvidenceOrigin] DEFAULT (''''server''''),\n    [ImportedAtUtc] datetime2(3) NULL,\n    CONSTRAINT [PK_CodeSubmissions] PRIMARY KEY CLUSTERED ([SubmissionId]),\n    CONSTRAINT [UQ_CodeSubmissions_1] UNIQUE NONCLUSTERED (SubmissionId, TaskId),\n    CONSTRAINT [CK_CodeSubmissions_1] CHECK (EvaluationStatus IN (''''Pending'''',''''Running'''',''''Completed'''',''''Error'''',''''Cancelled'''')),\n    CONSTRAINT [CK_CodeSubmissions_2] CHECK (EvidenceOrigin IN (''''server'''',''''academic-seed'''',''''browser-import'''')),\n    CONSTRAINT [CK_CodeSubmissions_3] CHECK (EvidenceOrigin=''''browser-import'''' OR SubmittedAtUtc IS NOT NULL),\n    CONSTRAINT [CK_CodeSubmissions_4] CHECK ((EvaluationStatus IN (''''Pending'''',''''Running'''') AND FinishedAtUtc IS NULL) OR (EvaluationStatus IN (''''Completed'''',''''Error'''',''''Cancelled'''') AND (EvidenceOrigin=''''browser-import'''' OR FinishedAtUtc IS NOT NULL) AND (FinishedAtUtc IS NULL OR SubmittedAtUtc IS NULL OR FinishedAtUtc >= SubmittedAtUtc))),\n    CONSTRAINT [CK_CodeSubmissions_5] CHECK ((EvaluationStatus=''''Error'''' AND EvaluationError IS NOT NULL) OR (EvaluationStatus<>''''Error'''' AND EvaluationError IS NULL)),\n    CONSTRAINT [CK_CodeSubmissions_6] CHECK ((EvidenceOrigin=''''browser-import'''' AND ImportedAtUtc IS NOT NULL) OR (EvidenceOrigin<>''''browser-import'''' AND ImportedAtUtc IS NULL)),\n    CONSTRAINT [FK_CodeSubmissions_1_Enrollments_EnrollmentId] FOREIGN KEY (EnrollmentId) REFERENCES dbo.[Enrollments] (EnrollmentId),\n    CONSTRAINT [FK_CodeSubmissions_2_CodingTasks_TaskId] FOREIGN KEY (TaskId) REFERENCES dbo.[CodingTasks] (TaskId)\n);\n\nCREATE TABLE dbo.[SubmissionTestResults] (\n    [SubmissionId] int NOT NULL,\n    [TestCaseId] int NOT NULL,\n    [TaskId] int NOT NULL,\n    [Passed] bit NOT NULL,\n    [ActualOutput] nvarchar(max) NOT NULL,\n    [ErrorText] nvarchar(2000) NULL,\n    [RuntimeMs] int NULL,\n    [ExecutionStatus] varchar(16) NOT NULL,\n    CONSTRAINT [PK_SubmissionTestResults] PRIMARY KEY CLUSTERED ([SubmissionId], [TestCaseId]),\n    CONSTRAINT [CK_SubmissionTestResults_1] CHECK (RuntimeMs IS NULL OR RuntimeMs >= 0),\n    CONSTRAINT [CK_SubmissionTestResults_2] CHECK ((ExecutionStatus=''''Success'''' AND ErrorText IS NULL) OR (ExecutionStatus IN (''''RuntimeError'''',''''Timeout'''') AND Passed=0 AND ErrorText IS NOT NULL)),\n    CONSTRAINT [FK_SubmissionTestResults_1_Result_SubmissionVersion] FOREIGN KEY (SubmissionId, TaskId) REFERENCES dbo.[CodeSubmissions] (SubmissionId, TaskId),\n    CONSTRAINT [FK_SubmissionTestResults_2_Result_TestVersion] FOREIGN KEY (TaskId, TestCaseId) REFERENCES dbo.[TaskTestCases] (TaskId, TestCaseId)\n);\n\nCREATE NONCLUSTERED INDEX [IX_StudentProfiles_PreferredLanguageId] ON dbo.[StudentProfiles] (PreferredLanguageId);\nCREATE NONCLUSTERED INDEX [IX_Courses_LanguageId] ON dbo.[Courses] (LanguageId);\nCREATE NONCLUSTERED INDEX [IX_Courses_CreatedByUserId] ON dbo.[Courses] (CreatedByUserId);\nCREATE NONCLUSTERED INDEX [IX_Topics_ParentTopicId] ON dbo.[Topics] (ParentTopicId);\nCREATE NONCLUSTERED INDEX [IX_Lessons_TopicId] ON dbo.[Lessons] (TopicId);\nCREATE NONCLUSTERED INDEX [IX_Assessments_ScopeCourseId] ON dbo.[Assessments] (ScopeCourseId);\nCREATE NONCLUSTERED INDEX [IX_Assessments_ScopeLevelId] ON dbo.[Assessments] (ScopeLevelId);\nCREATE NONCLUSTERED INDEX [IX_Assessments_ScopeLessonId] ON dbo.[Assessments] (ScopeLessonId);\nCREATE NONCLUSTERED INDEX [IX_Questions_TopicId] ON dbo.[Questions] (TopicId);\nCREATE NONCLUSTERED INDEX [IX_AssessmentAttempts_UserId] ON dbo.[AssessmentAttempts] (UserId);\nCREATE NONCLUSTERED INDEX [IX_AssessmentAttempts_AssessmentId] ON dbo.[AssessmentAttempts] (AssessmentId);\nCREATE NONCLUSTERED INDEX [IX_AttemptAnswers_AttemptId_AssessmentId] ON dbo.[AttemptAnswers] (AttemptId, AssessmentId);\nCREATE NONCLUSTERED INDEX [IX_AttemptAnswers_AssessmentId_QuestionId] ON dbo.[AttemptAnswers] (AssessmentId, QuestionId);\nCREATE NONCLUSTERED INDEX [IX_AttemptAnswers_QuestionId_OptionId] ON dbo.[AttemptAnswers] (QuestionId, OptionId);\nCREATE NONCLUSTERED INDEX [IX_Enrollments_CourseId] ON dbo.[Enrollments] (CourseId);\nCREATE NONCLUSTERED INDEX [IX_LessonCompletions_LessonId] ON dbo.[LessonCompletions] (LessonId);\nCREATE NONCLUSTERED INDEX [IX_CodingTasks_LevelId] ON dbo.[CodingTasks] (LevelId);\nCREATE NONCLUSTERED INDEX [IX_CodingTaskTopics_TopicId] ON dbo.[CodingTaskTopics] (TopicId);\nCREATE NONCLUSTERED INDEX [IX_TaskWorkspaceState_TaskId] ON dbo.[TaskWorkspaceState] (TaskId);\nCREATE NONCLUSTERED INDEX [IX_CodeSubmissions_EnrollmentId] ON dbo.[CodeSubmissions] (EnrollmentId);\nCREATE NONCLUSTERED INDEX [IX_CodeSubmissions_TaskId] ON dbo.[CodeSubmissions] (TaskId);\nCREATE NONCLUSTERED INDEX [IX_SubmissionTestResults_SubmissionId_TaskId] ON dbo.[SubmissionTestResults] (SubmissionId, TaskId);\nCREATE NONCLUSTERED INDEX [IX_SubmissionTestResults_TaskId_TestCaseId] ON dbo.[SubmissionTestResults] (TaskId, TestCaseId);\n'';\nEXEC sys.sp_executesql N''\n/* Each GO-delimited batch is embedded in submission.sql by build-phase3.cjs.\n   Triggers are set based. UPDLOCK,HOLDLOCK serialize child writes with parent\n   finalization/publication. Direct privileged DDL/disabled triggers are outside\n   the threat model; runtime principals must never own the schema. */\nCREATE TRIGGER dbo.TR_Users_StudentRole ON dbo.Users AFTER UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.StudentProfiles p WITH(UPDLOCK,HOLDLOCK) ON p.UserId=i.UserId WHERE i.RoleCode<>''''Student'''')\n THROW 51100,''''A student-profile owner cannot become an administrator.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_StudentProfiles_Role ON dbo.StudentProfiles AFTER INSERT,UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Users u WITH(UPDLOCK,HOLDLOCK) ON u.UserId=i.UserId WHERE u.RoleCode<>''''Student'''')\n THROW 51101,''''StudentProfiles requires the Student role.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_Courses_Structure ON dbo.Courses AFTER UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.CourseId=d.CourseId WHERE i.LanguageId<>d.LanguageId)\n THROW 51102,''''Course language is immutable; create a new course.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_Levels_Structure ON dbo.Levels AFTER UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.LevelId=d.LevelId WHERE i.CourseId<>d.CourseId)\n THROW 51103,''''A level cannot be moved to another course.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_Topics_Structure ON dbo.Topics AFTER INSERT,UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.TopicId=d.TopicId WHERE i.LanguageId<>d.LanguageId OR ISNULL(i.ParentTopicId,0)<>ISNULL(d.ParentTopicId,0))\n THROW 51104,''''Topic language/parent links are immutable; create a new topic.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Topics p WITH(UPDLOCK,HOLDLOCK) ON p.TopicId=i.ParentTopicId WHERE p.LanguageId<>i.LanguageId)\n THROW 51105,''''A topic parent must use the same language.'''',1;\n ;WITH ancestors AS (\n SELECT i.TopicId AS StartId,i.ParentTopicId,1 AS Depth FROM inserted i WHERE i.ParentTopicId IS NOT NULL\n UNION ALL SELECT a.StartId,p.ParentTopicId,a.Depth+1 FROM ancestors a JOIN dbo.Topics p ON p.TopicId=a.ParentTopicId WHERE a.Depth<100 AND a.ParentTopicId<>a.StartId\n )\n SELECT StartId INTO #cycles FROM ancestors WHERE StartId=ParentTopicId OR Depth=100 OPTION(MAXRECURSION 100);\n IF EXISTS(SELECT 1 FROM #cycles) THROW 51106,''''Topic hierarchy must be acyclic and shorter than 100 links.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_Lessons_Structure ON dbo.Lessons AFTER INSERT,UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.LessonId=d.LessonId WHERE i.LevelId<>d.LevelId OR i.TopicId<>d.TopicId)\n THROW 51107,''''Lesson level/topic links are immutable.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Levels l ON l.LevelId=i.LevelId JOIN dbo.Courses c ON c.CourseId=l.CourseId JOIN dbo.Topics t ON t.TopicId=i.TopicId WHERE c.LanguageId<>t.LanguageId)\n THROW 51108,''''Lesson topic must match its course language.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_Enrollments_Ownership ON dbo.Enrollments AFTER UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.EnrollmentId=d.EnrollmentId WHERE i.StudentId<>d.StudentId OR i.CourseId<>d.CourseId OR i.EvidenceOrigin<>d.EvidenceOrigin OR i.EnrolledAtUtc<>d.EnrolledAtUtc)\n THROW 51109,''''Enrollment identity and provenance are immutable.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_LessonCompletions_Integrity ON dbo.LessonCompletions AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted) THROW 51110,''''Completion facts are append-only.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.Lessons l ON l.LessonId=i.LessonId JOIN dbo.Levels lv ON lv.LevelId=l.LevelId WHERE e.CourseId<>lv.CourseId OR e.ParticipationStatus<>''''Active'''')\n THROW 51111,''''Completion requires an active enrollment in the lesson course.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e ON e.EnrollmentId=i.EnrollmentId WHERE i.CompletionMethod=''''correct-answer'''' AND NOT EXISTS(\n SELECT 1 FROM dbo.AssessmentAttempts a JOIN dbo.Assessments s ON s.AssessmentId=a.AssessmentId\n WHERE a.UserId=e.StudentId AND s.ScopeLessonId=i.LessonId AND a.Status=''''Submitted'''' AND a.EvidenceOrigin=i.EvidenceOrigin\n AND NOT EXISTS(SELECT 1 FROM dbo.Questions q LEFT JOIN dbo.AttemptAnswers x ON x.AttemptId=a.AttemptId AND x.QuestionId=q.QuestionId LEFT JOIN dbo.QuestionOptions o ON o.OptionId=x.OptionId WHERE q.AssessmentId=s.AssessmentId AND (x.OptionId IS NULL OR o.IsCorrect=0))))\n THROW 51112,''''Correct-answer completion requires matching submitted correct-answer evidence.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_Assessments_Version ON dbo.Assessments AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted d WHERE d.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts a WITH(UPDLOCK,HOLDLOCK) WHERE a.AssessmentId=d.AssessmentId))\n THROW 51113,''''Published/attempted assessment versions are immutable; create a new version.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublicationStatus=''''Published'''' AND (\n NOT EXISTS(SELECT 1 FROM dbo.Questions q WHERE q.AssessmentId=i.AssessmentId) OR EXISTS(\n SELECT q.QuestionId FROM dbo.Questions q LEFT JOIN dbo.QuestionOptions o ON o.QuestionId=q.QuestionId WHERE q.AssessmentId=i.AssessmentId GROUP BY q.QuestionId HAVING COUNT(o.OptionId)<2 OR SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)<>1)))\n THROW 51114,''''Publication requires questions with at least two options and exactly one correct option each.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_Questions_Version ON dbo.Questions AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT AssessmentId FROM inserted UNION SELECT AssessmentId FROM deleted) x JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=x.AssessmentId WHERE a.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts atp WHERE atp.AssessmentId=a.AssessmentId))\n THROW 51115,''''Questions in published/attempted assessment versions are immutable.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId LEFT JOIN dbo.Lessons ls ON ls.LessonId=a.ScopeLessonId LEFT JOIN dbo.Levels lv ON lv.LevelId=COALESCE(a.ScopeLevelId,ls.LevelId) JOIN dbo.Courses c ON c.CourseId=COALESCE(a.ScopeCourseId,lv.CourseId) JOIN dbo.Topics t ON t.TopicId=i.TopicId WHERE t.LanguageId<>c.LanguageId)\n THROW 51116,''''Question topic language must match its assessment course.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_QuestionOptions_Version ON dbo.QuestionOptions AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT QuestionId FROM inserted UNION SELECT QuestionId FROM deleted) x JOIN dbo.Questions q ON q.QuestionId=x.QuestionId JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=q.AssessmentId WHERE a.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.AssessmentAttempts atp WHERE atp.AssessmentId=a.AssessmentId))\n THROW 51117,''''Options and grading keys in published/attempted versions are immutable.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_AssessmentAttempts_Lifecycle ON dbo.AssessmentAttempts AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.AttemptId=d.AttemptId WHERE i.AttemptId IS NULL OR d.Status<>''''InProgress'''')\n THROW 51118,''''Attempts cannot be deleted; terminal attempts are immutable.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.AttemptId=i.AttemptId WHERE d.AttemptId IS NULL AND i.Status<>''''InProgress'''')\n THROW 51119,''''Attempts must start InProgress.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.AttemptId=i.AttemptId WHERE i.UserId<>d.UserId OR i.AssessmentId<>d.AssessmentId OR ISNULL(i.StartedAtUtc,''''19000101'''')<>ISNULL(d.StartedAtUtc,''''19000101'''') OR i.EvidenceOrigin<>d.EvidenceOrigin OR ISNULL(i.ImportedAtUtc,''''19000101'''')<>ISNULL(d.ImportedAtUtc,''''19000101''''))\n THROW 51120,''''Attempt owner, assessment version, start time and provenance are immutable.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a WITH(UPDLOCK,HOLDLOCK) ON a.AssessmentId=i.AssessmentId WHERE a.PublicationStatus<>''''Published'''')\n THROW 51121,''''Only published assessments may be attempted.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId LEFT JOIN dbo.Lessons ls ON ls.LessonId=a.ScopeLessonId JOIN dbo.Levels lv ON lv.LevelId=COALESCE(a.ScopeLevelId,ls.LevelId) WHERE a.Kind<>''''Placement'''' AND NOT EXISTS(SELECT 1 FROM dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) WHERE e.StudentId=i.UserId AND e.CourseId=lv.CourseId AND e.ParticipationStatus=''''Active''''))\n THROW 51122,''''Lesson and level attempts require active enrollment; placement may precede enrollment.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Assessments a ON a.AssessmentId=i.AssessmentId WHERE a.Kind=''''LevelQuiz'''' AND EXISTS(SELECT 1 FROM dbo.Lessons ls WHERE ls.LevelId=a.ScopeLevelId AND ls.PublicationStatus=''''Published'''' AND NOT EXISTS(SELECT 1 FROM dbo.LessonCompletions lc JOIN dbo.Enrollments e ON e.EnrollmentId=lc.EnrollmentId WHERE lc.LessonId=ls.LessonId AND e.StudentId=i.UserId)))\n THROW 51123,''''Complete the published lessons in the level before attempting its quiz.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.Status=''''Submitted'''' AND EXISTS(SELECT 1 FROM dbo.Questions q WHERE q.AssessmentId=i.AssessmentId AND NOT EXISTS(SELECT 1 FROM dbo.AttemptAnswers x WITH(UPDLOCK,HOLDLOCK) WHERE x.AttemptId=i.AttemptId AND x.QuestionId=q.QuestionId)))\n THROW 51124,''''Submission requires one response to every question; unsure is allowed.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_AttemptAnswers_Lifecycle ON dbo.AttemptAnswers AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT AttemptId FROM inserted UNION SELECT AttemptId FROM deleted) x JOIN dbo.AssessmentAttempts a WITH(UPDLOCK,HOLDLOCK) ON a.AttemptId=x.AttemptId WHERE a.Status<>''''InProgress'''')\n THROW 51125,''''Only in-progress answers can be changed.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_CodingTasks_Version ON dbo.CodingTasks AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted d WHERE d.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.CodeSubmissions s WITH(UPDLOCK,HOLDLOCK) WHERE s.TaskId=d.TaskId))\n THROW 51126,''''Published/submitted coding tasks are immutable; create a new version.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.PublicationStatus=''''Published'''' AND (NOT EXISTS(SELECT 1 FROM dbo.TaskTestCases tc WHERE tc.TaskId=i.TaskId) OR NOT EXISTS(SELECT 1 FROM dbo.CodingTaskTopics tt WHERE tt.TaskId=i.TaskId)))\n THROW 51127,''''Publish a task only after adding tests and concept links.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.TaskId=i.TaskId WHERE i.LevelId<>d.LevelId)\n THROW 51128,''''Task level link is immutable.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_TaskTestCases_Version ON dbo.TaskTestCases AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus=''''Published'''' OR EXISTS(SELECT 1 FROM dbo.CodeSubmissions s WHERE s.TaskId=t.TaskId))\n THROW 51129,''''Tests in published/submitted task versions are immutable.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_TaskHints_Version ON dbo.TaskHints AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus=''''Published'''')\n THROW 51130,''''Hints in published task versions are immutable.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_CodingTaskTopics_Version ON dbo.CodingTaskTopics AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM (SELECT TaskId FROM inserted UNION SELECT TaskId FROM deleted) x JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=x.TaskId WHERE t.PublicationStatus=''''Published'''')\n THROW 51131,''''Concept links in published task versions are immutable.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.CodingTasks t ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId JOIN dbo.Courses c ON c.CourseId=l.CourseId JOIN dbo.Topics tp ON tp.TopicId=i.TopicId WHERE c.LanguageId<>tp.LanguageId)\n THROW 51132,''''Task topics must match course language.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_TaskWorkspaceState_Integrity ON dbo.TaskWorkspaceState AFTER INSERT,UPDATE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.CodingTasks t ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId WHERE e.CourseId<>l.CourseId OR e.ParticipationStatus<>''''Active'''' OR t.PublicationStatus<>''''Published'''')\n THROW 51133,''''Workspace requires an active matching course enrollment and published task.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.HintsRevealedCount>(SELECT COUNT(*) FROM dbo.TaskHints h WHERE h.TaskId=i.TaskId))\n THROW 51134,''''Revealed hints cannot exceed available hints.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_CodeSubmissions_Lifecycle ON dbo.CodeSubmissions AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.SubmissionId=d.SubmissionId WHERE i.SubmissionId IS NULL OR d.EvaluationStatus NOT IN(''''Pending'''',''''Running''''))\n THROW 51135,''''Submissions are append-only; terminal evaluations are immutable.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i LEFT JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE d.SubmissionId IS NULL AND i.EvaluationStatus<>''''Pending'''')\n THROW 51136,''''A submission must begin Pending.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE i.EnrollmentId<>d.EnrollmentId OR i.TaskId<>d.TaskId OR i.CodeText COLLATE Latin1_General_100_BIN2<>d.CodeText COLLATE Latin1_General_100_BIN2 OR DATALENGTH(i.CodeText)<>DATALENGTH(d.CodeText) OR ISNULL(i.SubmittedAtUtc,''''19000101'''')<>ISNULL(d.SubmittedAtUtc,''''19000101'''') OR i.ExecutionEnvironment<>d.ExecutionEnvironment OR ISNULL(i.RuntimeVersion,N'''''''')<>ISNULL(d.RuntimeVersion,N'''''''') OR ISNULL(i.EvaluatorVersion,N'''''''')<>ISNULL(d.EvaluatorVersion,N'''''''') OR i.EvidenceOrigin<>d.EvidenceOrigin OR ISNULL(i.ImportedAtUtc,''''19000101'''')<>ISNULL(d.ImportedAtUtc,''''19000101''''))\n THROW 51137,''''Submitted code, ownership, environment and provenance are immutable.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.SubmissionId=i.SubmissionId WHERE NOT((d.EvaluationStatus=''''Pending'''' AND i.EvaluationStatus IN(''''Running'''',''''Cancelled'''')) OR (d.EvaluationStatus=''''Running'''' AND i.EvaluationStatus IN(''''Completed'''',''''Error'''',''''Cancelled''''))))\n THROW 51138,''''Invalid evaluation status transition.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.Enrollments e WITH(UPDLOCK,HOLDLOCK) ON e.EnrollmentId=i.EnrollmentId JOIN dbo.CodingTasks t WITH(UPDLOCK,HOLDLOCK) ON t.TaskId=i.TaskId JOIN dbo.Levels l ON l.LevelId=t.LevelId WHERE e.CourseId<>l.CourseId OR e.ParticipationStatus<>''''Active'''' OR t.PublicationStatus<>''''Published'''')\n THROW 51139,''''Submission requires active matching enrollment and a published task.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i WHERE i.EvaluationStatus=''''Completed'''' AND (\n NOT EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId) OR EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId AND r.ExecutionStatus<>''''Success'''') OR (\n NOT EXISTS(SELECT 1 FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId AND r.Passed=0) AND (SELECT COUNT(*) FROM dbo.SubmissionTestResults r WHERE r.SubmissionId=i.SubmissionId)<>(SELECT COUNT(*) FROM dbo.TaskTestCases tc WHERE tc.TaskId=i.TaskId))))\n THROW 51140,''''Completed means successful execution with a failed test or all tests passed; runtime errors require Error.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE TRIGGER dbo.TR_SubmissionTestResults_Integrity ON dbo.SubmissionTestResults AFTER INSERT,UPDATE,DELETE AS\nBEGIN\n SET NOCOUNT ON;\n IF EXISTS(SELECT 1 FROM deleted) THROW 51141,''''Executed case results are immutable.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.CodeSubmissions s WITH(UPDLOCK,HOLDLOCK) ON s.SubmissionId=i.SubmissionId WHERE s.EvaluationStatus<>''''Running'''')\n THROW 51142,''''Record executed cases only while evaluation is Running.'''',1;\n IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.TaskTestCases tc ON tc.TestCaseId=i.TestCaseId WHERE i.Passed=1 AND (i.ActualOutput COLLATE Latin1_General_100_BIN2<>tc.ExpectedOutput COLLATE Latin1_General_100_BIN2 OR DATALENGTH(i.ActualOutput)<>DATALENGTH(tc.ExpectedOutput)))\n THROW 51143,''''Passing output must exactly match the expected output; evaluator must also verify assertions.'''',1;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE VIEW dbo.vAssessmentScores AS\n SELECT a.AttemptId,a.UserId,a.AssessmentId,a.Status,a.EvidenceOrigin,a.SubmittedAtUtc,\n COUNT(q.QuestionId) AS QuestionCount,\n SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END) AS CorrectCount,\n CAST(100.0*SUM(CASE WHEN o.IsCorrect=1 THEN 1 ELSE 0 END)/NULLIF(COUNT(q.QuestionId),0) AS decimal(5,2)) AS ScorePercent\n FROM dbo.AssessmentAttempts a JOIN dbo.Questions q ON q.AssessmentId=a.AssessmentId\n LEFT JOIN dbo.AttemptAnswers x ON x.AttemptId=a.AttemptId AND x.QuestionId=q.QuestionId\n LEFT JOIN dbo.QuestionOptions o ON o.OptionId=x.OptionId\n GROUP BY a.AttemptId,a.UserId,a.AssessmentId,a.Status,a.EvidenceOrigin,a.SubmittedAtUtc;\n'';\nEXEC sys.sp_executesql N''\nCREATE VIEW dbo.vSubmissionOutcomes AS\n SELECT s.SubmissionId,s.EnrollmentId,s.TaskId,s.EvaluationStatus,s.EvidenceOrigin,\n tc.ExpectedCaseCount, r.ExecutedCaseCount,r.PassedCaseCount,r.FailedCaseCount,\n tc.ExpectedCaseCount-r.ExecutedCaseCount AS NotRunCaseCount,\n CAST(CASE WHEN s.EvaluationStatus=''''Completed'''' AND r.ExecutedCaseCount=tc.ExpectedCaseCount AND tc.ExpectedCaseCount>0 AND r.PassedCaseCount=tc.ExpectedCaseCount THEN 1 ELSE 0 END AS bit) AS AllTestsPassed\n FROM dbo.CodeSubmissions s\n CROSS APPLY(SELECT COUNT(*) ExpectedCaseCount FROM dbo.TaskTestCases t WHERE t.TaskId=s.TaskId)tc\n CROSS APPLY(SELECT COUNT(*) ExecutedCaseCount,COALESCE(SUM(CONVERT(int,Passed)),0) PassedCaseCount,COALESCE(SUM(CASE WHEN Passed=0 THEN 1 ELSE 0 END),0) FailedCaseCount FROM dbo.SubmissionTestResults x WHERE x.SubmissionId=s.SubmissionId)r;\n'';\nEXEC sys.sp_executesql N''\nCREATE VIEW dbo.vEnrollmentProgress AS\n SELECT e.EnrollmentId,e.StudentId,e.CourseId,\n (SELECT COUNT(*) FROM dbo.Lessons l JOIN dbo.Levels lv ON lv.LevelId=l.LevelId WHERE lv.CourseId=e.CourseId AND l.PublicationStatus=''''Published'''') AS LessonCount,\n (SELECT COUNT(*) FROM dbo.LessonCompletions lc WHERE lc.EnrollmentId=e.EnrollmentId) AS CompletedLessonCount,\n (SELECT COUNT(DISTINCT t.TaskCode) FROM dbo.vSubmissionOutcomes o JOIN dbo.CodingTasks t ON t.TaskId=o.TaskId WHERE o.EnrollmentId=e.EnrollmentId AND o.AllTestsPassed=1) AS PassedTaskCount\n FROM dbo.Enrollments e;\n'';\nEXEC sys.sp_executesql N''\nCREATE FUNCTION dbo.fnPercentage(@Numerator int,@Denominator int) RETURNS decimal(6,2) WITH SCHEMABINDING AS\nBEGIN\n RETURN CASE WHEN @Denominator>0 AND @Numerator>=0 THEN CONVERT(decimal(6,2),100.0*@Numerator/@Denominator) ELSE NULL END;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE FUNCTION dbo.fnStudentCourseSummary(@StudentId int) RETURNS TABLE AS RETURN\n SELECT p.EnrollmentId,c.Title,p.LessonCount,p.CompletedLessonCount,p.PassedTaskCount,\n dbo.fnPercentage(p.CompletedLessonCount,p.LessonCount) AS CompletionPercent\n FROM dbo.vEnrollmentProgress p JOIN dbo.Courses c ON c.CourseId=p.CourseId WHERE p.StudentId=@StudentId;\n'';\nEXEC sys.sp_executesql N''\nCREATE PROCEDURE dbo.uspEnrollStudent @StudentId int,@CourseId int AS\nBEGIN\n SET NOCOUNT ON; SET XACT_ABORT ON;\n BEGIN TRY\n BEGIN TRANSACTION;\n IF NOT EXISTS(SELECT 1 FROM dbo.StudentProfiles p JOIN dbo.Users u WITH(UPDLOCK,HOLDLOCK) ON u.UserId=p.UserId WHERE p.UserId=@StudentId AND u.AccountStatus=''''Enabled'''') THROW 51200,''''An enabled student account is required.'''',1;\n IF NOT EXISTS(SELECT 1 FROM dbo.Courses WITH(UPDLOCK,HOLDLOCK) WHERE CourseId=@CourseId AND PublicationStatus=''''Published'''') THROW 51201,''''An available published course is required.'''',1;\n IF EXISTS(SELECT 1 FROM dbo.Enrollments WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@StudentId AND CourseId=@CourseId) THROW 51202,''''Student is already enrolled.'''',1;\n INSERT dbo.Enrollments(StudentId,CourseId) VALUES(@StudentId,@CourseId);\n SELECT CONVERT(int,SCOPE_IDENTITY()) EnrollmentId;\n COMMIT;\n END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE PROCEDURE dbo.uspSubmitAssessment @AttemptId int AS\nBEGIN\n SET NOCOUNT ON; SET XACT_ABORT ON;\n BEGIN TRY\n BEGIN TRANSACTION;\n IF NOT EXISTS(SELECT 1 FROM dbo.AssessmentAttempts WITH(UPDLOCK,HOLDLOCK) WHERE AttemptId=@AttemptId AND Status=''''InProgress'''') THROW 51203,''''An in-progress attempt is required.'''',1;\n UPDATE dbo.AssessmentAttempts SET Status=''''Submitted'''',SubmittedAtUtc=SYSUTCDATETIME() WHERE AttemptId=@AttemptId;\n SELECT * FROM dbo.vAssessmentScores WHERE AttemptId=@AttemptId;\n COMMIT;\n END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK; THROW; END CATCH;\nEND;\n'';\nEXEC sys.sp_executesql N''\nCREATE PROCEDURE dbo.uspQueueCodeSubmission @EnrollmentId int,@TaskId int,@CodeText nvarchar(max),@ExecutionEnvironment nvarchar(100),@RuntimeVersion nvarchar(80)=NULL,@EvaluatorVersion nvarchar(80)=NULL AS\nBEGIN\n SET NOCOUNT ON; SET XACT_ABORT ON;\n INSERT dbo.CodeSubmissions(EnrollmentId,TaskId,CodeText,ExecutionEnvironment,RuntimeVersion,EvaluatorVersion) VALUES(@EnrollmentId,@TaskId,@CodeText,@ExecutionEnvironment,@RuntimeVersion,@EvaluatorVersion);\n SELECT CONVERT(int,SCOPE_IDENTITY()) SubmissionId;\nEND;\n'';\nEXEC sys.sp_executesql N''\n/* Fictional academic seed. Source curriculum, no browser backup imported.\n   Evaluation rows below are illustrative SQL fixtures, not Python runs. */\nINSERT dbo.Users (Email,FullName,RoleCode) VALUES\n(N''''seed-admin@example.invalid'''',N''''Academic administrator (fictional)'''',N''''Admin''''),\n(N''''seed-student@example.invalid'''',N''''Academic learner (fictional)'''',N''''Student''''),\n(N''''seed-learner2@example.invalid'''',N''''Second learner (fictional)'''',N''''Student'''');\nINSERT dbo.Languages (Slug,Name,Description,ContentReadinessCode) VALUES\n(N''''python'''',N''''Python'''',N''''Readable programming for scripting, automation and data.'''',N''''Ready''''),\n(N''''csharp'''',N''''C#'''',N''''Structured applications with the .NET ecosystem.'''',N''''ComingSoon''''),\n(N''''cpp'''',N''''C++'''',N''''Systems programming and performance-oriented applications.'''',N''''ComingSoon''''),\n(N''''javascript'''',N''''JavaScript'''',N''''Interactive web experiences and general-purpose scripting.'''',N''''ComingSoon''''),\n(N''''typescript'''',N''''TypeScript'''',N''''Typed JavaScript for maintainable applications.'''',N''''ComingSoon''''),\n(N''''java'''',N''''Java'''',N''''Object-oriented applications on the Java platform.'''',N''''ComingSoon''''),\n(N''''c'''',N''''C'''',N''''Low-level programming and systems foundations.'''',N''''ComingSoon''''),\n(N''''go'''',N''''Go'''',N''''Simple, concurrent server and systems applications.'''',N''''ComingSoon''''),\n(N''''rust'''',N''''Rust'''',N''''Memory-conscious systems programming.'''',N''''ComingSoon''''),\n(N''''php'''',N''''PHP'''',N''''Server-side web application development.'''',N''''ComingSoon''''),\n(N''''ruby'''',N''''Ruby'''',N''''Expressive scripting and web applications.'''',N''''ComingSoon''''),\n(N''''swift'''',N''''Swift'''',N''''Applications for the Apple platform ecosystem.'''',N''''ComingSoon''''),\n(N''''kotlin'''',N''''Kotlin'''',N''''Modern applications on Android and the JVM.'''',N''''ComingSoon'''');\nINSERT dbo.StudentProfiles (UserId,PreferredLanguageId,ExperienceCode,LearningGoalCode) VALUES\n(2,1,N''''Beginner'''',N''''Foundations''''),\n(3,1,N''''SomeExperience'''',N''''Projects'''');\nINSERT dbo.Courses (LanguageId,Slug,Title,Description,PublicationStatus,CreatedByUserId) VALUES\n(1,N''''python-core'''',N''''Python learning path'''',N''''Three assessed levels from the active application.'''',N''''Published'''',1),\n(2,N''''csharp-boundary-fixture'''',N''''C# integrity fixture'''',N''''Draft only; not an implemented assessed curriculum.'''',N''''Draft'''',1);\nINSERT dbo.Levels (CourseId,Title,Description,SortOrder,PublicationStatus) VALUES\n(1,N''''Python Foundations'''',N''''Python Foundations'''',1,N''''Published''''),\n(1,N''''Logic and Control Flow'''',N''''Logic and Control Flow'''',2,N''''Published''''),\n(1,N''''Functions and Collections'''',N''''Functions and Collections'''',3,N''''Published''''),\n(2,N''''Unrelated course fixture'''',N''''For cross-course rejection checks only.'''',1,N''''Draft'''');\nINSERT dbo.LevelObjectives (LevelId,ObjectiveNo,ObjectiveText) VALUES\n(1,1,N''''Give a value a name.''''),\n(1,2,N''''Different values, different types.''''),\n(1,3,N''''Let your program communicate.''''),\n(1,4,N''''Turn input into a calculation.''''),\n(2,1,N''''Choose a branch with if.''''),\n(2,2,N''''Combine conditions carefully.''''),\n(2,3,N''''Repeat work for each value.''''),\n(2,4,N''''Repeat until a condition changes.''''),\n(3,1,N''''Give reusable work a name.''''),\n(3,2,N''''Keep related values together.''''),\n(3,3,N''''Look up a value by its key.''''),\n(3,4,N''''Break a task into smaller steps.'''');\nINSERT dbo.Topics (LanguageId,Code,Name) VALUES\n(1,N''''variables'''',N''''Variables and values''''),\n(1,N''''data-types'''',N''''Data types''''),\n(1,N''''input-output'''',N''''Input and output''''),\n(1,N''''numbers'''',N''''Working with numbers''''),\n(1,N''''conditions'''',N''''Conditions and decisions''''),\n(1,N''''boolean-logic'''',N''''Boolean logic''''),\n(1,N''''for-loops'''',N''''For loops and ranges''''),\n(1,N''''while-loops'''',N''''While loops''''),\n(1,N''''functions'''',N''''Functions and return values''''),\n(1,N''''lists'''',N''''Lists and indexing''''),\n(1,N''''dictionaries'''',N''''Dictionaries''''),\n(1,N''''problem-solving'''',N''''Build a small program'''');\nINSERT dbo.Lessons (LevelId,TopicId,Slug,Title,Summary,Body,ExampleCode,PreparedOutput,EstimatedMinutes,SortOrder,PublicationStatus) VALUES\n(1,1,N''''variables'''',N''''Variables and values'''',N''''Learn how a name refers to a value and how that value can change.'''',N''''A variable is a name that refers to a value in your program.\n\nUse the equals sign (=) to assign a value. Choose names that describe the data.\n\nAssigning another value to the same name changes what that name refers to.'''',N''''name = \"Lujain\"\nprint(name)\n\nname = \"Loji\"\nprint(name)'''',N''''Lujain\nLoji'''',10,1,N''''Published''''),\n(1,2,N''''data-types'''',N''''Data types'''',N''''Recognize the types of common Python values.'''',N''''Python values have types. Text uses str, whole numbers use int, and decimal numbers commonly use float.\n\nThe bool type has two values: True and False.\n\nUse type() to inspect the type of a value.'''',N''''name = \"Lujain\"\nage = 21\nheight = 1.64\nis_learning = True\n\nprint(type(age))\nprint(type(is_learning))'''',N''''<class ''''''''int''''''''>\n<class ''''''''bool''''''''>'''',10,2,N''''Published''''),\n(1,3,N''''input-output'''',N''''Input and output'''',N''''Read a value from the user and display a useful message.'''',N''''input() reads a line of text and returns it as a string.\n\nprint() displays values. An f-string lets you insert a value inside text using braces.\n\nThe example below assumes the user enters Lujain.'''',N''''name = input()\nprint(f\"Hello, {name}!\")'''',N''''Hello, Lujain!'''',10,3,N''''Published''''),\n(1,4,N''''numbers'''',N''''Working with numbers'''',N''''Convert numeric input and calculate a result.'''',N''''Convert numeric text using int() for whole numbers or float() for decimal numbers.\n\nUse +, -, * and / for arithmetic. Converting text that is not a valid number raises an error.\n\nThis example uses a price of 2.5 and a quantity of 3. The .2f format displays two decimal places.'''',N''''price = float(input())\nquantity = int(input())\ntotal = price * quantity\n\nprint(f\"Total: {total:.2f}\")'''',N''''Total: 7.50'''',15,4,N''''Published''''),\n(2,5,N''''conditions'''',N''''Conditions and decisions'''',N''''An if statement runs its indented block only when its condition is true.'''',N''''An if statement runs its indented block only when its condition is true.\n\nUse elif for another condition and else for the remaining cases. Python uses indentation to group statements.\n\nCompare values with ==, !=, <, <=, > and >=. The equals sign = assigns a value; == compares two values.'''',N''''score = 72\nif score >= 70:\n    print(\"Passed\")\nelse:\n    print(\"Try again\")'''',N''''Passed'''',15,1,N''''Published''''),\n(2,6,N''''boolean-logic'''',N''''Boolean logic'''',N''''Use and when both conditions must be true, or when at least one must be true, and not to reverse a boolean.'''',N''''Use and when both conditions must be true, or when at least one must be true, and not to reverse a boolean.\n\nParentheses make combined conditions easier to read. Comparisons are evaluated before and/or.\n\nTest values at the boundaries. A minimum age of 18 includes 18 when you use >=.'''',N''''age = 18\nhas_ticket = True\nprint(age >= 18 and has_ticket)\nprint(not has_ticket)'''',N''''True\nFalse'''',15,2,N''''Published''''),\n(2,7,N''''for-loops'''',N''''For loops and ranges'''',N''''A for loop visits each item in a sequence. range(1, 4) produces 1, 2 and 3: the stop value is excluded.'''',N''''A for loop visits each item in a sequence. range(1, 4) produces 1, 2 and 3: the stop value is excluded.\n\nPlace repeated statements inside the indented loop body.\n\nAn accumulator starts before the loop and is updated on each iteration. += adds to the existing value.'''',N''''total = 0\nfor number in range(1, 4):\n    total += number\nprint(total)'''',N''''6'''',15,3,N''''Published''''),\n(2,8,N''''while-loops'''',N''''While loops'''',N''''A while loop repeats while its condition remains true. It can execute zero times.'''',N''''A while loop repeats while its condition remains true. It can execute zero times.\n\nUpdate the condition inside the loop so it eventually becomes false. Missing that update often creates an infinite loop.\n\nUse break to exit a loop early. The coding workspace lets you stop a program and enforces a time limit.'''',N''''count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\nprint(\"Go\")'''',N''''3\n2\n1\nGo'''',15,4,N''''Published''''),\n(3,9,N''''functions'''',N''''Functions and return values'''',N''''Define a function with def, give its inputs meaningful parameter names and indent its body.'''',N''''Define a function with def, give its inputs meaningful parameter names and indent its body.\n\nreturn sends a result to the caller. print displays text and does not replace a return value.\n\nCall a function with arguments. A function without an explicit return returns None.'''',N''''def double(number):\n    return number * 2\n\nresult = double(4)\nprint(result)'''',N''''8'''',15,1,N''''Published''''),\n(3,10,N''''lists'''',N''''Lists and indexing'''',N''''A list stores an ordered collection. Indexes start at zero: items[0] is the first item.'''',N''''A list stores an ordered collection. Indexes start at zero: items[0] is the first item.\n\nappend adds an item at the end. len returns the number of items. A negative index such as -1 selects from the end.\n\nLoop over a list to process each value. Check that a list is not empty before accessing its first item.'''',N''''scores = [70, 85]\nscores.append(90)\nprint(scores[0])\nprint(len(scores))'''',N''''70\n3'''',15,2,N''''Published''''),\n(3,11,N''''dictionaries'''',N''''Dictionaries'''',N''''A dictionary maps unique keys to values. Use square brackets to read an existing key.'''',N''''A dictionary maps unique keys to values. Use square brackets to read an existing key.\n\nAssign to a key to add or update a value. Use .get(key, default) when the key might be missing.\n\nDictionary values can include lists, numbers, strings and other dictionaries.'''',N''''student = {\"name\": \"Lujain\", \"score\": 85}\nstudent[\"score\"] = 90\nprint(student[\"name\"])\nprint(student.get(\"level\", 1))'''',N''''Lujain\n1'''',15,3,N''''Published''''),\n(3,12,N''''problem-solving'''',N''''Build a small program'''',N''''Start with the required inputs and outputs, then split the program into functions you can test separately.'''',N''''Start with the required inputs and outputs, then split the program into functions you can test separately.\n\nUse a list of dictionaries to represent several records with named fields.\n\nTest normal cases, empty collections and boundary values. A passing sample alone does not prove that a program handles every case.'''',N''''def count_done(tasks):\n    return sum(1 for task in tasks if task[\"done\"])\n\ntasks = [{\"title\": \"Read\", \"done\": True},\n         {\"title\": \"Code\", \"done\": False}]\nprint(count_done(tasks))'''',N''''1'''',15,4,N''''Published'''');\nINSERT dbo.LessonResources (LessonId,Title,Url,ResourceType,ResourceLanguage,SortOrder) VALUES\n(1,N''''Elzero: Variables Part One'''',N''''https://www.youtube.com/watch?v=hQnZxqp3Q0Y'''',N''''Video'''',N''''Arabic'''',1),\n(1,N''''Python documentation: Numbers and variable assignment'''',N''''https://docs.python.org/3/tutorial/introduction.html#numbers'''',N''''Documentation'''',N''''English'''',2),\n(2,N''''Elzero: Some Data Types Overviews'''',N''''https://www.youtube.com/watch?v=43lT7k0Zws0'''',N''''Video'''',N''''Arabic'''',1),\n(2,N''''Python documentation: Built-in types'''',N''''https://docs.python.org/3/library/stdtypes.html'''',N''''Documentation'''',N''''English'''',2),\n(2,N''''Python documentation: type()'''',N''''https://docs.python.org/3/library/functions.html#type'''',N''''Documentation'''',N''''English'''',3),\n(3,N''''DigiTech Academy: Input() and Print()'''',N''''https://www.youtube.com/watch?v=9h5Y7GpR9Oo'''',N''''Video'''',N''''Arabic (Darija)'''',1),\n(3,N''''Python documentation: input()'''',N''''https://docs.python.org/3/library/functions.html#input'''',N''''Documentation'''',N''''English'''',2),\n(3,N''''Python documentation: print()'''',N''''https://docs.python.org/3/library/functions.html#print'''',N''''Documentation'''',N''''English'''',3),\n(3,N''''Python documentation: Formatted string literals'''',N''''https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals'''',N''''Documentation'''',N''''English'''',4),\n(4,N''''Elzero: Numbers'''',N''''https://www.youtube.com/watch?v=x7fFnKVAzDI'''',N''''Video'''',N''''Arabic'''',1),\n(4,N''''Elzero: Arithmetic Operators'''',N''''https://www.youtube.com/watch?v=prv7cVm2dxE'''',N''''Video'''',N''''Arabic'''',2),\n(4,N''''Python documentation: Numbers and arithmetic'''',N''''https://docs.python.org/3/tutorial/introduction.html#numbers'''',N''''Documentation'''',N''''English'''',3),\n(4,N''''Python documentation: int()'''',N''''https://docs.python.org/3/library/functions.html#int'''',N''''Documentation'''',N''''English'''',4),\n(4,N''''Python documentation: float()'''',N''''https://docs.python.org/3/library/functions.html#float'''',N''''Documentation'''',N''''English'''',5),\n(4,N''''Python documentation: Formatted string literals'''',N''''https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals'''',N''''Documentation'''',N''''English'''',6),\n(5,N''''Elzero: Conditions and decisions'''',N''''https://www.youtube.com/watch?v=v8ZehXS3XF0'''',N''''Video'''',N''''Arabic'''',1),\n(5,N''''Python documentation: Conditions and decisions'''',N''''https://docs.python.org/3/tutorial/controlflow.html#if-statements'''',N''''Documentation'''',N''''English'''',2),\n(6,N''''Elzero: Boolean logic'''',N''''https://elzero.org/python-boolean-operators/'''',N''''Video'''',N''''Arabic'''',1),\n(6,N''''Python documentation: Boolean logic'''',N''''https://docs.python.org/3/library/stdtypes.html#boolean-operations-and-or-not'''',N''''Documentation'''',N''''English'''',2),\n(7,N''''Elzero: For loops and ranges'''',N''''https://www.youtube.com/watch?v=4YolrVX6f1Q'''',N''''Video'''',N''''Arabic'''',1),\n(7,N''''Python documentation: For loops and ranges'''',N''''https://docs.python.org/3/tutorial/controlflow.html#for-statements'''',N''''Documentation'''',N''''English'''',2),\n(8,N''''Elzero: While loops'''',N''''https://elzero.org/python-loop-while-and-else/'''',N''''Video'''',N''''Arabic'''',1),\n(8,N''''Python documentation: While loops'''',N''''https://docs.python.org/3/reference/compound_stmts.html#while'''',N''''Documentation'''',N''''English'''',2),\n(9,N''''Elzero: Functions and return values'''',N''''https://www.youtube.com/watch?v=Izwd_n-Ufqo'''',N''''Video'''',N''''Arabic'''',1),\n(9,N''''Python documentation: Functions and return values'''',N''''https://docs.python.org/3/tutorial/controlflow.html#defining-functions'''',N''''Documentation'''',N''''English'''',2),\n(10,N''''Elzero: Lists and indexing'''',N''''https://elzero.org/python-lists/'''',N''''Video'''',N''''Arabic'''',1),\n(10,N''''Python documentation: Lists and indexing'''',N''''https://docs.python.org/3/tutorial/datastructures.html#more-on-lists'''',N''''Documentation'''',N''''English'''',2),\n(11,N''''Elzero: Dictionaries'''',N''''https://elzero.org/python-dictionary/'''',N''''Video'''',N''''Arabic'''',1),\n(11,N''''Python documentation: Dictionaries'''',N''''https://docs.python.org/3/tutorial/datastructures.html#dictionaries'''',N''''Documentation'''',N''''English'''',2),\n(12,N''''Elzero: Functions refresher for your project'''',N''''https://www.youtube.com/watch?v=Izwd_n-Ufqo'''',N''''Video'''',N''''Arabic'''',1),\n(12,N''''Python documentation: Build a small program'''',N''''https://docs.python.org/3/tutorial/datastructures.html#looping-techniques'''',N''''Documentation'''',N''''English'''',2);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''python-placement'''',1,N''''Placement'''',1,NULL,NULL,N''''python-placement'''',NULL);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''python-level-1'''',1,N''''LevelQuiz'''',NULL,1,NULL,N''''python-level-1'''',70);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''python-level-2'''',1,N''''LevelQuiz'''',NULL,2,NULL,N''''python-level-2'''',70);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''python-level-3'''',1,N''''LevelQuiz'''',NULL,3,NULL,N''''python-level-3'''',70);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-variables'''',1,N''''LessonCheck'''',NULL,NULL,1,N''''lesson-variables'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-data-types'''',1,N''''LessonCheck'''',NULL,NULL,2,N''''lesson-data-types'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-input-output'''',1,N''''LessonCheck'''',NULL,NULL,3,N''''lesson-input-output'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-numbers'''',1,N''''LessonCheck'''',NULL,NULL,4,N''''lesson-numbers'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-conditions'''',1,N''''LessonCheck'''',NULL,NULL,5,N''''lesson-conditions'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-boolean-logic'''',1,N''''LessonCheck'''',NULL,NULL,6,N''''lesson-boolean-logic'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-for-loops'''',1,N''''LessonCheck'''',NULL,NULL,7,N''''lesson-for-loops'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-while-loops'''',1,N''''LessonCheck'''',NULL,NULL,8,N''''lesson-while-loops'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-functions'''',1,N''''LessonCheck'''',NULL,NULL,9,N''''lesson-functions'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-lists'''',1,N''''LessonCheck'''',NULL,NULL,10,N''''lesson-lists'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-dictionaries'''',1,N''''LessonCheck'''',NULL,NULL,11,N''''lesson-dictionaries'''',100);\nINSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES\n(N''''lesson-problem-solving'''',1,N''''LessonCheck'''',NULL,NULL,12,N''''lesson-problem-solving'''',100);\nINSERT dbo.Questions (AssessmentId,TopicId,Prompt,CodeSnippet,Explanation,SortOrder) VALUES\n(1,1,N''''What is the type of this value?'''',N''''name = \"Lujain\"'''',NULL,1),\n(1,1,N''''What does this code print?'''',N''''x = 3\nx = 7\nprint(x)'''',NULL,2),\n(1,4,N''''What does this code print?'''',N''''print(2 + 3 * 4)'''',NULL,3),\n(1,3,N''''What is the type returned by input()?'''',N''''age = input(\"Enter your age: \")'''',NULL,4),\n(1,5,N''''What does this code print?'''',N''''score = 70\nif score >= 70:\n    print(\"Passed\")\nelse:\n    print(\"Try again\")'''',NULL,5),\n(1,6,N''''What does this expression evaluate to?'''',N''''True and False'''',NULL,6),\n(1,7,N''''Which values does this loop print?'''',N''''for number in range(1, 4):\n    print(number)'''',NULL,7),\n(1,7,N''''What is the final printed value?'''',N''''total = 0\nfor number in [1, 2, 3]:\n    total += number\nprint(total)'''',NULL,8),\n(1,9,N''''What does this code print?'''',N''''def double(number):\n    return number * 2\n\nprint(double(4))'''',NULL,9),\n(1,12,N''''What does this code print?'''',N''''def greet(name):\n    return \"Hello, \" + name\n\nprint(greet(\"Lujain\"))'''',NULL,10),\n(2,1,N''''What is printed?'''',N''''count = 2\ncount = count + 3\nprint(count)'''',N''''The addition creates the integer 5, which is assigned back to count.'''',1),\n(2,2,N''''Which value is a float?'''',NULL,N''''A decimal number without quotation marks is a float.'''',2),\n(2,3,N''''What is printed for input 4?'''',N''''value = input()\nprint(value + \"1\")'''',N''''input returns a string, so + joins the two strings.'''',3),\n(2,4,N''''What is printed?'''',N''''price = 1.5\nquantity = 2\nprint(f\"{price * quantity:.2f}\")'''',N''''The product is 3.0; .2f displays two decimal places.'''',4),\n(3,5,N''''What is printed?'''',N''''score = 70\nif score > 70:\n    print(\"A\")\nelse:\n    print(\"B\")'''',N''''> excludes equality, so 70 > 70 is false.'''',1),\n(3,6,N''''What is the value?'''',N''''not (True or False)'''',N''''True or False is True, then not reverses it.'''',2),\n(3,7,N''''What is printed?'''',N''''total = 0\nfor number in range(2, 5):\n    total += number\nprint(total)'''',N''''The loop adds 2, 3 and 4.'''',3),\n(3,8,N''''What is printed?'''',N''''count = 1\nwhile count < 4:\n    count += 1\nprint(count)'''',N''''The last update makes count 4, so the next condition is false.'''',4),\n(4,9,N''''What is printed?'''',N''''def add(a, b):\n    return a + b\nprint(add(3, 4))'''',N''''return sends the sum back to print.'''',1),\n(4,10,N''''What is printed?'''',N''''values = [2, 4]\nvalues.append(6)\nprint(values[-1])'''',N''''Index -1 selects the last item, which is now 6.'''',2),\n(4,11,N''''What is printed?'''',N''''task = {\"done\": False}\ntask[\"done\"] = True\nprint(task[\"done\"])'''',N''''Assigning to the existing key updates its value.'''',3),\n(4,12,N''''Which extra test checks a boundary?'''',N''''def total(values):\n    return sum(values)'''',N''''An empty collection checks the zero-item case.'''',4),\n(5,1,N''''What does the second print(name) display?'''',N''''name = \"Lujain\"\nprint(name)\n\nname = \"Loji\"\nprint(name)'''',N''''The second assignment makes name refer to \"Loji\".'''',1),\n(6,2,N''''Which value has the type bool?'''',N''''name = \"Lujain\"\nage = 21\nheight = 1.64\nis_learning = True\n\nprint(type(age))\nprint(type(is_learning))'''',N''''True without quotation marks is a boolean. \"True\" is a string.'''',1),\n(7,3,N''''What type does input() return?'''',N''''name = input()\nprint(f\"Hello, {name}!\")'''',N''''input() returns a string, even when the user enters digits.'''',1),\n(8,4,N''''What is the result of int(\"3\") * 2?'''',N''''price = float(input())\nquantity = int(input())\ntotal = price * quantity\n\nprint(f\"Total: {total:.2f}\")'''',N''''int(\"3\") converts the text to the integer 3, and 3 * 2 is 6.'''',1),\n(9,5,N''''What is printed when score is 69?'''',N''''score = 72\nif score >= 70:\n    print(\"Passed\")\nelse:\n    print(\"Try again\")'''',N''''69 >= 70 is false, so the else branch runs.'''',1),\n(10,6,N''''What does True and False evaluate to?'''',N''''age = 18\nhas_ticket = True\nprint(age >= 18 and has_ticket)\nprint(not has_ticket)'''',N''''and is true only when both operands are true.'''',1),\n(11,7,N''''What does range(1, 4) produce?'''',N''''total = 0\nfor number in range(1, 4):\n    total += number\nprint(total)'''',N''''The start is included and the stop is excluded.'''',1),\n(12,8,N''''How many times does the loop body run when count starts at 0?'''',N''''count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\nprint(\"Go\")'''',N''''The condition count > 0 is false before the first iteration.'''',1),\n(13,9,N''''What value does double(5) return?'''',N''''def double(number):\n    return number * 2\n\nresult = double(4)\nprint(result)'''',N''''The return expression multiplies the argument by two.'''',1),\n(14,10,N''''Which expression gets the first score?'''',N''''scores = [70, 85]\nscores.append(90)\nprint(scores[0])\nprint(len(scores))'''',N''''Python lists use zero-based indexing.'''',1),\n(15,11,N''''What does student.get(\"missing\", 0) return?'''',N''''student = {\"name\": \"Lujain\", \"score\": 85}\nstudent[\"score\"] = 90\nprint(student[\"name\"])\nprint(student.get(\"level\", 1))'''',N''''get returns its default argument when the key does not exist.'''',1),\n(16,12,N''''Which extra case is most useful when testing count_done?'''',N''''def count_done(tasks):\n    return sum(1 for task in tasks if task[\"done\"])\n\ntasks = [{\"title\": \"Read\", \"done\": True},\n         {\"title\": \"Code\", \"done\": False}]\nprint(count_done(tasks))'''',N''''An empty collection checks a case that the normal example does not cover.'''',1);\nINSERT dbo.QuestionOptions (QuestionId,OptionText,IsCorrect,SortOrder) VALUES\n(1,N''''int'''',0,1),\n(1,N''''str'''',1,2),\n(1,N''''float'''',0,3),\n(1,N''''bool'''',0,4),\n(2,N''''3'''',0,1),\n(2,N''''7'''',1,2),\n(2,N''''10'''',0,3),\n(2,N''''An error'''',0,4),\n(3,N''''20'''',0,1),\n(3,N''''14'''',1,2),\n(3,N''''24'''',0,3),\n(3,N''''9'''',0,4),\n(4,N''''int'''',0,1),\n(4,N''''float'''',0,2),\n(4,N''''str'''',1,3),\n(4,N''''bool'''',0,4),\n(5,N''''Passed'''',1,1),\n(5,N''''Try again'''',0,2),\n(5,N''''Both messages'''',0,3),\n(5,N''''Nothing'''',0,4),\n(6,N''''True'''',0,1),\n(6,N''''False'''',1,2),\n(6,N''''None'''',0,3),\n(6,N''''An error'''',0,4),\n(7,N''''1, 2, 3'''',1,1),\n(7,N''''1, 2, 3, 4'''',0,2),\n(7,N''''0, 1, 2, 3'''',0,3),\n(7,N''''4'''',0,4),\n(8,N''''3'''',0,1),\n(8,N''''5'''',0,2),\n(8,N''''6'''',1,3),\n(8,N''''0'''',0,4),\n(9,N''''4'''',0,1),\n(9,N''''6'''',0,2),\n(9,N''''8'''',1,3),\n(9,N''''An error'''',0,4),\n(10,N''''Hello, name'''',0,1),\n(10,N''''Hello, Lujain'''',1,2),\n(10,N''''greet'''',0,3),\n(10,N''''Nothing'''',0,4),\n(11,N''''2'''',0,1),\n(11,N''''5'''',1,2),\n(11,N''''23'''',0,3),\n(12,N''''\"2.5\"'''',0,1),\n(12,N''''2'''',0,2),\n(12,N''''2.5'''',1,3),\n(13,N''''5'''',0,1),\n(13,N''''41'''',1,2),\n(13,N''''An error'''',0,3),\n(14,N''''3'''',0,1),\n(14,N''''3.00'''',1,2),\n(14,N''''1.52'''',0,3),\n(15,N''''A'''',0,1),\n(15,N''''B'''',1,2),\n(15,N''''A and B'''',0,3),\n(16,N''''True'''',0,1),\n(16,N''''False'''',1,2),\n(16,N''''None'''',0,3),\n(17,N''''9'''',1,1),\n(17,N''''14'''',0,2),\n(17,N''''5'''',0,3),\n(18,N''''3'''',0,1),\n(18,N''''4'''',1,2),\n(18,N''''5'''',0,3),\n(19,N''''34'''',0,1),\n(19,N''''7'''',1,2),\n(19,N''''None'''',0,3),\n(20,N''''2'''',0,1),\n(20,N''''3'''',0,2),\n(20,N''''6'''',1,3),\n(21,N''''False'''',0,1),\n(21,N''''True'''',1,2),\n(21,N''''done'''',0,3),\n(22,N''''total([1, 2]) twice'''',0,1),\n(22,N''''total([])'''',1,2),\n(22,N''''Renaming total'''',0,3),\n(23,N''''Lujain'''',0,1),\n(23,N''''Loji'''',1,2),\n(23,N''''name'''',0,3),\n(24,N''''\"True\"'''',0,1),\n(24,N''''21'''',0,2),\n(24,N''''True'''',1,3),\n(25,N''''str'''',1,1),\n(25,N''''int'''',0,2),\n(25,N''''bool'''',0,3),\n(26,N''''\"33\"'''',0,1),\n(26,N''''6'''',1,2),\n(26,N''''An error'''',0,3),\n(27,N''''Passed'''',0,1),\n(27,N''''Try again'''',1,2),\n(27,N''''Both messages'''',0,3),\n(28,N''''True'''',0,1),\n(28,N''''False'''',1,2),\n(28,N''''None'''',0,3),\n(29,N''''1, 2, 3'''',1,1),\n(29,N''''1, 2, 3, 4'''',0,2),\n(29,N''''0, 1, 2, 3'''',0,3),\n(30,N''''0'''',1,1),\n(30,N''''1'''',0,2),\n(30,N''''Forever'''',0,3),\n(31,N''''5'''',0,1),\n(31,N''''10'''',1,2),\n(31,N''''None'''',0,3),\n(32,N''''scores[1]'''',0,1),\n(32,N''''scores[0]'''',1,2),\n(32,N''''scores.first'''',0,3),\n(33,N''''An error'''',0,1),\n(33,N''''0'''',1,2),\n(33,N''''None'''',0,3),\n(34,N''''Only the same example again'''',0,1),\n(34,N''''An empty task list'''',1,2),\n(34,N''''Changing the function name'''',0,3);\nUPDATE dbo.Assessments SET PublicationStatus=''''Published'''';\nINSERT dbo.Enrollments (StudentId,CourseId,EvidenceOrigin) VALUES\n(2,1,N''''academic-seed''''),\n(3,1,N''''academic-seed'''');\nINSERT dbo.LessonCompletions (EnrollmentId,LessonId,CompletedAtUtc,CompletionMethod,EvidenceOrigin) VALUES\n(1,1,N''''2026-11-05T08:00:00.000'''',N''''manual'''',N''''academic-seed''''),\n(1,2,N''''2026-11-05T08:00:00.000'''',N''''manual'''',N''''academic-seed''''),\n(1,3,N''''2026-11-05T08:00:00.000'''',N''''manual'''',N''''academic-seed''''),\n(1,4,N''''2026-11-05T08:00:00.000'''',N''''manual'''',N''''academic-seed'''');\nINSERT dbo.AssessmentAttempts (UserId,AssessmentId,EvidenceOrigin) VALUES\n(2,1,N''''academic-seed''''),\n(2,2,N''''academic-seed'''');\nINSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,OptionId,ResponseKind,AnsweredAtUtc)\n SELECT a.AttemptId,q.QuestionId,a.AssessmentId,CASE WHEN a.AttemptId=1 AND q.SortOrder=10 THEN NULL ELSE o.OptionId END,CASE WHEN a.AttemptId=1 AND q.SortOrder=10 THEN ''''unsure'''' ELSE ''''option'''' END,SYSUTCDATETIME()\n FROM dbo.AssessmentAttempts a JOIN dbo.Questions q ON q.AssessmentId=a.AssessmentId JOIN dbo.QuestionOptions o ON o.QuestionId=q.QuestionId AND o.IsCorrect=1;\nUPDATE dbo.AssessmentAttempts SET Status=''''Submitted'''',SubmittedAtUtc=SYSUTCDATETIME();\nINSERT dbo.CodingTasks (LevelId,TaskCode,VersionNo,TaskKind,Title,Description,RequirementsText,StarterCode,SampleInput,SampleOutput,ReferenceSolution,SolutionExplanation,VerificationCode,SortOrder) VALUES\n(1,N''''student-profile'''',1,N''''Exercise'''',N''''Create a student profile'''',N''''Create three variables and display a student''''''''s details.'''',N''''1. Set name to \"Lujain\", age to 21 and track to \"Python\".\n2. Print one labeled value per line.\n3. Match the expected output exactly.\n4. Do not print additional text.'''',N''''# Create the three variables\n\n# Print the labeled values\n'''',N'''''''',N''''Name: Lujain\nAge: 21\nTrack: Python'''',N''''name = \"Lujain\"\nage = 21\ntrack = \"Python\"\n\nprint(f\"Name: {name}\")\nprint(f\"Age: {age}\")\nprint(f\"Track: {track}\")'''',N''''The variables store three different values. Each f-string adds the required label. Three print calls produce exactly three output lines.'''',N''''\nassert name == \"Lujain\" and age == 21 and track == \"Python\", \"Create the requested variables with the correct values.\"'''',1),\n(1,N''''receipt'''',1,N''''Exercise'''',N''''Build a simple receipt'''',N''''Read a price and quantity, then calculate the total.'''',N''''1. Read the price from the first input line using float(input()).\n2. Read the quantity from the second line using int(input()).\n3. Use input() without prompt text.\n4. Print Total: followed by the result with two decimal places.\n5. Assume the inputs are valid non-negative numbers.'''',N''''# Read price and quantity\n\n# Calculate the total\n\n# Print the formatted result\n'''',N''''2.5\n3'''',N''''Total: 7.50'''',N''''price = float(input())\nquantity = int(input())\ntotal = price * quantity\nprint(f\"Total: {total:.2f}\")'''',N''''float preserves decimal prices, while int represents a whole quantity. Multiplication calculates the total for any test input. The format specifier .2f produces the required money format.'''',NULL,2),\n(2,N''''grade-checker'''',1,N''''Exercise'''',N''''Check a grade'''',N''''Use a condition to classify a score.'''',N''''1. Read one integer score with input().\n2. Print \"Passed\" for 70 or more; otherwise print \"Try again\".\n3. Do not print input prompts.'''',N''''# Read a score and choose a message\n'''',N''''70'''',N''''Passed'''',N''''score = int(input())\nif score >= 70:\n    print(\"Passed\")\nelse:\n    print(\"Try again\")'''',N''''Converting input to an integer allows numeric comparison. The inclusive boundary >= handles 70 correctly. Only one branch runs, so the output contains one message.'''',NULL,1),\n(2,N''''sum-numbers'''',1,N''''Exercise'''',N''''Sum a range'''',N''''Practise loops and accumulators.'''',N''''1. Read a non-negative integer n.\n2. Calculate the sum of integers from 1 through n, including n.\n3. Print only the sum.'''',N''''# Read n, accumulate a total and print it\n'''',N''''5'''',N''''15'''',N''''n = int(input())\ntotal = 0\nfor number in range(1, n + 1):\n    total += number\nprint(total)'''',N''''The accumulator lives outside the loop. Each iteration adds the next number. Including n + 1 as the stop includes n in the sum. An empty range leaves total at zero.'''',NULL,2),\n(3,N''''list-summary'''',1,N''''Exercise'''',N''''Summarise a list'''',N''''Combine functions and lists to process input.'''',N''''1. Read space-separated integers from a single input line.\n2. Print the count on the first line and their sum on the second.\n3. An empty input line should produce a count and sum of zero.'''',N''''# Read, split and convert the input values\n# Print the count and total\n'''',N''''2 4 6'''',N''''3\n12'''',N''''values = [int(value) for value in input().split()]\nprint(len(values))\nprint(sum(values))'''',N''''split() returns an empty list for an empty line. The comprehension converts each available item. len and sum return zero for the empty case, so no special output branch is needed.'''',NULL,1),\n(3,N''''task-manager'''',1,N''''FinalProject'''',N''''Build a Study Task Manager'''',N''''Your final project: model tasks and report how many are complete.'''',N''''1. Read an integer n, then n lines containing a task title and a status separated by a comma.\n2. Status is \"done\" or \"todo\". Store records in a list of dictionaries.\n3. Define count_done(tasks) to return the number of completed records. Each record uses the boolean key done.\n4. Print \"Completed: X/N\" using the completed count and total. Handle n = 0.'''',N''''def count_done(tasks):\n    # Return the number of completed tasks\n    return 0\n\n# Read the task records and print the summary\n'''',N''''2\nRead,done\nCode,todo'''',N''''Completed: 1/2'''',N''''def count_done(tasks):\n    count = 0\n    for task in tasks:\n        if task[\"done\"]:\n            count += 1\n    return count\n\nn = int(input())\ntasks = []\nfor _ in range(n):\n    title, status = input().split(\",\")\n    tasks.append({\"title\": title, \"done\": status == \"done\"})\n\nprint(f\"Completed: {count_done(tasks)}/{len(tasks)}\")'''',N''''The function receives data and returns a count without reading input. Each dictionary keeps related fields together. Comparing status with done creates a boolean. An empty list produces Completed: 0/0 naturally.'''',N''''\nassert callable(count_done), \"Define count_done(tasks).\"\nassert count_done([]) == 0, \"Handle an empty list.\"\nassert count_done([{\"done\": True}, {\"done\": False}, {\"done\": True}]) == 2, \"Count completed records.\"\nassert isinstance(tasks, list) and all(isinstance(t, dict) and isinstance(t.get(\"done\"), bool) for t in tasks), \"Store tasks as dictionaries with boolean done values.\"'''',2);\nINSERT dbo.CodingTaskTopics (TaskId,TopicId) VALUES\n(1,1),\n(1,3),\n(2,4),\n(2,3),\n(3,5),\n(3,6),\n(4,7),\n(4,8),\n(5,10),\n(5,9),\n(6,12),\n(6,11),\n(6,9);\nINSERT dbo.TaskTestCases (TaskId,CaseNo,InputText,ExpectedOutput,IsPublic) VALUES\n(1,1,N'''''''',N''''Name: Lujain\nAge: 21\nTrack: Python'''',1),\n(2,1,N''''2.5\n3'''',N''''Total: 7.50'''',1),\n(2,2,N''''4\n2'''',N''''Total: 8.00'''',1),\n(2,3,N''''0\n5'''',N''''Total: 0.00'''',1),\n(2,4,N''''1.25\n4'''',N''''Total: 5.00'''',1),\n(3,1,N''''70'''',N''''Passed'''',1),\n(3,2,N''''69'''',N''''Try again'''',1),\n(3,3,N''''0'''',N''''Try again'''',1),\n(3,4,N''''100'''',N''''Passed'''',1),\n(4,1,N''''5'''',N''''15'''',1),\n(4,2,N''''0'''',N''''0'''',1),\n(4,3,N''''1'''',N''''1'''',1),\n(4,4,N''''10'''',N''''55'''',1),\n(5,1,N''''2 4 6'''',N''''3\n12'''',1),\n(5,2,N'''''''',N''''0\n0'''',1),\n(5,3,N''''-2 2'''',N''''2\n0'''',1),\n(5,4,N''''7'''',N''''1\n7'''',1),\n(6,1,N''''2\nRead,done\nCode,todo'''',N''''Completed: 1/2'''',1),\n(6,2,N''''0'''',N''''Completed: 0/0'''',1),\n(6,3,N''''1\nRevise,todo'''',N''''Completed: 0/1'''',1),\n(6,4,N''''2\nLearn,done\nBuild,done'''',N''''Completed: 2/2'''',1);\nINSERT dbo.TaskHints (TaskId,HintNo,HintText) VALUES\n(1,1,N''''Separate the data from its display: create a name, an age and a track before printing anything.''''),\n(1,2,N''''Use one print per line. An f-string such as f\"Name: {name}\" inserts the value while keeping the label.''''),\n(2,1,N''''Read the price and quantity separately. input() returns text, so convert both values before multiplying them.''''),\n(2,2,N''''Use float for the price and int for the quantity. Format the calculated total with :.2f so zero and whole-number totals also show two decimal places.''''),\n(3,1,N''''There are only two outcomes. Use an if branch for scores that pass and an else branch for everything else.''''),\n(3,2,N''''The pass mark includes 70 itself. Compare using >= rather than >, and print exactly the message requested.''''),\n(4,1,N''''Start a running total at zero before the loop. Add each number to that same total.''''),\n(4,2,N''''range excludes its stop value. To include n, use range(1, n + 1). For n = 0 the loop should execute zero times.''''),\n(5,1,N''''Split the input line into separate pieces, then convert each piece to an integer.''''),\n(5,2,N''''A list comprehension can build the numeric list. len(values) gives its size and sum(values) its total; both handle an empty list.''''),\n(6,1,N''''Represent each record as a dictionary with title and done keys. Convert the status text to a boolean as you read the input.''''),\n(6,2,N''''Keep counting separate from input: count_done(tasks) should loop over the records and count those whose done value is True. Use len(tasks) for the total.'''');\nUPDATE dbo.CodingTasks SET PublicationStatus=''''Published'''';\nINSERT dbo.TaskWorkspaceState (EnrollmentId,TaskId,DraftCode,DraftInput,HasAttempted,HintsRevealedCount,SolutionViewed) VALUES\n(1,1,N''''# Mutable academic draft'''',N'''''''',1,1,0);\nINSERT dbo.CodeSubmissions (EnrollmentId,TaskId,CodeText,ExecutionEnvironment,RuntimeVersion,EvaluatorVersion,EvidenceOrigin) VALUES\n(1,1,N''''name = \"Lujain\"\nage = 21\ntrack = \"Python\"\n\nprint(f\"Name: {name}\")\nprint(f\"Age: {age}\")\nprint(f\"Track: {track}\")'''',N''''Academic SQL fixture'''',NULL,N''''fixture-v1'''',N''''academic-seed''''),\n(1,2,N''''print(\"wrong\")'''',N''''Academic SQL fixture'''',NULL,N''''fixture-v1'''',N''''academic-seed''''),\n(1,2,N''''while True: pass'''',N''''Academic SQL fixture'''',NULL,N''''fixture-v1'''',N''''academic-seed'''');\nUPDATE dbo.CodeSubmissions SET EvaluationStatus=''''Running'''';\nINSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)\n SELECT 1,TestCaseId,TaskId,1,ExpectedOutput,NULL,NULL,''''Success'''' FROM dbo.TaskTestCases WHERE TaskId=1;\nINSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)\n SELECT 2,TestCaseId,TaskId,0,N''''wrong'''',NULL,NULL,''''Success'''' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;\nINSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)\n SELECT 3,TestCaseId,TaskId,0,N'''''''',N''''Illustrative timeout; Python was not executed.'''',NULL,''''Timeout'''' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;\nUPDATE dbo.CodeSubmissions SET EvaluationStatus=''''Completed'''',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId IN(1,2);\nUPDATE dbo.CodeSubmissions SET EvaluationStatus=''''Error'''',FinishedAtUtc=SYSUTCDATETIME(),EvaluationError=N''''Illustrative timeout'''' WHERE SubmissionId=3;\n'';'+N' COMMIT TRANSACTION; END TRY BEGIN CATCH IF XACT_STATE()<>0 ROLLBACK TRANSACTION; THROW; END CATCH;';\nEXEC sys.sp_executesql @Install;\nPRINT N'Installed '+QUOTENAME(@DatabaseName)+N'. Run verification.sql explicitly in this database.';\n",
  "sqlSha256": "e7c0a9a228bb5cd1f4f9c25a7ef7e9be124b854321311eceb7b99f7dcefb3b5f"
};
