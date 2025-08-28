# Test Users Setup Guide

This guide explains how to set up hardcoded test users for early testing of the Greybrainer AI application.

## Quick Setup (Manual - Firebase Console)

### Step 1: Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/project/greybrainer)
2. Navigate to **Authentication** > **Users**

### Step 2: Add Test Users
Click "Add user" for each of the following test accounts:

| Email | Password | Name | Role | Department |
|-------|----------|------|------|------------|
| test1@greybrainer.ai | TestPass123! | Alice Johnson | tester | Product Testing |
| test2@greybrainer.ai | TestPass123! | Bob Smith | tester | QA Engineering |
| test3@greybrainer.ai | TestPass123! | Carol Davis | tester | User Experience |
| test4@greybrainer.ai | TestPass123! | David Wilson | tester | Content Review |
| test5@greybrainer.ai | TestPass123! | Emma Brown | tester | Film Analysis |
| test6@greybrainer.ai | TestPass123! | Frank Miller | **admin** | Administration |
| test7@greybrainer.ai | TestPass123! | Grace Lee | tester | Creative Testing |
| test8@greybrainer.ai | TestPass123! | Henry Taylor | tester | Technical Review |
| test9@greybrainer.ai | TestPass123! | Ivy Chen | tester | Performance Testing |
| test10@greybrainer.ai | TestPass123! | Jack Anderson | tester | Integration Testing |

## Automated Setup (Recommended for Bulk Operations)

### Prerequisites
1. **Install Firebase Admin SDK**:
   ```bash
   npm install firebase-admin
   ```

2. **Download Service Account Key**:
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save the downloaded JSON file as `scripts/serviceAccountKey.json`

### Usage

#### Add All Test Users
```bash
node scripts/addTestUsers.js add
```

#### Remove All Test Users (Cleanup)
```bash
node scripts/addTestUsers.js remove
```

#### View Help
```bash
node scripts/addTestUsers.js
```

## Test User Details

### Standard Test Users (IDs 1-5, 7-10)
- **Role**: `tester`
- **Password**: `TestPass123!`
- **Purpose**: General application testing
- **Permissions**: Standard user access

### Admin Test User (ID 6)
- **Email**: `test6@greybrainer.ai`
- **Role**: `admin`
- **Password**: `TestPass123!`
- **Purpose**: Testing admin features and user management
- **Permissions**: Administrative access

## Testing Scenarios

### 1. Authentication Flow Testing
- Test login with valid credentials
- Test login with invalid credentials
- Test logout functionality
- Test session persistence

### 2. BYOK (Bring Your Own Key) Testing
- Test Gemini API key prompt
- Test Google Search API key prompt
- Test key validation
- Test key storage and retrieval

### 3. Feature Access Testing
- Test movie analysis features
- Test creative spark generator
- Test script magic quotient analyzer
- Test admin-only features (with test6@greybrainer.ai)

### 4. Multi-User Testing
- Test concurrent user sessions
- Test user-specific data isolation
- Test role-based access control

## Security Notes

⚠️ **Important Security Considerations**:

1. **Change Passwords**: These are temporary test passwords. Change them before production.
2. **Remove Test Users**: Delete all test users before going live.
3. **Secure Service Account**: Keep the `serviceAccountKey.json` file secure and never commit it to version control.
4. **Environment Separation**: Use separate Firebase projects for testing and production.

## Troubleshooting

### Common Issues

1. **"User already exists" error**:
   - Users may have been created previously
   - Use the remove command first, then add again

2. **Service account key not found**:
   - Ensure `serviceAccountKey.json` is in the `scripts/` folder
   - Verify the file is valid JSON

3. **Permission denied**:
   - Check that the service account has the necessary permissions
   - Ensure you're using the correct Firebase project

### Getting Help

If you encounter issues:
1. Check the Firebase Console for error messages
2. Verify your Firebase project configuration
3. Ensure all dependencies are installed
4. Check the console output for detailed error messages

## Files Created

- `testUsers.json` - Contains all test user data
- `scripts/addTestUsers.js` - Automated setup script
- `TEST_USERS_SETUP.md` - This documentation file

## Next Steps

After setting up test users:
1. Test the authentication flow
2. Verify BYOK functionality
3. Test core application features
4. Document any issues found
5. Clean up test users when testing is complete

---

**Happy Testing! 🚀**