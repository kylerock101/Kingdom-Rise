"use strict";

const admin = require("firebase-admin");
const { onCall } = require("firebase-functions/v2/https");
const { createOfficialGiftService } = require("./official-gifts");

if (!admin.apps.length) admin.initializeApp();

const service = createOfficialGiftService({
  db: admin.firestore(),
  FieldValue: admin.firestore.FieldValue,
  functions: require("firebase-functions"),
});

exports.adminCreateOfficialGift = onCall({ region: "us-central1" }, (request) => service.adminCreateOfficialGift(request));
exports.claimOfficialGift = onCall({ region: "us-central1" }, (request) => service.claimOfficialGift(request));
exports.listGrantablePlayers = onCall({ region: "us-central1" }, (request) => service.listGrantablePlayers(request));
