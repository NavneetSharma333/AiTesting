"""
Test Strategy Generator Tool
Generates enterprise-grade test strategy using GROQ LLM.
Follows: architecture/02_test_strategy_generator.md
"""

import requests
import json
import os
from pathlib import Path

def validate_groq_key(groq_key):
    """Validate GROQ API key."""
    if not groq_key or not groq_key.strip():
        return False, "GROQ API key not provided"
    return True, None

def build_system_prompt():
    """Build system prompt for test strategy generation."""
    return """You are an enterprise-grade QA test strategy author with ISO 29119 expertise.
Your task is to generate formal, professional test strategies based exclusively on Jira issue data.

CRITICAL RULES:
1. Use ONLY data explicitly provided in the Jira issue.
2. Do NOT invent test scenarios, metrics, or timelines.
3. If a field is missing, state it clearly as "[Not specified in Jira]".
4. Maintain formal, professional tone throughout.
5. Focus on high-level strategy, NOT step-by-step test cases.
6. Output should be concise and deterministic.

REFERENCE FORMAT (use this structure):
- **Objective:** Clear purpose of testing
- **Scope (In scope/Out of scope):** What is included and excluded
- **Focus Areas:** Key testing dimensions (functional, performance, security, usability, etc.)
- **Approach:** Testing methods and techniques to be used
- **Deliverables:** What test artifacts will be produced
- **Team & Schedule:** Resource requirements and timeline
- **Entry & Exit Criteria:** Conditions for starting and ending testing
- **Risks:** Potential obstacles and mitigation strategies"""

def build_user_prompt(issue_data):
    """Build user prompt with Jira issue data."""
    return f"""Generate a formal, enterprise-grade test strategy for the following Jira issue:

**Issue Key:** {issue_data.get('key', 'Unknown')}
**Summary:** {issue_data.get('summary', '[Not specified in Jira]')}
**Issue Type:** {issue_data.get('issueType', '[Not specified in Jira]')}
**Priority:** {issue_data.get('priority', '[Not specified in Jira]')}
**Status:** {issue_data.get('status', '[Not specified in Jira]')}
**Labels:** {', '.join(issue_data.get('labels', [])) or '[Not specified in Jira]'}

**Description:**
{issue_data.get('description', '[Not specified in Jira]')}

**Acceptance Criteria:**
{issue_data.get('acceptanceCriteria', '[Not specified in Jira]')}

Based ONLY on this information, provide a comprehensive test strategy that covers:

1. **Objective** - Clear purpose of testing this feature
2. **Scope** - What is in scope and out of scope for testing
3. **Focus Areas** - Key testing dimensions (functional correctness, performance, security, usability, compatibility, etc.)
4. **Approach** - Testing techniques and methods to be employed
5. **Deliverables** - Test artifacts to be produced
6. **Team & Schedule** - Estimated resources and timeline
7. **Entry & Exit Criteria** - Conditions for starting and completing testing
8. **Risks** - Potential obstacles and mitigation strategies

Use professional language. Do NOT invent details not in Jira data. Use "[Not specified in Jira]" for missing information."""

def call_groq_api(groq_key, groq_model, system_prompt, user_prompt):
    """Call GROQ API (OpenAI-compatible endpoint)."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    
    headers = {
        'Authorization': f'Bearer {groq_key}',
        'Content-Type': 'application/json',
    }
    
    payload = {
        'model': groq_model,
        'messages': [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt},
        ],
        'temperature': 0.0,  # Deterministic output
        'max_tokens': 800,
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 401:
            return False, {'error': 'GROQ authentication failed'}
        elif response.status_code == 429:
            return False, {'error': 'GROQ rate limit exceeded'}
        elif not response.ok:
            return False, {'error': f'GROQ API error: {response.status_code}'}
        
        result = response.json()
        strategy_text = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        if not strategy_text:
            return False, {'error': 'No strategy text returned from GROQ'}
        
        return True, {
            'success': True,
            'strategy': strategy_text.strip(),
            'token_usage': result.get('usage', {}),
        }
    
    except requests.exceptions.Timeout:
        return False, {'error': 'GROQ request timeout'}
    except requests.exceptions.ConnectionError:
        return False, {'error': 'GROQ connection failed'}
    except Exception as e:
        return False, {'error': str(e)}

def generate_strategy(issue_data, groq_key, groq_model='openai/gpt-oss-120b'):
    """
    Generate test strategy from Jira issue data.
    
    Args:
        issue_data: Parsed Jira issue object
        groq_key: GROQ API key
        groq_model: Model ID (default: openai/gpt-oss-120b)
    
    Returns:
        (success: bool, data: dict)
    """
    # Validate GROQ key
    valid, error = validate_groq_key(groq_key)
    if not valid:
        return False, {'error': error}
    
    try:
        # Build prompts
        system_prompt = build_system_prompt()
        user_prompt = build_user_prompt(issue_data)
        
        # Call GROQ API
        success, result = call_groq_api(groq_key, groq_model, system_prompt, user_prompt)
        
        if not success:
            log_path = Path('.tmp/groq_errors.log')
            log_path.parent.mkdir(exist_ok=True)
            with open(log_path, 'a') as f:
                f.write(f"✗ Strategy generation failed: {result.get('error')}\n")
            return False, result
        
        # Log successful generation
        log_path = Path('.tmp/groq_requests.log')
        log_path.parent.mkdir(exist_ok=True)
        with open(log_path, 'a') as f:
            f.write(f"✓ Generated strategy for {issue_data.get('key')}\n")
        
        return True, result
    
    except Exception as e:
        log_path = Path('.tmp/groq_errors.log')
        log_path.parent.mkdir(exist_ok=True)
        with open(log_path, 'a') as f:
            f.write(f"✗ Exception: {str(e)}\n")
        return False, {'error': str(e)}

if __name__ == '__main__':
    # For testing
    from dotenv import load_dotenv
    load_dotenv()
    
    # Mock issue data
    mock_issue = {
        'key': 'SCRUM-8',
        'summary': 'User Login Feature',
        'description': 'Implement secure user login with email and password',
        'acceptanceCriteria': '- User can login with valid credentials\n- Session persists across page refresh\n- Invalid credentials show error',
        'issueType': 'Story',
        'priority': 'High',
        'status': 'In Progress',
        'labels': ['backend', 'authentication'],
    }
    
    groq_key = os.getenv('GROQ_KEY')
    success, result = generate_strategy(mock_issue, groq_key)
    print(json.dumps(result, indent=2))
