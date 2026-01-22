// utils.js: Shared helper functions

// Helper function to make ngrok-compatible fetch requests
window.apiCall = async function (url, options = {}) {
    const defaultHeaders = {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json'
    };
    
    return fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    });
};

window.logout = function () {
    localStorage.removeItem("user");
    window.location.href = "index.html";
};

window.safeRedirect = function () {
    console.warn("Redirecting due to missing session");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 200);
};

window.getUser = function () {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
};

window.getApiBase = function () {
    // CONFIG: Replace with your active ngrok URL
    // Get from: ngrok http 5000 -> https://xxxx-xx-xxx-xxx.ngrok.io
    const NGROK_BACKEND_URL = 'https://untempting-untemperamentally-renata.ngrok-free.dev';
    return NGROK_BACKEND_URL;
};
