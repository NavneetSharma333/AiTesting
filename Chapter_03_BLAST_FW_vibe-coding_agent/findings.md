# Findings: Jira Test Plan Generator

**Last Updated:** 2026-06-29

---

## Research & Discovery

### Jira REST API Endpoints
- **Fetch Issue:** `GET /rest/api/3/issue/{issueIdOrKey}`
- **Required Fields:** Summary, Description, Acceptance Criteria, Issue Type, Priority, Labels
- **Authentication:** Basic auth with Jira email and API token

### JavaScript-First Implementation
- Frontend built in React/Vite for lightweight browser experience
- Backend implemented in Node/Express at `test-plan-ui/server.js`
- GROQ/OpenAI strategy generation invoked from Node backend
- Markdown test plan constructed deterministically in JavaScript

### Test Plan Standards Alignment
- Follows **ISO/IEC/IEEE 29119** structure (Test Planning)
- Sections: Objective, Scope, Strategy, Entry/Exit Criteria, Risk Analysis, Metrics
- Enterprise test plan should be reusable, non-prescriptive (no step-by-step test cases)

### Hallucination Prevention Strategy
1. **Data-Only Rule:** Never infer or assume test scenarios beyond Jira content
2. **Explicit Tagging:** Mark synthesized sections vs. direct Jira extracts
3. **Validation Gates:** Cross-check generated content against source Jira fields
4. **User Review:** Output should be human-readable for final approval

---

## Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| Jira API rate limits | API calls may throttle | Implement caching; batch requests |
| Missing Jira fields | Incomplete test plan | Use "[Not specified in Jira]" placeholders |
| Multi-line AC formatting | Markdown rendering | Use bullet lists; preserve formatting |
| Local file permissions | Write failures | Pre-check file system; handle exceptions |

---

## Assumptions

- [ ] Jira instance is accessible via REST API
- [ ] User has valid Bearer token for Jira
- [ ] Acceptance Criteria are in standard format (bullets/numbering)
- [ ] Test plan output location has write permissions
- [ ] Jira issue has at least Summary, Description, AC fields

---

## Dependencies & Libraries

```
express==4.x              # Node web server
cors==2.x                 # CORS middleware
dotenv==16.x              # Environment variables
node-fetch==3.x           # HTTP requests from backend
react==18.x               # Frontend UI
react-dom==18.x           # Frontend rendering
vite==4.x                 # Frontend bundler
@vitejs/plugin-react      # Vite React plugin
```

---

## Open Questions

- [ ] Should we cache Jira responses? (For performance)
- [ ] Should we support multiple Jira issues in one run? (Future MVP)
- [ ] Should we integrate with a CI/CD pipeline? (Stretch goal)

---

## Implementation Findings

### Layer 1: Architecture SOPs Created
- `01_jira_connection.md` → Jira REST API integration spec
- `02_test_strategy_generator.md` → GROQ LLM integration spec
- `03_test_plan_builder.md` → Markdown synthesis spec

### Layer 3: Tools Implemented
- `test-plan-ui/server.js` → Node/Express backend for Jira + GROQ orchestration
- `test-plan-ui/src/App.jsx` → React frontend for Jira/GROQ settings and generation
- `test-plan-ui/src/styles.css` → Dark/light UI theme support
- `test-plan-ui/package.json` → Joint frontend/backend dependency manifest

### Key Design Decisions
1. **Temperature = 0.0** → Ensures deterministic output from GROQ
2. **No Hallucination Guards** → Only Jira data + synthesized strategy used
3. **Graceful Degradation** → Missing fields become "[Not specified in Jira]"
4. **Logging** → All requests/errors logged to `.tmp/` directory
5. **3-Layer Architecture** → Deterministic business logic separated from probabilistic LLM

---

## Phase 5 Findings (2026-06-29)

### API & Integration
- **GROQ Endpoint**: `https://api.groq.com/openai/v1/chat/completions` (not `api.openai.com`)
- **GROQ Key Format**: Starts with `gsk_`
- **Default Model**: `qwen/qwen3.6-27b` (supports markdown output with thinking tags)
- **Token Limit**: Increased from 2000 to 6000 to accommodate full Test Plan and RCA documents
- **Temperature**: 0.0 for deterministic output across all endpoints

### Prompt Engineering
- **Test Strategy**: Strategy narrative prompt → frontend `buildMarkdown()` wraps in 11-section document
- **Test Plan**: 17-section comprehensive prompt with tables for Features, Levels/Types, Resources, Risks, References
- **Test Cases**: CSV-only prompt, BOM prefix for Excel compatibility
- **Root Cause Analysis**: 10-section RCA prompt with 5-Whys, Timeline, Impact Analysis, Corrective/Preventive actions

### UI/UX Changes
- Modal overlay with Edit/Preview toggle for all output files
- CSV rendered as HTML table (sticky header, alternating rows, hover)
- Three download formats: `.md`, PDF (print dialog), DOC (Word-compatible HTML)
- Field-level validation with red inline errors on Save Settings
- Green toast notification on successful save (3-second auto-dismiss)
- PDF/DOC buttons hidden for CSV files

### Vercel Deployment
- **Platform**: Vercel (serverless)
- **Adapter**: Express app exported as default from `api/index.js`
- **Config**: `vercel.json` with Vite framework, dist output, SPA rewrite
- **Live URL**: https://stlcagent-nine.vercel.app
- **Custom Domain**: `STLCAgent.vercel.app` requested but not available (project name: `stlcagent`)

### Dependency Additions

```
react-markdown@10.x       # Markdown rendering in React
remark-gfm@4.x            # GFM tables/strikethrough for markdown
vercel@54.x               # Vercel CLI for deployment
```

### Key Design Decisions (Phase 5)
1. **Dedicated Prompts**: Each endpoint (strategy, plan, test-cases, rca) has its own GROQ prompt for distinct outputs
2. **CSV Parsing**: Client-side quote-aware CSV parser renders test cases as HTML table
3. **Markdown-to-HTML**: Simple regex-based converter for PDF/DOC output (no heavy dependencies)
4. **Serverless Adaptation**: Express app conditionally listens (`!process.env.VERCEL`) and exports `default app`
5. **Field Errors**: Inline validation replaces browser `alert()` for better UX
6. **Toast Notifications**: CSS-animated toast for non-intrusive success feedback

### Open Issues
- [ ] GROQ model occasionally outputs `<think>` without closing `</think>` — mitigated by regex fallback
- [ ] Test Plan output token-heavy (max 6000) — may truncate for very complex features
- [ ] PDF quality depends on browser print engine — no server-side PDF generation
- [ ] Custom domain not configured — uses Vercel auto-generated `stlcagent-nine.vercel.app`

## Next Steps

1. ~~Create Node/Express API backend to expose tools~~ ✅ Complete
2. ~~Build React UI (Phase 4: Stylize)~~ ✅ Complete
3. ~~Test end-to-end pipeline~~ ✅ Complete
4. ~~Deploy (Phase 5: Trigger)~~ ✅ Complete — https://stlcagent-nine.vercel.app
5. [ ] Configure custom domain if available
6. [ ] Add server-side PDF generation for consistent PDF output
7. [ ] Support multiple Jira issues in batch
8. [ ] Add user authentication / API key management
