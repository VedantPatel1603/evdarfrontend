// overview_view.js: Logic for the Overview Panel (Home)

window.renderOverview = function (containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const user = currentUser || window.getUser();

    // Base HTML
    let html = `
        <div class="card" style="margin-bottom: 25px;">
            <h3>Overview</h3>
            <p>Welcome, <strong>${user.username}</strong>.</p>
    `;

    // 1. Regular User View: Show OWN Data if not admin (and has car)
    if (user && user.role !== 'admin' && user.car && user.car.endsWith('.csv')) {
        html += `
            <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                ${generateTelemetryUIhtml(user.car)}
            </div>
        `;
    }

    html += `</div>`; // Close Main Card

    // 2. Admin Feature: User Inspector
    if (user && user.role === 'admin') {
        html += `
            <div class="card" style="padding: 25px; border: 1px solid rgba(255,255,255,0.15);">
                <h3 style="color:#3b82f6; margin-bottom: 15px;">User Inspector (Admin)</h3>
                <p style="margin-bottom: 15px; opacity: 0.8;">Enter a User ID below to view their details and vehicle telemetry.</p>
                <div style="display:flex; gap:15px; margin-top:10px; align-items:center;">
                    <input type="text" id="overviewSearchId" placeholder="Enter User ID" 
                        style="padding:12px 16px; font-size:1rem; height:45px; border-radius:8px; border:2px solid #475569; background:#0f172a; color:#fff; flex-grow:1; width:auto; min-width:0; box-sizing:border-box;">
                    <button id="btnOverviewSearch" style="padding:12px 30px; font-size:1rem; height:45px; white-space:nowrap; box-sizing:border-box; width:auto; flex-shrink:0;">Search</button>
                </div>
                <div id="overviewSearchOutput" style="margin-top:25px;"></div>
            </div>
        `;
    }

    container.innerHTML = html;

    // Initialize Logic
    if (user && user.role !== 'admin' && user.car && user.car.endsWith('.csv')) {
        // Init User's Own Map
        setTimeout(() => initGenericMapController(user.car, 'telemetryMap', 'telemetryTimePicker', 'telemetryStats', 'telemetryTableContainer'), 50);
    }

    if (user && user.role === 'admin') {
        bindOverviewAdminListeners();
    }
};

// --- Shared HTML Generator ---
function generateTelemetryUIhtml(carFilename, prefix = 'telemetry') {
    return `
        <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h4 style="margin:0;">Vehicle Data: ${carFilename}</h4>
                <div style="display:flex; align-items:center; gap:10px;">
                    <label style="font-size:0.9rem;">Start Time:</label>
                    <input type="datetime-local" id="${prefix}TimePicker" 
                        style="padding:6px 10px; border-radius:4px; border:1px solid #475569; background:#0f172a; color:white; font-family:inherit; color-scheme: dark;">
                </div>
            </div>
            
            <div id="${prefix}Map" style="height: 400px; width: 100%; border-radius: 8px; z-index: 1;"></div>
            
            <div id="${prefix}Stats" style="margin-top:10px; font-size:0.9rem; text-align:center; opacity:0.8;">Select a start time to view data.</div>
            
            <h4 style="margin-top:20px; margin-bottom:10px; font-size:1rem; opacity:0.9;">Telemetry Data (1 Hour)</h4>
            <div id="${prefix}TableContainer" style="max-height:300px; overflow-y:auto; border:1px solid rgba(255,255,255,0.1); border-radius:6px; background:rgba(0,0,0,0.2);">
                <div style="padding:20px; text-align:center; opacity:0.6;">No data loaded</div>
            </div>
        </div>
    `;
}

// --- Admin Listeners ---
function bindOverviewAdminListeners() {
    const btnSearch = document.getElementById('btnOverviewSearch');
    const searchInput = document.getElementById('overviewSearchId');
    const searchOutput = document.getElementById('overviewSearchOutput');
    const API_BASE = window.getApiBase();

    if (btnSearch && searchInput) {
        btnSearch.addEventListener('click', async () => {
            const targetId = searchInput.value.trim();
            if (!targetId) {
                alert('Please enter a User ID');
                return;
            }

            btnSearch.innerText = "Searching...";
            searchOutput.innerHTML = '';

            try {
                const res = await fetch(`${API_BASE}/users/${targetId}`);
                if (!res.ok) throw new Error('User not found');
                const u = await res.json();

                let outputHtml = `
                    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                        <div style="display:grid; grid-template-columns:auto 1fr; gap:10px; font-size:0.9rem;">
                            <span style="opacity:0.6;">User ID:</span> <strong>${u.id || u.user_id}</strong>
                            <span style="opacity:0.6;">Username:</span> <strong>${u.username}</strong>
                            <span style="opacity:0.6;">Role:</span> <strong style="color:${u.role === 'admin' ? '#f472b6' : '#4ade80'}">${u.role}</strong>
                            <span style="opacity:0.6;">Car File:</span> <code>${u.car || 'None'}</code>
                        </div>
                    </div>
                `;

                const prefix = 'inspector'; // Unique prefix for Admin Search results

                // If user has a car file, append UI
                if (u.car && u.car.endsWith('.csv')) {
                    outputHtml += generateTelemetryUIhtml(u.car, prefix);
                }

                searchOutput.innerHTML = outputHtml;

                // Init Map logic
                if (u.car && u.car.endsWith('.csv')) {
                    setTimeout(() => initGenericMapController(u.car, `${prefix}Map`, `${prefix}TimePicker`, `${prefix}Stats`, `${prefix}TableContainer`), 50);
                }

            } catch (err) {
                searchOutput.innerHTML = `<p style="color:#ef4444">Error: ${err.message}</p>`;
            } finally {
                btnSearch.innerText = "Search";
            }
        });
    }
}

// --- Shared Map Controller Logic ---

async function initGenericMapController(carFile, mapId, pickerId, statsId, tableId) {
    const API_BASE = window.getApiBase();
    const picker = document.getElementById(pickerId);
    const statsEl = document.getElementById(statsId);

    if (!picker) return;

    try {
        const metaRes = await fetch(`${API_BASE}/api/car-metadata/${carFile}`);
        if (!metaRes.ok) throw new Error("Metadata fetch failed");
        const meta = await metaRes.json();

        if (meta.total_points === 0) {
            if (statsEl) statsEl.innerText = 'No data available.';
            picker.disabled = true;
            return;
        }

        // Set Min/Max
        const minIso = meta.min_timestamp.replace(' ', 'T').slice(0, 16);
        const maxIso = meta.max_timestamp.replace(' ', 'T').slice(0, 16);
        picker.min = minIso;
        picker.max = maxIso;

        // Default: Latest - 1h
        const maxDate = new Date(meta.max_timestamp);
        maxDate.setHours(maxDate.getHours() - 1);
        const defaultStart = ovDateToLocalISO(maxDate);
        picker.value = defaultStart;

        // Bind Change Listener
        picker.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val) {
                const backendTime = val.replace('T', ' ') + ':00';
                loadGenericTelemetry(carFile, backendTime, mapId, statsId, tableId);
            }
        });

        // Load Initial
        loadGenericTelemetry(carFile, defaultStart.replace('T', ' ') + ':00', mapId, statsId, tableId);

    } catch (err) {
        console.error(err);
        if (statsEl) statsEl.innerText = `Error: ${err.message}`;
    }
}

async function loadGenericTelemetry(carFile, startTimeObj, mapId, statsId, tableId) {
    const API_BASE = window.getApiBase();
    const statsEl = document.getElementById(statsId);
    const tableContainer = document.getElementById(tableId);

    if (statsEl) statsEl.innerHTML = '<span class="loading-spinner"></span> Loading...';
    if (tableContainer) tableContainer.innerHTML = '<div style="padding:20px; text-align:center;">Loading table...</div>';

    try {
        const url = `${API_BASE}/api/car-data/${carFile}?start_time=${encodeURIComponent(startTimeObj)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();

        if (!data || data.length === 0) {
            if (statsEl) statsEl.innerHTML = 'No data found for this window.';
            if (tableContainer) tableContainer.innerHTML = '<div style="padding:20px; text-align:center;">No data</div>';
            return;
        }

        renderGenericMapData(data, mapId, statsEl);
        renderGenericTable(data, tableContainer);

    } catch (err) {
        if (statsEl) statsEl.innerHTML = `<span style="color:#ef4444">Error: ${err.message}</span>`;
    }
}

function renderGenericMapData(data, mapId, statsEl) {
    const mapEl = document.getElementById(mapId);
    if (!mapEl) return;

    // We store the map instance on the DOM element to handle multiple maps (if ever needed)
    // or use a global map if we only ever show one at a time.
    // For safety with parallel updates (unlikely here but good practice), let's Key it by ID.
    if (!window.mapInstances) window.mapInstances = {};

    if (window.mapInstances[mapId]) {
        window.mapInstances[mapId].remove();
        delete window.mapInstances[mapId];
    }

    const center = [data[0].latitude, data[0].longitude];
    const map = L.map(mapId).setView(center, 13);
    window.mapInstances[mapId] = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: 'CARTO'
    }).addTo(map);

    const latlngs = data.map(d => [d.latitude, d.longitude]);
    const polyline = L.polyline(latlngs, { color: '#3b82f6', weight: 4 }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    L.circleMarker(latlngs[0], { radius: 6, color: '#22c55e', fillOpacity: 1 }).addTo(map)
        .bindPopup(`<b>Start</b><br>${data[0].timestamp}`);

    L.circleMarker(latlngs[latlngs.length - 1], { radius: 6, color: '#ef4444', fillOpacity: 1 }).addTo(map)
        .bindPopup(`<b>End</b><br>${data[data.length - 1].timestamp}`);

    // Stats
    const dist = ovCalculateDistance(data).toFixed(2);
    const avgSpeed = (data.reduce((a, b) => a + b.speed_kmph, 0) / data.length).toFixed(1);

    if (statsEl) {
        statsEl.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; text-align:center;">
                <div><strong>Points:</strong> ${data.length}</div>
                <div><strong>Dist:</strong> ${dist} km</div>
                <div><strong>Avg Speed:</strong> ${avgSpeed} km/h</div>
            </div>
        `;
    }
}

function renderGenericTable(data, container) {
    if (!container) return;

    let tableHtml = `
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem; color:#e2e8f0;">
            <thead>
                <tr style="background:rgba(255,255,255,0.1); border-bottom:1px solid rgba(255,255,255,0.2);">
                    <th style="padding:10px; text-align:left;">Timestamp</th>
                    <th style="padding:10px; text-align:right;">Speed (km/h)</th>
                    <th style="padding:10px; text-align:right;">Latitude</th>
                    <th style="padding:10px; text-align:right;">Longitude</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach(row => {
        tableHtml += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:8px 10px;">${row.timestamp}</td>
                <td style="padding:8px 10px; text-align:right; font-weight:bold; color:${row.speed_kmph > 100 ? '#ef4444' : '#fff'}">${row.speed_kmph}</td>
                <td style="padding:8px 10px; text-align:right; font-family:monospace; opacity:0.8;">${row.latitude.toFixed(4)}</td>
                <td style="padding:8px 10px; text-align:right; font-family:monospace; opacity:0.8;">${row.longitude.toFixed(4)}</td>
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

// Helpers
function ovDateToLocalISO(date) {
    const pad = n => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ovCalculateDistance(data) {
    if (data.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < data.length - 1; i++) {
        total += ovGetDistanceFromLatLonInKm(data[i].latitude, data[i].longitude, data[i + 1].latitude, data[i + 1].longitude);
    }
    return total;
}

function ovGetDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = ovDeg2rad(lat2 - lat1);
    var dLon = ovDeg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(ovDeg2rad(lat1)) * Math.cos(ovDeg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function ovDeg2rad(deg) {
    return deg * (Math.PI / 180);
}
