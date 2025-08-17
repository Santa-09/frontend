(function () {
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("statusText");
  const qInput = document.getElementById("questionInput");
  const askBtn = document.getElementById("askBtn");
  const qList = document.getElementById("questions");
  const emptyEl = document.getElementById("listEmpty");

  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const maintenanceBtn = document.getElementById("maintenanceBtn");
  const maintenancePanel = document.getElementById("maintenancePanel");
  const maintDuration = document.getElementById("maintDuration");
  const maintMessage = document.getElementById("maintMessage");
  const maintLogo = document.getElementById("maintLogo");
  const applyMaintBtn = document.getElementById("applyMaintBtn");
  const disableMaintBtn = document.getElementById("disableMaintBtn");
  const maintUntilText = document.getElementById("maintUntilText");

  const maintenanceBanner = document.getElementById("maintenanceBanner");
  const maintenanceText = document.getElementById("maintenanceText");
  const maintenanceLogo = document.getElementById("maintenanceLogo");
  const maintenanceTimerNote = document.getElementById("maintenanceTimerNote");

  // admin state (reset every refresh)
  let adminToken = null;

  // maintenance local state
  let maintenance = {
    status: false,
    message: "Server under maintenance. Please try again later.",
    logoUrl: "",
    until: null
  };

  // ----------- NEW FEATURE: temp user ID -----------
  let tempUserId = localStorage.getItem("tempUserId");
  if (!tempUserId) {
    tempUserId = prompt("Enter your username (e.g., user@123):", `user@${Math.floor(Math.random() * 1000)}`);
    if (!tempUserId) tempUserId = `user@${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem("tempUserId", tempUserId);
  }

  // Auto-detect backend URL
  function computeBackendUrl() {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
    return (window.BACKEND_URL || "").replace(/\/+$/, "");
  }

  const BASE_URL = computeBackendUrl();
  const WS_URL = BASE_URL + "/ws";

  function setStatus(connected) {
    statusEl.className = `inline-flex items-center gap-2 px-4 py-2 rounded-full mt-5 ${
      connected ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
    }`;
    statusText.textContent = connected ? "Connected" : "Connecting...";
  }

  function setMaintenanceUI(state) {
    maintenance = { ...maintenance, ...state };

    const on = !!maintenance.status;
    maintenanceBanner.classList.toggle("hidden", !on);

    maintenanceText.textContent = maintenance.message || "🚧 Server under maintenance. Chat is temporarily disabled.";
    if (maintenance.logoUrl) {
      maintenanceLogo.src = maintenance.logoUrl;
      maintenanceLogo.classList.remove("hidden");
    } else {
      maintenanceLogo.classList.add("hidden");
      maintenanceLogo.removeAttribute("src");
    }

    if (maintenance.until) {
      const d = new Date(maintenance.until);
      if (!isNaN(d)) {
        maintenanceTimerNote.textContent = `Maintenance will end at ${d.toLocaleString()}`;
        maintenanceTimerNote.classList.remove("hidden");
        maintUntilText.textContent = `Ends at: ${d.toLocaleString()}`;
        maintUntilText.classList.remove("hidden");
      }
    } else {
      maintenanceTimerNote.classList.add("hidden");
      maintUntilText.classList.add("hidden");
    }

    qInput.disabled = on;
    askBtn.disabled = on;
    qInput.classList.toggle("opacity-60", on);
    askBtn.classList.toggle("opacity-60", on);

    document.querySelectorAll('[data-replies]').forEach(container => {
      const parent = container.closest('[data-qid]');
      if (!parent) return;
      const input = parent.querySelector('input[type="text"]');
      const btn = parent.querySelector('button');
      if (input) input.disabled = on;
      if (btn) btn.disabled = on;
      if (input) input.classList.toggle("opacity-60", on);
      if (btn) btn.classList.toggle("opacity-60", on);
    });
  }

  async function fetchQuestions() {
    try {
      const res = await fetch(BASE_URL + "/api/questions");
      const list = await res.json();
      renderQuestions(list);
    } catch (e) {
      console.error(e);
    }
  }

  function renderQuestions(list) {
    qList.innerHTML = "";
    if (!list || list.length === 0) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";
    list.forEach((q) => qList.appendChild(questionCard(q)));
    setMaintenanceUI(maintenance);
  }

  function questionCard(q) {
    const card = document.createElement("div");
    card.className = "card bg-white rounded-2xl p-5";
    card.dataset.qid = q.id;
    const date = new Date(q.createdAt || Date.now());

    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-lg font-semibold">${escapeHTML(q.text)}</p>
          <p class="text-xs text-gray-400 mt-1">${date.toLocaleString()} - <span class="text-blue-700 font-medium">${escapeHTML(q.userId || "Anonymous")}</span></p>
        </div>
        <div class="flex gap-2 items-center" data-admin-actions></div>
      </div>
      <div class="mt-4 space-y-2" data-replies></div>
      <div class="mt-4 flex gap-2">
        <input type="text" placeholder="Write a reply..." class="flex-1 border border-gray-200 rounded-xl px-3 py-2 ring-focus">
        <button class="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-xl">Reply</button>
      </div>
    `;

    const repliesEl = card.querySelector("[data-replies]");
    (q.replies || []).forEach((r) => appendReply(repliesEl, q.id, r));

    const input = card.querySelector("input");
    const btn = card.querySelector("button");

    btn.addEventListener("click", () => sendReply(q.id, input));
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendReply(q.id, input);
    });

    if (adminToken) renderAdminDelete(card, q.id, repliesEl, q.replies || []);

    return card;
  }

  function appendReply(repliesEl, qid, r) {
    const li = document.createElement("div");
    li.className = "bg-gray-50 rounded-xl px-3 py-2 text-sm flex justify-between items-center";
    li.innerHTML = `<span><span class="font-medium text-blue-700">${escapeHTML(r.userId || "Anonymous")}:</span> ${escapeHTML(r.text)}</span>`;
    if (adminToken) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "text-xs text-red-600 hover:text-red-800 ml-2 underline";
      delBtn.addEventListener("click", () => deleteReply(qid, r.id));
      li.appendChild(delBtn);
    }
    repliesEl.appendChild(li);
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  askBtn.addEventListener("click", sendQuestion);
  qInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendQuestion(); });

  async function sendQuestion() {
    const text = qInput.value.trim();
    if (!text) return;
    try {
      await fetch(BASE_URL + "/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userId: tempUserId }), // <--- added userId here
      });
      qInput.value = "";
    } catch {
      alert("Failed to post. Check connection.");
    }
  }

  async function sendReply(qid, input) {
    const text = input.value.trim();
    if (!text) return;
    try {
      await fetch(BASE_URL + `/api/questions/${qid}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userId: tempUserId }), // <--- added userId here
      });
      input.value = "";
    } catch {
      alert("Failed to send reply. Check connection.");
    }
  }

  // ... All other existing logic stays exactly the same ...
  // WebSocket, admin login, delete, maintenance, fetchMembers etc.

  adminToken = null;
  clearAllBtn.classList.add("hidden");
  maintenanceBtn.classList.add("hidden");
  maintenancePanel.classList.add("hidden");
  document.getElementById("adminMembers").classList.add("hidden");
  fetchQuestions();
  connectWS();
})();
