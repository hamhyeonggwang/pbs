export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'ICF-LM',
    gasConfigured: Boolean(process.env.GAS_WEBHOOK_URL),
  });
}
