# 🔧 FIREBASE DOMAIN AUTHORIZATION FIX

## 🚨 Issue Identified
Firebase authentication is failing because `greybrainer.netlify.app` is not in the authorized domains list.

## ✅ Quick Fix Steps

### **Step 1: Add Netlify Domain to Firebase**
1. Go to [Firebase Console](https://console.firebase.google.com/project/greybrainer)
2. Navigate to **Authentication** → **Settings** → **Authorized domains**
3. Click **Add domain**
4. Add: `greybrainer.netlify.app`
5. Click **Done**

### **Step 2: Also Add (if needed)**
- `localhost` (for local development)
- `127.0.0.1` (for local development)
- Any custom domains you plan to use

## 🔧 Alternative: Firebase CLI Method
```bash
# This would require Firebase Admin SDK, but console method is easier
firebase projects:list
firebase use greybrainer
# Then use console for domain management
```

## ✅ Expected Result
After adding the domain, the Firebase authentication error will be resolved and users can sign in with Google OAuth.

## 🎯 Current Authorized Domains Should Include:
- `localhost` (for development)
- `greybrainer.netlify.app` (for production)
- `greybrainer.firebaseapp.com` (default Firebase domain)

---

**This is a one-time setup that takes 30 seconds in the Firebase console!**