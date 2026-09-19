// Directions on Google Maps. Shows an embedded map (Maps Embed API) when the site has a key configured,
// and always offers an "Open in Google Maps" link, which needs no key and works on every phone.

const mapView = {
  _config: null,

  async config() {
    if (!this._config) {
      try {
        this._config = await (await fetch("/api/config")).json();
      } catch (e) {
        this._config = {};
      }
    }
    return this._config;
  },

  // Link that opens Google Maps directions from the person's current location to the destination.
  openLink(destination) {
    return "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(destination);
  },

  // Asks the browser for the current position; resolves "lat,lng" or null (permission denied / unavailable).
  locate() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude},${pos.coords.longitude}`),
        () => resolve(null),
        { timeout: 8000, maximumAge: 300000 }
      );
    });
  },

  // HTML for the "before tapping" state: one big button plus the always-available link.
  prompt(containerId, destination) {
    if (!destination) return "";
    return `
      <div id="${esc(containerId)}">
        <button class="btn-primary" onclick="mapView.show(${jsArg(containerId)}, ${jsArg(destination)})">
          <span>🗺️</span> Show me the way to ${esc(destination)}
        </button>
      </div>`;
  },

  // Renders the map (or just the link) into the container.
  async show(containerId, destination) {
    const el = document.getElementById(containerId);
    if (!el || !destination) return;
    el.innerHTML = `<p role="status" style="font-size: 1.1rem;">Finding your way…</p>`;

    const cfg = await this.config();
    let html = "";
    if (cfg.maps_embed_key) {
      const origin = await this.locate();
      const base = "https://www.google.com/maps/embed/v1/";
      const key = encodeURIComponent(cfg.maps_embed_key);
      const src = origin
        ? `${base}directions?key=${key}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving`
        : `${base}place?key=${key}&q=${encodeURIComponent(destination)}`;
      html += `<iframe title="Map to ${esc(destination)}" src="${esc(src)}" loading="lazy" allowfullscreen
                 referrerpolicy="strict-origin-when-cross-origin"
                 style="width: 100%; height: 320px; border: 0; border-radius: 12px; margin-bottom: 12px;"></iframe>`;
      if (!origin) {
        html += `<p style="font-size: 1rem; color: var(--text-muted); margin-bottom: 10px;">Allow location access to see the route from where you are.</p>`;
      }
    }
    html += `<a class="btn-secondary" href="${esc(this.openLink(destination))}" target="_blank" rel="noopener"
               style="display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none;">
               <span>🧭</span> Open directions in Google Maps</a>`;
    if (!cfg.maps_embed_key) {
      html += `<p style="font-size: 1rem; color: var(--text-muted); margin-top: 10px;">The map opens in the Google Maps app, with live traffic and turn-by-turn directions.</p>`;
    }
    el.innerHTML = html;
  }
};
