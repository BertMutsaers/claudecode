module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.json([]);

  async function redis(cmd) {
    const r = await fetch(`${url}/${cmd.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json();
    return j.result;
  }

  try {
    const items = await redis(['LRANGE', 'user_stories', '0', '-1']);
    if (!items || !Array.isArray(items)) return res.json([]);
    const stories = items
      .map(item => { try { return JSON.parse(item); } catch { return null; } })
      .filter(Boolean);
    res.json(stories);
  } catch {
    res.json([]);
  }
};
