function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char] ?? char);
}

/** Resend-compatible HTTP sender; no email secret is exposed to the browser. */
export async function sendVerificationEmail(to: string, url: string): Promise<void> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL");
  if (!apiKey || !from) throw new Error("email_delivery_not_configured");
  const safeUrl = escapeHtml(url);
  const fromName = env("RESEND_FROM_NAME") || "Nini Chat";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${from}>`,
      to: [to],
      subject: "Verify your Nini Chat email",
      text: `Verify your email address by opening this link: ${url}`,
      html: `<p>To verify your Nini Chat email address, open the link below.</p><p><a href="${safeUrl}">Verify email address</a></p><p>If you did not request this, ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`email_delivery_failed_${response.status}`);
}


/** Deliver a one-time admin invitation; only the token hash is stored server-side. */
export async function sendAdminInvitationEmail(to: string, url: string, displayName: string): Promise<void> {
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM_EMAIL");
  if (!apiKey || !from) throw new Error("email_delivery_not_configured");
  const safeUrl = escapeHtml(url);
  const safeName = escapeHtml(displayName);
  const fromName = env("RESEND_FROM_NAME") || "Nini Chat";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${fromName} <${from}>`, to: [to], subject: "Your Nini Chat invitation",
      text: `Hello ${displayName}, you have been invited to Nini Chat. Set your password within 48 hours: ${url}`,
      html: `<p>Hello ${safeName},</p><p>You have been invited to Nini Chat. This one-time link expires in 48 hours.</p><p><a href="${safeUrl}">Accept invitation and set password</a></p><p>If you did not expect this invitation, you can ignore this email.</p>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`email_delivery_failed_${response.status}`);
}
