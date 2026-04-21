const mongoose = require("mongoose");
const naasCatalogCacheSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: "default",
        },
        sessionToken: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
        collection: "NaasCatalogCache",
    }
);

module.exports = mongoose.models.NaasCatalogCache || mongoose.model("NaasCatalogCache", naasCatalogCacheSchema);
