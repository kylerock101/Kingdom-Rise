import assert from "node:assert/strict";
import { createRequire } from "node:module";
import admin from "firebase-admin";

const require = createRequire(import.meta.url);
const { createOfficialGiftService } = require("../functions/src/official-gifts.js");
const { OFFICIAL_GIFT_RESOURCES, OFFICIAL_GIFT_PRESETS } = require("../functions/src/official-gift-config.js");

const PROJECT_ID = "kingdom-rise-8e21e";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.GCLOUD_PROJECT ||= PROJECT_ID;

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const service = createOfficialGiftService({ db, FieldValue, nowMillis: () => 1700000000000 });

async function clearDb() {
  await db.recursiveDelete(db.collection("players"));
  await db.recursiveDelete(db.collection("officialGiftAudits"));
}

function authed(uid, token = {}) {
  return { auth: { uid, token } };
}

function playerDoc(uid, name, overrides = {}) {
  const now = 1699999999000;
  const legacy = {
    clientUpdatedAt: now,
    revision: 3,
    coins: 100,
    rolls: 20,
    multi: 1,
    pos: 0,
    tier: 0,
    builds: 0,
    realm: 1,
    soldiers: 5,
    blessed: false,
    raidStreak: 0,
    realmCoins: 0,
    sound: true,
    lastRoll: now,
    streak: 0,
    dailyClaimed: false,
    lastDay: "2026-07-29",
    qi: 0,
    qp: 0,
    qDone: false,
    seen: {},
    rolled: 0,
    weekProg: 0,
    weekStart: null,
    weekClaimed: false,
    weekReady: false,
    taxRate: 0,
    crime: 0,
    music: true,
    defences: ["wall", "redoubt"],
    vault: 0,
    defLog: [],
    lastDefSim: now,
    log: [],
    appearance: null,
    ownedSkins: ["default"],
    activeSkin: "default",
    slayerTurns: 0,
    dragonSlain: 0,
    dragonHP: 0,
    dragonHPMax: 0,
    ownedItems: [],
  };
  return {
    name,
    might: 500,
    realm: 1,
    schemaVersion: 2,
    gameVersion: "0.1",
    revision: 3,
    clientUpdatedAt: now,
    economy: { coins: legacy.coins, rolls: legacy.rolls, multi: 1, realmCoins: 0, vault: 0, taxRate: 0, crime: 0 },
    kingdom: { soldiers: legacy.soldiers, blessed: false, raidStreak: 0, defences: ["wall", "redoubt"], defLog: [], lastDefSim: now, log: [] },
    progression: { pos: 0, tier: 0, builds: 0, realm: 1, lastRoll: now, streak: 0, dailyClaimed: false, lastDay: "2026-07-29", qi: 0, qp: 0, qDone: false, seen: {}, rolled: 0, weekProg: 0, weekStart: null, weekClaimed: false, weekReady: false },
    settings: { sound: true, music: true },
    stats: { slayerTurns: 0, dragonSlain: 0, dragonHP: 0, dragonHPMax: 0 },
    legacyState: legacy,
    save3d: JSON.stringify(legacy),
    ...overrides,
  };
}

async function seedPlayers() {
  await db.doc("players/user_alice").set(playerDoc("user_alice", "AliceKingdom"));
  await db.doc("players/user_bob").set(playerDoc("user_bob", "BobKingdom"));
}

async function run(name, fn) {
  try {
    await clearDb();
    await fn();
    console.log("PASS", name);
  } catch (error) {
    console.error("FAIL", name);
    console.error(error);
    process.exitCode = 1;
  }
}

async function createGift(resource = "coins", amount = 50, recipient = "user_alice") {
  const result = await service.adminCreateOfficialGift({
    data: {
      recipientUids: [recipient],
      resource,
      amount,
      title: "Official Test Gift",
      message: "A system grant.",
    },
    ...authed("admin_uid", { admin: true }),
  });
  assert.equal(result.results[0].status, "created");
  return result.results[0].giftId;
}

async function getLegacy(uid) {
  const snap = await db.doc(`players/${uid}`).get();
  return JSON.parse(snap.data().save3d);
}

await run("unauthenticated grant rejected", async () => {
  await assert.rejects(
    service.adminCreateOfficialGift({ data: { recipientUids: ["user_alice"], resource: "coins", amount: 1 } }),
    /Sign in required/
  );
});

await run("ordinary authenticated player grant rejected", async () => {
  await assert.rejects(
    service.adminCreateOfficialGift({ data: { recipientUids: ["user_alice"], resource: "coins", amount: 1 }, ...authed("user_alice", {}) }),
    /Administrator access required/
  );
});

await run("admin grant succeeds", async () => {
  await seedPlayers();
  const result = await service.adminCreateOfficialGift({
    data: { recipientUids: ["user_alice"], resource: "coins", amount: 25, title: "Coins", message: "" },
    ...authed("admin_uid", { admin: true }),
  });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].status, "created");
  const gift = await db.doc(`players/user_alice/officialGifts/${result.results[0].giftId}`).get();
  assert.equal(gift.data().senderName, "Kingdom Rise");
  assert.equal(gift.data().createdByAdminUid, "admin_uid");
  assert.equal((await db.collection("officialGiftAudits").get()).size, 1);
});

await run("duplicate recipients create only one gift each", async () => {
  await seedPlayers();
  const result = await service.adminCreateOfficialGift({
    data: { recipientUids: ["user_alice", "user_alice", "user_bob"], resource: "rolls", amount: 5 },
    ...authed("admin_uid", { admin: true }),
  });
  assert.equal(result.results.length, 2);
  assert.equal((await db.collection("players/user_alice/officialGifts").get()).size, 1);
  assert.equal((await db.collection("players/user_bob/officialGifts").get()).size, 1);
});

await run("nonexistent recipient handled safely", async () => {
  await seedPlayers();
  const result = await service.adminCreateOfficialGift({
    data: { recipientUids: ["missing_uid"], resource: "coins", amount: 10 },
    ...authed("admin_uid", { admin: true }),
  });
  assert.equal(result.results[0].status, "failed");
  assert.equal(result.results[0].errorCode, "recipient-not-found");
  assert.equal((await db.collection("officialGiftAudits").get()).size, 1);
});

for (const [name, data] of [
  ["unsupported resource rejected", { recipientUids: ["user_alice"], resource: "gems", amount: 1 }],
  ["zero amount rejected", { recipientUids: ["user_alice"], resource: "coins", amount: 0 }],
  ["negative amount rejected", { recipientUids: ["user_alice"], resource: "coins", amount: -1 }],
  ["decimal amount rejected", { recipientUids: ["user_alice"], resource: "coins", amount: 1.5 }],
  ["excessive amount rejected", { recipientUids: ["user_alice"], resource: "coins", amount: OFFICIAL_GIFT_RESOURCES.coins.max + 1 }],
  ["malformed request rejected", { recipientUids: ["user_alice"], resource: "coins", amount: 1, extra: true }],
]) {
  await run(name, async () => {
    await seedPlayers();
    await assert.rejects(service.adminCreateOfficialGift({ data, ...authed("admin_uid", { admin: true }) }));
  });
}

await run("preset grant expands trusted server-side resources", async () => {
  await seedPlayers();
  const result = await service.adminCreateOfficialGiftPreset({
    data: { recipientUids: ["user_alice"], presetId: "returning_founder_gift" },
    ...authed("admin_uid", { admin: true }),
  });
  const preset = OFFICIAL_GIFT_PRESETS.returning_founder_gift;
  assert.equal(result.presetId, preset.id);
  assert.equal(result.presetName, preset.name);
  assert.equal(result.status, "draft");
  assert.deepEqual(result.resources, [
    { resource: "coins", amount: 1500 },
    { resource: "rolls", amount: 25 },
    { resource: "soldiers", amount: 6 },
  ]);
  assert.equal(result.results.length, 3);
  assert.equal(result.results.filter((r) => r.status === "created").length, 3);
  const gifts = await db.collection("players/user_alice/officialGifts").get();
  assert.equal(gifts.size, 3);
  const created = gifts.docs.map((d) => d.data()).sort((a, b) => a.resource.localeCompare(b.resource));
  assert.deepEqual(created.map((g) => [g.resource, g.amount, g.presetId, g.title]), [
    ["coins", 1500, preset.id, preset.name],
    ["rolls", 25, preset.id, preset.name],
    ["soldiers", 6, preset.id, preset.name],
  ]);
});

await run("preset grant rejects tampered client resource fields", async () => {
  await seedPlayers();
  await assert.rejects(
    service.adminCreateOfficialGiftPreset({
      data: { recipientUids: ["user_alice"], presetId: "returning_founder_gift", resource: "coins", amount: 999999 },
      ...authed("admin_uid", { admin: true }),
    }),
    /Unsupported preset request field/
  );
});

await run("ordinary authenticated player preset grant rejected", async () => {
  await seedPlayers();
  await assert.rejects(
    service.adminCreateOfficialGiftPreset({ data: { recipientUids: ["user_alice"], presetId: "returning_founder_gift" }, ...authed("user_alice", {}) }),
    /Administrator access required/
  );
});

await run("preset grant reports failed recipients per resource", async () => {
  await seedPlayers();
  const result = await service.adminCreateOfficialGiftPreset({
    data: { recipientUids: ["missing_uid"], presetId: "returning_founder_gift" },
    ...authed("admin_uid", { admin: true }),
  });
  assert.equal(result.results.length, 3);
  assert.equal(result.results.filter((r) => r.status === "failed" && r.errorCode === "recipient-not-found").length, 3);
  assert.equal((await db.collection("players/missing_uid/officialGifts").get()).size, 0);
});

await run("grantable player search omits private save and might fields", async () => {
  await seedPlayers();
  const result = await service.listGrantablePlayers({ data: { search: "Alice", limit: 10 }, ...authed("admin_uid", { admin: true }) });
  assert.equal(result.players.length, 1);
  assert.deepEqual(Object.keys(result.players[0]).sort(), ["name", "realm", "uid"]);
  assert.equal(result.players[0].uid, "user_alice");
});

await run("player cannot claim another player's gift", async () => {
  await seedPlayers();
  const giftId = await createGift("coins", 50, "user_alice");
  await assert.rejects(service.claimOfficialGift({ data: { giftId }, ...authed("user_bob", {}) }), /Gift not found/);
});

await run("valid claim awards exactly once", async () => {
  await seedPlayers();
  const giftId = await createGift("coins", 50, "user_alice");
  const result = await service.claimOfficialGift({ data: { giftId }, ...authed("user_alice", {}) });
  assert.equal(result.status, "claimed");
  assert.equal(result.balance, 150);
  const legacy = await getLegacy("user_alice");
  assert.equal(legacy.coins, 150);
});

await run("simultaneous duplicate claims award exactly once", async () => {
  await seedPlayers();
  const giftId = await createGift("rolls", 7, "user_alice");
  const claims = await Promise.allSettled([
    service.claimOfficialGift({ data: { giftId }, ...authed("user_alice", {}) }),
    service.claimOfficialGift({ data: { giftId }, ...authed("user_alice", {}) }),
  ]);
  const fulfilled = claims.filter((r) => r.status === "fulfilled").map((r) => r.value);
  assert.equal(fulfilled.filter((r) => r.status === "claimed").length, 1);
  const legacy = await getLegacy("user_alice");
  assert.equal(legacy.rolls, 27);
});

await run("repeated claim returns already-claimed state without another reward", async () => {
  await seedPlayers();
  const giftId = await createGift("soldiers", 3, "user_alice");
  const first = await service.claimOfficialGift({ data: { giftId }, ...authed("user_alice", {}) });
  const second = await service.claimOfficialGift({ data: { giftId }, ...authed("user_alice", {}) });
  assert.equal(first.status, "claimed");
  assert.equal(second.status, "already-claimed");
  const legacy = await getLegacy("user_alice");
  assert.equal(legacy.soldiers, 8);
});

await run("unrelated player save data remains unchanged", async () => {
  await seedPlayers();
  const before = await getLegacy("user_bob");
  const giftId = await createGift("coins", 50, "user_alice");
  await service.claimOfficialGift({ data: { giftId }, ...authed("user_alice", {}) });
  assert.deepEqual(await getLegacy("user_bob"), before);
});

for (const [resource, expected] of [["coins", 150], ["rolls", 70], ["soldiers", 55]]) {
  await run(`${resource} compatibility fields remain synchronized`, async () => {
    await seedPlayers();
    const giftId = await createGift(resource, 50, "user_alice");
    await service.claimOfficialGift({ data: { giftId }, ...authed("user_alice", {}) });
    const snap = await db.doc("players/user_alice").get();
    const data = snap.data();
    const legacy = JSON.parse(data.save3d);
    assert.equal(legacy[resource], expected);
    assert.equal(data.legacyState[resource], expected);
    if (resource === "soldiers") assert.equal(data.kingdom.soldiers, expected);
    else assert.equal(data.economy[resource], expected);
    assert.equal(data.revision, legacy.revision);
  });
}

await clearDb();
await admin.app().delete();

