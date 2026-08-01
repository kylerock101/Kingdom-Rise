import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";

const require = createRequire(import.meta.url);
const { createOfficialGiftAdminUiServer } = require("../scripts/official-gift-admin-ui.cjs");
const launcher = fs.readFileSync("start-official-reward-admin.bat", "utf8");
const ADMIN_HEALTH_URL = "http://127.0.0.1:8741/health";
const SERVICE_ID = "kingdom-rise-official-reward-admin";
const TEST_ENV = Object.assign({}, process.env, {
  KR_ADMIN_LAUNCHER_NO_OPEN: "1",
  KR_ADMIN_UI_NO_OPEN: "1",
});

assert.match(launcher, /HEALTH_URL=http:\/\/127\.0\.0\.1:8741\/health/, "launcher checks the local health endpoint");
assert.match(launcher, /SERVICE_ID=kingdom-rise-official-reward-admin/, "launcher verifies the admin service identifier");
assert.match(launcher, /Kingdom Rise Official Reward Admin is already running\./, "launcher reports an existing admin server cleanly");
assert.match(launcher, /if not "%KR_ADMIN_LAUNCHER_NO_OPEN%"=="1" start "" "%ADMIN_URL%"/, "launcher opens the existing admin panel outside automated tests");
assert.match(launcher, /Get-NetTCPConnection -LocalPort 8741 -State Listen/, "launcher checks whether port 8741 is occupied after a failed health check");
assert.match(launcher, /netstat -ano \^\| findstr :8741/, "launcher prints the Windows inspection command for conflicting ports");
assert.match(launcher, /set "KR_ADMIN_UI_NO_OPEN=1"/, "launcher prevents the Node server from also opening a duplicate browser tab");
assert.match(launcher, /node scripts\\official-gift-admin-ui\.cjs/, "launcher starts the existing local admin server script");
assert.doesNotMatch(launcher, /taskkill|Stop-Process|tskill/i, "launcher must not terminate other processes automatically");

function requestJson(url, timeoutMs = 800) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString("utf8")) }); }
        catch (error) { reject(error); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("request timed out")));
    req.on("error", reject);
  });
}

async function waitForHealth(ms = 6000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await requestJson(ADMIN_HEALTH_URL);
      if (res.status === 200 && res.body.ok === true && res.body.service === SERVICE_ID) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function assertPortFree() {
  try {
    const res = await requestJson(ADMIN_HEALTH_URL, 350);
    if (res.status === 200 && res.body.ok === true && res.body.service === SERVICE_ID) {
      throw new Error("port 8741 is already serving the admin health endpoint; stop it before running launcher live checks");
    }
  } catch (error) {
    if (/already serving/.test(error.message)) throw error;
  }
}

function runCommand(command, args, options = {}) {
  const timeoutMs = options.timeoutMs || 5000;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: options.env || TEST_ENV,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
    if (options.input !== undefined) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

function startNode(args) {
  return spawn("node", args, {
    cwd: process.cwd(),
    env: TEST_ENV,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function listen(server) {
  return new Promise((resolve) => server.listen(8741, "127.0.0.1", resolve));
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function stopListenerOn8741AfterFreePortLaunch() {
  await runCommand("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "$line = netstat -ano | Select-String '127\\.0\\.0\\.1:8741\\s+0\\.0\\.0\\.0:0\\s+LISTENING' | Select-Object -First 1; if ($line) { $listenPid = [int](($line.Line -split '\\s+')[-1]); Stop-Process -Id $listenPid -Force -ErrorAction SilentlyContinue }"], { timeoutMs: 5000 });
}
async function stopAdminListenerIfHealthy() {
  let healthy = false;
  try {
    const res = await requestJson(ADMIN_HEALTH_URL, 500);
    healthy = res.status === 200 && res.body.ok === true && res.body.service === SERVICE_ID;
  } catch {}
  if (!healthy) return;
  await runCommand("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "$line = netstat -ano | Select-String '127\\.0\\.0\\.1:8741\\s+0\\.0\\.0\\.0:0\\s+LISTENING' | Select-Object -First 1; if ($line) { $listenPid = [int](($line.Line -split '\\s+')[-1]); Stop-Process -Id $listenPid -Force -ErrorAction SilentlyContinue }"], { timeoutMs: 5000 });
}

async function stopChild(child) {
  if (!child || child.killed) return;
  child.kill();
  await new Promise((resolve) => setTimeout(resolve, 300));
}

await assertPortFree();

let launchFromStopped = null;
try {
  launchFromStopped = spawn("cmd.exe", ["/c", "start-official-reward-admin.bat"], {
    cwd: process.cwd(),
    env: TEST_ENV,
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  assert.equal(await waitForHealth(20000), true, "launcher starts the admin server when stopped");
} finally {
  if (launchFromStopped) launchFromStopped.kill();
  await stopListenerOn8741AfterFreePortLaunch();
}

await new Promise((resolve) => setTimeout(resolve, 600));
await assertPortFree();

let server = createOfficialGiftAdminUiServer({ port: 8741 });
try {
  await listen(server);
  assert.equal(await waitForHealth(), true, "direct admin server exposes the expected health endpoint");
  const existing = await runCommand("cmd.exe", ["/c", "start-official-reward-admin.bat"], { timeoutMs: 8000 });
  assert.equal(existing.timedOut, false, "existing-server launcher path exits within timeout");
  assert.equal(existing.code, 0, "existing-server launcher path exits cleanly");
  assert.match(existing.stdout, /Kingdom Rise Official Reward Admin is already running\./, "existing-server launcher path reports reuse");
} finally {
  await closeServer(server);
}

await new Promise((resolve) => setTimeout(resolve, 600));
await assertPortFree();

const dummyScript = "require('http').createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:false,service:'not-kingdom-rise'}));}).listen(8741,'127.0.0.1');setInterval(()=>{},1000);";
let dummy = startNode(["-e", dummyScript]);
try {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const conflict = await runCommand("cmd.exe", ["/c", "start-official-reward-admin.bat"], { timeoutMs: 8000, input: "\n" });
  assert.equal(conflict.timedOut, false, "occupied-port launcher path exits within timeout");
  assert.notEqual(conflict.code, 0, "occupied-port launcher path exits non-zero");
  assert.match(conflict.stdout, /Port 8741 is in use/, "occupied-port launcher path explains the conflict");
  assert.match(conflict.stdout, /netstat -ano \| findstr :8741/, "occupied-port launcher path prints the inspection command");
} finally {
  await stopChild(dummy);
}

console.log("PASS official reward admin launcher contract and bounded behavior checks");