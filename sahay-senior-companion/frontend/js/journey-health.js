// Journey 3: Health & Hospital (Prescription Scanner, Counter Guidance, Pill Reminders)

class HealthJourney {
  constructor() {
    this.prescriptionData = null;
    this.reminders = [];
    this.visits = [];
    this.scan = { status: "idle" };
  }

  async init() {
    await Promise.all([this.fetchReminders(), this.fetchVisits()]);
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

  async scanPrescription() {
    voiceEngine.playChime("start");
    let photo;
    try {
      photo = await pickPhoto();
    } catch (e) {
      this.scan = { status: "error", error: e.message };
      this.render();
      return;
    }
    if (!photo) return; // cancelled
    this.scan = { status: "reading", preview: photo };
    this.render();

    const result = await readDocumentPhoto("prescription", photo);
    if (!result.ok) {
      this.scan = { status: "error", error: result.error };
      this.render();
      return;
    }
    const d = result.data;
    this.scan = {
      status: "review",
      preview: photo,
      doctor: d.doctor_name || "",
      clinic: d.hospital_clinic || d.clinic || "",
      date: d.visit_date || "",
      next_visit: d.next_appointment || "",
      summary: d.plain_summary || "",
      medicines: (d.medicines || []).map((m) => ({
        name: m.name || "",
        dosage: m.dosage || "",
        when: m.when || "",
        purpose: m.purpose || ""
      }))
    };
    this.render();
    voiceEngine.speak("I have read your prescription. Please check every medicine carefully, and tap yes if they are correct.");
  }

  async confirmPrescription() {
    const s = this.scan;
    const val = (id) => (document.getElementById(id) ? document.getElementById(id).value.trim() : "");
    const medicines = [];
    s.medicines.forEach((m, i) => {
      const include = document.getElementById(`rx-inc-${i}`);
      if (include && include.checked && val(`rx-name-${i}`)) {
        medicines.push({ name: val(`rx-name-${i}`), dosage: val(`rx-dose-${i}`), when: val(`rx-when-${i}`), purpose: m.purpose });
      }
    });
    if (medicines.length === 0) {
      alert("Please tick at least one medicine.");
      return;
    }
    const doctor = val("rx-doctor");
    const clinic = val("rx-clinic");
    try {
      const res = await fetch("/api/health/log-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor,
          clinic,
          date: s.date,
          plain_summary: s.summary || "Prescription added from a photo.",
          next_visit: s.next_visit,
          medicines
        })
      });
      if (!res.ok) throw new Error("save failed");
    } catch (e) {
      this.scan = { ...s, error: "I could not save this. Please try again." };
      this.render();
      return;
    }
    this.prescriptionData = { doctor_name: doctor, clinic, date: s.date, medicines, svg_preview: s.preview };
    this.scan = { status: "idle" };
    await this.fetchReminders();
    await this.fetchVisits();
    this.render();
    if (window.refreshDashboard) window.refreshDashboard();
    voiceEngine.speak("Your medicines are saved.");
  }

  renderScan() {
    const s = this.scan || { status: "idle" };
    if (s.status === "reading") {
      return `<div role="status" style="font-size: 1.25rem; font-weight: 700; padding: 20px;">🔎 Reading your prescription… please wait a few seconds.</div>`;
    }
    if (s.status === "review") {
      const input = (id, label, value, extra = "") => `
        <label style="display: block; text-align: left; font-size: 1.05rem; font-weight: 700; margin-top: 10px;">${label}
          <input id="${id}" type="text" value="${esc(value)}" ${extra}
                 style="display: block; width: 100%; min-height: 48px; font-size: 1.15rem; padding: 8px 12px; margin-top: 4px; border: 2px solid var(--border-card); border-radius: 12px;" />
        </label>`;
      const meds = s.medicines.map((m, i) => `
        <div style="border: 2px solid var(--border-card); border-radius: 14px; padding: 12px 14px; margin-top: 14px; text-align: left;">
          <label style="font-size: 1.1rem; font-weight: 800;"><input id="rx-inc-${i}" type="checkbox" checked style="width: 22px; height: 22px; margin-right: 8px;" /> Include this medicine</label>
          ${input(`rx-name-${i}`, "Medicine", m.name)}
          ${input(`rx-dose-${i}`, "How much", m.dosage)}
          ${input(`rx-when-${i}`, "When to take it", m.when)}
        </div>`).join("");
      const error = s.error ? `<p role="alert" style="font-size: 1.1rem; color: #B91C1C; font-weight: 700;">${esc(s.error)}</p>` : "";
      return `
        <img src="${esc(safeImgSrc(s.preview))}" alt="Your prescription photo" style="max-width: 100%; max-height: 260px; border-radius: 12px; box-shadow: var(--shadow-card);" />
        <p style="font-size: 1.15rem; font-weight: 700; margin: 14px 0 4px;">Please check every medicine and dose against your paper prescription. Fix anything that is wrong. If you are not sure, ask your doctor or pharmacist.</p>
        ${input("rx-doctor", "Doctor", s.doctor)}
        ${input("rx-clinic", "Clinic or hospital", s.clinic)}
        ${meds}
        ${error}
        <div class="btn-grid-row" style="margin-top: 18px;">
          <button class="btn-primary" style="background: #0D9488;" onclick="healthJourney.confirmPrescription()"><span>✅</span> Yes, these are correct. Set my reminders</button>
          <button class="btn-secondary" onclick="healthJourney.scanPrescription()"><span>📷</span> Take the photo again</button>
        </div>`;
    }
    const error = s.status === "error"
      ? `<p role="alert" style="font-size: 1.15rem; color: #B91C1C; font-weight: 700; margin-bottom: 14px;">${esc(s.error)}</p>`
      : "";
    return `
      ${error}
      <div class="btn-grid-row">
        <button class="btn-primary" style="background: #0D9488;" onclick="healthJourney.scanPrescription()"><span>📷</span> Add a Photo of My Prescription</button>
      </div>
      <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 12px;">${esc(PHOTO_PRIVACY_NOTE)}</p>`;
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
            AI will read the medicines and timings from a photo. You check every one before reminders are set.
          </p>

          ${this.prescriptionData ? `
            <div style="margin: 16px 0;">
              <img src="${esc(safeImgSrc(this.prescriptionData.svg_preview))}" alt="Your prescription photo" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: var(--shadow-card);" />
              <div class="verified-safe-box" style="margin-top: 14px;">
                <span>🩺</span>
                <div>
                  <strong>${esc(this.prescriptionData.doctor_name)} (${esc(this.prescriptionData.clinic)})</strong>
                  <div style="font-size: 1.05rem; color: #15803D;">Consultation Date: ${esc(this.prescriptionData.date)}</div>
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
                      <strong>${esc(m.name)} (${esc(m.dosage)})</strong> &bull; <span style="color: #0D9488; font-weight: 700;">${esc(m.when)}</span>
                      <div style="font-size: 0.95rem; color: var(--text-muted);">${esc(m.purpose)}</div>
                    </div>
                  </li>
                `).join('')}
              </ul>

            </div>
          ` : `
            ${this.renderScan()}
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
                      ${esc(rem.title)}
                    </div>
                    <div style="font-size: 1.05rem; color: var(--text-secondary); margin-top: 4px;">
                      ${esc(rem.detail)}
                    </div>
                    <div style="font-size: 1rem; color: #0D9488; font-weight: 700; margin-top: 4px;">
                      ⏱️ ${esc(rem.due_time)}
                    </div>
                  </div>
                  <div>
                    ${rem.status === 'completed' ? `
                      <span style="font-size: 1.15rem; color: #15803D; font-weight: 800;">✔ Taken</span>
                    ` : `
                      <button class="btn-primary" style="background: #15803D; min-height: 48px; font-size: 1.05rem; padding: 8px 16px; width: auto;" onclick="healthJourney.markTaken(${jsArg(rem.id)})">
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
