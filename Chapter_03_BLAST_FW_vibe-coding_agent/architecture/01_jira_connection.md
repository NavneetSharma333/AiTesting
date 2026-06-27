# Architecture: Jira Connection Module

## Goal
Securely fetch Jira issue data by issue key. Validate credentials and handle API errors gracefully.

## Inputs
- `jira_url` (string): Base URL of Jira instance
- `jira_email` (string): Email account for Jira auth
- `jira_token` (string): API token for Jira auth
- `issue_key` (string): Jira issue key (e.g., SCRUM-8)

## Outputs
```json
{
  "success": true,
  "issue": {
    "key": "SCRUM-8",
    "summary": "Feature Title",
    "description": "Full description text",
    "issueType": "Story",
    "priority": "High",
    "acceptanceCriteria": "List or text of AC",
    "labels": ["tag1", "tag2"],
    "status": "To Do"
  },
  "error": null
}
```

## Edge Cases
1. **Missing Credentials** → Return error: "Jira credentials incomplete"
2. **Invalid Issue Key** → Return error: "Issue not found"
3. **Auth Failure** → Return error: "Jira authentication failed"
4. **Empty Fields** → Use placeholder: "[Not specified in Jira]"

## Logic
1. Validate all inputs are non-empty
2. Create Basic Auth header: `Base64(email:token)`
3. Call: `GET /rest/api/3/issue/{issueKey}`
4. Parse response and extract relevant fields
5. Return structured JSON

## Error Handling
- Catch HTTP errors and return error message
- Log all failed attempts to `.tmp/jira_errors.log`
