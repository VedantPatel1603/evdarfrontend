// admin_view.js: Logic for the Admin Console

window.renderAdminView = function (containerId, currentUser) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!currentUser || currentUser.role !== 'admin') {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 60px;">
                <h2 style="color:#ef4444">Access Denied</h2>
                <p>This area is restricted to administrators.</p>
            </div>`;
        return;
    }

    container.innerHTML = `
      <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                  <h3>Admin Console</h3>
                  <p style="opacity:0.7; margin-top:4px; font-size:0.9rem;">Manage system users and access rights</p>
              </div>
              <button id="btnReloadUsers" style="width:auto; padding: 8px 16px;">↻ Refresh List</button>
          </div>
      </div>

      <div class="dashboard-grid" style="margin-top:20px;">
          
          <!-- User List -->
          <div class="card">
              <h3>Users Database</h3>
              <div id="adminOutput" style="margin-top:15px; overflow-x:auto;">
                  <p style="opacity:0.7; font-style:italic;">Click refresh to load users...</p>
              </div>
          </div>

          <!-- Add User Form -->
          <div class="card">
              <h3>Add New User</h3>
              <form id="adminAddUserForm" style="display:flex; flex-direction:column; gap:15px; margin-top:15px;">
                  
                  <div class="form-group">
                      <label>Username</label>
                      <input name="username" required placeholder="e.g. driver1" autocomplete="off">
                  </div>

                  <div class="form-group">
                      <label>Password</label>
                      <input name="password" type="password" required placeholder="••••••••">
                  </div>

                      <div class="form-group">
                          <label>Role</label>
                          <select name="role" style="width:100%">
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                          </select>
                      </div>

                  <button type="submit" style="margin-top:10px;">Create User</button>
              </form>
              <div id="adminAddOutput" style="margin-top:15px;"></div>
          </div>

      </div>
    `;

    // Bind Listeners
    bindAdminListeners();
};

function bindAdminListeners() {
    const btnReloadUsers = document.getElementById('btnReloadUsers');
    const out = document.getElementById('adminOutput');
    const API_BASE = window.getApiBase();

    if (btnReloadUsers) {
        btnReloadUsers.addEventListener('click', async () => {
            out.innerHTML = '<p style="color:#3b82f6">Loading...</p>';
            try {
                const res = await fetch(API_BASE + '/users');
                if (!res.ok) throw new Error('Fetch failed: ' + res.status);
                const users = await res.json();

                if (!Array.isArray(users) || users.length === 0) {
                    out.innerHTML = '<p>No users found.</p>';
                } else {
                    // Render Styled Table
                    let html = '<table>';
                    html += '<thead><tr>';
                    // columns: user_id, username, role, car, Action
                    html += '<th>ID</th><th>Username</th><th>Role</th><th>Car</th><th>Action</th>';
                    html += '</tr></thead><tbody>';

                    users.forEach(u => {
                        html += '<tr>';
                        html += `<td>${u.user_id || u.id || '-'}</td>`;
                        html += `<td>${u.username}</td>`;
                        html += `<td>${u.role}</td>`;
                        html += `<td>${u.car || '-'}</td>`;

                        const uid = u.user_id || u.id;
                        html += `<td style="text-align:center;">
                            <button onclick="window.deleteUser('${uid}')" style="background:rgba(239, 68, 68, 0.2); color:#fca5a5; border:1px solid rgba(239, 68, 68, 0.3); padding:6px 10px; font-size:12px; border-radius:4px; cursor:pointer;" title="Delete User">🗑️</button>
                        </td>`;
                        html += '</tr>';
                    });
                    html += '</tbody></table>';
                    out.innerHTML = html;
                }
            } catch (err) {
                out.innerHTML = `<p style="color:#ef4444">Error: ${err.message}</p>`;
            }
        });
        // Auto-load on view enter
        btnReloadUsers.click();
    }

    // User Search Logic
    const btnSearch = document.getElementById('btnAdminSearch');
    const searchInput = document.getElementById('adminSearchId');
    const searchOutput = document.getElementById('adminSearchOutput');

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

                searchOutput.innerHTML = `
                    <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; border:1px solid rgba(255,255,255,0.1);">
                        <div style="display:grid; grid-template-columns:auto 1fr; gap:10px; font-size:0.9rem;">
                            <span style="opacity:0.6;">User ID:</span> <strong>${u.id || u.user_id}</strong>
                            <span style="opacity:0.6;">Username:</span> <strong>${u.username}</strong>
                            <span style="opacity:0.6;">Role:</span> <strong style="color:${u.role === 'admin' ? '#f472b6' : '#4ade80'}">${u.role}</strong>
                            <span style="opacity:0.6;">Car File:</span> <code>${u.car || 'None'}</code>
                        </div>
                    </div>
                `;
            } catch (err) {
                searchOutput.innerHTML = `<p style="color:#ef4444">Error: ${err.message}</p>`;
            } finally {
                btnSearch.innerText = "Search";
            }
        });
    }


    const addForm = document.getElementById('adminAddUserForm');
    const addOutput = document.getElementById('adminAddOutput');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = new FormData(addForm);
            const role = form.get('role');
            const username = form.get('username');

            const btn = addForm.querySelector('button');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Creating...';
            addOutput.innerHTML = '';

            try {
                // 1. Fetch current users to determine next ID
                const usersRes = await fetch(API_BASE + '/users');
                if (!usersRes.ok) throw new Error('Could not fetch users to assign ID');
                const users = await usersRes.json();

                let maxId = 0;
                if (Array.isArray(users)) {
                    users.forEach(u => {
                        const uid = parseInt(u.user_id || u.id || 0);
                        if (uid > maxId) maxId = uid;
                    });
                }
                const nextId = maxId + 1;

                // 2. Auto-Assign Car
                let assignedCar = "";
                if (role === 'user') {
                    assignedCar = `car${nextId}.csv`;
                }

                const payload = {
                    username: username,
                    password: form.get('password'),
                    role: role,
                    car: assignedCar
                };

                const res = await fetch(API_BASE + '/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Create failed');

                let successMsg = `Success! User <strong>${payload.username}</strong> created.`;
                if (role === 'user') {
                    successMsg += ` Auto-assigned <strong>${assignedCar}</strong>.`;
                }

                addOutput.innerHTML = `<div style="padding:10px; background:rgba(34, 197, 94, 0.2); color:#4ade80; border:1px solid rgba(34, 197, 94, 0.3); border-radius:6px;">${successMsg}</div>`;
                addForm.reset();
                // Refresh list if visible
                if (btnReloadUsers) btnReloadUsers.click();
            } catch (err) {
                addOutput.innerHTML = `<div style="padding:10px; background:rgba(239, 68, 68, 0.2); color:#fca5a5; border:1px solid rgba(239, 68, 68, 0.3); border-radius:6px;">Error: ${err.message}</div>`;
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    }
}

// Global Delete Function used by the inline onclick
window.deleteUser = async function (userId) {
    if (!confirm(`Are you sure you want to delete user ${userId}?`)) return;

    try {
        const API_BASE = window.getApiBase();
        const res = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Delete failed');
        }

        alert('User deleted.');
        const btn = document.getElementById('btnReloadUsers');
        if (btn) btn.click();

    } catch (err) {
        alert('Error: ' + err.message);
    }
};
