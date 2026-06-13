export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  // Models list - fallback system
  const models = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-pro'
  ];

  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            temperature: 0.8, 
            maxOutputTokens: 1500 
          }
        })
      });

      const data = await response.json();

      // Rate limit - try next model
      if (response.status === 429) {
        lastError = 'Rate limit';
        continue;
      }

      if (!response.ok) {
        lastError = data?.error?.message || 'Gemini error';
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        lastError = 'Empty response';
        continue;
      }

      // Success
      return res.status(200).json({ text, model_used: model });

    } catch (err) {
      lastError = err.message;
      continue;
    }
  }

  // All models failed
  return res.status(429).json({ 
    error: 'Abhi Gemini busy hai, 1 minute baad try karo. (' + lastError + ')'
  });
}
