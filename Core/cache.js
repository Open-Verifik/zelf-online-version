"use strict";

const crypto = require("crypto");

const allowedPaths = {};

module.exports = () => {
	const content = crypto.rng(5000).toString("hex");
	const ONE_MINUTE = 60000;
	var last = Date.now();

	function timestamp() {
		var now = Date.now();
		if (now - last >= ONE_MINUTE) last = now;
		return last;
	}

	function etagger() {
		var cache = {};
		var afterEventAttached = false;

		function attachAfterEvent(server) {
			if (afterEventAttached === true) {
				return;
			}

			afterEventAttached = true;

			server.on("after", (req, res) => {
				if (res.statusCode !== 200) {
					return;
				}

				const key = req.url;

				const etag = req.id();

				if (!allowedPaths[req.route.path] || allowedPaths[req.route.path].indexOf(req.method) === -1 || cache[key] === etag) {
					return;
				}

				cache[key] = etag;
			});
		}

		return function (req, res, next) {
			attachAfterEvent(this);

			const key = req.url;

			if (key in cache) {
				res.set("Etag", cache[key]);

				res.set("Cache-Control", "public, max-age=120");
			}

			next();
		};
	}

	return {
		timestamp,
		etagger,
	};
};
