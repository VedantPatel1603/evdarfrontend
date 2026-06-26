// data_export_view.js: Read telemetry data and export to SQL

window.renderDataExportView = function (containerId) {
    console.log("renderDataExportView called for:", containerId);
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Container not found:", containerId);
        return;
    }

    container.innerHTML = `
        <div class="card">
            <h3>Data Export & Retrieval</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                
                <!-- Fetch Data Panel -->
                <div style="padding: 15px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid #253244;">
                    <h4 style="margin-top: 0; color: #3b82f6;">📥 Fetch Telemetry Data</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem;">Date Filter (DD/MM/YYYY):</label>
                            <input type="text" id="fetchDateInput" placeholder="Leave blank for all dates" 
                                style="width:100%; padding:8px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:white;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem;">Limit (rows):</label>
                            <input type="number" id="fetchLimitInput" value="100" min="1" max="10000"
                                style="width:100%; padding:8px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:white;">
                        </div>
                        <button id="fetchBtn" style="padding:10px; border-radius:6px; background:#0ea5e9; border:none; color:#021124; cursor:pointer; font-weight:600;">
                            Fetch Data
                        </button>
                    </div>
                    <div id="fetchResult" style="margin-top: 10px; padding: 10px; border-radius: 6px; background: rgba(0,0,0,0.2); min-height: 60px; font-size: 0.85rem; display: none;">
                    </div>
                </div>

                <!-- Export SQL Panel -->
                <div style="padding: 15px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid #253244;">
                    <h4 style="margin-top: 0; color: #a855f7;">💾 Export as SQL</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem;">Date Filter (DD/MM/YYYY):</label>
                            <input type="text" id="exportDateInput" placeholder="Leave blank for all dates" 
                                style="width:100%; padding:8px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:white;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 5px; font-size: 0.9rem;">Limit (rows):</label>
                            <input type="number" id="exportLimitInput" value="1000" min="1" max="100000"
                                style="width:100%; padding:8px; border-radius:6px; border:1px solid #475569; background:#0f172a; color:white;">
                        </div>
                        <button id="exportBtn" style="padding:10px; border-radius:6px; background:#a855f7; border:none; color:#021124; cursor:pointer; font-weight:600;">
                            Export to SQL
                        </button>
                    </div>
                    <div id="exportResult" style="margin-top: 10px; padding: 10px; border-radius: 6px; background: rgba(0,0,0,0.2); min-height: 60px; font-size: 0.85rem; display: none;">
                    </div>
                </div>
            </div>

            <!-- Data Table -->
            <div style="margin-top: 20px;">
                <h4>Latest Fetched Data:</h4>
                <div id="dataTable" style="max-height: 400px; overflow-y: auto; border-radius: 8px; border: 1px solid #253244; background: rgba(0,0,0,0.2);">
                    <p style="padding: 20px; opacity: 0.6;">No data fetched yet.</p>
                </div>
            </div>
        </div>
    `;

    // Bind event listeners
    document.getElementById('fetchBtn').addEventListener('click', handleFetchData);
    document.getElementById('exportBtn').addEventListener('click', handleExportSQL);
};

async function handleFetchData() {
    const API_BASE = window.getApiBase();
    const user = window.getUser();
    const dateFilter = document.getElementById('fetchDateInput').value.trim();
    const limit = document.getElementById('fetchLimitInput').value || 100;
    const resultDiv = document.getElementById('fetchResult');
    const tableDiv = document.getElementById('dataTable');

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<span style="opacity:0.7">⏳ Fetching...</span>';

    try {
        let url = `${API_BASE}/api/telemetry?user_id=${user.user_id}&limit=${limit}`;
        if (dateFilter) {
            url += `&date=${encodeURIComponent(dateFilter)}`;
        }

        const res = await window.apiCall(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!json.success) throw new Error(json.error || 'Unknown error');

        resultDiv.innerHTML = `
            <strong style="color:#22c55e;">✓ Success!</strong><br>
            Total: ${json.total} rows | Returned: ${json.returned} rows
        `;

        // Render table
        if (json.data && json.data.length > 0) {
            renderDataTable(json.data, tableDiv);
        } else {
            tableDiv.innerHTML = '<p style="padding: 20px; opacity: 0.6;">No data found.</p>';
        }

    } catch (err) {
        resultDiv.innerHTML = `<strong style="color:#ef4444;">✗ Error:</strong> ${err.message}`;
        tableDiv.innerHTML = '<p style="padding: 20px; opacity: 0.6;">Error loading data.</p>';
    }
}

async function handleExportSQL() {
    const API_BASE = window.getApiBase();
    const user = window.getUser();
    const dateFilter = document.getElementById('exportDateInput').value.trim();
    const limit = document.getElementById('exportLimitInput').value || 1000;
    const resultDiv = document.getElementById('exportResult');

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<span style="opacity:0.7">⏳ Exporting...</span>';

    try {
        let url = `${API_BASE}/api/export-sql?user_id=${user.user_id}&limit=${limit}`;
        if (dateFilter) {
            url += `&date=${encodeURIComponent(dateFilter)}`;
        }

        const res = await window.apiCall(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Get filename from Content-Disposition header
        const contentDisposition = res.headers.get('Content-Disposition');
        let filename = 'telemetry_export.sql';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match) filename = match[1];
        }

        // Download
        const blob = await res.blob();
        const url_blob = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url_blob;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url_blob);

        resultDiv.innerHTML = `
            <strong style="color:#22c55e;">✓ Downloaded!</strong><br>
            File: ${filename}
        `;

    } catch (err) {
        resultDiv.innerHTML = `<strong style="color:#ef4444;">✗ Error:</strong> ${err.message}`;
    }
}

function renderDataTable(data, container) {
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="padding: 20px; opacity: 0.6;">No data to display.</p>';
        return;
    }

    // Show first 10 rows as preview
    const preview = data.slice(0, 10);
    const cols = ['id', 'received_at', 'date', 'time', 'gps_lat', 'gps_lng', 'gps_speed_kmh', 'gps_alt_m'];

    let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">';
    html += '<thead style="background: rgba(255,255,255,0.1);">';
    html += '<tr>';
    cols.forEach(col => {
        html += `<th style="padding: 8px; text-align: left; border-bottom: 1px solid #253244;">${col}</th>`;
    });
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    preview.forEach((row, idx) => {
        html += `<tr style="background: ${idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent'}; border-bottom: 1px solid #253244;">`;
        cols.forEach(col => {
            let val = row[col];
            if (val === null) val = '—';
            else if (typeof val === 'number') val = val.toFixed(2);
            html += `<td style="padding: 8px;">${val}</td>`;
        });
        html += '</tr>';
    });

    html += '</tbody>';
    html += '</table>';
    html += `<div style="padding: 10px; font-size: 0.8rem; opacity: 0.6; background: rgba(0,0,0,0.2);">Showing ${preview.length} of ${data.length} rows</div>`;

    container.innerHTML = html;
}
