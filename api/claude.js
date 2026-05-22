const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API-Key nicht konfiguriert' });

  // Body lesen (funktioniert sowohl mit als auch ohne Vercel-Vorparsing)
  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      const raw = await new Promise((resolve, reject) => {
        let d = '';
        req.on('data', c => d += c);
        req.on('end', () => resolve(d));
        req.on('error', reject);
      });
      body = JSON.parse(raw || '{}');
    } catch (e) {
      return res.status(400).json({ error: 'Ungültiger Request-Body' });
    }
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create(body);
    return res.status(200).json(message);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || String(err) });
  }
};
