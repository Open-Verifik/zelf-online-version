const ejs = require("ejs");
const path = require("path");
const fs = require("fs");

const TEMPLATE_PATH = path.join(__dirname, "..", "Templates");

const EMAIL_CONTENT_TEMPLATES = {
    staff_invitation: "content-staff-invitation.template.ejs",
    staff_welcome: "content-staff-welcome.template.ejs",
    otp: "content-otp.template.ejs",
    plain: "content-plain.template.ejs",
    purchase_receipt: "content-purchase-receipt.template.ejs",
    newsletter_welcome: "content-newsletter-welcome.template.ejs",
    newsletter_blog: "content-newsletter-blog.template.ejs",
};

/**
 * Render Mail
 * @param {string} contentTemplate - Template name (e.g., 'staff_invitation')
 * @param {object} data - Template data
 * @param {string} userLanguage - Language code (en, es, etc.)
 * @return {Promise<{templateData: object, html: string}>}
 */
const renderMail = async (contentTemplate, data = {}, userLanguage = "en") => {
    return await new Promise((resolve, reject) => {
        try {
            if (!contentTemplate) throw new Error("no_content_template:500");
            if (!EMAIL_CONTENT_TEMPLATES[contentTemplate]) throw new Error("invalid_content_template:500");

            // Load translations
            let translations = {};
            const localePath = path.join(__dirname, "locales", "email", `${userLanguage}.json`);
            const defaultLocalePath = path.join(__dirname, "locales", "email", "en.json");

            try {
                if (fs.existsSync(defaultLocalePath)) {
                    translations = JSON.parse(fs.readFileSync(defaultLocalePath, "utf8"));
                }
                if (userLanguage !== "en" && fs.existsSync(localePath)) {
                    const userTranslations = JSON.parse(fs.readFileSync(localePath, "utf8"));
                    translations = { ...translations, ...userTranslations };
                }
            } catch (err) {
                console.error("Error loading translations:", err);
            }

            const templateData = {
                ...data,
                t: translations,
                contentTemplate: EMAIL_CONTENT_TEMPLATES[contentTemplate],

                // Required for all emails
                address: _formatAddress(data.address),
                greeting: data.greeting || `Hello ${data.recipientName || "there"},`,
                logo: _setLogo(data.logo),
                message: data.message || "",
                projectName: data.projectName || data.companyName || "Zelf",
                sincerely: data.sincerely || "Best regards,",
                subject: data.subject || translations.subject || "Notification from Zelf",
                unsubscribeUrl: "",
                unsubscribeText: "",
            };

            ejs.renderFile(`${TEMPLATE_PATH}/mail.template.ejs`, templateData, (error, html) => {
                if (error) {
                    console.error("EJS render error:", error);
                    reject(error);
                    return;
                }

                return resolve({ templateData, html });
            });
        } catch (error) {
            console.error("renderMail error:", error);
            reject(error);
        }
    });
};

/**
 * Format Address
 * @param {object|string} address
 * @return {string}
 */
const _formatAddress = (address = {}) => {
    if (typeof address === "string") return address.trim();

    if (!Object.keys(address || {}).length) return "";

    return Object.keys(address)
        .map((key) => (key !== "name" && key !== "email" && address[key]?.trim()) || "")
        .join(" ")
        .trim();
};

/**
 * Set Logo
 * @param {string} logo
 * @return {string}
 */
const _setLogo = (logo = "") => {
    if (!logo) return "https://zelf.world/logo.png";

    if (logo.startsWith("http")) return logo;

    return `data:image/jpeg;base64,${logo.replace(/^data:.*;base64,/g, "")}`;
};

module.exports = {
    renderMail,
};
