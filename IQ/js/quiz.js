// js/quiz.js
// Handles quiz flow: starting, navigating questions, ending, and saving scores.

document.addEventListener("DOMContentLoaded", () => {
  console.log("quiz.js initialising…");

  // ---------- State ----------

  let currentQuestions = [];
  let answers = [];
  let currentIndex = 0;

  let quizLength = 10;
  let quizDifficulty = "mixed";
  let mode = "solo"; // "solo" or "vs"

  let scores = { 1: 0, 2: 0 };
  let playerNames = { 1: "Player 1", 2: "Player 2" };

  let quizEnded = false;
  let timerId = null;
  let secondsRemaining = 0;

  let currentGroup = null;
  let currentSubcategory = null;

  // ---------- DOM lookups ----------

  // Setup inputs
  const categorySelect = document.getElementById("category-select");
  const subcategorySelect = document.getElementById("subcategory-select");
  const settingLength = document.getElementById("setting-length");
  const settingDifficulty = document.getElementById("setting-difficulty");
  const player1NameSetup = document.getElementById("player1-name-setup");
  const player2NameSetup = document.getElementById("player2-name-setup");

  // Quiz info panel
  const infoQuizTitle = document.getElementById("info-quiz-title");
  const infoTotalQuestions = document.getElementById("info-total-questions");
  const infoTimer = document.getElementById("info-timer");
  const infoCurrentScore = document.getElementById("info-current-score");
  const infoIcon = document.getElementById("info-icon");
  const infoIconInner = infoIcon
    ? infoIcon.querySelector(".info-icon-inner")
    : null;

  // Quiz header + scores
  const playerTurnLabel = document.getElementById("player-turn-label");
  const scoreP1 = document.getElementById("score-p1");
  const scoreP2 = document.getElementById("score-p2");
  const labelP1 = document.getElementById("label-p1");
  const labelP2 = document.getElementById("label-p2");
  const scorePanel = document.querySelector(".score-panel");

  // Question + options
  const questionCounter = document.getElementById("question-counter");
  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  // Results-ready banner on quiz screen
  const resultsReadyBanner = document.getElementById("results-ready-banner");
  const btnViewResults = document.getElementById("btn-view-results");

  // Results screen
  const resultsSummary = document.getElementById("results-summary");
  const finalScoreP1 = document.getElementById("final-score-p1");
  const finalScoreP2 = document.getElementById("final-score-p2");
  const finalLabelP1 = document.getElementById("final-label-p1");
  const finalLabelP2 = document.getElementById("final-label-p2");
  const resultsScoreCard = document.getElementById("results-score-card");
  const winnerBanner = document.getElementById("winner-banner");

  const cardNameEntry = document.getElementById("card-name-entry");
  const playerNameInput = document.getElementById("player-name-input");
  const saveStatus = document.getElementById("save-status");

  // Quit button (wired from events.js, but used here for reset)
  const btnQuit = document.getElementById("btn-quit");

  // ---------- Helpers ----------

  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function currentPlayerForIndex(index) {
    if (mode === "solo") return 1;
    // Simple alternating: Q1 -> P1, Q2 -> P2, etc.
    return index % 2 === 0 ? 1 : 2;
  }

  function computeScores() {
    const newScores = { 1: 0, 2: 0 };

    currentQuestions.forEach((q, idx) => {
      const ans = answers[idx];
      if (ans === null || ans === undefined) return;

      const isCorrect = ans === q.answerIndex;
      if (!isCorrect) return;

      const player = currentPlayerForIndex(idx);
      newScores[player] += 1;
    });

    scores = newScores;
  }

  function updateResultsReadyBanner() {
    if (!resultsReadyBanner) return;

    const allAnswered =
      currentQuestions.length > 0 &&
      answers.every((a) => a !== null && a !== undefined);

    if (allAnswered && !quizEnded) {
      resultsReadyBanner.style.display = "flex";
    } else {
      resultsReadyBanner.style.display = "none";
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function startTimer(timeLimitSeconds) {
    if (!infoTimer) return;

    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }

    secondsRemaining = timeLimitSeconds;
    infoTimer.textContent = formatTime(secondsRemaining);

    timerId = setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        infoTimer.textContent = "00:00";
        // Time up → end quiz
        endQuiz("timeout");
      } else {
        infoTimer.textContent = formatTime(secondsRemaining);
      }
    }, 1000);
  }

  function resetQuizState() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    currentQuestions = [];
    answers = [];
    currentIndex = 0;
    scores = { 1: 0, 2: 0 };
    quizEnded = false;

    if (resultsReadyBanner) {
      resultsReadyBanner.style.display = "none";
    }
    if (saveStatus) {
      saveStatus.textContent = "";
      saveStatus.classList.remove("status-success", "status-error");
    }
    if (cardNameEntry) {
      cardNameEntry.style.display = "block";
    }
    if (resultsScoreCard) {
      resultsScoreCard.style.display = "block";
    }
    if (winnerBanner) {
      winnerBanner.classList.remove("visible", "draw");
      winnerBanner.textContent = "";
    }
  }

  function refreshModeFromRadiosSafe() {
    // Use the function defined in home.js if present
    if (typeof window.refreshModeFromRadios === "function") {
      window.refreshModeFromRadios();
      // home.js keeps `mode` global; we mirror it if needed
      if (typeof window.mode !== "undefined") {
        mode = window.mode;
      }
    }
  }

  // ✅ NEW: Read mode directly from the radio buttons (fixes VS mode not applying)
  function readModeFromRadiosDirect() {
    const checked = document.querySelector('input[name="mode"]:checked');
    const value = checked ? checked.value : "solo"; // "solo" or "vs"
    mode = value;
    window.mode = value; // optional consistency for other modules
  }

  // ---------- Quiz setup ----------

  async function startQuiz() {
    console.log("Starting quiz…");

    // ✅ FIX: use direct radio read (instead of relying on home.js globals)
    readModeFromRadiosDirect();

    quizLength = parseInt(settingLength.value, 10) || 10;
    quizDifficulty = settingDifficulty.value || "mixed";

    const groupId = categorySelect.value;
    const subId = subcategorySelect.value;
    currentGroup = findGroupById(groupId);
    const found = findSubcategoryById(subId);
    currentSubcategory = found.subcategory;

    // Set player names for VS mode
    if (mode === "vs") {
      playerNames[1] = (player1NameSetup.value || "Player 1").trim();
      playerNames[2] = (player2NameSetup.value || "Player 2").trim();
    } else {
      playerNames[1] = "Player 1";
      playerNames[2] = "Player 2";
    }

    // Load questions (API or local)
    const allQuestions = await loadQuestionsForSubcategory(
      currentSubcategory.id,
      quizLength,
      quizDifficulty
    );

    if (!allQuestions.length) {
      alert("No questions available for this subcategory.");
      return;
    }

    // Difficulty filter
    let candidateQuestions = allQuestions;
    if (quizDifficulty && quizDifficulty !== "mixed") {
      const byDifficulty = allQuestions.filter((q) => {
        if (!q.difficulty) return false;
        return q.difficulty.toLowerCase() === quizDifficulty.toLowerCase();
      });
      if (byDifficulty.length > 0) {
        candidateQuestions = byDifficulty;
      }
    }

    const maxQuestions = Math.min(quizLength, candidateQuestions.length);
    currentQuestions = shuffle(candidateQuestions).slice(0, maxQuestions);

    if (!currentQuestions.length) {
      alert("No questions matching this difficulty.");
      return;
    }

    answers = currentQuestions.map(() => null);
    currentIndex = 0;
    scores = { 1: 0, 2: 0 };

    // These elements may not exist if you removed the name input from HTML
    if (playerNameInput) {
      playerNameInput.value = "";
    }
    if (saveStatus) {
      saveStatus.textContent = "";
      saveStatus.classList.remove("status-success", "status-error");
    }

    quizEnded = false;

    if (winnerBanner) {
      winnerBanner.classList.remove("visible", "draw");
      winnerBanner.textContent = "";
    }

    updateResultsReadyBanner();

    // Apply background theme + subtheme for the quiz
    if (typeof window.applyThemeClasses === "function") {
      window.applyThemeClasses();
    }

    // Info panel
    infoQuizTitle.textContent = `${currentGroup.name} – ${currentSubcategory.name}`;
    infoTotalQuestions.textContent = String(currentQuestions.length);
    infoCurrentScore.textContent = "0";

    if (infoIconInner) {
      const fromSub = SUBCATEGORY_ICONS[currentSubcategory.id];
      const fromGroup = GROUP_ICONS[currentGroup.id];
      infoIconInner.textContent = fromSub || fromGroup || "❓";
      infoIconInner.className = "info-icon-inner"; // reset
      const animClass = getIconAnimationClass(
        currentSubcategory.id,
        currentGroup.id
      );
      if (animClass) {
        infoIconInner.classList.add(animClass);
      }
    }

    // Timer
    const timeLimitSeconds = getTimeLimitSeconds(currentQuestions.length);
    startTimer(timeLimitSeconds);

    updateHeader();
    showQuestion();
    showScreen("quiz");
  }

  function updateHeader() {
    computeScores();

    scoreP1.textContent = scores[1];
    scoreP2.textContent = scores[2];

    infoCurrentScore.textContent =
      mode === "solo" ? String(scores[1]) : `${scores[1]} – ${scores[2]}`;

    if (mode === "solo") {
      playerTurnLabel.textContent = "Solo mode";
      if (scorePanel) scorePanel.style.display = "none";
    } else {
      const playerIndex = currentPlayerForIndex(currentIndex) || 1;
      const currentName = playerNames[playerIndex] || `Player ${playerIndex}`;
      playerTurnLabel.textContent = `${currentName}'s turn`;
      if (scorePanel) scorePanel.style.display = "block";
    }

    labelP1.textContent = playerNames[1];
    labelP2.textContent = playerNames[2];

    btnPrev.disabled = currentIndex === 0;
    btnNext.disabled =
      currentIndex === currentQuestions.length - 1 ||
      answers[currentIndex] === null ||
      answers[currentIndex] === undefined;
  }

  // ---------- Question flow ----------

  function showQuestion() {
    const q = currentQuestions[currentIndex];

    questionCounter.textContent = `Question ${currentIndex + 1} of ${
      currentQuestions.length
    }`;
    questionText.textContent = q.question;

    optionsContainer.innerHTML = "";

    const selectedIndex = answers[currentIndex];

    q.options.forEach((optionText, index) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = optionText;
      btn.dataset.index = index.toString();
      btn.addEventListener("click", onOptionClick);
      optionsContainer.appendChild(btn);
    });

    // restore state if previously answered
    if (selectedIndex !== null && selectedIndex !== undefined) {
      const qCurrent = currentQuestions[currentIndex];
      const optionButtons = optionsContainer.querySelectorAll(".option-btn");
      optionButtons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === qCurrent.answerIndex) {
          btn.classList.add("correct");
        } else if (idx === selectedIndex && idx !== qCurrent.answerIndex) {
          btn.classList.add("incorrect");
        }
      });
    }

    updateHeader();
    updateResultsReadyBanner();
  }

  function onOptionClick(event) {
    const q = currentQuestions[currentIndex];

    if (answers[currentIndex] !== null && answers[currentIndex] !== undefined) {
      return;
    }

    const selectedIndex = parseInt(event.currentTarget.dataset.index, 10);
    answers[currentIndex] = selectedIndex;

    const optionButtons = optionsContainer.querySelectorAll(".option-btn");
    optionButtons.forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.answerIndex) {
        btn.classList.add("correct");
      } else if (idx === selectedIndex && idx !== q.answerIndex) {
        btn.classList.add("incorrect");
      }
    });

    computeScores();
    updateHeader();
    updateResultsReadyBanner();
  }

  function goToNextQuestion() {
    if (currentIndex >= currentQuestions.length - 1) {
      // No automatic end; user can wait for timer or use View Results banner
      return;
    }
    currentIndex += 1;
    showQuestion();
  }

  function goToPreviousQuestion() {
    if (currentIndex === 0) return;
    currentIndex -= 1;
    showQuestion();
  }

  function endQuiz(source) {
    if (quizEnded) return;
    quizEnded = true;

    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    updateResultsReadyBanner(); // hide banner

    computeScores();

    finalScoreP1.textContent = scores[1];
    finalScoreP2.textContent = scores[2];

    finalLabelP1.textContent = playerNames[1];
    finalLabelP2.textContent = playerNames[2];

    let summaryText = "";

    if (mode === "solo") {
      summaryText = `You scored ${scores[1]} out of ${currentQuestions.length}.`;
      if (cardNameEntry) cardNameEntry.style.display = "block";
      if (winnerBanner) winnerBanner.classList.remove("visible", "draw");

      // hide the Player 1 / Player 2 score card in solo mode
      if (resultsScoreCard) {
        resultsScoreCard.style.display = "none";
      }
    } else {
      if (cardNameEntry) cardNameEntry.style.display = "none";

      // show the score card in VS mode
      if (resultsScoreCard) {
        resultsScoreCard.style.display = "block";
      }

      if (scores[1] > scores[2]) {
        summaryText = `${playerNames[1]} wins! (${scores[1]} – ${scores[2]}).`;
        if (winnerBanner) {
          winnerBanner.textContent = `🎉 Congratulations ${playerNames[1]}!`;
          winnerBanner.classList.remove("draw");
          winnerBanner.classList.add("visible");
        }
      } else if (scores[2] > scores[1]) {
        summaryText = `${playerNames[2]} wins! (${scores[2]} – ${scores[1]}).`;
        if (winnerBanner) {
          winnerBanner.textContent = `🎉 Congratulations ${playerNames[2]}!`;
          winnerBanner.classList.remove("draw");
          winnerBanner.classList.add("visible");
        }
      } else {
        summaryText = `It's a draw! (${scores[1]} – ${scores[2]}).`;
        if (winnerBanner) {
          winnerBanner.textContent = "🤝 It's a draw!";
          winnerBanner.classList.add("visible", "draw");
        }
      }
    }

    resultsSummary.textContent = summaryText;
    if (saveStatus) {
      saveStatus.textContent = "";
      saveStatus.classList.remove("status-success", "status-error");
    }
    showScreen("results");
  }

  // -------------------------------------------------
  // Save score to backend leaderboard (solo mode only)
  // -------------------------------------------------

  const API_BASE_URL = window.API_BASE_URL || "http://127.0.0.1:5000/api";

  async function onSaveScore() {
    const statusEl = saveStatus;

    if (!statusEl) {
      console.warn("saveStatus element not found.");
      return;
    }

    // 1) Only solo mode can save scores
    if (mode !== "solo") {
      statusEl.textContent = "Leaderboard saving is for solo mode only.";
      statusEl.classList.remove("status-success");
      statusEl.classList.add("status-error");
      return;
    }

    // 2) Must be logged in
    if (
      !window.authService ||
      typeof window.authService.isLoggedIn !== "function" ||
      !window.authService.isLoggedIn()
    ) {
      statusEl.textContent =
        "Please log in or register to save your score.";
      statusEl.classList.remove("status-success");
      statusEl.classList.add("status-error");
      return;
    }

    // 3) Make sure we actually have a quiz result
    if (!currentQuestions || !currentQuestions.length) {
      statusEl.textContent = "No score to save.";
      statusEl.classList.remove("status-success");
      statusEl.classList.add("status-error");
      return;
    }

    // 4) Build payload for /api/scores
    const scoreValue =
      scores && typeof scores[1] === "number" ? scores[1] : 0;
    const totalQuestions = currentQuestions.length;

    const categoryId = currentGroup ? currentGroup.id : null;
    const subcategoryId =
      currentSubcategory && currentSubcategory.id
        ? currentSubcategory.id
        : null;

    if (!categoryId) {
      statusEl.textContent =
        "Could not determine category – please try again.";
      statusEl.classList.remove("status-success");
      statusEl.classList.add("status-error");
      return;
    }

    statusEl.textContent = "Saving score...";
    statusEl.classList.remove("status-error");
    statusEl.classList.remove("status-success");

    // 5) POST to /api/scores with JWT from authService
    try {
      const headers =
        window.authService &&
        typeof window.authService.getAuthHeaders === "function"
          ? window.authService.getAuthHeaders()
          : {};

      const res = await fetch(`${API_BASE_URL}/scores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          category_id: categoryId,
          subcategory_id: subcategoryId,
          score: scoreValue,
          total_questions: totalQuestions,
        }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          statusEl.textContent = "Session expired. Please log in again.";
          statusEl.classList.remove("status-success");
          statusEl.classList.add("status-error");
          return;
        }

        const data = await res.json().catch(() => ({}));
        statusEl.textContent = data.message || "Error saving score.";
        statusEl.classList.remove("status-success");
        statusEl.classList.add("status-error");
        return;
      }

      // Success 🎉
      statusEl.textContent = "Score saved!";
      statusEl.classList.remove("status-error");
      statusEl.classList.add("status-success");
    } catch (err) {
      console.error("Error saving score:", err);
      statusEl.textContent = "Network error saving score.";
      statusEl.classList.remove("status-success");
      statusEl.classList.add("status-error");
    }
  }

  // ---------- Expose to other modules ----------

  window.startQuiz = startQuiz;
  window.goToNextQuestion = goToNextQuestion;
  window.goToPreviousQuestion = goToPreviousQuestion;
  window.endQuiz = endQuiz;
  window.resetQuizState = resetQuizState;
  window.onSaveScore = onSaveScore;
});
