#!/usr/bin/env node

/**
 * Firebase User Listing Script
 * Lists all users from Firebase Authentication and Firestore
 */

const { initializeApp } = require('firebase/app');
const { getAuth, listUsers } = require('firebase-admin/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const admin = require('firebase-admin');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdWuwH2BAz9nSWVLXyC2uE8qoxl5QU3lY",
  authDomain: "greybrainer.firebaseapp.com",
  projectId: "greybrainer",
  storageBucket: "greybrainer.firebasestorage.app",
  messagingSenderId: "334602682761",
  appId: "1:334602682761:web:a8cc82bd81a753a3392158",
  measurementId: "G-BQ36BCQTTX"
};

async function listAllUsers() {
  try {
    console.log('🔥 FIREBASE USER LISTING REPORT');
    console.log('=====================================');
    console.log(`📅 Generated: ${new Date().toLocaleString()}`);
    console.log('');

    // Initialize Firebase Admin (requires service account key)
    // Note: This requires Firebase Admin SDK setup with service account
    
    // For now, let's use the client SDK to get Firestore data
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('📊 FIRESTORE USER DATA');
    console.log('======================');
    
    // Get users from Firestore 'users' collection
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      
      if (usersSnapshot.empty) {
        console.log('❌ No users found in Firestore users collection');
      } else {
        console.log(`✅ Found ${usersSnapshot.size} users in Firestore:`);
        console.log('');
        
        usersSnapshot.forEach((doc, index) => {
          const userData = doc.data();
          console.log(`${index + 1}. USER ID: ${doc.id}`);
          console.log(`   📧 Email: ${userData.email || 'N/A'}`);
          console.log(`   👤 Name: ${userData.displayName || 'N/A'}`);
          console.log(`   🎭 Role: ${userData.role || 'N/A'}`);
          console.log(`   🏢 Department: ${userData.department || 'N/A'}`);
          console.log(`   📅 Created: ${userData.createdAt ? new Date(userData.createdAt.seconds * 1000).toLocaleString() : 'N/A'}`);
          console.log(`   🕐 Last Login: ${userData.lastLogin ? new Date(userData.lastLogin.seconds * 1000).toLocaleString() : 'N/A'}`);
          console.log(`   ✅ Active: ${userData.isActive ? 'Yes' : 'No'}`);
          console.log(`   🔑 Permissions: ${userData.permissions ? userData.permissions.join(', ') : 'N/A'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ Error fetching users from Firestore:', error.message);
    }
    
    console.log('📋 WHITELIST DATA');
    console.log('=================');
    
    // Get whitelist from Firestore
    try {
      const whitelistCollection = collection(db, 'whitelist');
      const whitelistSnapshot = await getDocs(whitelistCollection);
      
      if (whitelistSnapshot.empty) {
        console.log('❌ No users found in whitelist collection');
      } else {
        console.log(`✅ Found ${whitelistSnapshot.size} whitelisted users:`);
        console.log('');
        
        whitelistSnapshot.forEach((doc, index) => {
          const whitelistData = doc.data();
          console.log(`${index + 1}. EMAIL: ${doc.id}`);
          console.log(`   🎭 Role: ${whitelistData.role || 'N/A'}`);
          console.log(`   ✅ Active: ${whitelistData.isActive ? 'Yes' : 'No'}`);
          console.log(`   👤 Name: ${whitelistData.name || 'N/A'}`);
          console.log(`   🏢 Department: ${whitelistData.department || 'N/A'}`);
          console.log(`   👨‍💼 Added By: ${whitelistData.addedBy || 'N/A'}`);
          console.log(`   📅 Added At: ${whitelistData.addedAt ? new Date(whitelistData.addedAt.seconds * 1000).toLocaleString() : 'N/A'}`);
          console.log(`   📊 Status: ${whitelistData.status || 'N/A'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ Error fetching whitelist from Firestore:', error.message);
    }
    
    console.log('📈 SUBSCRIBERS DATA');
    console.log('===================');
    
    // Get subscribers from Firestore
    try {
      const subscribersCollection = collection(db, 'subscribers');
      const subscribersSnapshot = await getDocs(subscribersCollection);
      
      if (subscribersSnapshot.empty) {
        console.log('❌ No subscribers found');
      } else {
        console.log(`✅ Found ${subscribersSnapshot.size} subscribers:`);
        console.log('');
        
        subscribersSnapshot.forEach((doc, index) => {
          const subscriberData = doc.data();
          console.log(`${index + 1}. EMAIL: ${doc.id}`);
          console.log(`   ✅ Active: ${subscriberData.isActive ? 'Yes' : 'No'}`);
          console.log(`   📧 Verified: ${subscriberData.emailVerified ? 'Yes' : 'No'}`);
          console.log(`   📅 Subscribed: ${subscriberData.subscribedAt ? new Date(subscriberData.subscribedAt.seconds * 1000).toLocaleString() : 'N/A'}`);
          console.log(`   🎯 Preferences: ${subscriberData.preferences ? subscriberData.preferences.join(', ') : 'N/A'}`);
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ Error fetching subscribers from Firestore:', error.message);
    }
    
    console.log('📊 SUMMARY');
    console.log('==========');
    console.log('✅ User listing complete!');
    console.log('');
    console.log('📝 NOTE: To get Firebase Authentication users, you need:');
    console.log('   1. Firebase Admin SDK service account key');
    console.log('   2. Admin privileges on the Firebase project');
    console.log('   3. Run: firebase auth:export users.json --project greybrainer');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
}

// Run the script
listAllUsers().catch(console.error);