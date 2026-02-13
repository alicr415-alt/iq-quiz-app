// js/data.js

// Main category + subcategory configuration, including theme classes
const CATEGORY_GROUPS = [
  {
    id: "gk",
    name: "General Knowledge",
    themeClass: "theme-gk",
    subcategories: [
      {
        id: "gk-mixed-api",
        name: "Mixed (API)",
        type: "api",
        apiCategoryId: 9, // Open Trivia DB: General Knowledge
        subThemeClass: "subtheme-gk-mixed"
      },
      {
        id: "gk-geography",
        name: "Geography (Local)",
        type: "local",
        jsonPath: "data/questions-gk-geography.json",
        subThemeClass: "subtheme-gk-geography"
      },
      {
        id: "gk-history",
        name: "History (Local)",
        type: "local",
        jsonPath: "data/questions-gk-history.json",
        subThemeClass: "subtheme-gk-history"
      }
    ]
  },
  {
    id: "science",
    name: "Science",
    themeClass: "theme-science",
    subcategories: [
      {
        id: "science-mixed-api",
        name: "Mixed (API)",
        type: "api",
        apiCategoryId: 17, // Open Trivia DB: Science & Nature-ish
        subThemeClass: "subtheme-science-mixed"
      },
      {
        id: "science-physics",
        name: "Physics (Local)",
        type: "local",
        jsonPath: "data/questions-science-physics.json",
        subThemeClass: "subtheme-science-physics"
      },
      {
        id: "science-biology",
        name: "Biology (Local)",
        type: "local",
        jsonPath: "data/questions-science-biology.json",
        subThemeClass: "subtheme-science-biology"
      }
    ]
  },
  {
    id: "sports",
    name: "Sports",
    themeClass: "theme-sports",
    subcategories: [
      {
        id: "sports-mixed-api",
        name: "Mixed (API)",
        type: "api",
        apiCategoryId: 21, // Open Trivia DB: Sports
        subThemeClass: "subtheme-sports-mixed"
      },
      {
        id: "sports-football",
        name: "Football (Local)",
        type: "local",
        jsonPath: "data/questions-sports-football.json",
        subThemeClass: "subtheme-sports-football"
      },
      {
        id: "sports-cricket",
        name: "Cricket (Local)",
        type: "local",
        jsonPath: "data/questions-sports-cricket.json",
        subThemeClass: "subtheme-sports-cricket"
      },
      {
        id: "sports-basketball",
        name: "Basketball (Local)",
        type: "local",
        jsonPath: "data/questions-sports-basketball.json",
        subThemeClass: "subtheme-sports-basketball"
      }
    ]
  }
];

// ---------- Helpers to find groups / subcategories ----------

function findGroupById(groupId) {
  return (
    CATEGORY_GROUPS.find((g) => g.id === groupId) || CATEGORY_GROUPS[0]
  );
}

function findSubcategoryById(subId) {
  for (const group of CATEGORY_GROUPS) {
    const sub = group.subcategories.find((s) => s.id === subId);
    if (sub) {
      return { group, subcategory: sub };
    }
  }
  // Fallback: first group / first subcategory
  const fallbackGroup = CATEGORY_GROUPS[0];
  return {
    group: fallbackGroup,
    subcategory: fallbackGroup.subcategories[0]
  };
}

// ---------- Question loading ----------

async function loadQuestionsForSubcategory(subId, desiredAmount, difficulty) {
  const { subcategory } = findSubcategoryById(subId);
  if (!subcategory) return [];

  if (subcategory.type === "api") {
    return loadFromTriviaDB(
      subcategory.apiCategoryId,
      desiredAmount,
      difficulty
    );
  } else if (subcategory.type === "local") {
    return loadFromLocalJson(subcategory.jsonPath);
  }

  return [];
}

// Load from Open Trivia DB (for "Mixed (API)" subcategories)
async function loadFromTriviaDB(categoryId, amount, difficulty) {
  const baseUrl = "https://opentdb.com/api.php";
  const params = new URLSearchParams();
  params.append("amount", String(amount || 10));
  if (categoryId) params.append("category", String(categoryId));
  if (difficulty && difficulty !== "mixed") {
    params.append("difficulty", difficulty);
  }
  params.append("type", "multiple");

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();

  const results = Array.isArray(data.results) ? data.results : [];
  return results.map(normaliseTriviaQuestion);
}

// Load from local JSON (your question files)
async function loadFromLocalJson(jsonPath) {
  const res = await fetch(jsonPath);
  const data = await res.json();

  if (!Array.isArray(data)) return [];

  // Your JSON already has question, options, answerIndex, difficulty
  return data.map((q) => ({
    question: q.question,
    options: q.options,
    answerIndex: q.answerIndex,
    difficulty: q.difficulty || "mixed"
  }));
}

// Normalise Open Trivia DB structure to local question format
function normaliseTriviaQuestion(item) {
  const decode = (str) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
  };

  const question = decode(item.question);
  const correct = decode(item.correct_answer);
  const incorrect = item.incorrect_answers.map(decode);

  const options = [...incorrect, correct];
  // simple shuffle
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  const answerIndex = options.indexOf(correct);

  return {
    question,
    options,
    answerIndex,
    difficulty: item.difficulty || "mixed"
  };
}
