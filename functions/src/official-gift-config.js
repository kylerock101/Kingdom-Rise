"use strict";

const OFFICIAL_GIFT_SCHEMA_VERSION = 1;

const OFFICIAL_GIFT_RESOURCES = Object.freeze({
  coins: { max: 1000000, section: "economy" },
  rolls: { max: 500, section: "economy" },
  soldiers: { max: 500, section: "kingdom" },
});

const OFFICIAL_GIFT_LIMITS = Object.freeze({
  maxRecipients: 100,
  maxTitleLength: 80,
  maxMessageLength: 500,
});

const OFFICIAL_GIFT_PRESETS = Object.freeze({
  returning_founder_gift: Object.freeze({
    id: "returning_founder_gift",
    name: "Returning Founder Gift",
    status: "draft",
    resources: Object.freeze({
      coins: 1500,
      rolls: 25,
      soldiers: 6,
    }),
  }),
});

module.exports = {
  OFFICIAL_GIFT_SCHEMA_VERSION,
  OFFICIAL_GIFT_RESOURCES,
  OFFICIAL_GIFT_LIMITS,
  OFFICIAL_GIFT_PRESETS,
};
