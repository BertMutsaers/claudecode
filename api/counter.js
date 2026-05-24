module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(200).json({ today: '–', total: '–', debug: 'env missing', hasUrl: !!url, hasToken: !!token });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const keyDay   = `visitors:${today}`;
  const keyTotal = 'visitors:total';

  async function redis(cmd) {
    const r = await fetch(`${url}/${cmd.map(encodeURIComponent).join('/')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const j = await r.json();
    return j.result;
  }

  try {
    const [todayCount, totalCount] = await Promise.all([
      redis(['INCR', keyDay]),
      redis(['INCR', keyTotal]),
    ]);

    // Tages-Key läuft nach 48h ab (automatische Bereinigung)
    await redis(['EXPIRE', keyDay, '172800']);

    return res.status(200).json({ today: todayCount, total: totalCount });
  } catch (e) {
    return res.status(200).json({ today: '–', total: '–', debug: 'fetch error', error: e.message });
  }
};
