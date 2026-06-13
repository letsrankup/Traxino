export default async function handler(req, res) {
  // CORS headers (agar chahiye)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel Environment Variables' });
  }

  // Gemini 2.0 Flash — latest, fastest
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 1500,
          topP: 0.95,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || 'Gemini API error';
      console.error('Gemini error:', errMsg);
      return res.status(response.status).json({ error: errMsg });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      return res.status(500).json({ error: 'Empty response from Gemini' });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
