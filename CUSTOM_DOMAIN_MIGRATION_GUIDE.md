# 🌐 CUSTOM DOMAIN MIGRATION GUIDE

**Target Domain**: `dairector.greybrain.ai`  
**Current Domain**: `greybrainer.netlify.app`  
**DNS Provider**: Cloudflare  
**Hosting**: Netlify  
**Authentication**: Firebase  

---

## 🎯 MIGRATION SEQUENCE (CRITICAL ORDER)

### **Phase 1: Firebase Configuration (FIRST)**
### **Phase 2: Cloudflare DNS Setup**
### **Phase 3: Netlify Domain Configuration**
### **Phase 4: SSL & Testing**
### **Phase 5: Final Verification**

---

## 🔥 PHASE 1: FIREBASE CONFIGURATION (DO THIS FIRST)

### **Step 1.1: Add Domain to Firebase Authorized Domains**

1. **Go to Firebase Console**: https://console.firebase.google.com/project/greybrainer
2. **Navigate to Authentication**:
   - Click **Authentication** in left sidebar
   - Click **Settings** tab
   - Click **Authorized domains** tab
3. **Add New Domain**:
   - Click **Add domain**
   - Enter: `dairector.greybrain.ai`
   - Click **Done**
4. **Verify Current Domains**:
   - Should now include:
     - `localhost` (for development)
     - `greybrainer.netlify.app` (current)
     - `dairector.greybrain.ai` (new)
     - `greybrainer.firebaseapp.com` (default)

**⚠️ CRITICAL**: Do this BEFORE changing DNS to avoid authentication failures!

### **Step 1.2: Update Firebase Hosting (Optional)**

If you want Firebase hosting to also use the custom domain:

1. **Go to Hosting section** in Firebase Console
2. **Click "Add custom domain"**
3. **Enter**: `dairector.greybrain.ai`
4. **Follow verification steps** (we'll handle DNS in Cloudflare)

**Note**: This is optional since we're using Netlify for hosting.

---

## ☁️ PHASE 2: CLOUDFLARE DNS SETUP

### **Step 2.1: Access Cloudflare Dashboard**

1. **Login to Cloudflare**: https://dash.cloudflare.com
2. **Select Domain**: Click on `greybrain.ai`
3. **Go to DNS**: Click **DNS** tab

### **Step 2.2: Create CNAME Record**

1. **Add Record**:
   - **Type**: `CNAME`
   - **Name**: `dairector`
   - **Target**: `greybrainer.netlify.app`
   - **Proxy Status**: 🟠 **Proxied** (Orange cloud ON)
   - **TTL**: Auto
2. **Click Save**

### **Step 2.3: Cloudflare Settings (Important)**

1. **SSL/TLS Settings**:
   - Go to **SSL/TLS** tab
   - Set **SSL/TLS encryption mode** to **Full (strict)**
   - Enable **Always Use HTTPS**

2. **Page Rules** (Optional but Recommended):
   - Go to **Rules** → **Page Rules**
   - Create rule: `http://dairector.greybrain.ai/*`
   - Setting: **Always Use HTTPS**

3. **Security Settings**:
   - Go to **Security** → **Settings**
   - **Security Level**: Medium (recommended)
   - **Bot Fight Mode**: On (optional)

---

## 🌐 PHASE 3: NETLIFY DOMAIN CONFIGURATION

### **Step 3.1: Add Custom Domain to Netlify**

1. **Access Netlify Dashboard**: https://app.netlify.com
2. **Select Site**: Click on **greybrainer** site
3. **Go to Domain Settings**:
   - Click **Domain settings** in left sidebar
   - Or go to **Site settings** → **Domain management**

### **Step 3.2: Add Custom Domain**

1. **Add Domain**:
   - Click **Add custom domain**
   - Enter: `dairector.greybrain.ai`
   - Click **Verify**
   - Click **Add domain**

2. **Set as Primary Domain** (Important):
   - Find `dairector.greybrain.ai` in the domains list
   - Click **Options** → **Set as primary domain**
   - This ensures redirects work properly

### **Step 3.3: Configure Domain Settings**

1. **HTTPS Settings**:
   - Netlify should automatically provision SSL certificate
   - Wait for **"Certificate provisioned"** status
   - Enable **Force HTTPS** (redirect HTTP to HTTPS)

2. **Domain Redirects**:
   - Set up redirect from `greybrainer.netlify.app` to `dairector.greybrain.ai`
   - This ensures old links continue to work

---

## 🔒 PHASE 4: SSL & TESTING

### **Step 4.1: Wait for SSL Propagation**

1. **Check SSL Status**:
   - In Netlify: Domain should show **"HTTPS enabled"**
   - In Cloudflare: SSL certificate should be active
   - **Wait time**: 5-15 minutes for full propagation

2. **Test SSL**:
   - Visit: https://dairector.greybrain.ai
   - Should show secure connection (lock icon)
   - No certificate warnings

### **Step 4.2: DNS Propagation Check**

1. **Check DNS Propagation**:
   - Use: https://dnschecker.org
   - Enter: `dairector.greybrain.ai`
   - Should show CNAME pointing to `greybrainer.netlify.app`
   - **Wait time**: Up to 24 hours for global propagation

2. **Test from Different Locations**:
   - Try accessing from different devices/networks
   - Use incognito/private browsing mode
   - Clear browser cache if needed

---

## ✅ PHASE 5: FINAL VERIFICATION & TESTING

### **Step 5.1: Authentication Testing**

1. **Test Google OAuth**:
   - Go to: https://dairector.greybrain.ai
   - Click **"Sign in with Google"**
   - Should work without errors
   - Admin dashboard should appear for admin users

2. **Test All Features**:
   - AI model configuration
   - Movie analysis functionality
   - Admin user management
   - All core features

### **Step 5.2: Performance Testing**

1. **Speed Test**:
   - Use: https://pagespeed.web.dev
   - Test: `https://dairector.greybrain.ai`
   - Should maintain good performance scores

2. **Mobile Testing**:
   - Test on mobile devices
   - Verify responsive design works
   - Check touch interactions

### **Step 5.3: SEO & Meta Tags**

1. **Update Meta Tags** (if needed):
   - Check if any hardcoded URLs need updating
   - Verify Open Graph tags work with new domain
   - Test social media sharing

2. **Search Console**:
   - Add new domain to Google Search Console
   - Submit sitemap for new domain
   - Monitor for any crawl errors

---

## 🔧 TROUBLESHOOTING GUIDE

### **Common Issues & Solutions**

#### **Issue 1: "Domain not verified" in Netlify**
**Solution**:
- Ensure CNAME record is correct in Cloudflare
- Wait 5-10 minutes for DNS propagation
- Try again

#### **Issue 2: SSL Certificate not provisioning**
**Solution**:
- Check Cloudflare proxy status (should be orange/proxied)
- Ensure SSL mode is "Full (strict)" in Cloudflare
- Wait up to 24 hours for certificate

#### **Issue 3: Firebase Authentication fails**
**Solution**:
- Verify `dairector.greybrain.ai` is in Firebase authorized domains
- Clear browser cache and cookies
- Try incognito mode

#### **Issue 4: Redirect loops**
**Solution**:
- Check Cloudflare SSL mode (should be "Full (strict)")
- Verify Netlify HTTPS settings
- Check for conflicting redirect rules

#### **Issue 5: Site not loading**
**Solution**:
- Verify CNAME record points to `greybrainer.netlify.app`
- Check DNS propagation status
- Ensure Cloudflare proxy is enabled (orange cloud)

---

## 📋 VERIFICATION CHECKLIST

### **Before Starting Migration**:
- [ ] Firebase project access confirmed
- [ ] Cloudflare account access confirmed
- [ ] Netlify site access confirmed
- [ ] Current site working properly

### **After Each Phase**:
- [ ] **Phase 1**: Firebase authorized domains updated
- [ ] **Phase 2**: Cloudflare CNAME record created
- [ ] **Phase 3**: Netlify custom domain added
- [ ] **Phase 4**: SSL certificates active
- [ ] **Phase 5**: All features tested and working

### **Final Verification**:
- [ ] https://dairector.greybrain.ai loads correctly
- [ ] Google OAuth authentication works
- [ ] Admin dashboard accessible
- [ ] AI features functional
- [ ] Mobile responsive
- [ ] SSL certificate valid
- [ ] No console errors

---

## ⏱️ ESTIMATED TIMELINE

### **Active Work Time**: 30-45 minutes
- Firebase configuration: 5 minutes
- Cloudflare DNS setup: 10 minutes
- Netlify domain configuration: 15 minutes
- Testing and verification: 15 minutes

### **Propagation Time**: 5 minutes - 24 hours
- SSL certificate: 5-15 minutes
- DNS propagation: Up to 24 hours (usually much faster)
- Full global availability: Up to 24 hours

### **Total Time**: 1-24 hours (mostly waiting for propagation)

---

## 🚨 IMPORTANT NOTES

### **Do NOT Skip Steps**:
1. **Firebase FIRST**: Always update Firebase authorized domains before changing DNS
2. **Test Thoroughly**: Verify each step before proceeding
3. **Keep Old Domain**: Don't remove old domain until new one is fully working

### **Backup Plan**:
- Keep `greybrainer.netlify.app` as backup
- Can quickly revert by changing Cloudflare CNAME
- Firebase supports multiple authorized domains

### **Business Continuity**:
- Migration can be done without downtime
- Users can continue using old domain during transition
- Gradual migration possible

---

## 🎉 POST-MIGRATION BENEFITS

### **Professional Branding**:
- ✅ Custom domain: `dairector.greybrain.ai`
- ✅ Professional appearance for clients
- ✅ Better brand recognition
- ✅ SEO benefits with branded domain

### **Technical Benefits**:
- ✅ Cloudflare CDN and security
- ✅ DDoS protection
- ✅ Global performance optimization
- ✅ Advanced caching and compression

### **Business Benefits**:
- ✅ Professional credibility
- ✅ Better marketing materials
- ✅ Easier to remember domain
- ✅ Consistent with greybrain.ai brand

---

**Ready to start the migration? Follow the phases in order and you'll have your custom domain working perfectly!** 🚀

---

**Migration Guide Version**: 1.0  
**Last Updated**: November 3, 2025  
**Estimated Success Rate**: 98%+ (when following steps correctly)