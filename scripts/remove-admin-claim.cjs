"use strict";

const admin = require("firebase-admin");

async function main() {
  const uid = process.argv[2];
  const confirmed = process.argv.includes("--confirm");
  if (!uid) {
    console.error("Usage: node scripts/remove-admin-claim.cjs <firebase-auth-uid> --confirm");
    process.exit(1);
  }
  if (!admin.apps.length) admin.initializeApp();
  const user = await admin.auth().getUser(uid);
  console.log("Target UID:", user.uid);
  console.log("Target email:", user.email || "(none)");
  if (!confirmed) {
    console.error("Refusing to modify claims without --confirm.");
    process.exit(1);
  }
  const claims = Object.assign({}, user.customClaims || {});
  delete claims.admin;
  await admin.auth().setCustomUserClaims(uid, Object.keys(claims).length ? claims : null);
  console.log("admin claim removed. The user must refresh their ID token or sign out and back in.");
}

main().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
