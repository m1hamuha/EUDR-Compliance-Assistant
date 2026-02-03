import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface InvitationEmailParams {
  email: string
  supplierName: string
  invitationToken: string
  companyName: string
}

export async function sendSupplierInvitation({
  email,
  supplierName,
  invitationToken,
  companyName
}: InvitationEmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const invitationLink = `${appUrl}/supplier/invite/${invitationToken}`

  await resend.emails.send({
    from: 'EUDR Compliance <noreply@eudr-compliance.com>',
    to: email,
    subject: `Invitation to contribute to ${companyName}'s EUDR compliance data collection`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">EUDR Compliance Invitation</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Hello,</p>
          <p><strong>${companyName}</strong> has invited you to contribute production place data for EUDR compliance.</p>
          
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Supplier:</strong> ${supplierName}</p>
            <p style="margin: 0;">The EU Deforestation Regulation (EUDR) requires companies to collect and verify geolocation data for their supply chains.</p>
          </div>
          
          <p>Please click the button below to access the supplier portal and provide your production location information:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Complete Your Data Submission
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            This invitation link will expire in 7 days. If you have questions, please contact ${companyName} directly.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated message from the EUDR Compliance Assistant.
            <br>
            The EUDR requires companies to ensure their supply chains are deforestation-free.
          </p>
        </div>
      </body>
      </html>
    `
  })
}

export async function sendWelcomeEmail(email: string, companyName: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email')
    return
  }

  await resend.emails.send({
    from: 'EUDR Compliance <noreply@eudr-compliance.com>',
    to: email,
    subject: `Welcome to EUDR Compliance Assistant`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Welcome to EUDR Compliance</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0;">Hello,</p>
          <p>Thank you for signing up for EUDR Compliance Assistant. Your account for <strong>${companyName}</strong> has been created.</p>
          
          <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0;">Getting Started</h3>
            <ol style="margin: 0; padding-left: 20px;">
              <li>Add your suppliers to the dashboard</li>
              <li>Invite suppliers to contribute their production data</li>
              <li>Collect and validate geolocation information</li>
              <li>Export EUDR-compliant reports</li>
            </ol>
          </div>
          
          <p>You are currently on the <strong>Trial plan</strong> which allows up to 3 suppliers. Upgrade anytime to access all features.</p>
        </div>
      </body>
      </html>
    `
  })
}

export default { sendSupplierInvitation, sendWelcomeEmail }