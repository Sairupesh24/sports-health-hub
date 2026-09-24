require('dotenv').config();
console.log('HOST:', process.env.SMTP_HOST);
console.log('PORT:', process.env.SMTP_PORT);
console.log('USER length:', process.env.SMTP_USER ? process.env.SMTP_USER.length : 0);
console.log('USER starts:', process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 40) : 'N/A');
console.log('PASS length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
console.log('FROM:', process.env.SMTP_FROM);
