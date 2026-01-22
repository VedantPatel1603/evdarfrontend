document.addEventListener("DOMContentLoaded", () => {
    const box = document.querySelector(".login-bg");
    const loginCard = document.querySelector(".login-box");
    const loginBtn = document.querySelector("button[type='submit']");

    if (box) {
        // Cosmic effects removed in favor of video background


        // 4. 3D Tilt (Preserved)
        if (loginCard) {
            box.addEventListener("mousemove", (e) => {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const x = e.clientX - centerX;
                const y = e.clientY - centerY;

                // 3D Tilt Logic
                const rotateX = -1 * (y / centerY) * 10;
                const rotateY = (x / centerX) * 10;

                loginCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            box.addEventListener("mouseleave", () => {
                loginCard.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
            });
        }
    }

    // Magnetic Button (Preserved)
    if (loginBtn) {
        loginBtn.addEventListener("mousemove", (e) => {
            const rect = loginBtn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            loginBtn.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
        });

        loginBtn.addEventListener("mouseleave", () => {
            loginBtn.style.transform = "translate(0, 0)";
        });
    }
});

async function login(event) {
    event.preventDefault();
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const btn = document.querySelector("button[type='submit']");
    const form = document.querySelector(".login-box");

    const username = usernameInput.value;
    const password = passwordInput.value;

    // Loading State
    const originalText = btn.innerText;
    btn.innerText = "Logging in...";
    btn.disabled = true;

    // Clear previous error shakes
    form.classList.remove("shake");

    // CONFIG: Replace this URL with your active ngrok URL
    // Get from: ngrok http 5000 -> https://xxxx-xx-xxx-xxx.ngrok.io
    const NGROK_BACKEND_URL = "https://untempting-untemperamentally-renata.ngrok-free.dev";
    
    const API_BASE = NGROK_BACKEND_URL;

    try {
        const res = await fetch(API_BASE + "/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) {
            throw new Error("Invalid credentials");
        }

        const data = await res.json();
        localStorage.setItem("user", JSON.stringify(data));

        // Success animation?
        btn.innerText = "Success!";
        btn.style.background = "#3b82f6"; // blue

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 500);

    } catch (err) {
        alert(`Connection Error!\nDetails: ${err.message}\nTarget URL: ${API_BASE}/login\n\nEnsure backend is running (python app.py) on port 5000.`);
        // Error State
        btn.innerText = originalText;
        btn.disabled = false;

        // Shake animation
        form.classList.add("shake");
        // remove class after animation so it can run again
        setTimeout(() => form.classList.remove("shake"), 500);

        console.error(err);
        // Optional: clear password
        passwordInput.value = "";
    }
}