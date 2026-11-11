/* Stable Python content. Existing ids and grading examples are preserved. */
(() => {
"use strict";
    const lesson = (id, title, conceptTitle, paragraphs, code, output, question, options, correct, explanation) => ({ id, title, conceptTitle, paragraphs, code, output, question, options, correct, explanation, minutes: 15, intro: paragraphs[0] });
    const levels = [
        { id: 1, title: "Python Foundations", lessons: window.pythonLessons, tasks: ["student-profile", "receipt"] },
        { id: 2, title: "Logic and Control Flow", tasks: ["grade-checker", "sum-numbers"], lessons: [
            lesson("conditions", "Conditions and decisions", "Choose a branch with if.", ["An if statement runs its indented block only when its condition is true.", "Use elif for another condition and else for the remaining cases. Python uses indentation to group statements.", "Compare values with ==, !=, <, <=, > and >=. The equals sign = assigns a value; == compares two values."], 'score = 72\nif score >= 70:\n    print("Passed")\nelse:\n    print("Try again")', "Passed", "What is printed when score is 69?", ["Passed", "Try again", "Both messages"], 1, "69 >= 70 is false, so the else branch runs."),
            lesson("boolean-logic", "Boolean logic", "Combine conditions carefully.", ["Use and when both conditions must be true, or when at least one must be true, and not to reverse a boolean.", "Parentheses make combined conditions easier to read. Comparisons are evaluated before and/or.", "Test values at the boundaries. A minimum age of 18 includes 18 when you use >=."], 'age = 18\nhas_ticket = True\nprint(age >= 18 and has_ticket)\nprint(not has_ticket)', "True\nFalse", "What does True and False evaluate to?", ["True", "False", "None"], 1, "and is true only when both operands are true."),
            lesson("for-loops", "For loops and ranges", "Repeat work for each value.", ["A for loop visits each item in a sequence. range(1, 4) produces 1, 2 and 3: the stop value is excluded.", "Place repeated statements inside the indented loop body.", "An accumulator starts before the loop and is updated on each iteration. += adds to the existing value."], 'total = 0\nfor number in range(1, 4):\n    total += number\nprint(total)', "6", "What does range(1, 4) produce?", ["1, 2, 3", "1, 2, 3, 4", "0, 1, 2, 3"], 0, "The start is included and the stop is excluded."),
            lesson("while-loops", "While loops", "Repeat until a condition changes.", ["A while loop repeats while its condition remains true. It can execute zero times.", "Update the condition inside the loop so it eventually becomes false. Missing that update often creates an infinite loop.", "Use break to exit a loop early. The coding workspace lets you stop a program and enforces a time limit."], 'count = 3\nwhile count > 0:\n    print(count)\n    count -= 1\nprint("Go")', "3\n2\n1\nGo", "How many times does the loop body run when count starts at 0?", ["0", "1", "Forever"], 0, "The condition count > 0 is false before the first iteration.")
        ] },
        { id: 3, title: "Functions and Collections", tasks: ["list-summary", "task-manager"], lessons: [
            lesson("functions", "Functions and return values", "Give reusable work a name.", ["Define a function with def, give its inputs meaningful parameter names and indent its body.", "return sends a result to the caller. print displays text and does not replace a return value.", "Call a function with arguments. A function without an explicit return returns None."], 'def double(number):\n    return number * 2\n\nresult = double(4)\nprint(result)', "8", "What value does double(5) return?", ["5", "10", "None"], 1, "The return expression multiplies the argument by two."),
            lesson("lists", "Lists and indexing", "Keep related values together.", ["A list stores an ordered collection. Indexes start at zero: items[0] is the first item.", "append adds an item at the end. len returns the number of items. A negative index such as -1 selects from the end.", "Loop over a list to process each value. Check that a list is not empty before accessing its first item."], 'scores = [70, 85]\nscores.append(90)\nprint(scores[0])\nprint(len(scores))', "70\n3", "Which expression gets the first score?", ["scores[1]", "scores[0]", "scores.first"], 1, "Python lists use zero-based indexing."),
            lesson("dictionaries", "Dictionaries", "Look up a value by its key.", ["A dictionary maps unique keys to values. Use square brackets to read an existing key.", "Assign to a key to add or update a value. Use .get(key, default) when the key might be missing.", "Dictionary values can include lists, numbers, strings and other dictionaries."], 'student = {"name": "Lujain", "score": 85}\nstudent["score"] = 90\nprint(student["name"])\nprint(student.get("level", 1))', "Lujain\n1", 'What does student.get("missing", 0) return?', ["An error", "0", "None"], 1, "get returns its default argument when the key does not exist."),
            lesson("problem-solving", "Build a small program", "Break a task into smaller steps.", ["Start with the required inputs and outputs, then split the program into functions you can test separately.", "Use a list of dictionaries to represent several records with named fields.", "Test normal cases, empty collections and boundary values. A passing sample alone does not prove that a program handles every case."], 'def count_done(tasks):\n    return sum(1 for task in tasks if task["done"])\n\ntasks = [{"title": "Read", "done": True},\n         {"title": "Code", "done": False}]\nprint(count_done(tasks))', "1", "Which extra case is most useful when testing count_done?", ["Only the same example again", "An empty task list", "Changing the function name"], 1, "An empty collection checks a case that the normal example does not cover.")
        ] }
    ];
    levels.push(...(window.pythonExtension?.levels || []));
    const levelGuides = [
        { stage: "Foundations", goal: "Use values, input, output and arithmetic to write small useful programs.", objectives: ["Store and describe values", "Read and format input", "Calculate numeric results"], progression: "Complete all four lessons, then score at least 70% on the level quiz. Coding tasks are optional practice." },
        { stage: "Control flow", goal: "Make decisions and repeat work with conditions and loops.", objectives: ["Compare values and combine conditions", "Choose branches with if/elif/else", "Repeat work with for and while loops"], progression: "Complete all four lessons, then score at least 70% on the level quiz. Coding tasks are optional practice." },
        { stage: "Reusable data and problem solving", goal: "Organize data, reuse logic and test complete solutions.", objectives: ["Write functions with inputs and return values", "Store related data in lists and dictionaries", "Break problems down and check edge cases"], progression: "Complete all four lessons, then score at least 70% on the level quiz. Coding tasks are optional practice." }
    ];
    const topicGuides = {
        variables: ["Give values clear names and update them safely.", "Build a learner card", 'name = "Maya"\nage = 20\n# Print: Name: Maya, then Age: 20\n'],
        "data-types": ["Recognize strings, integers, floats and booleans and choose the right type.", "Summarise typed values", "count = 3\nprice = 1.5\nis_ready = True\n# Print 4, 1.5, then ready\n"],
        "input-output": ["Read text with input() and present it with print() or an f-string.", "Write a greeting", 'name = input()\n# Print: Hello, <name>!\n', "Maya"],
        numbers: ["Convert numeric input, calculate with it and format a result.", "Calculate a total", "price = float(input())\nquantity = int(input())\n# Print Total: followed by price * quantity with 2 decimals\n", "2.5\n3"],
        conditions: ["Use comparisons and branches to handle different cases.", "Check a passing score", "score = int(input())\n# Print Passed when score >= 70, otherwise Try again\n", "70"],
        "boolean-logic": ["Combine conditions with and/or/not and test boundary values.", "Check access rules", 'age = int(input())\nhas_ticket = input() == "yes"\n# Print Allowed only when age >= 18 and has_ticket\n', "18\nyes"],
        "for-loops": ["Use range() and an accumulator to process a known sequence.", "Sum from one to n", "n = int(input())\ntotal = 0\n# Add each number from 1 through n, then print total\n", "4"],
        "while-loops": ["Repeat while a condition holds and update it to avoid endless loops.", "Count down", "count = int(input())\nwhile count > 0:\n    # print count and decrease it\n    pass\nprint(\"Go\")\n", "3"],
        functions: ["Define a function, accept arguments and return a useful result.", "Create an add function", "def add(a, b):\n    # Return the sum\n    pass\n\nprint(add(int(input()), int(input())))\n", "3\n4"],
        lists: ["Store ordered values and safely use indexing and len().", "Summarise scores", "scores = list(map(int, input().split()))\n# Print the first score, then the number of scores\n", "70 85 90"],
        dictionaries: ["Map named keys to values and update a value through its key.", "Update a learner score", 'name = input()\nscore = int(input())\nstudent = {"name": name, "score": score}\n# Add 5 to score, then print name and score\n', "Maya\n80"],
        "problem-solving": ["Split a task into steps and verify normal and edge cases.", "Count completed items", 'states = input().split()\n# Print Completed: <done count>/<total count>\n', "done todo done"]
    };
    levels.forEach((item, index) => {
        const guide = levelGuides[index] || item;
        Object.assign(item, guide);
        item.lessons.forEach(topic => {
            const details = topicGuides[topic.id];
            if (details) Object.assign(topic, { objectives: [details[0]], exercise: { title: details[1], starter: details[2], input: details[3] || "" } });
        });
    });
    const quiz = (question, code, options, correct, explanation) => ({ question, code, options, correct, explanation });
    levels[0].quiz = [
        quiz("What is printed?", 'count = 2\ncount = count + 3\nprint(count)', ["2", "5", "23"], 1, "The addition creates the integer 5, which is assigned back to count."),
        quiz("Which value is a float?", "", ['"2.5"', "2", "2.5"], 2, "A decimal number without quotation marks is a float."),
        quiz("What is printed for input 4?", 'value = input()\nprint(value + "1")', ["5", "41", "An error"], 1, "input returns a string, so + joins the two strings."),
        quiz("What is printed?", 'price = 1.5\nquantity = 2\nprint(f"{price * quantity:.2f}")', ["3", "3.00", "1.52"], 1, "The product is 3.0; .2f displays two decimal places.")
    ];
    levels[1].quiz = [
        quiz("What is printed?", 'score = 70\nif score > 70:\n    print("A")\nelse:\n    print("B")', ["A", "B", "A and B"], 1, "> excludes equality, so 70 > 70 is false."),
        quiz("What is the value?", 'not (True or False)', ["True", "False", "None"], 1, "True or False is True, then not reverses it."),
        quiz("What is printed?", 'total = 0\nfor number in range(2, 5):\n    total += number\nprint(total)', ["9", "14", "5"], 0, "The loop adds 2, 3 and 4."),
        quiz("What is printed?", 'count = 1\nwhile count < 4:\n    count += 1\nprint(count)', ["3", "4", "5"], 1, "The last update makes count 4, so the next condition is false.")
    ];
    levels[2].quiz = [
        quiz("What is printed?", 'def add(a, b):\n    return a + b\nprint(add(3, 4))', ["34", "7", "None"], 1, "return sends the sum back to print."),
        quiz("What is printed?", 'values = [2, 4]\nvalues.append(6)\nprint(values[-1])', ["2", "3", "6"], 2, "Index -1 selects the last item, which is now 6."),
        quiz("What is printed?", 'task = {"done": False}\ntask["done"] = True\nprint(task["done"])', ["False", "True", "done"], 1, "Assigning to the existing key updates its value."),
        quiz("Which extra test checks a boundary?", 'def total(values):\n    return sum(values)', ["total([1, 2]) twice", "total([])", "Renaming total"], 1, "An empty collection checks the zero-item case.")
    ];
    const allLessons = levels.flatMap(level => level.lessons);
    for (const topic of (window.pythonExtension?.levels || []).flatMap(level => level.lessons)) {
        window.pythonLessonSources[topic.id] = [{ title: "Python documentation", url: "https://docs.python.org/3/tutorial/", type: "Documentation", language: "English" }];
    }

const tasks = {
    "student-profile": {
        title: "Create a student profile",
        description:
            "Create three variables and display a student's details.",
        requirements: [
            'Set name to "Lujain", age to 21 and track to "Python".',
            "Print one labeled value per line.",
            "Match the expected output exactly.",
            "Do not print additional text."
        ],
        input: "",
        output: "Name: Lujain\nAge: 21\nTrack: Python",
        tests: [{ input: "", output: "Name: Lujain\nAge: 21\nTrack: Python" }],
        verify: '\nassert name == "Lujain" and age == 21 and track == "Python", "Create the requested variables with the correct values."',
        starter:
            "# Create the three variables\n\n" +
            "# Print the labeled values\n"
    },

    receipt: {
        title: "Build a simple receipt",
        description:
            "Read a price and quantity, then calculate the total.",
        requirements: [
            "Read the price from the first input line using float(input()).",
            "Read the quantity from the second line using int(input()).",
            "Use input() without prompt text.",
            "Print Total: followed by the result with two decimal places.",
            "Assume the inputs are valid non-negative numbers."
        ],
        input: "2.5\n3",
        output: "Total: 7.50",
        tests: [{ input: "2.5\n3", output: "Total: 7.50" }, { input: "4\n2", output: "Total: 8.00" }, { input: "0\n5", output: "Total: 0.00" }, { input: "1.25\n4", output: "Total: 5.00" }],
        starter:
            "# Read price and quantity\n\n" +
            "# Calculate the total\n\n" +
            "# Print the formatted result\n"
    }
};

Object.assign(tasks, {
    "grade-checker": {
        title: "Check a grade", description: "Use a condition to classify a score.",
        requirements: ["Read one integer score with input().", 'Print "Passed" for 70 or more; otherwise print "Try again".', "Do not print input prompts."],
        input: "70", output: "Passed", starter: "# Read a score and choose a message\n",
        tests: [{input:"70",output:"Passed"},{input:"69",output:"Try again"},{input:"0",output:"Try again"},{input:"100",output:"Passed"}]
    },
    "sum-numbers": {
        title: "Sum a range", description: "Practise loops and accumulators.",
        requirements: ["Read a non-negative integer n.", "Calculate the sum of integers from 1 through n, including n.", "Print only the sum."],
        input: "5", output: "15", starter: "# Read n, accumulate a total and print it\n",
        tests: [{input:"5",output:"15"},{input:"0",output:"0"},{input:"1",output:"1"},{input:"10",output:"55"}]
    },
    "list-summary": {
        title: "Summarise a list", description: "Combine functions and lists to process input.",
        requirements: ["Read space-separated integers from a single input line.", "Print the count on the first line and their sum on the second.", "An empty input line should produce a count and sum of zero."],
        input: "2 4 6", output: "3\n12", starter: "# Read, split and convert the input values\n# Print the count and total\n",
        tests: [{input:"2 4 6",output:"3\n12"},{input:"",output:"0\n0"},{input:"-2 2",output:"2\n0"},{input:"7",output:"1\n7"}]
    },
    "task-manager": {
        title: "Build a Study Task Manager", description: "Your final project: model tasks and report how many are complete.",
        requirements: ["Read an integer n, then n lines containing a task title and a status separated by a comma.", 'Status is "done" or "todo". Store records in a list of dictionaries.', "Define count_done(tasks) to return the number of completed records. Each record uses the boolean key done.", 'Print "Completed: X/N" using the completed count and total. Handle n = 0.'],
        input: "2\nRead,done\nCode,todo", output: "Completed: 1/2",
        starter: 'def count_done(tasks):\n    # Return the number of completed tasks\n    return 0\n\n# Read the task records and print the summary\n',
        verify: '\nassert callable(count_done), "Define count_done(tasks)."\nassert count_done([]) == 0, "Handle an empty list."\nassert count_done([{"done": True}, {"done": False}, {"done": True}]) == 2, "Count completed records."\nassert isinstance(tasks, list) and all(isinstance(t, dict) and isinstance(t.get("done"), bool) for t in tasks), "Store tasks as dictionaries with boolean done values."',
        tests: [{input:"2\nRead,done\nCode,todo",output:"Completed: 1/2"},{input:"0",output:"Completed: 0/0"},{input:"1\nRevise,todo",output:"Completed: 0/1"},{input:"2\nLearn,done\nBuild,done",output:"Completed: 2/2"}]
    }
});
Object.assign(tasks, Object.fromEntries((window.pythonExtension?.tasks || []).map(task => [task.id, task])));

const guides = (() => {
    const tasks = {
        "student-profile": {
            title: "Create a student profile", topics: ["variables", "input-output"],
            hints: ["Separate the data from its display: create a name, an age and a track before printing anything.", "Use one print per line. An f-string such as f\"Name: {name}\" inserts the value while keeping the label."],
            solution: 'name = "Lujain"\nage = 21\ntrack = "Python"\n\nprint(f"Name: {name}")\nprint(f"Age: {age}")\nprint(f"Track: {track}")',
            explanation: "The variables store three different values. Each f-string adds the required label. Three print calls produce exactly three output lines."
        },
        receipt: {
            title: "Build a receipt", topics: ["numbers", "input-output"],
            hints: ["Read the price and quantity separately. input() returns text, so convert both values before multiplying them.", "Use float for the price and int for the quantity. Format the calculated total with :.2f so zero and whole-number totals also show two decimal places."],
            solution: 'price = float(input())\nquantity = int(input())\ntotal = price * quantity\nprint(f"Total: {total:.2f}")',
            explanation: "float preserves decimal prices, while int represents a whole quantity. Multiplication calculates the total for any test input. The format specifier .2f produces the required money format."
        },
        "grade-checker": {
            title: "Check a grade", topics: ["conditions", "boolean-logic"],
            hints: ["There are only two outcomes. Use an if branch for scores that pass and an else branch for everything else.", "The pass mark includes 70 itself. Compare using >= rather than >, and print exactly the message requested."],
            solution: 'score = int(input())\nif score >= 70:\n    print("Passed")\nelse:\n    print("Try again")',
            explanation: "Converting input to an integer allows numeric comparison. The inclusive boundary >= handles 70 correctly. Only one branch runs, so the output contains one message."
        },
        "sum-numbers": {
            title: "Sum a range", topics: ["for-loops", "while-loops"],
            hints: ["Start a running total at zero before the loop. Add each number to that same total.", "range excludes its stop value. To include n, use range(1, n + 1). For n = 0 the loop should execute zero times."],
            solution: 'n = int(input())\ntotal = 0\nfor number in range(1, n + 1):\n    total += number\nprint(total)',
            explanation: "The accumulator lives outside the loop. Each iteration adds the next number. Including n + 1 as the stop includes n in the sum. An empty range leaves total at zero."
        },
        "list-summary": {
            title: "Summarise a list", topics: ["lists", "functions"],
            hints: ["Split the input line into separate pieces, then convert each piece to an integer.", "A list comprehension can build the numeric list. len(values) gives its size and sum(values) its total; both handle an empty list."],
            solution: 'values = [int(value) for value in input().split()]\nprint(len(values))\nprint(sum(values))',
            explanation: "split() returns an empty list for an empty line. The comprehension converts each available item. len and sum return zero for the empty case, so no special output branch is needed."
        },
        "task-manager": {
            title: "Study Task Manager", topics: ["problem-solving", "dictionaries", "functions"],
            hints: ["Represent each record as a dictionary with title and done keys. Convert the status text to a boolean as you read the input.", "Keep counting separate from input: count_done(tasks) should loop over the records and count those whose done value is True. Use len(tasks) for the total."],
            solution: 'def count_done(tasks):\n    count = 0\n    for task in tasks:\n        if task["done"]:\n            count += 1\n    return count\n\nn = int(input())\ntasks = []\nfor _ in range(n):\n    title, status = input().split(",")\n    tasks.append({"title": title, "done": status == "done"})\n\nprint(f"Completed: {count_done(tasks)}/{len(tasks)}")',
            explanation: "The function receives data and returns a count without reading input. Each dictionary keeps related fields together. Comparing status with done creates a boolean. An empty list produces Completed: 0/0 naturally."
        }
    };
    Object.assign(tasks, Object.fromEntries((window.pythonExtension?.tasks || []).map(task => [task.id, task])));

return tasks;
})();
for (const [id, task] of Object.entries(tasks)) Object.assign(task, { ...guides[id], ...task, id });
window.curriculumRegistry.register({ id: "python", name: "Python", runner: "python", status: "ready", levels, tasks, guides, sources: window.pythonLessonSources, projectTask: "task-manager", extension: "py" });
})();
