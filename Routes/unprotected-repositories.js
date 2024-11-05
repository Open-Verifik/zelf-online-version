module.exports = (server) => {
	//A
	//B
	//C
	require("../Repositories/Client/routes/client.route")(server);
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
	require("../Repositories/Subscribers/routes/subscriber.route")(server);
	//T
	//U
	//V
	//W
	require("../Repositories/Wallet/routes/unprotected-wallet.route")(server);
	//X
	//Y
	//Z
	require("../Repositories/ZelfNameService/routes/zns.routes")(server);
};
// end
