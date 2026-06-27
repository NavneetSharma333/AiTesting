import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'blast-jira-settings';
const DEFAULT_SETTINGS = {
  jiraUrl: 'https://navsharmatest.atlassian.net',
  jiraEmail: '',
  jiraToken: '',
  groqKey: '',
  groqModel: 'openai/gpt-oss-120b'
};

function sanitizeUrl(value) {
  return value.trim().replace(/\/$/, '');
}

function buildMarkdown(issueKey, issueData, strategyText) {
  const title = issueData.summary || issueKey;
  return `# Test Strategy: ${title}\n\n` +
    `## Jira Issue\n- Issue Key: ${issueKey}\n- Issue Type: ${issueData.issueType || '[Not specified in Jira]'}\n- Priority: ${issueData.priority || '[Not specified in Jira]'}\n- Labels: ${issueData.labels.length ? issueData.labels.join(', ') : '[Not specified in Jira]'}\n\n` +
    `## Acceptance Criteria\n${issueData.acceptanceCriteria || '[Not specified in Jira]'}\n\n` +
    `## Generated Test Strategy\n${strategyText.trim()}`;
}

function loadSettings() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [issueKey, setIssueKey] = useState('SCRUM-8');
  const [strategy, setStrategy] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const isValidSettings = useMemo(() => {
    return settings.jiraUrl && settings.jiraEmail && settings.jiraToken && settings.groqKey;
  }, [settings]);

  const saveSettings = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setStatus('Settings saved locally.');
  };

  const downloadMarkdown = () => {
    const fileName = `test-strategy-${issueKey || 'issue'}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const handleGenerate = async () => {
    setStatus('Generating strategy...');
    setError('');
    setStrategy('');
    setMarkdown('');

    if (!isValidSettings) {
      setError('Please configure Jira and GROQ settings before generating.');
      setStatus('Configuration incomplete.');
      return;
    }

    if (!issueKey.trim()) {
      setError('Please enter a Jira issue key.');
      setStatus('Missing issue key.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5178/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraUrl: sanitizeUrl(settings.jiraUrl),
          jiraEmail: settings.jiraEmail.trim(),
          jiraToken: settings.jiraToken.trim(),
          issueKey: issueKey.trim(),
          groqKey: settings.groqKey.trim(),
          groqModel: settings.groqModel.trim() || 'openai/gpt-oss-120b'
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate test strategy.');
      }

      setStrategy(result.strategy);
      setMarkdown(buildMarkdown(issueKey.trim(), result.issueData, result.strategy));
      setStatus('Strategy generated successfully.');
    } catch (fetchError) {
      setError(fetchError.message || 'Unknown error occurred.');
      setStatus('Generation failed.');
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Jira Test Strategy Generator</h1>
          <p>Lightweight React UI with dark mode and Jira/GROQ configuration.</p>
        </div>
        <button className="theme-toggle" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
      </header>

      <main className="app-main">
        <section className="panel">
          <h2>Settings</h2>
          <p>Enter Jira and GROQ connection details. Settings are stored in browser local storage.</p>
          <div className="field-grid">
            <label>
              Jira Base URL
              <input
                type="url"
                value={settings.jiraUrl}
                onChange={event => setSettings({ ...settings, jiraUrl: event.target.value })}
                placeholder="https://your-domain.atlassian.net"
              />
            </label>
            <label>
              Jira Email
              <input
                type="email"
                value={settings.jiraEmail}
                onChange={event => setSettings({ ...settings, jiraEmail: event.target.value })}
                placeholder="jira-user@example.com"
              />
            </label>
            <label>
              Jira API Token
              <input
                type="password"
                value={settings.jiraToken}
                onChange={event => setSettings({ ...settings, jiraToken: event.target.value })}
                placeholder="Jira API token"
              />
            </label>
            <label>
              GROQ API Key
              <input
                type="password"
                value={settings.groqKey}
                onChange={event => setSettings({ ...settings, groqKey: event.target.value })}
                placeholder="OpenAI / GROQ API key"
              />
            </label>
            <label>
              GROQ Model
              <input
                type="text"
                value={settings.groqModel}
                onChange={event => setSettings({ ...settings, groqModel: event.target.value })}
                placeholder="openai/gpt-oss-120b"
              />
            </label>
          </div>
          <button className="primary-button" onClick={saveSettings}>Save Settings</button>
        </section>

        <section className="panel">
          <h2>Generate Test Strategy</h2>
          <label>
            Jira Issue Key
            <input
              type="text"
              value={issueKey}
              onChange={event => setIssueKey(event.target.value)}
              placeholder="SCRUM-8"
            />
          </label>
          <div className="button-row">
            <button className="primary-button" onClick={handleGenerate} disabled={!isValidSettings}>
              Generate Strategy
            </button>
            <button className="secondary-button" onClick={() => setStatus('Idle')}>Reset Status</button>
          </div>
          <div className="status-row">
            <strong>Status:</strong> {status}
          </div>
          {error && <div className="error-box">{error}</div>}
        </section>

        {strategy && (
          <section className="panel result-panel">
            <h2>Generated Strategy</h2>
            <pre>{strategy}</pre>
            <button className="primary-button" onClick={downloadMarkdown}>Download Markdown</button>
          </section>
        )}

        {markdown && (
          <section className="panel result-panel">
            <h2>Markdown Preview</h2>
            <pre>{markdown}</pre>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
