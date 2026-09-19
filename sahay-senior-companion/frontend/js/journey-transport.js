// Journey 2: Transportation & Errands (Rides, Landmark Transit, Grocery Reorder)

class TransportJourney {
  constructor() {
    this.savedPlaces = [];
    this.activeRide = null;
  }

  async init() {
    await this.fetchSavedPlaces();
    this.render();
  }

  async fetchSavedPlaces() {
    try {
      const res = await fetch("/api/transport/places");
      const data = await res.json();
      if (data.status === "success") {
        this.savedPlaces = data.places;
      }
    } catch (e) {
      console.warn("Failed to fetch saved places:", e);
    }
  }

  bookRideTo(destination, fare = "₹140") {
    voiceEngine.confirmAction({
      title: `Confirm Cab to ${destination}`,
      message: `Book a safe, air-conditioned cab to ${destination}? Total fare is ${fare}. Driver details will be shared with your daughter Ananya.`,
      spokenMessage: `Would you like me to book a cab to ${destination} for ${fare}?`,
      confirmLabel: "Yes, Book My Cab",
      changeLabel: "Cancel",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/transport/book-ride", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              destination: destination,
              fare_estimate: fare,
              share_with_family: true
            })
          });
          const ride = await res.json();
          this.activeRide = ride;
          this.render();
          voiceEngine.speak(ride.spoken_response);
        } catch (e) {
          console.warn("Booking failed:", e);
        }
      }
    });
  }

  async showLandmarks(placeId) {
    voiceEngine.playChime("start");
    try {
      const res = await fetch(`/api/transport/landmarks/${placeId}`);
      const data = await res.json();
      
      const modal = document.createElement("div");
      modal.className = "confirmation-modal-backdrop";
      modal.innerHTML = `
        <div class="confirmation-card" style="text-align: left;">
          <h3 style="color: var(--brand-primary); margin-bottom: 12px;">📍 ${data.title}</h3>
          <ul class="plain-checklist">
            ${data.steps.map(s => `<li>${s}</li>`).join('')}
          </ul>
          <div style="background: #F1F5F9; padding: 14px; border-radius: 12px; margin-bottom: 20px;">
            <strong>🚌 Bus Options:</strong> ${data.bus_options}
          </div>
          <button id="close-landmark-btn" class="btn-primary">
            <span>👍</span> Understood, Thank You
          </button>
        </div>
      `;
      document.body.appendChild(modal);
      modal.querySelector("#close-landmark-btn").onclick = () => modal.remove();
    } catch (e) {
      console.warn("Failed to fetch landmarks:", e);
    }
  }

  async reorderMonthly(category = "pharmacy") {
    voiceEngine.playChime("start");
    try {
      const res = await fetch("/api/transport/reorder-monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category })
      });
      const data = await res.json();

      voiceEngine.confirmAction({
        title: `Reorder Last Month's ${category === "pharmacy" ? "Medicines" : "Groceries"}`,
        message: `Items from ${data.store}:<br>${data.items.map(i => `&bull; <strong>${i.item}</strong> (${i.price})`).join('<br>')}<br><br>Total: <strong>${data.total_amount}</strong> (Free Doorstep Delivery)`,
        spokenMessage: data.spoken_confirmation,
        confirmLabel: "Yes, Place Order",
        onConfirm: () => {
          alert(`Order placed successfully! Delivery will arrive today within 2 hours at ${data.delivery_address}.`);
          voiceEngine.playChime("success");
        }
      });
    } catch (e) {
      console.warn("Reorder error:", e);
    }
  }

  render() {
    const container = document.getElementById("transport-journey-container");
    if (!container) return;

    let html = `
      <div class="senior-card">
        <h3><span>🚗</span> Rides & Errands</h3>
        <p style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 20px;">
          One-tap booking to your frequent places with plain-language fares and zero surge.
        </p>

        ${this.activeRide ? `
          <div class="senior-card" style="border-color: #3B82F6; background: #EFF6FF; margin-bottom: 24px;">
            <h4 style="color: #1D4ED8; font-size: 1.35rem; margin-bottom: 6px;">🚗 Cab En Route: Arriving in 4 Mins</h4>
            <div class="giant-number-badge">
              <div class="label">Show this OTP to Driver</div>
              <div class="number">${this.activeRide.otp}</div>
            </div>
            <div style="font-size: 1.2rem; color: #1E40AF; line-height: 1.6; margin-bottom: 12px;">
              <strong>Driver:</strong> ${this.activeRide.driver.name} (${this.activeRide.driver.rating})<br>
              <strong>Vehicle:</strong> ${this.activeRide.driver.vehicle} (${this.activeRide.driver.plate})<br>
              <strong>Fixed Fare:</strong> ${this.activeRide.fare} (No surge)
            </div>
            <div style="font-size: 1.05rem; color: #15803D; font-weight: 700;">
              ✔ ${this.activeRide.family_message}
            </div>
            <button class="btn-secondary" style="margin-top: 16px;" onclick="transportJourney.activeRide = null; transportJourney.render();">
              <span>✕</span> Dismiss Cab Screen
            </button>
          </div>
        ` : ''}

        <!-- My People & Places Grid -->
        <h4 style="font-size: 1.35rem; margin-bottom: 14px;">📍 My Frequent Places ("My People & Places")</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-bottom: 28px;">
          ${this.savedPlaces.map(place => `
            <div style="background: var(--bg-card-hover); border: 2px solid var(--border-card); border-radius: var(--radius-card); padding: 20px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <h5 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">${place.label}</h5>
                <p style="font-size: 1.05rem; color: var(--text-muted); margin-bottom: 10px;">${place.landmark}</p>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button class="btn-primary" style="min-height: 48px; font-size: 1.05rem; padding: 8px 14px;" onclick="transportJourney.bookRideTo('${place.label}')">
                  🚗 Book Cab
                </button>
                <button class="btn-secondary" style="min-height: 48px; font-size: 1.05rem; padding: 8px 14px;" onclick="transportJourney.showLandmarks('${place.id}')">
                  🚶 Landmarks
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Voice Reordering Essentials -->
        <div style="background: #FFFBEB; border: 2px solid #FCD34D; border-radius: var(--radius-card); padding: 22px;">
          <h4 style="font-size: 1.35rem; color: #92400E; margin-bottom: 8px;">
            <span>📦</span> "Order What I Got Last Month"
          </h4>
          <p style="font-size: 1.15rem; color: #B45309; margin-bottom: 16px;">
            Reorder your regular prescriptions or household staples with a single tap.
          </p>
          <div class="btn-grid-row">
            <button class="btn-primary" style="background: #D97706;" onclick="transportJourney.reorderMonthly('pharmacy')">
              <span>💊</span> Reorder Monthly Medicines (Apollo Pharmacy)
            </button>
            <button class="btn-secondary" style="border-color: #D97706; color: #B45309;" onclick="transportJourney.reorderMonthly('groceries')">
              <span>🛒</span> Reorder Staple Groceries
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }
}

const transportJourney = new TransportJourney();
