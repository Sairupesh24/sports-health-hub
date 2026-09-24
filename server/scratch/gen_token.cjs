const jwt = require('jsonwebtoken');
const token = jwt.sign(
  {
    id: '527f7a61-225d-4717-8b25-4741d195803c',
    email: 'abhi79111@gmail.com',
    role: 'admin',
    is_approved: true,
    organization_id: 'db204aab-4b8b-4dd2-a842-bc9f67002693'
  },
  'your_super_secret_jwt_string_change_in_production',
  { expiresIn: '1h' }
);
console.log(token);
