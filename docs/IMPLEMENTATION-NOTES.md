# CodeMentor AI — تنفيذ الخدمات والتقرير والدخول

> Historical snapshot — not a current implementation inventory. Dated counts and outcomes below describe that snapshot only. See [the code-derived current implementation](CURRENT-IMPLEMENTATION.md) for current curriculum counts, roles and limitations. Sample credential literals in historical excerpts have been redacted.

تاريخ التنفيذ: 2026-10-15. المرجع هو ملفات المشروع المحلية. المشروع ما زال Frontend demo، ولم يُنشر ولم يُضف Backend أو دفع أو إرسال خارجي.

## الصفحات الجديدة

| الصفحة | المسار | ما تم تنفيذه |
| --- | --- | --- |
| Student Community | [community.html](community.html) | شرح المجتمع وآدابه، ومكان واضح لرابط Discord مع بيان أنه لم يُضف بعد. |
| Peer Mentoring | [peer-mentoring.html](peer-mentoring.html) | أسماء مقدّمين تجريبيين ولغاتهم ومهاراتهم والمدة والسعر والموضوع؛ بحث وفلترة. |
| Peer Session Details | [mentoring-details.html](mentoring-details.html) | تفاصيل جلسة، أهلية تجريبية معتمدة من الأدمن، اختيار موعد وطلب حجز محلي. |
| Student Showcase | [showcase.html](showcase.html) | ملفات عامة تجريبية وبحث وفلترة باللغة والمهارة، دون متابعة أو مراسلة غير عاملة. |
| Public Student Profile | [student-public-profile.html](student-public-profile.html) | نبذة ومهارات ومشاريع تجريبية وروابط أعمال إن وجدت؛ لا يُعرض العمر أو الإيميل. |
| Student Freelance Services | [freelance-services.html](freelance-services.html) | عروض خدمات من الطلاب، وليست لوحة وظائف. أسعار ومدد تسليم تجريبية. |
| Student Service Details | [service-details.html](service-details.html) | تفاصيل الخدمة ومقدّمها ومخرجات مقترحة ونموذج طلب محلي. |
| My Service Drafts | [service-draft.html](service-draft.html) | نموذج إضافة مسودة خاصة مع اللغة والمهارات والسعر والتسليم، وعرض مسودات صاحب الجلسة فقط. |
| Learning Report | [learning-report.html](learning-report.html) | اسم الطالب والمسار والأنشطة والمهارات المدعومة بسجلات دروس محفوظة، وحالة المشاريع؛ طباعة وحفظ PDF من نافذة المتصفح. |

## الملفات الموجودة التي تغير سلوكها أو محتواها

| الملف | التعديل |
| --- | --- |
| [index.html](index.html) | أربع بطاقات للخدمات في قسم مستقل تحت المحتوى الموجود، وروابط Services في التصفّح والفوتر. الهيرو والفيديو لم يُعدّلا. |
| [dashboard.html](dashboard.html) | روابط الخدمات الأربع في تنقّل الطالب؛ الداشبورد يستخدم منطق تنقّل مستقلًا. |
| [progress.html](progress.html) | بطاقة Export Learning Report ورابط المعاينة. |
| [login.html](login.html) | تبسيط الجهة اليسرى إلى صورة محلية واحدة وعنوان قصير؛ النموذج والروابط الأصلية محفوظة. |
| [signup.html](signup.html) | حقل العمر ورسالة الخصوصية، وتوضيح بقاء تسجيل الدخول باستخدام حساب الديمو. |
| [css/style.css](css/style.css) | متغير accent بالقيمة المرجعية، ومكونات الخدمات والتقرير وتجاوب صورة الدخول وطباعة التقرير. لم يُنشأ ملف CSS إضافي. |
| [js/student-workspace.js](js/student-workspace.js) | إضافة روابط الخدمات من ملف تنقّل الطالب المشترك، دون إضافتها لتنقّل الأدمن. |
| [js/signup.js](js/signup.js) | التحقق من الاسم الكامل والعمر وحفظ العمر داخل الهوية الخاصة، مع إبقاء التأكيد وكلمة المرور دون تخزينها. عدم حذف onboarding المحفوظ، وحماية الهوية الحالية من الاستبدال الصامت. |
| [js/login.js](js/login.js) | حساب الديمو وسلوكه الأساسي محفوظان؛ الحفاظ على حقول الهوية الإضافية عند الدخول للحساب نفسه، وإظهار رسالة عند هوية تالفة أو حساب آخر نشط. |
| [js/admin-courses.js](js/admin-courses.js) | قراءة مسودات الكورسات ودمجها للعرض والفلترة فقط، مع تكييف حقول اللغة دون إعادة كتابة التخزين. |
| [js/admin-course-content.js](js/admin-course-content.js) | دعم languageName / languageId للبيانات الأساسية، وlanguage للمسودات عند عرض اللغة. |

## ملفات المنطق والأصول الجديدة

| الملف | الغرض |
| --- | --- |
| [js/student-services-data.js](js/student-services-data.js) | بيانات عامة خيالية منفصلة تمامًا عن هوية الحساب الخاصة؛ لا تقييمات أو أعداد عملاء مخترعة. |
| [js/student-services.js](js/student-services.js) | بناء البطاقات والبحث والفلترة والتفاصيل والنماذج وقراءة السجلات المحلية والتحقق منها. تُعرض القيم النصية باستخدام textContent. |
| [js/learning-report.js](js/learning-report.js) | قراءة البيانات المتاحة والتحقق منها وإنشاء التقرير واستدعاء window.print. |
| [assets/images/codementor-learning.png](assets/images/codementor-learning.png) | صورة جديدة محلية لصفحة الدخول، أُنشئت بأداة image_gen المدمجة وفق مهارة imagegen. |
| [tests/browser-smoke.html](tests/browser-smoke.html) | واجهة فحوص المتصفح داخل iframe بعرض 390 بكسل. |
| [tests/browser-smoke.js](tests/browser-smoke.js) | فحوص السلوك والتخزين والخصوصية والتجاوب. لا تبدأ تلقائيًا دون بارامتر التشغيل المقصود. |
| [tests/RESULTS.md](tests/RESULTS.md) | النتائج الفعلية وحدود الفحص. |
| [IMPLEMENTATION-NOTES.md](IMPLEMENTATION-NOTES.md) | هذا التوثيق وقائمة الملفات. |

## التخزين وحماية البيانات

العقود الموجودة للكورسات والمستويات لم تتغير:

- `codementor-demo-admin-course-drafts`: `{ version: 1, courses: [...] }`، والمسودة تحتوي `language` و`languageLabel`.
- `codementor-demo-admin-course-content`: `{ version: 1, courses: { [courseId]: { levels: [...] } } }`.
- الكورسات الأساسية ما زالت تستخدم `languageId` و`languageName`. التكييف يحصل للعرض فقط.
- البيانات التالفة تعرض رسالة وتوقف العملية المعتمدة عليها، دون حذفها أو استبدالها بصمت.

المفاتيح الجديدة هي `codementor-demo-peer-bookings` و`codementor-demo-service-requests` و`codementor-demo-service-drafts`، وكل منها يحتوي `{ version: 1, records: [...] }`.

كل سجل جديد مرتبط بـ`owner` من جلسة الطالب التجريبية. المسودات لا تُضاف تلقائيًا للكتالوج العام. فحص جلسة الطالب محلي فقط، وليس مصادقة أو حماية Backend. تغيير الحساب أثناء فتح النموذج يمنع الحفظ حتى إعادة تحميله. البيانات تبقى ضمن sessionStorage في التبويب؛ لا يوجد إرسال أو دفع أو اجتماع.

العمر محفوظ داخل `codementor-demo-session` فقط، والملفات العامة لا تقرأ هذا المفتاح. كلمات المرور لا تُحفظ. التسجيل ليس نظام حسابات حقيقيًا، والدخول ما زال يقبل بيانات العينة الموجودة في الصفحة.

## حدود التقرير

- يعتمد على `codementor-demo-session` و`codementor-demo-onboarding` و`codementor-demo-learning`.
- يحسب الدروس والمهام المعروفة ضمن Python Level 01؛ لا يختلق نسبة للمسار الكامل.
- المهارات المعروضة هي موضوعات دروس مسجلة، وليست إثبات كفاءة.
- بيانات التعلّم القديمة مشتركة في التبويب وغير مرتبطة بحساب موثّق أو سجل مستقل لكل لغة؛ يظهر ذلك داخل التقرير.
- صفحة المشاريع الحالية لا تحفظ رفعًا أو تقييمًا. لذلك يوضّح التقرير عدم وجود سجلات مشاريع مقدّمة، ولا يحوّل مفاهيم المعرض أو مسودات الخدمات إلى إنجازات.
- لا تظهر معلومات العمر أو الإيميل أو طلبات الخدمات الخاصة. التقرير ليس شهادة رسمية.
- الحفظ النهائي يتم باختيار Save as PDF من نافذة الطباعة، وليس بتنزيل تلقائي.

## صورة الدخول

الأداة: `image_gen.imagegen` المدمجة، وليس CLI أو رابط صورة خارجي. المسار النهائي: `assets/images/codementor-learning.png`.

النص المرسل للأداة:

> Use case: stylized-concept. Asset type: single portrait editorial illustration for CodeMentor AI sign in sidebar. Create a polished, calm 3D illustration of a programming learner's desk: an open laptop with abstract code lines and small Python, C# and C++ text tabs on screen, a notebook, and a tiny pair of burgundy cherries as a brand cue. Ice blue background #b1d4e1, dark burgundy #260204 and #70151c, soft icy surfaces #daeaf0. Restrained composition, welcoming soft light, clean generous negative space, portrait 4:5 composition. No people, no slogans, no watermarks, no extraneous UI. This is an illustration of learning, not a screenshot of functioning AI.

## مراجع قديمة غير موجودة

أظهر فحص الهوم والدخول وجود `demo.html` و`forgot-password.html` و`js/smoke-intro.js` كمراجع لملفات غير موجودة أصلًا. لم تُنشأ صفحات شكلية لها ولم تُغيّر روابط النموذج أو الهيرو ضمن هذه المهمة. كل المراجع المحلية داخل الصفحات التسع الجديدة موجودة.

لم يتم تجهيز محتوى تعليمي جديد للغات أو تفعيل AI أو تشغيل كود أو تقييم أو إصدار شهادات، وأدوات الأدمن الحالية ما زالت موجودة.

## استكمال لاحق

تم استكمال إدارة الدروس والمصادر واللغات والتنقل والشعار والصفحات الأصلية. راجع تقرير الاستكمال القديم غير الموجود في هذه النسخة؛ الحالة الحالية موثقة في [CURRENT-IMPLEMENTATION.md](CURRENT-IMPLEMENTATION.md) للملفات والعقود ونتائج الفحص الجديدة (189/189). ما ورد أعلاه عن نقص الصفحات الأصلية وتعداد اللغات يصف المرحلة السابقة، وليس الحالة الحالية.
