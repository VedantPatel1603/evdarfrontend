// Global Configuration
window.CONFIG = {
    // Replace with your ngrok URL when running ngrok http 5000
    NGROK_BACKEND_URL: 'https://untempting-untemperamentally-renata.ngrok-free.dev',
    
    // Update this whenever you restart ngrok (it gives a new URL each time)
    // To keep it persistent, sign up for ngrok and use a reserved domain
};

// Make it available globally
window.getApiBase = function () {
    return window.CONFIG.NGROK_BACKEND_URL;
};
