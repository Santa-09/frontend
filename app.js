function questionCard(q) {
  const card = document.createElement("div");
  card.className = "card bg-white rounded-2xl p-5";
  card.dataset.qid = q.id;
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

  const repliesEl = card.querySelector("[data-replies]");
  (q.replies || []).forEach((r) => appendReply(repliesEl, q.id, r));

  const input = card.querySelector("input");
  const btn = card.querySelector("button");

  btn.addEventListener("click", () => sendReply(q.id, input));
  input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendReply(q.id, input); });

  // ✅ Render delete button if adminToken exists
  if (adminToken) renderAdminDelete(card, q.id);

  return card;
}

function appendReply(repliesEl, qid, r) {
  const li = document.createElement("div");
  li.className = "bg-gray-50 rounded-xl px-3 py-2 text-sm flex justify-between items-center";
  li.innerHTML = `<span>${escapeHTML(r.text)}</span>`;

  // ✅ Render delete button if adminToken exists
  if (adminToken) {
    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.className = "text-xs text-red-600 hover:text-red-800 ml-2 underline";
    delBtn.addEventListener("click", () => deleteReply(qid, r.id));
    li.appendChild(delBtn);
  }

  repliesEl.appendChild(li);
}

// Utility to render delete button for a question
function renderAdminDelete(card, qid) {
  const adminActions = card.querySelector("[data-admin-actions]");
  const delBtn = document.createElement("button");
  delBtn.textContent = "Delete";
  delBtn.className = "text-xs text-red-600 hover:text-red-800 underline";
  delBtn.addEventListener("click", () => deleteQuestion(qid));
  adminActions.appendChild(delBtn);
}
