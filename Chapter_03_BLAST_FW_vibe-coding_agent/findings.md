# Findings: Jira Test Plan Generator

**Last Updated:** 2026-06-25

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

## Next Steps

1. Create Node/Express API backend to expose tools
2. Build React UI (Phase 4: Stylize)
3. Test end-to-end pipeline
4. Deploy (Phase 5: Trigger)
