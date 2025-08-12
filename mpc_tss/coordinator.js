const WebSocket = require("ws");
const secp = require("noble-secp256k1");
const tss = require("@toruslabs/tss-lib");
const fs = require("fs");
const path = require("path");

class TSSEcdsaCoordinator {
	constructor({ port = 9090, threshold = 2, totalParties = 3, sessionId } = {}) {
		const envSessionId = process.env.MPC_SESSION_ID;
		const envThreshold = parseInt(process.env.MPC_THRESHOLD || "", 10);
		const envTotal = parseInt(process.env.MPC_TOTAL_PARTIES || "", 10);

		this.port = port;
		this.threshold = Number.isFinite(envThreshold) ? envThreshold : threshold;
		this.totalParties = Number.isFinite(envTotal) ? envTotal : totalParties;
		this.sessionId = sessionId || envSessionId || `mpc_tss_${Date.now()}`;

		this.parties = new Map(); // partyIndex -> { ws }
		this.commitments = new Map(); // partyIndex -> pubkey hex (uncompressed)
		this.groupPubkey = null; // 0x04... hex
		this.groupAddress = null;
		this.readyParties = new Set();
		this.sigFrags = new Map(); // partyIndex -> fragment
		this.pendingMessage = process.env.MPC_TSS_MESSAGE || null;

		this.stateDir = process.env.MPC_TSS_STATE_DIR || path.join(__dirname, "state");
		this.ensureDir(path.join(this.stateDir, this.sessionId));

		this.wss = new WebSocket.Server({ port: this.port });
		this.wss.on("connection", (ws) => this.onConnection(ws));
		console.log(`TSS Coordinator on ws://localhost:${this.port} sessionId=${this.sessionId} k=${this.threshold} n=${this.totalParties}`);
	}

	ensureDir(dir) {
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
	}

	onConnection(ws) {
		ws.on("message", (raw) => {
			let data;
			try {
				data = JSON.parse(raw);
			} catch {
				return;
			}
			this.handleMessage(ws, data);
		});
	}

	handleMessage(ws, data) {
		const { type } = data;
		if (type === "register") {
			const { partyIndex } = data;
			if (this.parties.has(partyIndex)) {
				ws.send(JSON.stringify({ type: "error", message: "party already registered" }));
				return;
			}
			this.parties.set(partyIndex, { ws, index: partyIndex });
			ws.send(
				JSON.stringify({
					type: "registered",
					partyIndex,
					sessionId: this.sessionId,
					threshold: this.threshold,
					totalParties: this.totalParties,
				})
			);
			console.log(`Registered party ${partyIndex} (${this.parties.size}/${this.totalParties})`);
			if (this.parties.size === this.totalParties) this.broadcast({ type: "dkg_start" });
			return;
		}

		if (type === "public_commitment") {
			const { partyIndex, publicKey } = data;
			this.commitments.set(partyIndex, publicKey);
			console.log(`Commitment from party ${partyIndex}`);
			if (this.commitments.size === this.totalParties) this.computeGroupKey();
			return;
		}

		if (type === "tss_ready") {
			// party indicates DKLS setup/precompute done
			const { partyIndex } = data;
			this.readyParties.add(partyIndex);
			if (this.readyParties.size === this.totalParties && this.pendingMessage) {
				// auto-trigger signing once all parties precomputed
				this.broadcast({ type: "tss_sign_request", message: this.pendingMessage });
			}
			return;
		}

		if (type === "tss_partial") {
			const { partyIndex, fragment, r } = data;
			this.sigFrags.set(partyIndex, { fragment, r });
			if (this.sigFrags.size >= this.threshold) {
				this.combineSignature();
			}
			return;
		}
	}

	broadcast(obj) {
		const s = JSON.stringify(obj);
		for (const { ws } of this.parties.values()) ws.send(s);
	}

	computeGroupKey() {
		// Sum public points (uncompressed hex) to get group pubkey (works for n-of-n; for k-of-n DKLS, group key remains fixed)
		let acc = secp.Point.ZERO;
		const ordered = Array.from(this.commitments.entries()).sort((a, b) => a[0] - b[0]);
		for (const [, pubHex] of ordered) {
			const P = secp.Point.fromHex(pubHex);
			acc = acc.add(P);
		}
		const groupUncompressedHex = Buffer.from(acc.toRawBytes(false)).toString("hex");
		this.groupPubkey = groupUncompressedHex.startsWith("04") ? groupUncompressedHex : `04${groupUncompressedHex}`;
		this.groupAddress = this.ethAddressFromUncompressed(this.groupPubkey);

		const sessionPath = path.join(this.stateDir, this.sessionId);
		this.ensureDir(sessionPath);
		fs.writeFileSync(
			path.join(sessionPath, "aggregated.json"),
			JSON.stringify(
				{
					sessionId: this.sessionId,
					threshold: this.threshold,
					totalParties: this.totalParties,
					aggregatedPublicKey: this.groupPubkey,
					address: this.groupAddress,
					timestamp: new Date().toISOString(),
				},
				null,
				2
			)
		);

		const participants = Array.from(this.parties.keys()).sort((a, b) => a - b);
		this.broadcast({
			type: "group_pubkey",
			publicKey: this.groupPubkey,
			address: this.groupAddress,
			participants,
			threshold: this.threshold,
			totalParties: this.totalParties,
			sessionId: this.sessionId,
		});
		console.log(`Group pubkey: ${this.groupPubkey}`);
		console.log(`Group address: ${this.groupAddress}`);

		// Notify parties to perform DKLS setup/precompute
		this.broadcast({ type: "tss_setup", participants: Array.from(this.parties.keys()).sort((a, b) => a - b) });
	}

	ethAddressFromUncompressed(uncompressedHex) {
		let hex = uncompressedHex.toLowerCase();
		if (hex.startsWith("0x")) hex = hex.slice(2);
		if (hex.startsWith("04")) hex = hex.slice(2);
		const keccak = require("js-sha3").keccak_256;
		const hash = Buffer.from(keccak.arrayBuffer(Buffer.from(hex, "hex")));
		return "0x" + hash.slice(-20).toString("hex");
	}

	combineSignature() {
		// Combine threshold DKLS signature fragments using tss-lib local_verify as a placeholder check
		const parts = Array.from(this.sigFrags.entries())
			.sort((a, b) => a[0] - b[0])
			.slice(0, this.threshold)
			.map(([, v]) => v);
		const r = parts[0].r; // DKLS has common R
		const sig_frags = parts.map((p) => p.fragment).filter((f) => !f?.error);
		const msg = this.pendingMessage || "";
		// Verify DKLS partials locally against group pubkey
		try {
			const ok = tss.local_verify(msg, true, r, sig_frags, this.groupPubkey);
			this.broadcast({ type: "tss_signature", ok, r, sig_frags });
			console.log(`TSS signature combined. Verified=${ok}`);
		} catch (e) {
			console.error("TSS combine/verify failed", e.message);
			this.broadcast({ type: "tss_signature", ok: false, error: e.message });
		}
	}
}

if (require.main === module) {
	// Start coordinator directly
	new TSSEcdsaCoordinator();
}

module.exports = TSSEcdsaCoordinator;
