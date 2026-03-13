const axios = require("axios");
const FormData = require("form-data");
const configuration = require("../Core/config");

const domain = "mg.zelf.world";
const apiKey = configuration.mailgun.apiKey;
const ALIAS_NAME = "blogdevalias";
const ALIAS_ADDRESS = `${ALIAS_NAME}@${domain}`;

const MEMBERS = [
    { address: "miguel.trevinom@gmail.com", name: "Miguel Trevino" },
    { address: "miguel@zelf.world", name: "Miguel Zelf" },
];

const createList = async () => {
    console.log(`Creating list ${ALIAS_ADDRESS}...`);
    const url = `https://api.mailgun.net/v3/lists`;
    const form = new FormData();
    form.append("address", ALIAS_ADDRESS);
    form.append("name", "Blog Dev Alias");
    form.append("description", "Dev alias for blog newsletter testing");
    form.append("access_level", "everyone"); // or 'members' or 'readonly'

    try {
        await axios.post(url, form, {
            auth: {
                username: "api",
                password: apiKey,
            },
            headers: form.getHeaders(),
        });
        console.log(`List ${ALIAS_ADDRESS} created.`);
    } catch (error) {
        if (error.response && error.response.status === 400 && error.response.data.message.includes("Address already exists")) {
            console.log(`List ${ALIAS_ADDRESS} already exists.`);
        } else {
            console.error("Error creating list:", error.response ? error.response.data : error.message);
            throw error;
        }
    }
};

const addMember = async (member) => {
    console.log(`Adding ${member.address} to list...`);
    const url = `https://api.mailgun.net/v3/lists/${ALIAS_ADDRESS}/members`;
    const form = new FormData();
    form.append("address", member.address);
    form.append("name", member.name);
    form.append("subscribed", "yes");
    form.append("upsert", "yes");

    try {
        await axios.post(url, form, {
            auth: {
                username: "api",
                password: apiKey,
            },
            headers: form.getHeaders(),
        });
        console.log(`Added ${member.address}.`);
    } catch (error) {
        console.error(`Error adding ${member.address}:`, error.response ? error.response.data : error.message);
    }
};

const main = async () => {
    try {
        await createList();

        for (const member of MEMBERS) {
            await addMember(member);
        }

        console.log("Done!");
    } catch (error) {
        console.error("Script failed:", error);
    }
};

main();
