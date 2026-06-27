# BLAST Jira Test Plan Generator

Enterprise-grade test plan generation from Jira issues using the **B.L.A.S.T. Framework** (Blueprint, Link, Architect, Stylize, Trigger).

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React UI (Vite)                         │
│                   Dark/Light Mode Theme                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓ HTTP REST API
┌─────────────────────────────────────────────────────────────┐
│                 Node/Express Backend                        │
│               `test-plan-ui/server.js`                       │
│         /api/generate, /api/validate, /api/health          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓ Orchestrator
┌─────────────────────────────────────────────────────────────┐
│                 Node/Express Backend                        │
│                    Pipeline Coordinator                     │
└──────┬─────────────────────────────────────────────┬────────┘
       │                                             │
       ↓                                             ↓
   ┌────────────────────┐                 ┌─────────────────────┐
   │ Jira Connector     │                 │ Test Strategy Gen   │
   │ (jira_connector.py)│ → Strategy Text │(test_strategy_...)  │
   │ Fetch Issue Data   │                 │ GROQ LLM (temp=0.0) │
   └────────────────────┘                 └──────────┬──────────┘
                                                     │
                                                     ↓
                                          ┌──────────────────────┐
                                          │ Test Plan Builder    │
                                          │ (test_plan_builder)  │
                                          │ 10-Section Markdown  │
                                          └──────────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend
cd test-plan-ui
npm install

# Frontend
cd ../ui
npm install
```

### 2. Configure Environment

The React frontend sends Jira and GROQ credentials in the request body. The Node backend runs locally on port `5178` by default.

### 3. Run Backend (Node/Express API)

```bash
cd test-plan-ui
npm start
# Runs on http://localhost:5178
```

### 4. Run Frontend (React/Vite)

```bash
cd ui
npm run dev
# Runs on http://localhost:5173
```

> If Python is not available or not desired, the JavaScript backend is the primary integration path for this app.

### 5. Test Generation

1. Open http://localhost:5173
2. Configure Jira and GROQ settings
3. Enter issue key (e.g., `SCRUM-8`)
4. Click "Generate Test Plan"
5. Download Markdown file

---

## 📋 BLAST Framework Phases

### Phase 0: Initialization ✅
- Discovery questions answered
- Data schema defined (`gemini.md`)
- Project constitution established

### Phase 1: Blueprint ✅
- Architecture designed (5-component pipeline)
- Component responsibilities mapped
- Risk analysis documented

### Phase 2: Link ✅
- Jira REST API connectivity verified
- GROQ API connectivity verified
- Error handling & logging configured

### Phase 3: Architect ✅
**3-Layer Architecture:**

**Layer 1: Architecture** (`architecture/`)
- `01_jira_connection.md` - REST API handshake spec
- `02_test_strategy_generator.md` - LLM prompt engineering spec
- `03_test_plan_builder.md` - Markdown synthesis spec

**Layer 2: Navigation** (`test-plan-ui/server.js`)
- Routes data through the pipeline
- Handles sequencing and error flow

**Layer 3: Tools** (`test-plan-ui/`)
- `server.js` - Node/Express backend coordinator
- `src/App.jsx` - React UI entrypoint
- `src/styles.css` - Dark/light theme definitions

### Phase 4: Stylize ✅
- Node/Express API backend (`test-plan-ui/server.js`)
- React UI with Vite (`test-plan-ui/src/App.jsx`)
- Dark/light mode theme support
- Settings persistence (localStorage)

### Phase 5: Trigger 🟡
- Docker containerization (optional)
- Cloud deployment docs
- CI/CD automation (optional)
- Maintenance log in `gemini.md`

---

## 📊 Test Plan Output Format

Generated test plans include:

1. **Objective** - Clear purpose of testing
2. **Scope** - In-scope and out-of-scope items
3. **Focus Areas** - Functional, performance, security, usability, compatibility
4. **Approach** - Testing techniques and methodologies
5. **Deliverables** - Test artifacts to be produced
6. **Team & Schedule** - Resource requirements and timeline
7. **Entry & Exit Criteria** - Start/completion conditions
8. **Risk Analysis** - 6 identified risks with mitigation
9. **Test Metrics & KPIs** - Quality, execution, and schedule metrics
10. **Assumptions & Dependencies** - Project assumptions and blockers

---

## 🔒 Security & Compliance

- **No Hallucination:** Only Jira data used; no invented scenarios
- **Deterministic Output:** GROQ temperature set to 0.0 for reproducibility
- **Enterprise Tone:** Formal, ISO 29119-aligned structure
- **Audit Trail:** All requests logged to `.tmp/` directory
- **Local Storage:** Settings stored only in browser localStorage (never sent to third parties)

---

## 🛠️ API Endpoints

### `POST /api/generate`
Generate test plan from Jira issue.

**Request:**
```json
{
  "jiraUrl": "https://...",
  "jiraEmail": "...",
  "jiraToken": "...",
  "issueKey": "SCRUM-8",
  "groqKey": "...",
  "groqModel": "openai/gpt-oss-120b"
}
```

**Response:**
```json
{
  "success": true,
  "issueKey": "SCRUM-8",
  "issueData": { ... },
  "strategy": "...",
  "testPlan": "# Test Plan: ...",
  "filepath": ".tmp/test_plan_SCRUM_8.md"
}
```

### `POST /api/validate`
Validate configuration without full generation.

### `GET /api/health`
Health check endpoint.

### `GET /api/config-template`
Get configuration template.

---

## 📝 Project Structure

```
.
├── test-plan-ui/                  # JavaScript React + Node app
│   ├── package.json
│   ├── vite.config.js
│   ├── server.js                  # Node/Express backend
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                # Main React component
│       └── styles.css             # Dark/light mode styles
├── gemini.md                      # Project constitution
├── task_plan.md                   # Phase roadmap
├── findings.md                    # Research & discoveries
├── progress.md                    # Execution tracking
└── test-plan-ui/.env              # Optional local environment variables
```

---

## ⚙️ Environment Variables

The app passes Jira and GROQ settings from the frontend to the backend request body. You can also use a local `.env` file in `test-plan-ui/` for backend configuration when running the Node server.

```bash
# Jira Configuration
JIRA_URL="https://your-domain.atlassian.net"
JIRA_EMAIL="your-email@example.com"
JIRA_TOKEN="your-jira-api-token"

# GROQ Configuration
GROQ_KEY="your-groq-api-key"

# Node Backend Configuration (optional)
PORT=5178
```

---

## 📚 Example Test Plan

See `findings.md` for reference to an ecommerce website test plan example that served as the template for this generator.

---

## 🧪 Testing the System

### Test with curl

```bash
curl -X POST http://localhost:5178/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "jiraUrl": "https://...",
    "jiraEmail": "...",
    "jiraToken": "...",
    "issueKey": "SCRUM-8",
    "groqKey": "..."
  }'
```

### Health Check

```bash
curl http://localhost:5178/api/health
```

### Validate Configuration

```bash
curl -X POST http://localhost:5178/api/validate \
  -H "Content-Type: application/json" \
  -d '{
    "jiraUrl": "https://...",
    "jiraEmail": "...",
    "jiraToken": "...",
    "groqKey": "..."
  }'
```

---

## 🎯 Key Features

✅ **Enterprise-Grade Test Plans** - 10-section formal structure  
✅ **Zero Hallucination** - Only Jira data used for generation  
✅ **Deterministic Output** - Reproducible results via temperature=0.0  
✅ **Dark/Light Mode** - Professional UI with theme support  
✅ **Local Storage** - Settings persist in browser  
✅ **Markdown Export** - Download plans as `.md` files  
✅ **API-Driven** - REST endpoints for automation  
✅ **Fully Logged** - Request/error audit trail  

---

## 🔄 Workflow

1. **User enters Jira credentials** (Settings panel)
2. **User enters Jira issue key** (Generation panel)
3. **Frontend calls** `/api/generate` → Node/Express backend
4. **Node backend coordinates:**
   - Jira API fetch using configured email/token
   - GROQ/OpenAI strategy generation
   - Markdown test plan construction
5. **Result returned** with strategy + full test plan
6. **User downloads** markdown file for documentation

---

## 📖 Documentation

- `gemini.md` - Project Constitution (data schemas, rules, invariants)
- `task_plan.md` - Blueprint & Phase roadmap
- `findings.md` - Research, constraints, dependencies
- `progress.md` - Execution tracking & status
- `architecture/*.md` - Technical SOPs for each component
- `test-plan-ui/server.js` - Node/Express backend implementation
- `test-plan-ui/src/App.jsx` - React UI implementation

---

## 🚀 Deployment (Phase 5)

### Docker (Coming Soon)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 5178
CMD ["node", "server.js"]
```

### Cloud Deployment

- Vercel (frontend)
- Heroku/AWS (backend)
- Environment secrets management
- Auto-scaling configuration

---

## 📞 Support

For issues or questions:
1. Check `.tmp/` directory logs
2. Review `findings.md` for constraints
3. Verify environment variables in `.env`
4. Test API endpoints with `/api/health`

---

## 📄 License

Proprietary - BLAST Framework Implementation

---

**Generated:** 2026-06-26  
**Framework:** BLAST (Blueprint → Link → Architect → Stylize → Trigger)  
**Version:** 1.0.0
