// Vercel serverless function: GET /api/history
// Lists the logged-in user's saved PDFs from Cloudinary (newest first).
const { cloudConfig, verifyUser } = require('./_cloud');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const uid = await verifyUser(req);
    if (!uid) return res.status(401).json({ error: 'Please log in first.' });

    const { cloudName, apiKey, apiSecret } = cloudConfig();
    const qs = new URLSearchParams({ prefix: `auxquiz/${uid}/`, max_results: '100' });
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/raw/upload?${qs}`, {
      headers: { Authorization: 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64') },
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data.error?.message || 'Could not load history.' });

    const files = (data.resources || [])
      .map((f) => ({
        name: f.public_id.split('/').pop().replace(/^\d+_/, ''),
        url: f.secure_url,
        bytes: f.bytes,
        createdAt: f.created_at,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json({ files });
  } catch (e) {
    return res.status(500).json({ error: 'Could not load history. Please try again.' });
  }
};
