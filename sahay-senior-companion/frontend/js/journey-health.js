// Journey 3: Health & Hospital (Prescription Scanner, Counter Guidance, Pill Reminders)

class HealthJourney {
  constructor() {
    this.prescriptionData = null;
    this.reminders = [];
    this.visits = [];
  }

  async init() {
    await this.fetchReminders();
    await this.fetchVisits();
    this.render();
  }

  async fetchReminders() {
    try {
      const res = await fetch("/api/health/reminders");
      const data = await res.json();
      if (data.status === "success") {
        this.reminders = data.reminders;
      }
    } catch (e) {
      console.warn("Reminders fetch failed:", e);
    }
  }

  async fetchVisits() {
    try {
      const res = await fetch("/api/health/visits");
      const data = await res.json();
      if (data.status === "success") {
        this.visits = data.visits;
      }
    } catch (e) {
      console.warn("Visits fetch failed:", e);
    }
  }

  async loadSamplePrescription() {
    voiceEngine.playChime("start");
    this.prescriptionData = sampleData.prescription;
    this.render();
    voiceEngine.speak("I have scanned your Apollo Cardiology prescription. Dr. Sharma prescribed Telmisartan for your blood pressure and Atorvastatin. I have set your daily pill alarms.");
  }

  async markTaken(reminderId) {
    voiceEngine.playChime("success");
    try {
      const res = await fetch("/api/health/mark-reminder-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_id: reminderId })
      });
      const data = await res.json();
      alert(data.message);
      await this.fetchReminders();
      this.render();
      if (window.refreshDashboard) window.refreshDashboard();
    } catch (e) {
      console.warn("Mark reminder failed:", e);
    }
  }

  showHospitalGuidance() {
    voiceEngine.playChime("start");
    const modal = document.createElement("div");
    modal.className = "confirmation-modal-backdrop";
    modal.innerHTML = `
      <div class="confirmation-card" style="text-align: left;">
        <h3 style="color: #0D9488; margin-bottom: 12px;">🏥 In-Hospital Guidance: Apollo Clinic</h3>
        <ul class="plain-checklist">
          <li><span>🚪</span> <strong>Entrance:</strong> Main door on Sampige Road. Wheelchair ramp on the left.</li>
          <li><span>🎟️</span> <strong>Registration:</strong> Hand referral slip to Counter 1 for Token #14.</li>
          <li><span>🛗</span> <strong>Doctor's Room:</strong> Room 104 (First Floor - elevator next to pharmacy).</li>
          <li><span>🪑</span> <strong>Resting Area:</strong> Soft cushioned sofas right outside Room 104.</li>
        </ul>
        <button id="close-hosp-btn" class="btn-primary" style="background: #0D9488;">
          <span>👍</span> Got It, Thank You
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#close-hosp-btn").onclick = () => modal.remove();
  }

  render() {
    const container = document.getElementById("health-journey-container");
    if (!container) return;

    let html = `
      <div class="senior-card">
        <h3><span>💊</span> Health & Hospital Companion</h3>
        <p style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 20px;">
          Effortlessly manage prescriptions, hospital visits, and audible daily pill reminders.
        </p>

        <!-- Prescription Scanner / Upload -->
        <div style="background: var(--bg-card-hover); border: 2px dashed var(--border-card); border-radius: var(--radius-card); padding: 24px; text-align: center; margin-bottom: 24px;">
          <h4 style="font-size: 1.3rem; margin-bottom: 8px;">Photograph Your Doctor's Prescription</h4>
          <p style="font-size: 1.05rem; color: var(--text-muted); margin-bottom: 16px;">
            AI will identify the medicines, dosage times, and create spoken daily alarms.
          </p>

          ${this.prescriptionData ? `
            <div style="margin: 16px 0;">
              <img src="${this.prescriptionData.svg_preview}" alt="Apollo Prescription" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: var(--shadow-card);" />
              <div class="verified-safe-box" style="margin-top: 14px;">
                <span>🩺</span>
                <div>
                  <strong>${this.prescriptionData.doctor_name} (${this.prescriptionData.clinic})</strong>
                  <div style="font-size: 1.05rem; color: #15803D;">Consultation Date: ${this.prescriptionData.date}</div>
                </div>
              </div>
            </div>

            <!-- Medicines Extracted List -->
            <div style="margin-top: 20px; text-align: left;">
              <h4 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 10px;">Prescribed Medication Schedule:</h4>
              <ul class="plain-checklist">
                ${this.prescriptionData.medicines.map(m => `
                  <li>
                    <span>💊</span>
                    <div>
                      <strong>${m.name} (${m.dosage})</strong> &bull; <span style="color: #0D9488; font-weight: 700;">${m.when}</span>
                      <div style="font-size: 0.95rem; color: var(--text-muted);">${m.purpose}</div>
                    </div>
                  </li>
                `).join('')}
              </ul>

              <div class="btn-grid-row">
                <button class="btn-secondary" style="border-color: #0D9488; color: #0D9488;" onclick="healthJourney.showHospitalGuidance()">
                  <span>🏥</span> View In-Hospital Guidance (Room 104)
                </button>
              </div>
            </div>
          ` : `
            <div class="btn-grid-row">
              <button class="btn-primary" style="background: #0D9488;" onclick="healthJourney.loadSamplePrescription()">
                <span>📷</span> Scan Verified Doctor Prescription
              </button>
            </div>
          `}
        </div>

        <!-- Active Daily Pill Reminders -->
        <h4 style="font-size: 1.35rem; margin-bottom: 14px;">⏰ Active Medication Alarms Today</h4>
        <div style="margin-bottom: 24px;">
          ${this.reminders.length > 0 ? `
            <ul class="plain-checklist">
              ${this.reminders.map(rem => `
                <li style="display: flex; justify-content: space-between; align-items: center; background: ${rem.status === 'completed' ? '#F0FDF4' : '#FFFFFF'};">
                  <div>
                    <div style="font-size: 1.25rem; font-weight: 800; color: ${rem.status === 'completed' ? '#166534' : 'var(--text-primary)'};">
                      ${rem.title}
                    </div>
                    <div style="font-size: 1.05rem; color: var(--text-secondary); margin-top: 4px;">
                      ${rem.detail}
                    </div>
                    <div style="font-size: 1rem; color: #0D9488; font-weight: 700; margin-top: 4px;">
                      ⏱️ ${rem.due_time}
                    </div>
                  </div>
                  <div>
                    ${rem.status === 'completed' ? `
                      <span style="font-size: 1.15rem; color: #15803D; font-weight: 800;">✔ Taken</span>
                    ` : `
                      <button class="btn-primary" style="background: #15803D; min-height: 48px; font-size: 1.05rem; padding: 8px 16px; width: auto;" onclick="healthJourney.markTaken('${rem.id}')">
                        Mark Taken
                      </button>
                    `}
                  </div>
                </li>
              `).join('')}
            </ul>
          ` : `
            <p style="font-size: 1.1rem; color: var(--text-muted);">No medication alarms scheduled yet.</p>
          `}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }
}

const healthJourney = new HealthJourney();
