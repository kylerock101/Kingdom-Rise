# Official Gift Admin Setup

Kingdom Rise currently uses the Firebase Spark-compatible Official Gift workflow. No Cloud Functions or Blaze deployment is required for official gifts.

## How It Works

An administrator runs a local Node.js tool with Firebase Admin SDK credentials stored outside this repository. The tool writes trusted updates directly to Firestore:

- updates the selected player document balances
- keeps `save3d`, schema-v2 fields, `legacyState`, `revision`, and `clientUpdatedAt` synchronized
- creates a delivered notification at `players/{uid}/officialGifts/{giftId}`
- creates an audit record in `officialGiftAudits`

Players only read their own delivered official gift notifications. They do not press Claim, and they cannot create or alter official notifications through client rules.

## Credentials

Never commit service-account JSON, tokens, private keys, `.env` files, or PEM files. Store the service-account JSON outside the repository and pass it with `--key`, or set `GOOGLE_APPLICATION_CREDENTIALS` locally.

## List Players

```powershell
node scripts\official-gift-admin.cjs list --search Alice --key C:\secure\kingdom-rise-service-account.json
```

## Send One Resource

```powershell
node scripts\official-gift-admin.cjs send --uids uid1,uid2 --resource coins --amount 1500 --title "Welcome Back" --message "Glad to see you again." --key C:\secure\kingdom-rise-service-account.json
```

The tool previews names and shortened UIDs, then requires typing `SEND`. For scripted local testing only, add `--yes`.

## Send Returning Founder Preset

```powershell
node scripts\official-gift-admin.cjs preset --uids uid1,uid2 --preset returning-founder --key C:\secure\kingdom-rise-service-account.json
```

Preset contents are defined locally in `scripts/official-gift-admin-lib.cjs`:

- 1,500 coins
- 25 rolls
- 6 soldiers

## Spark Plan Notes

The previous callable Functions prototype was removed from the active tree and remains available in repository history, but the active Spark path does not require deploying Functions. `firebase.json` intentionally has no `functions` section.
