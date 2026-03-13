/**
 * ZelfLegacyAvax Email Service
 * Handles all inheritance-related email notifications via Mailgun.
 *
 * Notification types:
 *  1. Lawyer: A new inheritance plan needs your acceptance (PendingLawyer state)
 *  2. Testator: Your plan is now active (Lawyer accepted)
 *  3. Testator: Grace period running — liveness check overdue
 *  4. Lawyer: Testator lapsed — please confirm succession
 *  5. Beneficiaries: Inheritance is now claimable
 */

const Mailgun = require('mailgun.js');
const formData = require('form-data');
const config = require('../../../Core/config');

// ═══════════════════════════════════════════════════════════════
// Mailgun client (lazy-init so server starts even without keys)
// ═══════════════════════════════════════════════════════════════
let _mg = null;

function getClient() {
  if (_mg) return _mg;
  const key = config.email_providers.mailgun.apiKey;
  if (!key) throw new Error('config.email_providers.mailgun.apiKey is not set');
  const mg = new Mailgun(formData);
  _mg = mg.client({ username: 'api', key });
  return _mg;
}

function getDomain() {
  return "mg.zelf.world";
}

// ═══════════════════════════════════════════════════════════════
// Base send helper
// ═══════════════════════════════════════════════════════════════
const axios = require('axios');

async function sendEmail(to, subject, html) {
  const domain = getDomain();

  const emailData = {
    from: `Zelf Legacy <noreply@${domain}>`,
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    html,
    text: subject,
  };

  const form = new formData();
  Object.keys(emailData).forEach((key) => {
    form.append(key, emailData[key]);
  });

  const auth = `api:${config.email_providers.mailgun.apiKey}`;
  const headers = {
    ...form.getHeaders(),
    Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
  };

  const result = await axios.post(`https://api.mailgun.net/v3/${domain}/messages`, form, { headers });

  console.log(`📧 Email sent to ${to} — ID: ${result.data.id}`);
  return result.data;
}

// ═══════════════════════════════════════════════════════════════
// Shared HTML shell (matches email_template_preview.html style)
// ═══════════════════════════════════════════════════════════════
function buildEmailHtml({ icon, subtitle, title, body, stepsHtml = '', highlightHtml = '', ctaHtml = '' }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    .selectable {
      -webkit-user-select: all;
      -moz-user-select: all;
      -ms-user-select: all;
      user-select: all;
      cursor: pointer;
    }
    @media (prefers-color-scheme: dark) {
      .dark-text-force { color: #fffffe !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; color: #e1e1e1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0f; min-width: 100%;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #1a1a2e; border-radius: 20px; overflow: hidden; border: 1px solid #333333;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #00d9ff; background-image: linear-gradient(135deg, #00d9ff 0%, #7b2cbf 100%); padding: 40px 32px;">
              <div style="font-size: 48px; margin-bottom: 12px;">${icon}</div>
              <h1 class="dark-text-force" style="color: #fffffe !important; font-size: 26px; margin: 0; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Zelf Legacy</h1>
              <p class="dark-text-force" style="color: #fffffe !important; margin-top: 8px; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">${subtitle}</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 class="dark-text-force" style="color: #fffffe !important; font-size: 20px; margin: 0 0 16px 0; font-weight: 600;">${title}</h2>
              <p style="font-size: 16px; line-height: 1.7; color: #e1e1e1 !important; margin: 0 0 24px 0;">${body}</p>

              ${highlightHtml}
              ${stepsHtml}
              ${ctaHtml}

              <!-- Important notice -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #242016; border-left: 4px solid #fbbf24; border-radius: 0 12px 12px 0; margin: 28px 0;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #fbbf24 !important; font-size: 14px; line-height: 1.6;">
                      <strong>📌 Important:</strong> Please keep this email safe for future reference.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #0e0e15; padding: 24px 32px; border-top: 1px solid #333333;">
              <p style="font-size: 13px; color: #999999 !important; margin: 0 0 8px 0;">
                Best regards,<br>
                <strong style="color: #bbbbbb !important;">The Zelf Legacy Team</strong>
              </p>
              <p style="font-size: 11px; color: #888888 !important; margin: 12px 0 0 0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Helper: step row
function stepRow(n, text) {
  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
      <tr>
        <td valign="top" width="48">
          <div style="background: linear-gradient(135deg, #00d9ff, #7b2cbf); color: #fff; width: 32px; height: 32px; line-height: 32px; border-radius: 50%; text-align: center; font-weight: 700; font-size: 14px;">${n}</div>
        </td>
        <td valign="top" style="padding-top: 4px;">
          <p style="margin: 0; color: #e0e0e0; font-size: 15px; line-height: 1.5;">${text}</p>
        </td>
      </tr>
    </table>`;
}

// Helper: highlighted box (for vault IDs, tag names, etc.)
function highlightBox(label, value) {
  return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #121c33; border: 1px solid #33ccff; border-radius: 16px; margin: 28px 0;">
      <tr>
        <td align="center" style="padding: 28px;">
          <p style="margin: 0 0 8px 0; color: #fffffe !important; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">${label}</p>
          <div class="selectable" style="margin: 0; font-size: 18px; font-weight: 700; color: #00d9ff !important; font-family: 'SF Mono', Monaco, 'Courier New', monospace; word-break: break-all; background-color: #0e0e15; padding: 12px 16px; border-radius: 8px; border: 1px dashed #33ccff;">
            ${value}
          </div>
        </td>
      </tr>
    </table>`;
}

// Helper: success / info / warning badges
function successBadge(text) {
  return `
    <div style="background-color: #112d22; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 12px; padding: 20px; margin: 28px 0; text-align: center;">
      <p style="margin: 0; color: #10b981 !important; font-size: 15px; font-weight: 500;">${text}</p>
    </div>`;
}

function warningBadge(text) {
  return `
    <div style="background-color: #2e2410; background-color: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251,191,36,0.4); border-radius: 12px; padding: 20px; margin: 28px 0; text-align: center;">
      <p style="margin: 0; color: #fbbf24 !important; font-size: 15px; font-weight: 500;">${text}</p>
    </div>`;
}

function dangerBadge(text) {
  return `
    <div style="background-color: #2b1418; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239,68,68,0.4); border-radius: 12px; padding: 20px; margin: 28px 0; text-align: center;">
      <p style="margin: 0; color: #ef4444 !important; font-size: 15px; font-weight: 500;">${text}</p>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// 1. LAWYER — New inheritance plan pending acceptance
// ═══════════════════════════════════════════════════════════════
/**
 * Notify the lawyer that a new inheritance plan was created and is pending their acceptance.
 * @param {string} lawyerEmail
 * @param {string} vaultId  - hex vault ID from the contract
 * @param {string} testatorAddress - EVM address of the testator
 */
async function sendLawyerNewPlan(lawyerEmail, vaultId, testatorAddress) {
  const subject = '⚖️ New Inheritance Plan — Pending Your Acceptance';
  const html = buildEmailHtml({
    icon: '⚖️',
    subtitle: 'Action Required',
    title: 'A new inheritance plan requires your acceptance',
    body: 'A new <strong style="color: #00d9ff;">inheritance plan</strong> has been created and is awaiting your acceptance as the designated lawyer. Please review and accept or reject the plan in the Zelf app.',
    highlightHtml:
      highlightBox('Vault ID', vaultId) +
      highlightBox('Testator Address', testatorAddress),
    stepsHtml: `
          <h2 style="color: #ffffff; font-size: 18px; margin: 36px 0 24px 0; font-weight: 600;"><span style="color: #00d9ff;">📋</span> How to Accept</h2>
          ${stepRow(1, '<strong>Open Zelf</strong> and navigate to the Inheritance section.')}
          ${stepRow(2, 'Select <strong>"My Lawyer Vaults"</strong>.')}
          ${stepRow(3, 'Find the plan with the Vault ID above and tap <strong>"Accept"</strong>.')}
          ${stepRow(4, '<strong>Sign</strong> the acceptance with your face or wallet credentials.')}
        `,
    ctaHtml: warningBadge('⏳ This plan will expire if you do not accept within the designated timeout period.'),
  });
  return sendEmail(lawyerEmail, subject, html);
}

// ═══════════════════════════════════════════════════════════════
// 2. TESTATOR — Plan is now active
// ═══════════════════════════════════════════════════════════════
/**
 * Notify the testator that the lawyer accepted their plan and it is now active.
 * @param {string} testatorEmail
 * @param {string} vaultId
 */
async function sendTestatorPlanActive(testatorEmail, vaultId) {
  const subject = '✅ Your Inheritance Plan Is Now Active — Zelf Legacy';
  const html = buildEmailHtml({
    icon: '✅',
    subtitle: 'Plan Activated',
    title: 'Your inheritance plan is now active',
    body: 'Great news! Your designated lawyer has <strong style="color: #10b981;">accepted</strong> your inheritance plan. It is now active and the liveness monitoring period has started. You must periodically confirm your liveness in the Zelf app to keep the plan active.',
    highlightHtml: highlightBox('Vault ID', vaultId),
    stepsHtml: `
          <h2 style="color: #ffffff; font-size: 18px; margin: 36px 0 24px 0; font-weight: 600;"><span style="color: #00d9ff;">📋</span> Keep Your Plan Active</h2>
          ${stepRow(1, '<strong>Open Zelf</strong> regularly and go to the Inheritance section.')}
          ${stepRow(2, 'Tap <strong>"Confirm Liveness"</strong> to reset the heartbeat timer.')}
          ${stepRow(3, 'Authenticate using <strong>face verification</strong>.')}
        `,
    ctaHtml: successBadge('✅ Your inheritance plan is active and your beneficiaries are protected.'),
  });
  return sendEmail(testatorEmail, subject, html);
}

// ═══════════════════════════════════════════════════════════════
// 3. TESTATOR — Grace period warning
// ═══════════════════════════════════════════════════════════════
/**
 * Notify the testator that the grace period is running and the will is about to execute.
 * @param {string} testatorEmail
 * @param {string} vaultId
 * @param {number} daysRemaining - approximate days before vault becomes claimable
 */
async function sendTestatorGracePeriod(testatorEmail, vaultId, daysRemaining) {
  const subject = '⚠️ Urgent: Your Liveness Check Is Overdue — Zelf Legacy';
  const html = buildEmailHtml({
    icon: '⚠️',
    subtitle: 'Grace Period Active',
    title: 'Your inheritance plan is in the grace period',
    body: `Your liveness has not been confirmed for a while and your inheritance plan has entered the <strong style="color: #fbbf24;">grace period</strong>. You have approximately <strong style="color: #fbbf24;">${daysRemaining} day(s)</strong> remaining before the will becomes executable. Please confirm your liveness immediately.`,
    highlightHtml: highlightBox('Vault ID', vaultId),
    stepsHtml: `
          <h2 style="color: #ffffff; font-size: 18px; margin: 36px 0 24px 0; font-weight: 600;"><span style="color:#00d9ff;">📋</span> Confirm Your Liveness Now</h2>
          ${stepRow(1, '<strong>Open Zelf</strong> immediately.')}
          ${stepRow(2, 'Go to <strong>Inheritance → My Plans</strong>.')}
          ${stepRow(3, 'Tap <strong>"Confirm Liveness"</strong> and complete the face scan.')}
        `,
    ctaHtml: warningBadge('⏳ Act now — failure to confirm will allow beneficiaries to claim the succession.'),
  });
  return sendEmail(testatorEmail, subject, html);
}

// ═══════════════════════════════════════════════════════════════
// 4. LAWYER — Testator liveness failed, action needed
// ═══════════════════════════════════════════════════════════════
/**
 * Notify the lawyer that the testator has not activated their liveness and they should now accept the succession.
 * @param {string} lawyerEmail
 * @param {string} vaultId
 * @param {string} testatorAddress
 */
async function sendLawyerLivenessFailed(lawyerEmail, vaultId, testatorAddress) {
  const subject = '🔔 Succession Alert: Testator Liveness Lapsed — Zelf Legacy';
  const html = buildEmailHtml({
    icon: '🔔',
    subtitle: 'Action Required',
    title: 'The testator\'s liveness period has expired',
    body: 'The testator associated with the inheritance plan below has <strong style="color: #ef4444;">not confirmed their liveness</strong> within the designated period. As the assigned lawyer, you may now confirm the succession and release the inheritance to the beneficiaries.',
    highlightHtml:
      highlightBox('Vault ID', vaultId) +
      highlightBox('Testator Address', testatorAddress),
    stepsHtml: `
          <h2 style="color: #ffffff; font-size: 18px; margin: 36px 0 24px 0; font-weight: 600;"><span style="color: #00d9ff;">📋</span> How to Confirm Succession</h2>
          ${stepRow(1, '<strong>Open Zelf</strong> and navigate to <strong>Inheritance → Lawyer Vaults</strong>.')}
          ${stepRow(2, 'Locate the vault with the ID above.')}
          ${stepRow(3, 'Tap <strong>"Confirm Death / Succession"</strong>.')}
          ${stepRow(4, '<strong>Sign</strong> the confirmation with your credentials.')}
        `,
    ctaHtml: dangerBadge('🚨 Please verify the situation carefully before confirming succession.'),
  });
  return sendEmail(lawyerEmail, subject, html);
}

// ═══════════════════════════════════════════════════════════════
// 5. BENEFICIARIES — Inheritance is claimable
// ═══════════════════════════════════════════════════════════════
/**
 * Notify beneficiaries that they can now claim their inheritance.
 * @param {string|string[]} beneficiaryEmails
 * @param {string} tagName - ZNS tag name to use in Zelf for claiming
 */
async function sendBeneficiaryClaimable(beneficiaryEmails, tagName) {
  const subject = '🕊️ Inheritance Available — Zelf Legacy';
  const html = buildEmailHtml({
    icon: '🕊️',
    subtitle: 'Inheritance Available',
    title: 'An inheritance plan is ready for you to claim',
    body: 'We are very sorry for your loss. An inheritance plan has been left for you, and you are now able to access its assets. Please follow the steps below to claim your inheritance using the Zelf app.',
    highlightHtml: highlightBox('Your Inheritance Tag Name (Tap to select)', tagName),
    stepsHtml: `
          <h2 style="color: #ffffff; font-size: 18px; margin: 36px 0 24px 0; font-weight: 600;"><span style="color: #00d9ff;">📋</span> How to Claim Your Inheritance</h2>
          ${stepRow(1, '<strong>Download Zelf</strong> from the <a href="https://play.google.com/store" style="color: #00d9ff; text-decoration: none;">Play Store</a>.')}
          ${stepRow(2, 'Enter the <strong>tag name</strong> shown above.')}
          ${stepRow(3, '<strong>Authenticate</strong> using face verification.')}
          ${stepRow(4, 'On the main screen, tap the <strong>center bottom button</strong>.')}
          ${stepRow(5, 'Select <strong>"Accept Inheritance"</strong> and follow the instructions.')}
        `,
    ctaHtml: successBadge('✅ Once completed, you\'ll be able to access your funds.'),
  });
  return sendEmail(beneficiaryEmails, subject, html);
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════
module.exports = {
  sendLawyerNewPlan,
  sendTestatorPlanActive,
  sendTestatorGracePeriod,
  sendLawyerLivenessFailed,
  sendBeneficiaryClaimable,
};
