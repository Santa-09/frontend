// app.js

let socket;
let isAdmin = false; // track admin state
const backendUrl = window.BACKEND_URL;

// Elements
const statusText = document.getElementById("statusText");
const questionInput = document.getElementById("questionInput");
const askBtn = document.getElementById("askBtn");
const questionsContainer = document.getElementById("questions");
const listEmpty = document.getElementById("listEmpty");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const adminModal = document.getElementById("adminModal");
const adminPasswordInput = document.getElementById("adminPasswordInput");
const adminSubmitBtn = document.getElementById("adminSubmitBtn");
const adminCancelBtn = document.getElementById("adminCancelBtn");
const totalMembersCount = document.getElementById("totalMembersCount");
const adminMembers = document.getElementById("adminMembers");

// -------------------- SOCKET --------------------
function connectSocket() {
  socket = new SockJS(`${backendUrl}/ws`);

  socket.onopen = () => {
    statusText.textContent = "Connected";
    statusText.parentElement.classList.remove("bg-blue-100", "text-blue-700");
    statusText.parentElement.classList.add("bg-green-100", "text-green-700");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "questions") {
      renderQuestions(data.questions);
    }
  };

  socket.onclose = () => {
    statusText.textContent = "Disconnected. Reconnecting...";
    statusText.parentElement.classList.remove("bg-green-100", "text-green-700");
    statusText.parentElement.classList.add("bg-blue-100", "text-blue-700");
    setTimeout(connectSocket, 2000);
  };
}

connectSocket();

// -------------------- RENDER --------------------
function renderQuestions(questions) {
  questionsContainer.innerHTML = "";
  if (!questions || questions.length === 0) {
    listEmpty.classList.remove("hidden");
    return;
  }
  listEmpty.classList.add("hidden");

  questions.forEach((q) => {
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl p-4 shadow";

    const header = document.createElement("div");
    header.className = "flex justify-between items-center mb-2";
    const meta = document.createElement("div");
    meta.innerHTML = `<p class="font-semibold">${q.author}</p>
      <p class="text-xs text-gray-400">${new Date(q.timestamp).toLocaleString()}</p>`;
    header.appendChild(meta);

    // delete button only for admin
    if (isAdmin) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "text-red-500 text-sm";
      delBtn.onclick = () => deleteQuestion(q.id);
      header.appendChild(delBtn);
    }

    card.appendChild(header);

    const content = document.createElement("p");
    content.textContent = q.text;
    content.className = "mb-2";
    card.appendChild(content);

    // Replies
    q.replies.forEach((r) => {
      const reply = document.createElement("div");
      reply.className = "bg-gray-100 p-2 rounded mb-1 flex justify-between";
      reply.innerHTML = `<span>${r.text}</span>`;
      if (isAdmin) {
        const rDelBtn = document.createElement("button");
        rDelBtn.textContent = "Delete";
        rDelBtn.className = "text-red-500 text-xs";
        rDelBtn.onclick = () => deleteReply(q.id, r.id);
        reply.appendChild(rDelBtn);
      }
      card.appendChild(reply);
    });

    // Reply input
    const replyBox = document.createElement("div");
    replyBox.className = "flex gap-2 mt-2";
    replyBox.innerHTML = `
      <input type="text" placeholder="Write a reply..." class="flex-1 border border-gray-200 rounded-lg px-2 py-1">
      <button class="bg-gray-800 text-white px-3 rounded-lg">Reply</button>`;
    const replyInput = replyBox.querySelector("input");
    const replyBtn = replyBox.querySelector("button");
    replyBtn.onclick = () => sendReply(q.id, replyInput.value);
    card.appendChild(replyBox);

    questionsContainer.appendChild(card);
  });
}

// -------------------- API --------------------
function sendQuestion() {
  const text = questionInput.value.trim();
  if (!text) return;
  fetch(`${backendUrl}/api/question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  questionInput.value = "";
}

function sendReply(qid, text) {
  if (!text.trim()) return;
  fetch(`${backendUrl}/api/question/${qid}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}

function deleteQuestion(qid) {
  if (!isAdmin) return;
  fetch(`${backendUrl}/api/question/${qid}`, { method: "DELETE" });
}

function deleteReply(qid, rid) {
  if (!isAdmin) return;
  fetch(`${backendUrl}/api/question/${qid}/reply/${rid}`, { method: "DELETE" });
}

function clearAll() {
  if (!isAdmin) return;
  fetch(`${backendUrl}/api/admin/clear`, { method: "DELETE" });
}

// -------------------- ADMIN --------------------
function openAdminModal() {
  adminModal.classList.remove("hidden");
}
function closeAdminModal() {
  adminModal.classList.add("hidden");
  adminPasswordInput.value = "";
}

function loginAdmin() {
  const password = adminPasswordInput.value.trim();
  fetch(`${backendUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  })
    .then((res) => {
      if (res.ok) {
        isAdmin = true;
        clearAllBtn.classList.remove("hidden");
        closeAdminModal();
        fetchAdminMembers();
        renderQuestions([]); // re-render to show delete buttons
      } else {
        alert("Invalid password");
      }
    })
    .catch(() => alert("Error logging in"));
}

function fetchAdminMembers() {
  fetch(`${backendUrl}/api/admin/members`)
    .then((res) => res.json())
    .then((data) => {
      totalMembersCount.textContent = data.totalMembers;
      adminMembers.classList.remove("hidden");
    })
    .catch(() => {});
}

// -------------------- EVENTS --------------------
askBtn.onclick = sendQuestion;
questionInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendQuestion();
});

adminLoginBtn.onclick = openAdminModal;
adminCancelBtn.onclick = closeAdminModal;
adminSubmitBtn.onclick = loginAdmin;
clearAllBtn.onclick = clearAll;
