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

In your Netlify dashboard, go to **Site Settings > Environment Variables** and add:

```
VITE_API_KEY = your_gemini_api_key_here
VITE_GROQ_API_KEY = your_groq_api_key_here
```

### 🔑 API Key Sources:
- **Gemini**: ✅ Working (Google AI Studio)
- **Groq**: ✅ Working (console.groq.com)

## 📋 Deployment Checklist

### ✅ Pre-Deployment
- [ ] All API keys configured in `.env` (for local testing)
- [ ] `npm run build` completes successfully
- [ ] `npm run preview` works locally
- [ ] All APIs tested with ApiStatusChecker component

### ✅ Netlify Configuration
- [ ] `netlify.toml` file present in root directory
- [ ] Environment variables set in Netlify dashboard
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Node.js version: 18

### ✅ Post-Deployment
- [ ] Site loads without errors
- [ ] API Status Checker shows all APIs working
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
- **Gemini AI**: `https://generativelanguage.googleapis.com/`
- **Groq**: `https://api.groq.com/openai/v1/chat/completions`
- **Firebase**: `https://greybrainer.firebaseapp.com`

## 🚨 Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Verify all dependencies in `package.json`
- Check for TypeScript errors: `npm run lint`

### APIs Not Working
- Verify environment variables in Netlify dashboard
- Check API key validity
- Use the built-in API Status Checker component

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
