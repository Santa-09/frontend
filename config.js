// frontend/config.js

(function () {
  // Detect environment
  const hostname = window.location.hostname;

  let backendUrl;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Local development → backend runs on your machine
    backendUrl = "http://localhost:5000";
  } else {
    // Production → use your Railway deployed backend
    backendUrl = "https://<your-railway-app>.up.railway.app"; 
    // ⬆️ replace with your actual Railway backend public URL
  }

  window.BACKEND_URL = backendUrl;

  // Optional: admin key (if needed)
  window.ADMIN_KEY = "santanu@2006";
})();
