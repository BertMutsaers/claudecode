module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { idee } = req.body || {};
  if (!idee) return res.status(400).json({ error: 'Idee fehlt' });

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        system: 'Antworte NUR mit validem JSON (kein Markdown, kein Text drumherum): {"titel": "...", "kategorie": "..."}. Mögliche Kategorien: Tiere, Abenteuer, Einschlafen, Lustig, Lernen, Weihnachten, Mut, Freundschaft. Wähle die am besten passende.',
        messages: [{
          role: 'user',
          content: `Schlage für diese Kindergeschichten-Idee einen kreativen deutschen Titel und die passende Kategorie vor: "${idee}"`,
        }],
      }),
    });

    const data = await resp.json();
    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('Kein JSON in Antwort');
    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
