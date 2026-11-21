
/* Fictional academic seed. Source curriculum, no browser backup imported.
   Evaluation rows below are illustrative SQL fixtures, not Python runs. */
INSERT dbo.Users (Email,FullName,RoleCode) VALUES
(N'seed-admin@example.invalid',N'Academic administrator (fictional)',N'Admin'),
(N'seed-student@example.invalid',N'Academic learner (fictional)',N'Student'),
(N'seed-learner2@example.invalid',N'Second learner (fictional)',N'Student');
INSERT dbo.Languages (Slug,Name,Description,ContentReadinessCode) VALUES
(N'python',N'Python',N'Readable programming for scripting, automation and data.',N'Ready'),
(N'csharp',N'C#',N'Structured applications with the .NET ecosystem.',N'ComingSoon'),
(N'cpp',N'C++',N'Systems programming and performance-oriented applications.',N'ComingSoon'),
(N'javascript',N'JavaScript',N'Interactive web experiences and general-purpose scripting.',N'ComingSoon'),
(N'typescript',N'TypeScript',N'Typed JavaScript for maintainable applications.',N'ComingSoon'),
(N'java',N'Java',N'Object-oriented applications on the Java platform.',N'ComingSoon'),
(N'c',N'C',N'Low-level programming and systems foundations.',N'ComingSoon'),
(N'go',N'Go',N'Simple, concurrent server and systems applications.',N'ComingSoon'),
(N'rust',N'Rust',N'Memory-conscious systems programming.',N'ComingSoon'),
(N'php',N'PHP',N'Server-side web application development.',N'ComingSoon'),
(N'ruby',N'Ruby',N'Expressive scripting and web applications.',N'ComingSoon'),
(N'swift',N'Swift',N'Applications for the Apple platform ecosystem.',N'ComingSoon'),
(N'kotlin',N'Kotlin',N'Modern applications on Android and the JVM.',N'ComingSoon');
INSERT dbo.StudentProfiles (UserId,PreferredLanguageId,ExperienceCode,LearningGoalCode) VALUES
(2,1,N'Beginner',N'Foundations'),
(3,1,N'SomeExperience',N'Projects');
INSERT dbo.Courses (LanguageId,Slug,Title,Description,PublicationStatus,CreatedByUserId) VALUES
(1,N'python-core',N'Python learning path',N'Three assessed levels from the active application.',N'Published',1),
(2,N'csharp-boundary-fixture',N'C# integrity fixture',N'Draft only; not an implemented assessed curriculum.',N'Draft',1);
INSERT dbo.Levels (CourseId,Title,Description,SortOrder,PublicationStatus) VALUES
(1,N'Python Foundations',N'Python Foundations',1,N'Published'),
(1,N'Logic and Control Flow',N'Logic and Control Flow',2,N'Published'),
(1,N'Functions and Collections',N'Functions and Collections',3,N'Published'),
(2,N'Unrelated course fixture',N'For cross-course rejection checks only.',1,N'Draft');
INSERT dbo.LevelObjectives (LevelId,ObjectiveNo,ObjectiveText) VALUES
(1,1,N'Give a value a name.'),
(1,2,N'Different values, different types.'),
(1,3,N'Let your program communicate.'),
(1,4,N'Turn input into a calculation.'),
(2,1,N'Choose a branch with if.'),
(2,2,N'Combine conditions carefully.'),
(2,3,N'Repeat work for each value.'),
(2,4,N'Repeat until a condition changes.'),
(3,1,N'Give reusable work a name.'),
(3,2,N'Keep related values together.'),
(3,3,N'Look up a value by its key.'),
(3,4,N'Break a task into smaller steps.');
INSERT dbo.Topics (LanguageId,Code,Name) VALUES
(1,N'variables',N'Variables and values'),
(1,N'data-types',N'Data types'),
(1,N'input-output',N'Input and output'),
(1,N'numbers',N'Working with numbers'),
(1,N'conditions',N'Conditions and decisions'),
(1,N'boolean-logic',N'Boolean logic'),
(1,N'for-loops',N'For loops and ranges'),
(1,N'while-loops',N'While loops'),
(1,N'functions',N'Functions and return values'),
(1,N'lists',N'Lists and indexing'),
(1,N'dictionaries',N'Dictionaries'),
(1,N'problem-solving',N'Build a small program');
INSERT dbo.Lessons (LevelId,TopicId,Slug,Title,Summary,Body,ExampleCode,PreparedOutput,EstimatedMinutes,SortOrder,PublicationStatus) VALUES
(1,1,N'variables',N'Variables and values',N'Learn how a name refers to a value and how that value can change.',N'A variable is a name that refers to a value in your program.

Use the equals sign (=) to assign a value. Choose names that describe the data.

Assigning another value to the same name changes what that name refers to.',N'name = "Lujain"
print(name)

name = "Loji"
print(name)',N'Lujain
Loji',10,1,N'Published'),
(1,2,N'data-types',N'Data types',N'Recognize the types of common Python values.',N'Python values have types. Text uses str, whole numbers use int, and decimal numbers commonly use float.

The bool type has two values: True and False.

Use type() to inspect the type of a value.',N'name = "Lujain"
age = 21
height = 1.64
is_learning = True

print(type(age))
print(type(is_learning))',N'<class ''int''>
<class ''bool''>',10,2,N'Published'),
(1,3,N'input-output',N'Input and output',N'Read a value from the user and display a useful message.',N'input() reads a line of text and returns it as a string.

print() displays values. An f-string lets you insert a value inside text using braces.

The example below assumes the user enters Lujain.',N'name = input()
print(f"Hello, {name}!")',N'Hello, Lujain!',10,3,N'Published'),
(1,4,N'numbers',N'Working with numbers',N'Convert numeric input and calculate a result.',N'Convert numeric text using int() for whole numbers or float() for decimal numbers.

Use +, -, * and / for arithmetic. Converting text that is not a valid number raises an error.

This example uses a price of 2.5 and a quantity of 3. The .2f format displays two decimal places.',N'price = float(input())
quantity = int(input())
total = price * quantity

print(f"Total: {total:.2f}")',N'Total: 7.50',15,4,N'Published'),
(2,5,N'conditions',N'Conditions and decisions',N'An if statement runs its indented block only when its condition is true.',N'An if statement runs its indented block only when its condition is true.

Use elif for another condition and else for the remaining cases. Python uses indentation to group statements.

Compare values with ==, !=, <, <=, > and >=. The equals sign = assigns a value; == compares two values.',N'score = 72
if score >= 70:
    print("Passed")
else:
    print("Try again")',N'Passed',15,1,N'Published'),
(2,6,N'boolean-logic',N'Boolean logic',N'Use and when both conditions must be true, or when at least one must be true, and not to reverse a boolean.',N'Use and when both conditions must be true, or when at least one must be true, and not to reverse a boolean.

Parentheses make combined conditions easier to read. Comparisons are evaluated before and/or.

Test values at the boundaries. A minimum age of 18 includes 18 when you use >=.',N'age = 18
has_ticket = True
print(age >= 18 and has_ticket)
print(not has_ticket)',N'True
False',15,2,N'Published'),
(2,7,N'for-loops',N'For loops and ranges',N'A for loop visits each item in a sequence. range(1, 4) produces 1, 2 and 3: the stop value is excluded.',N'A for loop visits each item in a sequence. range(1, 4) produces 1, 2 and 3: the stop value is excluded.

Place repeated statements inside the indented loop body.

An accumulator starts before the loop and is updated on each iteration. += adds to the existing value.',N'total = 0
for number in range(1, 4):
    total += number
print(total)',N'6',15,3,N'Published'),
(2,8,N'while-loops',N'While loops',N'A while loop repeats while its condition remains true. It can execute zero times.',N'A while loop repeats while its condition remains true. It can execute zero times.

Update the condition inside the loop so it eventually becomes false. Missing that update often creates an infinite loop.

Use break to exit a loop early. The coding workspace lets you stop a program and enforces a time limit.',N'count = 3
while count > 0:
    print(count)
    count -= 1
print("Go")',N'3
2
1
Go',15,4,N'Published'),
(3,9,N'functions',N'Functions and return values',N'Define a function with def, give its inputs meaningful parameter names and indent its body.',N'Define a function with def, give its inputs meaningful parameter names and indent its body.

return sends a result to the caller. print displays text and does not replace a return value.

Call a function with arguments. A function without an explicit return returns None.',N'def double(number):
    return number * 2

result = double(4)
print(result)',N'8',15,1,N'Published'),
(3,10,N'lists',N'Lists and indexing',N'A list stores an ordered collection. Indexes start at zero: items[0] is the first item.',N'A list stores an ordered collection. Indexes start at zero: items[0] is the first item.

append adds an item at the end. len returns the number of items. A negative index such as -1 selects from the end.

Loop over a list to process each value. Check that a list is not empty before accessing its first item.',N'scores = [70, 85]
scores.append(90)
print(scores[0])
print(len(scores))',N'70
3',15,2,N'Published'),
(3,11,N'dictionaries',N'Dictionaries',N'A dictionary maps unique keys to values. Use square brackets to read an existing key.',N'A dictionary maps unique keys to values. Use square brackets to read an existing key.

Assign to a key to add or update a value. Use .get(key, default) when the key might be missing.

Dictionary values can include lists, numbers, strings and other dictionaries.',N'student = {"name": "Lujain", "score": 85}
student["score"] = 90
print(student["name"])
print(student.get("level", 1))',N'Lujain
1',15,3,N'Published'),
(3,12,N'problem-solving',N'Build a small program',N'Start with the required inputs and outputs, then split the program into functions you can test separately.',N'Start with the required inputs and outputs, then split the program into functions you can test separately.

Use a list of dictionaries to represent several records with named fields.

Test normal cases, empty collections and boundary values. A passing sample alone does not prove that a program handles every case.',N'def count_done(tasks):
    return sum(1 for task in tasks if task["done"])

tasks = [{"title": "Read", "done": True},
         {"title": "Code", "done": False}]
print(count_done(tasks))',N'1',15,4,N'Published');
INSERT dbo.LessonResources (LessonId,Title,Url,ResourceType,ResourceLanguage,SortOrder) VALUES
(1,N'Elzero: Variables Part One',N'https://www.youtube.com/watch?v=hQnZxqp3Q0Y',N'Video',N'Arabic',1),
(1,N'Python documentation: Numbers and variable assignment',N'https://docs.python.org/3/tutorial/introduction.html#numbers',N'Documentation',N'English',2),
(2,N'Elzero: Some Data Types Overviews',N'https://www.youtube.com/watch?v=43lT7k0Zws0',N'Video',N'Arabic',1),
(2,N'Python documentation: Built-in types',N'https://docs.python.org/3/library/stdtypes.html',N'Documentation',N'English',2),
(2,N'Python documentation: type()',N'https://docs.python.org/3/library/functions.html#type',N'Documentation',N'English',3),
(3,N'DigiTech Academy: Input() and Print()',N'https://www.youtube.com/watch?v=9h5Y7GpR9Oo',N'Video',N'Arabic (Darija)',1),
(3,N'Python documentation: input()',N'https://docs.python.org/3/library/functions.html#input',N'Documentation',N'English',2),
(3,N'Python documentation: print()',N'https://docs.python.org/3/library/functions.html#print',N'Documentation',N'English',3),
(3,N'Python documentation: Formatted string literals',N'https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals',N'Documentation',N'English',4),
(4,N'Elzero: Numbers',N'https://www.youtube.com/watch?v=x7fFnKVAzDI',N'Video',N'Arabic',1),
(4,N'Elzero: Arithmetic Operators',N'https://www.youtube.com/watch?v=prv7cVm2dxE',N'Video',N'Arabic',2),
(4,N'Python documentation: Numbers and arithmetic',N'https://docs.python.org/3/tutorial/introduction.html#numbers',N'Documentation',N'English',3),
(4,N'Python documentation: int()',N'https://docs.python.org/3/library/functions.html#int',N'Documentation',N'English',4),
(4,N'Python documentation: float()',N'https://docs.python.org/3/library/functions.html#float',N'Documentation',N'English',5),
(4,N'Python documentation: Formatted string literals',N'https://docs.python.org/3/tutorial/inputoutput.html#formatted-string-literals',N'Documentation',N'English',6),
(5,N'Elzero: Conditions and decisions',N'https://www.youtube.com/watch?v=v8ZehXS3XF0',N'Video',N'Arabic',1),
(5,N'Python documentation: Conditions and decisions',N'https://docs.python.org/3/tutorial/controlflow.html#if-statements',N'Documentation',N'English',2),
(6,N'Elzero: Boolean logic',N'https://elzero.org/python-boolean-operators/',N'Video',N'Arabic',1),
(6,N'Python documentation: Boolean logic',N'https://docs.python.org/3/library/stdtypes.html#boolean-operations-and-or-not',N'Documentation',N'English',2),
(7,N'Elzero: For loops and ranges',N'https://www.youtube.com/watch?v=4YolrVX6f1Q',N'Video',N'Arabic',1),
(7,N'Python documentation: For loops and ranges',N'https://docs.python.org/3/tutorial/controlflow.html#for-statements',N'Documentation',N'English',2),
(8,N'Elzero: While loops',N'https://elzero.org/python-loop-while-and-else/',N'Video',N'Arabic',1),
(8,N'Python documentation: While loops',N'https://docs.python.org/3/reference/compound_stmts.html#while',N'Documentation',N'English',2),
(9,N'Elzero: Functions and return values',N'https://www.youtube.com/watch?v=Izwd_n-Ufqo',N'Video',N'Arabic',1),
(9,N'Python documentation: Functions and return values',N'https://docs.python.org/3/tutorial/controlflow.html#defining-functions',N'Documentation',N'English',2),
(10,N'Elzero: Lists and indexing',N'https://elzero.org/python-lists/',N'Video',N'Arabic',1),
(10,N'Python documentation: Lists and indexing',N'https://docs.python.org/3/tutorial/datastructures.html#more-on-lists',N'Documentation',N'English',2),
(11,N'Elzero: Dictionaries',N'https://elzero.org/python-dictionary/',N'Video',N'Arabic',1),
(11,N'Python documentation: Dictionaries',N'https://docs.python.org/3/tutorial/datastructures.html#dictionaries',N'Documentation',N'English',2),
(12,N'Elzero: Functions refresher for your project',N'https://www.youtube.com/watch?v=Izwd_n-Ufqo',N'Video',N'Arabic',1),
(12,N'Python documentation: Build a small program',N'https://docs.python.org/3/tutorial/datastructures.html#looping-techniques',N'Documentation',N'English',2);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'python-placement',1,N'Placement',1,NULL,NULL,N'python-placement',NULL);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'python-level-1',1,N'LevelQuiz',NULL,1,NULL,N'python-level-1',70);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'python-level-2',1,N'LevelQuiz',NULL,2,NULL,N'python-level-2',70);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'python-level-3',1,N'LevelQuiz',NULL,3,NULL,N'python-level-3',70);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-variables',1,N'LessonCheck',NULL,NULL,1,N'lesson-variables',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-data-types',1,N'LessonCheck',NULL,NULL,2,N'lesson-data-types',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-input-output',1,N'LessonCheck',NULL,NULL,3,N'lesson-input-output',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-numbers',1,N'LessonCheck',NULL,NULL,4,N'lesson-numbers',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-conditions',1,N'LessonCheck',NULL,NULL,5,N'lesson-conditions',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-boolean-logic',1,N'LessonCheck',NULL,NULL,6,N'lesson-boolean-logic',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-for-loops',1,N'LessonCheck',NULL,NULL,7,N'lesson-for-loops',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-while-loops',1,N'LessonCheck',NULL,NULL,8,N'lesson-while-loops',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-functions',1,N'LessonCheck',NULL,NULL,9,N'lesson-functions',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-lists',1,N'LessonCheck',NULL,NULL,10,N'lesson-lists',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-dictionaries',1,N'LessonCheck',NULL,NULL,11,N'lesson-dictionaries',100);
INSERT dbo.Assessments (LogicalCode,VersionNo,Kind,ScopeCourseId,ScopeLevelId,ScopeLessonId,Title,PassPercent) VALUES
(N'lesson-problem-solving',1,N'LessonCheck',NULL,NULL,12,N'lesson-problem-solving',100);
INSERT dbo.Questions (AssessmentId,TopicId,Prompt,CodeSnippet,Explanation,SortOrder) VALUES
(1,1,N'What is the type of this value?',N'name = "Lujain"',NULL,1),
(1,1,N'What does this code print?',N'x = 3
x = 7
print(x)',NULL,2),
(1,4,N'What does this code print?',N'print(2 + 3 * 4)',NULL,3),
(1,3,N'What is the type returned by input()?',N'age = input("Enter your age: ")',NULL,4),
(1,5,N'What does this code print?',N'score = 70
if score >= 70:
    print("Passed")
else:
    print("Try again")',NULL,5),
(1,6,N'What does this expression evaluate to?',N'True and False',NULL,6),
(1,7,N'Which values does this loop print?',N'for number in range(1, 4):
    print(number)',NULL,7),
(1,7,N'What is the final printed value?',N'total = 0
for number in [1, 2, 3]:
    total += number
print(total)',NULL,8),
(1,9,N'What does this code print?',N'def double(number):
    return number * 2

print(double(4))',NULL,9),
(1,12,N'What does this code print?',N'def greet(name):
    return "Hello, " + name

print(greet("Lujain"))',NULL,10),
(2,1,N'What is printed?',N'count = 2
count = count + 3
print(count)',N'The addition creates the integer 5, which is assigned back to count.',1),
(2,2,N'Which value is a float?',NULL,N'A decimal number without quotation marks is a float.',2),
(2,3,N'What is printed for input 4?',N'value = input()
print(value + "1")',N'input returns a string, so + joins the two strings.',3),
(2,4,N'What is printed?',N'price = 1.5
quantity = 2
print(f"{price * quantity:.2f}")',N'The product is 3.0; .2f displays two decimal places.',4),
(3,5,N'What is printed?',N'score = 70
if score > 70:
    print("A")
else:
    print("B")',N'> excludes equality, so 70 > 70 is false.',1),
(3,6,N'What is the value?',N'not (True or False)',N'True or False is True, then not reverses it.',2),
(3,7,N'What is printed?',N'total = 0
for number in range(2, 5):
    total += number
print(total)',N'The loop adds 2, 3 and 4.',3),
(3,8,N'What is printed?',N'count = 1
while count < 4:
    count += 1
print(count)',N'The last update makes count 4, so the next condition is false.',4),
(4,9,N'What is printed?',N'def add(a, b):
    return a + b
print(add(3, 4))',N'return sends the sum back to print.',1),
(4,10,N'What is printed?',N'values = [2, 4]
values.append(6)
print(values[-1])',N'Index -1 selects the last item, which is now 6.',2),
(4,11,N'What is printed?',N'task = {"done": False}
task["done"] = True
print(task["done"])',N'Assigning to the existing key updates its value.',3),
(4,12,N'Which extra test checks a boundary?',N'def total(values):
    return sum(values)',N'An empty collection checks the zero-item case.',4),
(5,1,N'What does the second print(name) display?',N'name = "Lujain"
print(name)

name = "Loji"
print(name)',N'The second assignment makes name refer to "Loji".',1),
(6,2,N'Which value has the type bool?',N'name = "Lujain"
age = 21
height = 1.64
is_learning = True

print(type(age))
print(type(is_learning))',N'True without quotation marks is a boolean. "True" is a string.',1),
(7,3,N'What type does input() return?',N'name = input()
print(f"Hello, {name}!")',N'input() returns a string, even when the user enters digits.',1),
(8,4,N'What is the result of int("3") * 2?',N'price = float(input())
quantity = int(input())
total = price * quantity

print(f"Total: {total:.2f}")',N'int("3") converts the text to the integer 3, and 3 * 2 is 6.',1),
(9,5,N'What is printed when score is 69?',N'score = 72
if score >= 70:
    print("Passed")
else:
    print("Try again")',N'69 >= 70 is false, so the else branch runs.',1),
(10,6,N'What does True and False evaluate to?',N'age = 18
has_ticket = True
print(age >= 18 and has_ticket)
print(not has_ticket)',N'and is true only when both operands are true.',1),
(11,7,N'What does range(1, 4) produce?',N'total = 0
for number in range(1, 4):
    total += number
print(total)',N'The start is included and the stop is excluded.',1),
(12,8,N'How many times does the loop body run when count starts at 0?',N'count = 3
while count > 0:
    print(count)
    count -= 1
print("Go")',N'The condition count > 0 is false before the first iteration.',1),
(13,9,N'What value does double(5) return?',N'def double(number):
    return number * 2

result = double(4)
print(result)',N'The return expression multiplies the argument by two.',1),
(14,10,N'Which expression gets the first score?',N'scores = [70, 85]
scores.append(90)
print(scores[0])
print(len(scores))',N'Python lists use zero-based indexing.',1),
(15,11,N'What does student.get("missing", 0) return?',N'student = {"name": "Lujain", "score": 85}
student["score"] = 90
print(student["name"])
print(student.get("level", 1))',N'get returns its default argument when the key does not exist.',1),
(16,12,N'Which extra case is most useful when testing count_done?',N'def count_done(tasks):
    return sum(1 for task in tasks if task["done"])

tasks = [{"title": "Read", "done": True},
         {"title": "Code", "done": False}]
print(count_done(tasks))',N'An empty collection checks a case that the normal example does not cover.',1);
INSERT dbo.QuestionOptions (QuestionId,OptionText,IsCorrect,SortOrder) VALUES
(1,N'int',0,1),
(1,N'str',1,2),
(1,N'float',0,3),
(1,N'bool',0,4),
(2,N'3',0,1),
(2,N'7',1,2),
(2,N'10',0,3),
(2,N'An error',0,4),
(3,N'20',0,1),
(3,N'14',1,2),
(3,N'24',0,3),
(3,N'9',0,4),
(4,N'int',0,1),
(4,N'float',0,2),
(4,N'str',1,3),
(4,N'bool',0,4),
(5,N'Passed',1,1),
(5,N'Try again',0,2),
(5,N'Both messages',0,3),
(5,N'Nothing',0,4),
(6,N'True',0,1),
(6,N'False',1,2),
(6,N'None',0,3),
(6,N'An error',0,4),
(7,N'1, 2, 3',1,1),
(7,N'1, 2, 3, 4',0,2),
(7,N'0, 1, 2, 3',0,3),
(7,N'4',0,4),
(8,N'3',0,1),
(8,N'5',0,2),
(8,N'6',1,3),
(8,N'0',0,4),
(9,N'4',0,1),
(9,N'6',0,2),
(9,N'8',1,3),
(9,N'An error',0,4),
(10,N'Hello, name',0,1),
(10,N'Hello, Lujain',1,2),
(10,N'greet',0,3),
(10,N'Nothing',0,4),
(11,N'2',0,1),
(11,N'5',1,2),
(11,N'23',0,3),
(12,N'"2.5"',0,1),
(12,N'2',0,2),
(12,N'2.5',1,3),
(13,N'5',0,1),
(13,N'41',1,2),
(13,N'An error',0,3),
(14,N'3',0,1),
(14,N'3.00',1,2),
(14,N'1.52',0,3),
(15,N'A',0,1),
(15,N'B',1,2),
(15,N'A and B',0,3),
(16,N'True',0,1),
(16,N'False',1,2),
(16,N'None',0,3),
(17,N'9',1,1),
(17,N'14',0,2),
(17,N'5',0,3),
(18,N'3',0,1),
(18,N'4',1,2),
(18,N'5',0,3),
(19,N'34',0,1),
(19,N'7',1,2),
(19,N'None',0,3),
(20,N'2',0,1),
(20,N'3',0,2),
(20,N'6',1,3),
(21,N'False',0,1),
(21,N'True',1,2),
(21,N'done',0,3),
(22,N'total([1, 2]) twice',0,1),
(22,N'total([])',1,2),
(22,N'Renaming total',0,3),
(23,N'Lujain',0,1),
(23,N'Loji',1,2),
(23,N'name',0,3),
(24,N'"True"',0,1),
(24,N'21',0,2),
(24,N'True',1,3),
(25,N'str',1,1),
(25,N'int',0,2),
(25,N'bool',0,3),
(26,N'"33"',0,1),
(26,N'6',1,2),
(26,N'An error',0,3),
(27,N'Passed',0,1),
(27,N'Try again',1,2),
(27,N'Both messages',0,3),
(28,N'True',0,1),
(28,N'False',1,2),
(28,N'None',0,3),
(29,N'1, 2, 3',1,1),
(29,N'1, 2, 3, 4',0,2),
(29,N'0, 1, 2, 3',0,3),
(30,N'0',1,1),
(30,N'1',0,2),
(30,N'Forever',0,3),
(31,N'5',0,1),
(31,N'10',1,2),
(31,N'None',0,3),
(32,N'scores[1]',0,1),
(32,N'scores[0]',1,2),
(32,N'scores.first',0,3),
(33,N'An error',0,1),
(33,N'0',1,2),
(33,N'None',0,3),
(34,N'Only the same example again',0,1),
(34,N'An empty task list',1,2),
(34,N'Changing the function name',0,3);
UPDATE dbo.Assessments SET PublicationStatus='Published';
INSERT dbo.Enrollments (StudentId,CourseId,EvidenceOrigin) VALUES
(2,1,N'academic-seed'),
(3,1,N'academic-seed');
INSERT dbo.LessonCompletions (EnrollmentId,LessonId,CompletedAtUtc,CompletionMethod,EvidenceOrigin) VALUES
(1,1,N'2026-11-05T08:00:00.000',N'manual',N'academic-seed'),
(1,2,N'2026-11-05T08:00:00.000',N'manual',N'academic-seed'),
(1,3,N'2026-11-05T08:00:00.000',N'manual',N'academic-seed'),
(1,4,N'2026-11-05T08:00:00.000',N'manual',N'academic-seed');
INSERT dbo.AssessmentAttempts (UserId,AssessmentId,EvidenceOrigin) VALUES
(2,1,N'academic-seed'),
(2,2,N'academic-seed');
INSERT dbo.AttemptAnswers(AttemptId,QuestionId,AssessmentId,OptionId,ResponseKind,AnsweredAtUtc)
 SELECT a.AttemptId,q.QuestionId,a.AssessmentId,CASE WHEN a.AttemptId=1 AND q.SortOrder=10 THEN NULL ELSE o.OptionId END,CASE WHEN a.AttemptId=1 AND q.SortOrder=10 THEN 'unsure' ELSE 'option' END,SYSUTCDATETIME()
 FROM dbo.AssessmentAttempts a JOIN dbo.Questions q ON q.AssessmentId=a.AssessmentId JOIN dbo.QuestionOptions o ON o.QuestionId=q.QuestionId AND o.IsCorrect=1;
UPDATE dbo.AssessmentAttempts SET Status='Submitted',SubmittedAtUtc=SYSUTCDATETIME();
INSERT dbo.CodingTasks (LevelId,TaskCode,VersionNo,TaskKind,Title,Description,RequirementsText,StarterCode,SampleInput,SampleOutput,ReferenceSolution,SolutionExplanation,VerificationCode,SortOrder) VALUES
(1,N'student-profile',1,N'Exercise',N'Create a student profile',N'Create three variables and display a student''s details.',N'1. Set name to "Lujain", age to 21 and track to "Python".
2. Print one labeled value per line.
3. Match the expected output exactly.
4. Do not print additional text.',N'# Create the three variables

# Print the labeled values
',N'',N'Name: Lujain
Age: 21
Track: Python',N'name = "Lujain"
age = 21
track = "Python"

print(f"Name: {name}")
print(f"Age: {age}")
print(f"Track: {track}")',N'The variables store three different values. Each f-string adds the required label. Three print calls produce exactly three output lines.',N'
assert name == "Lujain" and age == 21 and track == "Python", "Create the requested variables with the correct values."',1),
(1,N'receipt',1,N'Exercise',N'Build a simple receipt',N'Read a price and quantity, then calculate the total.',N'1. Read the price from the first input line using float(input()).
2. Read the quantity from the second line using int(input()).
3. Use input() without prompt text.
4. Print Total: followed by the result with two decimal places.
5. Assume the inputs are valid non-negative numbers.',N'# Read price and quantity

# Calculate the total

# Print the formatted result
',N'2.5
3',N'Total: 7.50',N'price = float(input())
quantity = int(input())
total = price * quantity
print(f"Total: {total:.2f}")',N'float preserves decimal prices, while int represents a whole quantity. Multiplication calculates the total for any test input. The format specifier .2f produces the required money format.',NULL,2),
(2,N'grade-checker',1,N'Exercise',N'Check a grade',N'Use a condition to classify a score.',N'1. Read one integer score with input().
2. Print "Passed" for 70 or more; otherwise print "Try again".
3. Do not print input prompts.',N'# Read a score and choose a message
',N'70',N'Passed',N'score = int(input())
if score >= 70:
    print("Passed")
else:
    print("Try again")',N'Converting input to an integer allows numeric comparison. The inclusive boundary >= handles 70 correctly. Only one branch runs, so the output contains one message.',NULL,1),
(2,N'sum-numbers',1,N'Exercise',N'Sum a range',N'Practise loops and accumulators.',N'1. Read a non-negative integer n.
2. Calculate the sum of integers from 1 through n, including n.
3. Print only the sum.',N'# Read n, accumulate a total and print it
',N'5',N'15',N'n = int(input())
total = 0
for number in range(1, n + 1):
    total += number
print(total)',N'The accumulator lives outside the loop. Each iteration adds the next number. Including n + 1 as the stop includes n in the sum. An empty range leaves total at zero.',NULL,2),
(3,N'list-summary',1,N'Exercise',N'Summarise a list',N'Combine functions and lists to process input.',N'1. Read space-separated integers from a single input line.
2. Print the count on the first line and their sum on the second.
3. An empty input line should produce a count and sum of zero.',N'# Read, split and convert the input values
# Print the count and total
',N'2 4 6',N'3
12',N'values = [int(value) for value in input().split()]
print(len(values))
print(sum(values))',N'split() returns an empty list for an empty line. The comprehension converts each available item. len and sum return zero for the empty case, so no special output branch is needed.',NULL,1),
(3,N'task-manager',1,N'FinalProject',N'Build a Study Task Manager',N'Your final project: model tasks and report how many are complete.',N'1. Read an integer n, then n lines containing a task title and a status separated by a comma.
2. Status is "done" or "todo". Store records in a list of dictionaries.
3. Define count_done(tasks) to return the number of completed records. Each record uses the boolean key done.
4. Print "Completed: X/N" using the completed count and total. Handle n = 0.',N'def count_done(tasks):
    # Return the number of completed tasks
    return 0

# Read the task records and print the summary
',N'2
Read,done
Code,todo',N'Completed: 1/2',N'def count_done(tasks):
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

print(f"Completed: {count_done(tasks)}/{len(tasks)}")',N'The function receives data and returns a count without reading input. Each dictionary keeps related fields together. Comparing status with done creates a boolean. An empty list produces Completed: 0/0 naturally.',N'
assert callable(count_done), "Define count_done(tasks)."
assert count_done([]) == 0, "Handle an empty list."
assert count_done([{"done": True}, {"done": False}, {"done": True}]) == 2, "Count completed records."
assert isinstance(tasks, list) and all(isinstance(t, dict) and isinstance(t.get("done"), bool) for t in tasks), "Store tasks as dictionaries with boolean done values."',2);
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
(1,1,N'',N'Name: Lujain
Age: 21
Track: Python',1),
(2,1,N'2.5
3',N'Total: 7.50',1),
(2,2,N'4
2',N'Total: 8.00',1),
(2,3,N'0
5',N'Total: 0.00',1),
(2,4,N'1.25
4',N'Total: 5.00',1),
(3,1,N'70',N'Passed',1),
(3,2,N'69',N'Try again',1),
(3,3,N'0',N'Try again',1),
(3,4,N'100',N'Passed',1),
(4,1,N'5',N'15',1),
(4,2,N'0',N'0',1),
(4,3,N'1',N'1',1),
(4,4,N'10',N'55',1),
(5,1,N'2 4 6',N'3
12',1),
(5,2,N'',N'0
0',1),
(5,3,N'-2 2',N'2
0',1),
(5,4,N'7',N'1
7',1),
(6,1,N'2
Read,done
Code,todo',N'Completed: 1/2',1),
(6,2,N'0',N'Completed: 0/0',1),
(6,3,N'1
Revise,todo',N'Completed: 0/1',1),
(6,4,N'2
Learn,done
Build,done',N'Completed: 2/2',1);
INSERT dbo.TaskHints (TaskId,HintNo,HintText) VALUES
(1,1,N'Separate the data from its display: create a name, an age and a track before printing anything.'),
(1,2,N'Use one print per line. An f-string such as f"Name: {name}" inserts the value while keeping the label.'),
(2,1,N'Read the price and quantity separately. input() returns text, so convert both values before multiplying them.'),
(2,2,N'Use float for the price and int for the quantity. Format the calculated total with :.2f so zero and whole-number totals also show two decimal places.'),
(3,1,N'There are only two outcomes. Use an if branch for scores that pass and an else branch for everything else.'),
(3,2,N'The pass mark includes 70 itself. Compare using >= rather than >, and print exactly the message requested.'),
(4,1,N'Start a running total at zero before the loop. Add each number to that same total.'),
(4,2,N'range excludes its stop value. To include n, use range(1, n + 1). For n = 0 the loop should execute zero times.'),
(5,1,N'Split the input line into separate pieces, then convert each piece to an integer.'),
(5,2,N'A list comprehension can build the numeric list. len(values) gives its size and sum(values) its total; both handle an empty list.'),
(6,1,N'Represent each record as a dictionary with title and done keys. Convert the status text to a boolean as you read the input.'),
(6,2,N'Keep counting separate from input: count_done(tasks) should loop over the records and count those whose done value is True. Use len(tasks) for the total.');
UPDATE dbo.CodingTasks SET PublicationStatus='Published';
INSERT dbo.TaskWorkspaceState (EnrollmentId,TaskId,DraftCode,DraftInput,HasAttempted,HintsRevealedCount,SolutionViewed) VALUES
(1,1,N'# Mutable academic draft',N'',1,1,0);
INSERT dbo.CodeSubmissions (EnrollmentId,TaskId,CodeText,ExecutionEnvironment,RuntimeVersion,EvaluatorVersion,EvidenceOrigin) VALUES
(1,1,N'name = "Lujain"
age = 21
track = "Python"

print(f"Name: {name}")
print(f"Age: {age}")
print(f"Track: {track}")',N'Academic SQL fixture',NULL,N'fixture-v1',N'academic-seed'),
(1,2,N'print("wrong")',N'Academic SQL fixture',NULL,N'fixture-v1',N'academic-seed'),
(1,2,N'while True: pass',N'Academic SQL fixture',NULL,N'fixture-v1',N'academic-seed');
UPDATE dbo.CodeSubmissions SET EvaluationStatus='Running';
INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 1,TestCaseId,TaskId,1,ExpectedOutput,NULL,NULL,'Success' FROM dbo.TaskTestCases WHERE TaskId=1;
INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 2,TestCaseId,TaskId,0,N'wrong',NULL,NULL,'Success' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;
INSERT dbo.SubmissionTestResults(SubmissionId,TestCaseId,TaskId,Passed,ActualOutput,ErrorText,RuntimeMs,ExecutionStatus)
 SELECT 3,TestCaseId,TaskId,0,N'',N'Illustrative timeout; Python was not executed.',NULL,'Timeout' FROM dbo.TaskTestCases WHERE TaskId=2 AND CaseNo=1;
UPDATE dbo.CodeSubmissions SET EvaluationStatus='Completed',FinishedAtUtc=SYSUTCDATETIME() WHERE SubmissionId IN(1,2);
UPDATE dbo.CodeSubmissions SET EvaluationStatus='Error',FinishedAtUtc=SYSUTCDATETIME(),EvaluationError=N'Illustrative timeout' WHERE SubmissionId=3;
