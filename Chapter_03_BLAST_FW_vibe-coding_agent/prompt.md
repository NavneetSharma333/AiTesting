# Interaction Prompt & Notes

This file captures the user's recent conversation, requests, and actions taken while developing the Jira Test Plan Generator project. Secrets (API keys, tokens) are intentionally redacted.

## User Requests (summary)
- Build a lightweight React app + Node/Express backend to generate a Jira-based test plan from a Jira issue (e.g., `SCRUM-8`).
- Prefer JavaScript-first (React + Vite frontend, Node/Express backend). Avoid relying on Python/Flask unless necessary.
- Keep `B.L.A.S.T.md` untouched (it contains instructions only).
- Update documentation files: `README.md`, `task_plan.md`, `findings.md`, `progress.md` to reflect the Node/Express implementation.
- Persist the conversation prompts and important steps into this `prompt.md` file.

## Actions Performed
- Converted documentation references from Flask/Python to Node/Express and updated `README.md`, `task_plan.md`, `findings.md`, and `progress.md`.
- Ensured the authoritative app path is `test-plan-ui/` (React + Node/Express).
- Installed Node dependencies for `test-plan-ui` (fixed `node-fetch` version mismatch).
- Started the frontend dev server (Vite) and backend server (Node/Express).

## Run Information (local)
- Frontend (Vite dev): http://localhost:5173/  (network: http://<your-ip>:5173/)
- Backend (Node/Express): http://localhost:5178/

Notes: The frontend sends requests to `http://localhost:5178/api/generate`.

## Why the "Failed to fetch" error occurred
- The frontend makes a POST to `http://localhost:5178/api/generate`.
- A browser "Failed to fetch" typically means the network request could not reach the backend (server not running) or the request was blocked by CORS/network policy.
- In this environment the root cause was: the Node/Express backend was not started before clicking "Generate Strategy". After launching `server.js` the fetch should reach the backend.

## How to run locally (copy/paste)
1. Install dependencies inside `test-plan-ui`:

```powershell
cd "C:\Users\pc\Desktop\Python\AiTesting\Chapter_03_BLAST_FW_vibe-coding_agent\test-plan-ui"
npm install
```

2. Start backend (Node/Express):

```powershell
cd "C:\Users\pc\Desktop\Python\AiTesting\Chapter_03_BLAST_FW_vibe-coding_agent\test-plan-ui"
npm run start
# Server listens on http://localhost:5178
```

3. Start frontend (Vite dev):

```powershell
cd "C:\Users\pc\Desktop\Python\AiTesting\Chapter_03_BLAST_FW_vibe-coding_agent\test-plan-ui"
npm run dev -- --host 0.0.0.0 --port 5173
# Frontend available at http://localhost:5173/
```

4. In the UI: configure Jira and GROQ/OpenAI settings (do not paste secrets into public chat). Save settings, enter issue key (e.g., `SCRUM-8`), then click "Generate Strategy".

## Troubleshooting
- If you still see "Failed to fetch":
  - Confirm backend is running and logs show "Jira Test Strategy API running on http://localhost:5178".
  - Verify the frontend is posting to `http://localhost:5178/api/generate` (App.jsx uses that URL).
  - Check browser console / network tab for the actual error (connection refused vs CORS vs 4xx/5xx).
  - If backend returns a 4xx/5xx, inspect backend logs (the terminal running `server.js`) for the error details.

## Security note
- The `gemini.md` file contains example credentials used in development. Do not commit real API keys or tokens to version control. Replace keys with environment variables or `.env` files and keep them out of source control.

## Conversation snippets (sanitized)
- User reported: "after entering Jira url, email, token and groq token and adding jira issue key, clicking Generate Strategy fails with 'Failed to fetch'."
- Action: Started backend, reproduced the issue (it was caused by backend not running). Backend now running at `http://localhost:5178`.

---
Generated and saved on 2026-06-26.
