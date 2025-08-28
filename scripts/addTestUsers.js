const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load test users data
const testUsersPath = path.join(__dirname, '../testUsers.json');
const testUsersData = JSON.parse(fs.readFileSync(testUsersPath, 'utf8'));

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// and place it in the scripts folder as 'serviceAccountKey.json'
try {
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'greybrainer'
  });
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:');
  console.error('Make sure you have downloaded the service account key from Firebase Console');
  console.error('and saved it as scripts/serviceAccountKey.json');
  console.error('Error details:', error.message);
  process.exit(1);
}

// Function to add a single user
async function addUser(userData) {
  try {
    const userRecord = await admin.auth().createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
      emailVerified: true // Set to true for test users
    });
    
    console.log(`✅ Successfully created user: ${userData.email} (${userData.name})`);
    return userRecord;
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log(`⚠️  User already exists: ${userData.email}`);
    } else {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
    return null;
  }
}

// Function to add all test users
async function addAllTestUsers() {
  console.log('🚀 Starting to add test users to Firebase Authentication...');
  console.log(`📊 Total users to add: ${testUsersData.testUsers.length}`);
  console.log('---');
  
  let successCount = 0;
  let existingCount = 0;
  let errorCount = 0;
  
  for (const userData of testUsersData.testUsers) {
    const result = await addUser(userData);
    if (result) {
      successCount++;
    } else {
      // Check if user already exists
      try {
        await admin.auth().getUserByEmail(userData.email);
        existingCount++;
      } catch {
        errorCount++;
      }
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('---');
  console.log('📈 Summary:');
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`⚠️  Already existed: ${existingCount} users`);
  console.log(`❌ Errors: ${errorCount} users`);
  console.log('🎉 Test user setup complete!');
  
  if (successCount > 0 || existingCount > 0) {
    console.log('\n📋 Test User Credentials:');
    testUsersData.testUsers.forEach(user => {
      console.log(`   ${user.email} | ${user.password} | ${user.name} (${user.role})`);
    });
  }
}

// Function to remove all test users (cleanup)
async function removeAllTestUsers() {
  console.log('🧹 Removing all test users...');
  
  for (const userData of testUsersData.testUsers) {
    try {
      const user = await admin.auth().getUserByEmail(userData.email);
      await admin.auth().deleteUser(user.uid);
      console.log(`🗑️  Removed user: ${userData.email}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️  User not found: ${userData.email}`);
      } else {
        console.error(`❌ Error removing user ${userData.email}:`, error.message);
      }
    }
  }
  
  console.log('🎉 Cleanup complete!');
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'add':
    addAllTestUsers().then(() => process.exit(0)).catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
    break;
    
  case 'remove':
    removeAllTestUsers().then(() => process.exit(0)).catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
    break;
    
  default:
    console.log('🔧 Firebase Test Users Management Script');
    console.log('\nUsage:');
    console.log('  node scripts/addTestUsers.js add     - Add all test users');
    console.log('  node scripts/addTestUsers.js remove  - Remove all test users');
    console.log('\n📋 Setup Instructions:');
    console.log('1. Go to Firebase Console > Project Settings > Service Accounts');
    console.log('2. Click "Generate new private key"');
    console.log('3. Save the downloaded file as scripts/serviceAccountKey.json');
    console.log('4. Run: npm install firebase-admin');
    console.log('5. Run: node scripts/addTestUsers.js add');
    break;
}