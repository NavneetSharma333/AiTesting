# Project Constitution: Jira Test Plan Generator

## North Star
Generate a formal, enterprise-grade test plan document from a Jira issue ID. Output: Complete test plan (objective, scope, strategy, entry/exit, risks, metrics) in Markdown format. **NO individual test cases.**

---

# Mission
Fetch a Jira issue by ID (e.g. SCRUM-8) and generate a   Test Plan from it.

---

## Data Schema

### INPUT
```json

```

### OUTPUT (Test Strategy Format)

The generated test strategy follows this structure:

```markdown
## Test Strategy for [Feature Name]

### Objective
- Clear purpose and goals of testing

### Scope
- **In Scope:** What is included in testing
- **Out of Scope:** What is excluded
- Issue metadata (Type, Priority, Status)

### Focus Areas
- Functional correctness
- Performance (if applicable)
- Security (if applicable)
- Usability (if applicable)
- Compatibility (if applicable)

### Approach
- Testing techniques (black box, white box, automated, exploratory)
- Key testing dimensions covered
- Automation strategy

### Deliverables
- Test cases and reports
- Defect reports
- Test coverage metrics
- Automation regression suite

### Team & Schedule
- Resource requirements (QA Engineers, Automation, DevOps)
- Tools and infrastructure needed
- Timeline and phases

### Entry & Exit Criteria
- Entry: Requirements ready, environment available
- Exit: All AC validated, critical defects resolved

### Risks
- Identified risks with impact/probability
- Mitigation strategies for each risk

### Test Metrics & KPIs
- Quality metrics (pass rate, defect density)
- Execution metrics (cycle time, automation coverage)
- Success criteria
```

### JIRA DATA EXTRACTED
- **Issue Key** (e.g., SCRUM-8)
- **Summary** (Feature/Story title)
- **Description** (Context & requirements)
- **Acceptance Criteria** (AC list)
- **Issue Type** (Story, Task, Bug, Epic)
- **Priority** (Critical, High, Medium, Low)
- **Labels** (e.g., 'testing', 'backend')
- **Parent Issue** (if part of Epic)

---

## Behavioral Rules (MUST ENFORCE)

1. **No Hallucination**
   - Only use data explicitly present in Jira
   - If data missing: note as "[Not specified in Jira]"
   - Never invent test types, metrics, or timelines

2. **Enterprise Tone**
   - Formal QA, professional language
   - ISO 29119 aligned structure where applicable
   - Evidence-based (reference Jira data directly)

3. **Scope Clarity**
   - NO individual test cases in output
   - NO test scripts, test data examples
   - ONLY high-level test strategy & planning

4. **Completeness**
   - All 10 sections must be populated or marked as "[Not specified in Jira]"
   - Referential integrity: Risk section must tie to Strategy

---

## Architectural Invariants

- **Single Source of Truth:** Jira is the only data source
- **Markdown Output:** Always `.md` format, saved locally
- **Error Handling:** Graceful degradation if Jira fields are empty
- **Immutability:** Generated plan should not be modified programmatically
