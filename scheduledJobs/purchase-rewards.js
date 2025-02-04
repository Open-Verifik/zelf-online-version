require("dotenv").config();

const axios = require("../Core/axios").getCleanInstance();

const token = process.env.SUPER_ADMIN_TOKEN;

const baseUrl = `http://localhost:${process.env.PORT}`;

const _run = async () => {
	const response = await axios.post(
		`${baseUrl}/api/zelf-name-service/purchase-rewards`,
		{},
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}
	);

	return response.data.data;
};

_run().then((response) => {
	console.info({
		response,
	});
});
