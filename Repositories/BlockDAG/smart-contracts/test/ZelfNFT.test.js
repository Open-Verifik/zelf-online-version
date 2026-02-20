const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Zelf NFT Marketplace", function () {
    let factory, marketplace;
    let owner, addr1, addr2;
    let nftCollection;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy Factory
        const ZelfNFTFactory = await ethers.getContractFactory("ZelfNFTFactory");
        factory = await ZelfNFTFactory.deploy();
        await factory.waitForDeployment();

        // Deploy Marketplace
        const ZelfMarketplace = await ethers.getContractFactory("ZelfMarketplace");
        marketplace = await ZelfMarketplace.deploy();
        await marketplace.waitForDeployment();
    });

    describe("Factory", function () {
        it("Should create a new collection", async function () {
            const tx = await factory.createCollection("Test Collection", "TEST", 100);
            const receipt = await tx.wait();

            // Find CollectionCreated event
            const event = receipt.logs.find((log) => log.fragment && log.fragment.name === "CollectionCreated");
            expect(event).to.not.be.undefined;

            const collectionAddress = event.args[0];
            expect(collectionAddress).to.be.properAddress;

            const ZelfNFT = await ethers.getContractFactory("ZelfNFT");
            nftCollection = ZelfNFT.attach(collectionAddress);
            expect(await nftCollection.name()).to.equal("Test Collection");
            expect(await nftCollection.symbol()).to.equal("TEST");
        });
    });

    describe("Marketplace Flow", function () {
        beforeEach(async function () {
            // Create collection and mint NFT to owner
            const tx = await factory.createCollection("Test Collection", "TEST", 100);
            const receipt = await tx.wait();
            const event = receipt.logs.find((log) => log.fragment && log.fragment.name === "CollectionCreated");
            const collectionAddress = event.args[0];

            const ZelfNFT = await ethers.getContractFactory("ZelfNFT");
            nftCollection = ZelfNFT.attach(collectionAddress);

            // Mint NFT to addr1 (seller)
            await nftCollection.connect(owner).mint(addr1.address, "ipfs://test");
        });

        it("Should list and buy an item", async function () {
            const tokenId = 0;
            const price = ethers.parseEther("1");

            // Approve marketplace
            await nftCollection.connect(addr1).approve(await marketplace.getAddress(), tokenId);

            // List item
            await expect(marketplace.connect(addr1).listItem(await nftCollection.getAddress(), tokenId, price))
                .to.emit(marketplace, "ItemListed")
                .withArgs(await nftCollection.getAddress(), tokenId, addr1.address, price);

            // Buy item with addr2
            await expect(marketplace.connect(addr2).buyItem(await nftCollection.getAddress(), tokenId, { value: price }))
                .to.emit(marketplace, "ItemSold")
                .withArgs(await nftCollection.getAddress(), tokenId, addr1.address, addr2.address, price);

            expect(await nftCollection.ownerOf(tokenId)).to.equal(addr2.address);
        });

        it("Should make an offer and accept it", async function () {
            const tokenId = 0;
            const offerAmount = ethers.parseEther("0.5");

            // Make offer with addr2
            await expect(marketplace.connect(addr2).makeOffer(await nftCollection.getAddress(), tokenId, { value: offerAmount }))
                .to.emit(marketplace, "OfferMade")
                .withArgs(await nftCollection.getAddress(), tokenId, addr2.address, offerAmount);

            // Approve marketplace (owner needs to approve to accept offer transfer)
            await nftCollection.connect(addr1).approve(await marketplace.getAddress(), tokenId);

            // Accept offer with addr1 (owner)
            await expect(marketplace.connect(addr1).acceptOffer(await nftCollection.getAddress(), tokenId, addr2.address))
                .to.emit(marketplace, "OfferAccepted")
                .withArgs(await nftCollection.getAddress(), tokenId, addr1.address, addr2.address, offerAmount);

            expect(await nftCollection.ownerOf(tokenId)).to.equal(addr2.address);
        });
    });
});
