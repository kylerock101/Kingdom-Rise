import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("beta.html", "utf8");
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
assert.equal(scripts.length, 2, "expected inline classic and module scripts");
for (const [i, script] of scripts.entries()) {
  new vm.Script(script, { filename: `inline-${i + 1}.js` });
}
const main = scripts[0];
const moduleScript = scripts[1];

function has(pattern, message) {
  assert.match(main, pattern, message);
}

assert.match(html, /id="tabOfficialGifts"/, "official gifts tab is present");
assert.match(html, /officialGiftRow/, "official gift visual treatment is present");
assert.match(moduleScript, /firebase-functions\.js/, "Functions SDK is imported with existing Firebase modules");
assert.match(moduleScript, /funcM\.getFunctions\(app,"us-central1"\)/, "Functions uses existing app in us-central1");
assert.doesNotMatch(moduleScript, /connectFunctionsEmulator/, "production client does not connect to Functions emulator");

has(/collection\(window\.FB\.db,"players",FB_UID,"officialGifts"\)/, "official gift query is scoped to current UID subcollection");
has(/orderBy\("createdAt","desc"\)/, "official gifts are ordered newest-first by createdAt");
has(/const call=window\.FB\.httpsCallable\(window\.FB\.functions,"claimOfficialGift"\);\s*const result=await call\(\{giftId\}\);/s, "claim callable sends only giftId");
has(/if\(b\.disabled\) return;\s*b\.disabled=true; b\.textContent="Claiming\.\.\.";/s, "claim button disables before callable request");
has(/await reloadAuthoritativePlayerSave\("official-gift-claim"\)/, "successful claim reloads authoritative player save");
has(/if\(data\.resource&&OFFICIAL_GIFT_RESOURCES\[data\.resource\]&&typeof data\.balance==="number"\)\{ S\[data\.resource\]=data\.balance; refresh\(\); \}/, "claim response balance patches visible resource immediately");
has(/if\(result\.status==="already-claimed"\) msg\("Official gift already claimed"/, "already-claimed response is handled gently");
has(/catch\(e\)\{\s*console\.warn\("official gift claim failed"[\s\S]*?b\.disabled=false; b\.textContent="Claim";/, "network or server errors restore claim button");
has(/resetOfficialGiftState\(\);\s*try\{ localStorage\.removeItem\(CUR_KEY\)/, "sign-out clears official gift state");
has(/OFFICIAL_GIFT_OWNER_UID===FB_UID\?OFFICIAL_GIFTS:await Social\.officialInbox\(\)/, "badge state is account-scoped");
has(/async sendGift\(to\)[\s\S]*?collection\(window\.FB\.db,"gifts"\)/, "existing normal player-to-player gift send remains present");
has(/async claim\(id\)[\s\S]*?window\.FB\.doc\(window\.FB\.db,"gifts",id\)/, "existing normal player-to-player gift claim remains present");

console.log("PASS official gifts UI contract checks");