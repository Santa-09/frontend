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
  const maintenanceBanner = document.getElementById("maintenanceBanner");

  // admin state (reset every refresh)
  let adminToken = null;
  let maintenance = false;

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

  function setMaintenanceUI(on) {
    maintenance = !!on;
    // Banner
    maintenanceBanner.classList.toggle("hidden", !maintenance);
    // Disable main ask input
    qInput.disabled = maintenance;
    askBtn.disabled = maintenance;
    qInput.classList.toggle("opacity-60", maintenance);
    askBtn.classList.toggle("opacity-60", maintenance);

    // Disable all reply inputs & buttons
    document.querySelectorAll('[data-replies]').forEach(container => {
      const parent = container.closest('[data-qid]');
      if (!parent) return;
      const input = parent.querySelector('input[type="text"]');
      const btn = parent.querySelector('button');
      if (input) input.disabled = maintenance;
      if (btn) btn.disabled = maintenance;
      if (input) input.classList.toggle("opacity-60", maintenance);
      if (btn) btn.classList.toggle("opacity-60", maintenance);
    });

    // Admin button text
    if (adminToken) {
      maintenanceBtn.textContent = maintenance ? "Disable Maintenance" : "Enable Maintenance";
    }
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
    // Re-apply maintenance state after rendering
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
          <p class="text-xs text-gray-400 mt-1">${date.toLocaleString()}</p>
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

    // Show delete only if admin
    if (adminToken) renderAdminDelete(card, q.id, repliesEl, q.replies || []);

    return card;
  }

  function appendReply(repliesEl, qid, r) {
    const li = document.createElement("div");
    li.className = "bg-gray-50 rounded-xl px-3 py-2 text-sm flex justify-between items-center";
    li.innerHTML = `<span>${escapeHTML(r.text)}</span>`;
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
      const res = await fetch(BASE_URL + "/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        if (res.status === 503) {
          alert("🚧 Server under maintenance. Try later.");
        } else {
          alert("Create failed");
        }
        return;
      }
      qInput.value = "";
    } catch {
      alert("Failed to post. Check connection.");
    }
  }

  async function sendReply(qid, input) {
    const text = input.value.trim();
    if (!text) return;
    try {
      const res = await fetch(BASE_URL + `/api/questions/${qid}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        if (res.status === 503) {
          alert("🚧 Server under maintenance. Try later.");
        } else {
          alert("Reply failed");
        }
        return;
      }
      input.value = "";
    } catch {
      alert("Failed to send reply. Check connection.");
    }
  }

  // WebSocket
  let sock;
  function connectWS() {
    setStatus(false);
    sock = new SockJS(WS_URL);
    sock.onopen = () => setStatus(true);
    sock.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new-question") prependQuestion(msg.payload);
        else if (msg.type === "new-reply") addReply(msg.payload.questionId, msg.payload.reply);
        else if (msg.type === "delete-question") removeQuestion(msg.payload.id);
        else if (msg.type === "delete-reply") removeReply(msg.payload.questionId, msg.payload.replyId);
        else if (msg.type === "clear-all") fetchQuestions();
        else if (msg.type === "maintenance") setMaintenanceUI(msg.payload.status);
      } catch {}
    };
    sock.onclose = () => {
      setStatus(false);
      setTimeout(connectWS, 1500);
    };
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
  function removeReply(qid, rid) {
    // Simplest reliable refresh
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

  function renderAdminDelete(card, qid, repliesEl, repliesList) {
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
      adminToken = data.token; // memory only
      alert("✅ Admin logged in");
      clearAllBtn.classList.remove("hidden");
      maintenanceBtn.classList.remove("hidden");
      fetchQuestions();
      adminModal.classList.add("hidden");

      // fetch members after login
      fetchAdminMembers();

      // fetch maintenance status
      fetchMaintenanceStatus();
    } catch {
      alert("❌ Admin login failed");
    }
  }

  adminSubmitBtn.addEventListener("click", () => loginAdmin(adminPasswordInput.value.trim()));
  adminPasswordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") loginAdmin(adminPasswordInput.value.trim());
  });

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

  // Maintenance toggle
  maintenanceBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");
    try {
      const res = await fetch(BASE_URL + "/api/admin/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + adminToken
        },
        body: JSON.stringify({ status: !maintenance })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMaintenanceUI(data.status);
    } catch {
      alert("❌ Failed to toggle maintenance");
    }
  });

  async function fetchMaintenanceStatus() {
    try {
      const res = await fetch(BASE_URL + "/api/admin/maintenance", {
        headers: { Authorization: "Bearer " + adminToken }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMaintenanceUI(data.status);
    } catch {
      // ignore if not admin or error
    }
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
        li.textContent = m.id || "Anonymous";
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
  document.getElementById("adminMembers").classList.add("hidden");
  fetchQuestions();
  connectWS();
})();
