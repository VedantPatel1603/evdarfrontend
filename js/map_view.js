
// map_view.js: Interactive Map with Custom Time Selection

window.renderMapView = function (containerId) {
    console.log("renderMapView called for:", containerId);
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Container not found:", containerId);
        return;
    }

    const user = window.getUser();
    console.log("User:", user);
    const carFile = user?.car;
    console.log("CarFile:", carFile);

    if (!carFile) {
        container.innerHTML = `
            <div class="card">
                <h3>Vehicle Map</h3>
                <p>No car telemetry file assigned to your account.</p>
            </div>
        `;
        return;
    }

    // Main Layout: Header + Custom Time Input + Map + Manual CSV Import
    container.innerHTML = `
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; margin-bottom:15px;">
                <div>
                    <h3 style="margin:0; border:none; padding:0;">Vehicle Tracking</h3>
                    <div style="font-size:0.9rem; opacity:0.7; margin-top:5px;">File: ${carFile}</div>
                </div>
                
                <div style="display:flex; align-items:center; gap:10px;">
                    <label style="font-size:0.9rem;">Start Time:</label>
                    <input type="datetime-local" id="timeStartPicker" 
                        style="padding:8px 12px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:white; font-family:inherit; color-scheme: dark;">
                </div>
            </div>

            <div style="margin-bottom:12px; padding:10px; border-radius:6px; background: rgba(255,255,255,0.02);">
                <div style="font-weight:600; margin-bottom:6px;">Manual CSV Import (paste 1 or more rows)</div>
                <div style="display:flex; gap:8px; align-items:flex-start;">
                    <textarea id="csvInput" placeholder="Paste CSV rows here (35 columns)" style="flex:1; min-height:56px; background:#071127; color:#e6eef8; padding:8px; border-radius:6px; border:1px solid #253244;"></textarea>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <button id="csvAddBtn" style="padding:8px 12px; border-radius:6px; background:#0ea5e9; border:none; color:#021124; cursor:pointer;">Preview Rows</button>
                        <button id="csvClearBtn" style="padding:8px 12px; border-radius:6px; background:#94a3b8; border:none; color:#021124; cursor:pointer;">Clear</button>
                    </div>
                </div>
                <div style="font-size:0.8rem; opacity:0.7; margin-top:6px;">Rows with <strong>N/A</strong> are treated as missing values. Only GPS lat/lng/speed and timestamp are used for map preview.</div>
            </div>

            <div id="map" style="height: 500px; width: 100%; border-radius: 8px; margin-top: 15px;"></div>
            
            <div id="map-stats" style="margin-top: 15px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                Select a start time to view 1 hour of data.
            </div>
        </div>
    `;

    // Initialize Controller
    initMapController(carFile);
};

// Manual data buffer for preview/import
window.manualTelemetryBuffer = [];

// Parse one CSV telemetry line (35 columns) into the minimal map object
function parseTelemetryCSVLine(line) {
    const cols = line.split(',').map(s => s.trim());
    if (cols.length < 35) return { error: `Expected 35 columns, got ${cols.length}` };

    const date = cols[0]; // DD/MM/YYYY
    const time = cols[1]; // HH:MM:SS
    const lat = cols[2] === 'N/A' ? null : parseFloat(cols[2]);
    const lon = cols[3] === 'N/A' ? null : parseFloat(cols[3]);
    const speed = cols[4] === 'N/A' ? 0 : parseFloat(cols[4]);

    const timestamp = `${date} ${time}`;

    if (lat == null || lon == null) return { error: 'Missing GPS lat/lng' };

    return {
        timestamp: timestamp,
        latitude: lat,
        longitude: lon,
        speed_kmph: isNaN(speed) ? 0 : speed
    };
}

function handleManualCSVAdd() {
    const ta = document.getElementById('csvInput');
    const statsEl = document.getElementById('map-stats');
    if (!ta) return;
    const raw = ta.value.trim();
    if (!raw) {
        statsEl.innerHTML = '<span style="color:#f59e0b">No rows to import.</span>';
        return;
    }

    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsed = [];
    const errors = [];
    for (const ln of lines) {
        const p = parseTelemetryCSVLine(ln);
        if (p.error) errors.push(`${ln} -> ${p.error}`);
        else parsed.push(p);
    }

    if (errors.length) {
        statsEl.innerHTML = `<div style="color:#ef4444">Parse errors:<br>${errors.join('<br>')}</div>`;
        return;
    }

    // Sort by timestamp (simple lexicographic works for DD/MM/YYYY HH:MM:SS if format consistent)
    parsed.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    window.manualTelemetryBuffer = parsed;
    renderMapData(parsed, statsEl);
}

function handleManualCSVClear() {
    document.getElementById('csvInput').value = '';
    window.manualTelemetryBuffer = [];
    const statsEl = document.getElementById('map-stats');
    if (statsEl) statsEl.innerHTML = 'Manual buffer cleared.';
    if (window.currentMap) {
        window.currentMap.remove();
        window.currentMap = null;
    }
}

async function initMapController(carFile) {
    const API_BASE = window.getApiBase();
    const picker = document.getElementById('timeStartPicker');
    const statsEl = document.getElementById('map-stats'); // Access for error reporting

    if (!picker) return;

    try {
        // 1. Fetch Metadata
        const metaRes = await window.apiCall(`${API_BASE}/api/car-metadata/${carFile}`);
        if (!metaRes.ok) throw new Error("Failed to load file metadata");
        const meta = await metaRes.json();

        if (meta.total_points === 0) {
            document.getElementById('map-stats').innerText = 'No data available in file.';
            picker.disabled = true;
            return;
        }

        // 2. Set Min/Max constraints
        // meta.min_timestamp is "YYYY-MM-DD HH:MM:SS"
        // datetime-local needs "YYYY-MM-DDTHH:MM"
        const minIso = meta.min_timestamp.replace(' ', 'T').slice(0, 16);
        const maxIso = meta.max_timestamp.replace(' ', 'T').slice(0, 16);

        picker.min = minIso;
        picker.max = maxIso;

        // 3. Set Default Value (Earliest time)
        const defaultStart = meta.min_timestamp.replace(' ', 'T').slice(0, 16);
        picker.value = defaultStart;

        // 4. Bind Listener
        picker.addEventListener('change', (e) => {
            const val = e.target.value; // "YYYY-MM-DDTHH:MM"
            if (val) {
                // Convert back to "YYYY-MM-DD HH:MM:SS" for backend
                const backendTime = val.replace('T', ' ') + ':00';
                loadCarTelemetry(carFile, backendTime);
            }
        });

        // 5. Load Initial Data
        const initialBackendTime = defaultStart.replace('T', ' ') + ':00';
        loadCarTelemetry(carFile, initialBackendTime);

    } catch (err) {
        console.error(err);
        if (statsEl) statsEl.innerText = `Error: ${err.message}`;
    }
}

async function loadCarTelemetry(carFile, startTimeObj) {
    const API_BASE = window.getApiBase();
    const statsEl = document.getElementById('map-stats');

    statsEl.innerHTML = '<span class="loading-spinner"></span> Loading telemetry...';

    try {
        const url = `${API_BASE}/api/car-data/${carFile}?start_time=${encodeURIComponent(startTimeObj)}`;

        const res = await window.apiCall(url);
        if (!res.ok) throw new Error("Failed to fetch telemetry");
        const data = await res.json();

        if (!data || data.length === 0) {
            statsEl.innerHTML = 'No data found for this 1-hour window.';
            // Don't clear map immediately to avoid flashing, or clear if desired
            return;
        }

        renderMapData(data, statsEl);

    } catch (err) {
        statsEl.innerHTML = `<span style="color:#ef4444">Error loading data: ${err.message}</span>`;
    }
}


function renderMapData(data, statsEl) {
    if (window.currentMap) {
        window.currentMap.remove();
    }

    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    const center = [data[0].latitude, data[0].longitude];
    const map = L.map('map').setView(center, 13);
    window.currentMap = map;

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

    data.forEach(d => {
        if (d.speed_kmph > 100) {
            L.circleMarker([d.latitude, d.longitude], { radius: 3, color: '#f59e0b', stroke: false, fillOpacity: 0.8 })
                .addTo(map).bindPopup(`Speed: ${d.speed_kmph} km/h`);
        }
    });

    const maxSpeed = Math.max(...data.map(d => d.speed_kmph));
    const avgSpeed = (data.reduce((a, b) => a + b.speed_kmph, 0) / data.length).toFixed(1);
    const dist = calculateDistance(data).toFixed(2);

    statsEl.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; text-align:center;">
            <div>
                <div style="font-size:0.8rem; opacity:0.6;">Data Points</div>
                <div style="font-size:1.2rem; font-weight:bold; color:#f8fafc;">${data.length}</div>
            </div>
            <div>
                <div style="font-size:0.8rem; opacity:0.6;">Distance</div>
                <div style="font-size:1.2rem; font-weight:bold; color:#a855f7;">${dist} km</div>
            </div>
            <div>
                <div style="font-size:0.8rem; opacity:0.6;">Avg Speed</div>
                <div style="font-size:1.2rem; font-weight:bold; color:#3b82f6;">${avgSpeed}</div>
            </div>
            <div>
                <div style="font-size:0.8rem; opacity:0.6;">Max Speed</div>
                <div style="font-size:1.2rem; font-weight:bold; color:${maxSpeed > 100 ? '#ef4444' : '#22c55e'};">${maxSpeed}</div>
            </div>
        </div>
    `;
}

// Helper: Custom implementation to get local ISO string "YYYY-MM-DDTHH:MM" 
function dateToLocalISO(date) {
    const pad = n => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function calculateDistance(data) {
    if (data.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < data.length - 1; i++) {
        total += getDistanceFromLatLonInKm(
            data[i].latitude, data[i].longitude,
            data[i + 1].latitude, data[i + 1].longitude
        );
    }
    return total;
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
