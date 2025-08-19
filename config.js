// frontend/config.js
(function () {
  const hostname = window.location.hostname;

  let backendUrl;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    backendUrl = "http://localhost:5000"; // local dev
  } else {
    backendUrl = "https://chic-reprieve-production.up.railway.app"; // ✅ your Railway backend URL
  }

  window.BACKEND_URL = backendUrl;
  window.ADMIN_KEY = "santanu@2006";
})();
