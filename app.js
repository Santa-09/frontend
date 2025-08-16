(function () {
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("statusText");
  const qInput = document.getElementById("questionInput");
  const askBtn = document.getElementById("askBtn");
  const qList = document.getElementById("questions");
  const emptyEl = document.getElementById("listEmpty");

  // Admin buttons
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let adminToken = null;

  // ---- Set Railway backend URL ----
  const BASE_URL = "https://chic-reprieve-production.up.railway.app";
const WS_URL = BASE_URL.startsWith("https")
  ? BASE_URL.replace("https", "wss") + "/ws"
  : BASE_URL.replace("http", "ws") + "/ws";

  function setStatus(connected) {
    if (connected) {
      statusEl.className =
        "inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mt-5";
      statusText.textContent = "Connected";
    } else {
      statusEl.className =
        "inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mt-5";
      statusText.textContent = "Connecting...";
    }
  }

  async function fetchQuestions() {
    try {
      const res = await fetch(BASE_URL + "/api/questions");
      const list = await res.json();
      renderQuestions(list);
    } catch (e) {
      console.error("Failed to load questions", e);
    }
  }

  function renderQuestions(list) {
    qList.innerHTML = "";
    if (!list || list.length === 0) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";

    list.forEach((q) => {
      qList.appendChild(questionCard(q));
    });
  }

  function questionCard(q) {
    const card = document.createElement("div");
    card.className = "card bg-white rounded-2xl p-5";
    const date = new Date(q.createdAt);
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

    // render replies
    const repliesEl = card.querySelector("[data-replies]");
    (q.replies || []).forEach((r) => {
      const li = document.createElement("div");
      li.className =
        "bg-gray-50 rounded-xl px-3 py-2 text-sm flex justify-between items-center";
      li.innerHTML = `<span>${escapeHTML(r.text)}</span>`;
      if (adminToken) {
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.className =
          "text-xs text-red-600 hover:text-red-800 ml-2 underline";
        delBtn.addEventListener("click", () =>
          deleteReply(q.id, r.id)
        );
        li.appendChild(delBtn);
      }
      repliesEl.appendChild(li);
    });

    // reply handler
    const input = card.querySelector("input");
    const btn = card.querySelector("button");
    btn.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) return;
      try {
        const res = await fetch(BASE_URL + `/api/questions/${q.id}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("Reply failed");
        input.value = "";
      } catch (e) {
        alert("Failed to send reply. Check connection.");
      }
    });

    // admin delete button for question
    if (adminToken) {
      const adminActions = card.querySelector("[data-admin-actions]");
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className =
        "text-xs text-red-600 hover:text-red-800 underline";
      delBtn.addEventListener("click", () => deleteQuestion(q.id));
      adminActions.appendChild(delBtn);
    }

    return card;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, (m) =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m])
    );
  }

  // Ask handler
  askBtn.addEventListener("click", async () => {
    const text = qInput.value.trim();
    if (!text) return;
    try {
      const res = await fetch(BASE_URL + "/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Create failed");
      qInput.value = "";
    } catch (e) {
      alert("Failed to post. Check connection.");
    }
  });

  // Real-time via SockJS
  let sock;
  function connectWS() {
    setStatus(false);
    try {
      sock = new SockJS(WS_URL);
      sock.onopen = () => setStatus(true);
      sock.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "question_created") {
            prependQuestion(msg.payload);
          } else if (msg.type === "reply_added") {
            addReply(msg.payload.questionId, msg.payload.reply);
          } else if (
            msg.type === "question_deleted" ||
            msg.type === "reply_deleted" ||
            msg.type === "cleared"
          ) {
            fetchQuestions();
          }
        } catch {}
      };
      sock.onclose = () => {
        setStatus(false);
        setTimeout(connectWS, 1500);
      };
    } catch (e) {
      console.error("SockJS error", e);
      setTimeout(connectWS, 1500);
    }
  }

  function prependQuestion(q) {
    emptyEl.style.display = "none";
    const card = questionCard(q);
    qList.prepend(card);
  }

  function addReply(qid, reply) {
    fetchQuestions();
  }

  // --- Admin functions ---
  async function deleteQuestion(qid) {
    if (!adminToken) return alert("Not logged in");
    if (!confirm("Delete this question?")) return;
    try {
      const res = await fetch(BASE_URL + `/api/questions/${qid}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchQuestions();
    } catch (err) {
      alert("❌ Failed to delete question");
    }
  }

  async function deleteReply(qid, rid) {
    if (!adminToken) return alert("Not logged in");
    if (!confirm("Delete this reply?")) return;
    try {
      const res = await fetch(
        BASE_URL + `/api/questions/${qid}/replies/${rid}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer " + adminToken },
        }
      );
      if (!res.ok) throw new Error("Delete failed");
      fetchQuestions();
    } catch (err) {
      alert("❌ Failed to delete reply");
    }
  }

  // --- Admin login / clear ---
  adminLoginBtn.addEventListener("click", async () => {
    // auto-fill the key for testing
    const password = prompt("Enter admin password:", "santanu@2006");
    if (!password) return;
    try {
      const res = await fetch(BASE_URL + "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Login failed");
      const data = await res.json();
      adminToken = data.token;
      localStorage.setItem("adminToken", adminToken);
      alert("✅ Admin logged in");
      clearAllBtn.classList.remove("hidden");
      fetchQuestions(); // refresh to show delete buttons
    } catch (err) {
      alert("❌ Admin login failed");
    }
  });

  clearAllBtn.addEventListener("click", async () => {
    if (!adminToken) return alert("Not logged in as admin");
    if (!confirm("Are you sure you want to clear all questions and replies?"))
      return;
    try {
      const res = await fetch(BASE_URL + "/api/admin/clear", {
        method: "POST",
        headers: { Authorization: "Bearer " + adminToken },
      });
      if (!res.ok) throw new Error("Clear failed");
      alert("✅ All questions cleared");
      fetchQuestions();
    } catch (err) {
      alert("❌ Failed to clear questions");
    }
  });

  // Init
  // load token from localStorage if exists
  adminToken = localStorage.getItem("adminToken") || null;
  fetchQuestions();
  connectWS();
})();
