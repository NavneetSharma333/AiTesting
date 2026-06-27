"""
Orchestrator: Main Pipeline
Coordinates Jira connection, strategy generation, and test plan building.
This is Layer 2 (Navigation/Decision Making) of the BLAST framework.
"""

import sys
import json
from pathlib import Path

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent / 'tools'))

from jira_connector import fetch_jira_issue
from test_strategy_generator import generate_strategy
from test_plan_builder import build_test_plan

def run_pipeline(jira_url, jira_email, jira_token, issue_key, groq_key, groq_model='openai/gpt-oss-120b'):
    """
    Execute complete test plan generation pipeline.
    
    Sequence:
    1. Fetch Jira issue
    2. Generate test strategy
    3. Build test plan
    
    Args:
        jira_url: Jira base URL
        jira_email: Jira email
        jira_token: Jira API token
        issue_key: Jira issue key
        groq_key: GROQ API key
        groq_model: GROQ model ID
    
    Returns:
        (success: bool, pipeline_result: dict)
    """
    
    print(f"\n{'='*60}")
    print(f"BLAST Test Plan Generator - Pipeline Execution")
    print(f"{'='*60}\n")
    
    # PHASE 2: LINK - Test Connectivity
    print("[PHASE 2] Testing Jira Connection...")
    success, jira_result = fetch_jira_issue(jira_url, jira_email, jira_token, issue_key)
    
    if not success:
        print(f"✗ Jira connection failed: {jira_result.get('error')}")
        return False, jira_result
    
    print(f"✓ Jira connection successful")
    issue_data = jira_result['issue']
    print(f"  Issue: {issue_data['key']} - {issue_data['summary']}")
    
    # PHASE 3: ARCHITECT - Generate Strategy
    print(f"\n[PHASE 3] Generating Test Strategy...")
    success, strategy_result = generate_strategy(issue_data, groq_key, groq_model)
    
    if not success:
        print(f"✗ Strategy generation failed: {strategy_result.get('error')}")
        return False, strategy_result
    
    print(f"✓ Strategy generated successfully")
    strategy_text = strategy_result['strategy']
    token_usage = strategy_result.get('token_usage', {})
    print(f"  Tokens: {token_usage.get('prompt_tokens', '?')} prompt + {token_usage.get('completion_tokens', '?')} completion")
    
    # Build Test Plan
    print(f"\n[PHASE 3] Building Test Plan...")
    success, plan_result = build_test_plan(issue_key, issue_data, strategy_text)
    
    if not success:
        print(f"✗ Test plan build failed: {plan_result.get('error')}")
        return False, plan_result
    
    print(f"✓ Test plan built successfully")
    filepath = plan_result['filepath']
    print(f"  Saved to: {filepath}")
    
    # Success
    print(f"\n{'='*60}")
    print(f"✓ Pipeline Execution Complete!")
    print(f"{'='*60}\n")
    
    return True, {
        'success': True,
        'issueKey': issue_key,
        'issueData': issue_data,
        'strategy': strategy_text,
        'testPlan': plan_result['testPlan'],
        'filepath': filepath,
    }

if __name__ == '__main__':
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    jira_url = os.getenv('JIRA_URL')
    jira_email = os.getenv('JIRA_EMAIL')
    jira_token = os.getenv('JIRA_TOKEN')
    groq_key = os.getenv('GROQ_KEY')
    issue_key = 'SCRUM-8'
    
    success, result = run_pipeline(jira_url, jira_email, jira_token, issue_key, groq_key)
    
    if success:
        print(f"\n✓ Test plan generated successfully!")
        print(f"Result saved to: {result['filepath']}")
    else:
        print(f"\n✗ Pipeline failed: {result.get('error')}")
        sys.exit(1)
