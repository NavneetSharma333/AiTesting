import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const STORAGE_KEY = 'blast-test-plan-settings';
const APP_VERSION = '1.0.0';
const API_URL = '/api';

function App() {
  const [theme, setTheme] = useState('light');
  const [settings, setSettings] = useState({
    jiraUrl: '',
    jiraEmail: '',
    jiraToken: '',
    groqKey: '',
    groqModel: 'mixtral-8x7b-32768',
  });
  const [issueKey, setIssueKey] = useState('SCRUM-8');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Ready');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleSettingsChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setStatus('Settings saved locally');
  };

  const isConfigured = settings.jiraUrl && settings.jiraEmail && settings.jiraToken && settings.groqKey;

  const handleGenerate = async () => {
    if (!isConfigured) {
      setError('Please configure Jira and GROQ settings first.');
      setStatus('Configuration incomplete');
      return;
    }

    if (!issueKey.trim()) {
      setError('Please enter a Jira issue key (e.g., SCRUM-8).');
      setStatus('Missing issue key');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('Generating test plan...');

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraUrl: settings.jiraUrl.trim(),
          jiraEmail: settings.jiraEmail.trim(),
          jiraToken: settings.jiraToken.trim(),
          issueKey: issueKey.trim(),
          groqKey: settings.groqKey.trim(),
          groqModel: settings.groqModel.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate test plan');
      }

      setResult(data);
      setStatus('Test plan generated successfully');
    } catch (err) {
      setError(err.message);
      setStatus('Generation failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadMarkdown = () => {
    if (!result?.testPlan) return;

    const element = document.createElement('a');
    const file = new Blob([result.testPlan], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `test-plan-${issueKey.replace('-', '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>BLAST Test Plan Generator</h1>
          <p className="header-subtitle">
            BLAST Framework v{APP_VERSION} &mdash; Model: {settings.groqModel || 'mixtral-8x7b-32768'}
          </p>
        </div>
        <div className="header-actions">
          <button
            className={`theme-toggle ${showSettings ? 'active' : ''}`}
            onClick={() => setShowSettings(prev => !prev)}
          >
            {showSettings ? 'Close Settings' : 'Settings'}
          </button>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
        </div>
      </header>

      <main className="app-main">
        {showSettings && (
          <section className="panel settings-panel">
          <h2>Configuration</h2>
          <p>Configure your Jira and GROQ API credentials (stored locally in browser).</p>

          <div className="form-group">
            <label>
              Jira Base URL
              <input
                type="url"
                placeholder="https://your-domain.atlassian.net"
                value={settings.jiraUrl}
                onChange={e => handleSettingsChange('jiraUrl', e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label style={{ flex: 1 }}>
              Jira Email
              <input
                type="email"
                placeholder="your-email@example.com"
                value={settings.jiraEmail}
                onChange={e => handleSettingsChange('jiraEmail', e.target.value)}
              />
            </label>
            <label style={{ flex: 1 }}>
              Jira API Token
              <input
                type="password"
                placeholder="Your Jira API token"
                value={settings.jiraToken}
                onChange={e => handleSettingsChange('jiraToken', e.target.value)}
              />
            </label>
          </div>

          <div className="form-row">
            <label style={{ flex: 1 }}>
              GROQ API Key
              <input
                type="password"
                placeholder="Your GROQ API key"
                value={settings.groqKey}
                onChange={e => handleSettingsChange('groqKey', e.target.value)}
              />
            </label>
            <label style={{ flex: 1 }}>
              GROQ Model
              <input
                type="text"
                placeholder="mixtral-8x7b-32768"
                value={settings.groqModel}
                onChange={e => handleSettingsChange('groqModel', e.target.value)}
              />
            </label>
          </div>

          <div className="spacer"></div>
          <button className="btn-primary" onClick={saveSettings}>
            Save Settings
          </button>
        </section>
        )}

        <section className="panel generation-panel">
          <h2>Generate Test Plan</h2>

          <div className="form-group">
            <label>
              Jira Issue Key
              <input
                type="text"
                placeholder="e.g., SCRUM-8"
                value={issueKey}
                onChange={e => setIssueKey(e.target.value)}
              />
            </label>
          </div>

          <div className="spacer"></div>
          <div className="button-group">
            <button
              className="btn-primary"
              onClick={handleGenerate}
              disabled={!isConfigured || loading}
            >
              {loading ? 'Generating...' : 'Generate Test Plan'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setStatus('Ready')}
            >
              Reset
            </button>
          </div>

          <div className="spacer"></div>
          <div className="status-box">
            <strong>Status:</strong> {status}
          </div>

          {error && <div className="error-box">{error}</div>}
        </section>

        {result && (
          <section className="panel result-panel full-width">
            <div className="result-header">
              <h2>Generated Test Plan Document</h2>
              <button className="btn-primary download-btn" onClick={downloadMarkdown}>
                Download Markdown
              </button>
            </div>
            <div className="markdown-body">
              <Markdown remarkPlugins={[remarkGfm]}>
                {result.testPlan}
              </Markdown>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>BLAST Framework v{APP_VERSION} &mdash; Jira &rarr; Strategy &rarr; Plan Generator</p>
      </footer>
    </div>
  );
}

export default App;
