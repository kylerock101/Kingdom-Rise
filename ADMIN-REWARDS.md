# Kingdom Rise Official Reward Admin

This is a local-only Windows admin panel for sending official Kingdom Rise rewards through the existing Firebase Admin SDK reward system. It does not use Cloud Functions or public hosting.

## Launch

Double-click:

```powershell
start-official-reward-admin.bat
```

Or run manually:

```powershell
node scripts\official-gift-admin-ui.cjs
```

The server binds only to `127.0.0.1` and opens a browser at:

```text
http://127.0.0.1:8741/
```

Press `Ctrl+C` in the Command Prompt window to stop it.

## Service Account

Keep the Firebase service-account JSON outside this repository. The default suggested path is:

```text
C:\secure\kingdom-rise-service-account.json
```

The browser UI sends only the local file path to the local Node server. The server reads the file on your computer and never sends the key contents back to the browser. Do not copy service-account JSON into the repository.

## Sending A Reward

1. Connect with the service-account path.
2. Search by player name or UID.
3. Select exactly one player.
4. Choose Coins, Rolls, Soldiers, or Returning Founder preset.
5. Enter title and optional message.
6. Click `Preview Reward`.
7. Review current and expected balances.
8. Type `SEND`.
9. Click `Deliver Official Reward` once.

The panel disables delivery until connection, selection, valid reward input, preview, and typed confirmation are complete. A per-request idempotency key prevents a browser refresh or double-click from delivering the same request twice during the current local server session.

## Manual RewardTester Dry Run

To prepare a manual test without sending a reward:

1. Launch the panel.
2. Connect with `C:\secure\kingdom-rise-service-account.json`.
3. Search for `RewardTester` or UID `JkGA279M31Ow3IUXKMqhI2oy23z1`.
4. Select the player.
5. Choose `Coins` and amount `10`.
6. Set a clear test title and message.
7. Click `Preview Reward`.
8. Confirm the preview shows the selected player, current coins, `+10`, and the expected resulting balance.
9. Stop before typing `SEND` or clicking `Deliver Official Reward` unless you intentionally want to send production currency.

## Security Notes

- Localhost only: the server listens on `127.0.0.1`.
- No service-account key contents are embedded in client JavaScript.
- No arbitrary shell commands are exposed.
- No arbitrary Firestore field paths are accepted from the browser.
- Requests are validated server-side and protected with a session CSRF token.
- Existing `RESOURCE_LIMITS` and `deliverOfficialGift` logic are reused.
- Session history is kept only in memory while the server is running.