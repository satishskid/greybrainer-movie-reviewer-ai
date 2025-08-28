# 🚀 Netlify Deployment Guide for Greybrainer AI Movie Reviewer

## 📦 Quick Deploy Options

### Option 1: Drag & Drop (Easiest)
1. Run `npm run build` locally
2. Drag the `dist/` folder to [Netlify Drop](https://app.netlify.com/drop)
3. Configure environment variables (see below)

### Option 2: Git Integration (Recommended)
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect repository to Netlify
3. Netlify will auto-deploy using `netlify.toml` configuration

## 🔑 Environment Variables Setup

**Note**: This application now uses a Bring Your Own Key (BYOK) system. API keys are managed through the application interface rather than environment variables.

For legacy deployments that still require environment variables:
```
VITE_API_KEY = your_gemini_api_key_here
```

### 🔑 API Key Sources:
- **Gemini**: ✅ Working (Google AI Studio) - Managed through BYOK system

## 📋 Deployment Checklist

### ✅ Pre-Deployment
- [ ] All API keys configured in `.env` (for local testing)
- [ ] `npm run build` completes successfully
- [ ] `npm run preview` works locally
- [ ] Gemini API tested through application interface

### ✅ Netlify Configuration
- [ ] `netlify.toml` file present in root directory
- [ ] Environment variables set in Netlify dashboard
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Node.js version: 18

### ✅ Post-Deployment
- [ ] Site loads without errors
- [ ] Gemini API functionality works through BYOK system
- [ ] Movie analysis functionality works
- [ ] Firebase authentication works (if using)

## 🔧 Build Configuration

The `netlify.toml` file includes:
- **Build Settings**: Automatic builds from `dist/` directory
- **SPA Routing**: Redirects for single-page application
- **Security Headers**: XSS protection, content type options
- **Caching**: Optimized cache headers for performance

## 🌐 API Endpoints

The application uses these external APIs:
- **Gemini AI**: `https://generativelanguage.googleapis.com/` (via BYOK system)
- **Firebase**: `https://greybrainer.firebaseapp.com`

## 🚨 Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Verify all dependencies in `package.json`
- Check for TypeScript errors: `npm run lint`

### APIs Not Working
- Verify environment variables in Netlify dashboard
- Check API key validity
- Test API functionality through the application interface

### Performance Issues
- Enable Netlify's asset optimization
- Consider implementing code splitting for large bundles
- Monitor bundle size (currently ~714KB)

## 📊 Expected Performance
- **Bundle Size**: ~714KB JS, ~37KB CSS
- **Load Time**: < 3 seconds on fast connections
- **Lighthouse Score**: 90+ (with optimizations)

## 🔒 Security Notes
- API keys are exposed in client-side code (normal for frontend apps)
- Consider implementing rate limiting on your API usage
- Monitor API usage to prevent unexpected charges

## 📞 Support
If you encounter issues:
1. Check the browser console for errors
2. Verify API status with the built-in checker
3. Review Netlify build logs
4. Test locally with `npm run preview`
