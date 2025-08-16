(function() {
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("statusText");
  const qInput = document.getElementById("questionInput");
  const askBtn = document.getElementById("askBtn");
  const qList = document.getElementById("questions");
  const emptyEl = document.getElementById("listEmpty");

  function computeBackendUrl() {
    if (window.BACKEND_URL && window.BACKEND_URL.trim() !== "") {
      return window.BACKEND_URL.replace(/\/+$/, "");
    }
    return "https://web-production-1797e.up.railway.app";
  }

  const BASE_URL = computeBackendUrl();
  // WebSocket URL fix for production
  const WS_URL = BASE_URL.replace(/^http/, "ws") + "/ws";

  function setStatus(connected) {
    if (connected) {
      statusEl.className = "inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mt-5";
      statusText.textContent = "Connected";
    } else {
      statusEl.className = "inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mt-5";
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

    list.forEach(q => {
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
      </div>
      <div class="mt-4 space-y-2" data-replies></div>
      <div class="mt-4 flex gap-2">
        <input type="text" placeholder="Write a reply..." class="flex-1 border border-gray-200 rounded-xl px-3 py-2 ring-focus">
        <button class="bg-gray-800 hover:bg-black text-white px-4 py-2 rounded-xl">Reply</button>
      </div>
    `;

    const repliesEl = card.querySelector("[data-replies]");
    (q.replies || []).forEach(r => {
      const li = document.createElement("div");
      li.className = "bg-gray-50 rounded-xl px-3 py-2 text-sm";
      li.textContent = r.text;
      repliesEl.appendChild(li);
    });

    const input = card.querySelector("input");
    const btn = card.querySelector("button");
    btn.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) return;
      try {
        const res = await fetch(BASE_URL + `/api/questions/${q.id}/replies`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text })
        });
        if (!res.ok) throw new Error("Reply failed");
        input.value = "";
      } catch (e) {
        alert("Failed to send reply. Check connection.");
      }
    });

    return card;
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  askBtn.addEventListener("click", async () => {
    const text = qInput.value.trim();
    if (!text) return;
    try {
      const res = await fetch(BASE_URL + "/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error("Create failed");
      qInput.value = "";
    } catch (e) {
      alert("Failed to post. Check connection.");
    }
  });

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

  fetchQuestions();
  connectWS();
})();
