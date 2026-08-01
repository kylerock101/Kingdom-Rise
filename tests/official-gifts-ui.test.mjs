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
assert.doesNotMatch(moduleScript, /firebase-functions\.js/, "Spark client does not import Firebase Functions SDK");
assert.doesNotMatch(main, /httpsCallable|claimOfficialGift|adminCreateOfficialGift|listGrantablePlayers/, "Spark client does not call Cloud Functions for official gifts");
assert.doesNotMatch(html, /id="officialAdminBtn"|id="officialAdminOv"/, "Spark client has no in-browser official gift admin panel");

has(/collection\(window\.FB\.db,"players",FB_UID,"officialGifts"\)/, "official gift query is scoped to current UID subcollection");
has(/orderBy\("createdAt","desc"\)/, "official gifts are ordered newest-first by createdAt");
has(/resetOfficialGiftState\(\);\s*try\{ localStorage\.removeItem\(CUR_KEY\)/, "sign-out clears official gift state");
has(/OFFICIAL_GIFT_OWNER_UID===FB_UID\?OFFICIAL_GIFTS:await Social\.officialInbox\(\)/, "badge state is account-scoped");
has(/async sendGift\(to\)[\s\S]*?collection\(window\.FB\.db,"gifts"\)/, "existing normal player-to-player gift send remains present");
has(/async claim\(id\)[\s\S]*?window\.FB\.doc\(window\.FB\.db,"gifts",id\)/, "existing normal player-to-player gift claim remains present");

has(/\$\("coinN"\)\.textContent = fmtCoin\(S\.coins\)/, "top-left coin HUD renders from loaded S.coins");
has(/if\(structuredValid\.ok\)\{ structuredValid\.legacy\.revision=env\.revision; structuredValid\.legacy\.clientUpdatedAt=env\.clientUpdatedAt; selectedRaw=JSON\.stringify\(structuredValid\.legacy\); selectedSource="structured-cloud"/, "refresh load uses validated structured cloud save before legacy fallback");
has(/function isLocalNewerThanCloud\(localRaw, cloudRaw, cloudEnv\)[\s\S]*cloud\.serverUpdatedAt>local\.clientUpdatedAt[\s\S]*reason:"cloud-server-newer"/, "cloud server timestamp can prevent stale local refresh overwrite");
has(/function hasUnseenRemoteRevision\(remoteMeta\)[\s\S]*remoteMeta\.revision>LAST_CLOUD_REVISION/, "unseen remote revisions are detected before cloud writes");
has(/if\(remote && hasUnseenRemoteRevision\(remoteMeta\)\)[\s\S]*reloadAuthoritativePlayerSave\("cloud-write-remote-newer"\)[\s\S]*return;/, "stale save writes reload authoritative cloud state instead of overwriting rewards");
has(/deliveryStatus:v\.deliveryStatus==="delivered"/, "official notifications are normalized as delivered");
has(/<button class=\"giftBtn claimed\" disabled>\'\+\(g\.viewed\?\"Delivered\":\"Unread\"\)\+\'<\/button>/, "official gift rows show delivered/unread read-only status");
has(/function officialGiftAmountText\(g\)[\s\S]*?resources\.map/, "official gift UI supports bundled delivered resources");
has(/from Kingdom Rise . Delivered . /, "official gift rows show delivered sender/status/date");
has(/const OFFICIAL_GIFT_VIEW_PREFIX="kingsRise3d\.officialGiftViewed\."/, "official gift viewed state is local and account-scoped");
has(/function markOfficialGiftViewed\(g\)[\s\S]*?localStorage\.setItem\(officialGiftViewedKey\(\)/, "opening the official scroll marks only local viewed state");
has(/function unreadOfficialGifts\(inbox\)[\s\S]*?!isOfficialGiftViewed\(g\)/, "unread official gifts are derived from local viewed markers");
has(/function queueOfficialGiftPresentations\(inbox\)[\s\S]*?OFFICIAL_GIFT_QUEUE\.push\(g\)/, "unread official gifts are queued one at a time");
has(/function showOfficialGiftRaven\(g\)[\s\S]*?ravenDeliveryFx[\s\S]*?openOfficialGiftScroll/, "raven delivery animation precedes the scroll panel");
has(/function openOfficialGiftScroll\(g\)[\s\S]*?showCard\("Raven",[\s\S]*?"Open Scroll"[\s\S]*?markOfficialGiftViewed\(g\)/, "scroll button marks viewed without claiming rewards");
has(/updateOfficialGiftUnreadUi\(out\);[\s\S]*?queueOfficialGiftPresentations\(out\);/, "official inbox refreshes unread badges and presentation queue");
assert.match(html, /id="ravenDeliveryFx"/, "raven delivery visual layer is present");
assert.match(html, /id="officialGiftUnread"/, "official tab unread count is present");
assert.doesNotMatch(main, /officialGifts"\)[\s\S]{0,500}(updateDoc|setDoc|addDoc)/, "player client does not write official gift documents");
assert.doesNotMatch(main, /Claiming\.\.\.|Official gift claimed|official gift claim failed/, "official gifts no longer expose a player claim flow");

console.log("PASS official gifts UI contract checks");
