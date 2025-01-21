const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const { ObjectId, String } = mongoose.Schema.Types;

const { addBasicPlugins } = require("../../../Core/mongoose-utils");
const { boolean } = require("joi");

//####################################################//

const purchaseSchema = new Schema(
	{
		zelfName: { type: String },
		duration: { type: String },
		crypto: {
			type: String,
			required: true,
			minlength: 2,
		},
		cryptoValue: { type: String },
		ratePriceInUSDT: { type: String },
		wordsCount: { type: String },
		USD: { type: String },
		amountToSend: {
			type: String,
		},
		amountDetected: {
			type: String,
		},
		paymentAddress: String,
		address: {},
		transactionStatus: String,
		transactionDescription: String,
		remainingTime: String,
		lastSavedTime: String,
		purchaseCreatedAt: {
			type: Date,
			default: Date.now, // Campo con nombre diferente para evitar conflicto
		},
	},
	{
		timestamps: false, // Deshabilitar los timestamps automáticos
	}
);

// Pre-save hook
purchaseSchema.pre("save", async function (next) {
	next();
});

// Post-save hook
purchaseSchema.post("save", async function (doc, next) {
	next();
});

// Crear un índice TTL para que el documento se elimine automáticamente después de 2 minutos
purchaseSchema.index({ purchaseCreatedAt: 1 }, { expireAfterSeconds: 7200 }); // 120 segundos = 2 minutos

/**
 * #model methods
 */
purchaseSchema.methods = {};

addBasicPlugins(purchaseSchema);

module.exports = mongoose.model("purchase", purchaseSchema);
