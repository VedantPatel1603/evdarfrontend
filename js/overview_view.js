// overview_view.js: Overview Panel — GPS map, CAN data, hover dashboard popup

// ─── Gauge Math ───────────────────────────────────────────────────────────────
function _ptc(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return [+(cx + r * Math.cos(rad)).toFixed(2), +(cy + r * Math.sin(rad)).toFixed(2)];
}
function _arcPath(cx, cy, r, startDeg, endDeg) {
    const [sx, sy] = _ptc(cx, cy, r, startDeg);
    const [ex, ey] = _ptc(cx, cy, r, endDeg);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

// ─── RPM Gauge SVG ────────────────────────────────────────────────────────────
function _buildRPMGauge(rpm) {
    const maxRPM = 6000;
    const cx = 90, cy = 90, r = 68;
    const START = -135, SWEEP = 270;
    const frac = Math.min(Math.max((rpm || 0) / maxRPM, 0), 1);
    const greenCut  = START + (3000 / maxRPM) * SWEEP;
    const yellowCut = START + (4500 / maxRPM) * SWEEP;
    const fillEnd   = START + frac * SWEEP;
    const color = rpm > 4500 ? '#ef4444' : rpm > 3000 ? '#f59e0b' : '#22c55e';

    return `<svg width="180" height="155" viewBox="0 0 180 155">
        <defs>
            <filter id="gw"><feGaussianBlur stdDeviation="3.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d="${_arcPath(cx,cy,r,START,greenCut)}"  fill="none" stroke="rgba(34,197,94,0.2)"  stroke-width="15" stroke-linecap="butt"/>
        <path d="${_arcPath(cx,cy,r,greenCut,yellowCut)}" fill="none" stroke="rgba(245,158,11,0.2)" stroke-width="15" stroke-linecap="butt"/>
        <path d="${_arcPath(cx,cy,r,yellowCut,START+SWEEP)}" fill="none" stroke="rgba(239,68,68,0.2)"  stroke-width="15" stroke-linecap="butt"/>
        ${frac > 0.005 ? `<path d="${_arcPath(cx,cy,r,START,fillEnd)}" fill="none" stroke="${color}" stroke-width="11" stroke-linecap="round" filter="url(#gw)"/>` : ''}
        <text x="${cx}" y="${cy-6}"  text-anchor="middle" fill="white"   font-size="28" font-weight="700" font-family="monospace">${Math.round(rpm||0).toLocaleString()}</text>
        <text x="${cx}" y="${cy+13}" text-anchor="middle" fill="#64748b" font-size="11" font-family="sans-serif" letter-spacing="2">RPM</text>
        <text x="26"    y="150"     text-anchor="middle" fill="#334155" font-size="9"  font-family="monospace">0</text>
        <text x="${cx}" y="16"      text-anchor="middle" fill="#334155" font-size="9"  font-family="monospace">3k</text>
        <text x="154"   y="150"     text-anchor="middle" fill="#334155" font-size="9"  font-family="monospace">6k</text>
    </svg>`;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function _bar(label, value, unit, max, color) {
    const v = value !== null && value !== undefined ? value : null;
    const pct = v !== null ? Math.min(100, Math.max(0, (v / max) * 100)).toFixed(1) : 0;
    const display = v !== null ? `${v}${unit}` : '—';
    return `
        <div style="margin-bottom:9px;">
            <div style="display:flex; justify-content:space-between; font-size:0.76rem; margin-bottom:3px;">
                <span style="opacity:0.6;">${label}</span>
                <span style="font-weight:700; color:${color};">${display}</span>
            </div>
            <div style="background:rgba(255,255,255,0.07); border-radius:99px; height:6px; overflow:hidden;">
                <div style="width:${pct}%; height:100%; background:linear-gradient(90deg,${color}88,${color}); border-radius:99px; transition:width 0.4s;"></div>
            </div>
        </div>`;
}

// ─── Dashboard Popup ──────────────────────────────────────────────────────────
let _dashEl = null;

function _ensureDash() {
    if (_dashEl && document.body.contains(_dashEl)) return _dashEl;
    const el = document.createElement('div');
    el.id = 'evdar-dash';
    el.style.cssText = [
        'position:fixed', 'z-index:99999', 'pointer-events:none',
        'width:380px', 'display:none',
        'background:linear-gradient(135deg,rgba(7,17,35,0.98),rgba(15,25,50,0.97))',
        'border:1px solid rgba(59,130,246,0.45)',
        'border-radius:14px',
        'box-shadow:0 20px 60px rgba(0,0,0,0.7),0 0 0 1px rgba(59,130,246,0.1)',
        'backdrop-filter:blur(16px)',
        'overflow:hidden',
        'font-family:Inter,Segoe UI,sans-serif',
        'transition:opacity 0.12s ease'
    ].join(';');
    el.innerHTML = `
        <div style="background:linear-gradient(90deg,rgba(59,130,246,0.18),rgba(168,85,247,0.12));
            padding:10px 16px; display:flex; justify-content:space-between; align-items:center;
            border-bottom:1px solid rgba(255,255,255,0.07);">
            <span style="font-size:0.78rem; font-weight:700; letter-spacing:1.5px; color:#93c5fd; text-transform:uppercase;">⚡ EVDAR Live</span>
            <span id="_dts" style="font-size:0.72rem; color:#64748b; font-family:monospace;"></span>
        </div>
        <div style="display:flex; gap:0; align-items:stretch;">
            <!-- Left: RPM gauge -->
            <div style="padding:12px 8px 6px 12px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:center; border-right:1px solid rgba(255,255,255,0.07);">
                <div id="_drpm"></div>
            </div>
            <!-- Right: Speed + GPS info -->
            <div style="flex:1; padding:14px 16px; display:flex; flex-direction:column; justify-content:center;">
                <div style="font-size:0.68rem; color:#64748b; letter-spacing:1px; text-transform:uppercase; margin-bottom:2px;">GPS Speed</div>
                <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:4px;">
                    <span id="_dspd" style="font-size:2.8rem; font-weight:800; color:#f8fafc; line-height:1; font-family:monospace;"></span>
                    <span style="font-size:0.85rem; color:#64748b;">km/h</span>
                </div>
                <div id="_dcspd" style="font-size:0.78rem; color:#a855f7; font-weight:600; margin-bottom:10px;"></div>
                <div style="font-size:0.67rem; color:#475569; font-family:monospace; word-break:break-all;" id="_dcoords"></div>
            </div>
        </div>
        <!-- Bars -->
        <div id="_dbars" style="padding:10px 16px 8px; border-top:1px solid rgba(255,255,255,0.06);"></div>
        <!-- Footer row -->
        <div id="_dfoot" style="padding:6px 16px 10px; display:flex; gap:16px; font-size:0.72rem; color:#475569; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,0.05);"></div>`;
    document.body.appendChild(el);
    _dashEl = el;
    return el;
}

function _updateDash(gpsRow, canRow, mx, my) {
    const el = _ensureDash();

    const ts = gpsRow.timestamp || '';
    el.querySelector('#_dts').textContent = ts.slice(11) || ts;

    const spd = gpsRow.speed_kmph != null ? gpsRow.speed_kmph : '—';
    el.querySelector('#_dspd').textContent = spd;
    el.querySelector('#_dcoords').textContent = `📍 ${(+gpsRow.latitude).toFixed(5)}, ${(+gpsRow.longitude).toFixed(5)}`;

    const canSpd = canRow?.vehicle_speed;
    el.querySelector('#_dcspd').textContent = canSpd != null ? `CAN: ${canSpd} km/h` : 'CAN: —';

    el.querySelector('#_drpm').innerHTML = _buildRPMGauge(canRow?.engine_rpm ?? 0);

    const ct  = canRow?.coolant_temp;
    const thr = canRow?.throttle_pos;
    const eld = canRow?.engine_load;
    const cColor = ct != null ? (ct > 100 ? '#ef4444' : ct > 90 ? '#f59e0b' : '#22c55e') : '#64748b';
    const thrPct = thr != null ? parseFloat(((thr / 4096) * 100).toFixed(0)) : null;

    el.querySelector('#_dbars').innerHTML =
        _bar(`🌡️ Coolant${ct != null ? (ct>100?' ⚠️OVERHEAT':ct>90?' WARM':' NORMAL') : ''}`, ct,  ' °C',  120, cColor) +
        _bar('🦶 Throttle', thrPct, '%', 100, '#f59e0b') +
        _bar('⚙️ Engine Load', eld, ' %', 150, '#a855f7');

    const fp  = canRow?.fuel_pressure;
    const map = canRow?.intake_map;
    const tim = canRow?.timing_advance;
    const maf = canRow?.maf_rate;
    let fParts = [];
    if (fp  != null) fParts.push(`⛽ ${fp} kPa`);
    if (map != null) fParts.push(`🔧 MAP: ${map} kPa`);
    if (tim != null) fParts.push(`⏱️ ${tim}°`);
    if (maf != null) fParts.push(`💨 ${maf} g/s`);
    el.querySelector('#_dfoot').innerHTML = fParts.map(p =>
        `<span style="background:rgba(255,255,255,0.04); padding:2px 8px; border-radius:999px; border:1px solid rgba(255,255,255,0.08);">${p}</span>`
    ).join('');

    const pw = 380, ph = el.scrollHeight || 300;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = mx + 18, y = my - 20;
    if (x + pw > vw - 8) x = mx - pw - 18;
    if (y + ph > vh - 8) y = vh - ph - 8;
    if (y < 8) y = 8;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.style.display = 'block';
}

function _hideDash() {
    if (_dashEl) _dashEl.style.display = 'none';
}

// ─── Tab Switcher ─────────────────────────────────────────────────────────────
window._switchTab = function(tab) {
    const gpsBtn   = document.getElementById('_tabBtnGPS');
    const canBtn   = document.getElementById('_tabBtnCAN');
    const gpsPanel = document.getElementById('_tabPanelGPS');
    const canPanel = document.getElementById('_tabPanelCAN');
    if (!gpsBtn || !canBtn || !gpsPanel || !canPanel) return;

    const activeStyle   = 'padding:10px 22px; border:none; cursor:pointer; font-size:0.9rem; font-weight:600; border-radius:8px 8px 0 0; transition:all 0.2s; background:rgba(255,255,255,0.1); color:#fff; border-bottom:2px solid #a855f7;';
    const inactiveStyle = 'padding:10px 22px; border:none; cursor:pointer; font-size:0.9rem; font-weight:600; border-radius:8px 8px 0 0; transition:all 0.2s; background:transparent; color:rgba(255,255,255,0.45); border-bottom:2px solid transparent;';

    if (tab === 'gps') {
        gpsBtn.style.cssText   = activeStyle;
        canBtn.style.cssText   = inactiveStyle;
        gpsPanel.style.display = '';
        canPanel.style.display = 'none';
    } else {
        canBtn.style.cssText   = activeStyle;
        gpsBtn.style.cssText   = inactiveStyle;
        canPanel.style.display = '';
        gpsPanel.style.display = 'none';
    }
};

// ─── Main Renderer ────────────────────────────────────────────────────────────
window.renderOverview = function (containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const user = currentUser || window.getUser();

    let html = `<div class="card" style="margin-bottom:25px;">
        <h3>Overview</h3>
        <p>Welcome, <strong>${user.username}</strong>.</p>`;

    if (user && user.role !== 'admin' && user.car && user.car.endsWith('.csv')) {
        const activeStyle   = 'padding:10px 22px; border:none; cursor:pointer; font-size:0.9rem; font-weight:600; border-radius:8px 8px 0 0; background:rgba(255,255,255,0.1); color:#fff; border-bottom:2px solid #a855f7;';
        const inactiveStyle = 'padding:10px 22px; border:none; cursor:pointer; font-size:0.9rem; font-weight:600; border-radius:8px 8px 0 0; background:transparent; color:rgba(255,255,255,0.45); border-bottom:2px solid transparent;';
        html += `
            <div style="margin-top:20px; border-top:1px solid rgba(255,255,255,0.1); padding-top:20px;">
                <!-- Tab bar -->
                <div style="display:flex; gap:4px; border-bottom:1px solid rgba(255,255,255,0.12); margin-bottom:20px;">
                    <button id="_tabBtnGPS" style="${activeStyle}" onclick="window._switchTab('gps')">📍 GPS Track</button>
                    <button id="_tabBtnCAN" style="${inactiveStyle}" onclick="window._switchTab('can')">⚙️ Engine / CAN Data</button>
                </div>
                <!-- Tab panels -->
                <div id="_tabPanelGPS">${_gpsHtml(user.car, 'telemetry')}</div>
                <div id="_tabPanelCAN" style="display:none;">${_canHtml(user.car, 'telemetry')}</div>
            </div>`;
    }
    html += `</div>`;

    if (user && user.role === 'admin') {
        html += `
            <div class="card" style="padding:25px; border:1px solid rgba(255,255,255,0.15);">
                <h3 style="color:#3b82f6; margin-bottom:5px;">User Inspector
                    <span style="font-size:0.72rem; background:rgba(59,130,246,0.2); color:#93c5fd; border-radius:4px; padding:2px 8px; vertical-align:middle; margin-left:8px;">Admin</span>
                </h3>
                <p style="margin-bottom:20px; opacity:0.65; font-size:0.88rem;">Select a user to inspect their GPS route and CAN engine telemetry.</p>
                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
                    <select id="overviewUserSelect" style="flex:1; min-width:220px; padding:11px 14px; font-size:0.95rem; border-radius:8px; border:2px solid #475569; background:#0f172a; color:#fff; cursor:pointer;">
                        <option value="">⏳ Loading users…</option>
                    </select>
                    <button id="btnOverviewLoad" style="padding:11px 28px; font-size:0.95rem; height:auto; white-space:nowrap; flex-shrink:0; margin-top:0;">Load Data</button>
                </div>
                <div id="overviewSearchOutput" style="margin-top:25px;"></div>
            </div>`;
    }

    container.innerHTML = html;
    _hideDash();

    if (user && user.role !== 'admin' && user.car && user.car.endsWith('.csv')) {
        setTimeout(() => {
            _initGPS(user.car, 'telemetryMap', 'telemetryTimePicker', 'telemetryStats', 'telemetryTableContainer');
            _initCAN(user.car, 'telemetry', 'telemetryCANStats', 'telemetryCANTableContainer');
        }, 60);
    }

    if (user && user.role === 'admin') {
        _populateDropdown();
        _bindAdminListeners();
    }
};


// ─── Panel HTML Generators ────────────────────────────────────────────────────
function _gpsHtml(carFile, prefix) {
    return `
        <div style="background:rgba(59,130,246,0.05); padding:18px; border-radius:10px; border:1px solid rgba(59,130,246,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                <h4 style="margin:0; color:#93c5fd; font-size:0.95rem;">📍 GPS Track — ${carFile}</h4>
                <div style="display:flex; align-items:center; gap:8px;">
                    <label style="font-size:0.82rem; opacity:0.65;">Start Time:</label>
                    <input type="datetime-local" id="${prefix}TimePicker"
                        style="padding:6px 10px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:white; font-family:inherit; color-scheme:dark; font-size:0.82rem; margin:0; width:auto;">
                </div>
            </div>
            <div id="${prefix}Map" style="height:400px; width:100%; border-radius:8px; z-index:1;"></div>
            <div id="${prefix}Stats" style="margin-top:12px; font-size:0.88rem; min-height:22px; opacity:0.75; text-align:center;">Select a start time to view GPS data.</div>
            <h4 style="margin-top:20px; margin-bottom:8px; font-size:0.88rem; color:#93c5fd;">📊 GPS Telemetry (1 Hour)
                <span style="font-size:0.72rem; color:#64748b; font-weight:400; margin-left:8px;">Hover a row for live dashboard</span>
            </h4>
            <div id="${prefix}TableContainer" style="max-height:300px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.2);">
                <div style="padding:20px; text-align:center; opacity:0.45; font-size:0.88rem;">No data loaded</div>
            </div>
        </div>`;
}

function _canHtml(carFile, prefix) {
    const canFile = carFile.replace('.csv', '_can.csv');
    return `
        <div style="background:rgba(168,85,247,0.05); padding:18px; border-radius:10px; border:1px solid rgba(168,85,247,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                <div>
                    <h4 style="margin:0 0 2px; color:#c4b5fd; font-size:0.95rem;">⚙️ CAN / Engine Data</h4>
                    <div style="font-size:0.73rem; color:#64748b; font-family:monospace;">${canFile}</div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <label style="font-size:0.82rem; opacity:0.65;">Start Time:</label>
                    <input type="datetime-local" id="${prefix}CANTimePicker"
                        style="padding:6px 10px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:white; font-family:inherit; color-scheme:dark; font-size:0.82rem; margin:0; width:auto;">
                </div>
            </div>
            <!-- Summary stat cards -->
            <div id="${prefix}CANStats" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:16px;">
                <div style="padding:14px; text-align:center; opacity:0.45; grid-column:1/-1; font-size:0.85rem; font-style:italic;">Loading engine data…</div>
            </div>
            <!-- Detailed table -->
            <h4 style="margin-top:4px; margin-bottom:8px; font-size:0.88rem; color:#c4b5fd;">📋 CAN Data Table
                <span style="font-size:0.72rem; color:#64748b; font-weight:400; margin-left:8px;">1-hour window</span>
            </h4>
            <div id="${prefix}CANTableContainer" style="max-height:320px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.2);">
                <div style="padding:20px; text-align:center; opacity:0.45; font-size:0.88rem; font-style:italic;">No data loaded</div>
            </div>
        </div>`;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
async function _populateDropdown() {
    const sel = document.getElementById('overviewUserSelect');
    if (!sel) return;
    const API_BASE = window.getApiBase();
    try {
        const res = await fetch(`${API_BASE}/users`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
        if (!res.ok) throw new Error('Fetch failed');
        const users = await res.json();
        sel.innerHTML = '<option value="">— Select a User —</option>';
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.user_id || u.id;
            opt.textContent = `#${u.user_id || u.id}  ${u.username}  (${u.car || 'no car'})`;
            sel.appendChild(opt);
        });
    } catch (err) {
        sel.innerHTML = `<option value="">⚠️ ${err.message}</option>`;
    }
}

function _bindAdminListeners() {
    const btnLoad = document.getElementById('btnOverviewLoad');
    const sel     = document.getElementById('overviewUserSelect');
    const out     = document.getElementById('overviewSearchOutput');
    const API_BASE = window.getApiBase();
    if (!btnLoad || !sel) return;

    btnLoad.addEventListener('click', async () => {
        const targetId = sel.value.trim();
        if (!targetId) { alert('Please select a user.'); return; }

        btnLoad.innerText = 'Loading…';
        out.innerHTML = '<div style="opacity:0.5; padding:12px; font-size:0.88rem;">Fetching user data…</div>';

        try {
            const res = await fetch(`${API_BASE}/users/${targetId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            if (!res.ok) throw new Error('User not found');
            const u = await res.json();
            const prefix = 'inspector';

            let outputHtml = `
                <div style="background:rgba(255,255,255,0.04); padding:16px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); margin-bottom:20px;">
                    <div style="display:grid; grid-template-columns:auto 1fr; gap:7px 20px; font-size:0.88rem; align-items:center;">
                        <span style="opacity:0.5;">User ID</span>  <strong>${u.user_id || u.id}</strong>
                        <span style="opacity:0.5;">Username</span> <strong>${u.username}</strong>
                        <span style="opacity:0.5;">Role</span>     <strong style="color:${u.role==='admin'?'#f472b6':'#4ade80'}">${u.role}</strong>
                        <span style="opacity:0.5;">Car File</span> <code style="background:rgba(255,255,255,0.07); padding:1px 6px; border-radius:4px; font-size:0.82rem;">${u.car||'None'}</code>
                    </div>
                </div>`;

            if (u.car && u.car.endsWith('.csv')) {
                outputHtml += _gpsHtml(u.car, prefix);
                outputHtml += `<div style="margin-top:22px;">${_canHtml(u.car, prefix)}</div>`;
            } else {
                outputHtml += `<div style="padding:20px; opacity:0.5;">No car file assigned to this user.</div>`;
            }
            out.innerHTML = outputHtml;

            if (u.car && u.car.endsWith('.csv')) {
                setTimeout(() => {
                    _initGPS(u.car, `${prefix}Map`, `${prefix}TimePicker`, `${prefix}Stats`, `${prefix}TableContainer`);
                    _initCAN(u.car, prefix, `${prefix}CANStats`, `${prefix}CANTableContainer`);
                }, 80);
            }
        } catch (err) {
            out.innerHTML = `<p style="color:#ef4444; padding:10px;">⚠️ ${err.message}</p>`;
        } finally {
            btnLoad.innerText = 'Load Data';
        }
    });
}

// ─── GPS Map Controller ───────────────────────────────────────────────────────
async function _initGPS(carFile, mapId, pickerId, statsId, tableId) {
    const API_BASE = window.getApiBase();
    const picker  = document.getElementById(pickerId);
    const statsEl = document.getElementById(statsId);
    const tableContainer = document.getElementById(tableId);
    if (!picker) return;

    if (statsEl) statsEl.innerHTML = '<span style="opacity:0.5; font-size:0.85rem;">Fetching GPS metadata…</span>';

    try {
        const metaRes = await window.apiCall(`${API_BASE}/api/car-metadata/${carFile}`);
        if (!metaRes.ok) {
            const e = await metaRes.json().catch(() => ({}));
            throw new Error(e.error || 'Metadata fetch failed');
        }
        const meta = await metaRes.json();

        if (!meta.total_points) {
            picker.disabled = true;
            if (statsEl) statsEl.innerHTML = _emptyState('📍', 'No GPS data recorded yet for this vehicle.', '#3b82f6');
            if (tableContainer) tableContainer.innerHTML = _emptyState('🗺️', 'GPS track will appear here once the vehicle sends data.', '#3b82f6');
            return;
        }

        picker.disabled = false;
        picker.min = meta.min_timestamp.replace(' ', 'T').slice(0, 16);
        picker.max = meta.max_timestamp.replace(' ', 'T').slice(0, 16);

        const defStr = meta.min_timestamp.replace(' ', 'T').slice(0, 16);
        picker.value = defStr;

        picker.addEventListener('change', e => {
            if (e.target.value) _loadGPS(carFile, e.target.value.replace('T',' ')+':00', mapId, statsId, tableId);
        });
        _loadGPS(carFile, defStr.replace('T',' ')+':00', mapId, statsId, tableId);

    } catch (err) {
        console.error('[GPS meta]', err);
        if (statsEl) statsEl.innerHTML = _errState('GPS metadata error', err.message);
        if (tableContainer) tableContainer.innerHTML = '';
    }
}

async function _loadGPS(carFile, startTime, mapId, statsId, tableId) {
    const API_BASE = window.getApiBase();
    const statsEl      = document.getElementById(statsId);
    const tableContainer = document.getElementById(tableId);

    if (statsEl) statsEl.innerHTML = '<span style="opacity:0.5; font-size:0.85rem;">⏳ Loading GPS data…</span>';
    if (tableContainer) tableContainer.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5; font-size:0.85rem;">Loading GPS track…</div>';

    try {
        const enc = encodeURIComponent(startTime);
        const [gpsRes, canRes] = await Promise.allSettled([
            window.apiCall(`${API_BASE}/api/car-data/${carFile}?start_time=${enc}`),
            window.apiCall(`${API_BASE}/api/can-data/${carFile}?start_time=${enc}`)
        ]);

        let gpsData = [], canData = [];
        if (gpsRes.status === 'fulfilled' && gpsRes.value.ok) {
            const parsed = await gpsRes.value.json().catch(() => []);
            if (Array.isArray(parsed)) gpsData = parsed;
        }
        if (canRes.status === 'fulfilled' && canRes.value.ok) {
            const parsed = await canRes.value.json().catch(() => []);
            if (Array.isArray(parsed)) canData = parsed;
        }

        if (!gpsData.length) {
            if (statsEl) statsEl.innerHTML = _emptyState('🔍', 'No GPS points in this 1-hour window. Try a different start time.', '#3b82f6');
            if (tableContainer) tableContainer.innerHTML = _emptyState('🗓️', 'No data recorded in the selected window.', '#3b82f6');
            return;
        }

        const canByTs = new Map();
        canData.forEach(r => canByTs.set(r.timestamp.slice(0, 16), r));

        _renderMap(gpsData, mapId, statsEl);
        _renderGPSTable(gpsData, tableContainer, canByTs);

    } catch (err) {
        console.error('[GPS load]', err);
        if (statsEl) statsEl.innerHTML = _errState('Failed to load GPS data', err.message);
        if (tableContainer) tableContainer.innerHTML = '';
    }
}

function _renderMap(data, mapId, statsEl) {
    const mapEl = document.getElementById(mapId);
    if (!mapEl) return;
    if (!window.mapInstances) window.mapInstances = {};
    if (window.mapInstances[mapId]) { window.mapInstances[mapId].remove(); delete window.mapInstances[mapId]; }

    const map = L.map(mapId).setView([data[0].latitude, data[0].longitude], 13);
    window.mapInstances[mapId] = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '© CARTO' }).addTo(map);

    const ll = data.map(d => [d.latitude, d.longitude]);
    const poly = L.polyline(ll, { color: '#3b82f6', weight: 4 }).addTo(map);
    map.fitBounds(poly.getBounds(), { padding: [40, 40] });

    L.circleMarker(ll[0],           { radius: 7, color: '#22c55e', fillOpacity: 1 }).addTo(map).bindPopup(`<b>Start</b><br>${data[0].timestamp}`);
    L.circleMarker(ll[ll.length-1], { radius: 7, color: '#ef4444', fillOpacity: 1 }).addTo(map).bindPopup(`<b>End</b><br>${data[data.length-1].timestamp}`);
    data.forEach(d => {
        if (d.speed_kmph > 100) L.circleMarker([d.latitude, d.longitude], { radius: 4, color: '#f59e0b', stroke: false, fillOpacity: 0.9 })
            .addTo(map).bindPopup(`⚠️ ${d.speed_kmph} km/h`);
    });

    const dist = _calcDist(data).toFixed(2);
    const speeds = data.map(d => d.speed_kmph).filter(s => s > 0);
    const avg  = speeds.length ? (speeds.reduce((a,b)=>a+b,0)/speeds.length).toFixed(1) : '0';
    const mxs  = speeds.length ? Math.max(...speeds).toFixed(1) : '0';
    const over = data.filter(d => d.speed_kmph > 100).length;

    if (statsEl) statsEl.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:6px;">
            ${_sCard('📍 Points', data.length,   '#93c5fd')}
            ${_sCard('🛣️ Distance', dist+' km',  '#a855f7')}
            ${_sCard('📈 Avg Speed', avg+' km/h', '#3b82f6')}
            ${_sCard('⚡ Max Speed', mxs+' km/h', over>0?'#ef4444':'#22c55e')}
        </div>
        ${over>0?`<div style="margin-top:7px; font-size:0.78rem; color:#fbbf24;">⚠️ ${over} overspeed event(s) (&gt;100 km/h) — shown in orange on map</div>`:''}`;
}

function _renderGPSTable(data, container, canByTs) {
    if (!container) return;

    let html = `
        <table style="width:100%; border-collapse:collapse; font-size:0.84rem; color:#e2e8f0;">
            <thead>
                <tr style="background:rgba(59,130,246,0.14); border-bottom:1px solid rgba(59,130,246,0.25); position:sticky; top:0; z-index:2;">
                    <th style="padding:9px 12px; text-align:left; font-weight:600; white-space:nowrap;">Timestamp</th>
                    <th style="padding:9px 12px; text-align:right; font-weight:600;">Speed (km/h)</th>
                    <th style="padding:9px 12px; text-align:right; font-weight:600;">Latitude</th>
                    <th style="padding:9px 12px; text-align:right; font-weight:600;">Longitude</th>
                </tr>
            </thead>
            <tbody>`;

    data.forEach((row, idx) => {
        const over = row.speed_kmph > 100;
        const bg = over ? 'rgba(239,68,68,0.07)' : idx%2===0 ? 'rgba(255,255,255,0.02)' : 'transparent';
        const sc = over ? '#f87171' : row.speed_kmph > 60 ? '#fbbf24' : '#4ade80';
        html += `<tr data-idx="${idx}" style="border-bottom:1px solid rgba(255,255,255,0.04); background:${bg}; cursor:crosshair;" class="_gps-row">
            <td style="padding:7px 12px; font-family:monospace; font-size:0.79rem; opacity:0.8;">${row.timestamp}</td>
            <td style="padding:7px 12px; text-align:right; font-weight:700; color:${sc};">${row.speed_kmph}${over?' ⚠️':''}</td>
            <td style="padding:7px 12px; text-align:right; font-family:monospace; opacity:0.65;">${(+row.latitude).toFixed(5)}</td>
            <td style="padding:7px 12px; text-align:right; font-family:monospace; opacity:0.65;">${(+row.longitude).toFixed(5)}</td>
        </tr>`;
    });

    html += `</tbody></table>
        <div style="padding:7px 12px; font-size:0.75rem; opacity:0.4; background:rgba(0,0,0,0.2); border-top:1px solid rgba(255,255,255,0.05);">
            ${data.length} row(s) · hover for live dashboard
        </div>`;
    container.innerHTML = html;

    container.addEventListener('mousemove', e => {
        const tr = e.target.closest('tr[data-idx]');
        if (!tr) { _hideDash(); return; }
        const idx = parseInt(tr.dataset.idx);
        const gRow = data[idx];
        const tsKey = gRow.timestamp.slice(0, 16);
        const cRow  = canByTs ? canByTs.get(tsKey) : null;
        _updateDash(gRow, cRow, e.clientX, e.clientY);
    });
    container.addEventListener('mouseleave', _hideDash);
}

// ─── CAN Controller ───────────────────────────────────────────────────────────
async function _initCAN(carFile, prefix, statsId, tableId) {
    const API_BASE = window.getApiBase();
    const picker  = document.getElementById(`${prefix}CANTimePicker`);
    const statsEl = document.getElementById(statsId);
    const tableEl = document.getElementById(tableId);
    if (!picker) return;

    if (statsEl) statsEl.innerHTML = '<div style="grid-column:1/-1; opacity:0.5; text-align:center; padding:12px; font-size:0.85rem;">⏳ Fetching CAN metadata…</div>';

    try {
        const metaRes = await window.apiCall(`${API_BASE}/api/can-metadata/${carFile}`);
        if (!metaRes.ok) {
            const e = await metaRes.json().catch(() => ({}));
            throw new Error(e.error || 'CAN metadata fetch failed');
        }
        const meta = await metaRes.json();

        if (!meta.total_points) {
            picker.disabled = true;
            if (statsEl) statsEl.innerHTML = `<div style="grid-column:1/-1;">${_emptyState('⚙️', 'No CAN/OBD data recorded yet for this vehicle.', '#a855f7')}</div>`;
            if (tableEl)  tableEl.innerHTML = _emptyState('🔧', 'Engine data will appear here once connected.', '#a855f7');
            return;
        }

        picker.disabled = false;
        picker.min = meta.min_timestamp.replace(' ', 'T').slice(0, 16);
        picker.max = meta.max_timestamp.replace(' ', 'T').slice(0, 16);

        const defStr = meta.min_timestamp.replace(' ', 'T').slice(0, 16);
        picker.value = defStr;

        picker.addEventListener('change', e => {
            if (e.target.value) _loadCAN(carFile, e.target.value.replace('T',' ')+':00', statsId, tableId);
        });
        _loadCAN(carFile, defStr.replace('T',' ')+':00', statsId, tableId);

    } catch (err) {
        console.error('[CAN meta]', err);
        if (statsEl) statsEl.innerHTML = `<div style="grid-column:1/-1;">${_errState('CAN metadata error', err.message)}</div>`;
        if (tableEl)  tableEl.innerHTML = '';
    }
}

async function _loadCAN(carFile, startTime, statsId, tableId) {
    const API_BASE = window.getApiBase();
    const statsEl = document.getElementById(statsId);
    const tableEl = document.getElementById(tableId);

    if (statsEl) statsEl.innerHTML = '<div style="grid-column:1/-1; opacity:0.5; padding:12px; text-align:center; font-size:0.85rem;">⏳ Loading engine data…</div>';
    if (tableEl)  tableEl.innerHTML = '<div style="padding:16px; text-align:center; opacity:0.5; font-size:0.85rem;">Loading…</div>';

    try {
        const res = await window.apiCall(`${API_BASE}/api/can-data/${carFile}?start_time=${encodeURIComponent(startTime)}`);
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.error || 'CAN fetch failed');
        }
        const data = await res.json().catch(() => []);

        if (!Array.isArray(data) || data.length === 0) {
            if (statsEl) statsEl.innerHTML = `<div style="grid-column:1/-1;">${_emptyState('🔍', 'No engine data in this 1-hour window. Try a different start time.', '#a855f7')}</div>`;
            if (tableEl)  tableEl.innerHTML = _emptyState('🗓️', 'No CAN records in the selected window.', '#a855f7');
            return;
        }

        _renderCANStats(data, statsEl);
        _renderCANTable(data, tableEl);

    } catch (err) {
        console.error('[CAN load]', err);
        if (statsEl) statsEl.innerHTML = `<div style="grid-column:1/-1;">${_errState('Failed to load CAN data', err.message)}</div>`;
        if (tableEl)  tableEl.innerHTML = '';
    }
}

function _renderCANStats(data, el) {
    if (!el) return;
    const avg = key => { const v = data.map(d=>d[key]).filter(x=>x!=null); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
    const mx  = key => { const v = data.map(d=>d[key]).filter(x=>x!=null); return v.length ? Math.max(...v) : null; };
    const mn  = key => { const v = data.map(d=>d[key]).filter(x=>x!=null); return v.length ? Math.min(...v) : null; };

    const aRPM = avg('engine_rpm'), mRPM = mx('engine_rpm'), mnRPM = mn('engine_rpm');
    const aSpd = avg('vehicle_speed'), mSpd = mx('vehicle_speed');
    const aTmp = avg('coolant_temp'),  mTmp = mx('coolant_temp');
    const aThr = avg('throttle_pos'),  aLd  = avg('engine_load');
    const aMAF = avg('maf_rate');
    const fmt  = (v, d=1) => v!=null ? v.toFixed(d) : '—';

    // FIX: define rpmC and tmpC before using them
    const rpmC = aRPM != null ? (aRPM > 4000 ? '#ef4444' : aRPM > 2500 ? '#f59e0b' : '#22c55e') : '#64748b';
    const tmpC = aTmp != null ? (aTmp > 100  ? '#ef4444' : aTmp > 90   ? '#f59e0b' : '#22c55e') : '#64748b';
    const spdC = aSpd != null ? (aSpd > 90   ? '#ef4444' : aSpd > 60   ? '#f59e0b' : '#3b82f6') : '#64748b';

    el.innerHTML = [
        _canCard('🔄 Avg RPM',     aRPM!=null ? Math.round(aRPM).toLocaleString() : '—', rpmC,
            mnRPM!=null&&mRPM!=null ? `${Math.round(mnRPM).toLocaleString()} – ${Math.round(mRPM).toLocaleString()}` : null),
        _canCard('⚡ Peak RPM',    mRPM!=null ? Math.round(mRPM).toLocaleString() : '—', '#a855f7', 'max observed'),
        _canCard('🚗 Avg Speed',   aSpd!=null ? fmt(aSpd)+' km/h' : '—', spdC,
            mSpd!=null ? `peak ${fmt(mSpd)} km/h` : null),
        _canCard('🌡️ Coolant',    aTmp!=null ? fmt(aTmp)+' °C' : '—', tmpC,
            mTmp!=null&&mTmp>aTmp+2 ? `⚠️ peak ${fmt(mTmp)}°C` : 'avg temp'),
        _canCard('🦶 Throttle',    aThr!=null ? ((aThr/4096)*100).toFixed(0)+'%' : '—', '#f59e0b', 'avg TPS'),
        _canCard('⚙️ Engine Load', aLd!=null  ? fmt(aLd)+'%' : '—',   '#22c55e', 'avg load'),
        _canCard('💨 MAF Rate',    aMAF!=null ? fmt(aMAF)+' g/s' : '—', '#38bdf8', 'mass air flow'),
        _canCard('📊 Samples',     data.length.toLocaleString(), '#64748b', '1-hour window'),
    ].join('');
}

function _renderCANTable(data, container) {
    if (!container) return;
    const cols = [
        { k:'timestamp',     l:'Timestamp',     a:'left'  },
        { k:'engine_rpm',    l:'RPM',           a:'right' },
        { k:'vehicle_speed', l:'Speed (km/h)',  a:'right' },
        { k:'coolant_temp',  l:'Coolant (°C)',  a:'right' },
        { k:'throttle_pos',  l:'TPS (raw)',     a:'right' },
        { k:'engine_load',   l:'Load (%)',      a:'right' },
        { k:'fuel_pressure', l:'Fuel (kPa)',    a:'right' },
        { k:'intake_map',    l:'MAP (kPa)',     a:'right' },
        { k:'timing_advance',l:'Timing (°)',    a:'right' },
        { k:'maf_rate',      l:'MAF (g/s)',     a:'right' },
        { k:'baro_pressure', l:'Baro (kPa)',    a:'right' },
    ];

    let html = `<table style="width:100%; border-collapse:collapse; font-size:0.8rem; color:#e2e8f0;">
        <thead><tr style="background:rgba(168,85,247,0.14); border-bottom:1px solid rgba(168,85,247,0.25); position:sticky; top:0; z-index:2;">
            ${cols.map(c=>`<th style="padding:8px 9px; text-align:${c.a}; font-weight:600; white-space:nowrap;">${c.l}</th>`).join('')}
        </tr></thead><tbody>`;

    data.forEach((row, idx) => {
        const hiRPM = row.engine_rpm > 4000, hiTmp = row.coolant_temp > 100;
        const bg = hiRPM||hiTmp ? 'rgba(239,68,68,0.06)' : idx%2===0?'rgba(255,255,255,0.02)':'transparent';
        html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04); background:${bg};">`;
        cols.forEach(c => {
            const v = row[c.k];
            let disp = v===null||v===undefined ? `<span style="opacity:0.3;">—</span>` : v;
            let extra = '';
            if (c.k==='engine_rpm' && v!=null) {
                const clr = v>4000?'#f87171':v>2500?'#fbbf24':'#4ade80';
                disp = `<span style="color:${clr}; font-weight:700;">${v}</span>`;
            } else if (c.k==='coolant_temp' && v!=null) {
                const clr = v>100?'#f87171':v>90?'#fbbf24':'#4ade80';
                disp = `<span style="color:${clr}; font-weight:700;">${v}</span>`;
            } else if (c.k==='timestamp') { extra='font-family:monospace; opacity:0.75;'; }
            html += `<td style="padding:6px 9px; text-align:${c.a}; ${extra}">${disp}</td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table><div style="padding:6px 10px; font-size:0.73rem; opacity:0.38; background:rgba(0,0,0,0.2); border-top:1px solid rgba(255,255,255,0.05);">${data.length} CAN row(s)</div>`;
    container.innerHTML = html;
}

// ─── Small UI builders ────────────────────────────────────────────────────────
function _sCard(label, value, color) {
    return `<div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:11px; text-align:center; border:1px solid rgba(255,255,255,0.07);">
        <div style="font-size:0.72rem; opacity:0.55; margin-bottom:3px;">${label}</div>
        <div style="font-size:1.05rem; font-weight:700; color:${color};">${value}</div>
    </div>`;
}

function _canCard(label, value, color, sub) {
    return `<div style="background:linear-gradient(135deg,rgba(168,85,247,0.08),rgba(109,40,217,0.05)); border-radius:10px; padding:14px 12px; text-align:center; border:1px solid rgba(168,85,247,0.18); position:relative; overflow:hidden;">
        <div style="position:absolute; inset:0; background:radial-gradient(circle at 50% 0%,rgba(168,85,247,0.06),transparent 70%); pointer-events:none;"></div>
        <div style="font-size:0.72rem; opacity:0.6; margin-bottom:5px; white-space:nowrap; letter-spacing:0.5px; text-transform:uppercase;">${label}</div>
        <div style="font-size:1.1rem; font-weight:800; color:${color}; letter-spacing:-0.5px;">${value}</div>
        ${sub ? `<div style="font-size:0.68rem; opacity:0.45; margin-top:3px;">${sub}</div>` : ''}
    </div>`;
}

// ─── Empty & Error State helpers ──────────────────────────────────────────────
function _emptyState(icon, msg, color) {
    return `<div style="padding:28px 16px; text-align:center; border-radius:8px; border:1px dashed ${color}33; background:${color}08;">
        <div style="font-size:2rem; margin-bottom:8px;">${icon}</div>
        <div style="font-size:0.83rem; color:#94a3b8; line-height:1.5;">${msg}</div>
    </div>`;
}

function _errState(title, detail) {
    return `<div style="padding:14px 16px; border-radius:8px; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.06); display:flex; align-items:flex-start; gap:10px;">
        <span style="font-size:1.1rem; flex-shrink:0;">⚠️</span>
        <div>
            <div style="font-weight:600; color:#fca5a5; font-size:0.85rem;">${title}</div>
            <div style="font-size:0.78rem; color:#64748b; margin-top:2px; font-family:monospace;">${detail}</div>
        </div>
    </div>`;
}

// ─── Maths ────────────────────────────────────────────────────────────────────
function _isoLocal(date) {
    const p = n => n < 10 ? '0'+n : n;
    return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

function _calcDist(data) {
    if (data.length < 2) return 0;
    let t = 0;
    for (let i = 0; i < data.length-1; i++) t += _haversine(data[i].latitude,data[i].longitude,data[i+1].latitude,data[i+1].longitude);
    return t;
}

function _haversine(la1,lo1,la2,lo2) {
    const R=6371, d2r=Math.PI/180;
    const dlat=(la2-la1)*d2r, dlon=(lo2-lo1)*d2r;
    const a=Math.sin(dlat/2)**2+Math.cos(la1*d2r)*Math.cos(la2*d2r)*Math.sin(dlon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

// Backward-compat alias
window.renderOverview = window.renderOverview;