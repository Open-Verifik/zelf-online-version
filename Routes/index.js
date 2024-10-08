module.exports = (server) => {
	// protected routes
	require("./repositories")(server);
};
