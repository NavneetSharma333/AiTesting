# Task Plan: Jira Test Plan Generator

**Last Updated:** 2026-06-25

---

## PHASE 0: INITIALIZATION ✅ COMPLETE

- [x] Discovery Questions answered
- [x] Data Schema defined in `gemini.md`
- [x] Project Constitution approved
- [x] Behavioral Rules established

---

## PHASE 1: BLUEPRINT (Vision & Logic)

### 1.1 Architecture Design

```
User Input (Jira ID)
        ↓
    [Jira Connector Module]
        ↓
    [Data Parser & Validator]
        ↓
    [Test Plan Generator Module]
        ↓
    [Markdown Template Engine]
        ↓
    [File Writer & Output Handler]
        ↓
   Local .md File
```

### 1.2 Component Breakdown

| Component | Responsibility | Input | Output |
|-----------|-----------------|-------|--------|
| **Jira Connector** | Fetch Jira issue data via REST API | Jira ID, API endpoint, token | JSON issue object |
| **Data Parser** | Extract relevant fields; validate schema | Issue JSON | Structured dict with AC, description |
| **Test Plan Generator** | Synthesize test plan sections | Parsed data + rules | 10-section test plan structure |
| **Markdown Renderer** | Convert structure to Markdown | Plan structure | Markdown string |
| **File Writer** | Save to local file | Markdown + filename | .md file on disk |

### 1.3 Risks & Constraints

| Risk | Mitigation |
|------|-----------|
| Jira API authentication fails | Validate token before fetch; provide clear error messages |
| Jira field missing/empty | Populate with "[Not specified in Jira]"; ensure graceful degradation |
| Hallucination in generated content | Strict rule: ONLY synthesize from extracted data; no assumptions |
| File I/O permissions | Check write permissions before saving; use error handling |

### 1.4 Deliverables per Phase

- **Phase 2 (Build):** JavaScript/Node modules for each component
- **Phase 3 (Integration):** End-to-end pipeline
- **Phase 4 (Validation):** Test with real Jira tickets; check for hallucination
- **Phase 5 (Deployment):** Package as web app and/or library

---

---

## PHASE 2: LINK (Connectivity Verification) ✅ COMPLETE

### Handshake Testing
- [x] Jira REST API connectivity verified
- [x] GROQ/OpenAI API connectivity verified
- [x] Error handling & logging configured
- [x] `.tmp/` directory for logs

### Tools Created
- `test-plan-ui/server.js` → Node/Express backend API coordinator
- `test-plan-ui/src/App.jsx` → React frontend with Jira/GROQ settings
- `test-plan-ui/src/styles.css` → Dark/light UI theme
- `test-plan-ui/package.json` → Frontend/backend dependency manifest

---

## PHASE 3: ARCHITECT (3-Layer Build) ✅ COMPLETE

### Layer 1: Architecture SOPs (Technical Specification)
- `architecture/01_jira_connection.md` → REST API handshake spec
- `architecture/02_test_strategy_generator.md` → LLM prompt engineering spec
- `architecture/03_test_plan_builder.md` → Markdown synthesis spec

**Golden Rule:** All business logic defined as SOPs before code implementation.

### Layer 2: Navigation (Decision Making)
- `test-plan-ui/server.js` → Routes data through Jira → strategy → plan

**Logic Flow:**
```
User Input → Jira Fetch → Strategy Gen → Plan Build → Output
```

### Layer 3: Tools (JavaScript / Node)
- `test-plan-ui/server.js` → Node/Express API coordinator
- `test-plan-ui/src/App.jsx` → React frontend with Jira/GROQ settings
- `test-plan-ui/src/styles.css` → Dark/light UI theme
- `test-plan-ui/package.json` → Frontend/backend dependency manifest

**Key Principle:** LLM is probabilistic; business logic is deterministic.
- Temperature = 0.0 for reproducible outputs
- Logging at `.tmp/` for audit trail
- Error handling at each layer

---

## PHASE 4: STYLIZE (UI/UX Refinement) ✅ COMPLETE

### Backend API (Node/Express)
- [x] Node/Express API with CORS enabled (`test-plan-ui/server.js`)
- [x] `/api/generate` - Main test plan generation endpoint
- [x] `/api/health` - Health check endpoint
- [x] API accepts Jira/GROQ settings from frontend payload

### Frontend UI (React + Vite)
- [x] React component with Vite bundler
- [x] Dark/Light mode toggle with CSS variables
- [x] Settings panel (Jira + GROQ configuration)
- [x] Generation panel (Issue key input)
- [x] Result panels (Strategy + Test Plan display)
- [x] Markdown file download functionality
- [x] localStorage persistence for settings
- [x] Status tracking and error messages
- [x] Professional styling with responsive design

### Test Strategy Format Enhancement
- [x] Prompt engineering for 8-section structure
  - Objective, Scope (In/Out), Focus Areas, Approach
  - Deliverables, Team & Schedule, Entry/Exit, Risks
- [x] Reference template from ecommerce example integrated
- [x] Comprehensive risk analysis with 6 identified risks
- [x] Detailed metrics, resources, and schedule sections
- [x] Example test strategy provided by user incorporated

### Documentation & Deployment Ready
- [x] Comprehensive README.md with architecture diagrams
- [x] API endpoint documentation
- [x] Setup instructions and quick start guide
- [x] package.json for Node dependencies
- [x] Project structure documentation
- [x] Docker containerization template (Phase 5)

---

## PHASE 5: TRIGGER (Deployment) → READY FOR EXECUTION

## Checklist: Phase 1 Completion

- [ ] Architecture approved by user
- [ ] Component responsibilities clear
- [ ] Risk mitigation strategy accepted
- [ ] Ready to proceed to Phase 2: Build

---

## Success Criteria

1. Generated test plan has all 10 sections
2. NO hallucinated content (only Jira source truth)
3. Formal enterprise tone maintained throughout
4. Output is valid Markdown, locally saved
5. Can be regenerated consistently from same Jira ID
