// static_views.js: Logic for simple static pages (About, Help, Contact)

window.renderStaticView = function (view, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (view === 'help') {
        container.innerHTML = `
            <div class="card">
                <h3>Help & Feedback</h3>
                <p>Have questions or suggestions? We'd love to hear from you.</p>
                <div style="margin-top:20px; padding:20px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <p style="margin:0; font-size:1.1rem;">
                        📧 Email us at for feedback: 
                        <a href="mailto:contact.evdar@gmail.com" style="color:#38bdf8; text-decoration:none; font-weight:600;">contact.evdar@gmail.com</a>
                    </p>
                </div>
            </div>`;
        return;
    }

    if (view === 'contact') {
        container.innerHTML = `
            <div class="card">
                <h3>Get in Touch</h3>
                <p style="color:#94a3b8; margin-bottom:25px;">We are here to assist you. Reach out through any of the channels below.</p>
                
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                    
                    <!-- Email Card -->
                    <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                        <div style="font-size:2rem; margin-bottom:10px;">📧</div>
                        <h4 style="margin:0 0 5px 0; color:#f8fafc;">Email Us</h4>
                        <p style="margin:0; color:#cbd5e1; font-size:0.9rem;">For general inquiries and support</p>
                        <a href="mailto:contact.evdar@gmail.com" style="display:inline-block; margin-top:10px; color:#38bdf8; text-decoration:none;">contact.evdar@gmail.com</a>
                    </div>

                    <!-- Address Card -->
                    <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                        <div style="font-size:2rem; margin-bottom:10px;">📍</div>
                        <h4 style="margin:0 0 5px 0; color:#f8fafc;">Visit Us</h4>
                        <p style="margin:0; color:#cbd5e1; font-size:0.9rem;">Our headquarters</p>
                        <p style="margin-top:10px; line-height:1.4; color:#f1f5f9;">
                            Dharmsinh Desai University<br>
                            College Road, Nadiad<br>
                            Gujarat, India
                        </p>
                    </div>

                </div>
            </div>`;
        return;
    }

    if (view === 'about') {
        container.innerHTML = `
            <div class="card">
                <h3>About EVDAR</h3>
                <h4 style="color:#38bdf8; margin-top:0; font-weight:400;">Embedded Vehicle Data and Recorder</h4>
                <p style="color:#cbd5e1; line-height:1.7; margin-bottom:20px;">
                    EVDAR stands for <strong>Embedded Vehicle Data and Recorder</strong>. It is a cutting-edge platform engineered to bridge the gap between embedded hardware and actionable data analytics. 
                    <br><br>
                    In the rapidly evolving landscape of electric mobility, data is the new fuel. EVDAR provides a comprehensive solution for capturing high-fidelity telemetry directly from vehicle encodings, storing it securely, and visualizing it through an intuitive, real-time dashboard.
                    Whether for R&D, fleet management, or performance tuning, EVDAR transforms raw signals into meaningful insights.
                </p>
                
                <h4 style="color:#f1f5f9; margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">Key Features</h4>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px;">
                    <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:8px;">
                        <div style="color:#38bdf8; font-size:1.2rem; margin-bottom:5px;">📡 Real-Time Telemetry</div>
                        <p style="font-size:0.85rem; color:#94a3b8; margin:0;">Instant visualization of speed, acceleration, and location data.</p>
                    </div>
                     <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:8px;">
                        <div style="color:#a78bfa; font-size:1.2rem; margin-bottom:5px;">💾 Secure & Scalable</div>
                        <p style="font-size:0.85rem; color:#94a3b8; margin:0;">Robust backend architecture to handle massive data streams.</p>
                    </div>
                     <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:8px;">
                        <div style="color:#34d399; font-size:1.2rem; margin-bottom:5px;">📊 Advanced Analytics</div>
                        <p style="font-size:0.85rem; color:#94a3b8; margin:0;">Historical playback, anomaly detection, and performance graphing.</p>
                    </div>
                </div>
            </div>

            <h3 style="margin:30px 0 20px 0; color:#f8fafc; border-left:4px solid #3b82f6; padding-left:15px;">Meet the Founders</h3>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:25px;">
                <!-- Founder 1: Lead -->
                <div style="background:rgba(30, 41, 59, 0.6); padding:20px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                    <div style="width:100px; height:100px; border-radius:50%; margin:0 auto 15px auto; overflow:hidden; border:2px solid rgba(255,255,255,0.1);">
                        <img src="/evdar-frontend/images/lead.png" alt="Lead" style="width:100%; height:100%; object-fit:cover; transform: scale(1.2); object-position: center 25%;">
                    </div>
                    <h4 style="margin:10px 0 5px 0; color:#f1f5f9;">Vedant Patel</h4>
                    <p style="color:#94a3b8; font-size:0.85rem;">Co-Founder & Lead</p>
                </div>
                <!-- Founder 2: Tech -->
                <div style="background:rgba(30, 41, 59, 0.6); padding:20px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                    <div style="width:100px; height:100px; border-radius:50%; margin:0 auto 15px auto; overflow:hidden; border:2px solid rgba(255,255,255,0.1);">
                         <img src="/evdar-frontend/images/tech.png" alt="Tech" style="width:100%; height:100%; object-fit:cover; object-position: center top;">
                    </div>
                    <h4 style="margin:10px 0 5px 0; color:#f1f5f9;">Mauryadeepsinh Zala</h4>
                    <p style="color:#94a3b8; font-size:0.85rem;">Co-Founder & Tech</p>
                </div>
                <!-- Founder 3: Design -->
                <div style="background:rgba(30, 41, 59, 0.6); padding:20px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                    <div style="width:100px; height:100px; border-radius:50%; margin:0 auto 15px auto; overflow:hidden; border:2px solid rgba(255,255,255,0.1);">
                         <img src="/evdar-frontend/images/design.PNG" alt="Design" style="width:100%; height:100%; object-fit:cover; object-position: center 25%;">
                    </div>
                    <h4 style="margin:10px 0 5px 0; color:#f1f5f9;">Maitri Salunke</h4>
                    <p style="color:#94a3b8; font-size:0.85rem;">Co-Founder & Design</p>
                </div>
                <!-- Founder 4: Strategy -->
                 <div style="background:rgba(30, 41, 59, 0.6); padding:20px; border-radius:12px; text-align:center; border:1px solid rgba(255,255,255,0.05);">
                    <div style="width:100px; height:100px; border-radius:50%; margin:0 auto 15px auto; overflow:hidden; border:2px solid rgba(255,255,255,0.1);">
                         <img src="/evdar-frontend/images/stratergy.jpeg" alt="Strategy" style="width:100%; height:100%; object-fit:cover; object-position: top;">
                    </div>
                    <h4 style="margin:10px 0 5px 0; color:#f1f5f9;">Vivek Patel</h4>
                    <p style="color:#94a3b8; font-size:0.85rem;">Co-Founder & Strategy</p>
                </div>
            </div>

            <h3 style="margin:40px 0 20px 0; color:#f8fafc; border-left:4px solid #8b5cf6; padding-left:15px;">Our Guiding Light</h3>
            <div style="background:rgba(139, 92, 246, 0.1); padding:30px; border-radius:16px; border:1px solid rgba(139, 92, 246, 0.2); display:flex; align-items:center; gap:25px; flex-wrap:wrap;">
                 <div style="width:120px; height:120px; border-radius:50%; flex-shrink:0; overflow:hidden; border:3px solid rgba(255,255,255,0.1);">
                    <img src="/evdar-frontend/images/mentor.jpg" alt="Mentor" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div>
                    <h4 style="margin:0 0 10px 0; font-size:1.3rem; color:#f1f5f9;">Narendrakumar V. Chauhan</h4>
                    <p style="color:#cbd5e1; font-style:italic; margin-bottom:10px;">"Success is not final, failure is not fatal: it is the courage to continue that counts."</p>
                    <p style="color:#94a3b8; font-size:0.9rem; margin:0;">Professor & Project Guide</p>
                </div>
            </div>
            
            <p style="margin-top:40px; opacity:0.5; text-align:center; font-size:0.8rem;">© 2026 EVDAR. All rights reserved.</p>
            `;
        return;
    }

    container.innerHTML = `<div class="card"><p>Unknown view: ${view}</p></div>`;
};
