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
  const maintenanceLogoImg = document.getElementById("maintenanceLogo");
  const maintenanceTimerNote = document.getElementById("maintenanceTimerNote");

  // Optional admin members panel (if present)
  const adminMembersList = document.getElementById("adminMembersList");

  // === Settings & theme ===
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const settingsSidebar = document.getElementById("settingsSidebar");
  const settingsOverlay = document.getElementById("settingsOverlay");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const currentTempUserEl = document.getElementById("currentTempUser");
  const headerUserLine = document.getElementById("headerUserLine");
  const aiToggle = document.getElementById("aiToggle");

  // admin state (reset every refresh)
  let adminToken = null;

  // maintenance local state
  let maintenance = {
    status: false,
    message: "Server under maintenance. Please try again later.",
    logoUrl: "",
    until: null
  };

  // ===== Temporary username (per device) =====
  function generateUsername() {
    const adjectives = ["bright","swift","calm","brave","mellow","clever","quiet","bold","eager","neat"];
    const animals = ["sparrow","otter","koala","lynx","panda","falcon","tiger","orca","yak","gecko"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const num = Math.floor(Math.random() * 900 + 100); // 3 digits
    return `${adj}_${animal}_${num}`;
  }
  let tempUser = localStorage.getItem("tempUser");
  if (!tempUser) {
    tempUser = generateUsername();
    localStorage.setItem("tempUser", tempUser);
  }
  if (currentTempUserEl) currentTempUserEl.textContent = tempUser;
  if (headerUserLine) headerUserLine.textContent = `You are posting as: ${tempUser}`;

  // ===== Theme (per device) =====
  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }
  const savedTheme = localStorage.getItem("theme") || "light";
  applyTheme(savedTheme);
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const current = localStorage.getItem("theme") || "light";
      applyTheme(current === "light" ? "dark" : "light");
    });
  }

  // ===== AI Mode toggle =====
  const savedAIMode = localStorage.getItem("aiMode") === "true";
  if (aiToggle) {
    aiToggle.checked = savedAIMode;
    aiToggle.addEventListener("change", () => {
      localStorage.setItem("aiMode", aiToggle.checked ? "true" : "false");
    });
  }
  function isAIModeOn() {
    return (aiToggle && aiToggle.checked) || false;
  }

  function openSidebar() {
    if (!settingsOverlay || !settingsSidebar) return;
    settingsOverlay.classList.remove("hidden");
    settingsSidebar.classList.add("open");
  }
  function closeSidebar() {
    if (!settingsOverlay || !settingsSidebar) return;
    settingsOverlay.classList.add("hidden");
    settingsSidebar.classList.remove("open");
  }
  if (openSettingsBtn) openSettingsBtn.addEventListener("click", openSidebar);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSidebar);
  if (settingsOverlay) settingsOverlay.addEventListener("click", closeSidebar);

  // Auto-detect backend URL
  function computeBackendUrl() {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "https://chic-reprieve-production.up.railway.app";
    }
    return (window.BACKEND_URL || "").replace(/\/+$/, "");
  }

  const BASE_URL = computeBackendUrl();
// force correct WebSocket protocol
const WS_URL = BASE_URL.replace(/^http/, "ws") + "/ws";


  function setStatus(connected) {
    if (!statusEl || !statusText) return;
    statusEl.className = `inline-flex items-center gap-2 px-4 py-2 rounded-full mt-5 ${
      connected
        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
    }`;
    statusText.textContent = connected ? "Connected" : "Connecting...";
  }

  function setMaintenanceUI(state) {
    maintenance = { ...maintenance, ...state };
    const on = !!maintenance.status;
    if (maintenanceBanner) maintenanceBanner.classList.toggle("hidden", !on);

    if (maintenanceText) maintenanceText.textContent = maintenance.message || "🚧 Server under maintenance. Chat is temporarily disabled.";
    if (maintenanceLogoImg) {
      if (maintenance.logoUrl) {
        maintenanceLogoImg.src = maintenance.logoUrl;
        maintenanceLogoImg.classList.remove("hidden");
      } else {
        maintenanceLogoImg.classList.add("hidden");
        maintenanceLogoImg.removeAttribute("src");
      }
    }

    if (maintenance.until) {
      const d = new Date(maintenance.until);
      if (!isNaN(d)) {
        if (maintenanceTimerNote) {
          maintenanceTimerNote.textContent = `Maintenance will end at ${d.toLocaleString()}`;
          maintenanceTimerNote.classList.remove("hidden");
        }
        if (maintUntilText) {
          maintUntilText.textContent = `Ends at: ${d.toLocaleString()}`;
          maintUntilText.classList.remove("hidden");
        }
      }
    } else {
      if (maintenanceTimerNote) maintenanceTimerNote.classList.add("hidden");
      if (maintUntilText) maintUntilText.classList.add("hidden");
    }

    // disable inputs everywhere
    if (qInput) {
      qInput.disabled = on;
      qInput.classList.toggle("opacity-60", on);
    }
    if (askBtn) {
      askBtn.disabled = on;
      askBtn.classList.toggle("opacity-60", on);
    }

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
      if (!res.ok) throw new Error("Failed to fetch questions");
      const list = await res.json();
      renderQuestions(list);
    } catch (e) {
      console.error("fetchQuestions error:", e);
    }
  }

  function renderQuestions(list) {
    if (!qList) return;
    qList.innerHTML = "";
    if (!list || list.length === 0) {
      if (emptyEl) emptyEl.style.display = "";
      return;
    }
    if (emptyEl) emptyEl.style.display = "none";
    list.forEach((q) => qList.appendChild(questionCard(q)));
    setMaintenanceUI(maintenance);
  }

  function userBadge(name) {
    const safe = escapeHTML(name || "anonymous");
    return `<span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700
                          dark:bg-gray-700 dark:text-gray-100">
              👤 ${safe}
            </span>`;
  }

  function questionCard(q) {
    const card = document.createElement("div");
    card.className = "card bg-white dark:bg-gray-800 rounded-2xl p-5";
    card.dataset.qid = q.id;
    const date = new Date(q.createdAt || Date.now());

    card.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-lg font-semibold">${escapeHTML(q.text)}</p>
          <div class="flex items-center gap-2 mt-2">
            ${userBadge(q.user)}
            <span class="text-xs text-gray-400">${date.toLocaleString()}</span>
          </div>
        </div>
        <div class="flex gap-2 items-center" data-admin-actions></div>
      </div>
      <div class="mt-4 space-y-2" data-replies></div>
      <div class="mt-4 flex gap-2">
        <input type="text" placeholder="Write a reply..."
               class="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 ring-focus
                      dark:bg-gray-900 dark:text-gray-100">
        <button class="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-xl">Reply</button>
      </div>
    `;

    const repliesEl = card.querySelector("[data-replies]");
    (q.replies || []).forEach((r) => appendReply(repliesEl, q.id, r));

    const input = card.querySelector("input");
    const btn = card.querySelector("button");

    btn.addEventListener("click", () => sendReply(q.id, input));
    input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendReply(q.id, input); });

    if (adminToken) renderAdminDelete(card, q.id);
    return card;
  }

  function appendReply(repliesEl, qid, r) {
    if (!repliesEl) return;
    const li = document.createElement("div");
    li.className = "bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2 text-sm flex justify-between items-center";
    const date = new Date(r.createdAt || Date.now());
    li.innerHTML = `
      <span>
        ${escapeHTML(r.text)}
        <span class="ml-2">${userBadge(r.user)}</span>
        <span class="ml-2 text-xs text-gray-400">${date.toLocaleString()}</span>
      </span>
    `;
    if (adminToken && r.user !== "AI Assistant") {
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "text-xs text-red-600 hover:text-red-800 ml-2 underline";
      delBtn.addEventListener("click", () => deleteReply(qid, r.id));
      li.appendChild(delBtn);
    }
    repliesEl.appendChild(li);
  }

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
  }

  if (askBtn) askBtn.addEventListener("click", sendQuestion);
  if (qInput) qInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendQuestion(); });

  async function sendQuestion() {
    if (!qInput) return;
    const text = qInput.value.trim();
    if (!text) return;
    try {
      const res = await fetch(BASE_URL + "/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, user: tempUser, ai: isAIModeOn() }),
      });
      if (!res.ok) {
        if (res.status === 503) {
          const data = await res.json().catch(() => ({}));
          setMaintenanceUI({
            status: true,
            message: data.message || maintenance.message,
            logoUrl: data.logoUrl ?? maintenance.logoUrl,
            until: data.until ?? null
          });
          alert("🚧 Server under maintenance. Try later.");
        } else {
          alert("Create failed");
        }
        return;
      }
      qInput.value = "";
    } catch (err) {
      console.error("sendQuestion error:", err);
      alert("Failed to post. Check connection.");
    }
  }

  async function sendReply(qid, input) {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    try {
      const res = await fetch(BASE_URL + `/api/questions/${qid}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, user: tempUser, ai: isAIModeOn() }),
      });
      if (!res.ok) {
        if (res.status === 503) {
          const data = await res.json().catch(() => ({}));
          setMaintenanceUI({
            status: true,
            message: data.message || maintenance.message,
            logoUrl: data.logoUrl ?? maintenance.logoUrl,
            until: data.until ?? null
          });
          alert("🚧 Server under maintenance. Try later.");
        } else {
          alert("Reply failed");
        }
        return;
      }
      input.value = "";
    } catch (err) {
      console.error("sendReply error:", err);
      alert("Failed to send reply. Check connection.");
    }
  }

  // WebSocket
  let sock;
  function connectWS() {
    setStatus(false);
    try {
      sock = new SockJS(WS_URL);
    } catch (e) {
      console.error("SockJS init error:", e);
      return;
    }
    sock.onopen = () => {
      setStatus(true);
      // send username so the backend can display members properly
      try { sock.send(JSON.stringify({ type: "set-username", username: tempUser })); } catch {}
    };
    sock.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new-question") prependQuestion(msg.payload);
        else if (msg.type === "new-reply") addReply(msg.payload.questionId, msg.payload.reply);
        else if (msg.type === "delete-question") removeQuestion(msg.payload.id);
        else if (msg.type === "delete-reply") removeReply(msg.payload.questionId, msg.payload.replyId);
        else if (msg.type === "clear-all") fetchQuestions();
        else if (msg.type === "maintenance") setMaintenanceUI(msg.payload);
      } catch (err) {
        // ignore parse errors
      }
    };
    sock.onclose = () => {
      setStatus(false);
      // try reconnect after a bit
      setTimeout(connectWS, 1500);
    };
  }

  function prependQuestion(q) {
    if (!qList || !emptyEl) return;
    emptyEl.style.display = "none";
    qList.prepend(questionCard(q));
    setMaintenanceUI(maintenance);
  }
  function addReply(qid, reply) {
    if (!qList) return fetchQuestions();
    const card = [...qList.children].find((el) => el.dataset.qid === qid);
    if (!card) return fetchQuestions();
    const repliesEl = card.querySelector("[data-replies]");
    appendReply(repliesEl, qid, reply);
    setMaintenanceUI(maintenance);
  }
  function removeQuestion(qid) {
    if (!qList) return;
    const card = [...qList.children].find((el) => el.dataset.qid === qid);
    if (card) card.remove();
    if (qList.children.length === 0 && emptyEl) emptyEl.style.display = "";
  }
  function removeReply(qid, rid) {
    // simplest: re-fetch to ensure consistent state
    fetchQuestions();
  }

  // Admin functions
  async function deleteQuestion(qid) {
    if (!adminToken) return;
    if (!confirm("Delete this question?")) return;
    try {
      const res = await fetch(BASE_URL + `/api/questions/${qid}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) throw new Error();
      fetchQuestions();
    } catch (err) {
      console.error("deleteQuestion error:", err);
      alert("❌ Failed to delete question");
    }
  }
  async function deleteReply(qid, rid) {
    if (!adminToken) return;
    if (!confirm("Delete this reply?")) return;
    try {
      const res = await fetch(BASE_URL + `/api/questions/${qid}/replies/${rid}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) throw new Error();
      fetchQuestions();
    } catch (err) {
      console.error("deleteReply error:", err);
      alert("❌ Failed to delete reply");
    }
  }

  function renderAdminDelete(card, qid) {
    const adminActions = card.querySelector("[data-admin-actions]");
    if (!adminActions) return;
    adminActions.innerHTML = "";
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "text-xs text-red-600 hover:text-red-800 underline";
    delBtn.addEventListener("click", () => deleteQuestion(qid));
    adminActions.appendChild(delBtn);
  }

  // Admin modal
  const adminModal = document.getElementById("adminModal");
  const adminPasswordInput = document.getElementById("adminPasswordInput");
  const adminCancelBtn = document.getElementById("adminCancelBtn");
  const adminSubmitBtn = document.getElementById("adminSubmitBtn");

  function showAdminModal() {
    if (!adminModal || !adminPasswordInput) return;
    adminPasswordInput.value = "";
    adminModal.classList.remove("hidden");
    adminPasswordInput.focus();
  }
  if (adminLoginBtn) adminLoginBtn.addEventListener("click", showAdminModal);
  if (adminCancelBtn) adminCancelBtn.addEventListener("click", () => adminModal.classList.add("hidden"));

  async function loginAdmin(password) {
    if (!password) return alert("Please enter password");
    try {
      const res = await fetch(BASE_URL + "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password })
      });
      if (!res.ok) throw new Error("login failed");
      const data = await res.json();
      adminToken = data.token; // memory only
      alert("✅ Admin logged in");
      if (clearAllBtn) clearAllBtn.classList.remove("hidden");
      if (maintenanceBtn) maintenanceBtn.classList.remove("hidden");
      if (adminModal) adminModal.classList.add("hidden");

      fetchAdminMembers();
      fetchMaintenanceStatus();
      [...(qList ? qList.children : [])].forEach((card) => {
        const qid = card.dataset.qid;
        if (qid) renderAdminDelete(card, qid);
      });
    } catch (err) {
      console.error("loginAdmin error:", err);
      alert("❌ Admin login failed");
    }
  }

  if (adminSubmitBtn) adminSubmitBtn.addEventListener("click", () => loginAdmin(adminPasswordInput.value.trim()));
  if (adminPasswordInput) adminPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loginAdmin(adminPasswordInput.value.trim());
  });

  // Clear all (DELETE /api/questions)
  if (clearAllBtn) clearAllBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");
    if (!confirm("Clear ALL questions and replies?")) return;
    try {
      const res = await fetch(BASE_URL + "/api/questions", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) throw new Error();
      fetchQuestions();
      alert("✅ All cleared");
    } catch (err) {
      console.error("clearAll error:", err);
      alert("❌ Failed to clear all");
    }
  });

  // Maintenance panel show/hide & actions
  function showMaintenancePanel() {
    if (!maintenancePanel) return;
    maintenancePanel.classList.remove("hidden");
    if (maintMessage) maintMessage.value = maintenance.message || "";
    if (maintLogo) maintLogo.value = maintenance.logoUrl || "";
    if (maintDuration) maintDuration.value = maintenance.until ? new Date(maintenance.until).toISOString().slice(0,16) : "";
  }
  function hideMaintenancePanel() {
    if (!maintenancePanel) return;
    maintenancePanel.classList.add("hidden");
  }
  if (maintenanceBtn) maintenanceBtn.addEventListener("click", showMaintenancePanel);

  // fetch current maintenance status (admin)
  async function fetchMaintenanceStatus() {
    if (!adminToken) return;
    try {
      const res = await fetch(BASE_URL + "/api/admin/maintenance", {
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) return;
      const data = await res.json();
      // expected { status, message, logoUrl, until }
      setMaintenanceUI(data);
      showMaintenancePanel();
    } catch (err) {
      console.error("fetchMaintenanceStatus error:", err);
    }
  }

  // apply maintenance - PUT /api/admin/maintenance
  async function applyMaintenance() {
    if (!adminToken) return alert("Not logged in as admin");
    const message = maintMessage ? maintMessage.value.trim() : "";
    const logoUrl = maintLogo ? maintLogo.value.trim() : "";
    const untilRaw = maintDuration ? maintDuration.value : "";
    let until = null;
    if (untilRaw) {
      const dt = new Date(untilRaw);
      if (!isNaN(dt)) until = dt.toISOString();
    }
    try {
      const res = await fetch(BASE_URL + "/api/admin/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + adminToken },
        body: JSON.stringify({ status: true, message, logoUrl, until }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMaintenanceUI(data);
      alert("✅ Maintenance applied");
      hideMaintenancePanel();
    } catch (err) {
      console.error("applyMaintenance error:", err);
      alert("❌ Failed to apply maintenance");
    }
  }

  // disable maintenance - DELETE /api/admin/maintenance
  async function disableMaintenance() {
    if (!adminToken) return alert("Not logged in as admin");
    if (!confirm("Disable maintenance mode?")) return;
    try {
      const res = await fetch(BASE_URL + "/api/admin/maintenance", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) throw new Error();
      setMaintenanceUI({ status: false, message: "", logoUrl: "", until: null });
      alert("✅ Maintenance disabled");
      hideMaintenancePanel();
    } catch (err) {
      console.error("disableMaintenance error:", err);
      alert("❌ Failed to disable maintenance");
    }
  }

  if (applyMaintBtn) applyMaintBtn.addEventListener("click", applyMaintenance);
  if (disableMaintBtn) disableMaintBtn.addEventListener("click", disableMaintenance);

  // admin members fetch + render (optional)
  async function fetchAdminMembers() {
    if (!adminToken || !adminMembersList) return;
    try {
      const res = await fetch(BASE_URL + "/api/admin/members", {
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) return;
      const data = await res.json();
      renderAdminMembers(data || []);
    } catch (err) {
      console.error("fetchAdminMembers error:", err);
    }
  }
  function renderAdminMembers(list) {
    if (!adminMembersList) return;
    adminMembersList.innerHTML = "";
    list.forEach(m => {
      const li = document.createElement("div");
      li.className = "flex items-center justify-between py-1";
      li.innerHTML = `<span class="text-sm">${escapeHTML(m.username || m)}</span>
                      <span class="text-xs text-gray-400">${m.online ? "online" : "offline"}</span>`;
      adminMembersList.appendChild(li);
    });
  }

  // initial load
  fetchQuestions();
  connectWS();

  // expose some helpers to window for debugging (optional)
  window.DEBUG_APP = {
    fetchQuestions,
    fetchMaintenanceStatus,
    applyMaintenance,
    disableMaintenance,
    getAdminToken: () => adminToken,
  };
})();
