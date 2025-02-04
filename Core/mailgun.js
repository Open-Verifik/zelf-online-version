const formData = require("form-data");
const Mailgun = require("mailgun.js");
const config = require("./config");
const domain = "mg.verifik.co";
const axios = require("axios");

const DOMAIN = "tudominio.com"; // O usa el sandbox de Mailgun
const API_KEY = "TU_API_KEY";

const mg = Mailgun({
	apiKey: "key-91318ad363192a252ba1c0d9a81f4a3e",
	domain: "tuemail@tudominio.com>",
});

const data = {
	from: "Tu Nombre <tuemail@tudominio.com>",
	to: "destinatario@example.com",
	subject: "Correo con HTML",
	html: `
    <h1 style="color: blue;">¡Hola!</h1>
    <p>Este es un correo con <strong>HTML</strong> enviado desde Mailgun.</p>
    <img src="https://www.mailgun.com/static/img/mailgun-logo.png" width="200" />
  `,
};
