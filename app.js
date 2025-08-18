(function () {
  // === CONFIG - set your backend URL here or attach a global BACKEND_URL ===
  const BACKEND_URL = window.BACKEND_URL || "https://chic-reprieve-production.up.railway.app";

  // DOM elements
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("statusText");
  const qInput = document.getElementById("questionInput");
  const askBtn = document.getElementById("askBtn");
  const qList = document.getElementById("questions");
  const emptyEl = document.getElementById("listEmpty");

  // Admin elements
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

  // Maintenance UI
  const maintenanceBanner = document.getElementById("maintenanceBanner");
  const maintenanceText = document.getElementById("maintenanceText");
  const maintenanceLogo = document.getElementById("maintenanceLogo");
  const maintenanceTimerNote = document.getElementById("maintenanceTimerNote");

  // Settings
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const settingsSidebar = document.getElementById("settingsSidebar");
  const settingsOverlay = document.getElementById("settingsOverlay");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const currentTempUserEl = document.getElementById("currentTempUser");
  const headerUserLine = document.getElementById("headerUserLine");
  const aiAssistToggle = document.getElementById("aiAssistToggle");
  const mainTyping = document.getElementById("mainTyping");

  // State
  let adminToken = null;
  let maintenance = {
    status: false,
    message: "Server under maintenance. Please try again later.",
    logoUrl: "",
    until: null
  };

  // ===== Temporary username =====
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

  // ===== Theme =====
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
  if (themeToggleBtn) themeToggleBtn.addEventListener("click", () => {
    const current = localStorage.getItem("theme") || "light";
    applyTheme(current === "light" ? "dark" : "light");
  });

  // ===== Settings Sidebar =====
  function openSidebar() { if (settingsOverlay) settingsOverlay.classList.remove("hidden"); if (settingsSidebar) settingsSidebar.classList.add("open"); }
  function closeSidebar() { if (settingsOverlay) settingsOverlay.classList.add("hidden"); if (settingsSidebar) settingsSidebar.classList.remove("open"); }
  if (openSettingsBtn) openSettingsBtn.addEventListener("click", openSidebar);
  if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSidebar);
  if (settingsOverlay) settingsOverlay.addEventListener("click", closeSidebar);

  // ===== AI Assist =====
  const AI_ASSIST_KEY = "aiAssistEnabled";
  function getAiEnabled() { return localStorage.getItem(AI_ASSIST_KEY) === "1"; }
  function setAiEnabled(v) { localStorage.setItem(AI_ASSIST_KEY, v ? "1" : "0"); }
  if (aiAssistToggle) aiAssistToggle.checked = getAiEnabled();
  if (aiAssistToggle) aiAssistToggle.addEventListener("change", () => setAiEnabled(aiAssistToggle.checked));

  // ===== Connection Status =====
  function setStatus(connected) {
    if (!statusEl || !statusText) return;
    statusEl.className = `inline-flex items-center gap-2 px-4 py-2 rounded-full mt-5 ${
      connected
        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200"
    }`;
    statusText.textContent = connected ? "Connected" : "Connecting...";
  }

  // ===== Maintenance UI =====
  function setMaintenanceUI(state) {
    maintenance = { ...maintenance, ...state };
    const on = !!maintenance.status;
    if (maintenanceBanner) maintenanceBanner.classList.toggle("hidden", !on);
    if (maintenanceText) maintenanceText.textContent = maintenance.message || "🚧 Server under maintenance. Chat is temporarily disabled.";

    if (maintenance.logoUrl) {
      if (maintenanceLogo) {
        maintenanceLogo.src = maintenance.logoUrl;
        maintenanceLogo.classList.remove("hidden");
      }
    } else {
      if (maintenanceLogo) {
        maintenanceLogo.classList.add("hidden");
        maintenanceLogo.removeAttribute("src");
      }
    }

    if (maintenance.until) {
      const d = new Date(maintenance.until);
      if (!isNaN(d)) {
        if (maintenanceTimerNote) {
          maintenanceTimerNote.textContent = `Maintenance will end at ${d.toLocaleString()}`;
          maintenanceTimerNote.classList.remove("hidden");
        }
        if (maintUntilText) { maintUntilText.textContent = `Ends at: ${d.toLocaleString()}`; maintUntilText.classList.remove("hidden"); }
      }
    } else {
      if (maintenanceTimerNote) maintenanceTimerNote.classList.add("hidden");
      if (maintUntilText) maintUntilText.classList.add("hidden");
    }

    // Disable inputs during maintenance
    if (qInput) { qInput.disabled = on; qInput.classList.toggle("opacity-60", on); }
    if (askBtn) { askBtn.disabled = on; askBtn.classList.toggle("opacity-60", on); }

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

  // ===== Questions =====
  async function fetchQuestions() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/questions`);
      if (!res.ok) throw new Error();
      const list = await res.json();
      renderQuestions(list);
    } catch (e) {
      console.error("Failed to fetch questions:", e);
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
                        dark:bg-gray-700 dark:text-gray-100">👤 ${safe}</span>`;
  }

  // ===== Typing Indicators =====
  const typingTimers = new Map();

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
    return String(str ?? "").replace(/[&<>\"']/g, (m) => 
      ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
  }

  // ===== Question/Reply Submission =====
  if (askBtn) askBtn.addEventListener("click", sendQuestion);
  if (qInput) qInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendQuestion(); });
  if (qInput) qInput.addEventListener("input", () => emitTyping(null));

  async function sendQuestion() {
    const text = qInput?.value.trim();
    if (!text) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/questions`, {
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
          alert("Failed to post question");
        }
        return;
      }

      const posted = await res.json().catch(() => null);
      qInput.value = "";

      // AI Assist
      if (getAiEnabled()) {
        try {
          const aiRes = await fetch(`${BACKEND_URL}/api/ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              questionId: posted?.id, 
              prompt: text 
            })
          });

          if (aiRes.ok) {
            const aiReply = await aiRes.json();
            addReply(aiReply.questionId, aiReply);
          }
        } catch (e) {
          console.error("AI assist failed:", e);
        }
      }
    } catch (e) {
      console.error("Failed to post question:", e);
      alert("Failed to post. Check connection.");
    }
  }

  async function sendReply(qid, input, typingEl) {
    const text = input?.value.trim();
    if (!text) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/questions/${qid}/replies`, {
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
          alert("Failed to post reply");
        }
        return;
      }

      input.value = "";
      if (typingEl) hideTyping(typingEl);
    } catch (e) {
      console.error("Failed to post reply:", e);
      alert("Failed to send reply. Check connection.");
    }
  }

  // ===== WebSocket =====
  let sock;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1500;

  function connectWS() {
    setStatus(false);
    try {
      sock = new SockJS(`${BACKEND_URL}/ws`);
    } catch (e) {
      console.error("Failed to init SockJS:", e);
      return;
    }

    sock.onopen = () => {
      setStatus(true);
      reconnectAttempts = 0;
      try {
        sock.send(JSON.stringify({ type: "set-username", username: tempUser }));
      } catch (e) {
        console.error("Failed to send username:", e);
      }
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
      } catch (e) {
        console.error("Failed to process WS message:", e);
      }
    };

    sock.onclose = () => {
      setStatus(false);
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(connectWS, RECONNECT_DELAY * Math.pow(2, reconnectAttempts));
      }
    };

    sock.onerror = (e) => {
      console.error("WebSocket error:", e);
      setStatus(false);
    };
  }

  function handleTypingEvent(payload) {
    const { questionId, username } = payload || {};
    if (!username || username === tempUser) return;

    const key = questionId || "main";
    const prevTimer = typingTimers.get(key);
    if (prevTimer) clearTimeout(prevTimer);

    const targetEl = questionId 
      ? [...qList.children].find((el) => el.dataset.qid === questionId)?.querySelector("[data-thread-typing]")
      : mainTyping;

    if (targetEl) {
      showTyping(targetEl, username);
      const t = setTimeout(() => hideTyping(targetEl), 1200);
      typingTimers.set(key, t);
    }
  }

  function emitTyping(qid) {
    try {
      sock?.send(JSON.stringify({ type: "typing", questionId: qid || null, username: tempUser }));
    } catch (e) {
      console.error("Failed to send typing indicator:", e);
    }
  }

  function prependQuestion(q) {
    if (emptyEl) emptyEl.style.display = "none";
    if (qList) qList.prepend(questionCard(q));
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
    if (qList.children.length === 0 && emptyEl) emptyEl.style.display = "";
  }

  function removeReply(qid, rid) { 
    // For simplicity we refetch full list. Could be optimized to remove single DOM node.
    fetchQuestions(); 
  }

  // ===== Admin Functions =====
  async function deleteQuestion(qid) {
    if (!adminToken) return;
    if (!confirm("Delete this question?")) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/questions/${qid}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });

      if (!res.ok) throw new Error();
      fetchQuestions();
    } catch (e) {
      console.error("Failed to delete question:", e);
      alert("❌ Failed to delete question");
    }
  }

  async function deleteReply(qid, rid) {
    if (!adminToken) return;
    if (!confirm("Delete this reply?")) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/questions/${qid}/replies/${rid}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });

      if (!res.ok) throw new Error();
      fetchQuestions();
    } catch (e) {
      console.error("Failed to delete reply:", e);
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

  // ===== Admin Modal =====
  const adminModal = document.getElementById("adminModal");
  const adminPasswordInput = document.getElementById("adminPasswordInput");
  const adminCancelBtn = document.getElementById("adminCancelBtn");
  const adminSubmitBtn = document.getElementById("adminSubmitBtn");

  function showAdminModal() {
    if (!adminModal) return;
    adminPasswordInput.value = "";
    adminModal.classList.remove("hidden");
    adminPasswordInput.focus();
  }

  if (adminLoginBtn) adminLoginBtn.addEventListener("click", showAdminModal);
  if (adminCancelBtn) adminCancelBtn.addEventListener("click", () => adminModal.classList.add("hidden"));

  async function loginAdmin(password) {
    if (!password) return alert("Please enter password");

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password })
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      adminToken = data.token;
      alert("✅ Admin logged in");
      if (clearAllBtn) clearAllBtn.classList.remove("hidden");
      if (maintenanceBtn) maintenanceBtn.classList.remove("hidden");
      if (adminModal) adminModal.classList.add("hidden");

      fetchAdminMembers();
      fetchMaintenanceStatus();

      // Enable admin controls on existing cards
      [...qList.children].forEach((card) => {
        const qid = card.dataset.qid;
        if (qid) renderAdminDelete(card, qid);
      });
    } catch (e) {
      console.error("Admin login failed:", e);
      alert("❌ Admin login failed");
    }
  }

  if (adminSubmitBtn) adminSubmitBtn.addEventListener("click", () => loginAdmin(adminPasswordInput.value.trim()));
  if (adminPasswordInput) adminPasswordInput.addEventListener("keypress", (e) => { 
    if (e.key === "Enter") loginAdmin(adminPasswordInput.value.trim()); 
  });

  // ===== Clear All =====
  if (clearAllBtn) clearAllBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");
    if (!confirm("Clear ALL questions and replies?")) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/questions`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });

      if (!res.ok) throw new Error();

      fetchQuestions();
      alert("✅ All questions cleared");
    } catch (e) {
      console.error("Failed to clear questions:", e);
      alert("❌ Failed to clear questions");
    }
  });

  // ===== Maintenance Controls =====
  if (maintenanceBtn) maintenanceBtn.addEventListener("click", () => {
    if (maintenancePanel) maintenancePanel.classList.toggle("hidden");
  });

  if (applyMaintBtn) applyMaintBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");
    const durationVal = maintDuration.value.trim();
    const durationMinutes = durationVal === "" ? undefined : Number(durationVal);

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/maintenance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminToken,
        },
        body: JSON.stringify({
          status: true,
          message: maintMessage.value.trim() || maintenance.message,
          logoUrl: maintLogo.value.trim() || "",
          duration: durationMinutes,
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setMaintenanceUI(data);
      alert("✅ Maintenance mode enabled");
    } catch (e) {
      console.error("Failed to enable maintenance:", e);
      alert("❌ Failed to enable maintenance");
    }
  });

  if (disableMaintBtn) disableMaintBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/maintenance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminToken,
        },
        body: JSON.stringify({
          status: false,
        }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setMaintenanceUI(data);
      alert("✅ Maintenance mode disabled");
    } catch (e) {
      console.error("Failed to disable maintenance:", e);
      alert("❌ Failed to disable maintenance");
    }
  });

  // ===== Admin Members =====
  async function fetchAdminMembers() {
    if (!adminToken) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/members`, {
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      console.log("👥 Members:", data.count ?? data.length ?? data);
      // If you have an admin UI element to show member count, populate it here
      const membersCountEl = document.getElementById("adminMembersCount");
      if (membersCountEl) membersCountEl.textContent = data.count ?? data.length ?? "-";
    } catch (e) {
      console.error("Failed to fetch members:", e);
    }
  }

  // ===== Maintenance Status Fetch =====
  async function fetchMaintenanceStatus() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/maintenance`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMaintenanceUI(data);
    } catch (e) {
      console.error("Failed to fetch maintenance status:", e);
    }
  }

  // ===== Init =====
  fetchQuestions();
  connectWS();
  fetchMaintenanceStatus();
})();
