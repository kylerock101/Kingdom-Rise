import assert from "node:assert/strict";
import { createRequire } from "node:module";
import admin from "firebase-admin";

const require = createRequire(import.meta.url);
const {
  buildGrantPlan,
  uniqueRecipientUids,
  deliverOfficialGift,
} = require("../scripts/official-gift-admin-lib.cjs");

const PROJECT_ID = "kingdom-rise-8e21e";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.GCLOUD_PROJECT ||= PROJECT_ID;

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const NOW = 1700000000000;

async function clearDb() {
  await db.recursiveDelete(db.collection("players"));
  await db.recursiveDelete(db.collection("officialGiftAudits"));
}

function playerDoc(name, overrides = {}) {
  const legacy = {
    clientUpdatedAt: NOW - 1000,
    revision: 4,
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
    lastRoll: NOW - 1000,
    streak: 0,
    dailyClaimed: false,
    lastDay: "2026-07-30",
    qi: 0,
    qp: 0,
    qDone: false,
    seen: { intro: 1 },
    rolled: 3,
    weekProg: 2,
    weekStart: null,
    weekClaimed: false,
    weekReady: false,
    taxRate: 0,
    crime: 0,
    music: true,
    defences: ["wall", "redoubt"],
    vault: 7,
    defLog: [{ held: true }],
    lastDefSim: NOW - 1000,
    log: [{ t: "keep me" }],
    appearance: { robe: "red" },
    ownedSkins: ["default"],
    activeSkin: "default",
    slayerTurns: 0,
    dragonSlain: 0,
    dragonHP: 0,
    dragonHPMax: 0,
    ownedItems: ["item_a"],
  };
  return {
    name,
    might: 500,
    realm: 1,
    schemaVersion: 2,
    gameVersion: "0.1",
    revision: legacy.revision,
    clientUpdatedAt: legacy.clientUpdatedAt,
    economy: { coins: legacy.coins, rolls: legacy.rolls, multi: 1, realmCoins: 0, vault: 7, taxRate: 0, crime: 0 },
    kingdom: { soldiers: legacy.soldiers, blessed: false, raidStreak: 0, defences: legacy.defences, defLog: legacy.defLog, lastDefSim: legacy.lastDefSim, log: legacy.log },
    progression: { pos: 0, tier: 0, builds: 0, realm: 1, lastRoll: legacy.lastRoll, streak: 0, dailyClaimed: false, lastDay: legacy.lastDay, qi: 0, qp: 0, qDone: false, seen: legacy.seen, rolled: 3, weekProg: 2, weekStart: null, weekClaimed: false, weekReady: false },
    settings: { sound: true, music: true },
    stats: { slayerTurns: 0, dragonSlain: 0, dragonHP: 0, dragonHPMax: 0 },
    legacyState: Object.assign({}, legacy),
    save3d: JSON.stringify(legacy),
    ...overrides,
  };
}


function rewardTesterProductionDoc() {
  const legacy = {
    clientUpdatedAt: 1785546000000,
    revision: 22,
    coins: 200,
    rolls: 103,
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
    lastRoll: 1785546000000,
    streak: 0,
    dailyClaimed: false,
    lastDay: "2026-07-31",
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
    lastDefSim: 1785546000000,
    log: [],
    appearance: { gender: "king", crown: "crown" },
    ownedSkins: ["default"],
    activeSkin: "default",
    slayerTurns: 0,
    dragonSlain: 0,
    dragonHP: 0,
    dragonHPMax: 0,
    ownedItems: [],
  };
  return {
    name: "RewardTester",
    might: 500,
    realm: 1,
    schemaVersion: 2,
    gameVersion: "0.1",
    revision: 22,
    clientUpdatedAt: legacy.clientUpdatedAt,
    profile: { uid: "user_rewardtester", username: "RewardTester", appearance: legacy.appearance, ownedSkins: ["default"], activeSkin: "default", ownedItems: [], legacyUnknown: {} },
    economy: { coins: 200, rolls: 103, multi: 1, realmCoins: 0, vault: 0, taxRate: 0, crime: 0 },
    progression: { pos: 0, tier: 0, builds: 0, realm: 1, lastRoll: legacy.lastRoll, streak: 0, dailyClaimed: false, lastDay: legacy.lastDay, qi: 0, qp: 0, qDone: false, seen: {}, rolled: 0, weekProg: 0, weekStart: null, weekClaimed: false, weekReady: false },
    kingdom: { soldiers: 5, blessed: false, raidStreak: 0, defences: legacy.defences, defLog: [], lastDefSim: legacy.lastDefSim, log: [] },
    settings: { sound: true, music: true },
    stats: { slayerTurns: 0, dragonSlain: 0, dragonHP: 0, dragonHPMax: 0 },
    legacyState: Object.assign({}, legacy),
    save3d: JSON.stringify(legacy),
    migrationState: "dual-write",
  };
}
async function seedPlayers() {
  await db.doc("players/user_alice").set(playerDoc("AliceKingdom"));
  await db.doc("players/user_bob").set(playerDoc("BobKingdom"));
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

async function deliver(plan) {
  return deliverOfficialGift(db, FieldValue, plan, { nowMillis: () => NOW });
}

async function getPlayer(uid = "user_alice") {
  const snap = await db.doc("players/" + uid).get();
  return snap.data();
}

await run("local tool rejects invalid resources", async () => {
  assert.throws(() => buildGrantPlan({ uids: "user_alice", resource: "gems", amount: 1 }), /Unsupported resource/);
});

for (const amount of [0, -1, 1.5, "abc", 1000001]) {
  await run("local tool rejects invalid amount " + amount, async () => {
    assert.throws(() => buildGrantPlan({ uids: "user_alice", resource: "coins", amount }), /Amount/);
  });
}

await run("local tool removes duplicate recipients", async () => {
  assert.deepEqual(uniqueRecipientUids("user_alice,user_alice,user_bob"), ["user_alice", "user_bob"]);
});

for (const [resource, amount, expected] of [["coins", 50, 150], ["rolls", 7, 27], ["soldiers", 3, 8]]) {
  await run("local tool updates " + resource + " correctly", async () => {
    await seedPlayers();
    const plan = buildGrantPlan({ uids: "user_alice", resource, amount, title: "Test" });
    const result = await deliver(plan);
    assert.equal(result.results[0].status, "delivered");
    const player = await getPlayer();
    const legacy = JSON.parse(player.save3d);
    assert.equal(legacy[resource], expected);
    assert.equal(player.legacyState[resource], expected);
    if (resource === "soldiers") assert.equal(player.kingdom.soldiers, expected);
    else assert.equal(player.economy[resource], expected);
  });
}

await run("compatibility fields stay synchronized", async () => {
  await seedPlayers();
  const plan = buildGrantPlan({ uids: "user_alice", preset: "returning-founder" });
  await deliver(plan);
  const player = await getPlayer();
  const legacy = JSON.parse(player.save3d);
  assert.equal(player.revision, 5);
  assert.equal(player.legacyState.revision, 5);
  assert.equal(legacy.revision, 5);
  assert.equal(player.clientUpdatedAt, NOW);
  assert.equal(player.legacyState.clientUpdatedAt, NOW);
  assert.equal(legacy.clientUpdatedAt, NOW);
  assert.equal(legacy.coins, 1600);
  assert.equal(legacy.rolls, 45);
  assert.equal(legacy.soldiers, 11);
  assert.equal(player.economy.coins, 1600);
  assert.equal(player.economy.rolls, 45);
  assert.equal(player.kingdom.soldiers, 11);
});

await run("unrelated save data remains unchanged", async () => {
  await seedPlayers();
  const before = await getPlayer();
  const plan = buildGrantPlan({ uids: "user_alice", resource: "coins", amount: 25 });
  await deliver(plan);
  const after = await getPlayer();
  const legacy = JSON.parse(after.save3d);
  assert.deepEqual(legacy.seen, JSON.parse(before.save3d).seen);
  assert.deepEqual(legacy.defLog, JSON.parse(before.save3d).defLog);
  assert.deepEqual(after.legacyState.log, before.legacyState.log);
  assert.deepEqual(after.legacyState.ownedItems, before.legacyState.ownedItems);
});

await run("one notification is created per successful recipient", async () => {
  await seedPlayers();
  const plan = buildGrantPlan({ uids: "user_alice,user_bob", preset: "returning-founder" });
  const result = await deliver(plan);
  assert.equal(result.results.filter((r) => r.status === "delivered").length, 2);
  assert.equal((await db.collection("players/user_alice/officialGifts").get()).size, 1);
  assert.equal((await db.collection("players/user_bob/officialGifts").get()).size, 1);
  const gift = (await db.collection("players/user_alice/officialGifts").get()).docs[0].data();
  assert.equal(gift.deliveryStatus, "delivered");
  assert.equal(gift.senderName, "Kingdom Rise");
  assert.equal(gift.resources.length, 3);
});


await run("production-shaped RewardTester coin reward synchronizes to 210", async () => {
  await db.doc("players/user_rewardtester").set(rewardTesterProductionDoc());
  const plan = buildGrantPlan({ uids: "user_rewardtester", resource: "coins", amount: 10, title: "Prod Shape" });
  const result = await deliver(plan);
  assert.equal(result.results[0].status, "delivered");
  const player = await getPlayer("user_rewardtester");
  const legacy = JSON.parse(player.save3d);
  assert.equal(player.economy.coins, 210);
  assert.equal(player.legacyState.coins, 210);
  assert.equal(legacy.coins, 210);
  assert.equal(player.revision, 23);
  assert.equal(player.legacyState.revision, 23);
  assert.equal(legacy.revision, 23);
  assert.equal(player.clientUpdatedAt, NOW);
  assert.equal(player.legacyState.clientUpdatedAt, NOW);
  assert.equal(legacy.clientUpdatedAt, NOW);
  assert.equal(player.economy.rolls, 103);
  assert.equal(player.kingdom.soldiers, 5);
  assert.equal((await db.collection("players/user_rewardtester/officialGifts").get()).size, 1);
});

await run("production-shaped next normal save preserves rewarded coins", async () => {
  await db.doc("players/user_rewardtester").set(rewardTesterProductionDoc());
  const plan = buildGrantPlan({ uids: "user_rewardtester", resource: "coins", amount: 10, title: "Prod Shape" });
  await deliver(plan);
  const rewarded = await getPlayer("user_rewardtester");
  const legacy = JSON.parse(rewarded.save3d);
  const nextRevision = rewarded.revision + 1;
  legacy.revision = nextRevision;
  legacy.clientUpdatedAt = NOW + 5000;
  await db.doc("players/user_rewardtester").set({
    save3d: JSON.stringify(legacy),
    revision: nextRevision,
    clientUpdatedAt: legacy.clientUpdatedAt,
    economy: Object.assign({}, rewarded.economy, { coins: legacy.coins }),
    legacyState: Object.assign({}, rewarded.legacyState, { coins: legacy.coins, revision: nextRevision, clientUpdatedAt: legacy.clientUpdatedAt }),
  }, { merge: true });
  const after = await getPlayer("user_rewardtester");
  assert.equal(after.economy.coins, 210);
  assert.equal(after.legacyState.coins, 210);
  assert.equal(JSON.parse(after.save3d).coins, 210);
  assert.equal((await db.collection("players/user_rewardtester/officialGifts").get()).size, 1);
});
await run("failed recipient does not corrupt successful recipients", async () => {
  await seedPlayers();
  const plan = buildGrantPlan({ uids: "user_alice,missing_uid", resource: "coins", amount: 40 });
  const result = await deliver(plan);
  assert.equal(result.results.find((r) => r.uid === "user_alice").status, "delivered");
  assert.equal(result.results.find((r) => r.uid === "missing_uid").status, "failed");
  const player = await getPlayer();
  assert.equal(JSON.parse(player.save3d).coins, 140);
  assert.equal((await db.collection("players/missing_uid/officialGifts").get()).size, 0);
});

await clearDb();
await admin.app().delete();
