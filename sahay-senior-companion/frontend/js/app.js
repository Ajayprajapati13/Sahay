// Sahay App Orchestrator & Dashboard Engine

let currentTab = "dashboard";
let textSizeIndex = 0; // 0: standard (20px), 1: large (24px), 2: xl (28px)
const textClasses = ["", "text-size-large", "text-size-xl"];

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

async function initApp() {
  // Voice engine speech handler
  voiceEngine.onSpeechResult = async (spokenText) => {
    handleSpokenCommand(spokenText);
  };

  // Setup tab buttons
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      showTab(tab);
    });
  });

  // Setup mic button
  const micBtn = document.getElementById("giant-mic-btn");
  if (micBtn) {
    micBtn.addEventListener("click", () => {
      voiceEngine.toggleListening();
    });
  }

  // Language setup
  const lang = localStorage.getItem("sahay_lang") || "en";
  setLanguage(lang);

  // Load sub-modules
  bankJourney.init();
  await transportJourney.init();
  await healthJourney.init();
  await familyPortal.init();

  // Load dashboard
  await refreshDashboard();
}

function showTab(tabId) {
  currentTab = tabId;

  // Update tab buttons
  document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
    } else {
      btn.classList.remove("active");
      btn.setAttribute("aria-selected", "false");
    }
  });

  // Update panels
  document.querySelectorAll(".section-panel").forEach(panel => {
    if (panel.id === `panel-${tabId}`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleSpokenCommand(text) {
  voiceEngine.playChime("start");
  try {
    const res = await fetch("/api/ai/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: currentLang })
    });
    const data = await res.json();
    const intent = data.intent;

    voiceEngine.speak(intent.spoken_response);

    // Route to appropriate screen based on intent category
    if (intent.category === "bank_visit") {
      showTab("bank");
      if (!bankJourney.passbookData) {
        bankJourney.loadSamplePassbook();
      }
    } else if (intent.category === "transport") {
      showTab("transport");
      const dest = intent.parameters?.destination || "Ganesh Temple, Malleshwaram";
      transportJourney.bookRideTo(dest);
    } else if (intent.category === "errands") {
      showTab("transport");
      transportJourney.reorderMonthly("pharmacy");
    } else if (intent.category === "health") {
      showTab("health");
      if (!healthJourney.prescriptionData) {
        healthJourney.loadSamplePrescription();
      }
    } else if (intent.category === "scam_check") {
      showTab("scam");
      testScamSample("electricity");
    } else {
      showTab("dashboard");
    }
  } catch (e) {
    console.warn("Intent recognition error:", e);
  }
}

async function refreshDashboard() {
  try {
    const greetingRes = await fetch(`/api/ai/daily-greeting?language=${currentLang}`);
    const greetingData = await greetingRes.json();

    const titleEl = document.getElementById("greeting-title");
    const subEl = document.getElementById("greeting-sub");
    if (titleEl) titleEl.textContent = greetingData.headline;
    if (subEl) subEl.textContent = greetingData.summary?.pending_reminders?.length 
      ? `You have ${greetingData.summary.pending_reminders.length} items to look at today.`
      : t("greeting_sub");

    window.dailyGreetingText = greetingData.spoken_greeting;

    // Render Unified "Things I'm Tracking For You" Dashboard
    renderUnifiedTracking(greetingData.summary);
  } catch (e) {
    console.warn("Dashboard refresh error:", e);
  }
}
window.refreshDashboard = refreshDashboard;

function speakDailyGreeting() {
  if (window.dailyGreetingText) {
    voiceEngine.speak(window.dailyGreetingText);
  }
}

function renderUnifiedTracking(summary) {
  const container = document.getElementById("dashboard-tracking-list");
  if (!container || !summary) return;

  const reminders = summary.pending_reminders || [];
  const bank = summary.recent_bank_activity;
  const trip = summary.recent_trip;
  const health = summary.recent_health_visit;

  let html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 24px;">
      <!-- Bank Visit Card -->
      <div class="senior-card" style="margin-bottom: 0; border-left: 6px solid var(--brand-primary);">
        <h4 style="font-size: 1.25rem; color: var(--brand-primary); margin-bottom: 8px;">
          <span>🏦</span> Bank Activity Tracker
        </h4>
        ${bank ? `
          <p style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 10px;">
            ${bank.plain_text}
          </p>
          <div style="font-size: 0.95rem; color: var(--text-muted);">Status: <strong>${bank.status.replace('_', ' ').toUpperCase()}</strong></div>
        ` : `
          <p style="font-size: 1.05rem; color: var(--text-muted);">No bank visits logged yet.</p>
        `}
        <button class="btn-secondary" style="margin-top: 14px; min-height: 48px; font-size: 1rem;" onclick="showTab('bank')">
          Go to Bank Assistant &rarr;
        </button>
      </div>

      <!-- Health Card -->
      <div class="senior-card" style="margin-bottom: 0; border-left: 6px solid #0D9488;">
        <h4 style="font-size: 1.25rem; color: #0D9488; margin-bottom: 8px;">
          <span>💊</span> Health & Medications
        </h4>
        ${reminders.length > 0 ? `
          <div style="font-size: 1.15rem; font-weight: 700; color: #065F46; margin-bottom: 6px;">
            ${reminders[0].title}
          </div>
          <p style="font-size: 1.05rem; color: var(--text-secondary); margin-bottom: 10px;">
            ${reminders[0].detail}
          </p>
          <div style="font-size: 0.95rem; color: #0D9488;">⏱️ ${reminders[0].due_time}</div>
        ` : `
          <p style="font-size: 1.05rem; color: var(--text-muted);">All medicines taken for today!</p>
        `}
        <button class="btn-secondary" style="margin-top: 14px; min-height: 48px; font-size: 1rem;" onclick="showTab('health')">
          Go to Health Companion &rarr;
        </button>
      </div>

      <!-- Transportation & Errands Card -->
      <div class="senior-card" style="margin-bottom: 0; border-left: 6px solid #3B82F6;">
        <h4 style="font-size: 1.25rem; color: #1D4ED8; margin-bottom: 8px;">
          <span>🚗</span> Transportation & Errands
        </h4>
        ${trip ? `
          <p style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 10px;">
            Last Trip: <strong>${trip.destination}</strong> with driver ${trip.driver_name}. Status: <strong>${trip.status}</strong>
          </p>
        ` : `
          <p style="font-size: 1.05rem; color: var(--text-muted);">Quick booking to frequent places ready.</p>
        `}
        <button class="btn-secondary" style="margin-top: 14px; min-height: 48px; font-size: 1rem;" onclick="showTab('transport')">
          View Rides & Places &rarr;
        </button>
      </div>

      <!-- Scam & Trust Sentinel Card -->
      <div class="senior-card" style="margin-bottom: 0; border-left: 6px solid #15803D;">
        <h4 style="font-size: 1.25rem; color: #15803D; margin-bottom: 8px;">
          <span>🛡️</span> Scam Sentinel Guardian
        </h4>
        <div class="verified-safe-box" style="margin: 8px 0; padding: 12px 16px;">
          <span>✅</span>
          <div style="font-size: 1.05rem;">
            <strong>Protected & Monitoring</strong>
            <div style="font-size: 0.95rem; color: #15803D;">0 active threats detected today.</div>
          </div>
        </div>
        <button class="btn-secondary" style="margin-top: 14px; min-height: 48px; font-size: 1rem;" onclick="showTab('scam')">
          Open Safety Checker &rarr;
        </button>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// Quick Test Chips for Scams
async function testScamSample(type) {
  if (type === "electricity") {
    const scam = sampleData.scamMessages.electricity;
    document.getElementById("scam-input-text").value = scam.text;
    await scamGuard.inspectContent({ text: scam.text, source: "sample_electricity", silentIfSafe: false });
  } else if (type === "pension") {
    const scam = sampleData.scamMessages.pensionApk;
    document.getElementById("scam-input-text").value = scam.text;
    await scamGuard.inspectContent({ text: scam.text, source: "sample_pension", silentIfSafe: false });
  } else if (type === "safe") {
    const safeText = "State Bank of India: Your account has been credited with ₹10,000 on 19-Sep. Available balance is ₹34,520.";
    document.getElementById("scam-input-text").value = safeText;
    await scamGuard.inspectContent({ text: safeText, source: "sample_safe", silentIfSafe: false });
  }
}

// Manual Scam Text Inspection Trigger
async function triggerManualScamCheck() {
  const text = document.getElementById("scam-input-text").value;
  if (!text.trim()) {
    alert("Please paste a message or select a sample above.");
    return;
  }
  await scamGuard.inspectContent({ text, source: "manual_check", silentIfSafe: false });
}

// Accessibility Toggles
function toggleHighContrast() {
  document.body.classList.toggle("high-contrast");
  voiceEngine.playChime("start");
  const isHc = document.body.classList.contains("high-contrast");
  localStorage.setItem("sahay_contrast", isHc ? "high" : "normal");
}

function cycleTextSize() {
  document.body.classList.remove("text-size-large", "text-size-xl");
  textSizeIndex = (textSizeIndex + 1) % 3;
  if (textClasses[textSizeIndex]) {
    document.body.classList.add(textClasses[textSizeIndex]);
  }
  voiceEngine.playChime("start");
}

function toggleLanguage() {
  const newLang = currentLang === "en" ? "hi" : "en";
  setLanguage(newLang);
  voiceEngine.playChime("start");
  refreshDashboard();
  bankJourney.render();
  transportJourney.render();
  healthJourney.render();
  familyPortal.render();
}

function updateUITranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  const langBtn = document.getElementById("lang-toggle-btn");
  if (langBtn) {
    langBtn.textContent = currentLang === "en" ? "हिन्दी (HI)" : "English (EN)";
  }
}
