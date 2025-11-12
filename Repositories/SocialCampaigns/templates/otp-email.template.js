/**
 * Generate HTML email template for OTP verification
 * @param {string} otp - OTP code
 * @param {string} language - Language code ('en' or 'es')
 * @returns {string} HTML email content
 */
const generateOTPEmailHTML = (otp, language = "en") => {
	const isSpanish = language === "es" || language === "es-ES" || language === "es-MX";

	const content = {
		en: {
			title: "Email Verification Code",
			greeting: "Hello!",
			message: "Your verification code for the social campaign is:",
			otpLabel: "Verification Code",
			expires: "This code will expire in 10 minutes.",
			security: "For security reasons, please do not share this code with anyone.",
			noRequest: "If you didn't request this code, please ignore this email.",
			footer: "Thank you for using Zelf!",
		},
		es: {
			title: "Código de Verificación de Email",
			greeting: "¡Hola!",
			message: "Tu código de verificación para la campaña social es:",
			otpLabel: "Código de Verificación",
			expires: "Este código expirará en 10 minutos.",
			security: "Por razones de seguridad, por favor no compartas este código con nadie.",
			noRequest: "Si no solicitaste este código, por favor ignora este correo.",
			footer: "¡Gracias por usar Zelf!",
		},
	};

	const text = isSpanish ? content.es : content.en;

	return `
<!DOCTYPE html>
<html lang="${language}">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<title>${text.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa;">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 20px;">
		<tr>
			<td align="center">
				<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-width: 600px; width: 100%;">
					<!-- Header -->
					<tr>
						<td align="center" style="padding: 40px 40px 20px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
							<h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
								${text.title}
							</h1>
						</td>
					</tr>
					
					<!-- Content -->
					<tr>
						<td style="padding: 40px;">
							<p style="margin: 0 0 20px 0; color: #1a202c; font-size: 16px; line-height: 1.6;">
								${text.greeting}
							</p>
							
							<p style="margin: 0 0 30px 0; color: #4a5568; font-size: 15px; line-height: 1.6;">
								${text.message}
							</p>
							
							<!-- OTP Code Box -->
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 30px 0;">
								<tr>
									<td align="center" style="padding: 0;">
										<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 30px;">
											<tr>
												<td align="center" style="padding: 0 0 15px 0;">
													<p style="margin: 0; color: #ffffff; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">
														${text.otpLabel}
													</p>
												</td>
											</tr>
											<tr>
												<td align="center" style="padding: 0;">
													<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 300px;">
														<tr>
															<td align="center">
																<p style="margin: 0; color: #667eea; font-size: 42px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">
																	${otp}
																</p>
															</td>
														</tr>
													</table>
												</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
							
							<!-- Info Messages -->
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
								<tr>
									<td style="background-color: #f7fafc; border-left: 4px solid #667eea; border-radius: 4px; padding: 16px;">
										<p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
											⏱️ ${text.expires}
										</p>
									</td>
								</tr>
							</table>
							
							<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
								<tr>
									<td style="background-color: #fff5f5; border-left: 4px solid #fc8181; border-radius: 4px; padding: 16px;">
										<p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
											🔒 ${text.security}
										</p>
									</td>
								</tr>
							</table>
							
							<p style="margin: 0; color: #718096; font-size: 13px; line-height: 1.6; text-align: center;">
								${text.noRequest}
							</p>
						</td>
					</tr>
					
					<!-- Footer -->
					<tr>
						<td align="center" style="padding: 30px 40px; background-color: #f7fafc; border-radius: 0 0 16px 16px; border-top: 1px solid #e2e8f0;">
							<p style="margin: 0; color: #718096; font-size: 14px; line-height: 1.6;">
								${text.footer}
							</p>
							<p style="margin: 10px 0 0 0; color: #a0aec0; font-size: 12px;">
								© ${new Date().getFullYear()} Zelf. All rights reserved.
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>
	`.trim();
};

module.exports = {
	generateOTPEmailHTML,
};

