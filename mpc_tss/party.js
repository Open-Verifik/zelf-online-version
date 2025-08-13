const WebSocket = require("ws");
const secp = require("noble-secp256k1");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bip39 = require("bip39");
const tss = require("@toruslabs/tss-lib");
const initTss = require("@toruslabs/tss-lib").default;

class TSSEcdsaParty {
	constructor({ partyIndex, coordinatorUrl = process.env.MPC_TSS_COORDINATOR_URL || "ws://localhost:9090", sessionId } = {}) {
		this.partyIndex = partyIndex;
		this.coordinatorUrl = coordinatorUrl;
		this.sessionId = sessionId;
		this.ws = null;
		this.share = null; // BigInt, session-specific secret contribution
		this.stateDir = process.env.MPC_TSS_STATE_DIR || path.join(__dirname, "state");
		this.ensureDir(this.stateDir);
		// Defer session-specific share derivation until we know sessionId from coordinator
		this.mnemonic = this.loadOrCreatePartyMnemonic();
		this.signer = null;
		this.rng = null;
		this.precompute = null;
		this.participants = [];
		// In-memory message queues and waiters for DKLS transport
		this._tssQueues = Object.create(null); // key -> string[]
		this._tssWaiters = Object.create(null); // key -> Array<fn>
		// Install DKLS JS bridge for Node environment
		this.installJsBridge();
		this.connect();
	}

	async ensureTssInitialized() {
		if (this._tssInit) return this._tssInit;
		const pkgPath = require.resolve("@toruslabs/tss-lib/package.json");
		const wasmPath = path.join(path.dirname(pkgPath), "wasm", "client.wasm");
		const wasmBytes = fs.readFileSync(wasmPath);
		this._tssInit = initTss(wasmBytes);
		return this._tssInit;
	}

	ensureDir(dir) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}

	normalizeKind(k) {
		if (!k) return "";
		const s = String(k);
		const i = s.lastIndexOf("~");
		return i >= 0 ? s.slice(i + 1) : s;
	}

	enqueueTssMsg(key, payload) {
		const waiters = this._tssWaiters[key];
		if (waiters && waiters.length > 0) {
			const resolve = waiters.shift();
			resolve(payload);
			return;
		}
		const q = this._tssQueues[key] || (this._tssQueues[key] = []);
		q.push(payload);
	}

	installJsBridge() {
		const self = this;
		// js_send_msg(session, from, to, kind, payload) => Promise<number>
		globalThis.js_send_msg = function (session, from, to, kind, payload) {
			return new Promise((resolve) => {
				try {
					if (self.ws && self.ws.readyState === self.ws.OPEN) {
						self.send({ type: "tss_msg", sessionId: session, from, to, kind, payload });
					}
					resolve(1);
				} catch (_) {
					resolve(0);
				}
			});
		};

		// js_read_msg(session, from, to, kind) => Promise<string>
		globalThis.js_read_msg = function (session, from, to, kind) {
			return new Promise((resolve) => {
				const normKind = self.normalizeKind(kind);
				const key1 = `_tssq_${to}_${from}_${normKind}`;
				const key2 = `_tssq_${from}_${to}_${normKind}`;
				for (const key of [key1, key2]) {
					const q = self._tssQueues[key];
					if (q && q.length > 0) {
						const msg = q.shift();
						return resolve(msg);
					}
				}
				(self._tssWaiters[key1] || (self._tssWaiters[key1] = [])).push(resolve);
				(self._tssWaiters[key2] || (self._tssWaiters[key2] = [])).push(resolve);
				setTimeout(() => {
					const stillWaiting =
						(self._tssWaiters[key1] && self._tssWaiters[key1].includes(resolve)) ||
						(self._tssWaiters[key2] && self._tssWaiters[key2].includes(resolve));
					if (stillWaiting) {
						console.warn(`[PARTY ${self.partyIndex}] Still waiting for TSS message: ${key1} or ${key2}`);
					}
				}, 30000);
			});
		};
	}

	partyMnemonicFile() {
		return path.join(this.stateDir, `party_${this.partyIndex}_mnemonic.json`);
	}

	loadOrCreatePartyMnemonic() {
		const file = this.partyMnemonicFile();
		if (fs.existsSync(file)) {
			const data = JSON.parse(fs.readFileSync(file, "utf8"));
			return data.mnemonic;
		}
		const mnemonic = bip39.generateMnemonic(256);
		fs.writeFileSync(file, JSON.stringify({ partyIndex: this.partyIndex, mnemonic, createdAt: new Date().toISOString() }, null, 2));
		return mnemonic;
	}

	deriveSessionShare() {
		// Derive a session-specific scalar from persistent party mnemonic + sessionId
		const seed = bip39.mnemonicToSeedSync(this.mnemonic);
		const label = `tss:party:${this.partyIndex}:session:${this.sessionId}`;
		const mac = crypto.createHmac("sha256", seed).update(label).digest("hex");
		const curveN = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
		const share = BigInt("0x" + mac) % curveN;
		this.share = share;
	}

	connect() {
		this.ws = new WebSocket(this.coordinatorUrl);
		this.ws.on("open", () => this.register());
		this.ws.on("message", (raw) => this.onMessage(raw));
	}

	send(obj) {
		this.ws.send(JSON.stringify(obj));
	}

	register() {
		this.send({ type: "register", partyIndex: this.partyIndex });
	}

	onMessage(raw) {
		let data;
		try {
			data = JSON.parse(raw);
		} catch {
			return;
		}
		const { type } = data;
		if (type === "registered") {
			this.sessionId = data.sessionId;
			// Now that we have sessionId, derive the session-specific share
			this.ensureDir(path.join(this.stateDir, this.sessionId));
			this.deriveSessionShare();
			return;
		}
		if (type === "dkg_start") {
			// Real DKLS setup would start here. For now, publish local public commitment.
			const pub = secp.getPublicKey(this.share, false);
			this.send({ type: "public_commitment", partyIndex: this.partyIndex, publicKey: Buffer.from(pub).toString("hex") });
			return;
		}
		if (type === "group_pubkey") {
			// Start DKLS setup + precompute
			this.participants = Array.isArray(data.participants) ? data.participants : [];
			this.dklsSetupAndPrecompute({
				publicKey: data.publicKey,
				participants: this.participants,
				threshold: data.threshold,
				totalParties: data.totalParties,
				sessionId: data.sessionId,
			})
				.then(() => {
					this.send({ type: "tss_ready", partyIndex: this.partyIndex });
				})
				.catch((e) => {
					this.send({ type: "tss_error", partyIndex: this.partyIndex, error: `setup_failed: ${e.message}` });
				});
			return;
		}
		if (type === "tss_msg") {
			try {
				const toIdx = data.to ?? this.partyIndex;
				const normKind = this.normalizeKind(data.kind || "");
				const key = `_tssq_${toIdx}_${data.from}_${normKind}`;
				const payload = String(data.payload || "");
				const waiters = this._tssWaiters[key];
				if (waiters && waiters.length > 0) {
					const r = waiters.shift();
					r(payload);
				} else {
					this.enqueueTssMsg(key, payload);
				}
			} catch (_) {}
			return;
		}
		if (type === "tss_setup") {
			// Placeholder for coordinated setup steps
			return;
		}
		if (type === "tss_sign_request") {
			this.dklsSignPartial(data.message).then(({ fragment, r }) => {
				this.send({ type: "tss_partial", partyIndex: this.partyIndex, fragment, r });
			});
			return;
		}
	}

	async dklsSetupAndPrecompute({ publicKey, participants, threshold, totalParties, sessionId }) {
		await this.ensureTssInitialized();
		this._groupPubkeyHex = publicKey;
		// Instantiate signer for this party
		const shareHexNo0x = this.share.toString(16).padStart(64, "0");
		const shareBytes = Buffer.from(shareHexNo0x, "hex");
		const shareB64 = shareBytes.toString("base64");
		const pubHexNo0x = publicKey.startsWith("0x") ? publicKey.slice(2) : publicKey;
		const pubBytesUnc = Buffer.from(pubHexNo0x, "hex");
		// derive compressed group pubkey
		let pubBytesComp;
		try {
			const P = secp.Point.fromHex(pubBytesUnc);
			pubBytesComp = Buffer.from(P.toRawBytes(true));
		} catch (_) {
			pubBytesComp = null;
		}
		const pubB64Unc = pubBytesUnc.toString("base64");
		const pubB64Comp = pubBytesComp ? pubBytesComp.toString("base64") : null;
		const tryArgs = [
			[sessionId, this.partyIndex, totalParties, threshold, shareHexNo0x, pubHexNo0x],
			[sessionId, this.partyIndex, totalParties, threshold, "0x" + shareHexNo0x, "0x" + pubHexNo0x],
			pubBytesComp ? [sessionId, this.partyIndex, totalParties, threshold, shareHexNo0x, pubBytesComp.toString("hex")] : null,
			[sessionId, this.partyIndex, totalParties, threshold, shareB64, pubB64Unc],
			pubB64Comp ? [sessionId, this.partyIndex, totalParties, threshold, shareB64, pubB64Comp] : null,
		].filter(Boolean);
		let signer = null;
		let lastErr = null;
		for (const args of tryArgs) {
			try {
				signer = tss.threshold_signer.apply(null, args);
				if (signer) break;
			} catch (e) {
				lastErr = e;
			}
		}
		if (!signer) throw new Error(`threshold_signer_init_failed: ${lastErr?.message || "unknown"}`);
		this.signer = signer;
		// RNG seeded per session + party
		const rngState = JSON.stringify({ sessionId, partyIndex: this.partyIndex });
		this.rng = tss.random_generator(rngState);
		await tss.setup(this.signer, this.rng);
		// Precompute with participant indices as Uint8Array
		const u8 = new Uint8Array(participants);
		this.precompute = await tss.precompute(u8, this.signer, this.rng);
	}

	async dklsSignPartial(message) {
		await this.ensureTssInitialized();
		// Produce DKLS partial signature with local_sign and common R from precompute
		try {
			const msgHashHex = crypto.createHash("sha256").update(message).digest("hex");
			const fragment = tss.local_sign(msgHashHex, true, this.precompute);
			const r = tss.get_r_from_precompute(this.precompute);
			return { fragment, r };
		} catch (e) {
			return { fragment: { error: e.message }, r: null };
		}
	}
}

if (require.main === module) {
	const idx = parseInt(process.argv[2] || "0", 10);
	new TSSEcdsaParty({ partyIndex: idx });
}

module.exports = TSSEcdsaParty;
