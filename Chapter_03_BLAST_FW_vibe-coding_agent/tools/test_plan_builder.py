"""
Test Plan Builder Tool
Synthesizes Jira issue data + strategy into a 10-section test plan.
Follows: architecture/03_test_plan_builder.md
"""

import json
from pathlib import Path
from datetime import datetime, timedelta

def build_objective(issue_data, strategy):
    """Build Objective section."""
    return f"""### Objective

Develop and execute comprehensive testing for {issue_data['summary']} (Issue: {issue_data['key']}).

**Scope Summary:** {issue_data.get('description', '[Not specified in Jira]')[:200]}...

**Success Criteria:** Ensure all acceptance criteria are met; system performs under defined conditions."""

def build_scope(issue_data):
    """Build Scope section with in-scope and out-of-scope."""
    labels = ', '.join(issue_data.get('labels', [])) or '[Not specified in Jira]'
    description = issue_data.get('description', '[Not specified in Jira]')
    
    return f"""### Scope

#### In Scope:
- Testing of {issue_data['summary']}
- Functional validation against acceptance criteria
- {issue_data.get('issueType', 'Feature')} workflows and integrations
- Validation with {', '.join(issue_data.get('labels', ['defined system labels']))} focus

**Description Context:**
{description}

#### Out of Scope:
- Third-party system integrations (unless core to this feature)
- Load testing at extreme scale (unless marked as performance-critical)
- Full security penetration testing (unless marked security-critical)
- Advanced performance profiling
- Documentation or user training

**Issue Metadata:**
- Type: {issue_data.get('issueType', '[Not specified in Jira]')}
- Priority: {issue_data.get('priority', '[Not specified in Jira]')}
- Status: {issue_data.get('status', '[Not specified in Jira]')}
"""

def build_test_strategy(strategy):
    """Build Test Strategy section incorporating focus areas and approach."""
    return f"""### Test Strategy & Approach

**Generated Strategy:**
{strategy}

**Key Testing Dimensions:**

- **Functional Testing** - Verify all acceptance criteria and feature workflows are implemented correctly
- **Integration Testing** - Ensure feature integrates properly with dependent systems
- **Regression Testing** - Validate that changes do not break existing functionality
- **Performance Testing** - Assess response times and resource utilization (if applicable)
- **Security Testing** - Identify vulnerabilities and ensure data protection (if applicable)
- **Usability Testing** - Evaluate user experience and ease of use (if applicable)
- **Compatibility Testing** - Verify behavior across browsers, devices, and platforms (if applicable)

**Testing Techniques to be Employed:**
- Black box testing (behavioral validation)
- White box testing (code path validation, if applicable)
- Automated testing (regression and functional automation)
- Exploratory testing (ad-hoc testing for edge cases)
- Manual testing (core workflows and user scenarios)
"""

def build_entry_criteria(issue_data):
    """Build Entry Criteria section."""
    return """### Entry Criteria

- Requirements are documented and approved
- Test environment is available and configured
- Acceptance criteria are clearly defined and understood by QA team
- Development build is ready for testing
- Test plan is reviewed and approved"""

def build_exit_criteria(issue_data):
    """Build Exit Criteria section."""
    ac = issue_data.get('acceptanceCriteria', '[Not specified in Jira]')
    
    return f"""### Exit Criteria

- All acceptance criteria verified and passing
- No critical defects remain open
- Test coverage: minimum 80% of user workflows
- All identified risks have been addressed or documented
- Test results documented and signed off
- Performance baseline established (if applicable)

**Acceptance Criteria to Verify:**
{ac}"""

def build_risk_analysis(issue_data):
    """Build Risk Analysis section with detailed risks."""
    priority = issue_data.get('priority', 'Medium').lower()
    issue_type = issue_data.get('issueType', 'Feature').lower()
    
    risk_mapping = {
        'critical': 'CRITICAL - This feature blocks deployment; any failure is unacceptable',
        'high': 'HIGH - Major feature; failures have significant business impact',
        'medium': 'MEDIUM - Standard feature; localized impact if failures occur',
        'low': 'LOW - Minor feature; limited business impact if failures occur',
    }
    
    risk_level = risk_mapping.get(priority, 'MEDIUM')
    
    return f"""### Risk Analysis

**Overall Risk Assessment:** {risk_level}

**Identified Risks and Mitigations:**

1. **Requirement Clarity Risk**
   - Impact: Testing may miss critical scenarios if AC are ambiguous
   - Mitigation: Validate all acceptance criteria with product owner before test execution
   - Probability: Medium | Severity: High

2. **Integration Risk**
   - Impact: Feature may fail when integrated with dependent systems
   - Mitigation: Test with production-like staging environment; coordinate integration testing
   - Probability: Medium | Severity: High

3. **Regression Risk**
   - Impact: Changes may break existing functionality
   - Mitigation: Execute regression test suite covering related features
   - Probability: Medium | Severity: Medium

4. **Environment Risk**
   - Impact: Test environment unavailable or unstable
   - Mitigation: Ensure staging environment readiness before test start; have fallback plan
   - Probability: Low | Severity: High

5. **Resource Risk**
   - Impact: Insufficient QA resources or expertise for testing
   - Mitigation: Pre-identify team members; provide training on feature specifics
   - Probability: Low | Severity: Medium

6. **Data Risk**
   - Impact: Test data unavailable or compromised
   - Mitigation: Pre-create comprehensive test data sets; implement data cleanup procedures
   - Probability: Low | Severity: Medium"""

def build_test_metrics(issue_data):
    """Build Test Metrics & KPIs section."""
    return """### Test Metrics & KPIs

**Quality Metrics:**
- **Test Case Pass Rate:** % of test cases passing on first execution
- **Defect Escape Rate:** % of defects found after release (tracked for process improvement)
- **Requirements Coverage:** % of acceptance criteria covered by test cases (target: 100%)
- **Defect Density:** Number of defects per 1000 lines of code (when applicable)
- **Mean Time to Defect Resolution:** Average time from defect discovery to closure

**Execution Metrics:**
- **Test Execution Rate:** Test cases executed per day (productivity metric)
- **Test Cycle Time:** Total duration from test start to completion
- **Defect Detection Rate:** Defects found per day (indicates test thoroughness)
- **Automation Coverage:** % of test cases automated (for regression suite)

**Schedule Metrics:**
- **Planned vs. Actual:** Actual test execution time vs. planned estimates
- **Risk-based Coverage:** % of high-risk areas tested vs. planned
- **Blockers and Issues:** Time blocked waiting for environment, builds, or clarifications

**Success Criteria:**
- All acceptance criteria validated and passing
- No critical or high-severity defects outstanding
- Test coverage: Minimum 80% of requirements
- Test results documented and reviewed by stakeholders"""

def build_resource_requirements(issue_data):
    """Build Resource Requirements section."""
    return """### Resource Requirements

**Team Composition:**
- **QA Lead/Manager** - 1 FTE (planning, coordination, stakeholder communication)
- **QA Engineers** - 2-3 FTEs (manual test execution, test case creation)
- **QA Automation Engineer** - 1 FTE (optional, for regression automation)
- **DevOps/Infrastructure Support** - 0.5 FTE (environment provisioning and maintenance)
- **Product Owner/Business Analyst** - 0.5 FTE (requirement clarifications)

**Tools & Infrastructure:**
- **Test Management:** JIRA for test case tracking and defect logging
- **Test Automation:** Selenium, Appium, or equivalent for automated testing
- **Performance Testing:** JMeter or LoadRunner (if performance testing in scope)
- **Version Control:** Git for test script versioning
- **CI/CD Pipeline:** Jenkins or equivalent for automated test execution
- **Staging Environment:** Fully configured environment mirroring production
- **Test Data:** Production-like database with anonymized data for testing

**Skills & Knowledge:**
- QA testing expertise and methodologies
- Feature domain knowledge (product/business context)
- Automation scripting and debugging
- API testing and integration knowledge (if applicable)
- Performance testing tools expertise (if in scope)
- Security testing and vulnerability assessment (if in scope)"""

def build_schedule(issue_data):
    """Build Schedule & Timeline section."""
    today = datetime.now()
    end_date = today + timedelta(days=21)  # 3-week standard cycle
    
    return f"""### Schedule & Timeline

**Testing Schedule:**
- **Estimated Duration:** 3 weeks (21 calendar days)
- **Start Date:** {today.strftime('%Y-%m-%d')}
- **Target Completion:** {end_date.strftime('%Y-%m-%d')}

**Testing Phases:**

| Phase | Duration | Dates | Activities |
|-------|----------|-------|------------|
| **Planning & Preparation** | 2-3 days | {today.strftime('%Y-%m-%d')} - {(today + timedelta(days=2)).strftime('%Y-%m-%d')} | Test case design, environment setup, resource allocation |
| **Test Execution (Functional)** | 7-8 days | {(today + timedelta(days=3)).strftime('%Y-%m-%d')} - {(today + timedelta(days=10)).strftime('%Y-%m-%d')} | Execute test cases, log defects, perform exploratory testing |
| **Defect Resolution & Re-testing** | 5-6 days | {(today + timedelta(days=11)).strftime('%Y-%m-%d')} - {(today + timedelta(days=16)).strftime('%Y-%m-%d')} | Defect retesting, regression testing, stability assessment |
| **Final Testing & Sign-off** | 2-3 days | {(today + timedelta(days=17)).strftime('%Y-%m-%d')} - {(today + timedelta(days=19)).strftime('%Y-%m-%d')} | Final regression run, UAT support, test closure |
| **Reporting & Closure** | 1 day | {end_date.strftime('%Y-%m-%d')} | Final report, metrics compilation, lessons learned |

**Critical Milestones:**
- Test environment ready: {(today + timedelta(days=2)).strftime('%Y-%m-%d')}
- Functional testing complete: {(today + timedelta(days=10)).strftime('%Y-%m-%d')}
- All defects resolved/documented: {(today + timedelta(days=16)).strftime('%Y-%m-%d')}
- Test sign-off: {end_date.strftime('%Y-%m-%d')}"""


def build_assumptions(issue_data):
    """Build Assumptions & Dependencies section."""
    return """### Assumptions & Dependencies

**Assumptions:**
- All requirements are complete and approved
- Test environment mirrors production configuration
- Acceptance criteria are the sole success measure
- Development will provide stable builds for testing
- Team members remain available throughout test cycle

**Dependencies:**
- Development completion of feature code
- Test environment availability and maintenance
- Timely resolution of blocking defects
- Access to required test data
- Third-party API/service availability (if applicable)"""

def build_test_plan_markdown(issue_key, issue_data, strategy):
    """Build complete 10-section test plan in Markdown."""
    sections = [
        f"# Test Plan: {issue_data['summary']}",
        f"\n**Jira Issue:** {issue_key}  \n**Date Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  \n**Status:** {issue_data.get('status', '[Not specified in Jira]')}\n",
        
        "\n## 1. Objective\n",
        build_objective(issue_data, strategy),
        
        "\n## 2. Scope\n",
        build_scope(issue_data),
        
        "\n## 3. Test Strategy\n",
        build_test_strategy(strategy),
        
        "\n## 4. Entry Criteria\n",
        build_entry_criteria(issue_data),
        
        "\n## 5. Exit Criteria\n",
        build_exit_criteria(issue_data),
        
        "\n## 6. Risk Analysis\n",
        build_risk_analysis(issue_data),
        
        "\n## 7. Test Metrics & KPIs\n",
        build_test_metrics(issue_data),
        
        "\n## 8. Resource Requirements\n",
        build_resource_requirements(issue_data),
        
        "\n## 9. Schedule & Timeline\n",
        build_schedule(issue_data),
        
        "\n## 10. Assumptions & Dependencies\n",
        build_assumptions(issue_data),
        
        "\n---\n*Generated by BLAST Framework - Jira Test Plan Generator*",
    ]
    
    return ''.join(sections)

def save_test_plan(test_plan_markdown, issue_key):
    """Save test plan to local markdown file."""
    tmp_dir = Path('.tmp')
    tmp_dir.mkdir(exist_ok=True)
    
    filename = f"test_plan_{issue_key.replace('-', '_')}.md"
    filepath = tmp_dir / filename
    
    with open(filepath, 'w') as f:
        f.write(test_plan_markdown)
    
    return str(filepath)

def build_test_plan(issue_key, issue_data, strategy):
    """
    Build and save complete test plan.
    
    Args:
        issue_key: Jira issue key
        issue_data: Parsed Jira issue object
        strategy: Generated test strategy text
    
    Returns:
        (success: bool, data: dict with filepath or error)
    """
    try:
        # Build markdown
        markdown = build_test_plan_markdown(issue_key, issue_data, strategy)
        
        # Save to file
        filepath = save_test_plan(markdown, issue_key)
        
        return True, {
            'success': True,
            'testPlan': markdown,
            'filepath': filepath,
        }
    
    except Exception as e:
        log_path = Path('.tmp/builder_errors.log')
        log_path.parent.mkdir(exist_ok=True)
        with open(log_path, 'a') as f:
            f.write(f"✗ Test plan build failed: {str(e)}\n")
        return False, {'error': str(e)}

if __name__ == '__main__':
    # For testing
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
    
    mock_strategy = "Test strategy focuses on validating user authentication flow..."
    
    success, result = build_test_plan('SCRUM-8', mock_issue, mock_strategy)
    if success:
        print(f"✓ Test plan saved to: {result['filepath']}")
    else:
        print(f"✗ Error: {result['error']}")
