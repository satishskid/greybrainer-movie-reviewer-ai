# 👨‍💼 ADMIN WORKFLOW GUIDE

## 🔑 **Step-by-Step Admin Process**

### **1. Login as Admin**
- **URL**: Your main Greybrainer app
- **Email**: `test6@greybrainer.ai`
- **Password**: `TestPass123!`
- **User**: Frank Miller (Admin)

### **2. Access Admin Panel**
- After login, scroll to the bottom of the main app
- You'll see "Admin Panel" section (only visible to admin users)
- Click "Show Admin Panel" button

### **3. Add Whitelisted Users**
- Click "Add User" button in the User Whitelist Management section
- Fill in the form:
  - **Email**: The user's email address (they'll use this to login)
  - **Full Name**: Their display name
  - **Role**: Choose from Tester, Analyst, Reviewer, Admin
  - **Department**: Their department/team
- Click "Add User"
- User starts with "Pending" status

### **4. Approve Users**
- New users appear in the table with "Pending" status
- Click the ✓ (checkmark) button to approve them to "Active"
- Only "Active" users can access the platform
- You can suspend users with the X button
- You can remove users entirely with the 🗑️ (trash) button

### **5. User Access Flow**
1. You add user email to whitelist
2. User tries to login with that email
3. If whitelisted and "Active" → Access granted
4. If not whitelisted or "Pending/Suspended" → Access denied

---

## 📊 **Admin Dashboard Features**

### **User Management**
- View all whitelisted users
- See user status (Active, Pending, Suspended)
- Track who added each user and when
- View user statistics

### **Research Management**
- View all published research articles
- Unpublish content if needed
- See view counts and engagement
- Manage categories and tags

---

## 🌐 **Public Landing Page Design**

The new academic landing page (`public-landing.html`) features:

### **Design Philosophy: Academic & Professional**
- Clean, minimalist design
- Academic color scheme (whites, grays, subtle blues)
- Professional typography
- Data-driven presentation
- No "filmy" elements

### **Page Structure:**

#### **1. Header**
- Clean navigation
- Professional logo
- "Access Platform" button for users

#### **2. Hero Section**
- "Academic-Grade Film Analysis" headline
- Professional description
- Call-to-action buttons

#### **3. Analysis Framework Section**
- Three analytical pillars:
  - Narrative Structure
  - Creative Conceptualization  
  - Execution & Performance
- Sample analysis with scores
- Academic methodology descriptions

#### **4. Research & Insights**
- Featured research articles
- Academic categorization
- Publication metrics
- Link to full research portal

#### **5. Current Industry Insights**
- Real-time trend analysis
- Market indicators with data visualization
- Professional charts and metrics

#### **6. Academic Film Rankings**
- Clean, table-based scoreboard
- Filter options (Period, Region, Language)
- Quantitative scores
- "View Analysis" links

#### **7. Footer**
- Professional contact information
- Academic disclaimers
- Resource links

### **Visual Elements:**
- ✅ Clean, academic color palette
- ✅ Professional typography
- ✅ Data visualization charts
- ✅ Minimal, focused design
- ✅ Academic credibility indicators
- ✅ No entertainment industry "glitz"

### **Content Tone:**
- Academic and research-focused
- Data-driven language
- Professional terminology
- Objective analysis presentation
- Educational approach

---

## 🚀 **Quick Start Checklist**

- [ ] Login as admin (`test6@greybrainer.ai`)
- [ ] Navigate to Admin Panel at bottom of app
- [ ] Click "Show Admin Panel"
- [ ] Add first whitelisted user via "Add User"
- [ ] Approve user from "Pending" to "Active"
- [ ] Test user login with whitelisted email
- [ ] View public landing page (`public-landing.html`)
- [ ] Check research portal (`public-research.html`)

---

## 📧 **Example User Addition**

**Scenario**: Adding a film researcher to the platform

1. **Admin adds user**:
   - Email: `researcher@university.edu`
   - Name: `Dr. Sarah Chen`
   - Role: `Analyst`
   - Department: `Film Studies`

2. **User receives access**:
   - User can now login with `researcher@university.edu`
   - They'll need to set up their Gemini API key
   - Full platform access granted

3. **Admin monitoring**:
   - Track user's last login
   - Monitor their research contributions
   - Manage their access level

The system is now ready for production use! 🎯