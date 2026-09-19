// Flagship Demo Flow: Bank & Government Visit (Prepare -> Assist -> Follow up)

class BankJourney {
  constructor() {
    this.currentStep = 1; // 1: Prepare, 2: Assist, 3: Follow-Up
    this.passbookData = null;
    this.selectedPurpose = "pension_check";
    this.withdrawalAmount = "10000";
    this.assignedToken = "C-42";
    this.visitPlan = null;
    this.cabBooked = false;
  }

  init() {
    this.render();
  }

  goToStep(stepNumber) {
    this.currentStep = stepNumber;
    this.render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async loadSamplePassbook() {
    voiceEngine.playChime("start");
    // Run background scam security check
    await scamGuard.inspectContent({ text: "SBI Savings Bank Passbook Account •••• 4821 Malleshwaram", silentIfSafe: true });
    
    this.passbookData = sampleData.passbook;
    this.fetchPreparePlan();
  }

  async fetchPreparePlan() {
    try {
      const res = await fetch("/api/bank/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: this.selectedPurpose,
          amount: this.withdrawalAmount,
          bank_name: "State Bank of India",
          branch_name: "Malleshwaram 8th Cross",
          account_number: "4821",
          customer_name: "Ajay Kumar Sharma"
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        this.visitPlan = data;
        this.render();
        voiceEngine.speak(data.spoken_response);
      }
    } catch (e) {
      console.warn("Failed to prepare bank visit:", e);
    }
  }

  confirmAndBookCab() {
    const dest = "State Bank of India, Malleshwaram 8th Cross";
    const fare = "₹140";

    voiceEngine.confirmAction({
      title: "Confirm Cab Booking to Bank",
      message: `You are booking an AC cab to ${dest}. The total fare is ${fare}. Your daughter Ananya will receive driver and vehicle details.`,
      spokenMessage: `You are booking a cab to State Bank of India, Malleshwaram. Total fare is 140 rupees. Shall I confirm your ride now?`,
      confirmLabel: "Yes, Book My Cab",
      changeLabel: "No, Change Plan",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/transport/book-ride", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destination: dest,
              fare_estimate: fare,
              share_with_family: true
            })
          });
          const rideData = await res.json();
          this.cabBooked = true;
          this.cabDetails = rideData;
          this.render();
          voiceEngine.speak(rideData.spoken_response);
        } catch (e) {
          console.warn("Cab booking error:", e);
        }
      }
    });
  }

  async checkinAtKiosk() {
    voiceEngine.playChime("start");
    try {
      const res = await fetch("/api/bank/kiosk-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_masked: "SBI •••• 4821",
          purpose: this.selectedPurpose === "pension_check" ? "Pension Enquiry & Cash Withdrawal" : "Cash Withdrawal",
          token_code: this.assignedToken
        })
      });
      const kioskData = await res.json();
      this.kioskInfo = kioskData;
      this.goToStep(2); // Move to Assist Phase
      voiceEngine.speak(kioskData.spoken_guidance);
    } catch (e) {
      console.warn("Kiosk checkin failed:", e);
    }
  }

  async completeVisit(resolved) {
    if (resolved) {
      voiceEngine.confirmAction({
        title: "Log Completed Bank Transaction",
        message: `Log your cash withdrawal of ₹10,000 at SBI Malleshwaram to your private Bank Account Activity Tracker?`,
        spokenMessage: `Would you like me to log your withdrawal of 10,000 rupees to your private bank activity tracker?`,
        confirmLabel: "Yes, Save to Tracker",
        onConfirm: async () => {
          const res = await fetch("/api/bank/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action_type: "cash_withdrawal",
              amount: "₹10,000",
              resolved: true,
              bank_name: "State Bank of India",
              branch: "Malleshwaram 8th Cross",
              account_masked: "SBI •••• 4821"
            })
          });
          const result = await res.json();
          this.visitResult = result;
          this.goToStep(3);
          voiceEngine.speak(result.spoken_summary);
          if (window.refreshDashboard) window.refreshDashboard();
        }
      });
    } else {
      // Unresolved: pension delay!
      voiceEngine.confirmAction({
        title: "Draft Formal Follow-Up Letter?",
        message: "Since your pension was not credited today, Sahay will draft a formal letter to the SBI Branch Manager and schedule a follow-up reminder for Tuesday.",
        spokenMessage: "Since your pension credit is still pending, shall I draft a formal grievance letter to the Branch Manager and set a reminder for Tuesday?",
        confirmLabel: "Yes, Draft Letter & Remind Me",
        onConfirm: async () => {
          const res = await fetch("/api/bank/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action_type: "pension_inquiry",
              amount: "₹28,000",
              resolved: false,
              unresolved_reason: "Pension credit delayed beyond due date. Branch officer requested central backend verification.",
              bank_name: "State Bank of India",
              branch: "Malleshwaram 8th Cross",
              account_masked: "SBI •••• 4821"
            })
          });
          const result = await res.json();
          this.visitResult = result;
          this.goToStep(3);
          voiceEngine.speak(result.spoken_summary);
          if (window.refreshDashboard) window.refreshDashboard();
        }
      });
    }
  }

  render() {
    const container = document.getElementById("bank-journey-container");
    if (!container) return;

    let html = `
      <div class="stepper-header">
        <div class="step-indicator ${this.currentStep === 1 ? 'active' : ''}">
          <span class="step-num">1</span>
          <span>${t("step_prepare")}</span>
        </div>
        <div class="step-indicator ${this.currentStep === 2 ? 'active' : ''}">
          <span class="step-num">2</span>
          <span>${t("step_assist")}</span>
        </div>
        <div class="step-indicator ${this.currentStep === 3 ? 'active' : ''}">
          <span class="step-num">3</span>
          <span>${t("step_followup")}</span>
        </div>
      </div>
    `;

    if (this.currentStep === 1) {
      html += this.renderPhase1Prepare();
    } else if (this.currentStep === 2) {
      html += this.renderPhase2Assist();
    } else if (this.currentStep === 3) {
      html += this.renderPhase3Followup();
    }

    container.innerHTML = html;
  }

  renderPhase1Prepare() {
    const passbook = this.passbookData;
    const plan = this.visitPlan;

    return `
      <div class="senior-card">
        <h3><span>🏦</span> ${t("bank_title")}</h3>
        <p style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 20px;">
          Phase 1: Prepare everything beforehand so your bank visit is completely stress-free.
        </p>

        <!-- Document Camera / Scan Section -->
        <div style="background: var(--bg-card-hover); border: 2px dashed var(--border-card); border-radius: var(--radius-card); padding: 24px; text-align: center; margin-bottom: 24px;">
          <h4 style="font-size: 1.3rem; margin-bottom: 8px;">${t("passbook_upload_prompt")}</h4>
          <p style="font-size: 1.05rem; color: var(--text-muted); margin-bottom: 16px;">
            AI will identify your branch, verify document safety, and prepare your checklist.
          </p>

          ${passbook ? `
            <div style="margin: 16px 0;">
              <img src="${esc(safeImgSrc(passbook.svg_preview))}" alt="Verified SBI Passbook" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: var(--shadow-card);" />
              <div class="verified-safe-box" style="margin-top: 14px;">
                <span>✅</span>
                <div>
                  <strong>${esc(passbook.bank_name)} - ${esc(passbook.branch_name)}</strong>
                  <div style="font-size: 1.05rem; color: #15803D;">Account: ${esc(passbook.account_number_masked)} (Holder: ${esc(passbook.customer_name)})</div>
                </div>
              </div>
            </div>
          ` : `
            <div class="btn-grid-row">
              <button class="btn-primary" onclick="bankJourney.loadSamplePassbook()">
                <span>📷</span> ${t("btn_use_sample_passbook")}
              </button>
            </div>
          `}
        </div>

        ${passbook ? `
          <!-- Purpose Selection -->
          <div style="margin-bottom: 24px;">
            <h4 style="font-size: 1.35rem; margin-bottom: 14px;">${t("bank_purpose_prompt")}</h4>
            <div class="btn-grid-row">
              <button class="btn-secondary ${this.selectedPurpose === 'pension_check' ? 'btn-primary' : ''}" onclick="bankJourney.selectPurpose('pension_check')">
                ${t("btn_purpose_pension")}
              </button>
              <button class="btn-secondary ${this.selectedPurpose === 'withdraw_cash' ? 'btn-primary' : ''}" onclick="bankJourney.selectPurpose('withdraw_cash')">
                ${t("btn_purpose_withdraw")}
              </button>
              <button class="btn-secondary ${this.selectedPurpose === 'kyc_update' ? 'btn-primary' : ''}" onclick="bankJourney.selectPurpose('kyc_update')">
                ${t("btn_purpose_kyc")}
              </button>
            </div>
          </div>

          ${plan ? `
            <!-- Generated Checklist -->
            <div style="margin-bottom: 24px;">
              <h4 style="font-size: 1.35rem; color: var(--text-primary);">${t("checklist_title")}</h4>
              <ul class="plain-checklist">
                ${plan.checklist.map(item => `
                  <li><span class="icon-check">✔</span> ${esc(item)}</li>
                `).join('')}
              </ul>
            </div>

            <!-- Pre-filled Form Slip -->
            <div style="background: #F0FDF4; border: 2px solid #86EFAC; border-radius: var(--radius-card); padding: 22px; margin-bottom: 24px;">
              <h4 style="font-size: 1.25rem; color: #166534; margin-bottom: 10px;">
                <span>📝</span> Pre-filled: ${esc(plan.prefilled_form.title)}
              </h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 1.1rem;">
                ${Object.entries(plan.prefilled_form.fields).map(([k, v]) => `
                  <div><strong style="color: #374151;">${esc(k)}:</strong> <span style="color: #111827;">${esc(v)}</span></div>
                `).join('')}
              </div>
            </div>

            <!-- Route & Transport -->
            <div style="margin-bottom: 24px;">
              <h4 style="font-size: 1.35rem; margin-bottom: 12px;">${t("route_title")}</h4>
              <div style="background: var(--bg-card-hover); padding: 18px; border-radius: var(--radius-btn); margin-bottom: 16px; border: 2px solid var(--border-card);">
                <p style="font-size: 1.15rem; font-weight: 600; color: var(--text-secondary);">
                  📍 <strong>Landmark Directions:</strong> ${esc(plan.route_info.landmark_directions)}
                </p>
              </div>

              ${this.cabBooked ? `
                <div class="senior-card" style="border-color: #3B82F6; background: #EFF6FF;">
                  <h4 style="color: #1D4ED8; font-size: 1.3rem;">🚗 Cab Confirmed & En Route!</h4>
                  <div class="giant-number-badge">
                    <div class="label">Share this OTP with Driver</div>
                    <div class="number">${esc(this.cabDetails.otp)}</div>
                  </div>
                  <p style="font-size: 1.15rem; color: #1E40AF; margin-bottom: 10px;">
                    <strong>Driver:</strong> ${esc(this.cabDetails.driver.name)} (${esc(this.cabDetails.driver.rating)})<br>
                    <strong>Car:</strong> ${esc(this.cabDetails.driver.vehicle)} (${esc(this.cabDetails.driver.plate)})
                  </p>
                  <p style="font-size: 1.05rem; color: #15803D; font-weight: 700;">
                    ✔ ${esc(this.cabDetails.family_message)}
                  </p>
                </div>
              ` : `
                <div class="btn-grid-row">
                  <button class="btn-primary" onclick="bankJourney.confirmAndBookCab()">
                    <span>🚗</span> ${t("btn_book_cab")}
                  </button>
                </div>
              `}
            </div>

            <!-- Arrival Action Button -->
            <div style="margin-top: 32px; border-top: 2px solid var(--border-card); padding-top: 24px;">
              <button class="btn-primary" style="background: #0D9488; font-size: 1.3rem;" onclick="bankJourney.checkinAtKiosk()">
                <span>🏢</span> I Have Arrived at SBI Branch (Start Assistance)
              </button>
            </div>
          ` : ''}
        ` : ''}
      </div>
    `;
  }

  selectPurpose(purpose) {
    this.selectedPurpose = purpose;
    this.fetchPreparePlan();
  }

  renderPhase2Assist() {
    const kiosk = this.kioskInfo || {
      token_number: "C-42",
      current_token_serving: "C-38",
      people_ahead: 4,
      estimated_wait_minutes: 10,
      assigned_counter: "Counter 3 (Senior Citizen Priority Counter)",
      plain_guidance: "Please relax on the cushioned green chairs right in front of Counter 3. You have 4 people ahead of you, so you will be called in about 10 minutes."
    };

    return `
      <div class="senior-card" style="border-color: #0D9488;">
        <h3><span>🏢</span> ${t("kiosk_arrival_title")}</h3>
        <p style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 18px;">
          Phase 2: In-branch guidance. Follow these simple steps without needing to stand in long queues.
        </p>

        <!-- Giant Priority Token Display -->
        <div class="giant-number-badge" style="border-color: #0D9488; background: #F0FDFA;">
          <div class="label">${t("token_label")}</div>
          <div class="number" style="color: #0F766E;">${esc(kiosk.token_number)}</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #115E59; margin-top: 8px;">
            Now Calling: <strong>${esc(kiosk.current_token_serving)}</strong> &bull; People Ahead: <strong>${esc(kiosk.people_ahead)}</strong>
          </div>
          <div style="font-size: 1.15rem; font-weight: 600; color: #047857; margin-top: 6px;">
            ⏱️ ${t("queue_wait_label")}: ~${kiosk.estimated_wait_minutes} Minutes
          </div>
        </div>

        <!-- Plain Guidance Box -->
        <div style="background: var(--bg-card-hover); border: 2px solid var(--border-card); border-radius: var(--radius-card); padding: 22px; margin-bottom: 24px;">
          <h4 style="font-size: 1.3rem; margin-bottom: 8px; color: var(--text-primary);">
            <span>🪑</span> Where to Sit & Wait
          </h4>
          <p style="font-size: 1.2rem; line-height: 1.6; color: var(--text-secondary);">
            ${esc(kiosk.plain_guidance)}
          </p>
        </div>

        <!-- Counter 3 Step Guide -->
        <div style="background: #FFFFFF; border: 2px solid #CBD5E1; border-radius: var(--radius-card); padding: 22px; margin-bottom: 28px;">
          <h4 style="font-size: 1.35rem; color: #1E3A8A; margin-bottom: 14px;">
            <span>📋</span> ${t("counter_guide_title")} (${kiosk.assigned_counter})
          </h4>
          <ul class="plain-checklist">
            <li><span>1️⃣</span> Greet Mr. Satish Narayanan at Counter 3. Show your Token ${esc(kiosk.token_number)}.</li>
            <li><span>2️⃣</span> Hand over your Original Passbook and the pre-filled withdrawal slip.</li>
            <li><span>3️⃣</span> The officer will ask you to sign on the back of the slip. Sign twice using your comfortable pen.</li>
            <li><span>4️⃣</span> Collect your ₹10,000 cash, passbook with stamped entry, and counter receipt.</li>
          </ul>
        </div>

        <!-- Transaction Completed Confirmation Trigger -->
        <div style="background: #F8FAFC; border-top: 2px solid var(--border-card); padding-top: 24px; text-align: center;">
          <h4 style="font-size: 1.35rem; margin-bottom: 16px;">${t("followup_resolved_question")}</h4>
          <div class="btn-grid-row">
            <button class="btn-primary" onclick="bankJourney.completeVisit(true)">
              ${t("btn_resolved_yes")}
            </button>
            <button class="btn-secondary" style="border-color: #D97706; color: #B45309;" onclick="bankJourney.completeVisit(false)">
              ${t("btn_resolved_no")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderPhase3Followup() {
    const result = this.visitResult || {};
    const isResolved = result.resolved;

    return `
      <div class="senior-card">
        <h3><span>📝</span> ${t("followup_title")}</h3>
        
        ${isResolved ? `
          <div class="verified-safe-box" style="margin-bottom: 24px;">
            <span style="font-size: 2.2rem;">🎉</span>
            <div>
              <h4 style="font-size: 1.35rem; color: #15803D;">Visit Completed & Recorded Safely!</h4>
              <p style="font-size: 1.15rem; color: #166534; margin-top: 4px;">
                ${esc(result.activity ? result.activity.plain_text : "Your cash withdrawal of ₹10,000 has been logged to your Bank Activity Tracker.")}
              </p>
            </div>
          </div>
        ` : `
          <!-- Unresolved pension grievance letter -->
          <div class="scam-alert-box" style="background: #FFFBEB; border-color: #F59E0B; color: #B45309; margin-bottom: 24px;">
            <h4><span>⚠️</span> Action Taken for Pending Pension Credit</h4>
            <p style="font-size: 1.15rem; font-weight: 600; color: #92400E; margin-bottom: 12px;">
              Don't worry. Sahay has drafted a formal grievance letter to the SBI Branch Manager and scheduled a follow-up reminder for Tuesday morning at 11:00 AM.
            </p>
          </div>

          <div style="background: #FFFFFF; border: 2px solid #CBD5E1; border-radius: var(--radius-card); padding: 24px; margin-bottom: 24px; box-shadow: var(--shadow-card);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <h4 style="font-size: 1.25rem; color: #1E3A8A;">📄 Generated Follow-Up Letter to Branch Manager</h4>
              <button class="btn-secondary" style="width: auto; min-height: 44px; padding: 6px 14px; font-size: 0.95rem;" onclick="window.print()">
                🖨️ Print / Download
              </button>
            </div>
            <pre style="font-family: inherit; font-size: 1.05rem; white-space: pre-wrap; line-height: 1.6; background: #F8FAFC; padding: 18px; border-radius: 12px; border: 1px solid #E2E8F0; color: #1F2937;">
${esc(result.drafted_letter || "Follow-up letter drafted to Branch Manager.")}
            </pre>
          </div>
        `}

        <div class="btn-grid-row">
          <button class="btn-primary" onclick="showTab('dashboard')">
            <span>🏠</span> Back to Things I'm Tracking
          </button>
          <button class="btn-secondary" onclick="bankJourney.goToStep(1)">
            <span>🔄</span> Start Another Visit Plan
          </button>
        </div>
      </div>
    `;
  }
}

const bankJourney = new BankJourney();
