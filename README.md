# License server (Vercel + KV)

This is a small Vercel serverless endpoint used by the Electron app to validate license keys and bind them to a hardware ID (HWID).

## Endpoint

- **GET** `/check?key=LICENSE_KEY&hwid=HARDWARE_ID`
- **Returns**: `{ "valid": true|false, "message": "..." }`

## License database

Edit `licenses.json`:

```json
{
  "licenses": {
    "CLIENT_KEY_001": {
      "active": true,
      "note": "Client 1"
    }
  }
}
```

- **Add a new key**: add a new object under `licenses`.
- **Revoke a key**: set `"active": false`.
- **HWID binding** is stored in **Vercel KV** (not in `licenses.json`).

## Deploy to Vercel

1. Create a new Vercel project and set its root directory to `license-server/`.
2. In Vercel dashboard: **Storage → Create → KV** (free tier is fine).
3. Connect that KV database to this Vercel project (Vercel will auto-inject the required env vars).
4. Deploy.
5. Your endpoint will be available at:
   - `https://<project>.vercel.app/check?key=...&hwid=...`

## KV admin operations (HWID binding)

HWID bindings are stored in KV keys like:

- `hwid:CLIENT_KEY_001` → `"some-hwid-hash"`

To reset the HWID binding (allow the key to activate on a new machine):
- Go to Vercel **Storage → KV → Data browser**
- Delete the key: `hwid:LICENSE_KEY`

## Admin operations summary

- **ADD KEY**: add to `licenses.json` + redeploy
- **REVOKE**: set `"active": false` in `licenses.json` + redeploy
- **RESET HWID**: delete KV entry `hwid:KEY`
- **FULL REVOKE**: set `"active": false` + delete KV entry

