module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ADMIN_PW = process.env.ADMIN_PASSWORD;
  const url      = process.env.UPSTASH_REDIS_REST_URL;
  const token    = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!ADMIN_PW) return res.status(500).json({ error: 'ADMIN_PASSWORD nicht konfiguriert' });

  async function redis(cmd) {
    const r = await fetch(`${url}/${cmd.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return (await r.json()).result;
  }

  async function rewriteList(stories) {
    const cmds = [['DEL', 'user_stories']];
    for (const s of stories) {
      cmds.push(['RPUSH', 'user_stories', JSON.stringify(s)]);
    }
    const r = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    return r.json();
  }

  function parseList(items) {
    return (items || [])
      .map(i => { try { return JSON.parse(i); } catch { return null; } })
      .filter(Boolean);
  }

  // ── GET: list all stories ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const pw = req.query.pw;
    if (pw !== ADMIN_PW) return res.status(401).json({ error: 'Falsches Kennwort' });
    const items   = await redis(['LRANGE', 'user_stories', '0', '-1']);
    const stories = parseList(items);
    return res.json(stories);
  }

  // ── POST: update or delete ─────────────────────────────────────────────
  if (req.method === 'POST') {
    const { pw, action, id, titel, kategorie, autor, text, imageUrl } = req.body || {};
    if (pw !== ADMIN_PW)     return res.status(401).json({ error: 'Falsches Kennwort' });
    if (!action || !id)      return res.status(400).json({ error: 'action und id erforderlich' });

    const items   = await redis(['LRANGE', 'user_stories', '0', '-1']);
    let   stories = parseList(items);

    if (action === 'delete') {
      stories = stories.filter(s => s.id !== id);
      await rewriteList(stories);
      return res.json({ ok: true });
    }

    if (action === 'update') {
      stories = stories.map(s => s.id !== id ? s : {
        ...s,
        ...(titel     !== undefined && { titel }),
        ...(kategorie !== undefined && { kategorie }),
        ...(autor     !== undefined && { autor }),
        ...(text      !== undefined && { text }),
        ...(imageUrl  !== undefined && { imageUrl }),
      });
      await rewriteList(stories);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unbekannte Aktion' });
  }

  res.status(405).end();
};
