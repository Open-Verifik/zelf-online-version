module.exports = (server) => {
	//A
	require("../Repositories/api-mina/routes/mina-scrapping.route")(server);
	//B
	require("../Repositories/binance/routes/binance.route")(server);
	require("../Repositories/bitcoin/routes/bitcoin-scrapping.route")(server);

	//C
	//D
	//E
	require("../Repositories/etherscan/routes/etherscan.route")(server);
	require("../Repositories/etherscan/routes/etherscan-scrapping.route")(server);
	//F
	//G
	//H
	require("../Repositories/ZelfProof/routes/zelf-proof.route")(server);
	//I
	require("../Repositories/IPFS/routes/ipfs.routes")(server);
	//J
	//K
	//L
	//M
	//N
	//O
	//P
	//Q
	//R
	//S
	require("../Repositories/Solana/routes/solana-scrapping.route")(server);
	//T
	require("../Repositories/tron/routes/tron-scrapping.route")(server);
	//U
	//V
	//W
	require("../Repositories/Wallet/routes/wallet.route")(server);
	//X
	//Y
	//Z
	require("../Repositories/ZelfNameService/routes/zns.routes")(server);
};
// end
