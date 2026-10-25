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
    const buffer = Buffer.from(audio, 'base64');
    const ext    = (mimeType || '').includes('mp4') || (mimeType || '').includes('m4a') ? 'm4a' : 'webm';

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), `rec.${ext}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'de');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || 'Transkription fehlgeschlagen');
    res.json({ text: data.text || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
