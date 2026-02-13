// js/custom-quiz.js
// Play a single user-created quiz in solo or vs mode.

(function () {
  const screenMyQuizzes = document.getElementById("screen-my-quizzes");
  const screenCustomQuiz = document.getElementById("screen-custom-quiz");
  if (!screenCustomQuiz) return;

  // Info panel
  const customInfoTitle = document.getElementById("custom-info-title");
  const customTotalQuestions = document.getElementById("custom-total-questions");
  const customCurrentQuestion = document.getElementById("custom-current-question");
  const customScoreEl = document.getElementById("custom-score");
  const customScoreLabel = document.getElementById("custom-score-label");
  const customPlayerLabel = document.getElementById("custom-player-label");

  const vsScorePanel = document.getElementById("custom-vs-score-panel");
  const customLabelP1 = document.getElementById("custom-label-p1");
  const customLabelP2 = document.getElementById("custom-label-p2");
  const customScoreP1 = document.getElementById("custom-score-p1");
  const customScoreP2 = document.getElementById("custom-score-p2");

  // Question area
  const customQuestionCounter = document.getElementById("custom-question-counter");
  const customQuestionText = document.getElementById("custom-question-text");
  const customOptionsContainer = document.getElementById("custom-options-container");

  // Controls
  const customBtnPrev = document.getElementById("custom-btn-prev");
  const customBtnNext = document.getElementById("custom-btn-next");
  const customBtnQuit = document.getElementById("custom-btn-quit");
  const customBtnRestart = document.getElementById("custom-btn-restart");

  const customResultsBanner = document.getElementById("custom-results-banner");
  const customResultsText = document.getElementById("custom-results-text");
  const customStatus = document.getElementById("custom-quiz-status");

  // State
  let quizData = null;
  let questions = [];
  let mode = "solo"; // "solo" or "vs"

  let currentIndex = 0;
  let soloScore = 0;

  let scoreP1 = 0;
  let scoreP2 = 0;
  let currentPlayer = "p1"; // alternates in vs mode

  let answers = []; // {selectedIndex, correct} per question
  let finished = false;

  function setThemeCustom() {
    document.body.classList.add("theme-custom");
  }

  function clearThemeCustom() {
    document.body.classList.remove("theme-custom");
  }

  function setScreenActive(el) {
    document.querySelectorAll(".screen").forEach((sec) =>
      sec.classList.remove("active")
    );
    if (el) el.classList.add("active");
  }

  function resetState() {
    currentIndex = 0;
    soloScore = 0;
    scoreP1 = 0;
    scoreP2 = 0;
    currentPlayer = "p1";
    answers = [];
    finished = false;
  }

  function updateHeader() {
    customInfoTitle.textContent = quizData?.title || "My Custom Quiz";
    customTotalQuestions.textContent = String(questions.length);
    customCurrentQuestion.textContent = String(currentIndex + 1);

    if (mode === "solo") {
      customScoreLabel.textContent = "Score";
      customScoreEl.textContent = String(soloScore);
      vsScorePanel.style.display = "none";
      customPlayerLabel.textContent = "Solo mode – My quiz";
    } else {
      customScoreLabel.textContent = "Total score";
      customScoreEl.textContent = String(scoreP1 + scoreP2);
      vsScorePanel.style.display = "block";
      customScoreP1.textContent = String(scoreP1);
      customScoreP2.textContent = String(scoreP2);
      customPlayerLabel.textContent =
        currentPlayer === "p1" ? "Player 1’s turn" : "Player 2’s turn";
    }
  }

  function renderQuestion() {
    if (!questions.length) return;

    finished = false;
    customResultsBanner.style.display = "none";
    customStatus.textContent = "";
    customStatus.classList.remove("status-success", "status-error");

    const q = questions[currentIndex];
    updateHeader();

    customQuestionCounter.textContent = `Question ${
      currentIndex + 1
    } of ${questions.length}`;
    customQuestionText.textContent = q.question;

    customOptionsContainer.innerHTML = "";
    const prevAnswer = answers[currentIndex];

    q.options.forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn option-btn";
      btn.textContent = opt;

      if (prevAnswer) {
        btn.disabled = true;
        if (idx === q.answerIndex) {
          btn.classList.add("correct");
        }
        if (idx === prevAnswer.selectedIndex && !prevAnswer.correct) {
          btn.classList.add("incorrect");
        }
      } else {
        btn.addEventListener("click", () => handleAnswerClick(idx));
      }

      customOptionsContainer.appendChild(btn);
    });

    customBtnPrev.disabled = currentIndex === 0;
    customBtnNext.disabled = !answers[currentIndex];

    if (currentIndex === questions.length - 1) {
      customBtnNext.textContent = "Finish";
    } else {
      customBtnNext.textContent = "Next";
    }
  }

  function handleAnswerClick(selectedIdx) {
    if (finished) return;

    const q = questions[currentIndex];
    const correct = selectedIdx === q.answerIndex;

    answers[currentIndex] = { selectedIndex: selectedIdx, correct };

    if (mode === "solo") {
      if (correct) soloScore += 1;
    } else {
      if (currentPlayer === "p1") {
        if (correct) scoreP1 += 1;
      } else {
        if (correct) scoreP2 += 1;
      }
    }

    updateHeader();
    markAnswerButtons(selectedIdx, q.answerIndex);

    if (correct) {
      customStatus.textContent = "Correct!";
      customStatus.classList.remove("status-error");
      customStatus.classList.add("status-success");
    } else {
      customStatus.textContent = "Incorrect.";
      customStatus.classList.remove("status-success");
      customStatus.classList.add("status-error");
    }

    customBtnNext.disabled = false;

    // In vs mode, next question belongs to the other player
    if (mode === "vs") {
      currentPlayer = currentPlayer === "p1" ? "p2" : "p1";
    }
  }

  function markAnswerButtons(selectedIdx, correctIdx) {
    const buttons = customOptionsContainer.querySelectorAll(".option-btn");
    buttons.forEach((btn, idx) => {
      btn.disabled = true;
      btn.classList.remove("correct", "incorrect");
      if (idx === correctIdx) {
        btn.classList.add("correct");
      }
      if (idx === selectedIdx && selectedIdx !== correctIdx) {
        btn.classList.add("incorrect");
      }
    });
  }

  function showResults() {
    finished = true;
    customResultsBanner.style.display = "block";

    let text;
    if (mode === "solo") {
      text = `You scored ${soloScore} out of ${questions.length}.`;
    } else {
      let winner;
      if (scoreP1 > scoreP2) winner = "Player 1 wins!";
      else if (scoreP2 > scoreP1) winner = "Player 2 wins!";
      else winner = "It’s a draw!";
      text = `${winner} (P1: ${scoreP1}, P2: ${scoreP2})`;
    }

    customResultsText.textContent = text;
  }

  // Navigation buttons
  if (customBtnPrev) {
    customBtnPrev.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        renderQuestion();
      }
    });
  }

  if (customBtnNext) {
    customBtnNext.addEventListener("click", () => {
      if (!answers[currentIndex]) return;

      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        renderQuestion();
      } else {
        showResults();
      }
    });
  }

  if (customBtnQuit) {
    customBtnQuit.addEventListener("click", () => {
      clearThemeCustom();
      setScreenActive(screenMyQuizzes);
    });
  }

  if (customBtnRestart) {
    customBtnRestart.addEventListener("click", () => {
      resetState();
      renderQuestion();
    });
  }

  // --------- Public entry point ---------

  window.startCustomQuiz = function (quiz, options = {}) {
    quizData = quiz || {};
    questions = Array.isArray(quiz.questions) ? quiz.questions.slice() : [];

    if (!questions.length) {
      alert("This quiz has no questions yet.");
      return;
    }

    mode = options.mode === "vs" ? "vs" : "solo";
    resetState();
    setThemeCustom();
    setScreenActive(screenCustomQuiz);
    renderQuestion();
  };
})();
