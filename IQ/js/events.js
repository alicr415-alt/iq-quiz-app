// js/events.js
// Central place to wire up all the main buttons.

document.addEventListener("DOMContentLoaded", () => {
  console.log("events.js wiring buttons...");

  const $ = (id) => document.getElementById(id);

  // Simple helper: are we logged in?
  // First try authService (new system), then fall back to old globals.
  const isLoggedIn = () => {
    if (
      window.authService &&
      typeof authService.isLoggedIn === "function"
    ) {
      return authService.isLoggedIn();
    }
    if (window.authState && window.authState.token) return true;
    if (typeof window.isLoggedIn === "function") return window.isLoggedIn();
    return false;
  };

  // Landing
  const btnLandingStart = $("btn-landing-start");

  // Setup screen
  const btnBackLanding = $("btn-back-landing");
  const btnSetupContinue = $("btn-setup-continue");
  const btnOpenLeaderboard = $("btn-open-leaderboard");

  // Summary screen
  const btnSummaryBack = $("btn-summary-back");
  const btnSummaryStart = $("btn-summary-start");

  // Quiz screen
  const btnPrev = $("btn-prev");
  const btnNext = $("btn-next");
  const btnQuit = $("btn-quit");
  const btnViewResults = $("btn-view-results");

  // Results screen
  const btnSaveScore = $("btn-save-score");
  const btnPlayAgain = $("btn-play-again");
  const btnBackSetup = $("btn-back-setup");
  const btnResultsLeaderboard = $("btn-results-leaderboard");

  // Leaderboard
  const btnLeaderboardBack = $("btn-leaderboard-back");

  // ------------------------------
  // Landing
  // ------------------------------
  if (btnLandingStart && typeof window.showScreen === "function") {
    btnLandingStart.addEventListener("click", () => {
      window.showScreen("setup");
    });
  }

  // ------------------------------
  // Setup screen
  // ------------------------------
  if (btnBackLanding && typeof window.showScreen === "function") {
    btnBackLanding.addEventListener("click", () => {
      window.showScreen("landing");
    });
  }

  if (
    btnSetupContinue &&
    typeof window.prepareSummary === "function" &&
    typeof window.showScreen === "function"
  ) {
    btnSetupContinue.addEventListener("click", (e) => {
      e.preventDefault();
      window.prepareSummary();
      window.showScreen("summary");
    });
  }

  // Setup → Leaderboard (current category) – only for logged in users
  if (btnOpenLeaderboard) {
    btnOpenLeaderboard.addEventListener("click", (e) => {
      e.preventDefault();

      if (!isLoggedIn()) {
        alert("Please log in or register to view the leaderboard.");
        return;
      }

      // Prefer the new leaderboardService
      if (
        window.leaderboardService &&
        typeof leaderboardService.loadForCurrentSelection === "function"
      ) {
        leaderboardService.loadForCurrentSelection();
      } else if (
        typeof window.openLeaderboardForCurrentSelection === "function"
      ) {
        window.openLeaderboardForCurrentSelection();
      } else if (
        typeof window.loadLeaderboardForCurrentSelection === "function"
      ) {
        window.loadLeaderboardForCurrentSelection();
      } else if (
        typeof window.renderLeaderboardForCurrentSelection === "function"
      ) {
        window.renderLeaderboardForCurrentSelection();
      }

      if (typeof window.showScreen === "function") {
        window.showScreen("leaderboard");
      }
    });
  }

  // ------------------------------
  // Summary screen
  // ------------------------------
  if (btnSummaryBack && typeof window.showScreen === "function") {
    btnSummaryBack.addEventListener("click", () => {
      window.showScreen("setup");
    });
  }

  if (btnSummaryStart && typeof window.startQuiz === "function") {
    btnSummaryStart.addEventListener("click", () => {
      const maybePromise = window.startQuiz();
      if (maybePromise && typeof maybePromise.then === "function") {
        maybePromise.catch((err) => {
          console.error("Failed to start quiz:", err);
          alert("Something went wrong starting the quiz.");
        });
      }
    });
  }

  // ------------------------------
  // Quiz navigation
  // ------------------------------
  if (btnPrev && typeof window.goToPreviousQuestion === "function") {
    btnPrev.addEventListener("click", window.goToPreviousQuestion);
  }

  if (btnNext && typeof window.goToNextQuestion === "function") {
    btnNext.addEventListener("click", window.goToNextQuestion);
  }

  if (
    btnQuit &&
    typeof window.resetQuizState === "function" &&
    typeof window.showScreen === "function"
  ) {
    btnQuit.addEventListener("click", () => {
      const confirmQuit = confirm(
        "End this quiz and return to the setup page?"
      );
      if (!confirmQuit) return;
      window.resetQuizState();
      window.showScreen("setup");
    });
  }

  // “View results” banner
  if (btnViewResults && typeof window.endQuiz === "function") {
    btnViewResults.addEventListener("click", () => {
      window.endQuiz("manual");
    });
  }

    // ------------------------------
  // Results screen
  // ------------------------------
  if (btnSaveScore) {
    btnSaveScore.addEventListener("click", () => {
      // Only logged-in users can save scores
      if (!isLoggedIn()) {
        alert("Please log in or register to save your score.");
        return;
      }

      if (typeof window.onSaveScore === "function") {
        window.onSaveScore();
      } else {
        console.warn(
          "onSaveScore is not defined – check quiz.js / score logic."
        );
      }
    });
  }

  // Results → Leaderboard (only logged in)
  if (btnResultsLeaderboard) {
    btnResultsLeaderboard.addEventListener("click", (e) => {
      e.preventDefault();

      if (!isLoggedIn()) {
        alert("Please log in or register to view the leaderboard.");
        return;
      }

      if (
        window.leaderboardService &&
        typeof leaderboardService.loadForCurrentSelection === "function"
      ) {
        // Show leaderboard for whatever category is currently selected
        leaderboardService.loadForCurrentSelection();
      } else if (
        typeof window.openLeaderboardForCurrentQuiz === "function"
      ) {
        window.openLeaderboardForCurrentQuiz();
      } else if (
        typeof window.renderLeaderboardForCurrentGroup === "function"
      ) {
        window.renderLeaderboardForCurrentGroup();
      }

      if (typeof window.showScreen === "function") {
        window.showScreen("leaderboard");
      }
    });
  }

  if (
    btnPlayAgain &&
    typeof window.prepareSummary === "function" &&
    typeof window.showScreen === "function"
  ) {
    btnPlayAgain.addEventListener("click", () => {
      window.prepareSummary();
      window.showScreen("summary");
    });
  }

  if (
    btnBackSetup &&
    typeof window.resetQuizState === "function" &&
    typeof window.showScreen === "function"
  ) {
    btnBackSetup.addEventListener("click", () => {
      window.resetQuizState();
      window.showScreen("setup");
    });
  }

  // ------------------------------
  // Leaderboard Back
  // ------------------------------
  if (btnLeaderboardBack && typeof window.showScreen === "function") {
    btnLeaderboardBack.addEventListener("click", () => {
      window.showScreen("setup");
    });
  }

  // ------------------------------
  // Initial screen
  // ------------------------------
  if (typeof window.showScreen === "function") {
    window.showScreen("landing");
  }
});


