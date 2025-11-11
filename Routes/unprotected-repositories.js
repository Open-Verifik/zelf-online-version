module.exports = (server) => {
	//A
	//B
	//C
	require("../Repositories/Client/routes/unprotected-client.route")(server);
	//D
	//E
	//F
	//G
	//H

	//I
	require("../Repositories/IPFS/routes/open-ipfs.routes")(server);
	//J
	//K
	//L
	//M
	require("../Repositories/Mail/routes/mail.route")(server);

	//N
	//O
	//P

	//Q
	//R
	//S
	require("../Repositories/SuperAdmin/routes/super-admin.route")(server);
	require("../Repositories/Session/routes/session.route")(server);
	require("../Repositories/Stripe/routes/stripe.routes")(server);
	require("../Repositories/Subscribers/routes/subscriber.route")(server);
	require("../Repositories/Subscription/routes/subscription.routes")(server);
	//T
	//U
	//V
	//W
	require("../Repositories/Wallet/routes/unprotected-wallet.route")(server);
	//X
	//Y
	//Z
};
