const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      outputs: [{
        outputs: [{
          results: { message: { text: 'Server misconfiguration: GROQ_API_KEY is not set.' } }
        }]
      }]
    });
  }

  const body = req.body || {};
  const prompt = body.input_value || 'Analyze these test results and provide insights.';
  const files = body.uploaded_files || [];

  const messages = [
    {
      role: 'system',
      content: `You are an expert test analysis assistant. You compare two test result files (JSON) and provide a detailed analysis of which build has more failing or flaky tests. Be specific with numbers and highlight key differences. Format your response in clear sections.`,
    },
  ];

  for (const file of files) {
    const content = typeof file.content === 'string'
      ? file.content
      : JSON.stringify(file.content, null, 2);
    messages.push({
      role: 'user',
      content: `File "${file.name}":\n${content.slice(0, 50000)}`,
    });
  }

  messages.push({ role: 'user', content: prompt });

  try {
    const response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || GROQ_MODEL,
        messages,
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        outputs: [{
          outputs: [{
            results: { message: { text: `Upstream API error (${response.status}): ${errorText}` } }
          }]
        }]
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No analysis generated.';

    return res.status(200).json({
      outputs: [{
        outputs: [{
          results: { message: { text } }
        }]
      }]
    });
  } catch (error) {
    return res.status(502).json({
      outputs: [{
        outputs: [{
          results: { message: { text: `Request failed: ${error.message}` } }
        }]
      }]
    });
  }
}
