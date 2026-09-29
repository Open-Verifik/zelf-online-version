const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { String } = mongoose.Schema.Types;

const { requiredField, defaultField, addBasicPlugins } = require("../../../Core/mongoose-utils");

//####################################################//

/**
 * Reverse lookup address -> tag name.
 *
 * Pinata keeps 9 keyvalues per pin and Arweave only filters by exact tag value, so
 * addresses packed inside `addresses`/`addresses2` (TON, Aptos, DOT, KSM...) of legacy
 * records cannot be found by a key/value search. This collection only points to the
 * candidate name: every hit is re-verified against the live registry record.
 */
const TagAddressIndexSchema = new Schema({
    key: requiredField(String),
    value: requiredField(String),
    tagName: requiredField(String),
    domain: requiredField(String),
    source: defaultField(String, ""),
    recordId: defaultField(String, ""),
});

TagAddressIndexSchema.index({ key: 1, value: 1, tagName: 1 }, { unique: true });

TagAddressIndexSchema.index({ tagName: 1 });

addBasicPlugins(TagAddressIndexSchema);

module.exports = mongoose.model("TagAddressIndex", TagAddressIndexSchema);
