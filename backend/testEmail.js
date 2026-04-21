const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("🚀 Script started");

async function sendTestEmail() {
  try {
    console.log("📡 Creating transporter...");

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure:
        process.env.SMTP_SECURE === undefined
          ? Number(process.env.SMTP_PORT) === 465
          : process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
      },
    });

    console.log("🔍 Verifying SMTP connection...");
    await transporter.verify();
    console.log("✅ SMTP connection successful");

    console.log("📤 Sending email...");

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.CONTACT_TO,
      subject: "Test Email from Etera Health Initiative",
      text: "SMTP test working 🎉",
    });

    console.log("📧 Email sent!");
    console.log("Message ID:", info.messageId);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

sendTestEmail();
