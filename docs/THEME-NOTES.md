> آخر تحديث: استُبدلت لوحة Dark الخمرية بلوحة كحلية فحمية وفق القيم الجديدة. المرجع الحالي للألوان والاختبارات والصور هو [DARK-PALETTE-NOTES.md](DARK-PALETTE-NOTES.md). سلوك الزر والحفظ والتهيئة المبكرة الموثق أدناه بقي كما هو.

> Historical snapshot — not a current implementation inventory. Dated counts and outcomes below describe that snapshot only. See [the code-derived current implementation](CURRENT-IMPLEMENTATION.md) for current curriculum counts, roles and limitations. Sample credential literals in historical excerpts have been redacted.

# Cherry Light / Dark Mode — النسخة الحالية

زر كبسولة فعلي مستوحى من المرجع: 112×50px، مسار ثلجي في Light وخمري في Dark، دائرة زجاجية تتحرك من اليسار لليمين، وحبّتا كرز خمريتان مرسومتان بـSVG مع غصنين وورقة ولمعات صغيرة. يستخدم خط الموقع. الحركة قصيرة للانزلاق وميل الكرز ولمعة hover؛ لا حركة مستمرة ولا استخدام للصورة المرجعية كزر.

## التشغيل والهوية

- `js/theme.js` ملف تهيئة صغير متزامن في head قبل stylesheet في صفحات التطبيق الـ51. يطبّق data-theme على html قبل عرض التنسيق، ويقرأ `codementor-ui-theme` من localStorage. عند غياب اختيار صالح يتبع prefers-color-scheme، ويستجيب لتغير إعداد الجهاز ما لم يختر المستخدم وضعًا صراحة.
- الاختيار محفوظ عبر إعادة الفتح والتنقل، مع مزامنة storage والعودة من BFCache. لا حسابات أو تقدم أو كورسات أو حجوزات تُقرأ أو تُكتب من ملف الثيم. القيمة التالفة لا تُحذف أو تُستبدل صامتًا؛ النقر الصريح يحفظ الاختيار الجديد. إذا مُنع التخزين يعمل الوضع للصفحة وتظهر رسالة واضحة.
- `js/workspace-shell.js` يركب زرًا واحدًا مشتركًا في الهيدر العام أو شريط مساحة العمل. في الهيدر العام المطوي على الموبايل يكون داخل القائمة. صفحات الدخول التي لا تملك هيدرًا عامًا تعرضه أعلى لوحة النموذج. لا عنصر عائم يغطي المحتوى، ولا تعديل لتخطيط الهيرو أو الفيديو.
- الزر native button مع aria-label يصف الوضع الذي سينتقل إليه وaria-pressed لحالة Dark، وتركيز ظاهر. SVG زخرفي مخفي عن قارئ الشاشة. يدعم Space وEnter. prefers-reduced-motion يلغي انتقال الدائرة وميل الكرز واللمعة.
- كل التنسيق في `css/style.css`: متغيرات دلالية للخلفية والأسطح والنصوص والحدود وألوان الأزرار، مع ربط الأسماء القديمة بها دون تغيير عقود المكونات. Dark يعتمد الخمري العميق والثلجي، مع أسطح خمرية متدرجة؛ Light يحتفظ بلوحة الهوية الحالية. عولجت الأسطح والأزرار ذات الألوان الثابتة التي تمنع التبديل. لا فلتر invert للصفحة أو الصور.
- فيديو الهيرو ومحتواه وأبعاده لم تتغير. ثُبتت ألوان نص الهيرو وأزراره الأصلية عند تبديل بقية الصفحة لأن الفيديو فاتح؛ لا يرث عنوانه اللون الثلجي فوق الفيديو. بيانات الفحص تؤكد لون العنوان #260204 والفيديو readyState=4 في الحالتين. الطباعة تستبعد الزر وتعود لمتغيرات Light وقواعد التقرير الحالية.

## الصور من المتصفح

- [الزر في Light، مكبّر 3× للتفاصيل](previews/cherry-toggle-light.png).
- [الزر في Dark، مكبّر 3× للتفاصيل](previews/cherry-toggle-dark.png).
- [الهوم والهيرو في Light](previews/cherry-home-light.png).
- [الهوم والهيرو في Dark](previews/cherry-home-dark.png).
- [شريط الطالب والوضع الداكن على الموبايل](previews/cherry-student-dark-mobile.png).

## الاختبار الفعلي

- **116/116** في `tests/theme-results.json`: مداخل صفحات HTML الـ51، زر واحد وحالة محفوظة، عدم التمرير الأفقي على سطح المكتب، وفحص آلي لتركيبات النصوص والخلفيات المتاحة في DOM، ثم صفحات عامة وطالب وأدمن ونماذج على390px، واستمرار Light، وعدم تغيير الجلسة، والبيانات التالفة ومنع التخزين. تتبع الفحوص التحويلات الحالية للصفحات التي تتطلب معرفًا أو محاولة سابقة؛ لا يعني فتح المدخل ملء كل حالاته الديناميكية.
- **13/13** في `tests/theme-input-results.json` بواسطة Chrome DevTools Protocol وزمن متصفح حقيقي: اختيار الجهاز وتغيّره، اختيار محفوظ قبل تحليل stylesheet، حجم112×50 وحالة aria، ظهور نص وفيديو الهيرو في الحالتين، hover، Space وEnter فعليان، تقليل الحركة، استمرار الوضع في مساحة الطالب على الموبايل، والطباعة. فُحص التنفيذ المبكر قبل وجود link الخاص بالـstylesheet؛ لا ادعاء بتسجيل فيديو لوميض الصفحة على اتصال بطيء.
- **343/343** فحص تراجع لوظائف الخدمات والمصادر واللغات والتنقل والصفحات الأصلية والتكامل والسجلات والتدريب؛ النتائج في `tests/theme-regression-results.json`.
- فُحص ترتيب سكربت التهيئة قبل CSS في51/51 صفحة. الصور مأخوذة من النسخة الفعلية وعُوينت. لا اعتماد على جلسة المستخدم؛ كل الاختبارات في ملفات Chrome جديدة مؤقتة وبيانات اختبار.
- نتائج تدقيق النصوص ليست تدقيق وصول شاملًا، ولا تتحقق من النصوص داخل الفيديو أو الصور. لم يُختبر Safari/Firefox أو أجهزة فعلية أو قارئ شاشة أو كل حالات النماذج الممكنة، ولا حفظ PDF تفاعلي من نافذة النظام. لم تُختبر مزامنة تبويبين حقيقيين يدويًا. قد تختلف سياسة localStorage لملفات file بين المتصفحات؛ التنفيذ موحّد عند تشغيل الموقع على أصل واحد.

## الملفات المعدّلة

- جديد: [js/theme.js](js/theme.js).
- [js/workspace-shell.js](js/workspace-shell.js): تركيب SVG والتفاعل والتسمية مرة واحدة. صُحح أيضًا رمز زر قائمة الموبايل واسم رابط الشعار اللذان ظهرا بنص مشوّه.
- [css/style.css](css/style.css): المتغيرات الدلالية ولوحتا الألوان وتنسيق الكبسولة؛ لا ملف CSS أو مكتبة جديدة.
- صفحات HTML التالية: إضافة سطر تحميل js/theme.js في head فقط، قبل CSS، دون تعديل محتوى الصفحات:
- [admin-account-access.html](admin-account-access.html)
- [admin-analytics.html](admin-analytics.html)
- [admin-course-content.html](admin-course-content.html)
- [admin-course-create.html](admin-course-create.html)
- [admin-courses.html](admin-courses.html)
- [admin-dashboard.html](admin-dashboard.html)
- [admin-level-content.html](admin-level-content.html)
- [admin-level-create.html](admin-level-create.html)
- [admin-student-details.html](admin-student-details.html)
- [admin-students.html](admin-students.html)
- [certificates.html](certificates.html)
- [change-password.html](change-password.html)
- [code-review.html](code-review.html)
- [community.html](community.html)
- [course.html](course.html)
- [dashboard.html](dashboard.html)
- [demo.html](demo.html)
- [forgot-password.html](forgot-password.html)
- [freelance-services.html](freelance-services.html)
- [index.html](index.html)
- [languages.html](languages.html)
- [learning-path.html](learning-path.html)
- [learning-report.html](learning-report.html)
- [lesson.html](lesson.html)
- [level-assessment.html](level-assessment.html)
- [local-portfolio.html](local-portfolio.html)
- [login.html](login.html)
- [mentor.html](mentor.html)
- [mentoring-details.html](mentoring-details.html)
- [module.html](module.html)
- [onboarding.html](onboarding.html)
- [peer-mentoring.html](peer-mentoring.html)
- [placement-intro.html](placement-intro.html)
- [placement-question.html](placement-question.html)
- [placement-results.html](placement-results.html)
- [placement-review.html](placement-review.html)
- [practice.html](practice.html)
- [profile.html](profile.html)
- [progress.html](progress.html)
- [project-evaluation.html](project-evaluation.html)
- [project.html](project.html)
- [requests.html](requests.html)
- [reset-password.html](reset-password.html)
- [service-details.html](service-details.html)
- [service-draft.html](service-draft.html)
- [showcase.html](showcase.html)
- [signup.html](signup.html)
- [skill-analysis.html](skill-analysis.html)
- [student-public-profile.html](student-public-profile.html)
- [virtual-internship.html](virtual-internship.html)
- [workspace.html](workspace.html)

ملفات الفحص: tests/theme-smoke.html وtests/theme-smoke.js وtests/theme-input.ps1 وملفات النتائج الثلاثة والصور والتقرير. نتائج المعاينة القديمة التي تحمل أسماء theme-home-dark.png ليست مرجع هذا التصميم؛ الصور الحالية تبدأ بـcherry-.

أُعيد أيضًا فحص الوصول إلى الخدمات بعد إضافة الزر: 75/75 عبر7 أحجام ومن أعلى وأسفل الصفحة والرابط المباشر، عند زووم100%. النتائج في tests/services-arrival-results.json؛ لم يحدث تمرير أفقي أو تغطية لعنوان القسم. مجموع حالات هذه الجولة: 547/547 (116+13+343+75).
