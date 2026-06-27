# Architecture: Test Plan Builder Module

## Goal
Synthesize Jira issue data + strategy text into a complete, formal 10-section test plan. Output as Markdown.

## Inputs
- `issue_key` (string): Jira issue key
- `issue_data` (JSON): Jira issue object
- `strategy_text` (string): Generated test strategy

## Outputs
```markdown
# Test Plan: [Feature Name]

## 1. Objective
[From Jira summary + strategy synthesis]

## 2. Scope
[From Jira description + issue type]

## 3. Test Strategy
[From GROQ-generated strategy]

## 4. Entry Criteria
[Derived from issue status + AC]

## 5. Exit Criteria
[Derived from acceptance criteria]

## 6. Risk Analysis
[Derived from priority + labels]

## 7. Test Metrics & KPIs
[Derived from issue type + scope]

## 8. Resource Requirements
[Standard template based on scope]

## 9. Schedule & Timeline
[Standard template or [Not specified in Jira]]

## 10. Assumptions & Dependencies
[Derived from issue description]
```

## Edge Cases
1. **Missing Fields** → Use "[Not specified in Jira]"
2. **Empty AC** → Section left minimal
3. **Complex Description** → Preserve formatting

## Logic
1. Extract objective from issue summary
2. Extract scope from description + issue type
3. Insert strategy text
4. Auto-derive entry/exit criteria from AC
5. Auto-derive risks from priority
6. Build metrics based on issue type
7. Populate remaining sections with templates or [Not specified]
8. Save to `.tmp/test_plan_[issueKey].md`

## Output Validation
- Ensure all 10 sections present
- Validate Markdown syntax
- Check for hallucinations (only Jira data + strategy included)
- Return file path on success
