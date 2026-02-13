// js/leaderboard.js
// Show the leaderboard for the currently selected category/subcategory.
// Only logged-in users can view the leaderboard.

(function () {
  const API_BASE_URL =
    window.API_BASE_URL || "http://127.0.0.1:5000/api";

  let titleEl;
  let listEl;
  let emptyEl;

  /**
   * Helper: find the current category & subcategory from setup screen.
   */
  function getCurrentCategoryAndSubcategory() {
    const categorySelect = document.getElementById("category-select");
    const subcategorySelect = document.getElementById("subcategory-select");

    const categoryId = categorySelect ? categorySelect.value : "";
    const subcategoryId = subcategorySelect ? subcategorySelect.value : "";

    return {
      categoryId,
      subcategoryId: subcategoryId || null,
    };
  }

  /**
   * Render leaderboard list in the <ol>.
   * Now uses a simple single text line per item.
   */
  function renderLeaderboard(scores, categoryId, subcategoryId) {
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = "";

    // Title
    if (titleEl) {
      let titleText = "Leaderboard";
      if (categoryId) {
        titleText += ` – ${categoryId}`;
      }
      if (subcategoryId) {
        titleText += ` / ${subcategoryId}`;
      }
      titleEl.textContent = titleText;
    }

    if (!scores.length) {
      emptyEl.textContent = "No scores saved yet for this category.";
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";

    scores.forEach((row, index) => {
      const li = document.createElement("li");
      li.className = "leaderboard-item";

      const rank = `#${index + 1}`;
      const user = row.user || "Unknown";
      const scoreText = `${row.score}/${row.total_questions}`;
      let dateText = "";

      if (row.created_at) {
        const d = new Date(row.created_at);
        dateText = d.toLocaleDateString();
      }

      // Simple, readable line:
      // #1  abbas  –  3/5  –  25/4/2026
      li.textContent = dateText
        ? `${rank}  ${user}  –  ${scoreText}  –  ${dateText}`
        : `${rank}  ${user}  –  ${scoreText}`;

      listEl.appendChild(li);
    });
  }

  /**
   * Load leaderboard for the current setup selection.
   * This is what events.js should call when the leaderboard screen opens.
   */
  async function loadForCurrentSelection() {
    // 1) Must be logged in (use authService safely)
    if (
      !window.authService ||
      typeof window.authService.isLoggedIn !== "function" ||
      !window.authService.isLoggedIn()
    ) {
      alert("Please log in or register to view the leaderboard.");
      return;
    }

    const { categoryId, subcategoryId } =
      getCurrentCategoryAndSubcategory();

    if (!categoryId) {
      alert("Please select a category on the setup screen first.");
      return;
    }

    const params = new URLSearchParams();
    params.set("category_id", categoryId);
    if (subcategoryId) params.set("subcategory_id", subcategoryId);
    params.set("limit", "20");

    try {
      // Build headers with JWT if available
      const headers = {
        Accept: "application/json",
      };

      if (
        window.authService &&
        typeof window.authService.getAuthHeaders === "function"
      ) {
        Object.assign(headers, window.authService.getAuthHeaders());
      }

      const res = await fetch(
        `${API_BASE_URL}/leaderboard?${params.toString()}`,
        {
          method: "GET",
          headers,
        }
      );

      if (res.status === 401) {
        alert("Please log in or register to view the leaderboard.");
        return;
      }

      if (!res.ok) {
        console.error("Leaderboard request failed with status:", res.status);
        alert("Error loading leaderboard.");
        return;
      }

      const data = await res.json().catch(() => ({}));
      const scores = data.scores || [];

      renderLeaderboard(scores, categoryId, subcategoryId);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
      alert("Network error loading leaderboard.");
    }
  }

  // Wire up once DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    titleEl = document.getElementById("leaderboard-title");
    listEl = document.getElementById("leaderboard-list");
    emptyEl = document.getElementById("leaderboard-empty");

    if (!titleEl || !listEl || !emptyEl) {
      // Leaderboard section not present – nothing to initialise
      return;
    }

    // Expose to other modules (events.js)
    window.leaderboardService = {
      loadForCurrentSelection,
    };
  });
})();
