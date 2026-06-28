import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5178;

app.use(cors());
app.use(express.json());

function normalizeUrl(value) {
  return value.trim().replace(/\/$/, '');
}

function createBasicAuth(email, token) {
  const raw = `${email}:${token}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}

function flattenJiraText(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(flattenJiraText).join('');
  if (typeof node === 'object') {
    if (node.text) return node.text;
    if (node.content) return flattenJiraText(node.content);
    return Object.values(node).map(flattenJiraText).join('');
  }
  return '';
}

function extractField(issue, keys) {
  if (!issue) return null;
  for (const key of keys) {
    const value = issue.fields?.[key] ?? issue[key];
    if (value != null && value !== '') {
      return value;
    }
  }
  return null;
}

function formatFieldValue(raw) {
  if (raw == null || raw === '') {
    return '[Not specified in Jira]';
  }
  if (typeof raw === 'string') {
    return raw.trim();
  }
  const flattened = flattenJiraText(raw).trim();
  return flattened || JSON.stringify(raw, null, 2);
}

function formatAcceptanceCriteria(raw) {
  const text = formatFieldValue(raw);
  if (text === '[Not specified in Jira]') {
    return text;
  }
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return lines.map(line => line.replace(/^[\-\*\u2022\s]+/, '')).join('\n- ');
}

async function fetchJiraIssue(jiraUrl, jiraEmail, jiraToken, issueKey) {
  const normalizedUrl = normalizeUrl(jiraUrl);
  const jqlUrl = `${normalizedUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}`;
  const jiraResponse = await fetch(jqlUrl, {
    method: 'GET',
    headers: {
      Authorization: createBasicAuth(jiraEmail, jiraToken),
      Accept: 'application/json'
    }
  });
  if (!jiraResponse.ok) {
    const text = await jiraResponse.text();
    throw { status: jiraResponse.status, message: `Jira fetch failed: ${text}` };
  }
  const issueJson = await jiraResponse.json();
  return {
    key: issueJson.key,
    summary: formatFieldValue(extractField(issueJson, ['summary', 'customfield_10000'])),
    description: formatFieldValue(extractField(issueJson, ['description', 'customfield_10001'])),
    acceptanceCriteria: formatAcceptanceCriteria(extractField(issueJson, ['customfield_10002', 'customfield_10100', 'customfield_10003'])),
    issueType: issueJson.fields?.issuetype?.name || '[Not specified in Jira]',
    priority: issueJson.fields?.priority?.name || '[Not specified in Jira]',
    labels: issueJson.fields?.labels || []
  };
}

async function callGroq(groqKey, groqModel, prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: groqModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
      temperature: 0.0
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw { status: response.status, message: `GROQ request failed: ${errorText}` };
  }
  const completion = await response.json();
  const content = completion.choices?.[0]?.message?.content?.trim() || '';
  return content
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[^\n]*/i, '')
    .trim();
}

function validateConfig(jiraUrl, jiraEmail, jiraToken, issueKey, groqKey) {
  if (!jiraUrl || !jiraEmail || !jiraToken || !issueKey || !groqKey) {
    return 'Missing required settings or issue key.';
  }
  return null;
}

function buildTestPlanMarkdown(issueData, testPlanContent) {
  const issueType = issueData.issueType || '[Not specified in Jira]';
  const priority = issueData.priority || '[Not specified in Jira]';

  return `# Test Plan — ${issueData.summary || '[Not specified in Jira]'}

**${issueData.key}** · ${issueType} · ${priority} · To Do

---

${testPlanContent}

---

*Lightweight React · credentials stay local*`;
}

function buildStrategyPrompt(issueData) {
  return `You are a QA Lead / Manager. Using only the Jira issue data provided, produce a test strategy narrative. Cover these areas: Objective, Scope, Test Strategy, Entry Criteria, Exit Criteria, Risks & Mitigations, Defect Reporting, Test Environments, Test Deliverables, and Test Schedule. Do not generate individual test cases. If any field is missing, state that it is not specified in Jira. Output only the strategy narrative.

Jira Issue Data:
- Summary: ${issueData.summary}
- Description: ${issueData.description}
- Acceptance Criteria: ${issueData.acceptanceCriteria}
- Issue Type: ${issueData.issueType}
- Priority: ${issueData.priority}
- Labels: ${issueData.labels.join(', ')}`;
}

function buildTestPlanPrompt(issueData) {
  return `You are a Senior QA Lead. Generate a complete, industry-standard Test Plan document in markdown. Include ALL sections below in order. Be specific — derive content from the Jira issue data. Output real content, not templates.

## 1. Test Overview
3-4 paragraphs: feature summary, release context, testing mission, key stakeholders.

## 2. Test Objectives
5-8 measurable objectives derived from acceptance criteria.

## 3. Features to Be Tested
| Feature / Function | Description | Priority | Risk Level | Automation Potential |

List each feature, function, workflow, integration point from the Jira issue. Rate priority, risk, and automation potential.

## 4. Features Not to Be Tested
What is out of scope and why.

## 5. Test Levels & Test Types
| Test Level | Scope | Who Executes | When | Entry Criteria | Exit Criteria |
| Test Type | Objective | Techniques Used | Tools |

Cover Unit, Integration, System, UAT levels and Functional, Regression, Smoke, Negative, Boundary, Usability types.

## 6. Entry Criteria
Conditions required before testing starts.

## 7. Exit Criteria
Conditions for testing to be complete.

## 8. Suspension Criteria
When testing halts and what resumes it.

## 9. Test Deliverables
List all artifacts: test plan, cases, execution report, defect report, closure report, automation scripts.

## 10. Test Environment Requirements
| Environment | Purpose | Configuration | Setup Steps |

Cover Dev, QA/Staging, UAT, Production.

## 11. Test Data Requirements
Specific data sets needed and how they are created.

## 12. Estimation & Schedule
| Phase | Tasks | Estimated Effort | Duration | Deliverables |

Cover Planning, Design, Execution, Retesting, Closure with person-hour estimates.

## 13. Testing Resources Allocation
| Resource / Role | Test Type | Allocation (Hours) | Responsibilities |
|-----------------|-----------|-------------------|------------------|
| Test Lead / QA Lead | Overall coordination | | |
| QA Engineer | Functional Testing | | |
| QA Engineer | Negative Testing | | |
| QA Engineer | Boundary Value Analysis | | |
| QA Engineer | Usability Testing | | |
| Automation Engineer | Regression Testing | | |
| Automation Engineer | Smoke / Sanity Testing | | |
| Business Analyst | UAT support | | |
| Subject Matter Expert | Domain validation | | |

For each row, fill in the estimated effort in person-hours based on the complexity implied by the Jira issue. Total all hours at the bottom.

## 14. Assumptions
8-10 assumptions: environment, data, capacity, tools, stakeholders, builds, requirements.

## 15. Risks & Mitigation
| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy | Contingency Plan | Owner |

5-7 specific risks with probability (H/M/L), impact (H/M/L), mitigation, contingency, owner.

## 16. Test References
- Jira issue / user stories
- Figma designs / UI mockups
- API docs / Swagger
- Technical design docs (HLD/LLD)
- Test management tool
- Automation framework
- CI/CD pipeline references
- Industry standards (ISTQB, ISO)
- Compliance / regulatory references

## 17. Approvals
| Role | Name | Date | Signature |

QA Lead, QA Manager, Project Manager, Dev Lead, BA.

Jira Issue:
- Summary: ${issueData.summary}
- Description: ${issueData.description}
- Acceptance Criteria: ${issueData.acceptanceCriteria}
- Issue Type: ${issueData.issueType}
- Priority: ${issueData.priority}
- Labels: ${issueData.labels.join(', ')}`;
}

function buildTestCasesPrompt(issueData) {
  return `You are a Senior QA Engineer. Generate a comprehensive set of test cases for the following Jira issue. Return ONLY a CSV with NO header row and NO markdown formatting. Each row must follow this exact format without quotes:
TC_ID,Module,Test Scenario,Test Steps,Expected Result,Priority,Category

Generate between 10-20 test cases covering functional, negative, boundary, and integration scenarios. Use the issue summary, description, and acceptance criteria to derive test cases.

Jira Issue:
- Summary: ${issueData.summary}
- Description: ${issueData.description}
- Acceptance Criteria: ${issueData.acceptanceCriteria}
- Issue Type: ${issueData.issueType}
- Priority: ${issueData.priority}`;
}

function buildRcaPrompt(issueData) {
  return `You are a Senior QA Lead performing a Root Cause Analysis (RCA) for the following Jira issue. Output a comprehensive RCA document in professional markdown with ALL sections below. Be specific — derive all content from the Jira issue data.

## 1. Defect / Failure Description
Describe the feature or issue being analyzed, its impact on the system, and the business impact if this were to fail in production.

## 2. Timeline of Events
| Timestamp | Event | Action Taken |
|-----------|-------|--------------|
| | | |

Provide a realistic timeline based on the issue lifecycle.

## 3. Root Cause Analysis
### 3.1 Primary Cause
Identify the most likely root cause. Explain the chain of events leading to the defect. Use the "5 Whys" technique to drill down to the fundamental cause.

### 3.2 Contributing Factors
List 3-5 contributing factors (process gaps, environmental issues, human error, tool limitations, requirement ambiguity).

### 3.3 Why-Because Analysis
| Why? | Because | Evidence |
|------|---------|----------|
| | | |

Build a causal chain of 5-7 linked why-because pairs.

## 4. Impact Analysis
| Impact Area | Severity | Description | Affected Components |
|-------------|----------|-------------|---------------------|
| Functional | | | |
| Performance | | | |
| Security | | | |
| User Experience | | | |
| Business | | | |

Rate each area's severity (Critical/Major/Minor).

## 5. Probability Assessment
| Factor | Probability | Justification |
|--------|-------------|---------------|
| Occurrence | | |
| Detection | | |
| Recurrence | | |

Rate each as High/Medium/Low with justification.

## 6. Risk Assessment Matrix
| Risk ID | Risk Description | Probability | Impact | Risk Level | Priority |
|---------|-----------------|-------------|--------|------------|----------|
| R1 | | | | | |

Create 5-7 risks. Risk Level = function of Probability × Impact. Priority = High/Medium/Low.

## 7. Corrective Actions
| Action ID | Action Description | Owner | Target Date | Status |
|-----------|-------------------|-------|-------------|--------|
| CA1 | | | | |

List 5-7 specific corrective actions to address the root causes identified.

## 8. Preventive Measures
List 3-5 preventive measures to avoid similar issues in future releases. Include process improvements, automation opportunities, and testing enhancements.

## 9. Lessons Learned
Summarize 3-5 key takeaways from this analysis. What went well, what could be improved, and what processes should change.

## 10. Recommendations
Provide 3-5 actionable recommendations for the project team, including specific process changes, tool improvements, or testing strategy adjustments.

Jira Issue:
- Summary: ${issueData.summary}
- Description: ${issueData.description}
- Acceptance Criteria: ${issueData.acceptanceCriteria}
- Issue Type: ${issueData.issueType}
- Priority: ${issueData.priority}
- Labels: ${issueData.labels.join(', ')}`;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Jira - STLC Agent API', version: '1.0.0' });
});

app.post('/api/validate', (req, res) => {
  const { jiraUrl, jiraEmail, jiraToken, groqKey } = req.body;
  const errors = [];
  if (!jiraUrl) errors.push('Jira URL is required');
  if (!jiraEmail) errors.push('Jira email is required');
  if (!jiraToken) errors.push('Jira token is required');
  if (!groqKey) errors.push('GROQ API key is required');
  if (errors.length > 0) return res.status(400).json({ valid: false, errors });
  return res.json({ valid: true, message: 'Configuration is valid.' });
});

app.get('/api/config-template', (req, res) => {
  res.json({
    template: {
      jiraUrl: 'https://your-domain.atlassian.net',
      jiraEmail: 'your-email@example.com',
      jiraToken: 'your-jira-api-token',
      groqKey: 'your-groq-api-key',
      groqModel: 'qwen/qwen3.6-27b',
      issueKey: 'SCRUM-8'
    },
    description: 'Jira Test Plan Generator configuration template'
  });
});

app.post('/api/generate', async (req, res) => {
  try {
    const { jiraUrl, jiraEmail, jiraToken, issueKey, groqKey, groqModel } = req.body;
    const err = validateConfig(jiraUrl, jiraEmail, jiraToken, issueKey, groqKey);
    if (err) return res.status(400).json({ error: err });

    const issueData = await fetchJiraIssue(jiraUrl, jiraEmail, jiraToken, issueKey);
    const strategyText = await callGroq(groqKey, groqModel, buildStrategyPrompt(issueData));
    if (!strategyText) return res.status(500).json({ error: 'No strategy returned from GROQ.' });

    const testPlan = buildTestPlanMarkdown(issueData, strategyText);
    return res.json({ strategy: strategyText, testPlan, issueData });
  } catch (ex) {
    return res.status(ex.status || 500).json({ error: ex.message || 'Unexpected error' });
  }
});

app.post('/api/generate/test-plan', async (req, res) => {
  try {
    const { jiraUrl, jiraEmail, jiraToken, issueKey, groqKey, groqModel } = req.body;
    const err = validateConfig(jiraUrl, jiraEmail, jiraToken, issueKey, groqKey);
    if (err) return res.status(400).json({ error: err });

    const issueData = await fetchJiraIssue(jiraUrl, jiraEmail, jiraToken, issueKey);
    const testPlanText = await callGroq(groqKey, groqModel, buildTestPlanPrompt(issueData));
    if (!testPlanText) return res.status(500).json({ error: 'No test plan returned from GROQ.' });

    const testPlan = buildTestPlanMarkdown(issueData, testPlanText);
    const fileName = `test-plan-${issueKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    res.setHeader('Content-Type', 'text/markdown;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(testPlan);
  } catch (ex) {
    return res.status(ex.status || 500).json({ error: ex.message || 'Unexpected error' });
  }
});

app.post('/api/generate/test-cases', async (req, res) => {
  try {
    const { jiraUrl, jiraEmail, jiraToken, issueKey, groqKey, groqModel } = req.body;
    const err = validateConfig(jiraUrl, jiraEmail, jiraToken, issueKey, groqKey);
    if (err) return res.status(400).json({ error: err });

    const issueData = await fetchJiraIssue(jiraUrl, jiraEmail, jiraToken, issueKey);
    const csvContent = await callGroq(groqKey, groqModel, buildTestCasesPrompt(issueData));
    if (!csvContent) return res.status(500).json({ error: 'No test cases returned from GROQ.' });

    const header = 'TC_ID,Module,Test Scenario,Test Steps,Expected Result,Priority,Category';
    const lines = csvContent.split('\n').filter(l => l.trim() && !l.startsWith('TC_ID'));
    const fullCsv = `${header}\n${lines.join('\n')}`;
    const fileName = `test-cases-${issueKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send('\uFEFF' + fullCsv);
  } catch (ex) {
    return res.status(ex.status || 500).json({ error: ex.message || 'Unexpected error' });
  }
});

app.post('/api/generate/rca', async (req, res) => {
  try {
    const { jiraUrl, jiraEmail, jiraToken, issueKey, groqKey, groqModel } = req.body;
    const err = validateConfig(jiraUrl, jiraEmail, jiraToken, issueKey, groqKey);
    if (err) return res.status(400).json({ error: err });

    const issueData = await fetchJiraIssue(jiraUrl, jiraEmail, jiraToken, issueKey);
    const rcaContent = await callGroq(groqKey, groqModel, buildRcaPrompt(issueData));
    if (!rcaContent) return res.status(500).json({ error: 'No RCA content returned from GROQ.' });

    const fullDoc = `# Root Cause Analysis\n\n**Issue:** ${issueData.key} - ${issueData.summary}\n**Generated:** ${new Date().toISOString()}\n**Priority:** ${issueData.priority}\n**Issue Type:** ${issueData.issueType}\n\n---\n\n${rcaContent}\n\n---\n\n*Lightweight React · credentials stay local*`;
    const fileName = `root-cause-analysis-${issueKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;

    res.setHeader('Content-Type', 'text/markdown;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(fullDoc);
  } catch (ex) {
    return res.status(ex.status || 500).json({ error: ex.message || 'Unexpected error' });
  }
});

if (!process.env.VERCEL) {
  app.get('/', (req, res) => {
    res.redirect('http://localhost:5173/');
  });

  app.listen(port, () => {
    console.log(`Jira - STLC Agent API running on http://localhost:${port}`);
  });
}

export default app;
