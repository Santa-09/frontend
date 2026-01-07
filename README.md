# Anonymous Chat Platform 🚀

A full-featured **real-time anonymous chat platform** with room-based chatting, AI assistance, and a powerful global **Admin Dashboard**.  
Built using **HTML, CSS, JavaScript**, **WebSockets**, and a **Node.js backend**.

---

## 🌐 Live Architecture Overview

- **Frontend**: HTML + CSS + Vanilla JavaScript  
- **Backend**: Node.js (REST + WebSocket)
- **Real-time**: WebSocket (`/ws/room/:roomId`)
- **Hosting**:
  - Frontend → Vercel / Netlify
  - Backend → Render / Railway

---

## ✨ Key Features

### 🔐 Anonymous Rooms
- Create a room instantly (no signup)
- Join using **6-digit Room ID**
- Share invite links
- Auto-generated usernames

### 💬 Real-Time Chat
- WebSocket-based messaging
- Live user join/leave updates
- Message timestamps
- Typing without refresh
- Auto-reconnect on network loss

### 🤖 AI Assistant (Optional)
- Toggle AI per room
- Ask AI directly from chat
- Admin-controlled AI enable/disable

### 👑 Room Admin Controls
- Lock room (no new users)
- Kick users
- Clear chat history
- Delete messages
- Toggle AI

### 🛡️ Global Admin Panel
- Secure admin login
- Real-time system stats
- View & delete rooms
- View & ban users
- Broadcast messages
- Maintenance mode control
- Live activity chart

### 🌗 Dark / Light Theme
- Persistent theme
- Sync across all pages
- One-click toggle

---

## 📁 Project Structure

```text
frontend/
│
├── index.html        # Home page (Create / Join room)
├── room.html         # Chat room UI
├── admin.html        # Global admin dashboard
│
├── app.js            # Main frontend logic (rooms + chat + admin)
├── config.js         # Backend URL resolver (local / production)
│
└── README.md         # Project documentation

⚙️ Backend URL Configuration

Backend URL is auto-detected:

(function () {
  const hostname = window.location.hostname;
  let backendUrl;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    backendUrl = "http://localhost:5000";
  } else {
    backendUrl = "https://anonymous-chat-backend.onrender.com";
  }

  window.BACKEND_URL = backendUrl;
})();


✅ No secrets are exposed on the frontend.

🧑‍💻 Admin Panel
Admin Login

URL: /admin.html

Uses JWT-based authentication

Session stored securely in localStorage

Admin Capabilities

📊 System stats (users, rooms, messages)

🚪 Delete rooms

🚫 Ban users

📢 Broadcast messages

🧰 Maintenance mode

📈 Live charts (Chart.js)

🛠️ API Endpoints (Used)
Auth

POST /api/admin/login

Admin

GET /api/admin/stats

GET /api/admin/rooms

DELETE /api/admin/rooms/:id

GET /api/admin/users

POST /api/admin/users/:id/ban

POST /api/admin/maintenance

Rooms

POST /api/rooms/create

POST /api/rooms/:roomId/join

Messages

GET /api/messages/:roomId

WebSocket

/ws/room/:roomId

🔐 Security Practices

❌ No admin keys in frontend

✅ Token-based admin auth

✅ Role-based permissions

✅ Input validation

✅ Room admin verification

🚀 How to Run Locally
1️⃣ Backend
npm install
npm start


Runs on http://localhost:5000

2️⃣ Frontend
Open index.html using Live Server

📌 Deployment Notes

Frontend can be deployed on Vercel / Netlify

Backend works on Render / Railway

WebSocket auto-switches between ws:// and wss://

🧠 Learning Outcomes

This project demonstrates:

WebSocket communication

Admin role separation

Secure frontend-backend interaction

Real-time UI updates

Scalable room architecture

Production-ready frontend structure

📜 License

MIT License
Free to use for learning & academic projects.

🙌 Author

Santanu Barik
BCA | Web Developer | Cloud & Backend Enthusiast

