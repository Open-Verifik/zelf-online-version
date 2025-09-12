const mongoose = require("mongoose");

const domainSchema = new mongoose.Schema({
	domain: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true
	},
	type: {
		type: String,
		enum: ['official', 'custom', 'enterprise'],
		required: true
	},
	status: {
		type: String,
		enum: ['active', 'inactive', 'suspended', 'pending'],
		default: 'active'
	},
	owner: {
		type: String,
		required: true
	},
	price: {
		type: Number,
		required: true,
		min: 0
	},
	description: {
		type: String,
		required: true
	},
	features: [{
		type: String,
		enum: ['biometric', 'wallet', 'payment', 'recovery', 'enterprise']
	}],
	validation: {
		minLength: {
			type: Number,
			default: 3
		},
		maxLength: {
			type: Number,
			default: 50
		},
		allowedChars: {
			type: String,
			default: '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$'
		},
		reserved: [{
			type: String
		}]
	},
	storage: {
		keyPrefix: {
			type: String,
			required: true
		},
		ipfsEnabled: {
			type: Boolean,
			default: true
		},
		arweaveEnabled: {
			type: Boolean,
			default: true
		}
	},
	holdSuffix: {
		type: String,
		default: '.hold'
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	},
	createdBy: {
		type: String,
		required: true
	},
	metadata: {
		type: mongoose.Schema.Types.Mixed,
		default: {}
	}
}, {
	timestamps: true,
	collection: 'domains'
});

// Indexes
domainSchema.index({ domain: 1 });
domainSchema.index({ type: 1 });
domainSchema.index({ status: 1 });
domainSchema.index({ owner: 1 });
domainSchema.index({ createdAt: -1 });

// Pre-save middleware
domainSchema.pre('save', function(next) {
	this.updatedAt = new Date();
	next();
});

// Static methods
domainSchema.statics.findByDomain = function(domain) {
	return this.findOne({ domain: domain.toLowerCase() });
};

domainSchema.statics.findActiveDomains = function() {
	return this.find({ status: 'active' });
};

domainSchema.statics.findByType = function(type) {
	return this.find({ type, status: 'active' });
};

domainSchema.statics.findByOwner = function(owner) {
	return this.find({ owner, status: 'active' });
};

// Instance methods
domainSchema.methods.isActive = function() {
	return this.status === 'active';
};

domainSchema.methods.canCreateNames = function() {
	return this.status === 'active' && this.type !== 'suspended';
};

domainSchema.methods.getStorageKey = function(name) {
	return `${this.storage.keyPrefix}:${name.toLowerCase()}`;
};

domainSchema.methods.getHoldDomain = function(name) {
	return `${name}.${this.domain}${this.holdSuffix}`;
};

domainSchema.methods.validateName = function(name) {
	const { validation } = this;
	
	// Check length
	if (name.length < validation.minLength) {
		return { valid: false, error: `Name must be at least ${validation.minLength} characters` };
	}
	
	if (name.length > validation.maxLength) {
		return { valid: false, error: `Name must be no more than ${validation.maxLength} characters` };
	}

	// Check allowed characters
	const allowedCharsRegex = new RegExp(validation.allowedChars);
	if (!allowedCharsRegex.test(name)) {
		return { valid: false, error: 'Name contains invalid characters' };
	}

	// Check reserved names
	if (validation.reserved.includes(name.toLowerCase())) {
		return { valid: false, error: 'Name is reserved' };
	}

	return { valid: true };
};

module.exports = mongoose.model('Domain', domainSchema);
