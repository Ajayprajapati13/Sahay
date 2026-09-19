// Camera / photo picker and document reading. Phone photos are several MB, so they are shrunk in the
// browser before being sent (the API and Vercel both cap request size).

const PHOTO_PRIVACY_NOTE = "Your photo is sent to Google's Gemini AI to be read. Sahay does not save it.";

// Opens the camera (or gallery) and resolves with a JPEG data URL, or null if the person cancelled.
function pickPhoto({ maxSide = 1400, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.style.display = "none";
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      input.remove();
      if (!file) return resolve(null);
      try {
        resolve(await downscaleImage(file, maxSide, quality));
      } catch (e) {
        reject(e);
      }
    });
    input.addEventListener("cancel", () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}

function downscaleImage(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo could not be opened. Please try another one."));
    };
    img.src = url;
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
