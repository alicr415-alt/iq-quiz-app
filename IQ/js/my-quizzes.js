// js/my-quizzes.js
// Manage user-created quizzes and their questions.

(function () {
  const screenSetup = document.getElementById("screen-setup");
  const screenMyQuizzes = document.getElementById("screen-my-quizzes");

  if (!screenMyQuizzes) return;

  // Buttons to open/close My Quizzes
  const btnOpenMyQuizzes = document.getElementById("btn-open-my-quizzes");
  const btnMyQuizzesBack = document.getElementById("btn-my-quizzes-back");

  // Quiz list & form
  const quizListEl = document.getElementById("quiz-list");
  const quizListEmptyEl = document.getElementById("quiz-list-empty");
  const quizForm = document.getElementById("quiz-form");
  const quizTitleInput = document.getElementById("quiz-title");
  const quizDescriptionInput = document.getElementById("quiz-description");
  const btnDeleteQuiz = document.getElementById("btn-delete-quiz");
  const btnClearQuizForm = document.getElementById("btn-clear-quiz-form");
  const quizFormStatus = document.getElementById("quiz-form-status");

  // Questions panel
  const questionsPanelTitle = document.getElementById("questions-panel-title");
  const quizQuestionListEl = document.getElementById("quiz-question-list");
  const quizQuestionEmptyEl = document.getElementById("quiz-question-empty");
  const quizQuestionForm = document.getElementById("quiz-question-form");
  const qqText = document.getElementById("qq-text");
  const qqOptA = document.getElementById("qq-opt-a");
  const qqOptB = document.getElementById("qq-opt-b");
  const qqOptC = document.getElementById("qq-opt-c");
  const qqOptD = document.getElementById("qq-opt-d");
  const qqCorrect = document.getElementById("qq-correct");
  const btnDeleteQuestion = document.getElementById("btn-delete-question");
  const btnClearQuestionForm = document.getElementById("btn-clear-question-form");
  const quizQuestionStatus = document.getElementById("quiz-question-status");

  // Play controls
  const btnPlayMyQuiz = document.getElementById("btn-play-my-quiz");

  let quizzes = [];
  let currentQuizId = null;
  let currentQuestionId = null;

  // --------- Utilities ---------

  const TOKEN_KEY = "iq_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  async function authFetch(url, options = {}) {
    const token = getToken();
    const headers = options.headers || {};
    headers["Content-Type"] = "application/json";
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
    return fetch(url, { ...options, headers });
  }

  function setScreenActive(target) {
    document.querySelectorAll(".screen").forEach((sec) => {
      sec.classList.remove("active");
    });
    if (target) target.classList.add("active");
  }

  function showStatus(el, message, isError = false) {
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("status-success", "status-error");
    if (message) {
      el.classList.add(isError ? "status-error" : "status-success");
    }
  }

  function clearQuizForm() {
    currentQuizId = null;
    quizTitleInput.value = "";
    quizDescriptionInput.value = "";
    showStatus(quizFormStatus, "");
  }

  function clearQuestionForm() {
    currentQuestionId = null;
    qqText.value = "";
    qqOptA.value = "";
    qqOptB.value = "";
    qqOptC.value = "";
    qqOptD.value = "";
    qqCorrect.value = "0";
    showStatus(quizQuestionStatus, "");
  }

  function ensureLoggedInOrWarn() {
    if (!isLoggedIn()) {
      alert("You need to log in or register to manage your quizzes.");
      return false;
    }
    return true;
  }

  // --------- Load quizzes ---------

  async function loadQuizzes() {
    if (!ensureLoggedInOrWarn()) return;

    showStatus(quizFormStatus, "Loading quizzes...", false);

    try {
      const resp = await authFetch("/api/my/quizzes");
      if (resp.status === 401) {
        showStatus(quizFormStatus, "Your session expired. Please log in again.", true);
        return;
      }
      if (!resp.ok) {
        throw new Error("Server error " + resp.status);
      }
      const data = await resp.json();
      quizzes = Array.isArray(data.quizzes) ? data.quizzes : [];

      renderQuizList();
      showStatus(quizFormStatus, "");
    } catch (err) {
      console.error("Error loading quizzes:", err);
      showStatus(
        quizFormStatus,
        "There was a problem loading your quizzes. Please try again.",
        true
      );
    }
  }

  function renderQuizList() {
    quizListEl.innerHTML = "";
    if (!quizzes.length) {
      quizListEmptyEl.style.display = "block";
      return;
    }
    quizListEmptyEl.style.display = "none";

    quizzes.forEach((quiz) => {
      const li = document.createElement("li");
      li.className = "quiz-list-item";
      li.dataset.id = quiz.id;

      li.innerHTML = `
        <span class="quiz-list-item-title">${quiz.title}</span>
        ${
          quiz.description
            ? `<span class="quiz-list-item-desc">${quiz.description}</span>`
            : ""
        }
      `;

      if (quiz.id === currentQuizId) {
        li.classList.add("active");
      }

      li.addEventListener("click", () => {
        selectQuiz(quiz.id);
      });

      quizListEl.appendChild(li);
    });
  }

  async function selectQuiz(quizId) {
    currentQuizId = quizId;
    currentQuestionId = null;
    clearQuestionForm();
    renderQuizList();

    if (!ensureLoggedInOrWarn()) return;

    showStatus(quizQuestionStatus, "Loading quiz questions...", false);

    try {
      const resp = await authFetch(`/api/my/quizzes/${quizId}`);
      if (!resp.ok) {
        throw new Error("Server error " + resp.status);
      }
      const data = await resp.json();
      const quiz = data.quiz;

      quizTitleInput.value = quiz.title || "";
      quizDescriptionInput.value = quiz.description || "";

      questionsPanelTitle.textContent = `Questions in: ${quiz.title}`;
      renderQuestionList(quiz.questions || []);

      showStatus(quizQuestionStatus, "");
    } catch (err) {
      console.error("Error loading quiz:", err);
      showStatus(
        quizQuestionStatus,
        "There was a problem loading this quiz.",
        true
      );
    }
  }

  function renderQuestionList(questions) {
    quizQuestionListEl.innerHTML = "";
    if (!questions.length) {
      quizQuestionEmptyEl.style.display = "block";
      return;
    }
    quizQuestionEmptyEl.style.display = "none";

    questions.forEach((q) => {
      const li = document.createElement("li");
      li.className = "quiz-question-item";
      li.dataset.id = q.id;
      li.textContent = q.question.length > 80 ? q.question.slice(0, 77) + "..." : q.question;

      if (q.id === currentQuestionId) {
        li.classList.add("active");
      }

      li.addEventListener("click", () => {
        currentQuestionId = q.id;
        fillQuestionForm(q);
        renderQuestionList(questions);
      });

      quizQuestionListEl.appendChild(li);
    });
  }

  function fillQuestionForm(q) {
    qqText.value = q.question || "";
    qqOptA.value = q.options?.[0] || "";
    qqOptB.value = q.options?.[1] || "";
    qqOptC.value = q.options?.[2] || "";
    qqOptD.value = q.options?.[3] || "";
    qqCorrect.value = String(q.answerIndex ?? 0);
  }

  // --------- Quiz form submit / delete ---------

  if (quizForm) {
    quizForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!ensureLoggedInOrWarn()) return;

      const title = quizTitleInput.value.trim();
      const description = quizDescriptionInput.value.trim();

      if (!title) {
        showStatus(quizFormStatus, "Title is required.", true);
        return;
      }

      showStatus(quizFormStatus, "Saving quiz...", false);

      try {
        let resp;
        if (currentQuizId) {
          resp = await authFetch(`/api/my/quizzes/${currentQuizId}`, {
            method: "PATCH",
            body: JSON.stringify({ title, description }),
          });
        } else {
          resp = await authFetch("/api/my/quizzes", {
            method: "POST",
            body: JSON.stringify({ title, description }),
          });
        }

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.message || "Server error " + resp.status);
        }

        const data = await resp.json();
        const savedQuiz = data.quiz;

        currentQuizId = savedQuiz.id;

        // Reload all quizzes
        await loadQuizzes();
        await selectQuiz(currentQuizId);

        showStatus(quizFormStatus, "Quiz saved.", false);
      } catch (err) {
        console.error("Error saving quiz:", err);
        showStatus(quizFormStatus, err.message || "Error saving quiz.", true);
      }
    });
  }

  if (btnDeleteQuiz) {
    btnDeleteQuiz.addEventListener("click", async () => {
      if (!currentQuizId) {
        showStatus(quizFormStatus, "Select a quiz first.", true);
        return;
      }
      if (!ensureLoggedInOrWarn()) return;

      const ok = confirm("Delete this quiz and all its questions?");
      if (!ok) return;

      showStatus(quizFormStatus, "Deleting quiz...", false);

      try {
        const resp = await authFetch(`/api/my/quizzes/${currentQuizId}`, {
          method: "DELETE",
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.message || "Server error " + resp.status);
        }

        currentQuizId = null;
        currentQuestionId = null;
        clearQuizForm();
        clearQuestionForm();
        quizzes = quizzes.filter((q) => q.id !== currentQuizId);

        await loadQuizzes();
        quizQuestionListEl.innerHTML = "";
        quizQuestionEmptyEl.style.display = "block";
        questionsPanelTitle.textContent = "Questions in this quiz";

        showStatus(quizFormStatus, "Quiz deleted.", false);
      } catch (err) {
        console.error("Error deleting quiz:", err);
        showStatus(quizFormStatus, err.message || "Error deleting quiz.", true);
      }
    });
  }

  if (btnClearQuizForm) {
    btnClearQuizForm.addEventListener("click", (e) => {
      e.preventDefault();
      clearQuizForm();
    });
  }

  // --------- Question form submit / delete ---------

  if (quizQuestionForm) {
    quizQuestionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentQuizId) {
        showStatus(quizQuestionStatus, "Create or select a quiz first.", true);
        return;
      }
      if (!ensureLoggedInOrWarn()) return;

      const question = qqText.value.trim();
      const options = [
        qqOptA.value.trim(),
        qqOptB.value.trim(),
        qqOptC.value.trim(),
        qqOptD.value.trim(),
      ];
      const answerIndex = parseInt(qqCorrect.value, 10);

      if (!question || options.some((o) => !o)) {
        showStatus(
          quizQuestionStatus,
          "Question and all 4 options are required.",
          true
        );
        return;
      }

      showStatus(quizQuestionStatus, "Saving question...", false);

      try {
        let url = `/api/my/quizzes/${currentQuizId}/questions`;
        let method = "POST";

        if (currentQuestionId) {
          url = `/api/my/quizzes/${currentQuizId}/questions/${currentQuestionId}`;
          method = "PATCH";
        }

        const resp = await authFetch(url, {
          method,
          body: JSON.stringify({ question, options, answerIndex }),
        });

        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.message || "Server error " + resp.status);
        }

        // Refresh quiz details to update question list
        await selectQuiz(currentQuizId);
        showStatus(quizQuestionStatus, "Question saved.", false);
      } catch (err) {
        console.error("Error saving question:", err);
        showStatus(
          quizQuestionStatus,
          err.message || "Error saving question.",
          true
        );
      }
    });
  }

  if (btnDeleteQuestion) {
    btnDeleteQuestion.addEventListener("click", async () => {
      if (!currentQuizId || !currentQuestionId) {
        showStatus(
          quizQuestionStatus,
          "Select a question to delete.",
          true
        );
        return;
      }
      if (!ensureLoggedInOrWarn()) return;

      const ok = confirm("Delete this question?");
      if (!ok) return;

      showStatus(quizQuestionStatus, "Deleting question...", false);

      try {
        const resp = await authFetch(
          `/api/my/quizzes/${currentQuizId}/questions/${currentQuestionId}`,
          { method: "DELETE" }
        );
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.message || "Server error " + resp.status);
        }

        currentQuestionId = null;
        clearQuestionForm();
        await selectQuiz(currentQuizId);

        showStatus(quizQuestionStatus, "Question deleted.", false);
      } catch (err) {
        console.error("Error deleting question:", err);
        showStatus(
          quizQuestionStatus,
          err.message || "Error deleting question.",
          true
        );
      }
    });
  }

  if (btnClearQuestionForm) {
    btnClearQuestionForm.addEventListener("click", (e) => {
      e.preventDefault();
      clearQuestionForm();
    });
  }

  // --------- Play quiz ---------

  if (btnPlayMyQuiz) {
    btnPlayMyQuiz.addEventListener("click", async () => {
      if (!currentQuizId) {
        showStatus(
          quizQuestionStatus,
          "Select a quiz with questions first.",
          true
        );
        return;
      }
      if (!ensureLoggedInOrWarn()) return;

      const modeInput = document.querySelector(
        'input[name="my-quiz-mode"]:checked'
      );
      const mode = modeInput ? modeInput.value : "solo";

      showStatus(quizQuestionStatus, "Loading quiz for play...", false);

      try {
        const resp = await authFetch(
          `/api/custom-quizzes/${currentQuizId}/play`
        );
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.message || "Server error " + resp.status);
        }

        const data = await resp.json();
        const quiz = data.quiz;

        if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
          showStatus(
            quizQuestionStatus,
            "This quiz has no questions yet.",
            true
          );
          return;
        }

        // Use global function from custom-quiz.js
        if (typeof window.startCustomQuiz !== "function") {
          alert("Custom quiz mode is not available yet.");
          return;
        }

        window.startCustomQuiz(quiz, { mode });
      } catch (err) {
        console.error("Error starting custom quiz:", err);
        showStatus(
          quizQuestionStatus,
          err.message || "Could not start quiz.",
          true
        );
      }
    });
  }

  // --------- Open / close My Quizzes ---------

  function openMyQuizzesScreen() {
    if (!ensureLoggedInOrWarn()) return;
    setScreenActive(screenMyQuizzes);
    loadQuizzes();
  }

  function closeMyQuizzesScreen() {
    setScreenActive(screenSetup);
  }

  if (btnOpenMyQuizzes) {
    btnOpenMyQuizzes.addEventListener("click", (e) => {
      e.preventDefault();
      openMyQuizzesScreen();
    });
  }

  if (btnMyQuizzesBack) {
    btnMyQuizzesBack.addEventListener("click", (e) => {
      e.preventDefault();
      closeMyQuizzesScreen();
    });
  }
})();
