/* Versioned banks. Python order/options remain compatible with legacy attempts. */
(function(root){
"use strict";
const python = [
    {
        topic: "Variables and data types",
        title: "What is the type of this value?",
        code: 'name = "Lujain"',
        options: ["int", "str", "float", "bool"],
        correct: 1
    },
    {
        topic: "Variables and data types",
        title: "What does this code print?",
        code: "x = 3\nx = 7\nprint(x)",
        options: ["3", "7", "10", "An error"],
        correct: 1
    },
    {
        topic: "Variables and data types",
        title: "What does this code print?",
        code: "print(2 + 3 * 4)",
        options: ["20", "14", "24", "9"],
        correct: 1
    },
    {
        topic: "Variables and data types",
        title: "What is the type returned by input()?",
        code: 'age = input("Enter your age: ")',
        options: ["int", "float", "str", "bool"],
        correct: 2
    },
    {
        topic: "Conditions and logic",
        title: "What does this code print?",
        code: 'score = 70\nif score >= 70:\n    print("Passed")\nelse:\n    print("Try again")',
        options: ["Passed", "Try again", "Both messages", "Nothing"],
        correct: 0
    },
    {
        topic: "Conditions and logic",
        title: "What does this expression evaluate to?",
        code: "True and False",
        options: ["True", "False", "None", "An error"],
        correct: 1
    },
    {
        topic: "Loops and iteration",
        title: "Which values does this loop print?",
        code: "for number in range(1, 4):\n    print(number)",
        options: ["1, 2, 3", "1, 2, 3, 4", "0, 1, 2, 3", "4"],
        correct: 0
    },
    {
        topic: "Loops and iteration",
        title: "What is the final printed value?",
        code: "total = 0\nfor number in [1, 2, 3]:\n    total += number\nprint(total)",
        options: ["3", "5", "6", "0"],
        correct: 2
    },
    {
        topic: "Functions and code reading",
        title: "What does this code print?",
        code: "def double(number):\n    return number * 2\n\nprint(double(4))",
        options: ["4", "6", "8", "An error"],
        correct: 2
    },
    {
        topic: "Functions and code reading",
        title: "What does this code print?",
        code: 'def greet(name):\n    return "Hello, " + name\n\nprint(greet("Lujain"))',
        options: [
            "Hello, name",
            "Hello, Lujain",
            "greet",
            "Nothing"
        ],
        correct: 1
    }
];
const levels=[1,1,1,1,2,2,2,2,3,3];
const pythonQuestions=python.map((question,index)=>({...question,id:"python-placement-"+(index+1),level:levels[index]}));
const javascriptQuestions=[
  {
    "id": "javascript-placement-1",
    "level": 1,
    "topic": "Values and input",
    "title": "What is the type of this value?",
    "code": "const value = \"21\";\nconsole.log(typeof value);",
    "options": [
      "number",
      "string",
      "boolean"
    ],
    "correct": 1
  },
  {
    "id": "javascript-placement-2",
    "level": 1,
    "topic": "Values and input",
    "title": "What is printed?",
    "code": "let count = 2;\ncount += 3;\nconsole.log(count);",
    "options": [
      "2",
      "5",
      "23"
    ],
    "correct": 1
  },
  {
    "id": "javascript-placement-3",
    "level": 1,
    "topic": "Values and input",
    "title": "What is printed for input 4?",
    "code": "console.log(Number(input()) + 1);",
    "options": [
      "5",
      "41",
      "NaN"
    ],
    "correct": 0
  },
  {
    "id": "javascript-placement-4",
    "level": 1,
    "topic": "Values and input",
    "title": "What is printed?",
    "code": "console.log((1.5 * 2).toFixed(2));",
    "options": [
      "3",
      "3.00",
      "1.52"
    ],
    "correct": 1
  },
  {
    "id": "javascript-placement-5",
    "level": 2,
    "topic": "Conditions and logic",
    "title": "What is printed?",
    "code": "const score = 70;\nif (score > 70) console.log(\"A\");\nelse console.log(\"B\");",
    "options": [
      "A",
      "B",
      "Both"
    ],
    "correct": 1
  },
  {
    "id": "javascript-placement-6",
    "level": 2,
    "topic": "Conditions and logic",
    "title": "What does this evaluate to?",
    "code": "true && false",
    "options": [
      "true",
      "false",
      "undefined"
    ],
    "correct": 1
  },
  {
    "id": "javascript-placement-7",
    "level": 2,
    "topic": "Loops and iteration",
    "title": "Which values are printed?",
    "code": "for (let i = 1; i < 4; i++) console.log(i);",
    "options": [
      "1, 2, 3",
      "1, 2, 3, 4",
      "0, 1, 2, 3"
    ],
    "correct": 0
  },
  {
    "id": "javascript-placement-8",
    "level": 2,
    "topic": "Loops and iteration",
    "title": "What is printed?",
    "code": "let total = 0;\nfor (const value of [1, 2, 3]) total += value;\nconsole.log(total);",
    "options": [
      "3",
      "5",
      "6"
    ],
    "correct": 2
  },
  {
    "id": "javascript-placement-9",
    "level": 3,
    "topic": "Functions and collections",
    "title": "What is printed?",
    "code": "function double(value) { return value * 2; }\nconsole.log(double(4));",
    "options": [
      "4",
      "6",
      "8"
    ],
    "correct": 2
  },
  {
    "id": "javascript-placement-10",
    "level": 3,
    "topic": "Functions and collections",
    "title": "What is printed?",
    "code": "const values = [2, 4];\nvalues.push(6);\nconsole.log(values.length);",
    "options": [
      "2",
      "3",
      "6"
    ],
    "correct": 1
  },
  {
    "id": "javascript-placement-11",
    "level": 3,
    "topic": "Functions and collections",
    "title": "What is printed?",
    "code": "const task = {done: false};\ntask.done = true;\nconsole.log(task.done);",
    "options": [
      "true",
      "false",
      "undefined"
    ],
    "correct": 0
  },
  {
    "id": "javascript-placement-12",
    "level": 3,
    "topic": "Functions and collections",
    "title": "What does this return?",
    "code": "function countDone(tasks) { return tasks.filter(task => task.done).length; }\ncountDone([]);",
    "options": [
      "0",
      "1",
      "undefined"
    ],
    "correct": 0
  }
];
const entries={python:Object.freeze({id:"python",version:1,levelCount:6,questions:pythonQuestions}),javascript:Object.freeze({id:"javascript",version:1,levelCount:3,questions:javascriptQuestions})};
const api=Object.freeze({get:id=>entries[id]||null,all:()=>Object.values(entries)});
root.placementBanks=api;
if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof window==="object"?window:globalThis);
