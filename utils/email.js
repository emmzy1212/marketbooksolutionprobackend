import nodemailer from 'nodemailer'
import 'dotenv/config' // Ensures .env variables are loaded

// Fail early if required env vars are missing
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.EMAIL_HOST || !process.env.EMAIL_PORT) {
  throw new Error('❌ Missing required EMAIL_ environment variables.')
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // Set to true if using port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  logger: true,
  debug: true
})

const getFromAddress = () => process.env.EMAIL_FROM || `"Marketbook Solution" <${process.env.EMAIL_USER}>`

export const sendConfirmationEmail = async (email, token) => {
  const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email/${token}`

  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: 'Confirm Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Welcome to Marketbook Solution!</h2>
        <p>Thank you for registering with us. Please click the button below to confirm your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Confirm Email Address
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${confirmUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't create an account with us, please ignore this email.
        </p>
      </div>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('📧 Confirmation email sent to:', email)
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error)
    throw new Error('Failed to send confirmation email')
  }
}

export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`

  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('📧 Password reset email sent to:', email)
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    throw new Error('Failed to send password reset email')
  }
}

export const sendInvoiceEmail = async (email, invoiceData, pdfBuffer) => {
  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: `Invoice ${invoiceData.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Invoice from Marketbook Solution</h2>
        <p>Dear ${invoiceData.customerName},</p>
        <p>Please find attached your invoice for the recent transaction.</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3>Invoice Details:</h3>
          <p><strong>Invoice Number:</strong> ${invoiceData.invoiceNumber}</p>
          <p><strong>Item:</strong> ${invoiceData.itemName}</p>
          <p><strong>Amount:</strong> $${invoiceData.amount}</p>
          <p><strong>Status:</strong> ${invoiceData.status}</p>
        </div>
        ${invoiceData.status === 'unpaid' ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/invoice/pay/${invoiceData.invoiceNumber}" style="background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Mark as Paid
            </a>
          </div>
        ` : ''}
        <p>Thank you for your business!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Marketbook Solution - Professional Marketplace Management
        </p>
      </div>
    `,
    attachments: pdfBuffer ? [{
      filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
      content: pdfBuffer
    }] : []
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('📧 Invoice email sent to:', email)
  } catch (error) {
    console.error('❌ Error sending invoice email:', error)
    throw new Error('Failed to send invoice email')
  }
}

export const sendNotificationEmail = async (email, subject, message) => {
  const mailOptions = {
    from: getFromAddress(),
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Marketbook Solution</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          ${message}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          Marketbook Solution - Professional Marketplace Management
        </p>
      </div>
    `
  }

  try {
    await transporter.sendMail(mailOptions)
    console.log('📧 Notification email sent to:', email)
  } catch (error) {
    console.error('❌ Error sending notification email:', error)
    throw new Error('Failed to send notification email')
  }
}
