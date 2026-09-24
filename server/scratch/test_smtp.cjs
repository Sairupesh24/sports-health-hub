require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP CONNECTION ERROR:', error.message);
    console.error('Full error:', error.code, error.response);
  } else {
    console.log('✓ SMTP OK - Server is ready to send messages');
    // Now send a test email
    transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@ishpo.com',
      to: 'abhi79111@gmail.com',
      subject: 'SMTP Test - Session Reminder Service',
      html: '<h1>SMTP Test</h1><p>The OCI Email Delivery service is working correctly for session reminders.</p>',
    }, function(err, info) {
      if (err) {
        console.error('SEND ERROR:', err.message);
      } else {
        console.log('✓ Test email sent! Message ID:', info.messageId);
        console.log('Response:', info.response);
      }
    });
  }
});
