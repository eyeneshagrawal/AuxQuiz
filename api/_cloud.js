// Shared helpers for Cloudinary + Firebase auth. The leading underscore keeps Vercel
// from exposing this file as its own endpoint.
// Env: CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>   (required)
const crypto = require('crypto');

const FB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyB42w1PQlyopaSoyQv4xcH0wtjyrItM9XY';

class CloudConfigError extends Error {}

// Lenient parser: tolerates quotes, a pasted "CLOUDINARY_URL=" prefix, <placeholders>, spaces/newlines.
// Error messages never contain the key or secret.
const cloudConfig = () => {
  let raw = process.env.CLOUDINARY_URL || '';
  if (!raw.trim()) throw new CloudConfigError('CLOUDINARY_URL is not set for Production (add it, then Redeploy)');
  const q = (v) => v.trim().replace(/^["']+|["']+$/g, '').trim();
  raw = q(q(raw).replace(/^CLOUDINARY_URL\s*=\s*/i, ''));
  const m = raw.match(/^cloudinary:\/\/([^:@\s]+):([^@\s]+)@([^\/?#\s]+)/i);
  if (!m) {
    throw new CloudConfigError(
      `CLOUDINARY_URL format wrong (length ${raw.length}, starts with "cloudinary://": ${/^cloudinary:\/\//i.test(raw)}). Expected cloudinary://KEY:SECRET@CLOUDNAME`
    );
  }
  const clean = (v) => { try { v = decodeURIComponent(v); } catch (_) {} return v.replace(/[<>]/g, '').trim(); };
  const apiKey = clean(m[1]), apiSecret = clean(m[2]), cloudName = clean(m[3]);
  if (!apiKey || !apiSecret || !cloudName) throw new CloudConfigError('CLOUDINARY_URL has an empty key, secret or cloud name');
  return { cloudName, apiKey, apiSecret };
};

// Turns any error into a safe message for the browser.
const failMsg = (e, fallback) => {
  console.error('[auxquiz]', e && e.stack ? e.stack : e);
  return e instanceof CloudConfigError ? `Server cloud config: ${e.message}` : fallback;
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

module.exports = { cloudConfig, verifyUser, signParams, failMsg };
