# Greybrainer AI Movie Reviewer - Authentication User Manual

## Overview

The Greybrainer AI Movie Reviewer application now uses a hardcoded authentication system with predefined test users. This system provides secure access to the movie analysis platform without requiring external authentication services.

## Test User Accounts

The application includes 10 predefined test user accounts:

### Standard Users (Testers)

| Email | Password | Name | Role | Department |
|-------|----------|------|------|------------|
| test1@greybrainer.ai | TestPass123! | Alice Johnson | Tester | Quality Assurance |
| test2@greybrainer.ai | TestPass123! | Bob Smith | Tester | Development |
| test3@greybrainer.ai | TestPass123! | Carol Davis | Tester | Product Management |
| test4@greybrainer.ai | TestPass123! | David Wilson | Tester | Marketing |
| test5@greybrainer.ai | TestPass123! | Eva Brown | Tester | Design |
| test6@greybrainer.ai | TestPass123! | Frank Miller | Tester | Analytics |
| test7@greybrainer.ai | TestPass123! | Grace Lee | Tester | Content |
| test8@greybrainer.ai | TestPass123! | Henry Taylor | Tester | Research |
| test9@greybrainer.ai | TestPass123! | Ivy Chen | Tester | Operations |

### Administrator User

| Email | Password | Name | Role | Department |
|-------|----------|------|------|------------|
| admin@greybrainer.ai | TestPass123! | Admin User | Admin | Administration |

## How to Login

1. **Access the Application**
   - Open your web browser
   - Navigate to the application URL (locally: `http://localhost:6734/`)

2. **Enter Credentials**
   - Email: Use any of the test emails listed above
   - Password: `TestPass123!` (same for all users)

3. **Sign In**
   - Click the "Sign In" button
   - You'll be automatically redirected to the main application

## User Roles and Permissions

### Standard Users (Testers)
- Access to all movie analysis features
- Can generate movie reviews and insights
- Can use AI-powered analysis tools
- Cannot access administrative functions

### Administrator
- All standard user permissions
- Access to administrative features
- Can manage system settings
- Has elevated privileges for system management

## Features Available After Login

### Movie Analysis Tools
- **AI Movie Reviewer**: Generate comprehensive movie analysis
- **Story Structure Analysis**: Analyze narrative patterns
- **Character Development Insights**: Deep character analysis
- **Thematic Analysis**: Explore movie themes and meanings
- **Visual Storytelling Assessment**: Analyze cinematography and visual elements

### Advanced Features
- **Greybrainer Insights**: Advanced AI-powered movie intelligence
- **Creative Spark Generator**: Generate creative ideas and concepts
- **Story Mind Map**: Visual story structure mapping
- **Morphokinetics Display**: Advanced narrative flow analysis
- **Vonnegut Story Shape Visualization**: Story arc visualization

### API Integration
- **Gemini AI**: Google's advanced AI for movie analysis
- **Brave Search**: Enhanced search capabilities
- **Google Search**: Additional search functionality

## Testing the Authentication System

### Manual Testing
1. Try logging in with each test user account
2. Verify that user information displays correctly
3. Test logout functionality
4. Confirm session persistence

### Automated Testing
A comprehensive test suite is available at `/test-auth.html`:
1. Navigate to `http://localhost:6734/test-auth.html`
2. Click "Test All Users" to run automated tests
3. Review results for each user account
4. Check for any authentication errors

## Security Features

### Password Requirements
- All test accounts use the secure password: `TestPass123!`
- Password includes uppercase, lowercase, numbers, and special characters
- Meets standard security complexity requirements

### Session Management
- Secure session handling
- Automatic logout on browser close
- Session persistence during active use

### Error Handling
- Clear error messages for invalid credentials
- Graceful handling of authentication failures
- User-friendly feedback for login issues

## Troubleshooting

### Common Issues

**Login Failed**
- Verify email address is exactly as listed (case-sensitive)
- Ensure password is `TestPass123!` (case-sensitive)
- Check for extra spaces in email or password fields

**Session Expired**
- Simply log in again with the same credentials
- Sessions are maintained during active use

**Access Denied**
- Ensure you're using a valid test account
- Contact administrator if issues persist

### Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development and Deployment

### Local Development
```bash
# Start development server
npm run dev

# Access application
http://localhost:6734/

# Access test suite
http://localhost:6734/test-auth.html
```

### Production Deployment
- Application is deployed on Netlify
- Authentication system works in production environment
- All test users are available in production

## API Keys and Configuration

The application requires several API keys for full functionality:

1. **Gemini API Key**: For AI movie analysis
2. **Google Search API Key**: For search capabilities

These keys are managed through the application's key management system and are required for optimal performance.

### API Error Handling

**When API Limits Are Reached**: The application provides a simple informative message when daily usage limits are exceeded: "Gemini API has daily usage limits. Please try again later."

**Key Management**: When you update your API key, the application will immediately attempt to use the new key for subsequent requests.

## Support and Contact

For technical support or questions about the authentication system:
- Check the troubleshooting section above
- Review the automated test results
- Contact the development team for additional assistance

## Version History

- **v2.0**: Transitioned from Firebase to hardcoded authentication
- **v1.0**: Initial Firebase-based authentication system

---

*This manual covers the hardcoded authentication system implemented for the Greybrainer AI Movie Reviewer application. All test accounts are ready for immediate use with the provided credentials.*