"""
Flask API Backend for Jira Test Plan Generator
Exposes Python tools via REST API for React frontend consumption.
Phase 4: Stylize (UI Layer)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add tools directory to path
sys.path.insert(0, str(Path(__file__).parent / 'tools'))

from tools.orchestrator import run_pipeline

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'Jira Test Plan Generator API',
        'version': '1.0.0',
    }), 200

@app.route('/api/generate', methods=['POST'])
def generate_test_plan():
    """
    Generate test plan from Jira issue.
    
    Expected JSON payload:
    {
        "jiraUrl": "https://...",
        "jiraEmail": "...",
        "jiraToken": "...",
        "issueKey": "SCRUM-8",
        "groqKey": "...",
        "groqModel": "openai/gpt-oss-120b"  (optional)
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['jiraUrl', 'jiraEmail', 'jiraToken', 'issueKey', 'groqKey']
        missing = [field for field in required if not data.get(field)]
        
        if missing:
            return jsonify({
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        # Extract parameters
        jira_url = data.get('jiraUrl', '').strip()
        jira_email = data.get('jiraEmail', '').strip()
        jira_token = data.get('jiraToken', '').strip()
        issue_key = data.get('issueKey', '').strip()
        groq_key = data.get('groqKey', '').strip()
        groq_model = data.get('groqModel', 'openai/gpt-oss-120b').strip()
        
        # Call orchestrator pipeline
        success, result = run_pipeline(
            jira_url=jira_url,
            jira_email=jira_email,
            jira_token=jira_token,
            issue_key=issue_key,
            groq_key=groq_key,
            groq_model=groq_model,
        )
        
        if not success:
            return jsonify({
                'error': result.get('error', 'Pipeline execution failed')
            }), 500
        
        # Return success response
        return jsonify({
            'success': True,
            'issueKey': result['issueKey'],
            'issueData': result['issueData'],
            'strategy': result['strategy'],
            'testPlan': result['testPlan'],
            'filepath': result['filepath'],
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': f'Server error: {str(e)}'
        }), 500

@app.route('/api/validate', methods=['POST'])
def validate_config():
    """
    Validate Jira and GROQ configuration without full generation.
    """
    try:
        data = request.get_json()
        
        jira_url = data.get('jiraUrl', '').strip()
        jira_email = data.get('jiraEmail', '').strip()
        jira_token = data.get('jiraToken', '').strip()
        groq_key = data.get('groqKey', '').strip()
        
        errors = []
        
        # Validate Jira config
        if not jira_url:
            errors.append('Jira URL is required')
        if not jira_email:
            errors.append('Jira email is required')
        if not jira_token:
            errors.append('Jira token is required')
        
        # Validate GROQ config
        if not groq_key:
            errors.append('GROQ API key is required')
        
        if errors:
            return jsonify({
                'valid': False,
                'errors': errors,
            }), 400
        
        return jsonify({
            'valid': True,
            'message': 'All required fields are configured',
        }), 200
    
    except Exception as e:
        return jsonify({
            'error': f'Validation error: {str(e)}'
        }), 500

@app.route('/api/config-template', methods=['GET'])
def config_template():
    """Return configuration template."""
    return jsonify({
        'template': {
            'jiraUrl': 'https://your-domain.atlassian.net',
            'jiraEmail': 'your-email@example.com',
            'jiraToken': 'your-jira-api-token',
            'groqKey': 'your-groq-api-key',
            'groqModel': 'openai/gpt-oss-120b',
            'issueKey': 'SCRUM-8',
        },
        'description': 'Jira Test Plan Generator Configuration',
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"\n{'='*60}")
    print(f"Jira Test Plan Generator - Flask API")
    print(f"{'='*60}")
    print(f"Running on http://localhost:{port}")
    print(f"Debug: {debug}")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
