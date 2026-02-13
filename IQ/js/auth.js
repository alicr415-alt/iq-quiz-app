// js/auth.js
// Handles login, register, logout and token storage for the IQ app.

(function () {
  // ✅ FIX: Use the API base defined in core.js (same-origin on Render)
  // Fallback keeps local dev working if core.js wasn’t loaded for any reason.
  const API_BASE_URL =
    window.API_BASE_URL || "http://127.0.0.1:5000/api";

  const TOKEN_KEY = "iq_token";
  const USER_KEY = "iq_user";

  // -------------------------------
  // Local storage helpers
  // -------------------------------

  function storeToken(token) {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function storeUser(user) {
    if (!user) return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearUser() {
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  // Used by other scripts (quiz/leaderboard/builder) to send auth headers
  function getAuthHeaders() {
    const token = getToken();
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  // -------------------------------
  // API calls
  // -------------------------------

  async function apiRegister(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Registration failed");
    }
    return data; // { message, token, user }
  }

  async function apiLogin(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }
    return data; // { message, token, user }
  }

  async function apiMe() {
    const headers = {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    };
    const res = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers,
    });

    if (res.status === 401) {
      // Token invalid/expired
      throw new Error("unauthorized");
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || "Failed to load profile");
    }
    return data; // { user, scores: [...] }
  }

  // -------------------------------
  // UI handling
  // -------------------------------

  let authLoggedOutEl;
  let authLoggedInEl;
  let authUserLabelEl;
  let authMessageEl;
  let inputUsernameEl;
  let inputPasswordEl;
  let btnLoginEl;
  let btnRegisterEl;
  let btnLogoutEl;
  let setupGreetingEl; // greeting on setup screen

  function setMessage(text, type) {
    if (!authMessageEl) return;
    authMessageEl.textContent = text || "";
    authMessageEl.classList.remove("error", "success");
    if (type === "error") authMessageEl.classList.add("error");
    if (type === "success") authMessageEl.classList.add("success");
  }

  function clearInputs() {
    if (inputUsernameEl) inputUsernameEl.value = "";
    if (inputPasswordEl) inputPasswordEl.value = "";
  }

  function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const user = getUser();

    if (!authLoggedOutEl || !authLoggedInEl) return;

    if (loggedIn && user) {
      const greeting = getTimeGreeting();

      authLoggedOutEl.classList.add("hidden");
      authLoggedInEl.classList.remove("hidden");

      if (authUserLabelEl) {
        authUserLabelEl.textContent = `${greeting}, ${user.username}`;
      }

      if (setupGreetingEl) {
        setupGreetingEl.textContent = `${greeting}, ${
          user.username
        } – your solo scores will be saved to the leaderboard.`;
      }
    } else {
      authLoggedOutEl.classList.remove("hidden");
      authLoggedInEl.classList.add("hidden");

      if (authUserLabelEl) {
        authUserLabelEl.textContent = "";
      }

      if (setupGreetingEl) {
        setupGreetingEl.textContent =
          "Playing as a guest – log in or register to save your scores and view the leaderboard.";
      }
    }
  }

  async function handleRegister() {
    if (!inputUsernameEl || !inputPasswordEl) return;
    const username = inputUsernameEl.value.trim();
    const password = inputPasswordEl.value;

    if (!username || !password) {
      setMessage("Please enter a username and password.", "error");
      return;
    }

    setMessage("Registering...", null);

    try {
      const data = await apiRegister(username, password);
      storeToken(data.token);
      storeUser(data.user);
      clearInputs();
      updateAuthUI();
      setMessage("Registered and logged in.", "success");
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  async function handleLogin() {
    if (!inputUsernameEl || !inputPasswordEl) return;
    const username = inputUsernameEl.value.trim();
    const password = inputPasswordEl.value;

    if (!username || !password) {
      setMessage("Please enter a username and password.", "error");
      return;
    }

    setMessage("Logging in...", null);

    try {
      const data = await apiLogin(username, password);
      storeToken(data.token);
      storeUser(data.user);
      clearInputs();
      updateAuthUI();
      setMessage("Logged in.", "success");
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  function handleLogout() {
    clearToken();
    clearUser();
    updateAuthUI();
    setMessage("Logged out.", "success");
  }

  async function refreshUserFromTokenIfNeeded() {
    if (!getToken()) return;
    if (getUser()) return;

    try {
      const data = await apiMe();
      if (data && data.user) {
        storeUser(data.user);
      }
    } catch (err) {
      if (err.message === "unauthorized") {
        clearToken();
        clearUser();
      }
    }
  }

  // -------------------------------
  // Init on DOM ready
  // -------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    authLoggedOutEl = document.getElementById("auth-logged-out");
    authLoggedInEl = document.getElementById("auth-logged-in");
    authUserLabelEl = document.getElementById("auth-user-label");
    authMessageEl = document.getElementById("auth-message");
    inputUsernameEl = document.getElementById("auth-username");
    inputPasswordEl = document.getElementById("auth-password");
    btnLoginEl = document.getElementById("btn-login");
    btnRegisterEl = document.getElementById("btn-register");
    btnLogoutEl = document.getElementById("btn-logout");
    setupGreetingEl = document.getElementById("setup-greeting-text");

    if (btnRegisterEl) {
      btnRegisterEl.addEventListener("click", (e) => {
        e.preventDefault();
        handleRegister();
      });
    }

    if (btnLoginEl) {
      btnLoginEl.addEventListener("click", (e) => {
        e.preventDefault();
        handleLogin();
      });
    }

    if (btnLogoutEl) {
      btnLogoutEl.addEventListener("click", (e) => {
        e.preventDefault();
        handleLogout();
      });
    }

    refreshUserFromTokenIfNeeded().finally(() => {
      updateAuthUI();
    });
  });

  // -------------------------------
  // Expose helpers to other scripts
  // -------------------------------

  // Keep API_BASE_URL global (some other files might rely on it)
  window.API_BASE_URL = API_BASE_URL;

  window.authService = {
    getToken,
    getUser,
    isLoggedIn,
    getAuthHeaders,
  };
})();
