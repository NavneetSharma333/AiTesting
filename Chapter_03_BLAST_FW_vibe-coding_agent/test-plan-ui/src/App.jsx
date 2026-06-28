import { useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const STORAGE_KEY = 'blast-jira-settings';
const APP_VERSION = '1.0.0';
const DEFAULT_SETTINGS = {
  jiraUrl: 'https://navsharmatest.atlassian.net',
  jiraEmail: '',
  jiraToken: '',
  groqKey: '',
  groqModel: 'qwen/qwen3.6-27b'
};

function sanitizeUrl(value) {
  return value.trim().replace(/\/$/, '');
}

function buildMarkdown(issueKey, issueData, strategyText) {
  const title = issueData.summary || issueKey;
  const labels = issueData.labels?.length ? issueData.labels.join(', ') : '[Not specified in Jira]';
  const issueType = issueData.issueType || '[Not specified in Jira]';
  const priority = issueData.priority || '[Not specified in Jira]';
  const acceptanceCriteria = issueData.acceptanceCriteria || '[Not specified in Jira]';
  const cleaned = strategyText
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*?(?=\n(?:Objective|Scope|Test Strategy|Entry Criteria|Exit Criteria|Risks & Mitigations|Defect Reporting|Test Environments|Test Deliverables|Test Schedule|## |\*\*|---))/i, '')
    .replace(/<think>[^\n]*/i, '')
    .trim();
  return `# Test Strategy — ${title}\n\n` +
    `**${issueKey}** · ${issueType} · ${priority} · To Do\n\n` +
    `---\n\n` +
    `## 1. Objective\n\nValidate the feature described in ${issueKey} (${title}) against the defined acceptance criteria and ensure quality standards are met.\n\n` +
    `## 2. Scope\n\n**In Scope:**\n- Validation of the feature described in the Jira issue\n- Verification of all acceptance criteria\n- Functional workflows and integrations implied by the issue\n- Quality validation for the target release stream\n\n**Out of Scope:**\n- Exploratory testing outside the stated issue scope\n- Non-functional load testing beyond standard regression checks\n- Security penetration testing unless explicitly requested\n\n` +
    `## 3. Test Strategy\n\n${cleaned}\n\n` +
    `## 4. Entry Criteria\n\n- Jira issue details are complete and approved\n- Acceptance criteria are documented and understood\n- Test environment is provisioned and available\n- Test data is available for feature validation\n- Build is deployed and smoke test passes\n\n` +
    `## 5. Exit Criteria\n\n- All acceptance criteria have been validated\n- No critical or high-severity defects remain open\n- Medium/low defects are documented and triaged\n- Test execution report is reviewed by stakeholders\n- Sign-off obtained from QA Lead\n\n` +
    `## 6. Risks & Mitigations\n\n| Risk | Impact | Mitigation |\n|------|--------|------------|\n| Requirement ambiguity | Missed coverage | Clarify with PO before execution |\n| Integration failure | Blocked testing | Coordinate with dependent teams early |\n| Test data unavailability | Delayed validation | Prepare data in advance |\n| Environment downtime | Schedule slip | Reserve slots; maintain fallback |\n| Resource constraints | Reduced coverage | Prioritise by risk; cross-train team |\n\n` +
    `## 7. Defect Reporting\n\n- **Tool:** Jira\n- **Severity Levels:** Blocker, Critical, Major, Minor, Trivial\n- **Priority:** Highest, High, Medium, Low\n- **Workflow:** New → Triaged → In Progress → Resolved → Verified → Closed\n- **SLAs:** Critical within 4 hours, Major within 24 hours, Minor within 3 business days\n\n` +
    `## 8. Test Environments\n\n| Environment | Purpose | Configuration |\n|-------------|---------|---------------|\n| Development | Unit & integration testing | Latest build, dev DB |\n| QA/Staging | Feature & regression testing | Mirror of production |\n| UAT | User acceptance testing | Production-like data |\n| Production | Smoke & post-deploy validation | Live environment |\n\n` +
    `## 9. Test Deliverables\n\n- Test strategy document\n- Test plan document\n- Test cases (linked to requirements)\n- Test execution report\n- Defect report with severity distribution\n- Test completion summary\n\n` +
    `## 10. Test Schedule\n\n| Phase | Duration |\n|-------|----------|\n| Test Planning | 3 days |\n| Test Case Design | 5 days |\n| Test Execution | 10 days |\n| Defect Retesting | 3 days |\n| Test Closure | 2 days |\n\n` +
    `## 11. Approvals\n\n| Role | Name |\n|------|------|\n| QA Lead | |\n| QA Manager | |\n| Development Lead | |\n| Development Manager | |\n\n` +
    `---\n\n*Lightweight React · credentials stay local*`;
}

function loadSettings() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function mdToHtml(md) {
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^\- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled> $1</li>')
    .replace(/^\- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled> $1</li>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  html = html.replace(/((?:<h[1-3]>.*\n?)+)/g, (m) => m);
  const tableRegex = /^\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/gm;
  html = html.replace(tableRegex, (_, header, body) => {
    const cols = header.split('|').filter(c => c.trim()).map(c => c.trim());
    const rows = body.trim().split('\n').map(r => r.split('|').filter(c => c.trim()).map(c => c.trim()));
    let t = '<table><thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    t += rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('');
    t += '</tbody></table>';
    return t;
  });
  html = html.replace(/\n\n+/g, '\n\n');
  const parts = html.split(/\n\n+/);
  html = parts.map(p => {
    const t = p.trim();
    if (!t) return '';
    if (/^<(h[1-3]|ul|ol|table|blockquote|hr|li)/.test(t)) return t;
    return `<p>${t}</p>`;
  }).join('\n');
  return html;
}

function downloadPdf(content, fileName, isCsv) {
  const bodyHtml = isCsv
    ? `<pre style="font-family:'Courier New',monospace;font-size:11pt;white-space:pre-wrap;padding:20px;">${content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`
    : `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5;max-width:800px;margin:auto;padding:40px;">${mdToHtml(content)}</div>`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<style>body{margin:0;color:#111}table{border-collapse:collapse;width:100%;margin:12px 0}
th,td{border:1px solid #999;padding:6px 10px;text-align:left;font-size:10pt}
th{background:#eee}code{background:#f4f4f4;padding:1px 4px;border-radius:3px;font-size:10pt}
pre{background:#f4f4f4;padding:12px;border-radius:6px;overflow-x:auto}
blockquote{border-left:4px solid #2563eb;margin:12px 0;padding:8px 16px;background:#f8faff}
h1{font-size:18pt}h2{font-size:14pt}h3{font-size:12pt}
@media print{body{padding:0}@page{margin:20mm}}</style></head><body>${bodyHtml}</body></html>`;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 300);
}

function downloadDoc(content, fileName, isCsv) {
  const bodyHtml = isCsv
    ? `<pre style="font-family:'Courier New',monospace;font-size:11pt;white-space:pre-wrap;">${content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>`
    : `<div>${mdToHtml(content)}</div>`;
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${fileName}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.5}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 8px}
th{background:#eef}code{background:#f4f4f4;padding:1px 3px;font-size:10pt}
pre{background:#f4f4f4;padding:10px}blockquote{border-left:4px solid #2563eb;margin:8px 0;padding:6px 12px}
h1{font-size:18pt}h2{font-size:14pt}h3{font-size:12pt}</style></head><body>${bodyHtml}</body></html>`;
  downloadFile(html, fileName.replace(/\.\w+$/, '.doc'), 'application/msword');
}

function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [issueKey, setIssueKey] = useState('SCRUM-8');
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState('dark');
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState('');

  const [modal, setModal] = useState({ show: false, title: '', content: '', fileName: '', mimeType: '' });
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState({ show: false, message: '' });

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
    const errors = {};
    if (!settings.jiraUrl.trim()) errors.jiraUrl = 'Jira Base URL is required';
    if (!settings.jiraEmail.trim()) errors.jiraEmail = 'Jira Email is required';
    if (!settings.jiraToken.trim()) errors.jiraToken = 'Jira API Token is required';
    if (!settings.groqKey.trim()) errors.groqKey = 'GROQ API Key is required';
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setShowSettings(false);
    setToast({ show: true, message: 'Settings saved successfully.' });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const openModal = (title, content, fileName, mimeType) => {
    setModal({ show: true, title, content, fileName, mimeType });
    setEditing(false);
    setEditContent(content);
  };

  const closeModal = () => {
    setModal({ show: false, title: '', content: '', fileName: '', mimeType: '' });
    setEditing(false);
    setEditContent('');
  };

  const fetchAndShow = async (endpoint, title, fileName, mimeType) => {
    if (!isValidSettings) {
      setError('Please configure Jira and GROQ settings first.');
      return;
    }
    if (!issueKey.trim()) {
      setError('Please enter a Jira issue key.');
      return;
    }

    setLoading(endpoint);
    setError('');
    setStatus(`Generating ${title}...`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraUrl: sanitizeUrl(settings.jiraUrl),
          jiraEmail: settings.jiraEmail.trim(),
          jiraToken: settings.jiraToken.trim(),
          issueKey: issueKey.trim(),
          groqKey: settings.groqKey.trim(),
          groqModel: settings.groqModel.trim() || 'qwen/qwen3.6-27b'
        })
      });

      if (!response.ok) {
        let errMsg;
        try {
          const err = await response.json();
          errMsg = err.error || `Failed to generate ${title}`;
        } catch {
          errMsg = await response.text();
        }
        throw new Error(errMsg);
      }

      const content = await response.text();
      openModal(title, content, fileName, mimeType);
      setStatus(`${title} generated.`);
    } catch (fetchError) {
      setError(fetchError.message || 'Unknown error occurred.');
      setStatus('Generation failed.');
    } finally {
      setLoading('');
    }
  };

  const handleGenerateStrategy = async () => {
    if (!isValidSettings) {
      setError('Please configure Jira and GROQ settings first.');
      return;
    }
    if (!issueKey.trim()) {
      setError('Please enter a Jira issue key.');
      return;
    }

    setLoading('strategy');
    setError('');
    setStatus('Generating strategy...');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jiraUrl: sanitizeUrl(settings.jiraUrl),
          jiraEmail: settings.jiraEmail.trim(),
          jiraToken: settings.jiraToken.trim(),
          issueKey: issueKey.trim(),
          groqKey: settings.groqKey.trim(),
          groqModel: settings.groqModel.trim() || 'qwen/qwen3.6-27b'
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate test strategy.');
      }

      const markdown = buildMarkdown(issueKey.trim(), result.issueData, result.strategy);
      openModal('Test Strategy', markdown, `test-strategy-${issueKey || 'issue'}.md`, 'text/markdown;charset=utf-8');
      setStatus('Strategy generated.');
    } catch (fetchError) {
      setError(fetchError.message || 'Unknown error occurred.');
      setStatus('Generation failed.');
    } finally {
      setLoading('');
    }
  };

  const isMarkdown = modal.mimeType && modal.mimeType.includes('markdown');
  const isCsv = modal.fileName.endsWith('.csv');

  function parseCsvRows(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { header: [], rows: [] };
    const parseLine = (line) => {
      const cells = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      cells.push(cur.trim());
      return cells;
    };
    const header = parseLine(lines[0]);
    const rows = lines.slice(1).map(parseLine);
    return { header, rows };
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Jira - STLC Agent</h1>
          <p className="header-subtitle">
            GROQ Model: {settings.groqModel || 'qwen/qwen3.6-27b'} &mdash; v{APP_VERSION}
          </p>
        </div>
        <button className="theme-toggle" onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
      </header>

      <main className="app-main">
        {showSettings && (
          <section className="panel settings-panel full-width">
            <h2>Settings</h2>
            <p>Enter Jira and GROQ connection details. Settings are stored in browser local storage.</p>
            <div className="field-grid">
              <label>
                Jira Base URL
                <input
                  type="url"
                  value={settings.jiraUrl}
                  onChange={event => { setSettings({ ...settings, jiraUrl: event.target.value }); setFieldErrors(prev => ({ ...prev, jiraUrl: '' })); }}
                  placeholder="https://your-domain.atlassian.net"
                />
                {fieldErrors.jiraUrl && <span className="field-error">{fieldErrors.jiraUrl}</span>}
              </label>
              <label>
                Jira Email
                <input
                  type="email"
                  value={settings.jiraEmail}
                  onChange={event => { setSettings({ ...settings, jiraEmail: event.target.value }); setFieldErrors(prev => ({ ...prev, jiraEmail: '' })); }}
                  placeholder="jira-user@example.com"
                />
                {fieldErrors.jiraEmail && <span className="field-error">{fieldErrors.jiraEmail}</span>}
              </label>
              <label>
                Jira API Token
                <input
                  type="password"
                  value={settings.jiraToken}
                  onChange={event => { setSettings({ ...settings, jiraToken: event.target.value }); setFieldErrors(prev => ({ ...prev, jiraToken: '' })); }}
                  placeholder="Jira API token"
                />
                {fieldErrors.jiraToken && <span className="field-error">{fieldErrors.jiraToken}</span>}
              </label>
              <label>
                GROQ API Key
                <input
                  type="password"
                  value={settings.groqKey}
                  onChange={event => { setSettings({ ...settings, groqKey: event.target.value }); setFieldErrors(prev => ({ ...prev, groqKey: '' })); }}
                  placeholder="GROQ API key"
                />
                {fieldErrors.groqKey && <span className="field-error">{fieldErrors.groqKey}</span>}
              </label>
              <label>
                GROQ Model
                <input
                  type="text"
                  value={settings.groqModel}
                  onChange={event => setSettings({ ...settings, groqModel: event.target.value })}
                  placeholder="qwen/qwen3.6-27b"
                />
              </label>
            </div>
            <div className="spacer"></div>
            <button className="primary-button" onClick={saveSettings}>Save Settings</button>
          </section>
        )}

        <section className="panel generate-panel">
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
          <div className="spacer"></div>
          <div className="button-row">
            <button className="primary-button" onClick={handleGenerateStrategy} disabled={!isValidSettings || !!loading}>
              Generate Strategy
            </button>
            <button className="secondary-button" onClick={() => { setStatus('Idle'); setError(''); }}>Reset</button>
          </div>
          <div className="spacer"></div>
          <div className="status-row">
            <strong>Status:</strong> {status}
          </div>
          {error && <div className="error-box">{error}</div>}
        </section>

        <section className="panel actions-panel">
          <h2>Actions</h2>
          <div className="actions-list">
            <button
              className={`action-btn ${showSettings ? 'active' : ''}`}
              onClick={() => setShowSettings(prev => !prev)}
            >
              <span className="action-icon">&#9881;</span>
              <span className="action-label">Settings</span>
            </button>

            <button
              className="action-btn"
              onClick={() => fetchAndShow(
                '/api/generate/test-plan', 'Test Plan',
                `test-plan-${issueKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`, 'text/markdown;charset=utf-8'
              )}
              disabled={!isValidSettings || !!loading}
            >
              <span className="action-icon">&#128196;</span>
              <span className="action-label">Generate Test Plan</span>
            </button>

            <button
              className="action-btn"
              onClick={() => fetchAndShow(
                '/api/generate/test-cases', 'Test Cases',
                `test-cases-${issueKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`, 'text/csv;charset=utf-8'
              )}
              disabled={!isValidSettings || !!loading}
            >
              <span className="action-icon">&#128203;</span>
              <span className="action-label">Generate Test Cases</span>
            </button>

            <button
              className="action-btn"
              onClick={() => fetchAndShow(
                '/api/generate/rca', 'Root Cause Analysis',
                `root-cause-analysis-${issueKey.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`, 'text/markdown;charset=utf-8'
              )}
              disabled={!isValidSettings || !!loading}
            >
              <span className="action-icon">&#128270;</span>
              <span className="action-label">Root Cause Analysis</span>
            </button>
          </div>
          {loading && <div className="loading-indicator">Generating... <span className="spinner"></span></div>}
        </section>
      </main>

      {modal.show && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal.title}</h2>
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setEditing(prev => !prev)}>
                  {editing ? 'Preview' : 'Edit'}
                </button>
                <div className="download-group">
                  <button className="primary-button" onClick={() => downloadFile(editContent, modal.fileName, modal.mimeType)}>
                    .{isCsv ? 'csv' : 'md'}
                  </button>
                  {!isCsv && (
                    <>
                      <button className="secondary-button" onClick={() => downloadPdf(editContent, modal.fileName, isCsv)}>
                        PDF
                      </button>
                      <button className="secondary-button" onClick={() => downloadDoc(editContent, modal.fileName, isCsv)}>
                        DOC
                      </button>
                    </>
                  )}
                </div>
                <button className="modal-close" onClick={closeModal}>&times;</button>
              </div>
            </div>
            <div className="modal-body">
              {editing ? (
                <textarea
                  className="edit-textarea"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  spellCheck={false}
                />
              ) : isMarkdown ? (
                <div className="markdown-body">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {editContent}
                  </Markdown>
                </div>
              ) : isCsv ? (() => {
                const { header, rows } = parseCsvRows(editContent);
                return (
                  <div className="csv-table-wrapper">
                    <table className="csv-table">
                      <thead>
                        <tr>{header.map((h, i) => <th key={i}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {rows.map((row, ri) => (
                          <tr key={ri}>
                            {Array.from({ length: header.length }, (_, ci) => (
                              <td key={ci}>{row[ci] || ''}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })() : (
                <pre className="csv-preview">{editContent}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {toast.show && <div className="toast">{toast.message}</div>}
    </div>
  );
}

export default App;
