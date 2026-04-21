const mongoose = require("mongoose");

const DEFAULT_GATEWAY_DEVICE_ID = "";
const naasCatalogRuntimeConfigSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: "default",
        },
        catalogGatewayUrl: {
            type: String,
            default: "",
        },

        catalogProjectId: {
            type: String,
            default: "",
        },
        gatewayDeviceId: {
            type: String,
        },
    },
    {
        timestamps: true,
        collection: "NaasCatalogRuntimeConfig",
    }
);

const NaasCatalogRuntimeConfig =
    mongoose.models.NaasCatalogRuntimeConfig || mongoose.model("NaasCatalogRuntimeConfig", naasCatalogRuntimeConfigSchema);

NaasCatalogRuntimeConfig.DEFAULT_GATEWAY_DEVICE_ID = DEFAULT_GATEWAY_DEVICE_ID;

module.exports = NaasCatalogRuntimeConfig;
