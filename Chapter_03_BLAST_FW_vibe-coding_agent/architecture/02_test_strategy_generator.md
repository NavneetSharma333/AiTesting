# Architecture: Test Strategy Generator Module

## Goal
Generate formal, enterprise-grade test strategy from Jira issue data using GROQ LLM. Enforce deterministic output with no hallucination.

## Inputs
- `issue_data` (JSON): Jira issue object with key, summary, description, AC, type, priority
- `groq_key` (string): GROQ API key
- `groq_model` (string): Model ID (default: openai/gpt-oss-120b)

## Outputs
```json
{
  "success": true,
  "strategy": "Enterprise-grade test strategy narrative...",
  "token_usage": {
    "prompt_tokens": 150,
    "completion_tokens": 250
  },
  "error": null
}
```

## Edge Cases
1. **Missing GROQ Key** → Return error: "GROQ API key not provided"
2. **Empty Issue Data** → Include "[Not specified in Jira]" in prompt
3. **API Rate Limit** → Return error: "GROQ rate limit exceeded"
4. **Timeout** → Return error: "GROQ request timeout"

## Logic
1. Validate GROQ key is non-empty
2. Build system prompt: "You are an enterprise QA test strategy author..."
3. Build user prompt with ONLY Jira data (no invented fields)
4. Call GROQ API with `temperature=0.0` (deterministic)
5. Extract strategy text from response
6. Return structured JSON

## Behavioral Rules (CRITICAL)
- **No Hallucination**: Only synthesize from explicit Jira fields
- **Deterministic**: Use temperature 0.0 for reproducible output
- **Formal Tone**: Enterprise-grade language only
- **No Test Cases**: Strategy only, no step-by-step instructions

## Error Handling
- Catch API errors and return error message
- Log all requests to `.tmp/groq_requests.log`
