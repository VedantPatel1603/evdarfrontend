// Data Logic Variables
let allRows = [];
let speedChart = null;
let accelChart = null;

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
    });
}

// Main Load Function
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

        const lastRow = allRows[allRows.length - 1];
        const lastTime = new Date(lastRow.timestamp.replace(" ", "T"));
        const startTime = new Date(lastTime);
        startTime.setHours(startTime.getHours() - 1);

        if (timeStartEl) timeStartEl.value = toDatetimeLocal(startTime);
        if (timeEndEl) timeEndEl.value = toDatetimeLocal(lastTime);

        filterAndRender(startTime, lastTime);
    } catch (e) {
        console.error("Failed to load CSV", e);
    }
}

// Expose
window.loadClientCSV = loadClientCSV;
