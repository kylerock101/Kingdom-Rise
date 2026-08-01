#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const childProcess = require("child_process");
const admin = require("firebase-admin");
const {
  RESOURCE_LIMITS,
  PRESETS,
  buildGrantPlan,
  listPlayers,
  deliverOfficialGift,
  parseLegacySave,
  shortUid,
} = require("./official-gift-admin-lib.cjs");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8741;
const DEFAULT_KEY_PATH = "C:\\secure\\kingdom-rise-service-account.json";
const MAX_BODY_BYTES = 32 * 1024;
const SESSION_HISTORY_LIMIT = 25;

function maskPath(value) {
  if (!value) return "";
  const parsed = path.parse(String(value));
  return parsed.base ? path.join("...", parsed.base) : "...";
}

function publicError(error) {
  const message = error && error.message ? String(error.message) : String(error || "Unknown error");
  return message.replace(/[A-Za-z]:\\[^\s\"']+/g, (m) => maskPath(m));
}

function json(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, Object.assign({
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  }, headers));
  res.end(body);
}

function text(res, status, body, contentType = "text/plain; charset=utf-8", headers = {}) {
  res.writeHead(status, Object.assign({
    "content-type": contentType,
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  }, headers));
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (error) { reject(new Error("Malformed JSON request.")); }
    });
    req.on("error", reject);
  });
}

function safeUid(value) {
  const uid = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) throw new Error("Select a valid player UID.");
  return uid;
}

function sanitizeSearch(value) {
  return String(value || "").trim().slice(0, 80);
}

function sanitizeIdempotencyKey(value) {
  const key = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new Error("A valid request key is required.");
  return key;
}

function playerBalancesFromDoc(data) {
  const legacy = parseLegacySave(data || {}, Date.now());
  return {
    coins: Number.isSafeInteger(legacy.coins) ? legacy.coins : 0,
    rolls: Number.isSafeInteger(legacy.rolls) ? legacy.rolls : 0,
    soldiers: Number.isSafeInteger(legacy.soldiers) ? legacy.soldiers : 0,
  };
}

function resourceLabel(resource) {
  return resource === "coins" ? "Coins" : resource === "rolls" ? "Rolls" : resource === "soldiers" ? "Soldiers" : resource;
}

function buildPreview(player, plan) {
  const balances = player.balances || { coins: 0, rolls: 0, soldiers: 0 };
  return {
    player: { uid: player.uid, shortUid: shortUid(player.uid), name: player.name || "(unnamed)", realm: player.realm || null, balances },
    reward: plan.resources.map((r) => ({ resource: r.resource, label: resourceLabel(r.resource), amount: r.amount, before: balances[r.resource] || 0, after: (balances[r.resource] || 0) + r.amount })),
    title: plan.title,
    message: plan.message,
    presetId: plan.presetId,
  };
}

async function defaultAdminFactory(keyPath) {
  const resolved = path.resolve(String(keyPath || ""));
  if (!resolved.toLowerCase().endsWith(".json")) throw new Error("Service-account path must point to a JSON file.");
  if (!fs.existsSync(resolved)) throw new Error("Service-account file was not found: " + maskPath(resolved));
  const serviceAccount = require(resolved);
  const appName = "official-reward-admin-ui-" + crypto.randomBytes(6).toString("hex");
  const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, appName);
  return { app, db: app.firestore(), FieldValue: admin.firestore.FieldValue, keyPath: resolved };
}

function createOfficialGiftAdminUiServer(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const port = Number(options.port || process.env.PORT || DEFAULT_PORT);
  const csrfToken = options.csrfToken || crypto.randomBytes(24).toString("base64url");
  const adminFactory = options.adminFactory || defaultAdminFactory;
  const uiPath = options.uiPath || path.join(__dirname, "official-gift-admin-ui.html");
  const state = {
    connected: false,
    connecting: false,
    keyPathMasked: "",
    ctx: null,
    history: [],
    idempotency: new Map(),
  };

  function requireLocal(req) {
    const remote = req.socket && req.socket.remoteAddress;
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) throw new Error("Only local requests are allowed.");
  }

  function requireCsrf(req) {
    if (req.method === "GET" || req.method === "HEAD") return;
    if (req.headers["x-kr-admin-csrf"] !== csrfToken) throw new Error("Request verification failed. Refresh the page and try again.");
    const origin = req.headers.origin;
    if (origin && !origin.startsWith(`http://${host}:`) && !origin.startsWith("http://127.0.0.1:")) throw new Error("Unexpected request origin.");
  }

  async function selectedPlayer(uid) {
    const snap = await state.ctx.db.collection("players").doc(uid).get();
    if (!snap.exists) throw new Error("Selected player was not found.");
    const data = snap.data() || {};
    return {
      uid,
      name: typeof data.name === "string" ? data.name : (typeof data.profile?.username === "string" ? data.profile.username : ""),
      realm: typeof data.realm === "number" ? data.realm : (typeof data.progression?.realm === "number" ? data.progression.realm : null),
      balances: playerBalancesFromDoc(data),
    };
  }

  function requireConnected() {
    if (!state.connected || !state.ctx) throw new Error("Connect to Firebase first.");
  }

  function pushHistory(row) {
    state.history.unshift(Object.assign({ timestamp: new Date().toISOString() }, row));
    state.history = state.history.slice(0, SESSION_HISTORY_LIMIT);
  }

  async function handleApi(req, res, url) {
    if (url.pathname === "/api/status" && req.method === "GET") {
      return json(res, 200, { ok: true, connected: state.connected, connecting: state.connecting, keyPathMasked: state.keyPathMasked, defaultKeyPath: DEFAULT_KEY_PATH, resources: RESOURCE_LIMITS, presets: Object.keys(PRESETS), history: state.history });
    }
    if (url.pathname === "/api/connect" && req.method === "POST") {
      const body = await readBody(req);
      const keyPath = String(body.keyPath || DEFAULT_KEY_PATH).trim();
      if (!keyPath) throw new Error("Enter a service-account key path.");
      state.connecting = true;
      try {
        if (state.ctx && state.ctx.app && typeof state.ctx.app.delete === "function") await state.ctx.app.delete().catch(() => {});
        state.ctx = await adminFactory(keyPath);
        state.connected = true;
        state.keyPathMasked = maskPath(state.ctx.keyPath || keyPath);
        return json(res, 200, { ok: true, connected: true, keyPathMasked: state.keyPathMasked });
      } finally {
        state.connecting = false;
      }
    }
    if (url.pathname === "/api/players" && req.method === "GET") {
      requireConnected();
      const players = await listPlayers(state.ctx.db, { search: sanitizeSearch(url.searchParams.get("search")), limit: 50 });
      return json(res, 200, { ok: true, players });
    }
    if (url.pathname === "/api/preview" && req.method === "POST") {
      requireConnected();
      const body = await readBody(req);
      const uid = safeUid(body.uid);
      const plan = body.rewardType === "returning-founder"
        ? buildGrantPlan({ uids: uid, preset: "returning-founder", title: body.title, message: body.message, localAdminLabel: "local-admin-ui" })
        : buildGrantPlan({ uids: uid, resource: body.rewardType, amount: body.amount, title: body.title, message: body.message, localAdminLabel: "local-admin-ui" });
      return json(res, 200, { ok: true, preview: buildPreview(await selectedPlayer(uid), plan) });
    }
    if (url.pathname === "/api/deliver" && req.method === "POST") {
      requireConnected();
      const body = await readBody(req);
      const idempotencyKey = sanitizeIdempotencyKey(body.idempotencyKey);
      if (state.idempotency.has(idempotencyKey)) return json(res, 200, state.idempotency.get(idempotencyKey));
      if (String(body.confirmation || "").trim() !== "SEND") throw new Error("Type SEND to confirm delivery.");
      const uid = safeUid(body.uid);
      const player = await selectedPlayer(uid);
      const plan = body.rewardType === "returning-founder"
        ? buildGrantPlan({ uids: uid, preset: "returning-founder", title: body.title, message: body.message, localAdminLabel: "local-admin-ui" })
        : buildGrantPlan({ uids: uid, resource: body.rewardType, amount: body.amount, title: body.title, message: body.message, localAdminLabel: "local-admin-ui" });
      const result = await deliverOfficialGift(state.ctx.db, state.ctx.FieldValue, plan);
      const delivered = result.results.find((r) => r.uid === uid);
      const response = { ok: result.ok, result, preview: buildPreview(player, plan) };
      state.idempotency.set(idempotencyKey, response);
      pushHistory({ ok: result.ok, player: { uid, name: player.name || "(unnamed)" }, reward: plan.resources, title: plan.title, giftId: delivered && delivered.giftId || null, error: delivered && delivered.message || null });
      return json(res, result.ok ? 200 : 400, response);
    }
    return json(res, 404, { ok: false, error: "Not found." });
  }

  const server = http.createServer(async (req, res) => {
    try {
      requireLocal(req);
      requireCsrf(req);
      const url = new URL(req.url || "/", `http://${host}:${port}`);
      if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
        const html = fs.readFileSync(uiPath, "utf8").replace(/__CSRF_TOKEN__/g, csrfToken).replace(/__DEFAULT_KEY_PATH__/g, DEFAULT_KEY_PATH.replace(/\\/g, "\\\\"));
        return text(res, 200, html, "text/html; charset=utf-8");
      }
      if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
      return text(res, 404, "Not found");
    } catch (error) {
      const status = /not found/i.test(error.message) ? 404 : /verification|origin|local requests/i.test(error.message) ? 403 : /malformed|valid|amount|resource|confirm|connect|select|uid/i.test(error.message) ? 400 : 500;
      return json(res, status, { ok: false, error: publicError(error) });
    }
  });

  server.adminUiState = state;
  server.adminUiOptions = { host, port, csrfToken };
  return server;
}

function openBrowser(url) {
  if (process.env.KR_ADMIN_UI_NO_OPEN === "1") return;
  const escaped = url.replace(/&/g, "^&");
  childProcess.exec(`start "" "${escaped}"`, { windowsHide: true }, () => {});
}

async function main() {
  const portArg = process.argv.find((arg) => arg.startsWith("--port="));
  const port = portArg ? Number(portArg.slice("--port=".length)) : DEFAULT_PORT;
  const server = createOfficialGiftAdminUiServer({ port });
  server.listen(port, DEFAULT_HOST, () => {
    const address = server.address();
    const url = `http://${DEFAULT_HOST}:${address.port}/`;
    console.log("Kingdom Rise official reward admin UI");
    console.log("Local URL:", url);
    console.log("Bound to:", DEFAULT_HOST);
    console.log("Press Ctrl+C to stop.");
    openBrowser(url);
  });
  process.on("SIGINT", () => server.close(() => process.exit(0)));
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}

if (require.main === module) main().catch((error) => { console.error(publicError(error)); process.exit(1); });

module.exports = { createOfficialGiftAdminUiServer, DEFAULT_HOST, DEFAULT_PORT, DEFAULT_KEY_PATH, maskPath, publicError };