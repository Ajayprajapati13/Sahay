// Adding a photo of a document: the person chooses "Take a photo" or "Upload", and the photo is shrunk in
// the browser before being sent (phone photos are several MB; the API and Vercel both cap request size).
//  - Phones and tablets: "Take a photo" opens the native camera app.
//  - Computers: "Take a photo" opens a live camera view with a capture button.
//  - If the camera is blocked or missing, we say why and the person can upload a file instead.

const PHOTO_PRIVACY_NOTE = "Your photo is sent to Google's Gemini AI to be read. Sahay does not save it.";

const isPhoneOrTablet = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

const canUseLiveCamera = () => !isPhoneOrTablet() && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

function cameraErrorMessage(error) {
  const name = error && error.name;
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "The camera is blocked. Allow camera access in your browser settings, or upload a photo instead.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device. You can upload a photo instead.";
  }
  return "The camera could not be started. You can upload a photo instead.";
}

function canvasToJpeg(source, width, height, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function downscaleImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(canvasToJpeg(img, img.width, img.height, maxSide, quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo could not be opened. Please try another one."));
    };
    img.src = url;
  });
}

// Opens the "Add a photo" dialog. Resolves with a JPEG data URL, or null if the person cancelled.
function pickPhoto({ maxSide = 1400, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirmation-modal-backdrop";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "photo-title");
    let stream = null;

    const stopStream = () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      stream = null;
    };
    const close = (value) => {
      stopStream();
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") close(null);
    };
    document.addEventListener("keydown", onKey);

    const chooser = (message = "") => {
      const where = isPhoneOrTablet() ? "my phone" : "my computer";
      overlay.innerHTML = `
        <div class="confirmation-card">
          <h3 id="photo-title">Add a photo</h3>
          ${message ? `<p role="alert" style="font-size: 1.1rem; font-weight: 700; color: #B91C1C; margin-bottom: 12px;">${esc(message)}</p>` : ""}
          <div class="btn-grid-row">
            <button id="photo-camera" class="btn-primary"><span>📷</span> Take a photo</button>
            <button id="photo-file" class="btn-secondary"><span>🖼️</span> Upload from ${where}</button>
          </div>
          <button id="photo-cancel" class="btn-secondary" style="margin-top: 12px;">Cancel</button>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-top: 12px;">${esc(PHOTO_PRIVACY_NOTE)}</p>
        </div>`;
      overlay.querySelector("#photo-camera").onclick = () => (canUseLiveCamera() ? startLiveCamera() : chooseFile(true));
      overlay.querySelector("#photo-file").onclick = () => chooseFile(false);
      overlay.querySelector("#photo-cancel").onclick = () => close(null);
      overlay.querySelector("#photo-camera").focus();
    };

    // The file picker must be opened from inside the click, so it is created right here.
    const chooseFile = (useCamera) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      if (useCamera) input.capture = "environment";
      input.style.display = "none";
      input.addEventListener("change", async () => {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) return; // picker closed without a choice: leave the dialog open
        try {
          close(await downscaleImage(file, maxSide, quality));
        } catch (error) {
          chooser(error.message);
        }
      });
      overlay.appendChild(input);
      input.click();
    };

    const startLiveCamera = async () => {
      overlay.innerHTML = `
        <div class="confirmation-card">
          <h3 id="photo-title">Hold the document in front of the camera</h3>
          <video id="photo-video" autoplay playsinline muted
                 style="width: 100%; max-height: 60vh; border-radius: 12px; background: #000;"></video>
          <div class="btn-grid-row" style="margin-top: 14px;">
            <button id="photo-snap" class="btn-primary"><span>📸</span> Take photo</button>
            <button id="photo-back" class="btn-secondary">Back</button>
          </div>
        </div>`;
      overlay.querySelector("#photo-back").onclick = () => {
        stopStream();
        chooser();
      };
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
      } catch (error) {
        stream = null;
        chooser(cameraErrorMessage(error));
        return;
      }
      const video = overlay.querySelector("#photo-video");
      if (!video) return stopStream(); // dialog was closed while the camera was starting
      video.srcObject = stream;
      overlay.querySelector("#photo-snap").onclick = () => {
        if (!video.videoWidth || !video.videoHeight) return;
        close(canvasToJpeg(video, video.videoWidth, video.videoHeight, maxSide, quality));
      };
    };

    document.body.appendChild(overlay);
    chooser();
  });
}

// Sends the photo to /api/ocr/<kind> ("passbook" or "prescription").
// Resolves { ok: true, data } or { ok: false, error } and never throws.
async function readDocumentPhoto(kind, imageDataUrl) {
  try {
    const res = await fetch(`/api/ocr/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: imageDataUrl })
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.status === "success" && body.data) return { ok: true, data: body.data };
    const detail = typeof body.detail === "string" ? body.detail : "I could not read this photo. Please try again with a clear, well-lit picture.";
    return { ok: false, error: detail };
  } catch (e) {
    return { ok: false, error: "I could not reach the server. Please check your internet and try again." };
  }
}
