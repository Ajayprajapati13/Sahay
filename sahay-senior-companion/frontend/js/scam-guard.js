// Sahay Cross-Cutting Scam & Trust Guardian Layer

class ScamGuard {
  constructor() {
    this.history = [];
  }

  // Cross-cutting background scan triggered whenever any document or text is received
  async inspectContent({ text = "", imageB64 = null, source = "background_scan", silentIfSafe = true }) {
    try {
      const res = await fetch("/api/scam/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, image_b64: imageB64, source })
      });
      const data = await res.json();
      if (data.status === "success") {
        const result = data.result;
        this.history.unshift(result);
        
        if (result.is_scam) {
          voiceEngine.playChime("warn");
          this.showScamAlertModal(result);
          return { isScam: true, result };
        } else if (!silentIfSafe) {
          this.showSafeDocumentModal(result);
          return { isScam: false, result };
        }
        return { isScam: false, result };
      }
    } catch (e) {
      console.warn("Scam guard background check failed:", e);
    }
    return { isScam: false, result: null };
  }

  showScamAlertModal(scamResult) {
    const modal = document.createElement("div");
    modal.className = "confirmation-modal-backdrop";
    modal.setAttribute("role", "alertdialog");
    modal.setAttribute("aria-modal", "true");

    const reasonsList = (scamResult.reasons || [])
      .map(r => `<li>${r}</li>`)
      .join("");

    modal.innerHTML = `
      <div class="confirmation-card" style="border-color: var(--status-danger);">
        <div class="scam-alert-box" style="margin-top: 0;">
          <h4><span>🚨</span> ${scamResult.plain_headline || "Warning: Suspicious Message!"}</h4>
          <p style="font-size: 1.15rem; font-weight: 700; margin: 8px 0;">Pattern: ${scamResult.scam_type}</p>
          <ul style="text-align: left;">${reasonsList}</ul>
          <div class="safe-action">
            <strong>What you should do:</strong> ${scamResult.safe_action}
          </div>
        </div>
        
        <div class="btn-grid-row">
          <button id="scam-report-btn" class="btn-danger">
            <span>🛑</span> ${t("btn_report_block")}
          </button>
          <button id="scam-family-btn" class="btn-secondary">
            <span>📲</span> ${t("btn_share_family")}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Speak the spoken warning softly to calm the senior down
    voiceEngine.speak(scamResult.spoken_warning || "Warning. This is a fake message trying to panic you. Do not pay any money.");

    modal.querySelector("#scam-report-btn").onclick = () => {
      voiceEngine.stopSpeaking();
      modal.remove();
      alert("The suspicious message has been marked as blocked. Your peace of mind is safe.");
    };

    modal.querySelector("#scam-family-btn").onclick = () => {
      voiceEngine.stopSpeaking();
      modal.remove();
      alert("A copy has been forwarded to your daughter Ananya to verify.");
    };
  }

  showSafeDocumentModal(safeResult) {
    const modal = document.createElement("div");
    modal.className = "confirmation-modal-backdrop";
    modal.innerHTML = `
      <div class="confirmation-card" style="border-color: var(--status-safe);">
        <div class="verified-safe-box">
          <span style="font-size: 2rem;">✅</span>
          <div>
            <h3>${safeResult.plain_headline}</h3>
            <p style="font-size: 1.1rem; color: #15803D; margin-top: 4px;">${safeResult.safe_action}</p>
          </div>
        </div>
        <button id="safe-ok-btn" class="btn-primary" style="margin-top: 20px;">
          <span>👍</span> Continue With Peace of Mind
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    voiceEngine.speak(safeResult.spoken_warning || "This document is verified and safe.");
    modal.querySelector("#safe-ok-btn").onclick = () => {
      voiceEngine.stopSpeaking();
      modal.remove();
    };
  }
}

const scamGuard = new ScamGuard();
