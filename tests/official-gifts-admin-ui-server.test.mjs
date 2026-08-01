import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import admin from "firebase-admin";

const require = createRequire(import.meta.url);
const { createOfficialGiftAdminUiServer, publicError } = require("../scripts/official-gift-admin-ui.cjs");

const PROJECT_ID = "kingdom-rise-8e21e";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
process.env.GCLOUD_PROJECT ||= PROJECT_ID;

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const NOW = 1700000000000;

function legacySave(overrides = {}) {
  return Object.assign({
    clientUpdatedAt: NOW - 1000,
    revision: 4,
    coins: 200,
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
    lastDay: "2026-08-01",
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
    lastDefSim: NOW - 1000,
    log: [],
    appearance: null,
    ownedSkins: ["default"],
    activeSkin: "default",
    slayerTurns: 0,
    dragonSlain: 0,
    dragonHP: 0,
    dragonHPMax: 0,
    ownedItems: [],
  }, overrides);
}

function playerDoc(name, overrides = {}) {
  const legacy = legacySave(overrides.legacy || {});
  return Object.assign({
    name,
    might: 500,
    realm: legacy.realm,
    schemaVersion: 2,
    gameVersion: "0.1",
    revision: legacy.revision,
    clientUpdatedAt: legacy.clientUpdatedAt,
    profile: { uid: "user_admin", username: name, ownedSkins: ["default"], activeSkin: "default", ownedItems: [], legacyUnknown: {} },
    economy: { coins: legacy.coins, rolls: legacy.rolls, multi: legacy.multi, realmCoins: legacy.realmCoins, vault: legacy.vault, taxRate: legacy.taxRate, crime: legacy.crime },
    progression: { pos: legacy.pos, tier: legacy.tier, builds: legacy.builds, realm: legacy.realm, lastRoll: legacy.lastRoll, streak: legacy.streak, dailyClaimed: legacy.dailyClaimed, lastDay: legacy.lastDay, qi: legacy.qi, qp: legacy.qp, qDone: legacy.qDone, seen: legacy.seen, rolled: legacy.rolled, weekProg: legacy.weekProg, weekStart: legacy.weekStart, weekClaimed: legacy.weekClaimed, weekReady: legacy.weekReady },
    kingdom: { soldiers: legacy.soldiers, blessed: legacy.blessed, raidStreak: legacy.raidStreak, defences: legacy.defences, defLog: legacy.defLog, lastDefSim: legacy.lastDefSim, log: legacy.log },
    settings: { sound: legacy.sound, music: legacy.music },
    stats: { slayerTurns: legacy.slayerTurns, dragonSlain: legacy.dragonSlain, dragonHP: legacy.dragonHP, dragonHPMax: legacy.dragonHPMax },
    legacyState: Object.assign({}, legacy),
    save3d: JSON.stringify(legacy),
    migrationState: "dual-write",
  }, overrides.doc || {});
}

async function clearDb() {
  await db.recursiveDelete(db.collection("players"));
  await db.recursiveDelete(db.collection("officialGiftAudits"));
}

async function seed() {
  await db.doc("players/user_admin").set(playerDoc("AdminTester"));
  await db.doc("players/user_rolls").set(playerDoc("RollTester", { legacy: { rolls: 30 } }));
  await db.doc("players/user_soldiers").set(playerDoc("SoldierTester", { legacy: { soldiers: 8 } }));
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address())));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function request(address, method, pathname, body, csrf) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";
    const req = http.request({
      host: "127.0.0.1",
      port: address.port,
      method,
      path: pathname,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
        "x-kr-admin-csrf": csrf,
        origin: `http://127.0.0.1:${address.port}`,
      },
    }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let data = text;
        try { data = JSON.parse(text); } catch {}
        resolve({ status: res.statusCode, body: data, text });
      });
    });
    req.on("error", reject);
    req.end(payload);
  });
}

function createServer(adminFactory = async () => ({ db, FieldValue, keyPath: "C:\\secure\\kingdom-rise-service-account.json" })) {
  return createOfficialGiftAdminUiServer({ port: 0, csrfToken: "test-csrf-token", adminFactory });
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

await run("server binds only to 127.0.0.1", async () => {
  const server = createServer();
  const address = await listen(server);
  assert.equal(address.address, "127.0.0.1");
  await close(server);
});

await run("health endpoint identifies the local admin service", async () => {
  const server = createServer();
  const address = await listen(server);
  const res = await request(address, "GET", "/health", null, "test-csrf-token");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true, service: "kingdom-rise-official-reward-admin" });
  await close(server);
});

await run("unauthenticated unconnected reward attempts fail", async () => {
  const server = createServer();
  const address = await listen(server);
  const res = await request(address, "POST", "/api/deliver", { uid: "user_admin", rewardType: "coins", amount: 10, confirmation: "SEND", idempotencyKey: "abcdefghijklmnop" }, "test-csrf-token");
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Connect to Firebase first/);
  await close(server);
});

await run("connect errors mask full service-account path", async () => {
  const server = createServer(async () => { throw new Error("Cannot load C:\\secure\\kingdom-rise-service-account.json"); });
  const address = await listen(server);
  const res = await request(address, "POST", "/api/connect", { keyPath: "C:\\secure\\kingdom-rise-service-account.json" }, "test-csrf-token");
  assert.equal(res.status, 500);
  assert.doesNotMatch(res.body.error, /C:\\secure\\/);
  assert.match(res.body.error, /kingdom-rise-service-account\.json/);
  await close(server);
});

await run("search returns balances without exposing key contents in UI", async () => {
  await seed();
  const server = createServer();
  const address = await listen(server);
  const page = await request(address, "GET", "/", null, "test-csrf-token");
  assert.equal(page.status, 200);
  assert.doesNotMatch(page.text, /PRIVATE KEY|BEGIN PRIVATE KEY/);
  await request(address, "POST", "/api/connect", { keyPath: "C:\\secure\\kingdom-rise-service-account.json" }, "test-csrf-token");
  const res = await request(address, "GET", "/api/players?search=Admin", null, "test-csrf-token");
  assert.equal(res.status, 200);
  assert.equal(res.body.players[0].coins, 200);
  assert.equal(res.body.players[0].rolls, 20);
  assert.equal(res.body.players[0].soldiers, 5);
  await close(server);
});

for (const [rewardType, amount] of [["gems", 1], ["coins", 0], ["coins", 1000001], ["coins", 1.5]]) {
  await run("invalid reward input fails " + rewardType + " " + amount, async () => {
    await seed();
    const server = createServer();
    const address = await listen(server);
    await request(address, "POST", "/api/connect", { keyPath: "C:\\secure\\kingdom-rise-service-account.json" }, "test-csrf-token");
    const res = await request(address, "POST", "/api/preview", { uid: "user_admin", rewardType, amount, title: "Bad" }, "test-csrf-token");
    assert.equal(res.status, 400);
    await close(server);
  });
}

await run("unknown UID fails", async () => {
  await seed();
  const server = createServer();
  const address = await listen(server);
  await request(address, "POST", "/api/connect", { keyPath: "C:\\secure\\kingdom-rise-service-account.json" }, "test-csrf-token");
  const res = await request(address, "POST", "/api/preview", { uid: "missing_uid", rewardType: "coins", amount: 10, title: "Missing" }, "test-csrf-token");
  assert.equal(res.status, 404);
  await close(server);
});

await run("double-submit idempotency creates one gift and one audit", async () => {
  await seed();
  const server = createServer();
  const address = await listen(server);
  await request(address, "POST", "/api/connect", { keyPath: "C:\\secure\\kingdom-rise-service-account.json" }, "test-csrf-token");
  const body = { uid: "user_admin", rewardType: "coins", amount: 10, title: "Once", confirmation: "SEND", idempotencyKey: "samekeysamekey12" };
  const one = await request(address, "POST", "/api/deliver", body, "test-csrf-token");
  const two = await request(address, "POST", "/api/deliver", body, "test-csrf-token");
  assert.equal(one.status, 200);
  assert.equal(two.status, 200);
  assert.equal(one.body.result.results[0].giftId, two.body.result.results[0].giftId);
  assert.equal((await db.collection("players/user_admin/officialGifts").get()).size, 1);
  assert.equal((await db.collection("officialGiftAudits").where("recipientUid", "==", "user_admin").get()).size, 1);
  const player = (await db.doc("players/user_admin").get()).data();
  assert.equal(player.economy.coins, 210);
  assert.equal(player.legacyState.coins, 210);
  assert.equal(JSON.parse(player.save3d).coins, 210);
  await close(server);
});

for (const [uid, rewardType, amount, field, expected] of [["user_admin", "coins", 25, "coins", 225], ["user_rolls", "rolls", 4, "rolls", 34], ["user_soldiers", "soldiers", 3, "soldiers", 11]]) {
  await run("normal reward works for " + rewardType, async () => {
    await seed();
    const server = createServer();
    const address = await listen(server);
    await request(address, "POST", "/api/connect", { keyPath: "C:\\secure\\kingdom-rise-service-account.json" }, "test-csrf-token");
    const res = await request(address, "POST", "/api/deliver", { uid, rewardType, amount, title: "Normal", confirmation: "SEND", idempotencyKey: "key" + rewardType + "1234567890" }, "test-csrf-token");
    assert.equal(res.status, 200);
    const player = (await db.doc("players/" + uid).get()).data();
    assert.equal(JSON.parse(player.save3d)[field], expected);
    assert.equal(player.legacyState[field], expected);
    if (field === "soldiers") assert.equal(player.kingdom.soldiers, expected);
    else assert.equal(player.economy[field], expected);
    await close(server);
  });
}

await run("Returning Founder preset works", async () => {
  await seed();
  const server = createServer();
  const address = await listen(server);
  await request(address, "POST", "/api/connect", { keyPath: "C:\\secure\\kingdom-rise-service-account.json" }, "test-csrf-token");
  const res = await request(address, "POST", "/api/deliver", { uid: "user_admin", rewardType: "returning-founder", title: "Founder", confirmation: "SEND", idempotencyKey: "presetpreset123456" }, "test-csrf-token");
  assert.equal(res.status, 200);
  const player = (await db.doc("players/user_admin").get()).data();
  assert.equal(player.economy.coins, 1700);
  assert.equal(player.economy.rolls, 45);
  assert.equal(player.kingdom.soldiers, 11);
  assert.equal((await db.collection("players/user_admin/officialGifts").get()).size, 1);
  assert.equal((await db.collection("officialGiftAudits").where("recipientUid", "==", "user_admin").get()).size, 1);
  await close(server);
});

await run("CSRF protection rejects local posts without token", async () => {
  const server = createServer();
  const address = await listen(server);
  const res = await request(address, "POST", "/api/connect", { keyPath: "x" }, "wrong-token");
  assert.equal(res.status, 403);
  await close(server);
});

assert.equal(publicError(new Error("Cannot load C:\\secure\\kingdom-rise-service-account.json")), "Cannot load ...\\kingdom-rise-service-account.json");

await clearDb();
await admin.app().delete();