module.exports = async function handler(req, res) {
  // Nur POST erlauben
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API-Key nicht konfiguriert' });
  }

  try {
    const https = require('https');
    const body  = JSON.stringify(req.body);

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'Content-Length':    Buffer.byteLength(body),
          'x-api-key':         apiKey,
          'anthropic-version': '2023-06-01',
        },
      };

      const reqH = https.request(options, (resH) => {
        let raw = '';
        resH.on('data', chunk => raw += chunk);
        resH.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            if (resH.statusCode >= 400) {
              reject({ status: resH.statusCode, data: parsed });
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject({ status: 500, data: { error: 'JSON parse error' } });
          }
        });
      });

      reqH.on('error', err => reject({ status: 500, data: { error: err.message } }));
      reqH.write(body);
      reqH.end();
    });

    return res.status(200).json(data);

  } catch (err) {
    const status = err.status || 500;
    const data   = err.data  || { error: String(err) };
    return res.status(status).json(data);
  }
};
