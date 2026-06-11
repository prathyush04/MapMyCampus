require('dotenv').config({ path: './render.env' });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log('Testing SMTP connection for:', process.env.SMTP_USER);

transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ Connection or Authentication Failed:');
    console.error(error);
  } else {
    console.log('✅ Server is ready to take our messages');
  }
});
