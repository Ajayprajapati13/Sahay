// Sahay Senior-First Voice & Audio Engine (STT, Warm TTS, Audio Chimes & Irreversible Confirmations)

class VoiceEngine {
  constructor() {
    this.recognition = null;
    this.synth = window.speechSynthesis;
    this.isListening = false;
    this.isSpeaking = false;
    this.voiceEnabled = true;
    this.audioCtx = null;
    
    this._initSpeechRecognition();
  }

  _getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.audioCtx = new AudioContext();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Pleasant gentle senior chimes using Web Audio API synthesis
  playChime(type = "chime") {
    try {
      const ctx = this._getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "start") {
        // Soft ascending chime: E5 to A5
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.18);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === "success") {
        // Gentle major chord chime
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.46);
      } else if (type === "warn") {
        // Gentle alert chime
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(370, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
      }
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  _initSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = currentLang === "hi" ? "hi-IN" : "en-IN";

      this.recognition.onstart = () => {
        this.isListening = true;
        this.playChime("start");
        this._updateMicUI(true);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        this._updateMicUI(false);
        if (this.onSpeechResult) {
          this.onSpeechResult(transcript);
        }
      };

      this.recognition.onerror = (e) => {
        console.warn("Speech recognition error/timeout:", e);
        this.isListening = false;
        this._updateMicUI(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this._updateMicUI(false);
      };
    }
  }

  toggleListening() {
    if (!this.recognition) {
      alert("Microphone recognition is not directly supported in this browser. You can use the quick speech buttons or text input.");
      return;
    }

    if (this.isListening) {
      this.recognition.stop();
    } else {
      if (this.synth.speaking) {
        this.synth.cancel();
      }
      this.recognition.lang = currentLang === "hi" ? "hi-IN" : "en-IN";
      try {
        this.recognition.start();
      } catch (e) {
        console.warn("Recognition start failed:", e);
      }
    }
  }

  _updateMicUI(listening) {
    const micBtn = document.getElementById("giant-mic-btn");
    const voiceStatus = document.getElementById("voice-prompt-text");
    if (micBtn) {
      if (listening) {
        micBtn.classList.add("listening");
        micBtn.setAttribute("aria-label", "Microphone listening. Speak now.");
        if (voiceStatus) voiceStatus.textContent = t("voice_listening");
      } else {
        micBtn.classList.remove("listening");
        micBtn.setAttribute("aria-label", "Tap to speak to Sahay");
        if (voiceStatus) voiceStatus.textContent = t("voice_tap_prompt");
      }
    }
  }

  // Text-To-Speech (TTS) reading with comforting, measured pacing
  speak(text, onComplete) {
    if (!this.voiceEnabled || !this.synth || !text) {
      if (onComplete) onComplete();
      return;
    }

    this.synth.cancel(); // Stop any pending speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88; // Gentle, measured tempo for senior comprehension
    utterance.pitch = 1.0;
    utterance.lang = currentLang === "hi" ? "hi-IN" : "en-IN";

    // Attempt to pick a natural soothing voice
    const voices = this.synth.getVoices();
    const langPrefix = currentLang === "hi" ? "hi" : "en";
    const matchedVoice = voices.find(v => v.lang.startsWith(langPrefix) && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("India")));
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      if (onComplete) onComplete();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      if (onComplete) onComplete();
    };

    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }

  // Non-negotiable: Confirmation modal with voice readback before irreversible actions
  confirmAction({ title, message, spokenMessage, confirmLabel, changeLabel, onConfirm, onCancel }) {
    this.playChime("start");
    
    // Create modal backdrop
    const modal = document.createElement("div");
    modal.className = "confirmation-modal-backdrop";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "confirm-modal-title");

    modal.innerHTML = `
      <div class="confirmation-card anim-pulse">
        <div class="readback-badge">
          <span>🔊</span> Readback Confirmation
        </div>
        <h3 id="confirm-modal-title">${esc(title)}</h3>
        <div class="readback-message">${message}</div>
        <div class="btn-grid-row">
          <button id="modal-confirm-btn" class="btn-primary">
            <span>✅</span> ${confirmLabel ? esc(confirmLabel) : t("btn_confirm")}
          </button>
          <button id="modal-cancel-btn" class="btn-secondary">
            <span>↩️</span> ${changeLabel ? esc(changeLabel) : t("btn_change")}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Speak aloud the readback confirmation
    this.speak(spokenMessage || message);

    const confirmBtn = modal.querySelector("#modal-confirm-btn");
    const cancelBtn = modal.querySelector("#modal-cancel-btn");

    confirmBtn.focus();

    const cleanup = () => {
      this.stopSpeaking();
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    confirmBtn.onclick = () => {
      cleanup();
      this.playChime("success");
      if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
      cleanup();
      if (onCancel) onCancel();
    };
  }
}

const voiceEngine = new VoiceEngine();
