module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { titel, kategorie, idee } = req.body || {};
  if (!titel || !kategorie || !idee) {
    return res.status(400).json({ error: 'Titel, Kategorie und Idee sind erforderlich' });
  }

  const apiKey   = process.env.ANTHROPIC_API_KEY;
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisTok = process.env.UPSTASH_REDIS_REST_TOKEN;

  async function redis(cmd) {
    const r = await fetch(`${redisUrl}/${cmd.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${redisTok}` },
    });
    const j = await r.json();
    if (j.error) throw new Error('Redis: ' + j.error);
    return j.result;
  }

  // Generate full story via Claude
  const storyResp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      system: 'Du bist ein einfühlsamer Kinderbuchautor. Schreibe IMMER auf Deutsch. Beginne direkt mit der Geschichte – nicht mit dem Titel. Schreibe ca. 600–900 Wörter für Kinder von 3–8 Jahren. Trenne Absätze mit Leerzeilen. Kein Markdown.',
      messages: [{
        role: 'user',
        content: `Schreibe eine Kindergeschichte mit dem Titel "${titel}" (Kategorie: ${kategorie}) basierend auf dieser Idee: ${idee}`,
      }],
    }),
  });

  const storyData = await storyResp.json();
  const text = storyData.content?.[0]?.text || '';

  // Save to Upstash Redis (list, newest first)
  const id    = Date.now().toString();
  const story = { id, titel, kategorie, idee, text, created: new Date().toISOString() };
  await redis(['LPUSH', 'user_stories', JSON.stringify(story)]);

  res.json({ id, titel, kategorie, text });
};
