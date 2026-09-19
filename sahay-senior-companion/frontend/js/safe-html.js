// Output-encoding helpers. Anything that comes from the API, from Gemini, or from user input
// must go through one of these before it is placed inside an innerHTML template.

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };

// Encodes a value for HTML text or a quoted attribute value.
function esc(value) {
  return String(value ?? "").replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c]);
}

// Encodes a value as a JavaScript literal for an inline handler: onclick="fn(${jsArg(id)})".
// JSON.stringify produces a valid, quoted JS literal; esc() then makes it safe inside the attribute.
function jsArg(value) {
  return esc(JSON.stringify(value ?? ""));
}

// Only lets image data through for <img src>: same-origin paths and data:image/* URIs.
function safeImgSrc(value) {
  const src = String(value ?? "");
  return /^(data:image\/|\/(?!\/))/i.test(src) ? src : "";
}
