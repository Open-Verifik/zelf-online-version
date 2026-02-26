module.exports = (server) => {
    //A
    //B
    //C
    require("../Repositories/Client/routes/unprotected-client.route")(server);
    require("../Repositories/BlockDAG/routes/blockdag-nft-public.routes")(server);
    require("../Repositories/BlockDAG/routes/blockdag-public.routes")(server);
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
    require("../Repositories/Lawyer/routes/unprotected-lawyer.routes")(server);
    //M
    require("../Repositories/Mail/routes/mail.route")(server);

    //N
    //O
    //P
    require("../Repositories/PreSale/routes/pre-sale.routes")(server);

    //Q
    //R
    //S
    require("../Repositories/SuperAdmin/routes/super-admin.route")(server);
    require("../Repositories/Session/routes/session.route")(server);
    require("../Repositories/Stripe/routes/stripe.routes")(server);
    require("../Repositories/Subscribers/routes/subscriber.route")(server);
    require("../Repositories/ZelfKeysSubscription/routes/zelf-keys-subscription.routes")(server);
    require("../Repositories/Staff/routes/unprotected-staff.route")(server);
    //T
    //U
    //V
    //W
    require("../Repositories/Wallet/routes/unprotected-wallet.route")(server);
    //X
    //Y
    //Z
    require("../Repositories/ZelfProof/routes/zelf-proof.route")(server);
};
