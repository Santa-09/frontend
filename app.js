(function () {
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("statusText");
  const qInput = document.getElementById("questionInput");
  const askBtn = document.getElementById("askBtn");
  const qList = document.getElementById("questions");
  const emptyEl = document.getElementById("listEmpty");

  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let adminToken = localStorage.getItem("adminToken") || null;

  const BASE_URL = window.BACKEND_URL || "https://chic-reprieve-production.up.railway.app";
  const WS_URL = BASE_URL + "/ws";

  function setStatus(connected) {
    statusEl.className = `inline-flex items-center gap-2 px-4 py-2 rounded-full mt-5 ${
      connected ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
    }`;
    statusText.textContent = connected ? "Connected" : "Connecting...";
  }

  async function fetchQuestions() {
    try {
      const res = await fetch(BASE_URL + "/api/questions");
      const list = await res.json();
      renderQuestions(list);
    } catch (e) { console.error(e); }
  }

  function renderQuestions(list) {
    qList.innerHTML = "";
    if (!list || list.length === 0) { emptyEl.style.display = ""; return; }
    emptyEl.style.display = "none";
    list.forEach(q => qList.appendChild(questionCard(q)));
  }

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
    (q.replies || []).forEach(r => appendReply(repliesEl, q.id, r));

    const input = card.querySelector("input");
    const btn = card.querySelector("button");

    btn.addEventListener("click", () => sendReply(q.id, input));
    input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendReply(q.id, input); });

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
    return str.replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  }

  askBtn.addEventListener("click", sendQuestion);
  qInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendQuestion(); });

  async function sendQuestion() {
    const text = qInput.value.trim(); if (!text) return;
    try {
      const res = await fetch(BASE_URL + "/api/questions", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({text}) });
      if (!res.ok) throw new Error("Create failed");
      qInput.value="";
    } catch { alert("Failed to post. Check connection."); }
  }

  async function sendReply(qid, input) {
    const text = input.value.trim(); if (!text) return;
    try {
      const res = await fetch(BASE_URL + `/api/questions/${qid}/replies`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({text}) });
      if (!res.ok) throw new Error("Reply failed");
      input.value="";
    } catch { alert("Failed to send reply. Check connection."); }
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
        if (msg.type==="question_created") prependQuestion(msg.payload);
        else if (msg.type==="reply_added") addReply(msg.payload.questionId,msg.payload.reply);
        else if(["question_deleted","reply_deleted","cleared"].includes(msg.type)) fetchQuestions();
      } catch{}
    };
    sock.onclose = ()=>{ setStatus(false); setTimeout(connectWS,1500); };
  }

  function prependQuestion(q){ emptyEl.style.display="none"; qList.prepend(questionCard(q)); }
  function addReply(qid,reply){ const card=[...qList.children].find(el=>el.dataset.qid===qid); if(!card)return fetchQuestions(); const repliesEl=card.querySelector("[data-replies]"); appendReply(repliesEl,qid,reply); }

  // Admin functions
  async function deleteQuestion(qid){ if(!adminToken)return; if(!confirm("Delete this question?"))return; try{ const res=await fetch(BASE_URL+`/api/questions/${qid}`,{ method:"DELETE", headers:{ Authorization:"Bearer "+adminToken } }); if(!res.ok) throw new Error(); fetchQuestions(); }catch{ alert("❌ Failed to delete question"); } }
  async function deleteReply(qid,rid){ if(!adminToken)return; if(!confirm("Delete this reply?"))return; try{ const res=await fetch(BASE_URL+`/api/questions/${qid}/replies/${rid}`,{ method:"DELETE", headers:{ Authorization:"Bearer "+adminToken } }); if(!res.ok) throw new Error(); fetchQuestions(); }catch{ alert("❌ Failed to delete reply"); } }

  function renderAdminDelete(card,qid,repliesEl,repliesList){
    const adminActions=card.querySelector("[data-admin-actions]");
    adminActions.innerHTML="";
    const delBtn=document.createElement("button");
    delBtn.textContent="Delete"; delBtn.className="text-xs text-red-600 hover:text-red-800 underline"; delBtn.addEventListener("click",()=>deleteQuestion(qid));
    adminActions.appendChild(delBtn);

    repliesList.forEach(r=>{
      const li=[...repliesEl.children].find(l=>l.textContent.includes(r.text));
      if(li&&!li.querySelector("button")){
        const btn=document.createElement("button"); btn.textContent="Delete"; btn.className="text-xs text-red-600 hover:text-red-800 ml-2 underline"; btn.addEventListener("click",()=>deleteReply(qid,r.id));
        li.appendChild(btn);
      }
    });
  }

  const adminModal=document.getElementById("adminModal");
  const adminPasswordInput=document.getElementById("adminPasswordInput");
  const adminCancelBtn=document.getElementById("adminCancelBtn");
  const adminSubmitBtn=document.getElementById("adminSubmitBtn");

  function showAdminModal(){ adminPasswordInput.value=""; adminModal.classList.remove("hidden"); adminPasswordInput.focus(); }
  adminLoginBtn.addEventListener("click",showAdminModal);
  adminCancelBtn.addEventListener("click",()=>adminModal.classList.add("hidden"));

  async function loginAdmin(password){
    if(!password) return alert("Please enter password");
    try{
      const res=await fetch(BASE_URL+"/api/admin/login",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({password}) });
      if(!res.ok) throw new Error();
      const data=await res.json();
      adminToken=data.token; localStorage.setItem("adminToken",adminToken); alert("✅ Admin logged in");
      clearAllBtn.classList.remove("hidden"); fetchQuestions(); adminModal.classList.add("hidden");
      fetchAdminMembers();
    }catch{ alert("❌ Admin login failed"); }
  }

  adminSubmitBtn.addEventListener("click",()=>loginAdmin(adminPasswordInput.value.trim()));

  // Clear all
  clearAllBtn.addEventListener("click",async ()=>{
    if(!adminToken)return alert("Not logged in as admin");
    if(!confirm("Clear ALL questions and replies?"))return;
    try{
      const res=await fetch(BASE_URL+"/api/admin/clear",{ method:"POST", headers:{ Authorization:"Bearer "+adminToken } });
      if(!res.ok) throw new Error(); fetchQuestions(); alert("✅ All questions cleared");
    }catch{ alert("❌ Failed to clear questions"); }
  });

  // Fetch total members
  async function fetchAdminMembers(){
    try{
      const res=await fetch(BASE_URL+"/api/admin/members",{ headers:{ Authorization:"Bearer "+adminToken } });
      if(!res.ok) throw new Error();
      const data=await res.json();
      document.getElementById("totalMembersCount").textContent=data.totalMembers;
      document.getElementById("adminMembers").classList.remove("hidden");
    }catch(e){ console.error(e); }
  }

  // Init
  if(adminToken) clearAllBtn.classList.remove("hidden");
  fetchQuestions(); connectWS();
})();
