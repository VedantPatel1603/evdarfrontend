// Data Logic Variables
let allRows = [];
let speedChart = null;
let accelChart = null;

// --- CAN Data Variables (NEW) ---
let canRows = [];
let rpmChart = null;
let coolantChart = null;
let throttleChart = null;

// Helpers
async function loadCSV(file) {
    const res = await fetch("data/" + file);
    return await res.text();
}

function parseCSV(csv) {
    const lines = csv.trim().split("\n");
    const headers = lines[0].split(",");
    return lines.slice(1).map(l => {
        const v = l.split(",");
        let o = {};
        headers.forEach((h, i) => o[h] = v[i]);
        return o;
    });
}

function toRad(d) { return d * Math.PI / 180; }
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateSpeed(rows) {
    rows[0].speed = 0;
    const MAX_SPEED = 180;
    for (let i = 1; i < rows.length; i++) {
        const t1 = new Date(rows[i - 1].timestamp.replace(" ", "T"));
        const t2 = new Date(rows[i].timestamp.replace(" ", "T"));
        const dt = (t2 - t1) / 1000;
        if (dt <= 0) { rows[i].speed = 0; continue; }
        const d = haversine(+rows[i - 1].lat, +rows[i - 1].lon, +rows[i].lat, +rows[i].lon);
        let speed = (d / dt) * 3600;
        rows[i].speed = speed > MAX_SPEED ? 0 : speed.toFixed(1);
    }
}

function toDatetimeLocal(date) {
    const ten = i => (i < 10 ? '0' : '') + i;
    const YYYY = date.getFullYear();
    const MM = ten(date.getMonth() + 1);
    const DD = ten(date.getDate());
    const HH = ten(date.getHours());
    const II = ten(date.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${II}`;
}

// Charts
function updateSpeedChart(rows) {
    // Downsample
    const d = rows.length > 500 ? rows.filter((_, i) => i % Math.ceil(rows.length / 500) === 0) : rows;
    if (speedChart) speedChart.destroy();
    const ctx = document.getElementById("speedChart");
    if (!ctx) return;
    speedChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: d.map(r => r.timestamp.slice(11)),
            datasets: [{
                label: "Speed (km/h)",
                data: d.map(r => r.speed),
                borderColor: "#2a5298",
                borderWidth: 2,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false }
        }
    });
}

function updateAccelChart(rows) {
    const d = rows.length > 500 ? rows.filter((_, i) => i % Math.ceil(rows.length / 500) === 0) : rows;
    if (accelChart) accelChart.destroy();
    const ctx = document.getElementById("accelChart");
    if (!ctx) return;
    accelChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: d.map(r => r.timestamp.slice(11)),
            datasets: [
                { label: "Ax", data: d.map(r => r.ax), borderColor: "#ef4444", borderWidth: 1.5, pointRadius: 0 },
                { label: "Ay", data: d.map(r => r.ay), borderColor: "#22c55e", borderWidth: 1.5, pointRadius: 0 },
                { label: "Az", data: d.map(r => r.az), borderColor: "#3b82f6", borderWidth: 1.5, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateOverspeed(rows) {
    const el = document.getElementById("overspeedCount");
    if (el) el.innerText = rows.filter(r => r.speed > 100).length;
}

function renderRows(rows) {
    const carTable = document.getElementById("carTable");
    if (!carTable) return;
    carTable.innerHTML = `<tr><th>Time</th><th>Lat</th><th>Lon</th><th>Speed (km/h)</th><th>Ax</th><th>Ay</th><th>Az</th><th>Event</th></tr>`;
    rows.forEach(r => {
        const row = carTable.insertRow();
        row.insertCell().innerText = r.timestamp;
        row.insertCell().innerText = r.lat;
        row.insertCell().innerText = r.lon;
        const s = row.insertCell();
        s.innerText = r.speed;
        if (r.speed > 100) s.classList.add("speed-red");
        row.insertCell().innerText = r.ax;
        row.insertCell().innerText = r.ay;
        row.insertCell().innerText = r.az;
        row.insertCell().innerText = r.event || "-";
    });
}

// Core Logic
function filterAndRender(startDate, endDate) {
    const filtered = allRows.filter(r => {
        const t = new Date(r.timestamp.replace(" ", "T"));
        return t >= startDate && t <= endDate;
    });
    renderRows(filtered);
    updateSpeedChart(filtered);
    updateAccelChart(filtered);
    updateOverspeed(filtered);
}

// Time Controls
const timeStartEl = document.getElementById("timeStart");
const timeEndEl = document.getElementById("timeEnd");
const btnApplyTime = document.getElementById("btnApplyTime");

if (timeStartEl && timeEndEl) {
    timeStartEl.addEventListener('change', () => {
        if (!timeStartEl.value) return;
        const start = new Date(timeStartEl.value);
        if (isNaN(start.getTime())) return;
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        timeEndEl.value = toDatetimeLocal(end);
    });
}

if (btnApplyTime) {
    btnApplyTime.addEventListener("click", () => {
        if (!timeStartEl || !timeEndEl) return;
        const start = new Date(timeStartEl.value);
        const end = new Date(timeEndEl.value);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) { alert("Invalid date selection"); return; }
        if (end < start) { alert("End time must be after start time"); return; }
        const diffHrs = (end - start) / (1000 * 60 * 60);
        if (diffHrs > 1.0) { alert("Viewing window cannot exceed 1 hour."); return; }
        filterAndRender(start, end);

        // Re-fetch CAN data for the same time window (NEW)
        const user = window.getUser ? window.getUser() : null;
        if (user && user.car) {
            const startParam = timeStartEl.value.replace("T", " ") + ":00";
            loadCanData(user.car, startParam);
        }
    });
}

// ─── CAN DATA (NEW) ────────────────────────────────────────────────────────────

// Build the backend base URL the same way login.js does
function getBackendURL() {
    // If config.js exposes a global, use it; otherwise fall back to same origin
    if (window.API_BASE) return window.API_BASE;
    if (window.NGROK_BACKEND_URL) return window.NGROK_BACKEND_URL;
    return window.location.origin;
}

async function loadCanData(carFile, startTime) {
    try {
        const base = getBackendURL();
        let url = `${base}/api/can-data/${carFile}`;
        if (startTime) url += `?start_time=${encodeURIComponent(startTime)}`;

        const res = await fetch(url);
        if (!res.ok) {
            console.warn("CAN data not available:", res.status, await res.text());
            return;
        }
        canRows = await res.json();
        if (!Array.isArray(canRows) || canRows.length === 0) {
            console.warn("CAN data returned empty array");
            return;
        }
        updateRpmChart(canRows);
        updateCoolantChart(canRows);
        updateThrottleChart(canRows);
        renderCanTable(canRows);
    } catch (e) {
        console.error("Failed to load CAN data", e);
    }
}

function downsampleCan(rows) {
    return rows.length > 500 ? rows.filter((_, i) => i % Math.ceil(rows.length / 500) === 0) : rows;
}

function updateRpmChart(rows) {
    const d = downsampleCan(rows);
    if (rpmChart) rpmChart.destroy();
    const ctx = document.getElementById("rpmChart");
    if (!ctx) return;
    rpmChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: d.map(r => r.timestamp.slice(11)),
            datasets: [{
                label: "Engine RPM",
                data: d.map(r => r.engine_rpm),
                borderColor: "#f59e0b",
                borderWidth: 2,
                pointRadius: 0,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateCoolantChart(rows) {
    const d = downsampleCan(rows);
    if (coolantChart) coolantChart.destroy();
    const ctx = document.getElementById("coolantChart");
    if (!ctx) return;
    coolantChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: d.map(r => r.timestamp.slice(11)),
            datasets: [
                {
                    label: "Coolant Temp (°C)",
                    data: d.map(r => r.coolant_temp),
                    borderColor: "#ef4444",
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: "Engine Load (%)",
                    data: d.map(r => r.engine_load),
                    borderColor: "#8b5cf6",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateThrottleChart(rows) {
    const d = downsampleCan(rows);
    if (throttleChart) throttleChart.destroy();
    const ctx = document.getElementById("throttleChart");
    if (!ctx) return;
    throttleChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: d.map(r => r.timestamp.slice(11)),
            datasets: [
                {
                    label: "Throttle Pos (%)",
                    data: d.map(r => r.throttle_pos),
                    borderColor: "#22c55e",
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: "Vehicle Speed (km/h)",
                    data: d.map(r => r.vehicle_speed),
                    borderColor: "#38bdf8",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function renderCanTable(rows) {
    const tbl = document.getElementById("canTable");
    if (!tbl) return;
    tbl.innerHTML = `<tr>
        <th>Time</th><th>RPM</th><th>Speed (km/h)</th>
        <th>Coolant (°C)</th><th>Throttle (%)</th>
        <th>Engine Load (%)</th><th>Fuel Pressure</th>
        <th>Intake MAP</th><th>MAF Rate</th>
    </tr>`;
    rows.forEach(r => {
        const row = tbl.insertRow();
        row.insertCell().innerText = r.timestamp;
        row.insertCell().innerText = r.engine_rpm ?? "-";
        row.insertCell().innerText = r.vehicle_speed ?? "-";
        const ct = row.insertCell();
        ct.innerText = r.coolant_temp ?? "-";
        if (r.coolant_temp > 100) ct.style.color = "#ef4444";
        row.insertCell().innerText = r.throttle_pos ?? "-";
        row.insertCell().innerText = r.engine_load ?? "-";
        row.insertCell().innerText = r.fuel_pressure ?? "-";
        row.insertCell().innerText = r.intake_map ?? "-";
        row.insertCell().innerText = r.maf_rate ?? "-";
    });
}

// ─── Main Load Function ────────────────────────────────────────────────────────

async function loadClientCSV(file) {
    try {
        const csv = await loadCSV(file);
        allRows = parseCSV(csv);
        // Explicit Sort
        allRows.sort((a, b) => {
            return new Date(a.timestamp.replace(" ", "T")) - new Date(b.timestamp.replace(" ", "T"));
        });
        calculateSpeed(allRows);

        if (allRows.length === 0) return;

        const firstRow = allRows[0];
        const lastRow = allRows[allRows.length - 1];

        // Use raw timestamp from backend directly
        const startStr = firstRow.timestamp.replace(" ", "T").slice(0, 16);
        const lastStr = lastRow.timestamp.replace(" ", "T").slice(0, 16);

        if (timeStartEl) timeStartEl.value = startStr;
        if (timeEndEl) timeEndEl.value = lastStr;

        // Still pass Date objects to filterAndRender if it needs them
        const startTime = new Date(startStr);
        const lastTime = new Date(lastStr);

        filterAndRender(startTime, lastTime);

        // --- Load CAN data for same car & time window (NEW) ---
        // file = "car1.csv", we pass it directly to /api/can-data/
        const canStartParam = firstRow.timestamp; // "YYYY-MM-DD HH:MM:SS"
        loadCanData(file, canStartParam);

    } catch (e) {
        console.error("Failed to load CSV", e);
    }
}

// Expose
window.loadClientCSV = loadClientCSV;
window.loadCanData = loadCanData;