import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

async function main() {
  try {
    const geminiPath = path.join(process.cwd(), '..', 'gemini.md');
    const raw = fs.readFileSync(geminiPath, 'utf8');
    const m = /```json([\s\S]*?)```/.exec(raw);
    if (!m) {
      console.error('Could not find JSON block in gemini.md');
      process.exit(2);
    }
    const jsonText = m[1].trim();
    const cfg = JSON.parse(jsonText);

    const payload = {
      jiraUrl: cfg.jira_url,
      jiraEmail: cfg.jira_email,
      jiraToken: cfg.jira_token,
      issueKey: cfg.jira_id,
      groqKey: cfg.groq_key,
      groqModel: cfg.groq_model || 'openai/gpt-oss-120b'
    };

    // Do NOT print secrets
    console.log('Posting to backend /api/generate using credentials from gemini.md (secrets withheld)...');

    const res = await fetch('http://localhost:5178/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('Backend returned error:', result.error || JSON.stringify(result));
      process.exit(3);
    }

    const strategy = result.strategy || '';
    const testPlan = result.testPlan || '';

    console.log('\n=== Strategy (first 800 chars) ===\n');
    console.log(strategy.slice(0, 800));

    const outPath = path.join(process.cwd(), '..', 'last_test_plan.md');
    fs.writeFileSync(outPath, testPlan, 'utf8');
    console.log(`\nFull test plan saved to ${outPath}`);
  } catch (err) {
    console.error('Error during generation:', err.message || err);
    process.exit(4);
  }
}

main();
