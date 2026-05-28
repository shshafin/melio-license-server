const fs = require('node:fs');
const path = require('node:path');
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function loadDb(dbPath) {
  const raw = fs.readFileSync(dbPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') return { licenses: {} };
  if (!parsed.licenses || typeof parsed.licenses !== 'object') parsed.licenses = {};
  return parsed;
}

module.exports = async (req, res) => {
  try {
    const key = String((req.query && req.query.key) || '').trim();
    const hwid = String((req.query && req.query.hwid) || '').trim();

    if (!key) return res.status(400).json({ valid: false, message: 'Missing key' });
    if (!hwid) return res.status(400).json({ valid: false, message: 'Missing hwid' });

    // Key list + revoke control still come from licenses.json
    const dbPath = path.join(process.cwd(), 'licenses.json');
    const db = loadDb(dbPath);
    const lic = db.licenses[key];

    if (!lic) return res.status(200).json({ valid: false, message: 'Invalid license' });
    if (lic.active === false) return res.status(200).json({ valid: false, message: 'License revoked' });

    // HWID binding is persisted in Upstash Redis (Vercel integration)
    const kvKey = `hwid:${key}`;
    const storedHwid = await redis.get(kvKey);

    if (!storedHwid) {
      await redis.set(kvKey, hwid);
      return res.status(200).json({ valid: true, message: 'Activated' });
    }

    if (String(storedHwid) === hwid) {
      return res.status(200).json({ valid: true, message: 'Valid' });
    }

    return res.status(200).json({ valid: false, message: 'License used on another machine' });
  } catch {
    return res.status(500).json({ valid: false, message: 'Server error' });
  }
};

