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

  // Settings + theme
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const settingsSidebar = document.getElementById("settingsSidebar");
  const settingsOverlay = document.getElementById("settingsOverlay");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const currentTempUserEl = document.getElementById("currentTempUser");
  const headerUserLine = document.getElementById("headerUserLine");
  const aiAssistToggle = document.getElementById("aiAssistToggle");
  const mainTyping = document.getElementById("mainTyping");

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
    const num = Math.floor(Math.random() * 900 + 100);
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

  function openSidebar() { settingsOverlay.classList.remove("hidden"); settingsSidebar.classList.add("open"); }
  function closeSidebar() { settingsOverlay.classList.add("hidden"); settingsSidebar.classList.remove("open"); }
  if (openSettingsBtn) openSettingsBtn.addEventListener("click", openSidebar);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSidebar);
  if (settingsOverlay) settingsOverlay.addEventListener("click", closeSidebar);

  // ===== AI Assist (local-only) =====
  const AI_ASSIST_KEY = "aiAssistEnabled";
  function getAiEnabled() { return localStorage.getItem(AI_ASSIST_KEY) === "1"; }
  function setAiEnabled(v) { localStorage.setItem(AI_ASSIST_KEY, v ? "1" : "0"); }
  if (aiAssistToggle) {
    aiAssistToggle.checked = getAiEnabled();
    aiAssistToggle.addEventListener("change", () => setAiEnabled(aiAssistToggle.checked));
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
      connected
        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
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

    // disable inputs
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

  function userBadge(name) {
    const safe = escapeHTML(name || "anonymous");
    return `<span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700
                        dark:bg-gray-700 dark:text-gray-100">👤 ${safe}</span>`;
  }

  // Track per-thread typing timers { qid?: timeoutId }
  const typingTimers = new Map(); // key: qid or 'main'

  function showTyping(targetEl, who) {
    if (!targetEl) return;
    targetEl.innerHTML = `<span class="inline-flex items-center gap-1 text-gray-500">
        <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        <span class="ml-1 text-xs">${who} is typing…</span>
      </span>`;
  }
  function hideTyping(targetEl) {
    if (!targetEl) return;
    targetEl.textContent = "";
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

      <div class="mt-3 h-4 text-xs text-gray-500" data-thread-typing></div>

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
    const typingEl = card.querySelector("[data-thread-typing]");

    btn.addEventListener("click", () => sendReply(q.id, input, typingEl));
    input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendReply(q.id, input, typingEl); });
    input.addEventListener("input", () => emitTyping(q.id));

    // Show delete only if admin
    if (adminToken) renderAdminDelete(card, q.id);

    return card;
  }

  function appendReply(repliesEl, qid, r) {
    const li = document.createElement("div");
    li.className = "bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2 text-sm flex justify-between items-center";
    const date = new Date(r.createdAt || Date.now());
    const who = r.user ? userBadge(r.user) : "";
    li.innerHTML = `
      <span>
        ${escapeHTML(r.text)} ${who ? `<span class="ml-2">${who}</span>` : ""}
        <span class="ml-2 text-xs text-gray-400">${date.toLocaleString()}</span>
      </span>
    `;
    // admin delete for replies handled by refetch after deletion
    if (adminToken && r.id) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "text-xs text-red-600 hover:text-red-800 ml-2 underline";
      delBtn.addEventListener("click", () => deleteReply(qid, r.id));
      li.appendChild(delBtn);
    }
    repliesEl.appendChild(li);
  }

  function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  }

  askBtn.addEventListener("click", () => sendQuestion());
  qInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendQuestion(); });
  qInput.addEventListener("input", () => emitTyping(null)); // main composer

  async function sendQuestion() {
    const text = qInput.value.trim();
    if (!text) return;
    try {
      const res = await fetch(BASE_URL + "/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, user: tempUser }),
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

      // Local AI Assist (not broadcast)
      if (getAiEnabled()) {
        setTimeout(() => {
          const pseudo = {
            id: `ai-q-${Date.now()}`,
            text: `🤖 AI Assist: "${text}" — Thanks for asking! (local preview)`,
            createdAt: new Date().toISOString(),
            user: "AI Assistant (local)"
          };
          // Prepend a local-only card with a single AI reply
          prependQuestionLocal(pseudo, true);
        }, 450);
      }
    } catch {
      alert("Failed to post. Check connection.");
    }
  }

  async function sendReply(qid, input, typingEl) {
    const text = input.value.trim();
    if (!text) return;
    try {
      const res = await fetch(BASE_URL + `/api/questions/${qid}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, user: tempUser }),
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

      // Local AI Assist reply (not broadcast)
      if (getAiEnabled()) {
        setTimeout(() => {
          const card = [...qList.children].find((el) => el.dataset.qid === qid);
          if (!card) return;
          const repliesEl = card.querySelector("[data-replies]");
          const reply = {
            id: `ai-r-${Date.now()}`,
            text: `🤖 AI Assist: "${text}" — here's a local-only hint.`,
            createdAt: new Date().toISOString(),
            user: "AI Assistant (local)"
          };
          appendReply(repliesEl, qid, reply);
        }, 400);
      }

      // Clear typing for this thread quickly
      if (typingEl) hideTyping(typingEl);
    } catch {
      alert("Failed to send reply. Check connection.");
    }
  }

  // WebSocket (SockJS)
  let sock;
  function connectWS() {
    setStatus(false);
    sock = new SockJS(WS_URL);

    sock.onopen = () => {
      setStatus(true);
      // register username for typing announcements
      try {
        sock.send(JSON.stringify({ type: "set-username", username: tempUser }));
      } catch {}
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
        else if (msg.type === "typing") handleTypingEvent(msg.payload);
      } catch {}
    };

    sock.onclose = () => {
      setStatus(false);
      setTimeout(connectWS, 1500);
    };
  }

  function typingTimeoutKey(qid) { return qid || "main"; }

  function handleTypingEvent(payload) {
    const { questionId, username } = payload || {};
    if (!username || username === tempUser) return; // don't show my own typing

    const key = typingTimeoutKey(questionId);
    const prevTimer = typingTimers.get(key);
    if (prevTimer) clearTimeout(prevTimer);

    if (questionId) {
      const card = [...qList.children].find((el) => el.dataset.qid === questionId);
      if (!card) return;
      const typingEl = card.querySelector("[data-thread-typing]");
      showTyping(typingEl, username);
      const t = setTimeout(() => hideTyping(typingEl), 1200);
      typingTimers.set(key, t);
    } else {
      showTyping(mainTyping, username);
      const t = setTimeout(() => hideTyping(mainTyping), 1200);
      typingTimers.set(key, t);
    }
  }

  function emitTyping(qid) {
    try {
      sock?.send(JSON.stringify({ type: "typing", questionId: qid || null, username: tempUser }));
    } catch {}
  }

  function prependQuestionLocal(q, aiOnly = false) {
    // like server question, but if aiOnly true, also drop a first AI reply locally
    emptyEl.style.display = "none";
    const card = questionCard(q);
    qList.prepend(card);
    if (aiOnly) {
      const repliesEl = card.querySelector("[data-replies]");
      const reply = {
        id: `ai-r-${Date.now()}`,
        text: "🤖 AI Assist: I'm here to help — this card is visible only to you.",
        createdAt: new Date().toISOString(),
        user: "AI Assistant (local)"
      };
      appendReply(repliesEl, q.id, reply);
    }
    setMaintenanceUI(maintenance);
  }

  function prependQuestion(q) {
    emptyEl.style.display = "none";
    qList.prepend(questionCard(q));
    setMaintenanceUI(maintenance);
  }
  function addReply(qid, reply) {
    const card = [...qList.children].find((el) => el.dataset.qid === qid);
    if (!card) return fetchQuestions();
    const repliesEl = card.querySelector("[data-replies]");
    appendReply(repliesEl, qid, reply);
    setMaintenanceUI(maintenance);
  }
  function removeQuestion(qid) {
    const card = [...qList.children].find((el) => el.dataset.qid === qid);
    if (card) card.remove();
    if (qList.children.length === 0) emptyEl.style.display = "";
  }
  function removeReply(qid, rid) { fetchQuestions(); }

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
    } catch {
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
    } catch {
      alert("❌ Failed to delete reply");
    }
  }

  function renderAdminDelete(card, qid) {
    const adminActions = card.querySelector("[data-admin-actions]");
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
    adminPasswordInput.value = "";
    adminModal.classList.remove("hidden");
    adminPasswordInput.focus();
  }
  adminLoginBtn.addEventListener("click", showAdminModal);
  adminCancelBtn.addEventListener("click", () => adminModal.classList.add("hidden"));

  async function loginAdmin(password) {
    if (!password) return alert("Please enter password");
    try {
      const res = await fetch(BASE_URL + "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      adminToken = data.token;
      alert("✅ Admin logged in");
      clearAllBtn.classList.remove("hidden");
      maintenanceBtn.classList.remove("hidden");
      adminModal.classList.add("hidden");

      fetchAdminMembers();
      fetchMaintenanceStatus();
      // After admin login, show delete buttons on existing cards
      [...qList.children].forEach((card) => {
        const qid = card.dataset.qid;
        if (qid) renderAdminDelete(card, qid);
      });
    } catch {
      alert("❌ Admin login failed");
    }
  }

  adminSubmitBtn.addEventListener("click", () => loginAdmin(adminPasswordInput.value.trim()));
  adminPasswordInput.addEventListener("keypress", (e) => { if (e.key === "Enter") loginAdmin(adminPasswordInput.value.trim()); });

  // Clear all (DELETE /api/questions)
  clearAllBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");
    if (!confirm("Clear ALL questions and replies?")) return;
    try {
      const res = await fetch(BASE_URL + "/api/questions", {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) throw new Error();
      fetchQuestions();
      alert("✅ All questions cleared");
    } catch {
      alert("❌ Failed to clear questions");
    }
  });

  // Toggle maintenance controls panel
  maintenanceBtn.addEventListener("click", () => {
    maintenancePanel.classList.toggle("hidden");
  });

  // Enable maintenance (apply)
  applyMaintBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");
    const durationVal = maintDuration.value.trim();
    const durationMinutes = durationVal === "" ? undefined : Number(durationVal);

    try {
      const res = await fetch(BASE_URL + "/api/admin/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminToken
        },
        body: JSON.stringify({
          status: true,
          message: maintMessage.value.trim() || undefined,
          logoUrl: maintLogo.value.trim() || undefined,
          durationMinutes
        })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMaintenanceUI(data);
      alert("🚧 Maintenance enabled. All users were disconnected.");
    } catch {
      alert("❌ Failed to enable maintenance");
    }
  });

  // Disable maintenance
  disableMaintBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");
    try {
      const res = await fetch(BASE_URL + "/api/admin/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminToken
        },
        body: JSON.stringify({ status: false })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMaintenanceUI(data);
      alert("✅ Maintenance disabled");
    } catch {
      alert("❌ Failed to disable maintenance");
    }
  });

  async function fetchMaintenanceStatus() {
    try {
      const res = await fetch(BASE_URL + "/api/admin/maintenance", {
        headers: { Authorization: "Bearer " + adminToken }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMaintenanceUI(data);

      // pre-fill controls with current values
      maintMessage.value = data.message || "";
      maintLogo.value = data.logoUrl || "";
      maintDuration.value = "";
    } catch {}
  }

  // Members list + count (admin only)
  async function fetchAdminMembers() {
    try {
      const res = await fetch(BASE_URL + "/api/admin/members", {
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      document.getElementById("totalMembersCount").textContent = data.totalMembers;
      const membersList = document.getElementById("membersList");
      membersList.innerHTML = "";
      data.members.forEach(m => {
        const li = document.createElement("li");
        li.textContent = m.username || m.id || "Anonymous";
        membersList.appendChild(li);
      });

      document.getElementById("adminMembers").classList.remove("hidden");
    } catch (e) {
      console.error("❌ Failed to fetch members:", e);
    }
  }

  // Init
  adminToken = null;
  clearAllBtn.classList.add("hidden");
  maintenanceBtn.classList.add("hidden");
  maintenancePanel.classList.add("hidden");
  document.getElementById("adminMembers").classList.add("hidden");
  fetchQuestions();
  connectWS();
})();
