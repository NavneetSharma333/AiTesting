"""
Jira Connection Tool
Fetches issue data from Jira using REST API.
Follows: architecture/01_jira_connection.md
"""

import requests
import base64
import json
import os
from pathlib import Path

def validate_inputs(jira_url, jira_email, jira_token, issue_key):
    """Validate all required inputs."""
    if not all([jira_url, jira_email, jira_token, issue_key]):
        return False, "Jira credentials incomplete"
    return True, None

def create_basic_auth_header(email, token):
    """Create Basic Auth header for Jira."""
    credentials = f"{email}:{token}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

def sanitize_url(url):
    """Remove trailing slash from URL."""
    return url.rstrip('/')

def extract_acceptance_criteria(issue_fields):
    """Extract acceptance criteria from Jira fields."""
    # Common custom field names for AC
    ac_field_keys = [
        'customfield_10002',  # Default Jira AC field
        'customfield_10020',
        'customfield_10100',
    ]
    
    for key in ac_field_keys:
        if key in issue_fields and issue_fields[key]:
            value = issue_fields[key]
            if isinstance(value, str):
                return value
            elif isinstance(value, list):
                return '\n'.join([str(item) for item in value])
    
    return "[Not specified in Jira]"

def parse_issue_response(issue_json):
    """Parse Jira issue response into structured data."""
    fields = issue_json.get('fields', {})
    
    return {
        'key': issue_json.get('key', ''),
        'summary': fields.get('summary', '[Not specified in Jira]'),
        'description': fields.get('description', '[Not specified in Jira]'),
        'acceptanceCriteria': extract_acceptance_criteria(fields),
        'issueType': fields.get('issuetype', {}).get('name', '[Not specified in Jira]'),
        'priority': fields.get('priority', {}).get('name', '[Not specified in Jira]'),
        'labels': fields.get('labels', []),
        'status': fields.get('status', {}).get('name', '[Not specified in Jira]'),
    }

def fetch_jira_issue(jira_url, jira_email, jira_token, issue_key):
    """
    Fetch Jira issue by key.
    
    Args:
        jira_url: Base Jira URL
        jira_email: Jira account email
        jira_token: Jira API token
        issue_key: Issue key (e.g., SCRUM-8)
    
    Returns:
        (success: bool, data: dict)
    """
    # Validate inputs
    valid, error = validate_inputs(jira_url, jira_email, jira_token, issue_key)
    if not valid:
        return False, {'error': error}
    
    try:
        # Prepare request
        url = f"{sanitize_url(jira_url)}/rest/api/3/issue/{issue_key}"
        headers = {
            'Authorization': create_basic_auth_header(jira_email, jira_token),
            'Accept': 'application/json',
        }
        
        # Make request
        response = requests.get(url, headers=headers, timeout=10)
        
        # Handle errors
        if response.status_code == 404:
            return False, {'error': f'Issue {issue_key} not found'}
        elif response.status_code == 401:
            return False, {'error': 'Jira authentication failed'}
        elif not response.ok:
            return False, {'error': f'Jira API error: {response.status_code}'}
        
        # Parse response
        issue_json = response.json()
        issue_data = parse_issue_response(issue_json)
        
        # Log successful fetch
        log_path = Path('.tmp/jira_requests.log')
        log_path.parent.mkdir(exist_ok=True)
        with open(log_path, 'a') as f:
            f.write(f"✓ Fetched {issue_key}\n")
        
        return True, {'success': True, 'issue': issue_data}
    
    except requests.exceptions.Timeout:
        return False, {'error': 'Jira request timeout'}
    except requests.exceptions.ConnectionError:
        return False, {'error': 'Jira connection failed'}
    except Exception as e:
        log_path = Path('.tmp/jira_errors.log')
        log_path.parent.mkdir(exist_ok=True)
        with open(log_path, 'a') as f:
            f.write(f"✗ Error fetching {issue_key}: {str(e)}\n")
        return False, {'error': str(e)}

if __name__ == '__main__':
    # For testing
    from dotenv import load_dotenv
    load_dotenv()
    
    jira_url = os.getenv('JIRA_URL')
    jira_email = os.getenv('JIRA_EMAIL')
    jira_token = os.getenv('JIRA_TOKEN')
    issue_key = 'SCRUM-8'
    
    success, result = fetch_jira_issue(jira_url, jira_email, jira_token, issue_key)
    print(json.dumps(result, indent=2))
