(function () {
    const hostname = window.location.hostname;
    let backendUrl;
    
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        backendUrl = "http://localhost:5000"; // local dev
    } else {
        // Replace with your Railway/Heroku/Vercel backend URL
        backendUrl = "https://anonymous-chat-backend.onrender.com";
    }
    
    window.BACKEND_URL = backendUrl;
})();