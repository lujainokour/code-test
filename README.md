# CodeMentor AI

للحالة الوظيفية والأعداد الحالية المستخرجة من الكود، راجع [الحالة الحالية](docs/CURRENT-IMPLEMENTATION.md). التقارير المؤرخة تصف وقت إعدادها ولا تحل محل هذا المرجع. المرشد الحالي يعرض إرشادات جاهزة تجريبية، ولا يتصل بنموذج AI.

يمكن للطالب اختيار **My language** من لوحة الطالب أو المسار: Python وJavaScript جاهزان للتعلّم والتنفيذ، وبقية اللغات موضحة كـ Coming soon. اختيار اللغة وتقدّمها ومسوداتها مستقل لكل حساب. JavaScript يتضمن 3 مستويات و12 درسًا و6 مهام؛ بنك تحديد المستوى له غير متاح ويظهر تخطيه صراحة. المرحلة 1 لا تضيف خادمًا أو تصحيحًا موثوقًا أو مزامنة بين الأجهزة.

حالة التسليم: [تقرير المرحلة 1](docs/PHASE-1.md) يميّز الفحوص غير المعتمدة على المتصفح عن النتائج السابقة، ويسجل التحقق البصري وحارس الرجوع/التركيز كـ **pending manual verification**. أجاز المستخدم حفظ المرحلة بهذه الحالة والاستكمال إذا نجحت الفحوص غير المعتمدة على المتصفح.

آخر مراجعة: **11 نوفمبر 2026**. تفاصيل الإضافات والفحوص والحدود في [تقرير تجهيز الموقع](docs/CLEANUP-2026-11-11.md).
أُضيف طلب تدريس تجريبي معلّق للحساب الطلابي العادي عند فتح قائمة مراجعات فارغة لدى الإدارة، مع تمييزه بوضوح كعينة وعدم استبدال الطلبات الموجودة. تعرض إدارة الشركات تفاصيل الفرص والمهارات والتعويض المعلن وعدد الطلبات المرتبطة بكل فرصة.
إدارة جلسات المنصة أصبحت ضمن بوابة الأدمن؛ روابط بوابة المعلم القديمة تحوّل إلى الصفحات المقابلة. راجع [تدفق الإدارة الحالي](docs/admin-role-flow.md).

The built-in community at `pages/services/community.html` has private channels.
Students request membership with a reason; administrators approve or decline requests
at `pages/admin/admin-community.html` (Community requests in the admin sidebar).
Only approved channel members see discussions and can post, reply or react.
Administrators can remove access; students can cancel requests, reapply or leave.
Decisions update other tabs immediately. Each channel has independent membership.
This is a browser-local prototype: records are shared between tabs, not devices.
Production private channels require server-side authentication and authorization;
browser storage is not a security boundary. Existing posts are retained but grant no membership.
Run `powershell -NoProfile -ExecutionPolicy Bypass -File tests/community-browser.ps1`
for the two-tab request, approval, rejection, discussion and revocation workflow checks.

Student-led teaching sessions now include application, admin review, session publishing,
appointment requests, confirmation, cancellation, completion and learner reviews.
Start at `pages/services/peer-mentoring.html` and choose **Browse student sessions**
or **Offer a teaching session**. See [the complete workflow](docs/PEER-TEACHING-WORKFLOW.md).
This cycle is browser-local; cross-device accounts, server authorization and payments
are not connected. Registered students can sign in again on the same browser.

تقرير 8 نوفمبر 2026 محفوظ في [الإصلاحات السابقة](docs/FIXES-2026-11-08.md).

رحلات الطالب والشركة والإدارة أصبحت مترابطة محليًا: الفرص والتقديم والتدريب، نشر المشاريع باختيار الطالب، صندوق الرسائل، وتعليق الحسابات. راجع [دليل الاستخدام والربط](docs/CONNECTED-WORKFLOWS.md). تبقى هذه نسخة متصفح محلية، دون API متعدد المستخدمين أو اتصال مباشر بقاعدة البيانات.

## SQL Server learning database

The Phase 3 SQL Server implementation is available in [database/README.md](database/README.md), including the restored standalone creation script, verification suite and academic examples. The restored submission matches the SQL embedded in the database atlas byte for byte. A new isolated database passed all 102 checks on November 8, 2026.
The HTML/JavaScript frontend remains browser-local and is not connected to SQL Server.

واجهة تجريبية ثابتة تعمل بـ HTML وCSS وJavaScript، وتحتفظ بالبيانات التجريبية داخل المتصفح.

حساب الشركة يدعم ملفًا محليًا واحدًا لكل متصفح، مع التحقق من كلمة المرور عند العودة إلى الملف المسجل. تُحفظ بيانات تحقق مشتقة مع ملح عشوائي؛ لا تُحفظ كلمة المرور كنص. إدارة الجلسات عبر بوابة الأدمن، وطلبات تدريس الطلاب عبر حساباتهم الطلابية. هذا ليس بديلًا عن المصادقة والصلاحيات على الخادم.

## التشغيل محليًا

من مجلد المشروع، شغّل:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/serve.ps1
```

افتح <http://127.0.0.1:8765/>. أوقف الخادم باستخدام `Ctrl+C`.

## الملفات

```text
index.html
pages/
  auth/        صفحات الحساب وكلمة المرور
  student/     التعلّم ومساحة الطالب والطلبات
  admin/       معاينة الإدارة
  services/    المجتمع والإرشاد والمعرض والخدمات
  public/      العرض التجريبي واللغات والدورات
css/
js/
assets/
tests/         الاختبارات وخادم التطوير
previews/      المعاينات والصور المرجعية
docs/          التقارير وخريطة الصفحات ونتائج الاختبارات
```

## التحقق

بعد تشغيل الخادم، نفّذ في نافذة أخرى:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/stability-powershell.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File tests/verify-structure.ps1 -HarnessFilter __reference_only__.html -ReportPrefix current
node tests/language-storage.cjs
node tests/curriculum-migration.cjs
node tests/language-page-guards.cjs
node tests/language-publishing.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File tests/language-switch-browser.ps1
```

تستخدم الفحوص Chrome المثبّت في مساره الافتراضي على Windows بملفات مستخدم مؤقتة منفصلة. الأمر الأول يشغّل فحوص الوظائف الحالية ويحفظ تقاريرها في مجلد مؤقت، والثاني يفحص مراجع الصفحات والصور وأخطاء JavaScript للزائر والطالب والأدمن ويحفظ النتائج في `docs/current-*.json`. فحوص المجتمع والشركات والتدريس والإدارة موضحة في تقرير 11 نوفمبر.

تشغيل `verify-structure.ps1` دون مرشح يشمل اختبارات HTML تاريخية ما زالت فيها توقعات غير متوافقة مع الصلاحيات والصفحات الحالية؛ أظهر تشغيل 11 نوفمبر إخفاق 14 مجموعة من أصل 18. لم تُحذف هذه الاختبارات أو تُحوَّل إخفاقاتها إلى نجاحات. نتائجها محفوظة في `docs/cleanup-2026-11-11-harness-results.json`.

يمكن فتح أي اختبار من `tests/` عبر الخادم مع `?run=disposable-profile`، داخل ملف متصفح مخصّص للاختبار.

تفاصيل إعادة التنظيم والاسترجاع في [تقرير التنظيم](docs/REORGANIZATION.md).

## Python learning path

The site includes six Python levels, 24 lessons with explanations and learning resources,
independent quizzes, twelve executable coding tasks and a tested Foundations project.
Levels 1-5 are free; Level 6 uses the local Premium preview. Existing Levels 1-3
Foundations certificate requirements are preserved. No payment is collected.
Progress saves automatically on the same device. My progress includes a learning report.
See [learning implementation and verification](docs/LEARNING-UPGRADE.md) for
runtime setup, browser checks and the remaining production requirements.
