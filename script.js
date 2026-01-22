// Main Controller: Coordinates Modules

if (window.__dashboardLoaded) {
    console.warn("Dashboard script already loaded");
} else {
    window.__dashboardLoaded = true;
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(initDashboard, 100);
    });
}

function initDashboard() {
    const user = window.getUser();
    if (!user || !user.username) {
        window.safeRedirect();
        return;
    }

    // UI Binding
    const welcomeEl = document.getElementById("welcome");
    if (welcomeEl) {
        const hour = new Date().getHours();
        let greeting = hour < 12 ? "Good Morning" : (hour < 18 ? "Good Afternoon" : "Good Evening");
        welcomeEl.innerText = `${greeting}, ${user.username} (${user.role})`;
    }

    // Sidebar Admin Link
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) adminLink.style.display = (user.role === 'admin') ? 'block' : 'none';

    // Default View
    window.renderView('overview');

    // Init Theme
    // initCosmicTheme();
}

// Router
window.renderView = function (view) {
    const generic = document.getElementById('view-generic');
    const pageTitle = document.getElementById('pageTitle');
    const containerId = 'view-generic';

    if (pageTitle) {
        pageTitle.innerText = view.charAt(0).toUpperCase() + view.slice(1);
    }

    // Sidebar Active State
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar a[data-view="${view}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Ensure Generic View is Visible
    // (Overview Container was removed, so we only use generic now)
    if (generic) {
        generic.style.display = 'block';
        generic.innerHTML = ''; // Clear previous content
    }

    // Route to Modules
    if (view === 'overview') {
        window.renderOverview(containerId, window.getUser());
    } else if (view === 'admin') {
        window.renderAdminView(containerId, window.getUser());
    } else {
        // Static Views (Help, Contact, About)
        window.renderStaticView(view, containerId);
    }
};

function initCosmicTheme() {
    let bgLayer = document.getElementById('cosmic-bg');
    if (bgLayer) return;

    bgLayer = document.createElement('div');
    bgLayer.id = 'cosmic-bg';
    Object.assign(bgLayer.style, {
        position: 'fixed', top: '0', left: '0',
        width: '100%', height: '100%',
        zIndex: '0', pointerEvents: 'none', overflow: 'hidden'
    });
    document.body.prepend(bgLayer);

    // Aurora
    const aurora = document.createElement("div");
    aurora.classList.add("aurora");
    bgLayer.appendChild(aurora);

    // Stars
    for (let i = 0; i < 150; i++) {
        const star = document.createElement("div");
        star.classList.add("star");
        const size = Math.random() * 2 + 1;
        Object.assign(star.style, {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${size}px`, height: `${size}px`
        });
        star.style.setProperty('--duration', `${Math.random() * 3 + 2}s`);
        star.style.setProperty('--delay', `${Math.random() * 5}s`);
        bgLayer.appendChild(star);
    }

    // Shooting Stars
    function spawnShootingStar() {
        const shoot = document.createElement("div");
        shoot.classList.add("shooting-star");
        shoot.style.top = `${Math.random() * 50 - 20}%`;
        shoot.style.left = `${Math.random() * 50 + 50}%`;
        shoot.style.animationDuration = `${Math.random() * 1 + 1}s`;
        bgLayer.appendChild(shoot);
        setTimeout(() => shoot.remove(), 3000);
    }
    setInterval(spawnShootingStar, 5000);
    spawnShootingStar();
}