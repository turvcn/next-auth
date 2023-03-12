import { createTransport } from "nodemailer"

import type { Options as SMTPTransportOptions } from "nodemailer/lib/smtp-transport"
import { TokenConfig } from "./token.js"
import type { Theme } from "../types.js"

/**
 * The Email Provider needs to be configured with an e-mail client.
 * By default, it uses `nodemailer`, which you have to install if this
 * provider is present.
 *
 * You can use a other services as well, like:
 * - [Postmark](https://postmarkapp.com)
 * - [Mailgun](https://www.mailgun.com)
 * - [SendGrid](https://sendgrid.com)
 * - etc.
 *
 * @see [Custom email service with Auth.js](https://authjs.dev/guides/providers/email#custom-email-service)
 */
export interface EmailConfig
  extends TokenConfig<"email", EmailServerConfig>,
    EmailServerConfig {}

export interface EmailConfigInternal extends EmailConfig {
  /**
   * ⚠️ Always make sure this method returns a single email address.
   *
   * @note Technically, the part of the email address local mailbox element
   * (everything before the `@` symbol) should be treated as 'case sensitive'
   * according to RFC 2821, but in practice this causes more problems than
   * it solves, e.g.: when looking up users by e-mail from databases.
   * By default, we treat email addresses as all lower case,
   * but you can override this function to change this behavior.
   *
   * [Documentation](https://authjs.dev/reference/providers/email#normalizing-the-e-mail-address) | [RFC 2821](https://tools.ietf.org/html/rfc2821) | [Email syntax](https://en.wikipedia.org/wiki/Email_address#Syntax)
   */
  normalizeIdentifier(email: string): string
}
export interface EmailServerConfig {
  // TODO: Make use of https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
  server: string | SMTPTransportOptions
  /** @default `"Auth.js <no-reply@authjs.dev>"` */
  from?: string
}

/** TODO: */
export default function Email(config: EmailConfig): EmailConfigInternal {
  return {
    id: "email",
    type: "email",
    name: "Email",
    server: { host: "localhost", port: 25, auth: { user: "", pass: "" } },
    from: "Auth.js <no-reply@authjs.dev>",
    maxAge: 24 * 60 * 60,
    async sendVerificationRequest(params) {
      const { identifier, url, provider, theme } = params
      const { host } = new URL(url)
      const transport = createTransport(provider.server)
      const result = await transport.sendMail({
        to: identifier,
        from: provider.from,
        subject: `Sign in to ${host}`,
        text: text({ url, host }),
        html: html({ url, host, theme }),
      })
      const failed = result.rejected.concat(result.pending).filter(Boolean)
      if (failed.length) {
        throw new Error(`Email (${failed.join(", ")}) could not be sent`)
      }
    },
    /**
     * ⚠️ Always make sure this method returns a single email address.
     *
     * @note Technically, the part of the email address local mailbox element
     * (everything before the `@` symbol) should be treated as 'case sensitive'
     * according to RFC 2821, but in practice this causes more problems than
     * it solves, e.g.: when looking up users by e-mail from databases.
     * By default, we treat email addresses as all lower case,
     * but you can override this function to change this behavior.
     *
     * [Documentation](https://authjs.dev/reference/providers/email#normalizing-the-e-mail-address) | [RFC 2821](https://tools.ietf.org/html/rfc2821) | [Email syntax](https://en.wikipedia.org/wiki/Email_address#Syntax)
     */
    normalizeIdentifier(email) {
      if (!email) throw new Error("Missing email from request body.")
      // Get the first two elements only,
      // separated by `@` from user input.
      let [local, domain] = email.toLowerCase().trim().split("@")
      // The part before "@" can contain a ","
      // but we remove it on the domain part
      domain = domain.split(",")[0]
      return `${local}@${domain}`
    },
    // @ts-expect-error
    options: config,
  }
}

/**
 * Email HTML body
 * Insert invisible space into domains from being turned into a hyperlink by email
 * clients like Outlook and Apple mail, as this is confusing because it seems
 * like they are supposed to click on it to sign in.
 *
 * @note We don't add the email address to avoid needing to escape it, if you do, remember to sanitize it!
 */
function html(params: { url: string; host: string; theme: Theme }) {
  const { url, host, theme } = params

  const escapedHost = host.replace(/\./g, "&#8203;.")

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const brandColor = theme.brandColor || "#346df1"
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const buttonText = theme.buttonText || "#fff"

  const color = {
    background: "#f9f9f9",
    text: "#444",
    mainBackground: "#fff",
    buttonBackground: brandColor,
    buttonBorder: brandColor,
    buttonText,
  }

  return `
<body style="background: ${color.background};">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background: ${color.mainBackground}; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center"
        style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        Sign in to <strong>${escapedHost}</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}"><a href="${url}"
                target="_blank"
                style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">Sign
                in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center"
        style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        If you did not request this email you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`
}

/** Email Text body (fallback for email clients that don't render HTML, e.g. feature phones) */
function text({ url, host }: { url: string; host: string }) {
  return `Sign in to ${host}\n${url}\n\n`
}
