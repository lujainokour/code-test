# مصادر Python Level 01 — 2026-10-15

أُضيفت مراجع خارجية أساسية إلى `js/python-lessons.js` في `window.pythonLessonSources`، منفصلة عن سجلات شرح الدروس الأصلية. تظهر من ملفات النسخة نفسها دون زرع بيانات في sessionStorage. لم يتغير الشرح أو الكود أو التدريبات أو تصميم الموقع أو الهيرو أو الفيديو. Virtual Internship لم تُنفذ.

## الدروس والمراجع

| الدرس | الفيديو العربي | التوثيق الرسمي بالإنجليزية |
| --- | --- | --- |
| Variables and values: الأسماء والإسناد وإعادة الإسناد | [Elzero: Variables Part One](https://www.youtube.com/watch?v=hQnZxqp3Q0Y) | [Numbers and variable assignment](https://docs.python.org/3/tutorial/introduction.html#numbers) |
| Data types: str/int/float/bool وtype | [Elzero: Some Data Types Overviews](https://www.youtube.com/watch?v=43lT7k0Zws0) | [Built-in types](https://docs.python.org/3/library/stdtypes.html)، [type()](https://docs.python.org/3/library/functions.html#type) |
| Input and output: إدخال نص وعرضه وf-strings | [DigiTech Academy: Input / Print، بالدارجة](https://www.youtube.com/watch?v=9h5Y7GpR9Oo) | [input()](https://docs.python.org/3/library/functions.html#input)، [print()](https://docs.python.org/3/library/functions.html#print)، [f-strings](https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals) |
| Working with numbers: int/float والعمليات و.2f | [Elzero: Numbers](https://www.youtube.com/watch?v=x7fFnKVAzDI)، [Arithmetic Operators](https://www.youtube.com/watch?v=prv7cVm2dxE) | [Numbers](https://docs.python.org/3/tutorial/introduction.html#numbers)، [int()](https://docs.python.org/3/library/functions.html#int)، [float()](https://docs.python.org/3/library/functions.html#float)، [f-strings](https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals) |

## حدود التحقق من الإنترنت

تم فتح النصوص الرسمية ومراجعة مطابقتها للموضوعات. ظهرت بيانات YouTube المفهرسة للفيديوهات: Variables Part One وNumbers وArithmetic Operators وInput/Print، مع العناوين والقنوات واللغة المعلنة. رابط فيديو أنواع البيانات استُخرج من زر الفيديو في [موقع صاحب الدورة](https://elzero.org/python-some-data-types-overviews/)، وراجعت أمثلة type() فيه؛ تشمل الأنواع الأربعة في الدرس. راجعت أيضًا [كود المتغيرات](https://elzero.org/python-variables-part-one/) و[الأرقام والتحويلات](https://elzero.org/python-numbers/) لدى صاحب الدورة.

تعذر جلب صفحات تشغيل YouTube مباشرة من أداة التصفح، ولم أشاهد الفيديوهات أو أتحقق من تشغيلها كاملًا أو قيودها الجغرافية. المطابقة مستندة إلى بيانات الفيديو المتاحة وصفحات المؤلف، وليست مراجعة سمعية وبصرية كاملة. فيديو الإدخال/الإخراج يغطي input/print؛ التوثيق الإضافي يغطي f-strings. لم يُخترع رابط حين تعذر الوصول إلى فيديو User Input للزيرو؛ اختير فيديو عربي آخر ظهرت بياناته من YouTube.

## الدمج دون تعديل البيانات

- `js/lesson-content.js` يبدأ بمراجع الدرس الأساسية ثم يضيف مصادر الأدمن المنشورة المرتبطة بـbuiltInLessonId، وفق نطاق القراءة الموجود سابقًا. معاينة الدرس المحلي المرتبط تعرض الأساسية ومصادر ذلك الدرس؛ غير المرتبط لا يرثها، ولا ترثها لغات أخرى.
- الدمج للعرض فقط باستخدام Map، دون كتابة أو ترحيل أو حذف. الروابط المتطابقة تظهر مرة؛ روابط YouTube القصيرة وwatch وembed لنفس المعرّف تعتبر مرجعًا واحدًا، وتتجاهل معاملات التتبع. روابط التوثيق ذات الأقسام المختلفة تبقى مستقلة.
- عند التكرار يظل عنوان ورابط الأدمن ظاهرين وتُستكمل بيانات النوع واللغة من المرجع الأساسي، مع عبارة `Core reference + local admin source`. المصادر المحلية المستقلة موسومة `Local admin source`. القديمة التي لا تحمل نوعًا/لغة تظهر `External resource` و`Language not specified` دون تخمين؛ لم تتغير حقول عقد التخزين أو محرر الأدمن.
- حذف مصدر محلي لا يحذف المرجع الأساسي من ملفات المشروع؛ ويمكن تعديل الأساسية لاحقًا في ملف البيانات. عند فساد التخزين المحلي يظهر التحذير وتبقى الأساسية والشرح الأصلي متاحين، ولا تُمسح البيانات.
- الروابط مقيدة بالتحقق الحالي HTTP/HTTPS دون بيانات دخول، وتفتح بـ`target="_blank" rel="noopener noreferrer"`. العناوين والبيانات تُعرض بـtextContent.

## الفحص الفعلي والملفات

- `tests/python-sources.html` و`tests/python-sources.js`: **22/22** في Chrome بملف مؤقت جديد. الدروس الأربعة بجلسة نظيفة، النوع واللغة والفتح الآمن، بقاء الكود وأسئلة المعرفة، عرض 390px، دمج مصادر محلية دون تكرار، عدم تسريب مصدر مسودة، معاينة درس مرتبط وغير مرتبط، والحفاظ الحرفي على التخزين الصحيح والتالف.
- أُعيد تشغيل `tests/content-phase.html`: **20/20**، وتشمل إضافة الدرس ومصادره وتعديلها وحذفها ومنع الروابط غير الآمنة وحماية البيانات والمعاينة.
- نتائج هذه الجولة في `tests/python-sources-results.json`. لم تُعد كل مجموعات الموقع السابقة في هذه الجولة، ولم تُستخدم جلسة المستخدم.
- ملفات التطبيق المعدّلة فقط: `js/python-lessons.js` و`js/lesson-content.js`. ملفات الفحص والتقرير المذكورة جديدة. لا تعديل HTML أو CSS أو مصادقة أو Backend أو قفل اختبار المستوى.
- لم يُختبر Firefox/Safari أو جهاز فعلي أو تشغيل الفيديو من متصفح المستخدم.
