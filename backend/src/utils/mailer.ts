// backend/src/utils/mailer.ts
import nodemailer from 'nodemailer';

// Update the parameters to accept (to, subject, htmlContent)
export const sendAuthEmail = async (to: string, subject: string, htmlContent: string) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
      }
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from: `"Legendary Support" <${process.env.EMAIL_USER}>`,
      to,
      subject: subject, // This handles the "Reset Your..." subject
      html: htmlContent // This handles the "emailHtml" button
    });


    console.log("✅ Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error("Email sending failed");
  }
};