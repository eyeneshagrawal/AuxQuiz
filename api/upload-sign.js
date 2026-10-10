// Vercel serverless function: POST /api/upload-sign
// Verifies the Firebase user, then returns a short-lived signed payload so the browser can
// upload a PDF straight to Cloudinary (no 4.5 MB serverless body limit, secret stays here).
const { cloudConfig, verifyUser, signParams } = require('./_cloud');

const MAX_BYTES = 20 * 1048576;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const uid = await verifyUser(req);
    if (!uid) return res.status(401).json({ error: 'Please log in first.' });

    const { filename = '', size = 0 } = req.body || {};
    if (!/\.pdf$/i.test(String(filename))) return res.status(400).json({ error: 'Only PDF files can be saved.' });
    if (!(size > 0) || size > MAX_BYTES) return res.status(400).json({ error: 'PDF is too large (max 20 MB).' });

    const { cloudName, apiKey, apiSecret } = cloudConfig();
    const base =
      String(filename).replace(/\.pdf$/i, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'document';
    // The server decides the path, so a user can only ever write inside their own folder.
    const publicId = `auxquiz/${uid}/${Date.now()}_${base}.pdf`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signParams({ public_id: publicId, timestamp }, apiSecret);

    return res.status(200).json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
      apiKey, timestamp, signature, publicId,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Could not prepare upload. Please try again.' });
  }
};
