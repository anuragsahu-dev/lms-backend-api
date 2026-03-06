import nodemailer from "nodemailer";

async function sendEmail({ to, subject, html }) {

  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // e.g. smtp.gmail.com
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === "465", // true only for port 465, false for all others
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `"LMS Project" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  }

  await transporter.sendMail(mailOptions)
}

export default sendEmail
