import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, limit, query, setDoc, updateDoc, collection, addDoc, orderBy } from "firebase/firestore";
import fs from "node:fs";

const PROJECT_ID = "kingdom-rise-8e21e";

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    rules: fs.readFileSync("firestore.rules", "utf8"),
    host: "127.0.0.1",
    port: 8080,
  },
});

const ownUid = "user_alice";
const otherUid = "user_bob";
const aliceName = "AliceKingdom";
const bobName = "BobKingdom";

function authed(uid, name) {
  return testEnv.authenticatedContext(uid, { name }).firestore();
}

function guest() {
  return testEnv.unauthenticatedContext().firestore();
}

function saveDoc(uid, name, revision = 1) {
  return {
    name,
    might: 500,
    realm: 1,
    schemaVersion: 2,
    gameVersion: "0.1",
    revision,
    clientUpdatedAt: 1785280000000 + revision,
    updatedAt: 1785280000000 + revision,
    profile: { uid, username: name },
    economy: { coins: 100, rolls: 10 },
    progression: { realm: 1, tier: 0, builds: 0 },
    kingdom: { soldiers: 5 },
    settings: { sound: true },
    stats: {},
    legacyState: {},
    migrationState: "dual-write",
    save3d: JSON.stringify({
      coins: 100,
      rolls: 10,
      multi: 1,
      pos: 0,
      tier: 0,
      builds: 0,
      realm: 1,
      soldiers: 5,
      lastRoll: 1785280000000,
      revision,
      clientUpdatedAt: 1785280000000 + revision,
    }),
  };
}

async function seed(path, value) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), value);
  });
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

await testEnv.clearFirestore();

await run("authenticated user can create own player document", async () => {
  await assertSucceeds(setDoc(doc(authed(ownUid, aliceName), "players", ownUid), saveDoc(ownUid, aliceName)));
});

await run("authenticated user can update own player document", async () => {
  await assertSucceeds(setDoc(doc(authed(ownUid, aliceName), "players", ownUid), saveDoc(ownUid, aliceName, 2), { merge: true }));
});

await run("authenticated user cannot create another player document", async () => {
  await assertFails(setDoc(doc(authed(ownUid, aliceName), "players", otherUid), saveDoc(otherUid, bobName)));
});

await run("authenticated user cannot update another player document", async () => {
  await seed(`players/${otherUid}`, saveDoc(otherUid, bobName));
  await assertFails(setDoc(doc(authed(ownUid, aliceName), "players", otherUid), saveDoc(otherUid, bobName, 2), { merge: true }));
});

await run("authenticated user cannot delete another player document", async () => {
  await assertFails(deleteDoc(doc(authed(ownUid, aliceName), "players", otherUid)));
});

await run("unauthenticated user cannot write player data", async () => {
  await assertFails(setDoc(doc(guest(), "players", "guest_uid"), saveDoc("guest_uid", "Guest")));
});

await run("existing legitimate save payload passes", async () => {
  await assertSucceeds(setDoc(doc(authed(ownUid, aliceName), "players", ownUid), saveDoc(ownUid, aliceName, 3), { merge: true }));
});

await run("invalid ownership and basic types are rejected", async () => {
  await assertFails(setDoc(doc(authed(ownUid, aliceName), "players", ownUid), {
    ...saveDoc(ownUid, aliceName, 4),
    profile: { uid: otherUid, username: aliceName },
  }));
  await assertFails(setDoc(doc(authed(ownUid, aliceName), "players", ownUid), {
    ...saveDoc(ownUid, aliceName, 4),
    revision: "bad",
  }));
});

await run("current leaderboard collection query remains allowed for authenticated users", async () => {
  await assertSucceeds(getDocs(query(collection(authed(ownUid, aliceName), "players"), orderBy("might", "desc"), limit(50))));
});

await run("valid gift creation succeeds", async () => {
  await assertSucceeds(addDoc(collection(authed(ownUid, aliceName), "gifts"), {
    to: bobName,
    from: aliceName,
    type: "rolls",
    amount: 4,
    ts: Date.now(),
    claimed: false,
  }));
});

await run("gift reads are limited to sender or recipient display names", async () => {
  await testEnv.clearFirestore();
  await seed("gifts/gift_read", {
    to: "Bob",
    from: "Alice",
    type: "rolls",
    amount: 3,
    ts: 1700000000000,
    claimed: false
  });

  await assertSucceeds(getDoc(doc(authed("bob_uid", "Bob"), "gifts", "gift_read")));
  await assertSucceeds(getDoc(doc(authed("alice_uid", "Alice"), "gifts", "gift_read")));
  await assertFails(getDoc(doc(authed("mallory_uid", "Mallory"), "gifts", "gift_read")));
});
await run("invalid gift amount and type fail", async () => {
  await assertFails(addDoc(collection(authed(ownUid, aliceName), "gifts"), {
    to: bobName,
    from: aliceName,
    type: "rolls",
    amount: 1000,
    ts: Date.now(),
    claimed: false,
  }));
  await assertFails(addDoc(collection(authed(ownUid, aliceName), "gifts"), {
    to: bobName,
    from: aliceName,
    type: "admin",
    amount: 1,
    ts: Date.now(),
    claimed: false,
  }));
});

await run("unrelated user cannot claim another user's gift", async () => {
  await seed("gifts/gift-for-bob", {
    to: bobName,
    from: aliceName,
    type: "rolls",
    amount: 3,
    ts: Date.now(),
    claimed: false,
  });
  await assertFails(updateDoc(doc(authed("user_charlie", "CharlieKingdom"), "gifts", "gift-for-bob"), { claimed: true }));
});

await run("intended recipient can only change claimed false to true", async () => {
  await assertSucceeds(updateDoc(doc(authed(otherUid, bobName), "gifts", "gift-for-bob"), { claimed: true }));
});

await run("claim cannot alter reward details", async () => {
  await seed("gifts/gift-for-bob-2", {
    to: bobName,
    from: aliceName,
    type: "rolls",
    amount: 3,
    ts: Date.now(),
    claimed: false,
  });
  await assertFails(updateDoc(doc(authed(otherUid, bobName), "gifts", "gift-for-bob-2"), { claimed: true, amount: 99 }));
});

await run("client gift deletes are denied", async () => {
  await assertFails(deleteDoc(doc(authed(otherUid, bobName), "gifts", "gift-for-bob-2")));
});

await run("player can read only their official gifts", async () => {
  await testEnv.clearFirestore();
  await seed("players/user_alice/officialGifts/gift_alice", {
    recipientUid: "user_alice",
    resource: "coins",
    amount: 100,
    title: "Official Gift",
    message: "",
    senderType: "system",
    senderName: "Kingdom Rise",
    claimed: false,
    createdAt: 1700000000000,
    claimedAt: null,
    createdByAdminUid: "admin_uid",
    presetId: null,
    schemaVersion: 1,
  });
  await seed("players/user_bob/officialGifts/gift_bob", {
    recipientUid: "user_bob",
    resource: "coins",
    amount: 100,
    title: "Official Gift",
    message: "",
    senderType: "system",
    senderName: "Kingdom Rise",
    claimed: false,
    createdAt: 1700000000000,
    claimedAt: null,
    createdByAdminUid: "admin_uid",
    presetId: null,
    schemaVersion: 1,
  });
  await assertSucceeds(getDoc(doc(authed("user_alice", aliceName), "players/user_alice/officialGifts/gift_alice")));
  await assertFails(getDoc(doc(authed("user_alice", aliceName), "players/user_bob/officialGifts/gift_bob")));
});

await run("player cannot directly create, update, or delete official gifts", async () => {
  await testEnv.clearFirestore();
  const playerDb = authed("user_alice", aliceName);
  const giftRef = doc(playerDb, "players/user_alice/officialGifts/gift_direct");
  await assertFails(setDoc(giftRef, {
    recipientUid: "user_alice",
    resource: "coins",
    amount: 100,
    claimed: false,
  }));
  await seed("players/user_alice", saveDoc("user_alice", aliceName));
  await seed("players/user_alice/officialGifts/gift_direct", {
    recipientUid: "user_alice",
    resource: "coins",
    amount: 100,
    title: "Official Gift",
    message: "",
    senderType: "system",
    senderName: "Kingdom Rise",
    claimed: false,
    createdAt: 1700000000000,
    claimedAt: null,
    createdByAdminUid: "admin_uid",
    presetId: null,
    schemaVersion: 1,
  });
  await assertFails(updateDoc(giftRef, { claimed: true }));
  await assertFails(updateDoc(doc(playerDb, "players/user_alice"), { coins: 999999 }));
  await assertFails(deleteDoc(giftRef));
});

await run("official gift audits and presets are not client-readable or writable", async () => {
  const playerDb = authed("user_alice", aliceName);
  await assertFails(getDoc(doc(playerDb, "officialGiftAudits/audit_1")));
  await assertFails(setDoc(doc(playerDb, "officialGiftAudits/audit_1"), { status: "created" }));
  await assertFails(getDoc(doc(playerDb, "officialGiftPresets/returning_founder_gift")));
  await assertFails(setDoc(doc(playerDb, "officialGiftPresets/returning_founder_gift"), { coins: 1 }));
});
await run("guest mode remains local and has no Firestore access", async () => {
  await assertFails(getDoc(doc(guest(), "players", ownUid)));
  await assertFails(addDoc(collection(guest(), "gifts"), {
    to: bobName,
    from: "Guest",
    type: "rolls",
    amount: 1,
    ts: Date.now(),
    claimed: false,
  }));
});

await testEnv.cleanup();

if (process.exitCode) {
  process.exit(process.exitCode);
}
