export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  const webhookUrl = process.env.GAS_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ status: 'error', message: 'GAS_WEBHOOK_URL is not configured' });
  }

  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const gasResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload,
    });

    const text = await gasResponse.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: gasResponse.ok ? 'ok' : 'error', response: text };
    }

    return res.status(gasResponse.ok ? 200 : 502).json(data);
  } catch (error) {
    return res.status(502).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to forward log',
    });
  }
}
