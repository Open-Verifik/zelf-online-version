// routes/unprotected.js
const Router = require("@koa/router");
const jwt = require("jsonwebtoken");
const config = require("../Core/config");
const secret = config.JWT_SECRET;
const { Field } = require("o1js");
const { createProof, verifyProof } = require("./zkp");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const router = new Router();

// Login route to generate a token
router.post("/login", async (ctx) => {
	const { username, password } = ctx.request.body;
	// Here, you should validate the username and password against your data source
	if (username === "user" && password === "password") {
		const token = jwt.sign({ username }, secret, { expiresIn: "30d" });
		ctx.body = { token };
	} else {
		ctx.status = 401;
		ctx.body = "Invalid credentials";
	}
});

const qrCodeHash = `AsSNNFoOj8+ZwoQ9EnOFnZgdiEjz7rHnDQDUNDX3vQdtPNaZPrZfYzmLtdYclh74IwNEgR8qLgcihsKE4b7uAMliuReETtHm5rC067A8eILWcZ5cjKrhvQyRIBwrkvHSzNz9bdNKv/vPxkp2MzQT08Z5Zwwf+5IdabX1i7p9Ba5wxtvfU4wpN8+DqyA6dRd0v0cijM0NTa5xQpkbzi7WDD2hxHsnFirebOd7l8hHy7bBla66B1bGMjU8BLdJv5cvcd7BikCcKuIJ07l1/htYrngHBXXJfbvSqj4/IFlT+NtMsziXkWRNFrcTMt0KzRdQf5XkH4W+s+cpV7uG1lOCT/KfRo0kyQMf1kuP/2cL4jZVWMNtosoT+e/1cowNLpFi9jfytvhzQg8MspsmJRMidTS1f0Fk2fBnFn+nSRTkmPNLUzNW4jJ1pRAB4gFJ5uLnV2PqtTsEqrbPwIJNp+L6yRjf4G/PxfVChsaAYV7DdxIJ9KW0Q8QQbbK1e0u3Rk60hX7O1PWoNUz7vt4u7IisR/f4aiIZGqtGiXun+CfJnTABV2yrVjDIqqLoROFfeSMlHfnj0FKX+ZUrNCxtbTGuBBS3tNCxzzLXKz6IPbISBthSyq+S1+ACLLOxl9/Dz803PXM94cY0nW22NkBFUsxx9kxMphE+hvs+rOrnqvhNE49wKzj8+l2n2BsdixBYs26uINL+xhifPj9xZdBGGglWbckF19U3pFPNWV0TtEWFZxwc707aLLr+1tFKUZQ4a8UbIHWIY6LVB8C+VrGJpt9GAxffJMMBmbcOFJlvwIbytf0ZazpVqMWBTLn5iM3S0F84DlCF8uWVaxDosOaRvRbLQt831Al45nXKWk9BkIVTsEhhwF0t1dnA3b1I5i2w7vHMFnddsST4F5i6hPTc52M0wpBkAQ/nDIiF6IftIrz6ywXoRcMopvbo1Ac/sQpwfvDC8GkEQHD3kOWTBvUaN55s`;

router.post("/generate-proof", async (ctx) => {
	// Generate proof
	const proof = await createProof(qrCodeHash);

	// Send the proof to the user
	ctx.body = { proof };
});

router.post("/verify-proof", async (ctx) => {
	const { proof } = ctx.request.body;

	const verification = await verifyProof(proof, qrCodeHash);

	ctx.body = { verification };
});

// Public route
router.get("/public", (ctx) => {
	ctx.body = { message: "This is a public endpoint" };
});

require("./unprotected-repositories")(router);

module.exports = router;
