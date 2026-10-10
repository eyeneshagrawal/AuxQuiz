// Shared helpers for Cloudinary + Firebase auth. The leading underscore keeps Vercel
// from exposing this file as its own endpoint.
// Env: CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>   (required)
const crypto = require('crypto');

const FB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyB42w1PQlyopaSoyQv4xcH0wtjyrItM9XY';

const cloudConfig = () => {
  const raw = process.env.CLOUDINARY_URL || '';
  if (!raw) throw new Error('CLOUDINARY_URL is not set');
  if (/[<>]/.test(raw)) throw new Error('CLOUDINARY_URL still contains <placeholders>; put the real key and secret');
  const u = new URL(raw);
  const cloudName = u.hostname;
  const apiKey = decodeURIComponent(u.username);
  const apiSecret = decodeURIComponent(u.password);
  if (!cloudName || !apiKey || !apiSecret) throw new Error('CLOUDINARY_URL is malformed');
  return { cloudName, apiKey, apiSecret };
};

// Returns the Firebase uid for a valid ID token, otherwise null.
const verifyUser = async (req) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FB_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  const uid = d.users && d.users[0] && d.users[0].localId;
  return uid && /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? uid : null;
};

// Cloudinary signature: sorted "k=v" pairs joined by &, + secret, SHA-1.
const signParams = (params, secret) =>
  crypto
    .createHash('sha1')
    .update(
      Object.keys(params)
        .filter((k) => params[k] !== '' && params[k] != null)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&') + secret
    )
    .digest('hex');

module.exports = { cloudConfig, verifyUser, signParams };
