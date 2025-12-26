import jwt from 'jsonwebtoken';
import { ENV } from './server/_core/env';

const testUser = {
  userId: 11640001,
  openId: 'email_37593301@qq.com'
};

console.log('🔑 Testing JWT Token Generation...\n');
console.log('User data:', testUser);
console.log('JWT Secret length:', ENV.jwtSecret.length);

// Generate token
const token = jwt.sign(testUser, ENV.jwtSecret, { expiresIn: '30d' });
console.log('\n✅ Generated Token:', token);
console.log('Token length:', token.length);

// Verify token
try {
  const decoded = jwt.verify(token, ENV.jwtSecret);
  console.log('\n✅ Token Verified Successfully:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (error) {
  console.log('\n❌ Token Verification Failed:', error);
}
