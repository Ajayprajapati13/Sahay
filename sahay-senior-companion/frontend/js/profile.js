// "About me": the person's name, plus optional sign-in with a mobile number and an SMS code (OTP).
// The name is kept on this device. Signing in proves the phone number; the server keeps neither.

const profile = {
  NAME_KEY: "sahay_name",
  PHONE_KEY: "sahay_phone",
  TOKEN_KEY: "sahay_session",

  name: "",
  phoneMasked: "",
  token: "",

  smsLogin: null, // null = not asked yet, then true or false (whether the server can send codes)
  step: "form", // "form" (name + mobile number) or "code" (enter the SMS code)
  phone: "",
  draftName: null,
  message: "",
  error: "",
  busy: false,
  overlay: null,

  // ---- storage (this device only)

  load() {
    this.name = this._read(this.NAME_KEY);
    this.phoneMasked = this._read(this.PHONE_KEY);
    this.token = this._read(this.TOKEN_KEY);
    this.updateHeader();
    if (this.token) this.checkSession();
  },

  _read(key) {
    try {
      return localStorage.getItem(key) || "";
    } catch (e) {
      return "";
    }
  },

  _write(key, value) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (e) {
      /* private mode: the name simply is not remembered */
    }
  },

  get signedIn() {
    return !!this.token;
  },

  // An expired or forged session is dropped quietly; being offline keeps it.
  async checkSession() {
    try {
      const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${this.token}` } });
      if (res.status === 401) this.signOut(false);
    } catch (e) {
      /* offline */
    }
  },

  updateHeader() {
    const button = document.getElementById("profile-btn");
    if (button) button.innerHTML = `<span>👤</span> ${this.name ? esc(this.name) : t("btn_sign_in")}`;
  },

  // ---- dialog

  async open() {
    if (this.overlay) return;
    this.step = "form";
    this.message = "";
    this.error = "";
    this.draftName = null;

    const overlay = document.createElement("div");
    overlay.className = "confirmation-modal-backdrop";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "profile-title");
    this._onKey = (event) => {
      if (event.key === "Escape") this.close();
    };
    document.addEventListener("keydown", this._onKey);
    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.render();

    if (this.smsLogin === null) {
      try {
        this.smsLogin = !!(await (await fetch("/api/auth/status")).json()).sms_login;
      } catch (e) {
        this.smsLogin = false;
      }
      this.render();
    }
  },

  close() {
    if (!this.overlay) return;
    this.overlay.remove();
    this.overlay = null;
    document.removeEventListener("keydown", this._onKey);
  },

  _val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  },

  _field(id, label, value, attrs = "") {
    return `
      <label for="${id}" style="display: block; font-size: 1.1rem; font-weight: 700; margin-top: 14px;">${label}</label>
      <input id="${id}" value="${esc(value)}" ${attrs}
             style="display: block; width: 100%; min-height: 52px; font-size: 1.2rem; padding: 8px 12px; margin-top: 6px; border: 2px solid var(--border-card); border-radius: 12px;" />`;
  },

  render() {
    if (!this.overlay) return;
    const disabled = this.busy ? "disabled" : "";
    const nameValue = this.draftName !== null ? this.draftName : this.name;
    const note = (text, role, color) =>
      text ? `<p role="${role}" style="font-size: 1.1rem; font-weight: 700; color: ${color}; margin: 12px 0 0;">${esc(text)}</p>` : "";

    this.overlay.innerHTML = `
      <div class="confirmation-card" style="text-align: left; max-height: 90vh; overflow-y: auto;">
        <h3 id="profile-title">👤 ${t("profile_title")}</h3>
        ${this._field("pf-name", t("profile_name_label"), nameValue, 'type="text" autocomplete="name" maxlength="60"')}
        <button class="btn-primary" style="margin-top: 12px;" onclick="profile.saveName()" ${disabled}>${t("profile_save_name")}</button>
        ${note(this.message, "status", "#15803D")}
        <hr style="margin: 22px 0; border: 0; border-top: 2px solid var(--border-card);" />
        ${this.renderSignIn(disabled)}
        ${note(this.error, "alert", "#B91C1C")}
        <button class="btn-secondary" style="margin-top: 18px;" onclick="profile.close()">${t("btn_close")}</button>
      </div>`;

    const focusId = this.step === "code" && !this.signedIn ? "pf-code" : null;
    if (focusId && document.getElementById(focusId)) document.getElementById(focusId).focus();
  },

  renderSignIn(disabled) {
    if (this.signedIn) {
      return `
        <p style="font-size: 1.15rem; font-weight: 700;">✅ ${t("login_signed_in")} ${esc(this.phoneMasked)}</p>
        <button class="btn-secondary" style="margin-top: 10px;" onclick="profile.signOut()">${t("login_sign_out")}</button>`;
    }
    const heading = `<h4 style="font-size: 1.25rem; margin-bottom: 6px;">${t("login_title")}</h4>`;
    if (this.smsLogin === null) return `${heading}<p role="status">…</p>`;
    if (!this.smsLogin) {
      return `${heading}<p style="font-size: 1.1rem; color: var(--text-muted);">${t("login_not_enabled")}</p>`;
    }
    if (this.step === "code") {
      return `
        ${heading}
        <p style="font-size: 1.1rem;">${t("login_sent_to")} <strong>${esc(this.phone)}</strong></p>
        ${this._field("pf-code", t("login_code_label"), "", 'type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8"')}
        <button class="btn-primary" style="margin-top: 12px;" onclick="profile.verify()" ${disabled}>${t("login_verify")}</button>
        <button class="btn-secondary" style="margin-top: 10px;" onclick="profile.changeNumber()" ${disabled}>${t("login_change_number")}</button>`;
    }
    return `
      ${heading}
      <p style="font-size: 1.05rem; color: var(--text-muted);">${t("login_intro")}</p>
      ${this._field("pf-phone", t("login_phone_label"), this.phone, 'type="tel" inputmode="tel" autocomplete="tel" maxlength="20"')}
      <button class="btn-primary" style="margin-top: 12px;" onclick="profile.startSignIn()" ${disabled}>${t("login_send_code")}</button>`;
  },

  // ---- actions

  saveName() {
    this.name = this._val("pf-name").replace(/[<>]/g, "").slice(0, 60);
    this._write(this.NAME_KEY, this.name);
    this.draftName = null;
    this.error = "";
    this.message = this.name ? t("profile_saved") : t("profile_cleared");
    this.updateHeader();
    this.render();
    if (window.refreshDashboard) window.refreshDashboard();
  },

  async startSignIn() {
    this.draftName = this._val("pf-name");
    const phone = this._val("pf-phone");
    this.phone = phone;
    if (!phone) {
      this.error = t("login_need_phone");
      this.render();
      return;
    }
    this.busy = true;
    this.error = "";
    this.message = "";
    this.render();
    const result = await this._post("/api/auth/start", { phone });
    this.busy = false;
    if (result.ok) {
      this.phone = result.data.phone_masked || phone;
      this._fullPhone = phone;
      this.step = "code";
    } else {
      this.error = result.error;
    }
    this.render();
  },

  async verify() {
    const code = this._val("pf-code").replace(/\s/g, "");
    if (!code) {
      this.error = t("login_need_code");
      this.render();
      return;
    }
    this.busy = true;
    this.error = "";
    this.render();
    const result = await this._post("/api/auth/verify", { phone: this._fullPhone, code, name: this.draftName !== null ? this.draftName : this.name });
    this.busy = false;
    if (!result.ok) {
      this.error = result.error;
      this.render();
      return;
    }
    const data = result.data;
    this.token = data.token;
    this.phoneMasked = data.profile.phone_masked;
    this.name = data.profile.name || this.name;
    this._write(this.TOKEN_KEY, this.token);
    this._write(this.PHONE_KEY, this.phoneMasked);
    this._write(this.NAME_KEY, this.name);
    this.step = "form";
    this.draftName = null;
    this.message = t("login_success");
    this.updateHeader();
    this.render();
    if (window.refreshDashboard) window.refreshDashboard();
  },

  changeNumber() {
    this.step = "form";
    this.error = "";
    this.render();
  },

  signOut(rerender = true) {
    this.token = "";
    this.phoneMasked = "";
    this._write(this.TOKEN_KEY, "");
    this._write(this.PHONE_KEY, "");
    if (rerender && this.overlay) {
      this.step = "form";
      this.error = "";
      this.message = t("login_signed_out");
      this.render();
    }
  },

  async _post(url, body) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return { ok: true, data };
      return { ok: false, error: typeof data.detail === "string" ? data.detail : t("login_check_details") };
    } catch (e) {
      return { ok: false, error: t("login_offline") };
    }
  }
};
