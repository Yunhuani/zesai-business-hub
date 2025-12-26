import { loginUserWithEmail } from './server/passwordAuth';
import jwt from 'jsonwebtoken';
import { ENV } from './server/_core/env';
import { getUserByOpenId } from './server/db';

async function testFullAuthFlow() {
  console.log('🧪 Complete Auth Flow Test for 37593301@qq.com\n');
  
  try {
    // Step 1: Simulate login
    console.log('Step 1: Login user...');
    const loginResult = await loginUserWithEmail('37593301@qq.com', '123456');
    
    if (!loginResult || !loginResult.token) {
      console.log('❌ Login failed: no token returned');
      return;
    }
    
    console.log('✅ Login successful');
    console.log('   User ID:', loginResult.user.id);
    console.log('   OpenID:', loginResult.user.openId);
    console.log('   Token:', loginResult.token.substring(0, 50) + '...');
    
    // Step 2: Verify token
    console.log('\nStep 2: Verify token...');
    const decoded = jwt.verify(loginResult.token, ENV.jwtSecret) as any;
    console.log('✅ Token verified');
    console.log('   Decoded userId:', decoded.userId);
    console.log('   Decoded openId:', decoded.openId);
    
    // Step 3: Simulate backend authentication (what happens when user sends message)
    console.log('\nStep 3: Simulate backend auth (message.send)...');
    const user = await getUserByOpenId(decoded.openId);
    
    if (!user) {
      console.log('❌ getUserByOpenId failed: user not found');
      return;
    }
    
    console.log('✅ Backend auth successful');
    console.log('   Found user:', user.email);
    
    console.log('\n✅✅✅ COMPLETE AUTH FLOW WORKS CORRECTLY ✅✅✅');
    console.log('\nConclusion: Backend auth logic is correct.');
    console.log('Problem must be in frontend token handling or network request.');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testFullAuthFlow();
