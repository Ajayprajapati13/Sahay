// Opt-In Revocable Family Visibility Portal & Live Feed

class FamilyPortal {
  constructor() {
    this.permissions = {
      share_trips: true,
      share_health: true,
      share_bank: false
    };
    this.familyFeed = [];
  }

  async init() {
    await this.fetchPermissions();
    await this.fetchFamilyView();
    this.render();
  }

  async fetchPermissions() {
    try {
      const res = await fetch("/api/family/permissions");
      const data = await res.json();
      if (data.status === "success") {
        this.permissions = data.permissions;
      }
    } catch (e) {
      console.warn("Failed to fetch family permissions:", e);
    }
  }

  async fetchFamilyView() {
    try {
      const res = await fetch("/api/family/view");
      const data = await res.json();
      if (data.status === "success") {
        this.familyFeed = data.portal.feed;
      }
    } catch (e) {
      console.warn("Failed to fetch family view:", e);
    }
  }

  async updatePermission(key, value) {
    voiceEngine.playChime("start");
    this.permissions[key] = value;
    try {
      const res = await fetch("/api/family/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_trips: this.permissions.share_trips,
          share_health: this.permissions.share_health,
          share_bank: this.permissions.share_bank
        })
      });
      const data = await res.json();
      await this.fetchFamilyView();
      this.render();
      voiceEngine.speak(data.spoken_response);
    } catch (e) {
      console.warn("Failed to update permissions:", e);
    }
  }

  render() {
    const container = document.getElementById("family-portal-container");
    if (!container) return;

    let html = `
      <div class="senior-card">
        <h3><span>👨‍👩‍👧</span> Family Visibility & Peace of Mind</h3>
        <p style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 20px;">
          You stay independent. Your family only sees what you explicitly choose to share. You can turn any category on or off instantly.
        </p>

        <!-- Permissions Control Center -->
        <div style="background: var(--bg-card-hover); border: 2px solid var(--border-card); border-radius: var(--radius-card); padding: 24px; margin-bottom: 28px;">
          <h4 style="font-size: 1.35rem; color: var(--text-primary); margin-bottom: 16px;">
            🛡️ What Daughter Ananya Can See:
          </h4>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Cab Trips Toggle -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; padding: 18px 20px; border-radius: var(--radius-btn); border: 2px solid var(--border-card);">
              <div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">🚗 Cab & Transit Safety</div>
                <div style="font-size: 1rem; color: var(--text-muted); margin-top: 4px;">Shares driver name, vehicle number, and safe arrival notices.</div>
              </div>
              <div>
                <button class="btn-toggle-switch ${this.permissions.share_trips ? 'active' : ''}" onclick="familyPortal.updatePermission('share_trips', ${!this.permissions.share_trips})">
                  ${this.permissions.share_trips ? '✔ SHARED' : 'OFF'}
                </button>
              </div>
            </div>

            <!-- Health Visits Toggle -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; padding: 18px 20px; border-radius: var(--radius-btn); border: 2px solid var(--border-card);">
              <div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">💊 Health & Doctor Visits</div>
                <div style="font-size: 1rem; color: var(--text-muted); margin-top: 4px;">Shares doctor appointment times and simple medication advice.</div>
              </div>
              <div>
                <button class="btn-toggle-switch ${this.permissions.share_health ? 'active' : ''}" onclick="familyPortal.updatePermission('share_health', ${!this.permissions.share_health})">
                  ${this.permissions.share_health ? '✔ SHARED' : 'OFF'}
                </button>
              </div>
            </div>

            <!-- Bank Activities Toggle (Strict Private Default) -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; padding: 18px 20px; border-radius: var(--radius-btn); border: 2px solid var(--border-card);">
              <div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">🏦 Bank Account Activities</div>
                <div style="font-size: 1rem; color: var(--text-muted); margin-top: 4px;">Kept strictly private by default to protect your financial independence.</div>
              </div>
              <div>
                <button class="btn-toggle-switch ${this.permissions.share_bank ? 'active' : ''}" onclick="familyPortal.updatePermission('share_bank', ${!this.permissions.share_bank})">
                  ${this.permissions.share_bank ? '✔ SHARED' : '🔒 PRIVATE (OFF)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Family View Preview Box -->
        <div style="background: #F0FDF4; border: 2px solid #86EFAC; border-radius: var(--radius-card); padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h4 style="font-size: 1.35rem; color: #166534;">
              📱 Live Family Portal (What Ananya Sees on Her Phone)
            </h4>
            <span style="background: #DCFCE7; color: #15803D; font-size: 0.95rem; font-weight: 700; padding: 4px 12px; border-radius: 12px;">Live Filtered Feed</span>
          </div>
          <p style="font-size: 1.05rem; color: #15803D; margin-bottom: 16px;">
            ${!this.permissions.share_bank ? 'Note: Bank withdrawals and account balances are completely hidden from this feed.' : 'Notice: Bank activities are currently visible.'}
          </p>

          ${this.familyFeed.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${this.familyFeed.map(item => `
                <div style="background: #FFFFFF; border: 1px solid #BBF7D0; border-radius: 14px; padding: 16px;">
                  <div style="font-size: 1.15rem; font-weight: 800; color: #1F2937;">${esc(item.title)}</div>
                  <div style="font-size: 1.05rem; color: #4B5563; margin-top: 4px;">${esc(item.detail)}</div>
                  <div style="font-size: 0.9rem; color: #9CA3AF; margin-top: 6px;">⏱️ ${esc(item.timestamp || 'Today')}</div>
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="font-size: 1.1rem; color: #6B7280;">No shared activities to display.</p>
          `}
        </div>
      </div>
    `;

    container.innerHTML = html;
  }
}

const familyPortal = new FamilyPortal();
