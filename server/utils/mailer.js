const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  ...(process.env.SMTP_USER ? {
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }
  } : {}),
});

exports.sendOtp = async (to, otp) => {
  await transporter.sendMail({
    from: `"MapMyCampus" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your MapMyCampus verification code',
    text: `Your OTP is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2>Verify your email</h2>
        <p>Use the code below to complete your registration:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f3f4f6;border-radius:8px">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:12px;margin-top:16px">Expires in 10 minutes. Do not share this code.</p>
      </div>
    `,
  });
};
