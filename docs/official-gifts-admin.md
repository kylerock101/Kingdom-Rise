# Official Gift Admin Setup

The Official Kingdom Gift admin UI is visible only when the signed-in Firebase Auth user has a custom claim:

```json
{ "admin": true }
```

The callable Functions also enforce this claim server-side. The UI is not the authority.

## Credentials

Do not commit service-account JSON, tokens, or private keys. Use Application Default Credentials or set `GOOGLE_APPLICATION_CREDENTIALS` to a local file outside the repository.

## Assign Admin

```powershell
node scripts\set-admin-claim.cjs <firebase-auth-uid> --confirm
```

The script prints the target UID and email before applying the claim and preserves existing custom claims.

## Remove Admin

```powershell
node scripts\remove-admin-claim.cjs <firebase-auth-uid> --confirm
```

The script prints the target UID and email before changing claims and preserves unrelated custom claims.

After either command, the user must sign out and back in, or force-refresh their ID token, before the browser sees the new claim.
