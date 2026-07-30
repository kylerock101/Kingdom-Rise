"use strict";

const {
  OFFICIAL_GIFT_SCHEMA_VERSION,
  OFFICIAL_GIFT_RESOURCES,
  OFFICIAL_GIFT_LIMITS,
  OFFICIAL_GIFT_PRESETS,
} = require("./official-gift-config");

function createHttpsError(code, message, details) {
  const err = new Error(message);
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

function callableError(functions, code, message, details) {
  if (functions && functions.https && typeof functions.https.HttpsError === "function") {
    return new functions.https.HttpsError(code, message, details);
  }
  return createHttpsError(code, message, details);
}

function authOf(requestOrContext) {
  return (requestOrContext && requestOrContext.auth) || null;
}

function requireAdmin(requestOrContext, functions) {
  const auth = authOf(requestOrContext);
  if (!auth || !auth.uid) throw callableError(functions, "unauthenticated", "Sign in required.");
  if (!auth.token || auth.token.admin !== true) {
    throw callableError(functions, "permission-denied", "Administrator access required.");
  }
  return auth;
}

function requireAuthed(requestOrContext, functions) {
  const auth = authOf(requestOrContext);
  if (!auth || !auth.uid) throw callableError(functions, "unauthenticated", "Sign in required.");
  return auth;
}

function onlyKeys(data, keys) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const allowed = new Set(keys);
  return Object.keys(data).every((key) => allowed.has(key));
}

function normalizeString(value, maxLength, field, functions, required) {
  if (value === undefined || value === null) {
    if (required) throw callableError(functions, "invalid-argument", field + " is required.");
    return "";
  }
  if (typeof value !== "string") throw callableError(functions, "invalid-argument", field + " must be a string.");
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw callableError(functions, "invalid-argument", field + " is too long.");
  if (required && !trimmed) throw callableError(functions, "invalid-argument", field + " is required.");
  return trimmed;
}

function validateResourceAndAmount(resource, amount, functions) {
  if (typeof resource !== "string" || !OFFICIAL_GIFT_RESOURCES[resource]) {
    throw callableError(functions, "invalid-argument", "Unsupported gift resource.");
  }
  if (typeof amount !== "number" || !Number.isSafeInteger(amount)) {
    throw callableError(functions, "invalid-argument", "Gift amount must be a whole number.");
  }
  if (amount <= 0) throw callableError(functions, "invalid-argument", "Gift amount must be positive.");
  const max = OFFICIAL_GIFT_RESOURCES[resource].max;
  if (amount > max) throw callableError(functions, "invalid-argument", "Gift amount exceeds the configured maximum.");
  return { resource, amount };
}

function normalizeRecipientUids(value, functions) {
  if (!Array.isArray(value)) {
    throw callableError(functions, "invalid-argument", "recipientUids must be an array.");
  }
  const recipientUids = [];
  const seen = new Set();
  for (const uid of value) {
    if (typeof uid !== "string" || !uid.trim()) {
      throw callableError(functions, "invalid-argument", "Each recipient UID must be a non-empty string.");
    }
    const cleanUid = uid.trim();
    if (!seen.has(cleanUid)) {
      seen.add(cleanUid);
      recipientUids.push(cleanUid);
    }
  }
  if (!recipientUids.length) throw callableError(functions, "invalid-argument", "At least one recipient is required.");
  if (recipientUids.length > OFFICIAL_GIFT_LIMITS.maxRecipients) {
    throw callableError(functions, "invalid-argument", "Too many recipients.");
  }
  return recipientUids;
}

function validateGrantPayload(data, functions) {
  if (!onlyKeys(data, ["recipientUids", "resource", "amount", "title", "message", "presetId"])) {
    throw callableError(functions, "invalid-argument", "Unsupported grant request field.");
  }
  const recipientUids = normalizeRecipientUids(data.recipientUids, functions);
  const { resource, amount } = validateResourceAndAmount(data.resource, data.amount, functions);
  return {
    recipientUids,
    resource,
    amount,
    title: normalizeString(data.title || "Official Kingdom Gift", OFFICIAL_GIFT_LIMITS.maxTitleLength, "title", functions, true),
    message: normalizeString(data.message || "", OFFICIAL_GIFT_LIMITS.maxMessageLength, "message", functions, false),
    presetId: normalizeString(data.presetId || "", 80, "presetId", functions, false) || null,
  };
}

function validatePresetPayload(data, functions) {
  if (!onlyKeys(data, ["recipientUids", "presetId"])) {
    throw callableError(functions, "invalid-argument", "Unsupported preset request field.");
  }
  const presetId = normalizeString(data.presetId, 80, "presetId", functions, true);
  const preset = OFFICIAL_GIFT_PRESETS[presetId];
  if (!preset) throw callableError(functions, "invalid-argument", "Unknown official gift preset.");
  const resources = [];
  for (const [resource, amount] of Object.entries(preset.resources || {})) {
    resources.push(validateResourceAndAmount(resource, amount, functions));
  }
  if (!resources.length) throw callableError(functions, "failed-precondition", "Official gift preset has no resources.");
  return { recipientUids: normalizeRecipientUids(data.recipientUids, functions), preset, resources };
}

function defaultLegacySave(nowMillis) {
  return {
    clientUpdatedAt: nowMillis,
    revision: 0,
    coins: 0,
    rolls: 100,
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
    lastRoll: nowMillis,
    streak: 0,
    dailyClaimed: false,
    lastDay: new Date(nowMillis).toISOString().slice(0, 10),
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
    lastDefSim: nowMillis,
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
}

function parseLegacySave(player, nowMillis) {
  if (player && typeof player.save3d === "string" && player.save3d.trim()) {
    try {
      const parsed = JSON.parse(player.save3d);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Fall through to structured/default reconstruction.
    }
  }
  const base = Object.assign({}, player && player.legacyState && typeof player.legacyState === "object" ? player.legacyState : defaultLegacySave(nowMillis));
  if (player && player.economy && typeof player.economy === "object") Object.assign(base, player.economy);
  if (player && player.kingdom && typeof player.kingdom === "object") {
    for (const key of ["soldiers", "blessed", "raidStreak", "defences", "defLog", "lastDefSim", "log"]) {
      if (player.kingdom[key] !== undefined) base[key] = player.kingdom[key];
    }
  }
  if (typeof base.coins !== "number") base.coins = 0;
  if (typeof base.rolls !== "number") base.rolls = 100;
  if (typeof base.soldiers !== "number") base.soldiers = 5;
  return base;
}

function assertClaimableGift(gift, uid, functions) {
  if (!gift || typeof gift !== "object") throw callableError(functions, "not-found", "Gift not found.");
  if (gift.recipientUid !== uid) throw callableError(functions, "permission-denied", "Gift belongs to another player.");
  const { resource, amount } = validateResourceAndAmount(gift.resource, gift.amount, functions);
  return { resource, amount };
}

function applyGiftToPlayer(player, uid, resource, amount, nowMillis) {
  const legacy = parseLegacySave(player, nowMillis);
  const current = typeof legacy[resource] === "number" && Number.isSafeInteger(legacy[resource]) ? legacy[resource] : 0;
  const nextBalance = current + amount;
  if (!Number.isSafeInteger(nextBalance)) throw createHttpsError("failed-precondition", "Updated balance is not safe.");
  legacy[resource] = nextBalance;

  const previousRevision = Number.isSafeInteger(player && player.revision) ? player.revision : Number.isSafeInteger(legacy.revision) ? legacy.revision : 0;
  const revision = previousRevision + 1;
  legacy.revision = revision;
  legacy.clientUpdatedAt = nowMillis;
  if (!Number.isSafeInteger(legacy.lastRoll)) legacy.lastRoll = nowMillis;

  const economy = Object.assign({}, player && player.economy && typeof player.economy === "object" ? player.economy : {});
  const kingdom = Object.assign({}, player && player.kingdom && typeof player.kingdom === "object" ? player.kingdom : {});
  const legacyState = Object.assign({}, player && player.legacyState && typeof player.legacyState === "object" ? player.legacyState : legacy);
  legacyState[resource] = nextBalance;
  legacyState.revision = revision;
  legacyState.clientUpdatedAt = nowMillis;

  if (resource === "coins" || resource === "rolls") economy[resource] = nextBalance;
  if (resource === "soldiers") kingdom.soldiers = nextBalance;

  const update = {
    save3d: JSON.stringify(legacy),
    schemaVersion: 2,
    gameVersion: typeof player.gameVersion === "string" && player.gameVersion ? player.gameVersion : "0.1",
    revision,
    clientUpdatedAt: nowMillis,
    economy,
    kingdom,
    legacyState,
  };
  if (typeof player.name === "string") update.name = player.name;
  if (typeof player.realm === "number") update.realm = player.realm;
  if (typeof player.might === "number") update.might = player.might;
  return { update, balance: nextBalance, revision };
}

function createOfficialGiftService({ db, FieldValue, functions, nowMillis }) {
  if (!db) throw new Error("Firestore db is required.");
  const serverTimestamp = () => (FieldValue && typeof FieldValue.serverTimestamp === "function" ? FieldValue.serverTimestamp() : new Date());
  const now = () => (typeof nowMillis === "function" ? nowMillis() : Date.now());

  async function createOfficialGiftBatch(auth, grants, action) {
    const results = [];
    const batch = db.batch();

    for (const grant of grants) {
      const playerRef = db.collection("players").doc(grant.recipientUid);
      const giftRef = playerRef.collection("officialGifts").doc();
      const auditRef = db.collection("officialGiftAudits").doc();
      let status = "created";
      let errorCode = null;
      try {
        const playerSnap = await playerRef.get();
        if (!playerSnap.exists) {
          status = "failed";
          errorCode = "recipient-not-found";
        }
      } catch (e) {
        status = "failed";
        errorCode = "recipient-read-failed";
      }

      if (status === "created") {
        batch.set(giftRef, {
          recipientUid: grant.recipientUid,
          resource: grant.resource,
          amount: grant.amount,
          title: grant.title,
          message: grant.message,
          senderType: "system",
          senderName: "Kingdom Rise",
          claimed: false,
          createdAt: serverTimestamp(),
          claimedAt: null,
          createdByAdminUid: auth.uid,
          presetId: grant.presetId || null,
          schemaVersion: OFFICIAL_GIFT_SCHEMA_VERSION,
        });
      }

      batch.set(auditRef, {
        action,
        adminUid: auth.uid,
        recipientUid: grant.recipientUid,
        giftId: status === "created" ? giftRef.id : null,
        resource: grant.resource,
        amount: grant.amount,
        status,
        errorCode,
        createdAt: serverTimestamp(),
      });
      results.push({ recipientUid: grant.recipientUid, giftId: status === "created" ? giftRef.id : null, resource: grant.resource, amount: grant.amount, status, errorCode });
    }

    await batch.commit();
    return results;
  }

  async function adminCreateOfficialGift(requestOrContext) {
    const auth = requireAdmin(requestOrContext, functions);
    const payload = validateGrantPayload(requestOrContext.data || {}, functions);
    const grants = payload.recipientUids.map((recipientUid) => ({
      recipientUid,
      resource: payload.resource,
      amount: payload.amount,
      title: payload.title,
      message: payload.message,
      presetId: payload.presetId,
    }));
    const results = await createOfficialGiftBatch(auth, grants, "adminCreateOfficialGift");
    return { ok: true, resource: payload.resource, amount: payload.amount, results };
  }

  async function adminCreateOfficialGiftPreset(requestOrContext) {
    const auth = requireAdmin(requestOrContext, functions);
    const payload = validatePresetPayload(requestOrContext.data || {}, functions);
    const grants = [];
    for (const recipientUid of payload.recipientUids) {
      for (const item of payload.resources) {
        grants.push({
          recipientUid,
          resource: item.resource,
          amount: item.amount,
          title: payload.preset.name,
          message: "A thank-you package from Kingdom Rise.",
          presetId: payload.preset.id,
        });
      }
    }
    const results = await createOfficialGiftBatch(auth, grants, "adminCreateOfficialGiftPreset");
    return { ok: true, presetId: payload.preset.id, presetName: payload.preset.name, status: payload.preset.status, resources: payload.resources, results };
  }

  async function claimOfficialGift(requestOrContext) {
    const auth = requireAuthed(requestOrContext, functions);
    const data = requestOrContext.data || {};
    if (!onlyKeys(data, ["giftId"])) throw callableError(functions, "invalid-argument", "Unsupported claim request field.");
    const giftId = normalizeString(data.giftId, 140, "giftId", functions, true);
    const playerRef = db.collection("players").doc(auth.uid);
    const giftRef = playerRef.collection("officialGifts").doc(giftId);
    const auditRef = db.collection("officialGiftAudits").doc();
    const nowMs = now();

    return db.runTransaction(async (tx) => {
      const [playerSnap, giftSnap] = await Promise.all([tx.get(playerRef), tx.get(giftRef)]);
      if (!playerSnap.exists) throw callableError(functions, "failed-precondition", "Player document does not exist.");
      if (!giftSnap.exists) throw callableError(functions, "not-found", "Gift not found.");
      const player = playerSnap.data() || {};
      const gift = giftSnap.data() || {};
      const { resource, amount } = assertClaimableGift(gift, auth.uid, functions);

      if (gift.claimed === true) {
        const legacy = parseLegacySave(player, nowMs);
        const balance = typeof legacy[resource] === "number" ? legacy[resource] : 0;
        tx.set(auditRef, {
          action: "claimOfficialGift",
          adminUid: null,
          recipientUid: auth.uid,
          giftId,
          resource,
          amount,
          status: "already-claimed",
          errorCode: null,
          createdAt: serverTimestamp(),
        });
        return { ok: true, status: "already-claimed", resource, amount, balance };
      }

      const applied = applyGiftToPlayer(player, auth.uid, resource, amount, nowMs);
      tx.set(playerRef, Object.assign({}, applied.update, { updatedAt: serverTimestamp() }), { merge: true });
      tx.update(giftRef, { claimed: true, claimedAt: serverTimestamp() });
      tx.set(auditRef, {
        action: "claimOfficialGift",
        adminUid: null,
        recipientUid: auth.uid,
        giftId,
        resource,
        amount,
        status: "claimed",
        errorCode: null,
        createdAt: serverTimestamp(),
      });
      return { ok: true, status: "claimed", resource, amount, balance: applied.balance, revision: applied.revision };
    });
  }

  async function listGrantablePlayers(requestOrContext) {
    requireAdmin(requestOrContext, functions);
    const data = requestOrContext.data || {};
    if (!onlyKeys(data, ["limit", "search"])) throw callableError(functions, "invalid-argument", "Unsupported player list request field.");
    const max = typeof data.limit === "number" && Number.isSafeInteger(data.limit) ? Math.max(1, Math.min(data.limit, 50)) : 25;
    const search = typeof data.search === "string" ? data.search.trim().toLowerCase() : "";
    const snap = await db.collection("players").orderBy("might", "desc").limit(200).get();
    const players = [];
    snap.forEach((doc) => {
      const d = doc.data() || {};
      const name = typeof d.name === "string" ? d.name : typeof d.profile?.username === "string" ? d.profile.username : "";
      if (search && !doc.id.toLowerCase().includes(search) && !name.toLowerCase().includes(search)) return;
      players.push({
        uid: doc.id,
        name,
        realm: typeof d.realm === "number" ? d.realm : typeof d.progression?.realm === "number" ? d.progression.realm : null,
      });
    });
    return { ok: true, players: players.slice(0, max) };
  }

  return { adminCreateOfficialGift, adminCreateOfficialGiftPreset, claimOfficialGift, listGrantablePlayers };
}

module.exports = {
  createOfficialGiftService,
  validateGrantPayload,
  validatePresetPayload,
  validateResourceAndAmount,
  applyGiftToPlayer,
  parseLegacySave,
  defaultLegacySave,
};
