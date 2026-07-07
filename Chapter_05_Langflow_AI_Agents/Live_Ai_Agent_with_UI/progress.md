# Progress

## 2026-07-08
- Added a Vercel serverless proxy endpoint at /api/langflow for LangFlow requests.
- Updated the frontend to call the proxy by default so the deployed UI no longer depends on localhost.
- Added Vite dev-server proxy support for local development.
- Updated the deployment script to run from the correct project folder.
- Documented the required Vercel environment variables for the upstream LangFlow endpoint.

## 2026-07-08 (later)
- Removed the .github/ workflows, deploy.ps1, DEPLOY.md, and .env.local to clean up the project.
- Fixed vercel.json: dropped `@vercel/static-build` in favor of Vercel auto-detection for Vite; used `rewrites` for SPA so static assets (JS/CSS) are served correctly.
- Fixed .vercelignore: removed `package-lock.json` exclusion (needed for `npm ci`) and cleaned up other ignores.
- Removed hardcoded API key from src/App.jsx for security.
- Renamed Vercel project from `live-ai-agent` → `flaky-analyzer-ai-agent`.
- **Actually implemented** `api/langflow.js` — a Vercel serverless function that accepts the LangFlow-style payload (`input_value`, `uploaded_files`) and proxies it to the OpenAI Chat Completions API. Now the app works from any device without requiring a local LangFlow instance.
- Added Vite dev-server proxy for `/api` in `vite.config.js`.
- Required Vercel environment variable: `OPENAI_API_KEY` (set via Vercel Dashboard → Project Settings → Environment Variables).

## 2026-07-08 01:25
- Switched proxy backend from OpenAI to **Groq** (`llama-3.3-70b-versatile`) using user's `gsk_...` key.
- Set `GROQ_API_KEY` as a Vercel production environment variable via CLI.
- Verified `/api/langflow` proxy returns 200 with valid LLM responses.
- App now fully functional from any device at **https://flaky-analyzer-ai-agent.vercel.app** — no local LangFlow needed.