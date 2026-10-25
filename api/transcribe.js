module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { audio, mimeType } = req.body || {};
  if (!audio) return res.status(400).json({ error: 'Keine Audiodaten' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY nicht konfiguriert' });

  try {
    const audioBuffer = Buffer.from(audio, 'base64');
    const ext         = (mimeType || '').includes('mp4') || (mimeType || '').includes('m4a') ? 'm4a' : 'webm';
    const boundary    = '----WhisperBoundary' + Date.now();

    // Build multipart body manually — avoids Node.js FormData/Blob reliability issues
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nde\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="rec.${ext}"\r\nContent-Type: ${mimeType || 'audio/webm'}\r\n\r\n`),
      audioBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || `OpenAI ${resp.status}`);
    res.json({ text: data.text || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
