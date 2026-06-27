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

function buildPrompt(issueData) {
  return `You are an enterprise-grade test strategy author. Using only the Jira issue data provided, produce a formal test strategy narrative with a professional tone. Do not generate individual test cases. Use the exact issue summary, description, acceptance criteria, issue type, priority, and labels. If any field is missing, state that it is not specified in Jira. Output only the strategy narrative.`;
}

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Jira Test Strategy API',
    version: '1.0.0'
  });
});

app.post('/api/validate', (req, res) => {
  const { jiraUrl, jiraEmail, jiraToken, groqKey } = req.body;
  const errors = [];

  if (!jiraUrl) errors.push('Jira URL is required');
  if (!jiraEmail) errors.push('Jira email is required');
  if (!jiraToken) errors.push('Jira token is required');
  if (!groqKey) errors.push('GROQ API key is required');

  if (errors.length > 0) {
    return res.status(400).json({ valid: false, errors });
  }

  return res.json({ valid: true, message: 'Configuration is valid.' });
});

app.get('/api/config-template', (req, res) => {
  res.json({
    template: {
      jiraUrl: 'https://your-domain.atlassian.net',
      jiraEmail: 'your-email@example.com',
      jiraToken: 'your-jira-api-token',
      groqKey: 'your-groq-api-key',
      groqModel: 'openai/gpt-oss-120b',
      issueKey: 'SCRUM-8'
    },
    description: 'Jira Test Plan Generator configuration template'
  });
});

function buildTestPlanMarkdown(issueData, strategy) {
  const description = formatFieldValue(issueData.description);
  const acceptanceCriteria = issueData.acceptanceCriteria === '[Not specified in Jira]'
    ? issueData.acceptanceCriteria
    : `- ${issueData.acceptanceCriteria.replace(/\n/g, '\n- ')}`;

  const labels = issueData.labels && issueData.labels.length > 0
    ? issueData.labels.join(', ')
    : '[Not specified in Jira]';

  const riskLevel = {
    Critical: 'CRITICAL - This feature blocks deployment; any failure is unacceptable.',
    High: 'HIGH - Major feature; failures have significant business impact.',
    Medium: 'MEDIUM - Standard feature; localized impact if failures occur.',
    Low: 'LOW - Minor feature; limited business impact if failures occur.'
  }[issueData.priority] || 'MEDIUM - Standard feature; localized impact if failures occur.';

  const issueType = issueData.issueType || '[Not specified in Jira]';
  const priority = issueData.priority || '[Not specified in Jira]';

  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return `# Test Plan: ${issueData.summary || '[Not specified in Jira]'}\n\n**Jira Issue:** ${issueData.key}\n**Date Generated:** ${new Date().toISOString()}\n**Priority:** ${priority}\n**Issue Type:** ${issueType}\n**Labels:** ${labels}\n\n---\n\n## 1. Objective\n\nDevelop and execute a formal test plan for ${issueData.summary || '[Not specified in Jira]'}. This plan is based on the Jira issue details and the acceptance criteria provided.\n\n## 2. Scope\n\n**In Scope:**\n- Validation of the feature described in the Jira issue\n- Verification of all acceptance criteria\n- Functional workflows and integrations implied by the issue\n- Quality validation for the target release stream\n\n**Out of Scope:**\n- Exploratory test cases outside the stated issue scope\n- Non-functional load testing beyond standard regression checks\n- Security penetration testing unless explicitly requested\n- Documentation authoring and user training readiness\n\n**Issue Metadata:**\n- Issue Key: ${issueData.key}\n- Issue Type: ${issueType}\n- Priority: ${priority}\n- Labels: ${labels}\n\n## 3. Test Strategy\n\n${strategy}\n\n## 4. Entry Criteria\n\n- Jira issue details are complete and approved\n- Acceptance criteria are documented and understood\n- Test environment is provisioned and available\n- Test data is available for feature validation\n\n## 5. Exit Criteria\n\n- All acceptance criteria have been validated\n- No critical defects remain open\n- Observed defects are documented with severity and status\n- Test execution results are reviewed by stakeholders\n\n## 6. Risk Analysis\n\n**Overall Risk Assessment:** ${riskLevel}\n\n**Identified Risks and Mitigations:**\n\n1. **Requirement Clarity Risk**\n   - Impact: Missing or ambiguous acceptance criteria can cause coverage gaps\n   - Mitigation: Confirm requirements with the product owner before test execution\n\n2. **Integration Risk**\n   - Impact: Feature may fail when integrated with dependent systems\n   - Mitigation: Coordinate integration tests and validate interoperability\n\n3. **Regression Risk**\n   - Impact: Changes may affect existing functionality\n   - Mitigation: Execute regression tests for related components\n\n4. **Environment Risk**\n   - Impact: Test environments may be unstable or unavailable\n   - Mitigation: Verify staging readiness and maintain fallbacks\n\n5. **Data Risk**\n   - Impact: Incomplete or incorrect test data can invalidate results\n   - Mitigation: Prepare and validate test data sets prior to execution\n\n## 7. Test Metrics & KPIs\n\n- **Test Case Pass Rate:** Percentage of executed test cases passing on first run\n- **Defect Escape Rate:** Percentage of defects discovered after release\n- **Acceptance Criteria Coverage:** Percentage of acceptance criteria covered by tests\n- **Automation Coverage:** Percentage of test scenarios automated\n- **Cycle Time:** Time from test start to completion\n\n## 8. Resource Requirements\n\n- **QA Lead / Manager** - Oversight and coordination\n- **QA Engineers** - Test design and execution\n- **Test Automation Specialist** - Regression automation support\n- **DevOps / Infrastructure** - Environment provisioning support\n\n## 9. Schedule & Timeline\n\n- **Estimated Duration:** 3 weeks\n- **Start Date:** ${startDate}\n- **Target Completion:** ${endDate}\n\n## 10. Assumptions & Dependencies\n\n- Jira issue details are complete and approved\n- Test environment is available for execution\n- Acceptance criteria reflect the intended requirements\n- Dependent systems remain available during testing\n\n## Acceptance Criteria\n\n${acceptanceCriteria}\n`; 
}

app.post('/api/generate', async (req, res) => {
  try {
    const {
      jiraUrl,
      jiraEmail,
      jiraToken,
      issueKey,
      groqKey,
      groqModel
    } = req.body;

    if (!jiraUrl || !jiraEmail || !jiraToken || !issueKey || !groqKey) {
      return res.status(400).json({ error: 'Missing required settings or issue key.' });
    }

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
      return res.status(jiraResponse.status).json({ error: `Jira fetch failed: ${text}` });
    }

    const issueJson = await jiraResponse.json();
    const issueData = {
      key: issueJson.key,
      summary: formatFieldValue(extractField(issueJson, ['summary', 'customfield_10000'])),
      description: formatFieldValue(extractField(issueJson, ['description', 'customfield_10001'])),
      acceptanceCriteria: formatAcceptanceCriteria(extractField(issueJson, ['customfield_10002', 'customfield_10100', 'customfield_10003'])),
      issueType: issueJson.fields?.issuetype?.name || '[Not specified in Jira]',
      priority: issueJson.fields?.priority?.name || '[Not specified in Jira]',
      labels: issueJson.fields?.labels || []
    };

    const prompt = buildPrompt(issueData);
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 700,
        temperature: 0.0
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return res.status(openAiResponse.status).json({ error: `GROQ/OpenAI request failed: ${errorText}` });
    }

    const completion = await openAiResponse.json();
    const strategyText = completion.choices?.[0]?.message?.content?.trim();
    if (!strategyText) {
      return res.status(500).json({ error: 'No strategy text returned from GROQ/OpenAI.' });
    }

    const testPlan = buildTestPlanMarkdown(issueData, strategyText);

    return res.json({ strategy: strategyText, testPlan, issueData });
  } catch (exception) {
    return res.status(500).json({ error: exception.message || 'Unexpected error' });
  }
});

// Quick root route: guide browser to the frontend dev server
app.get('/', (req, res) => {
  res.redirect('http://localhost:5173/');
});

app.listen(port, () => {
  console.log(`Jira Test Strategy API running on http://localhost:${port}`);
});
