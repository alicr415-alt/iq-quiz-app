// ---------- DOM elements ----------

  const screenLanding = document.getElementById("screen-landing");
  const screenSetup = document.getElementById("screen-setup");
  const screenSummary = document.getElementById("screen-summary");
  const screenQuiz = document.getElementById("screen-quiz");
  const screenResults = document.getElementById("screen-results");
  const screenLeaderboard = document.getElementById("screen-leaderboard");
  const screenBuilder = document.getElementById("screen-builder");

  const btnLandingStart = document.getElementById("btn-landing-start");
  const btnBackLanding = document.getElementById("btn-back-landing");
  const btnSetupAccount = document.getElementById("btn-setup-account");

  const categorySelect = document.getElementById("category-select");
  const subcategorySelect = document.getElementById("subcategory-select");
  const categoryGrid = document.getElementById("category-grid");
  const subcategoryGrid = document.getElementById("subcategory-grid");

  const btnSetupContinue = document.getElementById("btn-setup-continue");
  const btnOpenBuilder = document.getElementById("btn-open-builder");
  const btnOpenLeaderboard = document.getElementById("btn-open-leaderboard");

  const settingLength = document.getElementById("setting-length");
  const settingDifficulty = document.getElementById("setting-difficulty");

  const modeRadios = document.querySelectorAll('input[name="mode"]');
  const vsNameFields = document.getElementById("vs-name-fields");
  const player1NameSetup = document.getElementById("player1-name-setup");
  const player2NameSetup = document.getElementById("player2-name-setup");

  // Summary elements
  const summaryTitle = document.getElementById("summary-title");
  const summarySubtitle = document.getElementById("summary-subtitle");
  const summaryQuestions = document.getElementById("summary-questions");
  const summaryDuration = document.getElementById("summary-duration");
  const summaryMode = document.getElementById("summary-mode");
  const summaryDifficulty = document.getElementById("summary-difficulty");
  const btnSummaryBack = document.getElementById("btn-summary-back");
  const btnSummaryStart = document.getElementById("btn-summary-start");

  // Quiz elements
  const playerTurnLabel = document.getElementById("player-turn-label");
  const scoreP1 = document.getElementById("score-p1");
  const scoreP2 = document.getElementById("score-p2");
  const labelP1 = document.getElementById("label-p1");
  const labelP2 = document.getElementById("label-p2");
  const scorePanel = document.querySelector(".score-panel");

  const questionCounter = document.getElementById("question-counter");
  const questionText = document.getElementById("question-text");
  const optionsContainer = document.getElementById("options-container");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");
  const btnQuit = document.getElementById("btn-quit");

  // Info panel
  const infoQuizTitle = document.getElementById("info-quiz-title");
  const infoTotalQuestions = document.getElementById("info-total-questions");
  const infoCurrentScore = document.getElementById("info-current-score");
  const infoIcon = document.getElementById("info-icon");
  const infoIconInner = infoIcon
    ? infoIcon.querySelector(".info-icon-inner")
    : null;

   // Results elements
  const resultsSummary = document.getElementById("results-summary");
  const finalScoreP1 = document.getElementById("final-score-p1");
  const finalScoreP2 = document.getElementById("final-score-p2");
  const finalLabelP1 = document.getElementById("final-label-p1");
  const finalLabelP2 = document.getElementById("final-label-p2");
  const resultsScoreCard = document.getElementById("results-score-card");
  const winnerBanner = document.getElementById("winner-banner");
  const cardNameEntry = document.getElementById("card-name-entry");
  const playerNameInput = document.getElementById("player-name-input");
  const btnSaveScore = document.getElementById("btn-save-score");
  const saveStatus = document.getElementById("save-status");
  const btnPlayAgain = document.getElementById("btn-play-again");
  const btnBackSetup = document.getElementById("btn-back-setup");
  const btnResultsLeaderboard = document.getElementById(
    "btn-results-leaderboard"
  );
  const btnBuilderBack = document.getElementById("btn-builder-back");

  // Results-ready banner on quiz screen
  const resultsReadyBanner = document.getElementById("results-ready-banner");
  const btnViewResults = document.getElementById("btn-view-results");

  // Leaderboard elements
  const leaderboardTitle = document.getElementById("leaderboard-title");
  const leaderboardList = document.getElementById("leaderboard-list");
  const leaderboardEmpty = document.getElementById("leaderboard-empty");
  const btnLeaderboardBack = document.getElementById("btn-leaderboard-back");

  // ---------- Category / subcategory tiles ----------

  function selectCategory(groupId) {
    const group = findGroupById(groupId);
    if (!group) return;

    currentGroup = group;

    // sync hidden select
    categorySelect.value = groupId;

    // highlight active tile
    const cards = categoryGrid.querySelectorAll(".pill-card");
    cards.forEach((card) => {
      card.classList.toggle("active", card.dataset.id === groupId);
    });

    // load subcategories for that group
    populateSubcategories(group);
  }

  function selectSubcategory(subId) {
    const { group, subcategory } = findSubcategoryById(subId);
    if (!subcategory) return;

    currentGroup = group;
    currentSubcategory = subcategory;

    // sync hidden select
    subcategorySelect.value = subId;

    // highlight active tile
    const cards = subcategoryGrid.querySelectorAll(".pill-card");
    cards.forEach((card) => {
      card.classList.toggle("active", card.dataset.id === subId);
    });
  }

  function populateCategories() {
    categorySelect.innerHTML = "";
    categoryGrid.innerHTML = "";

    CATEGORY_GROUPS.forEach((group, index) => {
      // hidden select option
      const opt = document.createElement("option");
      opt.value = group.id;
      opt.textContent = group.name;
      categorySelect.appendChild(opt);

      // visible tile
      const card = document.createElement("button");
      card.type = "button";
      card.className = "pill-card category-card";
      card.dataset.id = group.id;

      const icon = GROUP_ICONS[group.id] || "❓";
      card.innerHTML = `
        <span class="pill-icon">${icon}</span>
        <span class="pill-label">${group.name}</span>
      `;

      card.addEventListener("click", () => selectCategory(group.id));
      categoryGrid.appendChild(card);

      if (index === 0) {
        selectCategory(group.id);
      }
    });
  }

  function populateSubcategories(group) {
    subcategorySelect.innerHTML = "";
    subcategoryGrid.innerHTML = "";

    group.subcategories.forEach((sub, index) => {
      // hidden select option
      const opt = document.createElement("option");
      opt.value = sub.id;
      opt.textContent = sub.name;
      subcategorySelect.appendChild(opt);

      // visible tile
      const card = document.createElement("button");
      card.type = "button";
      card.className = "pill-card subcategory-card";
      card.dataset.id = sub.id;

      const icon = SUBCATEGORY_ICONS[sub.id] || "❓";
      card.innerHTML = `
        <span class="pill-icon">${icon}</span>
        <span class="pill-label">${sub.name}</span>
      `;

      card.addEventListener("click", () => selectSubcategory(sub.id));
      subcategoryGrid.appendChild(card);

      if (index === 0 && categorySelect.value === group.id) {
        selectSubcategory(sub.id);
      }
    });
  }

  populateCategories();

  categorySelect.addEventListener("change", () =>
    selectCategory(categorySelect.value)
  );
  subcategorySelect.addEventListener("change", () =>
    selectSubcategory(subcategorySelect.value)
  );

  // ---------- Mode UI (solo / vs) ----------

  function refreshModeFromRadios() {
    const modeInput = document.querySelector('input[name="mode"]:checked');
    mode = modeInput ? modeInput.value : "solo";

    if (mode === "vs") {
      vsNameFields.classList.add("visible");
    } else {
      vsNameFields.classList.remove("visible");
    }
  }

  modeRadios.forEach((radio) =>
    radio.addEventListener("change", refreshModeFromRadios)
  );
  refreshModeFromRadios();

  // ---------- Screen management ----------

  function showScreen(name) {
    [
      screenLanding,
      screenSetup,
      screenSummary,
      screenQuiz,
      screenResults,
      screenLeaderboard,
      screenBuilder
    ].forEach((el) => el && el.classList.remove("active"));

    if (name === "landing") {
      screenLanding.classList.add("active");
      clearThemeClasses();
    } else if (name === "setup") {
      screenSetup.classList.add("active");
    } else if (name === "summary") {
      screenSummary.classList.add("active");
    } else if (name === "quiz") {
      screenQuiz.classList.add("active");
    } else if (name === "results") {
      screenResults.classList.add("active");
    } else if (name === "leaderboard") {
      screenLeaderboard.classList.add("active");
    } else if (name === "builder") {
      screenBuilder.classList.add("active");
    }
  }

  // ---------- Summary card ----------

  function prepareSummary() {
    const groupId = categorySelect.value;
    const subId = subcategorySelect.value;

    currentGroup = findGroupById(groupId);
    const found = findSubcategoryById(subId);
    currentSubcategory = found.subcategory;

    quizLength = parseInt(settingLength.value, 10) || 10;
    quizDifficulty = settingDifficulty.value || "mixed";

    refreshModeFromRadios();

    const timeLimitSeconds = getTimeLimitSeconds(quizLength);
    const minutes = Math.round(timeLimitSeconds / 60);

    summaryTitle.textContent = `${currentGroup.name} – ${currentSubcategory.name}`;
    summarySubtitle.textContent =
      "Check the details below, then start the quiz when you are ready.";
    summaryQuestions.textContent = String(quizLength);
    summaryDuration.textContent = String(minutes);
    summaryMode.textContent = mode === "solo" ? "Solo" : "Two-player";
    summaryDifficulty.textContent = `Difficulty: ${quizDifficulty}`;

    // Apply theme + subtheme so background matches the chosen quiz
    applyThemeClasses();
  }
