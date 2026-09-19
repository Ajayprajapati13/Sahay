# Sahay (सहाय) - GenAI Daily Companion for Senior Citizens

A gentle, voice-first web app that helps older people prepare for a bank visit, read their documents,
check suspicious messages, and stay on top of medicines. Built with FastAPI and a plain JavaScript PWA
(no build step), and served by one process.

Live demo: https://sahaywebapp.vercel.app

## What is real, and what is still a demo

| Feature | Status |
|---|---|
| **Scam checker** for pasted messages | Real. Gemini plus high-precision evidence rules (OTP requests, app installs, remote-access tools, ...). Every answer says who checked it (`checked_by`: `gemini` or `rules`) and never claims "verified safe" without a model check. |
| **Passbook photo reading** | Real. Camera or upload, read by Gemini, then the person confirms or edits every field before it is used. Unreadable photos give an error, never sample data. |
| **Prescription photo reading** | Real. Same confirm-before-use step; reminders never invent a dose or a time. |
| **Voice and typed requests** | Real. Gemini routes the request to the right screen; a keyword router is the offline fallback. |
| **Directions** | Real. Embedded Google Map (needs `GOOGLE_MAPS_API_KEY`) or an "Open in Google Maps" link. |
| Cab booking, bank kiosk queue, family notifications, seeded profile and reminders | **Demo only.** Simulated data, no real provider behind them. |

State is kept in memory (and in `backend/data/sahay_state.json` where the disk is writable), so on serverless
hosts such as Vercel it resets on a cold start. There are no user accounts yet.

## Gen AI services used

- **Google Gemini API** (default `gemini-3.6-flash`) from `backend/app/services/gemini_service.py`: photo reading,
  scam analysis, request routing and grievance-letter drafting. Answers are validated before use, cached briefly,
  and fall back to local rules if the model is unavailable or rate-limited.
- **Browser Web Speech API** for voice input and read-aloud (not generative AI).
- **Claude (Anthropic) via Claude Code** was used as a development assistant.

## Run it locally

```bash
cd sahay-senior-companion
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open http://127.0.0.1:8000 (app), `/kiosk`, and `/docs` (API documentation).

## Configuration (environment variables)

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Turns on live Gemini. Without it the app runs on local rules and photo reading is unavailable. |
| `GEMINI_MODEL` | Model name. Default `gemini-3.6-flash`. |
| `GOOGLE_MAPS_API_KEY` | Maps Embed API key for the embedded map. Restrict it to your site's HTTP referrer. Optional. |
| `DATA_DIR` | Where the state file is written. Optional. |
| `SECRET_KEY` | Reserved for future use. |

See `backend/.env.example`. The app reads real environment variables and does not load `.env` files.

## Tests and code quality

```bash
pip install -r backend/requirements.txt ruff
ruff check backend
pytest backend/tests/ -v
```

GitHub Actions runs both on every push. The suite covers the API, scam rules, the Gemini handling (with the
network mocked), security hardening, and performance behaviour.

## Deploy

**Vercel:** import the repo, set **Root Directory** to `sahay-senior-companion`, leave the framework as FastAPI,
and add the environment variables above. `index.py` and the root `requirements.txt` exist for Vercel.
The web files live in `frontend/web/` (not `public/`, which Vercel leaves out of Python bundles).

**Render:** Root Directory `sahay-senior-companion`, build `pip install -r backend/requirements.txt`,
start `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.

## Security and performance notes

- Every dynamic value in the UI is HTML-encoded (`frontend/js/safe-html.js`); stored input is markup-stripped on the server.
- Content-Security-Policy, `Permissions-Policy` (camera, microphone and location only for this site), `nosniff`,
  frame denial, per-client rate limits, request size limits, and path-traversal protection.
- Responses are gzip-compressed; static files are cached; API responses are `no-store`.
- The service worker fetches fresh files first and only uses its cache offline, so users never see stale screens.
- Gemini calls reuse one pooled connection, and repeated questions are answered from a short-lived cache.

## Design principles

1. Voice first, camera second, typing last.
2. One task per screen, large touch targets, high-contrast mode, English and Hindi.
3. Confirm before anything irreversible, and check what the AI read before using it.
4. Never show made-up data as if it were the person's own.
