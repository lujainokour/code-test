# CodeMentor AI — Phase 2 project analysis and logical database proposal

> Historical snapshot — not a current implementation inventory. Dated counts and outcomes below describe that snapshot only. See [the code-derived current implementation](CURRENT-IMPLEMENTATION.md) for current curriculum counts, roles and limitations. Sample credential literals in historical excerpts have been redacted.

Date: November 4, 2026 (Asia/Amman). Status: **analysis for review, not an implemented schema**. Phase 3 requires separate approval. No SQL script, DDL, database creation, frontend change, browser-storage change, or model training forms part of this phase.

## 1. Architectural conclusion and evidence standard

The active project is a static HTML/CSS/JavaScript application. It has substantial working **local** learning behavior and explicitly simulated administrative/service behavior. It has no identified application backend, SQL Server connector, real authentication provider, payment integration, real calendar, or live AI call. A static HTTP development server and the Pyodide WebAssembly runtime do not create a database-backed application. The archived SQL design was not used as a design source; archived files were only hashed for preservation.

Review coverage: **52 active HTML files** (index plus 51 pages), including **24 student pages and 10 admin pages**, and **68 application JavaScript files**. All were read for static dependency/storage/control-flow evidence, with focused inspection of the feature implementations described below. The page-by-page inventory appears in section 11. Supporting [source evidence](database-phase2-evidence.json) records source hashes, scripts, headings, forms, storage literals and relevant line excerpts. This is a static source analysis: no browser behavior, SQL execution, network service, historical test claim, or model accuracy was newly tested.

Direct script-tag scanning alone is insufficient: python-worker.js is loaded by python-runner.js, and user-guide.js is dynamically injected by workspace-shell.js ([js/workspace-shell.js:145](../js/workspace-shell.js)). cm-home.js has no direct active-page script reference and should not be treated as an implemented data module merely because it exists.

The recommended starting scope is **23 Essential logical tables**. Another **23 Optional tables** are listed as independent extension packs, and **4 Future AI tables** describe possible later artifacts. **The combined catalog is not a recommendation to create all 50 tables in Phase 3.** Essential means necessary for the recommended relational core, not that SQL persistence or the corresponding backend operation already exists. Optional means separately gated scope; Future AI means no implementation claim.

## 2. Feature reality and database requirements

| Module and current implementation | What should be retained and why | Users and relationships | Storage/table recommendation |
| --- | --- | --- | --- |
| Signup/profile/onboarding: validates and persists a demo identity plus preferences; sample login is hardcoded. Password changes/recovery are simulations. | Canonical account, role, enabled/suspended state, declared age where genuinely needed, selected language, experience and goal. Needed for ownership and preference-based routing. | Student edits own preferences; admin later manages account access. Public identity remains separate. | Users + StudentProfiles; no registration event or real credential inferred from demo signup. Authentication integration is future backend work. |
| Catalog/admin content: 13 languages; 3 hardcoded sample courses marked draft. Only Python has built-in assessed content. Admin can create local draft courses/levels, create/edit lessons and add/edit/delete resource links. | Course hierarchy, order, level descriptions/objectives, lesson text/code/prepared output, estimated minutes, external resources, draft/visible state. | Admin authors; student browses available content. | Languages, Courses, Levels, LevelObjectives, Lessons, LessonResources. Draft is a state, not a second copy/table. |
| Built-in Python learning: 3 levels × 4 lessons. Correct lesson answers auto-record completion; manual completion is also permitted. | Content and separate per-student completion basis; actual question answers needed for review. | Student ↔ course via proposed Enrollments; one completion per enrolled lesson. | LessonCompletions plus the common assessment tables. Current language selection is not an enrollment operation. |
| Placement: 10 fixed Python questions; save/resume/review/submit, including unsure responses; topic scores computed locally. | Attempt state and answer evidence. Diagnostic uncertainty matters and differs from choosing a wrong option. | Student takes an optional course-scoped placement assessment before enrollment if desired. | Assessments, Questions, QuestionOptions, AssessmentAttempts, AttemptAnswers and Topics. No separate placement-result table. |
| Level quizzes: 4 questions per level, after all four lessons; 70% pass. Best and latest information retained, not all attempts. | Every future attempt/answer plus immutable assessment version. Needed for honest improvement curves and reproducible grading. | Student takes level-scoped assessment; lesson knowledge checks use the same engine. | Common assessment tables; scores/latest/best normally derived. Full historical retention is a proposed improvement. |
| Coding workspace: 6 real Python tasks, worker execution, run/stop, autosaved input/code, automated checks, last passing code and completion download. | Task version, requirements, tests, verification assertions, draft state, each checked code snapshot and case result. | Student owns state/submissions; curriculum provides test definitions. | CodingTasks, TaskTestCases, TaskWorkspaceState, CodeSubmissions, SubmissionTestResults. Run-only execution has no full history today. |
| Hints and review plan: progressive prepared hints, solution gate and fixed-rule ranking from wrong answers/failing tests. | Hint content and current support state; stable task–concept links. | Student consumes help; admin later curates concept mapping. | TaskHints + CodingTaskTopics + Topics; state lives in TaskWorkspaceState. No trained recommender or stored prediction needed. |
| Progress/dashboard/reports/skill analysis: computed from local records; printable report and JSON merge/restore work in source. | Original completions, answers, submissions, identity/preferences; provenance on imported evidence. | Student views own summaries; admin future aggregate access must be server-authorized. | Derived queries/views. No Dashboard, ProgressPercentage, LearningReport, BestScore, SkillAnalysis, or LevelUnlock tables. |
| Final Python project: Study Task Manager is task-manager, a coding task checked by the same runtime. Old evaluation route redirects to its real code-review page. | Task-kind and its existing checked solution evidence. | Student solves a task linked to level 3. | Reuse CodingTasks/CodeSubmissions; do not create a duplicate final-project submission subsystem. |
| Certificates: eligibility derived from signed-in demo profile, all 12 lessons, all three level passes and all six tasks; browser printing is enabled accordingly. | None beyond current underlying evidence for a print preview. Persistent issuance would need its own immutable record and policy. | Student prints locally; no issuer/verification service exists. | No core certificate table; Optional Certificates only after issuance scope is approved. |
| Student directory/account access/admin analytics: 4 fictional students with hardcoded learning path/level/activity; local status overlays; aggregate sample/local-content counts. Admin dashboard live metrics are unavailable, not zero. | Account current state in Users; genuine progress from core queries; audit actor/time only if collected. | Admin manages genuine accounts later. Fixture person IDs are not registered users. | Core Users and derived summaries; Optional AccountStatusHistory. No AdminDashboard, FakeStatistics or permanent fixture-person identity inference. |
| Public showcase/profiles: 3 fictional public students; skills, language interests and project concepts/links; no private-account publishing. | Consent-controlled public display and optional portfolio entries. | Student owner if enabled later; public reader sees approved/public fields only. | Optional PublicProfiles, Skills, StudentSkills, StudentLanguageInterests, PortfolioItems. These catalogs are not proof of mastery. |
| Services: 3 sample listings; private service drafts with comma-separated skills; owner-filtered simulated request briefs/history. | Listing or draft, skill links, deliverable descriptions, saved requester brief, origin/status. | Provider student and requester student; no delivery or payment actor exists. | Optional Services, ServiceSkills, ServiceDeliverables, ServiceRequests. No payments/orders/invoices. |
| Peer mentoring: 3 fixture offers with sample approval; 3 future-looking slots generated afresh from browser dates; saved local booking requests. | Offer, declared skills, duration and indicative price. Genuine scheduling later needs persistent slots and request lifecycle. | Student mentor and student requester; administrator approval is only a fixture flag today. | Optional MentorOffers, MentorOfferSkills, MentorSlots, MentoringBookings. No calendar availability or confirmed meeting inferred. |
| Virtual internship: fictional C# school-management brief; 5 self-reported tasks; saved GitHub URL/notes, owner-only inclusion in local portfolio; same sample review for everyone. | Structured brief, task definitions, student participation, self-reported task status, saved link/notes and explicit display visibility. | Student manages own board; no employer/assessor integration. | Optional Projects, ProjectTasks, ProjectParticipations, ProjectTaskProgress, ProjectDeliveries; optional owner-only PortfolioItem reference. Do not store the fictional school’s students/teachers as CodeMentor tables. |
| Programming mentor: chat history really saves, replies are regex/keyword-matched prepared text; no arbitrary code analysis. | Conversation ownership/context, ordered messages and true response source if persistence is adopted. | Student and prepared assistant today; AI provider only later. | Optional MentorConversations/MentorMessages; AI generation metadata only when integration exists. |
| Community/Kahoot/contact/theme/help: no connected Discord invitation or posts; Kahoot assignment URL is null; optional external links and UI preferences. | At most a configured external URL and device preferences, not fictitious engagement/results. | Visitor/student/admin UI. | No community-post, meeting, notification, contact-request, Kahoot-score, theme or help-tour table in this proposal. |

Evidence for these distinctions: identity [js/signup.js:207](../js/signup.js), auth [js/login.js:105](../js/login.js), profile [js/profile.js:40](../js/profile.js), level objectives [js/admin-level-create.js:163](../js/admin-level-create.js), local lesson boundary [js/lesson-content.js:74](../js/lesson-content.js), quiz behavior [js/level-assessment.js:61](../js/level-assessment.js), workspace [js/workspace.js:269](../js/workspace.js), browser runtime [js/python-runner.js:21](../js/python-runner.js) and [js/python-worker.js:2](../js/python-worker.js), support state [js/workspace-support.js:18](../js/workspace-support.js), rule recommendations [js/learning-support.js:42](../js/learning-support.js), certificates [js/certificates.js:15](../js/certificates.js), admin analytics [js/admin-analytics.js:6](../js/admin-analytics.js), service stores [js/student-services-store.js:6](../js/student-services-store.js), generated slots [js/student-services.js:91](../js/student-services.js), internship [js/virtual-internship-store.js:5](../js/virtual-internship-store.js), mentor [js/mentor.js:211](../js/mentor.js), import [js/learning-backup.js:25](../js/learning-backup.js).

## 3. Storage contract, data grain and trust

The effective storage is determined by **learning-storage.js**, not by older UI messages saying “in this tab.” [js/learning-storage.js:19](../js/learning-storage.js) defines an allowlist: identity and selected learning records persist; all other cmStorage keys fall through to sessionStorage.

| Key/pattern | Actual backing and ownership | Shape / retained information | Important limitation |
| --- | --- | --- | --- |
| codementor-demo-session → codementor-profile-v1 | localStorage, one active profile | name, email, optional age, role=student, isDemo | Not a secure session, user registry, password record or admin authentication. Logging out removes active identity, not all learning. |
| codementor-demo-onboarding | localStorage under codementor-learning-v1:encoded-normalized-owner:key | language, experience, goal | One current preference set; preference is not enrollment. |
| codementor-demo-placement | Same profile-scoped localStorage | version, status, currentQuestion, answers (null/option index/unsure), startedAt, submittedAt | One attempt only; no historical bank of placement attempts. |
| codementor-demo-learning | Same profile-scoped localStorage | version; lessons[]; tasks[]; assessments[level]; checks[lesson]; taskResults[task]; submissions[task]; support[task] | A mutable object, not a normalized database. Completion arrays lack event timestamps/method; quiz history and lesson-check history are overwritten. |
| codementor-demo-code-taskId | Same profile-scoped localStorage | version, taskId, code, input, updatedAt | Latest mutable draft; never substitute it for the code that was graded. |
| codementor-demo-admin-account-status | sessionStorage, shared within the tab | fixtureStudentId → enabled/suspended | Does not enforce login/access and records no admin actor, reason or history. |
| codementor-demo-admin-course-drafts / -course-content | sessionStorage, tab-scoped rather than authenticated admin ownership | versioned course arrays; nested levels/objectives/lessons/resources; timestamps where writers provide them | Local course/lesson visibility is not server publication; no general content revision history. |
| codementor-demo-peer-bookings / -service-requests / -service-drafts | sessionStorage, explicit record.owner email and reader filtering | version, records[]; ID, owner, createdAt, fields and local-simulation/draft status | Owner normalization differs from learning storage; local duplicate-slot check is per owner and does not reserve globally. |
| codementor-demo-virtual-internship | sessionStorage, per-owner records in one envelope | projectId; createdAt/updatedAt; tasks map; latest submission URL/notes/savedAt; showInPortfolio | No repository fetch, grading, task-state history or durable public publishing. |
| codementor-demo-chat-v2:owner:context | sessionStorage; normalized student owner or guest | latest 100 message objects, role + text | No saved per-message timestamps or model IDs. Legacy unowned chat keys are intentionally not assigned to a user. |
| codementor-demo-password-recovery | sessionStorage | email, nonce, numeric createdAt, prepared/completed, optional completedAt | Same-tab simulation, 20-minute validity; no email, password or real reset. |
| codementor-ui-theme; codementor-guide-v1:role:owner | Direct localStorage; guide falls back to sessionStorage | light/dark and tour acknowledgment | Device/UI preference; exclude from academic core. |

Additional learning object detail: assessments stores best score, lastScore, latest answers, bestAnswers, submittedAt and a kind marker. checks stores only latest correct/answer/checkedAt. taskResults stores latest passed/total/cases/code/submittedAt. submissions stores the latest passing code separately and survives a later failing attempt. support stores hintsUsed, attempted and solutionViewed; it does not record when each hint was opened. Cases record passed/input/expected/output/error only for tests that actually ran. These limitations are why append-only attempts/results are proposed.

Import/export ([js/learning-backup.js:7](../js/learning-backup.js)) exports the learning object. Import merges completed IDs, retains higher scores, and restores missing saved submissions/results; imported quiz scores may retain no answers or attempt date. A learner can edit a browser backup. **Imported records must never become server-verified achievements just because they satisfy a JSON validator.** Future migration would mark origin=browser-import and retain unknown times as null; ImportedAtUtc is not the original completion time. Unknown IDs and unproven identity links need review, not invented facts.

## 4. Current workflow and business-rule findings

1. **Identity:** signup validates a full name, age 1–120, email, and a 12-character password but only saves demo identity; passwords are not persisted. Student login recognizes its sample credentials. Admin login checks sample credentials and redirects without establishing server authorization. Real authorization/account suspension must be enforced by a later backend, not trusted browser fields.
2. **Preferences/content:** Python is the only built-in assessed curriculum. Other catalog languages are coming soon unless local lessons exist. Selecting another language routes to availability and does not automatically enroll or open Python. Admin course fixtures are draft even though a separately coded Python path exists; do not copy those fixture statuses as the truth of the future canonical course.
3. **Placement:** optional and diagnostic. Answering unsure is permitted; unanswered null is permitted while in progress but submission requires every response. A submitted placement can be reviewed; normal start/resume does not create a new attempt. There is no implemented rule assigning a student to level 2/3 based on score. Preserve that distinction.
4. **Lessons/quizzes:** a correct lesson check records completion, but the Complete lesson button can also record completion without a correct answer. The current object cannot later tell which method produced an older completion. Four lessons unlock the level quiz; a best quiz score at least 70% completes the level. Earlier completed levels unlock the next level. Coding tasks are additional practice for this progression rule.
5. **Coding:** Run executes the current draft/input and displays output without saving a full run result. Submit runs tests in order and stops on the first failure. All defined tests passing marks the task completed and saves a passing code snapshot. A later failing result does not remove earlier completion or replace the saved passing code. A timeout/stop/loading exception can display an error without a durable case-result row. HasAttempted is support state, not a count of successful executions.
6. **Gates:** roadmap, module, lesson and quiz navigation enforce some local prerequisites. Project-page navigation points to earlier levels if necessary. The workspace task selector and practice listing do not form a server-enforced prerequisite boundary; a direct task URL is not protected by an authenticated enrollment rule. Decide whether to retain open practice or add strict final-task gates in Phase 3; do not claim the latter already exists.
7. **Hints/recommendations:** an attempted run/submit unlocks the prepared explained solution; viewing it does not complete a task. reviewPlan ranks available concepts with fixed weights: latest wrong lesson check (3), latest wrong quiz answer (2), latest failing task evidence (2). A later correct lesson check can clear an older quiz weakness by timestamp. This is implemented deterministic personalization, not machine learning. Current quiz-to-lesson correspondence partly uses array positions; replace it with reviewed Topics links when designing canonical data.
8. **Certificates:** printing requires a valid student demo profile, all 12 lesson completions, all 3 quizzes passed, and all 6 coding tasks including task-manager passed. This is stricter than level progression. Its displayed date is derived from available latest quiz/task-result timestamps, not an issuance ledger or reliable first-eligibility timestamp. No uniqueness/verification/revocation service exists.
9. **Service/mentor requests:** saved records explicitly remain local-simulation. No provider is contacted, payment collected, service delivered or meeting booked. Slot dates are generated relative to browser time; global availability is unverified. Sample admin approval is a fixture property, not an actual approval action or a reward for course completion.
10. **Internship/portfolio:** five task statuses are self-reported. A syntactically validated GitHub URL is not evidence of repository ownership or functioning code. The prepared sample review never reads the repository. Explicit local inclusion only controls a private owner view; it does not populate the fictional public showcase or certify skill. No Company, SchoolStudent, Teacher, ClassGroup or employer table belongs in the platform merely because the student’s C# assignment discusses those entities.
11. **Mentor scope:** prepared replies recognize keywords. Context-specific maps cover only two original tasks and four foundational lessons ([js/mentor.js:5](../js/mentor.js)); links from later tasks may fall back to general context. Saved code is displayed for reference and is not analyzed. Chat stores the latest 50 exchanges, not an unlimited conversation dataset.
12. **Sample identity mismatch:** admin demo-001 Maya Hassan and public demo-maya Maya Haddad are separate fictional fixtures. They must not be merged by name, initials, row position or guessed email. A real account ID becomes the owner of future data; actual migration requires an explicit reviewed mapping and consent for any public fields.

## 5. Proposed logical architecture and table dictionary

This is a reviewable logical model, not final T-SQL. A question mark means optional/nullable. PK and FK identify candidate logical keys and their exact parent columns. Every FK points to a PK listed below. SQL Server data types, named constraints, indexes, transaction logic and DDL are deferred to Phase 3. Integer/surrogate IDs are logical placeholders; **not every PK should be IDENTITY**: shared profile keys and junction/composite keys reuse parent values.

Core 23 tables cover identity/preferences, ordered content, concepts, enrollment, assessment evidence, lesson completion and runnable coding. Enrollments is a proposed server participation boundary, not an existing UI workflow. Core does not include paid services, scheduling, persistent certificate issuance, non-workspace project management, stored chat, event telemetry or AI models. Each extension pack can be approved independently; its prerequisites are listed after the dictionary.

### A — Identity and preferences — Essential

#### Users

- **Classification:** Essential. **Purpose:** One canonical account for each person, including administrators.
- **Important columns:** UserId; Email (unique after canonical comparison); FullName; ReportedAge?; AgeRecordedAtUtc?; RoleCode; AccountStatus; CredentialHash? or ExternalAuthSubject?; CreatedAtUtc.
- **PK:** UserId. **FKs:** None.
- **Relationships / uniqueness:** One user has zero or one StudentProfiles row and many enrollments/attempts. Role is one code, Student or Admin, as in the current application.
- **سبب الحاجة والتصميم:** يجمع هوية الحساب مرة واحدة؛ لا نكرر الاسم والبريد داخل كل محاولة. العمر قيمة صرّح بها المستخدم وليس تاريخ ميلاد مستنتجًا، وكلمة المرور التجريبية لا تُرحّل.

#### StudentProfiles

- **Classification:** Essential. **Purpose:** Student-specific learning preferences; not a public profile.
- **Important columns:** UserId; PreferredLanguageId; ExperienceCode; LearningGoalCode; UpdatedAtUtc.
- **PK:** UserId (shared PK/FK). **FKs:** UserId → Users.UserId; PreferredLanguageId → Languages.LanguageId.
- **Relationships / uniqueness:** Users 1 → 0..1 StudentProfiles; Languages 1 → many student preferences.
- **سبب الحاجة والتصميم:** يفصل تفضيلات الطالب عن حساب الأدمن بعلاقة واحد إلى واحد؛ تغيير اللغة المفضلة لا يغيّر سجل التعلّم أو ينشئ تسجيلًا تلقائيًا.


### B — Curriculum and concepts — Essential

#### Languages

- **Classification:** Essential. **Purpose:** The programming-language catalog, including coming-soon entries.
- **Important columns:** LanguageId; Slug (unique); Name (unique); Description; ContentReadinessCode.
- **PK:** LanguageId. **FKs:** None.
- **Relationships / uniqueness:** One language has many courses and student preferences.
- **سبب الحاجة والتصميم:** وجود اللغة في الفهرس لا يعني وجود منهج أو اختبار لها؛ نحتاج تمييز جاهزية المحتوى بدل اختراع إنجازات للغات غير المنفذة.

#### Courses

- **Classification:** Essential. **Purpose:** Canonical course/path, independent of a local admin draft or hardcoded source file.
- **Important columns:** CourseId; LanguageId; Slug (unique); Title; Description; PublicationStatus; CreatedByUserId?; CreatedAtUtc; ContentVersion.
- **PK:** CourseId. **FKs:** LanguageId → Languages.LanguageId; CreatedByUserId → Users.UserId.
- **Relationships / uniqueness:** Language 1 → many courses; course 1 → many ordered levels and enrollments.
- **سبب الحاجة والتصميم:** يمثل المسار التعليمي نفسه؛ المسودة حالة للكورس وليست جدول كورسات آخر، ولا نكرر اسم اللغة لأن العلاقة توفره.

#### Levels

- **Classification:** Essential. **Purpose:** Ordered stages within a course, with the current linear progression model.
- **Important columns:** LevelId; CourseId; Title; Description; SortOrder; PublicationStatus; CreatedAtUtc.
- **PK:** LevelId. **FKs:** CourseId → Courses.CourseId.
- **Relationships / uniqueness:** Course 1 → many levels; level 1 → many lessons/objectives/tasks. Unique (CourseId, SortOrder).
- **سبب الحاجة والتصميم:** كل مستوى يتبع كورسًا واحدًا؛ ترتيب المستويات يكفي للتدرج الحالي ولا نحتاج شبكة متطلبات سابقة معقدة.

#### LevelObjectives

- **Classification:** Essential. **Purpose:** Ordered, separately validated learning objectives from the admin level form.
- **Important columns:** LevelId; ObjectiveNo; ObjectiveText.
- **PK:** (LevelId, ObjectiveNo). **FKs:** LevelId → Levels.LevelId.
- **Relationships / uniqueness:** Level 1 → many atomic objective rows.
- **سبب الحاجة والتصميم:** نموذج الأدمن يقبل قائمة أهداف؛ تخزين كل هدف في صف مستقل يحقق 1NF ويسمح بترتيبه دون قائمة داخل عمود.

#### Topics

- **Classification:** Essential. **Purpose:** Stable teaching concepts and optional broader topic groups.
- **Important columns:** TopicId; LanguageId; ParentTopicId?; Code; Name.
- **PK:** TopicId. **FKs:** LanguageId → Languages.LanguageId; ParentTopicId → Topics.TopicId.
- **Relationships / uniqueness:** Topic 1 → many lessons/questions and child topics; many tasks through CodingTaskTopics. Unique (LanguageId, Code).
- **سبب الحاجة والتصميم:** الموضوع موجود بالفعل في أسئلة تحديد المستوى وربط التمارين بالدروس؛ معرّف ثابت يزيل الاعتماد على ترتيب السؤال أو تشابه النصوص.

#### Lessons

- **Classification:** Essential. **Purpose:** Lesson explanation and demonstration content, not learner completion.
- **Important columns:** LessonId; LevelId; TopicId; Slug; Title; Summary; Body; ExampleCode; PreparedOutput; EstimatedMinutes; SortOrder; PublicationStatus; UpdatedAtUtc.
- **PK:** LessonId. **FKs:** LevelId → Levels.LevelId; TopicId → Topics.TopicId.
- **Relationships / uniqueness:** Level 1 → many lessons; topic 1 → many lessons; lesson 1 → many resources/completions. Unique (LevelId, Slug) and (LevelId, SortOrder).
- **سبب الحاجة والتصميم:** نفصل المحتوى عن تقدّم الطالب؛ المدة تقديرية وليست وقتًا قيس فعلًا. معاينة درس محلي لا تعني إكماله أو اجتياز اختباره.

#### LessonResources

- **Classification:** Essential. **Purpose:** Ordered external videos/documentation; kept separate from lesson body.
- **Important columns:** ResourceId; LessonId; Title; Url; ResourceType; ResourceLanguage?; SortOrder.
- **PK:** ResourceId. **FKs:** LessonId → Lessons.LessonId.
- **Relationships / uniqueness:** Lesson 1 → many resources.
- **سبب الحاجة والتصميم:** الدرس قد يملك أكثر من فيديو أو مرجع؛ روابط المصادر بيانات محتوى ولا تحتاج ملفات الفيديو الخارجية أو سجل مشاهدة وهميًا.


### C — Assessments and answer evidence — Essential

#### Assessments

- **Classification:** Essential. **Purpose:** One immutable version of a placement test, level quiz, or lesson knowledge check.
- **Important columns:** AssessmentId; LogicalCode; VersionNo; Kind; ScopeCourseId?; ScopeLevelId?; ScopeLessonId?; Title; PassPercent?; PublicationStatus.
- **PK:** AssessmentId. **FKs:** ScopeCourseId → Courses.CourseId; ScopeLevelId → Levels.LevelId; ScopeLessonId → Lessons.LessonId.
- **Relationships / uniqueness:** Exactly one scope is present: course for placement, level for quiz, lesson for check. One version has many questions/attempts.
- **سبب الحاجة والتصميم:** جدول موحد لأنواع الأسئلة الحالية يمنع تكرار تصميم الاختبارات؛ تحديد المستوى للتشخيص ولا نفترض أن له شرط نجاح أو أنه يفتح المستويات.

#### Questions

- **Classification:** Essential. **Purpose:** Question text, optional code, teaching topic, and explanation belonging to an assessment version.
- **Important columns:** QuestionId; AssessmentId; TopicId; Prompt; CodeSnippet?; Explanation?; SortOrder.
- **PK:** QuestionId. **FKs:** AssessmentId → Assessments.AssessmentId; TopicId → Topics.TopicId.
- **Relationships / uniqueness:** Assessment 1 → many questions; topic 1 → many questions; unique (AssessmentId, SortOrder).
- **سبب الحاجة والتصميم:** السؤال وحدة دليل على الفهم؛ ربطه بموضوع صريح يسمح بتحليل الضعف بدل افتراض أن السؤال الثالث يطابق الدرس الثالث.

#### QuestionOptions

- **Classification:** Essential. **Purpose:** Atomic single-choice options and their grading key.
- **Important columns:** OptionId; QuestionId; OptionText; IsCorrect; SortOrder.
- **PK:** OptionId. **FKs:** QuestionId → Questions.QuestionId.
- **Relationships / uniqueness:** Question 1 → many options; unique (QuestionId, SortOrder). Exactly one correct option before publishing.
- **سبب الحاجة والتصميم:** لا نضع الاختيارات في نص مفصول بفواصل؛ كل اختيار صف واضح، ومفتاح التصحيح لا يُرسل إلى واجهة الإنتاج بوصفه نتيجة موثوقة.

#### AssessmentAttempts

- **Classification:** Essential. **Purpose:** Each individual attempt, preserving chronology rather than only the current best result.
- **Important columns:** AttemptId; UserId; AssessmentId; Status; CurrentQuestionNo?; StartedAtUtc?; SubmittedAtUtc?; EvidenceOrigin; ImportedAtUtc?.
- **PK:** AttemptId. **FKs:** UserId → Users.UserId; AssessmentId → Assessments.AssessmentId.
- **Relationships / uniqueness:** User 1 → many attempts; assessment version 1 → many attempts; attempt 1 → many answer rows.
- **سبب الحاجة والتصميم:** يحفظ كل محاولة على حدة حتى نرى التحسن بمرور الزمن؛ لا يمكن اختراع محاولات قديمة من أفضل درجة وآخر درجة فقط.

#### AttemptAnswers

- **Classification:** Essential. **Purpose:** Selected option or explicit unsure response for a particular question in an attempt.
- **Important columns:** AttemptId; QuestionId; OptionId?; ResponseKind (option/unsure); AnsweredAtUtc?.
- **PK:** (AttemptId, QuestionId). **FKs:** AttemptId → AssessmentAttempts.AttemptId; QuestionId → Questions.QuestionId; OptionId → QuestionOptions.OptionId.
- **Relationships / uniqueness:** Attempt/question junction. Missing row means unanswered; unsure is a real response, not a wrong-option ID.
- **سبب الحاجة والتصميم:** يربط المحاولة بالسؤال ويحفظ «لست متأكدًا» دون اختراع اختيار؛ يجب أن يتبع الاختيار للسؤال وأن يتبع السؤال لاختبار المحاولة.


### D — Participation and completion — Essential

#### Enrollments

- **Classification:** Essential. **Purpose:** Explicit student participation in a course for a future server-backed learning workflow.
- **Important columns:** EnrollmentId; StudentId; CourseId; EnrolledAtUtc; ParticipationStatus; EvidenceOrigin.
- **PK:** EnrollmentId. **FKs:** StudentId → Users.UserId; CourseId → Courses.CourseId.
- **Relationships / uniqueness:** Student/course many-to-many junction; unique (StudentId, CourseId).
- **سبب الحاجة والتصميم:** التسجيل غير منفذ حاليًا كعملية مستقلة؛ نقترحه أساسًا للربط بين الطالب والكورس عند الانتقال إلى الخادم، وليس حقيقة نستنتجها من اختيار اللغة.

#### LessonCompletions

- **Classification:** Essential. **Purpose:** First completion of a lesson per enrollment, with its actual basis.
- **Important columns:** EnrollmentId; LessonId; CompletedAtUtc?; CompletionMethod (manual/correct-answer/imported); EvidenceOrigin; ImportedAtUtc?.
- **PK:** (EnrollmentId, LessonId). **FKs:** EnrollmentId → Enrollments.EnrollmentId; LessonId → Lessons.LessonId.
- **Relationships / uniqueness:** Enrollment/lesson junction; the lesson must belong to that enrollment’s course.
- **سبب الحاجة والتصميم:** إكمال الدرس بالزر لا يثبت الإجابة الصحيحة؛ لذلك نحفظ طريقة الإكمال ونترك الإجابات في جدولها، ولا نكرر نسبة التقدم.


### E — Coding, testing, and the Python final project — Essential

#### CodingTasks

- **Classification:** Essential. **Purpose:** An immutable version of a runnable exercise or the task-manager final project.
- **Important columns:** TaskId; LevelId; TaskCode; VersionNo; TaskKind; Title; Description; RequirementsText; StarterCode; SampleInput; SampleOutput; ReferenceSolution; SolutionExplanation; VerificationCode?; SortOrder.
- **PK:** TaskId. **FKs:** LevelId → Levels.LevelId.
- **Relationships / uniqueness:** Level 1 → many tasks; task 1 → many test cases/hints/submissions; many topics through CodingTaskTopics. Unique (TaskCode, VersionNo).
- **سبب الحاجة والتصميم:** المشروع النهائي الحالي تمرين برمجي له اختبارات فعلية؛ لا نكرر تسليمه في جدول مشاريع آخر. المتطلبات نص تعليمي، وليس قائمة كيانات لها علاقات مستقلة.

#### CodingTaskTopics

- **Classification:** Essential. **Purpose:** Explicit multi-concept links used by task review recommendations.
- **Important columns:** TaskId; TopicId.
- **PK:** (TaskId, TopicId). **FKs:** TaskId → CodingTasks.TaskId; TopicId → Topics.TopicId.
- **Relationships / uniqueness:** Tasks/topics many-to-many junction.
- **سبب الحاجة والتصميم:** التمرين الواحد يستخدم أكثر من مفهوم؛ جدول الربط يمنع تكرار بيانات التمرين ويعكس مصفوفة topics الموجودة في learning-support.js.

#### TaskTestCases

- **Classification:** Essential. **Purpose:** Immutable test cases belonging to a task version.
- **Important columns:** TestCaseId; TaskId; CaseNo; InputText; ExpectedOutput; IsPublic.
- **PK:** TestCaseId. **FKs:** TaskId → CodingTasks.TaskId.
- **Relationships / uniqueness:** Task 1 → many cases; unique (TaskId, CaseNo). Current browser cases are visible; private cases are a later server capability.
- **سبب الحاجة والتصميم:** نحتاج فصل حالات الاختبار حتى نعرف أي حالة نُفذت وأيها لم تُنفذ؛ لا نصنف الحالات المتبقية بعد أول فشل بأنها حالات فاشلة.

#### TaskHints

- **Classification:** Essential. **Purpose:** Ordered prepared hints, separate from generated mentor replies.
- **Important columns:** TaskId; HintNo; HintText.
- **PK:** (TaskId, HintNo). **FKs:** TaskId → CodingTasks.TaskId.
- **Relationships / uniqueness:** Task 1 → many ordered hints.
- **سبب الحاجة والتصميم:** التلميحات الحالية مكتوبة مسبقًا وتظهر بالتدريج؛ وجودها لا يعني استخدام نموذج ذكاء اصطناعي.

#### TaskWorkspaceState

- **Classification:** Essential. **Purpose:** Latest mutable draft and local learning-support state, separated from immutable submissions.
- **Important columns:** EnrollmentId; TaskId; DraftCode?; DraftInput?; DraftUpdatedAtUtc?; HintsRevealedCount; HasAttempted; SolutionViewed; StateUpdatedAtUtc.
- **PK:** (EnrollmentId, TaskId). **FKs:** EnrollmentId → Enrollments.EnrollmentId; TaskId → CodingTasks.TaskId.
- **Relationships / uniqueness:** One workspace-state row per enrollment/task version; many submissions stored separately.
- **سبب الحاجة والتصميم:** المسودة تتغير بينما التسليم السابق يجب أن يبقى؛ نحفظ أيضًا حالة كشف التلميحات والحل لأن التطبيق يسجلها بالفعل. هذه حالة حالية وليست سجل أحداث كاملًا.

#### CodeSubmissions

- **Classification:** Essential. **Purpose:** Every checked solution snapshot and evaluation lifecycle.
- **Important columns:** SubmissionId; EnrollmentId; TaskId; CodeText; SubmittedAtUtc?; EvaluationStatus; ExecutionEnvironment; RuntimeVersion?; EvaluatorVersion?; EvidenceOrigin; ImportedAtUtc?.
- **PK:** SubmissionId. **FKs:** EnrollmentId → Enrollments.EnrollmentId; TaskId → CodingTasks.TaskId.
- **Relationships / uniqueness:** Enrollment/task each have many immutable submissions; submission 1 → many case results.
- **سبب الحاجة والتصميم:** يحفظ الكود الذي اختُبر فعلًا؛ المسودة الحالية ليست بديلًا عنه. أحدث محاولة وأحدث محاولة ناجحة استعلامان مختلفان وليسا جدولين.

#### SubmissionTestResults

- **Classification:** Essential. **Purpose:** Actual results for each case that ran in a submission.
- **Important columns:** SubmissionId; TestCaseId; Passed; ActualOutput; ErrorText?; RuntimeMs?; ExecutionStatus.
- **PK:** (SubmissionId, TestCaseId). **FKs:** SubmissionId → CodeSubmissions.SubmissionId; TestCaseId → TaskTestCases.TestCaseId.
- **Relationships / uniqueness:** Submission/case junction; case must belong to submission’s task version.
- **سبب الحاجة والتصميم:** نخزن المخرجات والخطأ للحالات المنفذة فقط؛ زمن التنفيذ المقترح يبدأ جمعه لاحقًا ولا يمكن استعادته من السجل الحالي.


### F — Optional administration and certificates — Optional

#### AccountStatusHistory

- **Classification:** Optional. **Purpose:** Audit student enable/suspend/restore actions when server administration is added.
- **Important columns:** ChangeId; StudentId; ActorAdminId; OldStatus; NewStatus; Reason?; ChangedAtUtc.
- **PK:** ChangeId. **FKs:** StudentId → Users.UserId; ActorAdminId → Users.UserId.
- **Relationships / uniqueness:** User 1 → many status changes; actor 1 → many actions.
- **سبب الحاجة والتصميم:** الحالة الحالية موجودة، لكن تاريخ تغييرات الأدمن غير موجود؛ هذا امتداد تدقيق مبرر لا شرط لتشغيل التعلم الأساسي.

#### Certificates

- **Classification:** Optional. **Purpose:** An issuance record only if persistent or verifiable certificate issuance is approved.
- **Important columns:** CertificateId; EnrollmentId; PublicCode (unique); IssuedAtUtc; Status; PolicyVersion; RecipientNameSnapshot; CompletionEvidenceAsOfUtc.
- **PK:** CertificateId. **FKs:** EnrollmentId → Enrollments.EnrollmentId.
- **Relationships / uniqueness:** Enrollment 1 → many historical certificate issues; policy limits active duplicates.
- **سبب الحاجة والتصميم:** الطباعة الحالية لا تنشئ شهادة في قاعدة البيانات؛ نضيف الجدول فقط عند اعتماد إصدار دائم، واسم المستلم وقت الإصدار لقطة تاريخية مقصودة.


### G — Optional public student representation — Optional

#### PublicProfiles

- **Classification:** Optional. **Purpose:** Explicitly consented public display, separate from private account preferences.
- **Important columns:** UserId; PublicDisplayName; Bio; PublicationStatus; ConsentAtUtc?.
- **PK:** UserId (shared PK/FK). **FKs:** UserId → Users.UserId.
- **Relationships / uniqueness:** User 1 → 0..1 public profile; profile has many portfolio items and skill/language links.
- **سبب الحاجة والتصميم:** الملفات العامة الحالية خيالية؛ لا ننشر البريد أو العمر تلقائيًا، واسم العرض العام قد يختلف عن الاسم الخاص.

#### Skills

- **Classification:** Optional. **Purpose:** Reusable public offer/profile tags, separate from assessed learning topics.
- **Important columns:** SkillId; Name (unique).
- **PK:** SkillId. **FKs:** None.
- **Relationships / uniqueness:** Skill has many student/service/mentor-offer associations.
- **سبب الحاجة والتصميم:** مهارة يعلنها صاحب العرض ليست إثبات إتقان من اختبار؛ فصل قاموس المهارات العامة عن Topics يمنع الخلط بين الادعاء والدليل.

#### StudentSkills

- **Classification:** Optional. **Purpose:** Public self-declared skill tags.
- **Important columns:** StudentId; SkillId.
- **PK:** (StudentId, SkillId). **FKs:** StudentId → PublicProfiles.UserId; SkillId → Skills.SkillId.
- **Relationships / uniqueness:** Public profiles/skills many-to-many junction.
- **سبب الحاجة والتصميم:** الطالب يملك عدة مهارات والمهارة تظهر لدى عدة طلاب؛ صف ربط لكل مهارة بدل تكرار الملف.

#### StudentLanguageInterests

- **Classification:** Optional. **Purpose:** Self-declared public learning-language interests from fixture learning arrays.
- **Important columns:** StudentId; LanguageId.
- **PK:** (StudentId, LanguageId). **FKs:** StudentId → PublicProfiles.UserId; LanguageId → Languages.LanguageId.
- **Relationships / uniqueness:** Public profiles/languages many-to-many junction.
- **سبب الحاجة والتصميم:** عبارة «أتعلم Python وC++» اهتمام معلن لا تسجيل مثبت في كورسين؛ لا نستبدلها بسجل Enrollments.

#### PortfolioItems

- **Classification:** Optional. **Purpose:** Public fixture concepts/work links or explicitly selected owner-only project entries.
- **Important columns:** PortfolioItemId; StudentId; Title; Description?; Url?; ProjectDeliveryId?; Visibility; SortOrder.
- **PK:** PortfolioItemId. **FKs:** StudentId → Users.UserId; ProjectDeliveryId → ProjectDeliveries.DeliveryId (optional internship pack).
- **Relationships / uniqueness:** User 1 → many items; optional delivery reference must belong to the same student. Public exposure additionally requires an approved public profile.
- **سبب الحاجة والتصميم:** المعرض العام والمحفظة المحلية ليسا نشرًا واحدًا؛ المرجع للتسليم يمنع نسخ رابط المشروع في أكثر من مكان، ولا يحوّل العرض المحلي إلى نشر عام.


### H — Optional student services — Optional

#### Services

- **Classification:** Optional. **Purpose:** One service listing through draft and any later approved publication lifecycle.
- **Important columns:** ServiceId; ProviderId; LanguageId; Title; Description; Price; CurrencyCode; DeliveryDays; Status; CreatedAtUtc.
- **PK:** ServiceId. **FKs:** ProviderId → Users.UserId; LanguageId → Languages.LanguageId.
- **Relationships / uniqueness:** Student 1 → many services; service 1 → many requests/deliverables and many skills via junction.
- **سبب الحاجة والتصميم:** المسودات والكتالوج يمكن تمثيلهما بكيان خدمة واحد مع حالة؛ السعر تقدير عرض وليس دفعة مالية.

#### ServiceSkills

- **Classification:** Optional. **Purpose:** Filterable service skill tags.
- **Important columns:** ServiceId; SkillId.
- **PK:** (ServiceId, SkillId). **FKs:** ServiceId → Services.ServiceId; SkillId → Skills.SkillId.
- **Relationships / uniqueness:** Services/skills many-to-many junction.
- **سبب الحاجة والتصميم:** نحوّل قائمة المهارات المفصولة بفواصل إلى صفوف ربط قابلة للبحث دون تخزين قائمة داخل عمود.

#### ServiceDeliverables

- **Classification:** Optional. **Purpose:** Ordered promised output descriptions from public service fixtures.
- **Important columns:** ServiceId; ItemNo; Description.
- **PK:** (ServiceId, ItemNo). **FKs:** ServiceId → Services.ServiceId.
- **Relationships / uniqueness:** Service 1 → many deliverables.
- **سبب الحاجة والتصميم:** يفصل عناصر التسليم المتعددة عن بيانات الخدمة؛ لا يعني ذلك وجود رفع ملفات أو تسليم مدفوع منفذ.

#### ServiceRequests

- **Classification:** Optional. **Purpose:** Requester’s saved brief, retaining its simulation or operational origin.
- **Important columns:** RequestId; ServiceId; RequesterId; Brief; Status; Origin; CreatedAtUtc.
- **PK:** RequestId. **FKs:** ServiceId → Services.ServiceId; RequesterId → Users.UserId.
- **Relationships / uniqueness:** Service 1 → many requests; student 1 → many own requests.
- **سبب الحاجة والتصميم:** الطلب الحالي محفوظ محليًا فقط؛ لا نغيّر حالته إلى مرسل أو مدفوع عند نقله دون عملية حقيقية.


### I — Optional peer mentoring — Optional

#### MentorOffers

- **Classification:** Optional. **Purpose:** Peer session listing, not an AI mentor and not an employment record.
- **Important columns:** OfferId; MentorId; LanguageId; Topic; Description; DurationMinutes; Price; CurrencyCode; ApprovalStatus; ApprovedByUserId?.
- **PK:** OfferId. **FKs:** MentorId → Users.UserId; LanguageId → Languages.LanguageId; ApprovedByUserId → Users.UserId.
- **Relationships / uniqueness:** User 1 → many offers; offer has many skills/slots.
- **سبب الحاجة والتصميم:** المرشد النظير طالب يقدم عرضًا؛ لا يحتاج دور حساب جديد. الاعتماد التجريبي في الكود ليس اعتماد أدمن حقيقيًا.

#### MentorOfferSkills

- **Classification:** Optional. **Purpose:** Filterable skills advertised by peer mentor offers.
- **Important columns:** OfferId; SkillId.
- **PK:** (OfferId, SkillId). **FKs:** OfferId → MentorOffers.OfferId; SkillId → Skills.SkillId.
- **Relationships / uniqueness:** Offers/skills many-to-many junction.
- **سبب الحاجة والتصميم:** العرض قد يغطي عدة مهارات والمهارة مشتركة بين عروض؛ لا نكرر الوصف والسعر عند إضافة مهارة.

#### MentorSlots

- **Classification:** Optional. **Purpose:** Persistent time windows if genuine calendars are introduced.
- **Important columns:** SlotId; OfferId; StartsAtUtc; EndsAtUtc; AvailabilityStatus.
- **PK:** SlotId. **FKs:** OfferId → MentorOffers.OfferId.
- **Relationships / uniqueness:** Offer 1 → many slots; slot 1 → many booking-request history rows.
- **سبب الحاجة والتصميم:** المواعيد الحالية تُولد من تاريخ المتصفح؛ الجدول مطلوب لتقويم حقيقي لاحقًا، ولا نرحّل المواعيد التوضيحية بوصفها توفرًا مؤكدًا.

#### MentoringBookings

- **Classification:** Optional. **Purpose:** Saved requests for slots, with an explicit simulated/requested/confirmed lifecycle.
- **Important columns:** BookingId; SlotId; StudentId; Notes; Status; Origin; CreatedAtUtc.
- **PK:** BookingId. **FKs:** SlotId → MentorSlots.SlotId; StudentId → Users.UserId.
- **Relationships / uniqueness:** Student 1 → many booking requests; slot has many historical requests but at most one active reservation if confirmed booking is enabled.
- **سبب الحاجة والتصميم:** حفظ طلب لا يعني حجز اجتماع؛ منع الحجز المزدوج العام يحتاج معاملة وقاعدة حالة على الخادم، وليس فحص المالك المحلي الحالي.


### J — Optional virtual internship — Optional

#### Projects

- **Classification:** Optional. **Purpose:** Separate structured briefs such as the C# fictional school-system internship.
- **Important columns:** ProjectId; LanguageId; Code (unique); Title; Brief; TaskBoardEnabled; ScenarioLabel; IsFictional; PublicationStatus.
- **PK:** ProjectId. **FKs:** LanguageId → Languages.LanguageId.
- **Relationships / uniqueness:** Project 1 → many tasks/participations.
- **سبب الحاجة والتصميم:** جدول المشروع هنا للسيناريو المستقل ذي لوحة المهام والرابط؛ لا يعيد تخزين مشروع Python البرمجي الذي يغطيه CodingTasks.

#### ProjectTasks

- **Classification:** Optional. **Purpose:** Ordered requirements/task-board cards for the structured brief.
- **Important columns:** ProjectTaskId; ProjectId; Title; Instructions; SortOrder.
- **PK:** ProjectTaskId. **FKs:** ProjectId → Projects.ProjectId.
- **Relationships / uniqueness:** Project 1 → many task definitions; unique (ProjectId, SortOrder).
- **سبب الحاجة والتصميم:** خمس مهام في التدريب هي تعريفات مشتركة؛ حالة كل طالب تُخزن منفصلة حتى لا يغيّر طالب لوحة الجميع.

#### ProjectParticipations

- **Classification:** Optional. **Purpose:** A student’s participation in a non-coding-workspace project.
- **Important columns:** ParticipationId; StudentId; ProjectId; StartedAtUtc; UpdatedAtUtc.
- **PK:** ParticipationId. **FKs:** StudentId → Users.UserId; ProjectId → Projects.ProjectId.
- **Relationships / uniqueness:** Student/project many-to-many junction; unique (StudentId, ProjectId).
- **سبب الحاجة والتصميم:** يفصل مشاركة الطالب عن وصف المشروع؛ لا يعني البدء التوظيف لدى الشركة الخيالية أو الحصول على شهادة تدريب.

#### ProjectTaskProgress

- **Classification:** Optional. **Purpose:** Self-reported task-board states per participation.
- **Important columns:** ParticipationId; ProjectTaskId; State; UpdatedAtUtc.
- **PK:** (ParticipationId, ProjectTaskId). **FKs:** ParticipationId → ProjectParticipations.ParticipationId; ProjectTaskId → ProjectTasks.ProjectTaskId.
- **Relationships / uniqueness:** Participation/task junction; task must belong to participation’s project.
- **سبب الحاجة والتصميم:** حالة Done تصريح من الطالب وليست نتيجة اختبار؛ تُقبل الحالات To Do وIn Progress وDone مع منع ربط مهمة بمشروع مختلف.

#### ProjectDeliveries

- **Classification:** Optional. **Purpose:** Saved repository link and notes, optionally retaining revisions after approval.
- **Important columns:** DeliveryId; ParticipationId; RepositoryUrl; Notes?; SavedAtUtc; EvidenceStatus.
- **PK:** DeliveryId. **FKs:** ParticipationId → ProjectParticipations.ParticipationId.
- **Relationships / uniqueness:** Participation 1 → many saved link revisions; current frontend retains only the latest.
- **سبب الحاجة والتصميم:** يحفظ رابط GitHub وملاحظات الطالب دون الادعاء بقراءة المستودع أو تقييمه؛ تاريخ النسخ الجديد اقتراح لا بيانات موجودة.


### K — Optional mentor-history persistence — Optional

#### MentorConversations

- **Classification:** Optional. **Purpose:** Owned conversation context; useful even for the existing prepared-response mentor.
- **Important columns:** ConversationId; StudentId; LessonId?; TaskId?; Mode; CreatedAtUtc?; ImportedAtUtc?.
- **PK:** ConversationId. **FKs:** StudentId → Users.UserId; LessonId → Lessons.LessonId; TaskId → CodingTasks.TaskId.
- **Relationships / uniqueness:** Student 1 → many conversations; at most one lesson/task context, neither means general. Conversation 1 → many messages.
- **سبب الحاجة والتصميم:** تاريخ المحادثة موجود محليًا، لذا تخزينه ليس ادعاء بوجود AI؛ نضع Mode يوضح أن الردود مكتوبة مسبقًا.

#### MentorMessages

- **Classification:** Optional. **Purpose:** Ordered messages and their true origin.
- **Important columns:** ConversationId; MessageNo; SenderRole; MessageText; SentAtUtc?; ResponseSource.
- **PK:** (ConversationId, MessageNo). **FKs:** ConversationId → MentorConversations.ConversationId.
- **Relationships / uniqueness:** Conversation 1 → many ordered messages. Current stored messages have no timestamp; retain null rather than fabricating one.
- **سبب الحاجة والتصميم:** الترتيب معلوم لكن الزمن القديم غير مسجل؛ نفصل الرسائل عن رأس المحادثة ولا نضع مئة رسالة في عمود واحد.


### L — Optional analytics instrumentation — Optional

#### LearningEvents

- **Classification:** Optional. **Purpose:** Append-only, explicitly instrumented behavior observations; not a mirror of UI redraw events.
- **Important columns:** EventId; UserId; EnrollmentId?; LessonId?; TaskId?; EventType; OccurredAtUtc; ReceivedAtUtc; ClientEventId (unique); SchemaVersion; EventSource; ActiveDurationMs?.
- **PK:** EventId. **FKs:** UserId → Users.UserId; EnrollmentId → Enrollments.EnrollmentId; LessonId → Lessons.LessonId; TaskId → CodingTasks.TaskId.
- **Relationships / uniqueness:** User 1 → many events; optional subject links require context consistency.
- **سبب الحاجة والتصميم:** لا يوجد سجل نقرات أو زمن تعلم حاليًا؛ نضيفه فقط عند تعريف أحداث لها هدف تحليلي وموافقة جمع مناسبة، ولا نحسب مدة التعلم من مجرد فتح الصفحة.


### M — Future AI artifacts only — Future AI

#### ModelVersions

- **Classification:** Future AI. **Purpose:** Model lineage after a real training/evaluation process exists.
- **Important columns:** ModelVersionId; ModelName; Version; TargetDefinition; FeatureSchemaVersion; TrainingCutoffUtc; ArtifactUri; MetricsReference; DeploymentStatus.
- **PK:** ModelVersionId. **FKs:** None.
- **Relationships / uniqueness:** Model version 1 → many predictions and model-based recommendations/annotations; unique (ModelName, Version).
- **سبب الحاجة والتصميم:** لا يُملأ قبل تدريب وتقييم فعليين؛ أوزان النموذج وبيانات التدريب الكبيرة تبقى في تخزين ملفات مناسب لا داخل صفوف التعلّم.

#### StudentPredictions

- **Classification:** Future AI. **Purpose:** Historical, as-of model outputs for a defined learning target.
- **Important columns:** PredictionId; ModelVersionId; StudentId; CourseId; AsOfUtc; TargetCode; HorizonDays; PredictionValue; FeatureSnapshotRef.
- **PK:** PredictionId. **FKs:** ModelVersionId → ModelVersions.ModelVersionId; StudentId → Users.UserId; CourseId → Courses.CourseId.
- **Relationships / uniqueness:** Student/course/model each have many time-stamped predictions.
- **سبب الحاجة والتصميم:** التوقع نتيجة احتمالية مرتبطة بنسخة نموذج وزمن وهدف، وليس حقيقة عن الطالب أو بديلًا عن درجة الاختبار.

#### LearningRecommendations

- **Classification:** Future AI. **Purpose:** Persisted recommendation decisions when evaluation of recommendations becomes necessary.
- **Important columns:** RecommendationId; StudentId; ModelVersionId?; RuleVersion?; LessonId?; TaskId?; GeneratedAtUtc; Rank; Score?; Reason.
- **PK:** RecommendationId. **FKs:** StudentId → Users.UserId; ModelVersionId → ModelVersions.ModelVersionId; LessonId → Lessons.LessonId; TaskId → CodingTasks.TaskId.
- **Relationships / uniqueness:** User has many recommendation decisions; exactly one content target. ModelVersionId or RuleVersion records the generator.
- **سبب الحاجة والتصميم:** التوصيات الحالية يمكن حسابها بالقواعد دون جدول؛ نضيف سجل القرارات مستقبلًا لقياس عرض التوصية والتفاعل معها، مع تمييز القاعدة عن النموذج.

#### ProgrammingErrorAnnotations

- **Classification:** Future AI. **Purpose:** Versioned human/rule/model labels over actual coding evidence.
- **Important columns:** AnnotationId; SubmissionId; TestCaseId?; CategoryCode; Method; ModelVersionId?; AnnotatorUserId?; LabeledAtUtc; Confidence?; LabelPolicyVersion.
- **PK:** AnnotationId. **FKs:** SubmissionId → CodeSubmissions.SubmissionId; (SubmissionId, TestCaseId) → SubmissionTestResults composite key when TestCaseId is present; ModelVersionId → ModelVersions.ModelVersionId; AnnotatorUserId → Users.UserId.
- **Relationships / uniqueness:** Submission/case can receive many labeled revisions; model/reviewer are optional according to Method.
- **سبب الحاجة والتصميم:** الخطأ الخام موجود، أما تصنيفه إلى syntax/runtime/logic أو غيره فليس منفذًا؛ نحتاج مصدر الوسم ونسخة السياسة ومراجعته قبل التدريب.


### Extension boundaries and prerequisites

- F can use the core alone. Certificates must be enabled only after choosing its issuance/eligibility evidence policy; a historical recipient-name snapshot is deliberate document preservation, not an ordinary repeated user name.
- G uses core Users/Languages. StudentSkills and StudentLanguageInterests require PublicProfiles; Skills is a public tag dictionary. PortfolioItems belongs directly to Users, so owner-only portfolio entries do not require a public profile. PortfolioItems.ProjectDeliveryId is included only if J is enabled; otherwise omit that column/FK entirely. Do not create an empty dependency on an unapproved extension.
- H and I use core Users/Languages plus G’s Skills dictionary for their respective junctions. Publishing a provider’s private identity still requires a deliberate public-profile policy. MentorSlots and confirmed reservation constraints are needed only for genuine calendar operation; to store current simulations alone, keep their illustrative instant and simulation origin as request data rather than manufacturing available-calendar records. Do not implement the calendar pack until that choice is approved.
- J uses core Users/Languages, independently of enrollments, since the fictional C# project has no assessed course dependency. A local portfolio entry can reference a delivery without copying it. If only J’s private display is enabled, use an explicit owner-only portfolio representation and do not activate public publication implicitly. No duplicate Python task-manager row belongs in Projects.
- K uses Users and optional lesson/task context, independently of model tables. It can retain prepared-response histories without Future AI. Adding live AI requires an actual service, generation provenance, permissions and retention policy, not just a new table name.
- L requires a defined event contract and collection implementation. It is not necessary to compute current completion/quiz summaries. M depends on actual verified training/evaluation workflows; it should not be populated with invented predictions. Rule recommendation logs could be adopted without a trained model by omitting the optional model FK and recording RuleVersion; this does not make them ML.

### Cardinalities, cross-table integrity and status rules

| Relationship | Cardinality / invariant |
| --- | --- |
| Users → StudentProfiles; Users → PublicProfiles (optional pack) | 1 to 0..1, shared PK; require profile owners to be students. A PK/FK alone does not validate the user’s role. |
| Language → Course → Level → Lesson | Each child has exactly one parent; parents may have zero children while drafts. Published content must meet its readiness rules. |
| Users ↔ Courses | Many-to-many through Enrollments; prevent duplicate student-course rows. Placement may precede enrollment. |
| Enrollment ↔ Lessons / CodingTasks | Completion/workspace-state junctions use composite keys; submissions are repeatable facts. Every item must resolve to the same course as its enrollment. |
| Assessment → Question → Option | One-to-many at each step, fixed version once attempted. Exactly one correct option before single-choice assessment publication. |
| User → AssessmentAttempt → AttemptAnswer | Attempts repeat; one answer per question per attempt. Option must belong to question, and question must belong to attempted assessment version. |
| CodingTask ↔ Topic | Many-to-many through CodingTaskTopics; no repeating topic columns. |
| Task → TestCase; Submission ↔ TestCase | Test is version-specific. Each executed result references the submitting task’s test definition. Missing result is not-run/unknown, not automatically failed. |
| PublicProfile/Service/MentorOffer ↔ Skill | Separate junctions StudentSkills, ServiceSkills and MentorOfferSkills; public claims remain separate from assessed Topics. |
| User ↔ Project (optional) | ProjectParticipations junction; ProjectTaskProgress links participation to tasks of that same project. |
| MentorOffer → Slot → Booking (optional) | Time windows have positive duration; overlapping mentor availability and active reservations require transactional enforcement across offers. Current per-owner duplicate request checks are insufficient. |

Single-column FKs alone **cannot** enforce the matching-parent rules above. Phase 3 must explicitly select composite candidate keys/FKs or set-based write validation (procedures plus multirow-safe triggers where direct writes are allowed). Keep ownership/authorization in the backend as well. No claim is made that these rules already exist in a database.

Proposed integrity policy for review:

- Canonical email comparison, unique stable slugs/codes and parent-scoped ordering. Store user-facing Unicode text; use UTC event times. The exact SQL Server types/indexes remain a Phase 3 deliverable.
- Separate publication statuses from participation statuses, evaluation statuses and self-reported board states. Use constrained small codes rather than a universal Status table with unrelated meanings. A draft course and a published local lesson currently can coexist; the backend publication rule needs approval rather than blind fixture copying.
- Assessments: kind and exactly-one scope must agree. Placement has no fabricated pass requirement; level quiz pass mark is 70 for current Python content. Draft attempts allow missing answers; submitted attempts require complete responses; submitted answers/versioned grading keys become immutable.
- Coding: evaluation state distinguishes pending/running/completed/error/cancelled. A completed evaluation can contain a failed case. All tests passing under a specified environment is the definition of a passed submission; imported browser data remains unverified. Expected test count is derived from task definitions, executed count from results, best/latest from submissions.
- Published assessed questions/task tests used by submissions are frozen; edit by creating a new assessed version. Courses.ContentVersion is an optimistic version marker, not a claim to a complete historical course edition store. Full curriculum-edition snapshots are deferred unless historical certificate policy requires them.
- Archive/disable referenced accounts/content as the default lifecycle; do not cascade-delete achievement or conversation history without a separate retention decision. Role requirements for administrators and student owners need explicit server validation.
- Optional services preserve draft/simulation provenance. Optional calendar confirmation must be atomic and prevent double reservation, including two offers by the same mentor. Simulated approval is not a real approval timestamp/actor.
- URLs require application-level parsing/validation and publication policy; a SQL FK or nonempty-string check cannot verify GitHub ownership, video validity, scheduling availability or remote delivery.

### Derived information and deliberate denormalization

Compute progress counts/percentage, current available level, latest/best quiz score, latest passing code, task completion, topic correctness rates, weakness rankings, report content and certificate eligibility from canonical facts. Do not persist independent editable copies of those totals. Current student activity lists are projections of known facts, not a comprehensive behavior log; real engagement/attendance requires L.

Known seed fixtures must be clearly labeled non-production. Browser-imported completions may lack answer evidence and timestamps; retain that uncertainty. A historical certificate recipient-name snapshot is justified denormalization of an issued artifact. Cached analytics would be a later performance choice with refresh/source rules, not part of the core. No materialized ML feature store, vector database or dashboard snapshot table is warranted yet.

Import mapping is not being implemented in Phase 2. Retain the original backup outside canonical facts. A score-only import without answers is an unverified aggregate claim, not enough to create an AssessmentAttempt with fabricated answers; similarly a passed task ID without checked code/results cannot create a passing CodeSubmission. Keep those claims in the retained legacy source until a separate migration policy is approved. Complete attempts/submissions can be imported with their actual evidence and origin, and a lesson-only claim can be recorded only as imported/manual completion, never a correct-answer event. Do not construct two historical quiz attempts from a best score and a last score whose separate dates are unknown.

## 6. Data Science and AI readiness

| Future objective | Evidence available in current source | Preserve in a future core now | New data / work required later |
| --- | --- | --- | --- |
| Predict student performance | Latest checks, best/latest quizzes, latest task result/passing code and some timestamps; a few fictional admin activity labels | Every new attempt/answer and code submission, task/assessment versions, topic links, true timestamps, provenance, actual test outcomes | Define target and prediction horizon, sufficient real consenting learners, longitudinal outcomes, model lineage and evaluation. No defensible model can be trained from the three/four fixture people. |
| Personalized recommendations | reviewPlan with fixed weights, available-level filter and topic links; placement weakest-topic suggestions | Evidence driving the rule and explicit Topics links; preferences for learner-stated goals | Log which recommendation was shown, alternatives/rank, click/follow-through and subsequent outcomes if evaluating policy. Model-based ranking is separate future work. |
| Weakness detection | Wrong/unsure placement answers, latest checks/quiz answers and task-topic failing tests | Full per-question responses and executed case results, mapped to teaching concepts; separate unsure from wrong | Repeated observations per concept, content difficulty/bias review, calibrated mastery estimates. Latest wrong result alone is limited evidence, not a diagnosis. |
| Learning analytics/behavior | Completion IDs and selected result timestamps; UI CustomEvents trigger refreshes but are not a persisted event log | Event occurrence times for actual facts, enrollment association, assessment/submission history | Opt-in scoped LearningEvents for content open/active interval/help reveal/run/stop etc.; deduplication and schema version. Time-on-task needs active-duration instrumentation, not subtracting unrelated timestamps. |
| Programming error analysis | Actual output/error strings for executed submitted cases; ad hoc run errors and timeout events may not persist | Raw bounded error/output, submission code or controlled reference, task version, execution environment and evaluator version; keep missing result semantics | Taxonomy, reviewed labels, runtime/timeout capture, label origin/version/reviewer, annotated datasets and held-out validation. No current classifier. |
| AI mentor interaction history | Working prepared chat; owner/context/role/text/order, latest 100 messages; no model calls or timestamps | Optional K for owned conversations, ordered messages, prepared-response marker; collect genuine timestamps only on new messages | Real model integration, request/generation IDs, provider/model/prompt versions, context actually sent, latency/token/cost metadata where necessary, feedback and retention rules. Do not claim displayed draft was sent/analyzed today. |

Store now means **include in the approved future schema and collect when implementation is authorized**, not collect data during this analysis. Essential facts: stable account/content identifiers, immutable question/test versions, per-attempt response history, actual execution evidence and provenance. These are useful without ML. Optional instrumentation: exact reading duration, clicks, per-hint event history, recommendation impressions and mentor ratings. Future artifacts: model versions, predictions, recommendation decision logs, and labeled errors; these four logical tables need not exist in Phase 3.

### Collection quality and model evaluation requirements

1. Record event occurrence, receive/import time, evidence source and content/evaluator version separately. Never invent StartedAt or CompletedAt from a file modification time. New server-origin records can require timestamps; legacy unknowns remain explicit.
2. Preserve all future attempts; the current best-score/current-state object cannot reconstruct a learning trajectory. Do not fabricate missed attempts, per-question durations, hint events or past code revisions. Ad hoc runs need separate event capture if they will be analytical inputs.
3. Define an as-of prediction example: predict whether an enrolled student passes a specified next level within a specified horizon using only evidence available before AsOfUtc. Later scores, future completions and certificate issuance are labels/outcomes, not contemporaneous features. Distinguish pending follow-up from genuine failure.
4. Split evaluation by learner and time, prevent data leakage from repeated attempts/shared solutions, evaluate against simple baselines, and report calibration/error by relevant groups only with adequate data. A rule review plan is the current baseline, not a trained model. Assess intervention effects separately from correlation.
5. Age/identity fields are not automatically useful ML features. Minimize direct identifiers in analytical exports, use pseudonymous student keys, keep raw code/chat private, restrict retention and publication, and obtain approval for any new telemetry. Self-reported internship states and copied/reference solutions must not be mislabeled as independent mastery evidence.
6. No chat feedback, employer ratings, financial transaction history, confirmed attendance, reliable active-learning minutes, or trained error labels currently exist. These cannot be reverse-engineered from static fixture prices, sample reviews or UI headings.

## 7. Arabic academic review — شرح للمناقشة

### الفكرة الأساسية وحدود التنفيذ

المشروع الحالي واجهة تعليمية ثابتة فيها وظائف محلية حقيقية؛ الطالب يستطيع قراءة دروس Python، حل أسئلة قصيرة، تشغيل كود Python داخل المتصفح، حفظ المسودات ونتائج الاختبارات، ثم طباعة شهادة اعتمادًا على سجله المحلي. لكن ذلك لا يعني أن الواجهة متصلة بـSQL Server أو أن التسجيل والدفع والحجز والذكاء الاصطناعي أصبحت خدمات حقيقية. التقرير يقترح تصميمًا منطقيًا فقط؛ لا توجد قاعدة جديدة أو سكربت SQL في هذه المرحلة.

صنّفنا الجداول إلى Essential للتعلم الأساسي، وOptional لامتدادات يمكن اعتمادها منفصلة، وFuture AI لنتائج أنظمة ذكية لم تُبنَ بعد. عدد الجداول نتيجة للعلاقات والبيانات المطلوبة، وليس هدفًا أكاديميًا بحد ذاته. لا نطلب إنشاء جميع جداول الخدمات والتدريب والنماذج الآن.

### كيف تدعم الجداول رحلة الطالب؟

نبدأ من Users لحفظ هوية واحدة للحساب. StudentProfiles يحفظ تفضيلات الطالب بعلاقة واحد إلى واحد، بينما Languages وCourses وLevels وLessons تمثل المحتوى من اللغة حتى الدرس. قوائم الأهداف والمراجع تُفصل في LevelObjectives وLessonResources لأنها عناصر متعددة وليست قيمة واحدة.

Enrollments يربط الطالب بالكورس. هذه عملية خادم مقترحة؛ التطبيق الحالي يختار لغة فقط ولا يملك تسجيل كورسات مستقلًا. عند التطبيق، لكل تسجيل سجل إكمال للدروس عبر LessonCompletions. طريقة الإكمال مهمة: الضغط على «إكمال» يختلف عن الإجابة الصحيحة؛ لذلك لا نستنتج إتقان الطالب من زر فقط.

نستخدم Assessments لكل من تحديد المستوى واختبار المستوى وسؤال الدرس، ونربط الأسئلة والخيارات والمحاولات والإجابات. تحديد المستوى تشخيص اختياري ولا يفتح مستوى متقدمًا آليًا في الكود الحالي. تُحسب النتيجة وأفضل محاولة من الإجابات، بدل حفظ درجات متعددة قابلة للتناقض. نحفظ «لست متأكدًا» بوصفها إجابة لها معنى تحليلي مستقل عن الاختيار الخطأ.

CodingTasks يعرف التمرين واختباراته وتلميحاته. TaskWorkspaceState يحتفظ بالمسودة الحالية وحالة الدعم. CodeSubmissions يحتفظ بنسخة الكود التي اختُبرت فعلًا، وSubmissionTestResults يحتفظ بما حدث في كل حالة نُفذت. لو تغيّر الكود في المحرر، لا نبدل كود التسليم السابق. ولو توقف الاختبار عند أول فشل، لا نعتبر الحالات المتبقية فاشلة لأنها لم تُنفذ أصلًا.

مشروع Python النهائي هو task-manager داخل نفس نظام التمارين؛ إنشاء نظام تسليم مشاريع آخر له سيكرر الحقيقة. أما تدريب C# الافتراضي فله لوحة مهام ورابط مستودع مستقلان، ولذلك نقترح له حزمة اختيارية منفصلة. المهام Done هناك تصريح من الطالب، والمراجعة المعروضة نموذج ثابت؛ لا توجد قراءة لمستودع GitHub أو درجة من شركة حقيقية.

### لماذا نحتاج جداول ربط many-to-many؟

الطالب يدرس عدة كورسات والكورس يضم عدة طلاب: Enrollments. التمرين يغطي عدة مواضيع والموضوع يظهر في عدة تمارين: CodingTaskTopics. السؤال يظهر عبر محاولات طلاب كثيرة والمحاولة تحتوي أسئلة كثيرة: AttemptAnswers مع قيد يضمن تبعية السؤال للاختبار الصحيح. التسجيل يشمل دروسًا متعددة والدرس يكتمل لدى طلاب متعددين: LessonCompletions. التسليم يشغّل عدة حالات والحالة تُستخدم في تسليمات عديدة: SubmissionTestResults.

في الحزم الاختيارية نحتاج StudentSkills وStudentLanguageInterests وServiceSkills وMentorOfferSkills، وكذلك ProjectParticipations وProjectTaskProgress. وجود مفتاح مركب يمنع تكرار العلاقة نفسها. قد نستخدم معرّفًا مستقلًا مثل EnrollmentId لأن المحاولات والتسليمات تحتاج الرجوع إلى التسجيل، مع إبقاء قيد فريد على الطالب والكورس.

### التطبيع 1NF ثم 2NF ثم 3NF

**1NF:** لا نخزن خيارات السؤال أو أهداف المستوى أو مهارات الخدمة أو نتائج الحالات في قائمة مفصولة بفواصل. كل عنصر له صف واضح. نص شرح الدرس أو الكود أو الملاحظات قيمة نصية واحدة لغرض العرض، وليس بديلًا عن قائمة علاقات نحتاج البحث فيها.

**2NF:** في CodingTaskTopics المفتاح هو TaskId مع TopicId؛ لا نضع عنوان التمرين في جدول الربط لأنه يعتمد على TaskId وحده. وفي نتائج الحالات نخزن مخرجات تلك الحالة لذلك التسليم، وليس وصف حالة الاختبار المشتركة.

**3NF:** الكورس يرتبط بمعرّف اللغة فلا نكرر اسم اللغة داخل كل كورس. التسليم يرتبط بالتسجيل الذي يحدد الطالب والكورس فلا ننسخ اسمهما وبريدهما في كل تسليم. نسبة التقدم والمستوى الحالي وأفضل درجة بيانات مشتقة نحسبها من الحقائق. تكرار اسم المستلم داخل شهادة مُصدرة استثناء تاريخي مقصود حتى لا يغيّر تعديل الاسم شهادة قديمة؛ وهو ضمن حزمة اختيارية لا التصميم الأساسي كله.

المفاتيح الخارجية تمنع الإشارة إلى سجل غير موجود، لكنها لا تكفي وحدها لإثبات أن الاختيار يتبع السؤال نفسه أو أن مهمة التدريب تنتمي إلى مشروع المشاركة. نحتاج في المرحلة الثالثة مفاتيح مركبة مناسبة أو تحققًا داخل معاملات وإجراءات/Triggers صحيحة لعدة صفوف. كذلك وجود StudentProfiles لا يثبت تلقائيًا أن صاحب Users له دور Student؛ يجب فرض قاعدة الدور.

### كيف يستفيد تخصص Data Science and AI؟

الخطوة العلمية الأولى هي حفظ دليل جيد: كل محاولة مع وقتها، كل إجابة مع السؤال وموضوعه ونسخته، كل تسليم كود مع بيئة التنفيذ ونتائجه، ومصدر البيانات. هذه الجداول تسمح بتحليل التحسن والموضوعات المتكررة في الأخطاء قبل تدريب أي نموذج.

التوصيات الحالية قواعد ثابتة: خطأ الدرس يزيد أولوية المراجعة، وخطأ الاختبار أو فشل التمرين يضيف دليلًا آخر. هذا تخصيص بسيط مفيد لكنه ليس Machine Learning. لو أردنا التنبؤ لاحقًا نحدد الهدف والزمن، نجمع بيانات حقيقية كافية، نفصل التدريب عن الاختبار على مستوى الطالب والزمن، ونمنع تسرب الدرجات المستقبلية إلى المدخلات.

LearningEvents اختياري لقياس أحداث معرفة بدقة؛ فتح صفحة لا يثبت مدة تعلم نشطة. المحادثة الحالية محفوظة لكن ردودها مجهزة مسبقًا ولا تحتوي أوقاتًا لكل رسالة. تصنيف الأخطاء يحتاج وسومًا موثوقة ومصدر الوسم ونسخته، وليس مجرد عمود اسمه AI. ModelVersions وStudentPredictions وLearningRecommendations وProgrammingErrorAnnotations جداول مستقبلية لا تعني أن نموذجًا دُرّب أو دُمج.

### إجابات قصيرة للمناقشة

- **لماذا لا يوجد جدول Dashboard؟** لأنه عرض لنتائج استعلامات على حقائق موجودة وليس حقيقة مستقلة.
- **لماذا المسودة غير التسليم؟** لأن المسودة تتغير، بينما نتيجة الاختبار تخص نسخة كود محددة.
- **هل كل طالب أنهى مستوى يصبح مرشدًا؟** لا؛ الاعتماد الحالي تجريبي، والاعتماد الحقيقي سياسة منفصلة.
- **هل طباعة الشهادة إصدار رسمي؟** لا؛ الإصدار القابل للتحقق يحتاج سياسة وجدول إصدار وخدمة تحقق.
- **هل البيانات المستوردة موثوقة؟** هي سجل متصفح قابل للتعديل؛ نحتفظ بمصدرها ولا نرفع درجتها إلى server-verified.
- **هل كل صفحة تحتاج جدولًا؟** لا؛ صفحة تقدم أو تقرير أو معاينة قد تعتمد كليًا على استعلامات، وصفحة مجتمع غير متصلة لا تبرر نظام منشورات.

## 8. Independent design decisions and excluded scope

1. One Users role code is enough for the current Student/Admin split. No Roles/UserRoles hierarchy or separate AdminProfiles table without multi-role requirements. Peer mentor eligibility is an offer approval, not an extra login role.
2. Student preferences, public profiles, graded topics and self-declared public skills have different meanings. Separate them rather than treating a sample public skill as a measured academic outcome.
3. A shared assessment engine covers three existing question flows. Its exactly-one scope avoids redundant CourseId/LevelId/LessonId chains for every row; the course is derivable through the chosen scope. Each published assessed version has its own questions/options so past answers retain meaning.
4. No distinct best-attempt, passing-code or final-Python-project table. The first two are queries over submissions/attempts; the last is a task kind. This differs from simply reproducing a prior design by name/count.
5. No network calendar, financial ledger, external message, employer, certificate verification, trained recommender, attendance, posting or notification tables in the core. A page/price/button is insufficient evidence.
6. Optional project link history and full attempt history add valuable chronology, but only future records can supply it. The current overwriting stores do not contain a hidden history to migrate.
7. Keep native content/source readiness explicit; the other 12 catalog languages do not receive invented quizzes, courses or results. Do not assume similarly named private/admin/public sample records are the same person.
8. This model stays relational and SQL Server oriented without generating a single statement. No production-grade security, privacy, trusted grading or model capability is implied by a schema proposal alone.

## 9. Choices for Phase 3 approval

| Decision | Recommended starting position | Reason / unresolved requirement |
| --- | --- | --- |
| Core size | Approve the 23 Essential tables first | Includes normalized objectives/hints/concepts and historical attempt evidence; avoids buying into every extension. |
| Optional packs | Choose explicitly; default defer F–M | Could include K to retain existing mentor history or J for internship, but those are scope choices, not core dependencies. H/I need public skills; real calendars need an additional confirmed scheduling policy. |
| Enrollment | Create a real enrollment only on an explicit course-start/enroll operation in a later backend | Current language choice is preference only. No new UI is implemented in this analysis. Placement remains available before enrollment. |
| Lesson completion | Preserve manual completion plus correct-answer completion, recording their method | Current application allows both; do not silently require a correct answer for all existing completion. |
| Practice prerequisites | Preserve open practice, retain linear lesson/quiz progression | Existing direct task URLs are accessible; stricter final-project restrictions need a product decision. |
| Trust and import | Start with labeled fictional academic seed data; keep browser-import evidence separate | No browser achievement becomes trusted by automatic migration. Preserve unknown historical timestamps and owner ambiguity. |
| Assessed content changes | Immutable assessment/task versions once attempted | Avoid regrading old answers against an edited answer key or updated test without explicit version control. Broader course-edition history is deferred. |
| Authentication | Backend-authenticated ownership, current single-role model | Demo login/reset stores are not real credential data. A real reset-token table is not proposed from the simulation; choose auth-provider/session design separately. |
| Certificates | Derive eligibility only; defer persistent issuance table | If issuing certificates, decide policy for imported evidence, name snapshots, repeated issuance, revocation and curriculum changes first. |
| Telemetry and AI | Collect essential learning facts; defer behavior instrumentation and models | Define measurement and access/retention before creating a sparse event warehouse or claiming prediction readiness. |

These decisions are recorded for review, not requests to implement them now. No blocking clarification was needed to produce this analysis. Once the core and optional scope are approved, Phase 3 can specify final SQL Server types, constraints, relationship enforcement, indexes and DDL, while retaining the explicit prohibition on modifying the existing CodeMentorAI_Learning database.

## 10. Preservation and verification

The Phase 2 inspection baseline and final hash comparison are retained under .local-backups/sql-phase2-2026-11-04/. Existing frontend files, README, unrelated documentation, the Phase 1 archive, the verified ZIP and restore-check evidence must remain unchanged. The analysis introduces only its report/evidence and Phase 2 audit scripts/results. See [Phase 2 preservation verification](../.local-backups/sql-phase2-2026-11-04/preservation-verification.json) for final counts and file-by-file evidence.

Four inaccessible temporary proposal library directories remain outside inspection: tmp/proposal/python-libs/bin, fontTools, fonttools-4.68.0.dist-info, and share. They are unrelated to the active app and untouched; do not interpret a hash-preservation claim as covering their inaccessible contents. Active source pages/ and js/ were accessible. No SQL/database/model tests or browser regression tests were run because this phase changes no application code and requests analysis only.

## 11. Complete active page review inventory

Every row links to an inspected active page. Dependencies, headings, forms and source notices are additionally recorded in database-phase2-evidence.json. Scripts shared across modules were reviewed as shared behavior, not as new tables per page.

| Page | Functionality established from source |
| --- | --- |
| [index.html](../index.html) | Marketing/navigation and visual effects; contact links are external, no contact-message persistence. |
| [pages/admin/admin-account-access.html](../pages/admin/admin-account-access.html) | Working local confirmation dialog; enabled/suspended fixture overlay, no real access enforcement. |
| [pages/admin/admin-analytics.html](../pages/admin/admin-analytics.html) | Computed sample-student and local-content counts; no genuine platform-wide analytics. |
| [pages/admin/admin-course-content.html](../pages/admin/admin-course-content.html) | Reads sample/local courses and saved draft levels; no server publication. |
| [pages/admin/admin-course-create.html](../pages/admin/admin-course-create.html) | Validated course-draft creation in session-backed cmStorage. |
| [pages/admin/admin-courses.html](../pages/admin/admin-courses.html) | Search/filter over sample courses and local drafts. |
| [pages/admin/admin-dashboard.html](../pages/admin/admin-dashboard.html) | Static admin preview; real statistics and activity explicitly unavailable. |
| [pages/admin/admin-level-content.html](../pages/admin/admin-level-content.html) | Local lesson create/update, preview visibility and resource create/edit/delete; optimistic snapshot check. |
| [pages/admin/admin-level-create.html](../pages/admin/admin-level-create.html) | Validated ordered level draft and objective list; local save only. |
| [pages/admin/admin-student-details.html](../pages/admin/admin-student-details.html) | Reads fictional student identity/path/level/activity and local status overlay. |
| [pages/admin/admin-students.html](../pages/admin/admin-students.html) | Working sample-directory search and enabled/suspended filter. |
| [pages/auth/admin-login.html](../pages/auth/admin-login.html) | Hardcoded sample credential check and redirect; no real admin session or authorization. |
| [pages/auth/change-password.html](../pages/auth/change-password.html) | Input validation only; current password unverified and no password changed. |
| [pages/auth/forgot-password.html](../pages/auth/forgot-password.html) | Local nonce/email reset simulation; no email sent and no account lookup. |
| [pages/auth/login.html](../pages/auth/login.html) | Hardcoded sample student login and locally persisted demo profile; no authentication service. |
| [pages/auth/reset-password.html](../pages/auth/reset-password.html) | Same-tab nonce/expiry/status validation; marks simulation complete without changing credentials. |
| [pages/auth/signup.html](../pages/auth/signup.html) | Validates name/email/age/password; saves only demo identity, no registered account or saved password. |
| [pages/public/course.html](../pages/public/course.html) | Lists locally visible lessons; independent from assessed built-in Python path. |
| [pages/public/demo.html](../pages/public/demo.html) | Static explanation and links to demos; no separate backend module. |
| [pages/public/languages.html](../pages/public/languages.html) | 13-language catalog, only Python has built-in path; can show local content for other languages. |
| [pages/services/community.html](../pages/services/community.html) | Static intended community; Discord invitation absent and no posts/discussions connected. |
| [pages/services/freelance-services.html](../pages/services/freelance-services.html) | Searchable hardcoded listings with sample prices; links to simulations/private drafts. |
| [pages/services/mentoring-details.html](../pages/services/mentoring-details.html) | Generated illustrative future slots and locally saved booking request; no confirmed appointment. |
| [pages/services/peer-mentoring.html](../pages/services/peer-mentoring.html) | Filtered sample-approved mentor offers, not real mentor approval workflow. |
| [pages/services/service-details.html](../pages/services/service-details.html) | Hardcoded listing/deliverables and saved private brief; no sending/payment/delivery. |
| [pages/services/service-draft.html](../pages/services/service-draft.html) | Validated private service drafts; no publish/edit/order pipeline. |
| [pages/services/showcase.html](../pages/services/showcase.html) | Searchable fictional public people, skills, language interests, project concepts. |
| [pages/services/student-public-profile.html](../pages/services/student-public-profile.html) | Read-only fictional public profile/work links; never reads private signup data. |
| [pages/student/certificates.html](../pages/student/certificates.html) | Derived eligibility and browser print/PDF; no issued certificate ID or issuance store. |
| [pages/student/code-review.html](../pages/student/code-review.html) | Saved draft + latest actual browser case results; detects changed draft, no AI review. |
| [pages/student/dashboard.html](../pages/student/dashboard.html) | Derived identity/progress/placement/review priorities/request counts; no independent dashboard record. |
| [pages/student/learning-path.html](../pages/student/learning-path.html) | Computed roadmap and navigation locks from lessons plus best quiz scores. |
| [pages/student/learning-report.html](../pages/student/learning-report.html) | Derived printable profile/progress summary; not a stored report or official credential. |
| [pages/student/lesson.html](../pages/student/lesson.html) | Built-in content/check/manual completion OR namespaced local preview with progress disabled. |
| [pages/student/level-assessment.html](../pages/student/level-assessment.html) | Four local questions per level, lessons gate, 70% pass, preserves best/latest result. |
| [pages/student/local-portfolio.html](../pages/student/local-portfolio.html) | Private self-reported internship link shown only after explicit local inclusion; no public publishing. |
| [pages/student/mentor.html](../pages/student/mentor.html) | Working chat UI, owned session-stored messages, keyword-matched prepared replies. |
| [pages/student/module.html](../pages/student/module.html) | Computed level lessons/tasks and quiz availability; no independent module entity beyond Level. |
| [pages/student/onboarding.html](../pages/student/onboarding.html) | Validated language/experience/goal preferences, Python placement or language availability routing. |
| [pages/student/placement-intro.html](../pages/student/placement-intro.html) | Optional Python placement; creates/resumes one saved attempt and blocks duplicate submitted start. |
| [pages/student/placement-question.html](../pages/student/placement-question.html) | Ten prepared questions, saved navigation/answers, explicit unsure response. |
| [pages/student/placement-results.html](../pages/student/placement-results.html) | Derived correct/unsure/topic counts from submitted answers; no code execution or level placement. |
| [pages/student/placement-review.html](../pages/student/placement-review.html) | Working answer review/edit and confirmation before local submission. |
| [pages/student/practice.html](../pages/student/practice.html) | Six tasks with search/topic/status filters; status from completion and draft records. |
| [pages/student/profile.html](../pages/student/profile.html) | Edits private display name and preferences; email read-only, no public-profile editor. |
| [pages/student/progress.html](../pages/student/progress.html) | Computed current-level completion/activity list and learning JSON export/import. |
| [pages/student/project-evaluation.html](../pages/student/project-evaluation.html) | Redirects old bookmark to task-manager code-review; no separate evaluation subsystem. |
| [pages/student/project.html](../pages/student/project.html) | Python final-task brief and progress-aware navigation to task-manager workspace. |
| [pages/student/requests.html](../pages/student/requests.html) | Owner-filtered local service/booking request history; neither sent nor confirmed. |
| [pages/student/skill-analysis.html](../pages/student/skill-analysis.html) | Deterministic placement topic correctness/unsure analysis; no trained model. |
| [pages/student/virtual-internship.html](../pages/student/virtual-internship.html) | C# fictional brief, five self-reported task states, GitHub link/notes and local inclusion; fixed sample review. |
| [pages/student/workspace.html](../pages/student/workspace.html) | Six executable Python tasks; autosaved draft, run/stop, first-failure test loop, passing-code download. |

## 12. JavaScript coverage inventory

All 68 JavaScript files were read by the static audit. Function names and storage/network/execution signals are preserved in the evidence file. Source usage below lists direct HTML imports only, then explains the dynamic exceptions; import count is not a functionality test.

| Script | Direct active-page imports | Primary review category |
| --- | ---: | --- |
| [js/admin-account-access.js](../js/admin-account-access.js) | 1 | Admin sample data, content or UI |
| [js/admin-analytics.js](../js/admin-analytics.js) | 1 | Admin sample data, content or UI |
| [js/admin-course-content.js](../js/admin-course-content.js) | 1 | Admin sample data, content or UI |
| [js/admin-course-create.js](../js/admin-course-create.js) | 1 | Admin sample data, content or UI |
| [js/admin-course-data.js](../js/admin-course-data.js) | 8 | Admin sample data, content or UI |
| [js/admin-courses.js](../js/admin-courses.js) | 1 | Admin sample data, content or UI |
| [js/admin-level-content.js](../js/admin-level-content.js) | 1 | Admin sample data, content or UI |
| [js/admin-level-create.js](../js/admin-level-create.js) | 1 | Admin sample data, content or UI |
| [js/admin-student-data.js](../js/admin-student-data.js) | 4 | Admin sample data, content or UI |
| [js/admin-student-details.js](../js/admin-student-details.js) | 1 | Admin sample data, content or UI |
| [js/admin-students.js](../js/admin-students.js) | 1 | Admin sample data, content or UI |
| [js/admin-workspace.js](../js/admin-workspace.js) | 10 | Admin sample data, content or UI |
| [js/auth-video.js](../js/auth-video.js) | 5 | UI/navigation/presentation; inspect storage separately |
| [js/certificates.js](../js/certificates.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/change-password.js](../js/change-password.js) | 1 | Demo identity/preferences/authentication simulation |
| [js/cm-home.js](../js/cm-home.js) | 0 | UI/navigation/presentation; inspect storage separately |
| [js/code-review.js](../js/code-review.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/course-content-store.js](../js/course-content-store.js) | 7 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/dashboard.js](../js/dashboard.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/hero-background.js](../js/hero-background.js) | 1 | UI/navigation/presentation; inspect storage separately |
| [js/home-effects.js](../js/home-effects.js) | 1 | UI/navigation/presentation; inspect storage separately |
| [js/language-catalog.js](../js/language-catalog.js) | 52 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/languages.js](../js/languages.js) | 2 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/learning-backup.js](../js/learning-backup.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/learning-context.js](../js/learning-context.js) | 15 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/learning-path.js](../js/learning-path.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/learning-report.js](../js/learning-report.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/learning-storage.js](../js/learning-storage.js) | 52 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/learning-support.js](../js/learning-support.js) | 2 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/lesson-content.js](../js/lesson-content.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/lesson.js](../js/lesson.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/level-assessment.js](../js/level-assessment.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/level-challenges.js](../js/level-challenges.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/login.js](../js/login.js) | 2 | Demo identity/preferences/authentication simulation |
| [js/main.js](../js/main.js) | 14 | UI/navigation/presentation; inspect storage separately |
| [js/mentor.js](../js/mentor.js) | 1 | Prepared chat and owned message storage |
| [js/module-challenge.js](../js/module-challenge.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/module.js](../js/module.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/onboarding.js](../js/onboarding.js) | 1 | Demo identity/preferences/authentication simulation |
| [js/password-recovery.js](../js/password-recovery.js) | 2 | Demo identity/preferences/authentication simulation |
| [js/placement-data.js](../js/placement-data.js) | 6 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/placement-intro.js](../js/placement-intro.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/placement-question.js](../js/placement-question.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/placement-results.js](../js/placement-results.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/placement-review.js](../js/placement-review.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/practice.js](../js/practice.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/profile.js](../js/profile.js) | 1 | Demo identity/preferences/authentication simulation |
| [js/progress.js](../js/progress.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/project-evaluation.js](../js/project-evaluation.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/project.js](../js/project.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/python-curriculum.js](../js/python-curriculum.js) | 11 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/python-lessons.js](../js/python-lessons.js) | 11 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/python-runner.js](../js/python-runner.js) | 1 | Actual browser Python execution |
| [js/python-worker.js](../js/python-worker.js) | 0 | Actual browser Python execution |
| [js/signup.js](../js/signup.js) | 1 | Demo identity/preferences/authentication simulation |
| [js/skill-analysis.js](../js/skill-analysis.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/student-services-data.js](../js/student-services-data.js) | 9 | Local simulated service/internship workflows |
| [js/student-services-store.js](../js/student-services-store.js) | 12 | Local simulated service/internship workflows |
| [js/student-services.js](../js/student-services.js) | 9 | Local simulated service/internship workflows |
| [js/student-workspace.js](../js/student-workspace.js) | 14 | UI/navigation/presentation; inspect storage separately |
| [js/theme.js](../js/theme.js) | 52 | UI/navigation/presentation; inspect storage separately |
| [js/user-guide.js](../js/user-guide.js) | 0 | UI/navigation/presentation; inspect storage separately |
| [js/virtual-internship-store.js](../js/virtual-internship-store.js) | 2 | Local simulated service/internship workflows |
| [js/virtual-internship.js](../js/virtual-internship.js) | 2 | Local simulated service/internship workflows |
| [js/workspace-completion.js](../js/workspace-completion.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/workspace-shell.js](../js/workspace-shell.js) | 52 | UI/navigation/presentation; inspect storage separately |
| [js/workspace-support.js](../js/workspace-support.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |
| [js/workspace.js](../js/workspace.js) | 1 | Learning content, evidence, rules, runtime UI or derived reporting |

python-worker.js is loaded as a Worker and user-guide.js through dynamic script injection; their zero direct imports do not mean they are unused. cm-home.js has no direct active import and is not used as evidence of an active database-backed feature. Static delivery copies, previews and old SQL material were inventoried for preservation but do not supersede the active application’s source.

**End of Phase 2. Stop here for approval; do not start Phase 3.**
