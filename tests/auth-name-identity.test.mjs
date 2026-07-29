import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("beta.html", "utf8");
const start = html.indexOf("let AUTH_NAME_IDENTITY=");
const end = html.indexOf("const Auth = {", start);
assert.ok(start >= 0 && end > start, "auth identity helper block is present");
const helperSource = html.slice(start, end);

function createHarness({ currentUser = "Alice", fbUid = "uid_alice", displayName = "Alice", tokenName = "Alice" } = {}) {
  const calls = { updateProfile: [], getIdToken: [], getIdTokenResult: [], diagnostics: [] };
  const user = {
    uid: fbUid,
    displayName,
    getIdToken: async (force) => { calls.getIdToken.push(force); return "redacted-token"; },
    getIdTokenResult: async () => { calls.getIdTokenResult.push(true); return { claims: { name: tokenName } }; },
  };
  const context = {
    FB_UID: fbUid,
    CURRENT_USER: currentUser,
    console,
    Object,
    String,
    window: {
      FB: {
        auth: { currentUser: user },
        updateProfile: async (target, profile) => {
          calls.updateProfile.push({ uid: target.uid, profile });
          Object.assign(target, profile);
        },
      },
    },
    fbOn: () => true,
    saveDiag: (label, data) => calls.diagnostics.push({ label, data }),
  };
  vm.createContext(context);
  vm.runInContext(helperSource, context, { filename: "auth-helper.js" });
  return { context, user, calls };
}

async function run(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

await run("matching displayName refreshes token and verifies name claim", async () => {
  const { context, calls } = createHarness();
  const result = await context.ensureFirebaseNameIdentity("gift-send");
  assert.equal(result.ok, true);
  assert.deepEqual(calls.getIdToken, [true]);
  assert.equal(calls.getIdTokenResult.length, 1);
  assert.equal(calls.updateProfile.length, 0);
});

await run("missing displayName is repaired without changing UID", async () => {
  const { context, user, calls } = createHarness({ displayName: null, tokenName: "Alice" });
  const beforeUid = user.uid;
  const result = await context.repairFirebaseDisplayNameIfSafe(user, "Alice", "login");
  assert.equal(result.ok, true);
  assert.equal(user.uid, beforeUid);
  assert.equal(user.displayName, "Alice");
  assert.equal(calls.updateProfile.length, 1);
  assert.equal(calls.updateProfile[0].uid, beforeUid);
  assert.equal(calls.updateProfile[0].profile.displayName, "Alice");
  assert.deepEqual(calls.getIdToken, [true]);
});

await run("displayName mismatch is logged and not overwritten", async () => {
  const { context, user, calls } = createHarness({ displayName: "AliceOld", tokenName: "AliceOld" });
  const result = await context.repairFirebaseDisplayNameIfSafe(user, "Alice", "login");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "displayName-mismatch");
  assert.equal(user.displayName, "AliceOld");
  assert.equal(calls.updateProfile.length, 0);
  assert.equal(calls.getIdToken.length, 0);
});

await run("gift identity fails cleanly when token name mismatches current user", async () => {
  const { context, calls } = createHarness({ displayName: "Alice", tokenName: "OtherAlice" });
  const result = await context.ensureFirebaseNameIdentity("gift-inbox");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "token-name-mismatch");
  assert.deepEqual(calls.getIdToken, [true]);
});

await run("guest mode bypasses cloud gift identity", async () => {
  const { context, calls } = createHarness({ currentUser: "Guest", displayName: null, tokenName: null });
  const result = await context.ensureFirebaseNameIdentity("gift-inbox");
  assert.equal(result.ok, true);
  assert.equal(result.reason, "not-cloud-gift");
  assert.equal(calls.getIdToken.length, 0);
});


await run("registration path sets displayName and verifies refreshed name claim", async () => {
  assert.match(html, /updateProfile\(cred\.user,\{displayName:name\}\);\s*await verifyFirebaseNameClaim\(cred\.user,name,"register"\);/);
});

await run("restore unmatched stored username is not accepted", async () => {
  assert.match(html, /restore-missing-displayName-unmatched/);
  assert.doesNotMatch(html, /restore-missing-displayName-unmatched[\s\S]*?res\(stored\|\|null\)/);
  assert.match(html, /restore-missing-displayName-unmatched[\s\S]*?res\(null\)/);
});

await run("cloud gift operations require name identity", async () => {
  assert.match(html, /ensureFirebaseNameIdentity\("gift-inbox"\)/);
  assert.match(html, /ensureFirebaseNameIdentity\("gift-send"\)/);
  assert.match(html, /ensureFirebaseNameIdentity\("gift-claim"\)/);
});
if (process.exitCode) process.exit(process.exitCode);