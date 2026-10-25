module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { titel, kategorie, idee, autor } = req.body || {};
  if (!titel || !kategorie || !idee) {
    return res.status(400).json({ error: 'Titel, Kategorie und Idee sind erforderlich' });
  }

  const apiKey    = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const redisUrl  = process.env.UPSTASH_REDIS_REST_URL;
  const redisTok  = process.env.UPSTASH_REDIS_REST_TOKEN;

  async function redis(cmd) {
    const r = await fetch(`${redisUrl}/${cmd.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${redisTok}` },
    });
    const j = await r.json();
    if (j.error) throw new Error('Redis: ' + j.error);
    return j.result;
  }

  const imagePrompt = `Simple pencil sketch children's book illustration, black and white, soft pencil lines on white background. A cozy scene from a story called "${titel}" (theme: ${kategorie}). Minimal detail, hand-drawn look, charming and warm, suitable for children aged 3–8. No text, no title, no borders.`;

  // Run story generation and image generation in parallel
  const [storyResult, imageResult] = await Promise.allSettled([
    fetch('https://api.anthropic.com/v1/messages', {
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
        messages: [{ role: 'user', content: `Schreibe eine Kindergeschichte mit dem Titel "${titel}" (Kategorie: ${kategorie}) basierend auf dieser Idee: ${idee}` }],
      }),
    }).then(r => r.json()),

    openaiKey ? fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'dall-e-3', prompt: imagePrompt, n: 1, size: '1024x1024', quality: 'standard', style: 'natural' }),
    }).then(r => r.json()) : Promise.resolve(null),
  ]);

  const text     = storyResult.status === 'fulfilled' ? (storyResult.value?.content?.[0]?.text || '') : '';
  const imageUrl = imageResult.status === 'fulfilled' ? (imageResult.value?.data?.[0]?.url || null) : null;

  // Save to Upstash Redis (list, newest first)
  const id    = Date.now().toString();
  const story = { id, titel, kategorie, idee, autor: autor || '', text, imageUrl, created: new Date().toISOString() };
  await redis(['LPUSH', 'user_stories', JSON.stringify(story)]);

  res.json({ id, titel, kategorie, autor: autor || '', text, imageUrl });
};
