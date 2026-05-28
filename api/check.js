import fs from 'node:fs';
import path from 'node:path';
import { kv } from '@vercel/kv';

function loadDb(dbPath) {
  const raw = fs.readFileSync(dbPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') return { licenses: {} };
  if (!parsed.licenses || typeof parsed.licenses !== 'object') parsed.licenses = {};
  return parsed;
}

export default async function handler(req, res) {
  try {
    const key = String((req.query && req.query.key) || '').trim();
    const hwid = String((req.query && req.query.hwid) || '').trim();

    if (!key) return res.status(400).json({ valid: false, message: 'Missing key' });
    if (!hwid) return res.status(400).json({ valid: false, message: 'Missing hwid' });

    // Key list + revoke control still come from licenses.json
    const dbPath = path.join(process.cwd(), 'license-server', 'licenses.json');
    const db = loadDb(dbPath);
    const lic = db.licenses[key];

    if (!lic) return res.status(200).json({ valid: false, message: 'Invalid license' });
    if (lic.active === false) return res.status(200).json({ valid: false, message: 'License revoked' });

    // HWID binding is persisted in Vercel KV
    const kvKey = `hwid:${key}`;
    const storedHwid = await kv.get(kvKey);

    if (!storedHwid) {
      await kv.set(kvKey, hwid);
      return res.status(200).json({ valid: true, message: 'Activated' });
    }

    if (String(storedHwid) === hwid) {
      return res.status(200).json({ valid: true, message: 'Valid' });
    }

    return res.status(200).json({ valid: false, message: 'License used on another machine' });
  } catch {
    return res.status(500).json({ valid: false, message: 'Server error' });
  }
}

