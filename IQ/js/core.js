console.log("IQ app initialising...");

  // ---------- State ----------
  let currentQuestions = [];
  let currentIndex = 0;

  let mode = "solo"; // "solo" or "vs"
  let scores = { 1: 0, 2: 0 };

  let playerNames = {
    1: "Player 1",
    2: "Player 2"
  };

  let currentGroup = CATEGORY_GROUPS[0];
  let currentSubcategory = currentGroup.subcategories[0];

  let currentThemeClass = "";
  let currentSubthemeClass = "";

  let quizLength = 10;
  let quizDifficulty = "mixed";

  let answers = []; // per-question selected indices (null if unanswered)

  let timerId = null;
  let timeRemaining = 0; // seconds
  const SECONDS_PER_QUESTION = 60;

  let quizEnded = false; // prevents double-ending

  // Emoji icons for UI
  const GROUP_ICONS = {
    gk: "🧠",
    science: "🔬",
    sports: "⚽"
  };

  const SUBCATEGORY_ICONS = {
    "gk-mixed": "🎲",
    "gk-geography": "🌍",
    "gk-history": "🏛️",
    "science-mixed": "🎲",
    "science-physics": "⚡",
    "science-biology": "🧬",
    "sports-mixed": "🎲",
    "sports-football": "⚽",
    "sports-cricket": "🏏",
    "sports-basketball": "🏀"
  };

  // ---------- Helpers ----------
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getTimeLimitSeconds(numQuestions) {
    return numQuestions * SECONDS_PER_QUESTION;
  }

  function clearThemeClasses() {
    if (currentThemeClass) {
      document.body.classList.remove(currentThemeClass);
    }
    if (currentSubthemeClass) {
      document.body.classList.remove(currentSubthemeClass);
    }
    currentThemeClass = "";
    currentSubthemeClass = "";
  }

  // Apply main theme (gk / sports / science) + subtheme (e.g. gk-geography)
  function applyThemeClasses() {
    clearThemeClasses();

    currentThemeClass = currentGroup.themeClass || ""; // e.g. "theme-sports"
    currentSubthemeClass = currentSubcategory
      ? `subtheme-${currentSubcategory.id}` // e.g. "subtheme-sports-football"
      : "";

    if (currentThemeClass) {
      document.body.classList.add(currentThemeClass);
    }
    if (currentSubthemeClass) {
      document.body.classList.add(currentSubthemeClass);
    }
  }

  function resetQuizState() {
    currentQuestions = [];
    currentIndex = 0;
    mode = "solo";
    scores = { 1: 0, 2: 0 };
    playerNames = { 1: "Player 1", 2: "Player 2" };
    quizLength = parseInt(settingLength.value, 10) || 10;
    quizDifficulty = settingDifficulty.value || "mixed";
    answers = [];
    clearInterval(timerId);
    timeRemaining = 0;
    quizEnded = false;

    clearThemeClasses();
    updateResultsReadyBanner();
  }

  function startTimer(totalSeconds) {
    clearInterval(timerId);
    timeRemaining = totalSeconds;
    updateTimerDisplay();

    timerId = setInterval(() => {
      timeRemaining -= 1;
      if (timeRemaining <= 0) {
        clearInterval(timerId);
        timeRemaining = 0;
        updateTimerDisplay();
        if (!quizEnded) {
          endQuiz("timeout");
        }
      } else {
        updateTimerDisplay();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const minutes = String(Math.floor(timeRemaining / 60)).padStart(2, "0");
    const seconds = String(timeRemaining % 60).padStart(2, "0");
    const el = document.getElementById("info-timer");
    if (el) {
      el.textContent = `${minutes}:${seconds}`;
    }
  }

  function computeScores() {
    scores = { 1: 0, 2: 0 };
    currentQuestions.forEach((q, index) => {
      const selectedIndex = answers[index];
      if (selectedIndex === null || selectedIndex === undefined) return;
      const isCorrect = selectedIndex === q.answerIndex;
      if (!isCorrect) return;

      if (mode === "solo") {
        scores[1] += 1;
      } else {
        const player = (index % 2) + 1;
        scores[player] += 1;
      }
    });
  }

  function currentPlayerForIndex(index) {
    if (mode === "solo") return null;
    return (index % 2) + 1;
  }

  function getIconAnimationClass(subId, groupId) {
    switch (subId) {
      case "sports-football":
        return "icon-anim-spin";
      case "sports-cricket":
        return "icon-anim-swing";
      case "sports-basketball":
        return "icon-anim-bounce";
      case "gk-geography":
        return "icon-anim-orbit";
      case "science-physics":
        return "icon-anim-spin";
      case "science-biology":
        return "icon-anim-pulse";
      default:
        if (groupId === "sports") return "icon-anim-spin";
        return "icon-anim-pulse";
    }
  }

  function updateResultsReadyBanner() {
    if (!resultsReadyBanner) return;
    const allAnswered =
      answers.length > 0 &&
      answers.every(
        (a) => a !== null && a !== undefined
      );

    if (allAnswered && !quizEnded && timeRemaining > 0) {
      resultsReadyBanner.classList.add("visible");
    } else {
      resultsReadyBanner.classList.remove("visible");
    }
  }
