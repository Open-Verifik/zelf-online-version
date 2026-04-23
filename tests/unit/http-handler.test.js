const { errorHandler } = require("../../Core/http-handler");

describe("errorHandler", () => {
	beforeAll(() => {
		jest.spyOn(console, "error").mockImplementation(() => {});
	});
	afterAll(() => {
		console.error.mockRestore();
	});
	it("maps license_not_found with status 404 to HTTP 404", () => {
		const err = new Error("license_not_found");
		err.status = 404;
		const r = errorHandler(err);
		expect(r.status).toBe(404);
		expect(r.message).toBe("license not found");
		expect(r.code).toBe("NotFound");
	});

	it("maps zelf decrypt style errors with status 401 to HTTP 401", () => {
		const err = new Error("INVALID PASSWORD");
		err.status = 401;
		err.code = "AUTH_X";
		const r = errorHandler(err);
		expect(r.status).toBe(401);
		expect(r.message).toBe("INVALID PASSWORD");
		expect(r.code).toBe("AUTH_X");
	});

	it("still parses 404:detail message strings when .status is absent", () => {
		const r = errorHandler(new Error("404:client_not_found"));
		expect(r.status).toBe(404);
		expect(r.message).toBe("client_not_found");
	});

	it("prefers NNN:code in message over exception.status when both present", () => {
		const err = new Error("409:email_already_exists");
		err.status = 500;
		const r = errorHandler(err);
		expect(r.status).toBe(409);
		expect(r.message).toBe("email_already_exists");
	});
});
