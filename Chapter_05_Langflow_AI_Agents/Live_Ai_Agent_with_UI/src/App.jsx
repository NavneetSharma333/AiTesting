import { useEffect, useMemo, useState } from 'react';

const DEFAULT_ENDPOINT = import.meta.env.VITE_LANGFLOW_ENDPOINT || '/api/langflow';
const DEFAULT_PROMPT = 'Analyze these two Playwright runs and tell me which build has the most failing/flaky test.';

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const parsed = JSON.parse(text);
        resolve({ name: file.name, content: parsed, raw: text });
      } catch (error) {
        reject(new Error(`Unable to parse ${file.name} as JSON.`));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function summarizeJson(data) {
  if (Array.isArray(data)) {
    return { type: 'array', items: data.length };
  }
  if (data && typeof data === 'object') {
    return { type: 'object', keys: Object.keys(data).length };
  }
  return { type: typeof data, value: String(data) };
}

function computeTestStats(data) {
  const counts = { passed: 0, failed: 0, flaky: 0, skipped: 0, total: 0 };

  function inspect(node) {
    if (!node || typeof node !== 'object') return;
    // direct test object with status
    if (node.status && typeof node.status === 'string') {
      const s = node.status.toLowerCase();
      if (s.includes('pass')) counts.passed++;
      else if (s.includes('fail')) counts.failed++;
      else if (s.includes('flaky')) counts.flaky++;
      else if (s.includes('skip')) counts.skipped++;
      counts.total++;
    }

    // Playwright style: result.status or outcome
    if (node.result && node.result.status) {
      const s = String(node.result.status).toLowerCase();
      if (s.includes('pass')) counts.passed++;
      else if (s.includes('fail')) counts.failed++;
      else if (s.includes('flaky')) counts.flaky++;
      else if (s.includes('skip')) counts.skipped++;
      counts.total++;
    }

    // Look for arrays of tests
    for (const k of Object.keys(node)) {
      const val = node[k];
      if (Array.isArray(val)) {
        val.forEach((it) => inspect(it));
      } else if (val && typeof val === 'object') {
        inspect(val);
      }
    }
  }

  try {
    inspect(data);
  } catch (e) {
    // ignore
  }

  return counts;
}

function extractTextFromResponse(response) {
  if (!response) return '';
  try {
    const outputs = response.outputs || [];
    const messages = [];
    outputs.forEach((output) => {
      if (output.outputs) {
        output.outputs.forEach((item) => {
          if (item.results?.message?.text) messages.push(item.results.message.text);
          else if (item.message?.message) messages.push(item.message.message);
          else if (item.message?.text) messages.push(item.message.text);
        });
      }
      if (output.message?.message) messages.push(output.message.message);
      if (output.message?.text) messages.push(output.message.text);
    });
    if (messages.length) return messages.join('\n\n');
  } catch (error) {
    return '';
  }
  return JSON.stringify(response, null, 2);
}

function App() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [fileOne, setFileOne] = useState(null);
  const [fileTwo, setFileTwo] = useState(null);
  const [fileOneError, setFileOneError] = useState('');
  const [fileTwoError, setFileTwoError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Select two result files and run the analysis.');
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  const fileOneSummary = useMemo(() => (fileOne ? summarizeJson(fileOne.content) : null), [fileOne]);
  const fileTwoSummary = useMemo(() => (fileTwo ? summarizeJson(fileTwo.content) : null), [fileTwo]);
  const [draggingCard, setDraggingCard] = useState(null);
  const fileOneStats = useMemo(() => (fileOne ? computeTestStats(fileOne.content) : null), [fileOne]);
  const fileTwoStats = useMemo(() => (fileTwo ? computeTestStats(fileTwo.content) : null), [fileTwo]);

  const handleFile = async (file, setter, errorSetter) => {
    errorSetter('');
    setter(null);
    if (!file) return;
    try {
      const parsed = await readJsonFile(file);
      setter(parsed);
    } catch (error) {
      errorSetter(error.message);
    }
  };

  const handleFileChange = async (event, setter, errorSetter) => {
    const file = event.target.files?.[0];
    await handleFile(file, setter, errorSetter);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (card) => (event) => {
    event.preventDefault();
    setDraggingCard(card);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDraggingCard(null);
  };

  const handleDrop = (card) => async (event) => {
    event.preventDefault();
    setDraggingCard(null);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (card === 'one') await handleFile(file, setFileOne, setFileOneError);
    if (card === 'two') await handleFile(file, setFileTwo, setFileTwoError);
  };

  const analyzeLocally = () => {
    if (!fileOne || !fileTwo) {
      setStatusMessage('Please select both result one and result two JSON files.');
      return;
    }

    const count = (obj) => {
      if (Array.isArray(obj)) return obj.length;
      if (obj && typeof obj === 'object') return Object.keys(obj).length;
      return 1;
    };

    const summary = [`${fileOne.name}: ${JSON.stringify(fileOneSummary)}`, `${fileTwo.name}: ${JSON.stringify(fileTwoSummary)}`];
    if (typeof fileOne.content === 'object' && typeof fileTwo.content === 'object') {
      summary.push(`File one contains ${count(fileOne.content)} top-level entries.`);
      summary.push(`File two contains ${count(fileTwo.content)} top-level entries.`);
    }

    setStatusMessage(`Preview complete. ${summary.join(' ')}`);
    setApiResponse(null);
    setApiError('');
  };

  const sendApiRequest = async () => {
    if (!fileOne || !fileTwo) {
      setStatusMessage('Please select both JSON files before sending the API request.');
      return;
    }

    setStatusMessage('Sending request to API...');
    setIsLoading(true);
    setApiError('');
    setApiResponse(null);

    const payload = {
      output_type: 'chat',
      input_type: 'text',
      input_value: prompt,
      session_id: 'ui-session-1',
      tweaks: {
        File_XXXXX: {
          path: [fileOne.name || 'result_one.json'],
        },
        File_YYYYY: {
          path: [fileTwo.name || 'result_two.json'],
        },
      },
      uploaded_files: [
        { name: fileOne.name, content: fileOne.content },
        { name: fileTwo.name, content: fileTwo.content },
      ],
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setApiResponse(data);
      setStatusMessage(response.ok ? 'API returned a response.' : `API error: ${response.status} ${response.statusText}`);
      if (!response.ok) {
        setApiError(`Server responded with status ${response.status}.`);
      }
    } catch (error) {
      setApiError(error.message || 'Request failed.');
      setStatusMessage('API request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    const text = extractTextFromResponse(apiResponse);
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setStatusMessage('Analysis copied to clipboard.');
  };

  const handleDownloadReport = () => {
    const text = extractTextFromResponse(apiResponse);
    if (!text) return;
    const md = `# Analysis Report\n\n${text}\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Analysis_Report.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatusMessage('Downloaded Analysis_Report.md');
  };

  return (
    <div className={`app-shell ${theme}-theme`}>
      <div className="panel">
        <header>
          <div className="brand-row">
            <div>
              <p className="eyebrow">Flaky Test Analyzer</p>
              <h1>Compare two Playwright runs · LangFlow AI agent</h1>
            </div>
            <div className="brand-actions">
              <span className="badge">LANGFLOW</span>
              <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </div>
          </div>
          <p>Upload two results JSON files and run the analysis to identify flaky or failing tests between builds.</p>
        </header>

        <section className="cards-grid">
          <div className="file-card card-build">
            <div className="card-header">01 BUILD A — BASELINE</div>
            <label
              className={`drop-area ${draggingCard === 'one' ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter('one')}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop('one')}
            >
              <p className="drop-title">{fileOne ? fileOne.name : '{ }'}</p>
              <p className="drop-text">Drop results JSON or click to browse</p>
              <input
                className="file-input"
                type="file"
                accept="application/json"
                onChange={(event) => handleFileChange(event, setFileOne, setFileOneError)}
              />
              {fileOneStats && (
                <div className="stat-row">
                  <div className="stat-card passed">
                    <div className="stat-value">{fileOneStats.passed}</div>
                    <div className="stat-label">Passed</div>
                  </div>
                  <div className="stat-card failed">
                    <div className="stat-value">{fileOneStats.failed}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                  <div className="stat-card flaky">
                    <div className="stat-value">{fileOneStats.flaky}</div>
                    <div className="stat-label">Flaky</div>
                  </div>
                  <div className="stat-card skipped">
                    <div className="stat-value">{fileOneStats.skipped}</div>
                    <div className="stat-label">Skipped</div>
                  </div>
                </div>
              )}
            </label>
            {fileOneError && <p className="error-text">{fileOneError}</p>}
          </div>

          <div className="file-card card-build">
            <div className="card-header">02 BUILD B — CANDIDATE</div>
            <label
              className={`drop-area ${draggingCard === 'two' ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter('two')}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop('two')}
            >
              <p className="drop-title">{fileTwo ? fileTwo.name : '{ }'}</p>
              <p className="drop-text">Drop results JSON or click to browse</p>
              <input
                className="file-input"
                type="file"
                accept="application/json"
                onChange={(event) => handleFileChange(event, setFileTwo, setFileTwoError)}
              />
              {fileTwoStats && (
                <div className="stat-row">
                  <div className="stat-card passed">
                    <div className="stat-value">{fileTwoStats.passed}</div>
                    <div className="stat-label">Passed</div>
                  </div>
                  <div className="stat-card failed">
                    <div className="stat-value">{fileTwoStats.failed}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                  <div className="stat-card flaky">
                    <div className="stat-value">{fileTwoStats.flaky}</div>
                    <div className="stat-label">Flaky</div>
                  </div>
                  <div className="stat-card skipped">
                    <div className="stat-value">{fileTwoStats.skipped}</div>
                    <div className="stat-label">Skipped</div>
                  </div>
                </div>
              )}
            </label>
            {fileTwoError && <p className="error-text">{fileTwoError}</p>}
          </div>
        </section>

        <section className="instruction-card">
          <label htmlFor="agentPrompt">INSTRUCTION TO THE AGENT</label>
          <textarea
            id="agentPrompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
          />
          <div className="action-row">
            <button onClick={sendApiRequest} disabled={isLoading}>Run Analysis →</button>
            <button className="secondary-button" onClick={analyzeLocally} disabled={isLoading}>Preview Summary</button>
            <button className="settings-button" onClick={() => setShowSettings((prev) => !prev)}>
              {showSettings ? 'Hide Settings' : 'Settings'}
            </button>
          </div>
        </section>

        {showSettings && (
          <section className="settings-panel">
            <div className="settings-block">
              <h2>Connection Settings</h2>
              <label>
                API Endpoint
                <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
              </label>
              <label>
                API Key
                <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" />
              </label>
            </div>
          </section>
        )}

        <section className="bottom-note">
          <p>Select two <strong>results.json</strong> files, then run the analysis.</p>
          <p className="small-note">Local tool · talks directly to LangFlow · KoreQA Technologies</p>
        </section>

        <section className="result-panel">
          <div className="status-box">
            <strong>Status:</strong> {statusMessage}
          </div>

          {apiError && <pre className="error-box">{apiError}</pre>}

          {apiResponse && (
            <div className="response-summary single">
              <div className="report-actions">
                <h2>Analysis Report</h2>
                <div className="report-buttons">
                  <button onClick={handleCopyReport}>Copy</button>
                  <button onClick={handleDownloadReport}>Download.md</button>
                </div>
              </div>
              <pre className="analysis-text">{extractTextFromResponse(apiResponse)}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
