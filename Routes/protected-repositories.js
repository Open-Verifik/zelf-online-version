module.exports = (server) => {
	//A
	require("../Repositories/Avalanche/routes/avalanche-scrapping.route")(server);
	require("../Repositories/api-mina/routes/mina-scrapping.route")(server);
	require("../Repositories/dataAnalytics/routes/dataAnalytics.route")(server);
	//B
	require("../Repositories/bnb/routes/bnb-scrapping.route")(server);
	require("../Repositories/binance/routes/binance.route")(server);
	require("../Repositories/bitcoin/routes/bitcoin-scrapping.route")(server);
	//C
	require("../Repositories/cardano/routes/cardano-scrapping.route")(server);
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
	require("../Repositories/purchase-zelf/routes/purchase.route")(server);
	//Q
	//R
	//S
	require("../Repositories/Solana/routes/solana-scrapping.route")(server);
	//T
	//U
	//V
	//W
	require("../Repositories/Wallet/routes/wallet.route")(server);
	//X
	require("../Repositories/XRP/routes/xrp-scrapping.route")(server);
	//Y
	//Z
	require("../Repositories/ZelfNameService/routes/zns.routes")(server);
};
// end
