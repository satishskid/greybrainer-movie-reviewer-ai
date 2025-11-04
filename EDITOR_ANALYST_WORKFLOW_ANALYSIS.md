# Editor & Analyst Workflow Analysis

## 🎯 **Current Role System**

### **👑 Admin** (`satish@skids.health`, `satish.rath@gmail.com`)
**Permissions**: `read`, `write`, `approve`, `manage_users`, `manage_content`, `publish`
- Full system access
- Can approve/reject reports
- Can manage users and content
- Can publish directly

### **✏️ Editor** (`drpratichi@skids.health`, `saminamisra@gmail.com`)
**Permissions**: `read`, `write`, `edit_content`, `submit_for_approval`
- Can read all reports in review
- Can edit and approve content for publication
- Can update report status from `in_review` to `published`
- Access to Editorial Queue in Admin Dashboard

### **📊 Analyst** (Default role for authenticated users)
**Permissions**: `read`, `write`, `create_analysis`
- Can create movie analyses
- Can read published reports
- Can read their own drafts
- Reports auto-submit as `in_review` status

### **👀 Viewer** (Fallback role)
**Permissions**: `read`
- Read-only access to published content

## 🔄 **Complete Content Approval Workflow**

### **Step 1: Content Creation (Analyst)**
```
Analyst creates movie analysis → Auto-saved as status: 'in_review'
```
- Uses main Greybrainer interface
- Analyzes movies with AI assistance
- Content automatically published via `contentPublishingService`
- Status: `in_review` (requires editorial approval)

### **Step 2: Editorial Review (Editor)**
```
Editor accesses Admin Dashboard → Editorial Queue → Review Content
```
- Editors see all reports with status `in_review`
- Can preview full content and metadata
- Two actions available:
  - **Approve**: Changes status to `published` + sets `approvedBy`
  - **Reject**: Changes status to `rejected` + sets `rejectedBy`

### **Step 3: Publication (Automatic)**
```
Approved content → Publicly visible → Available in research portal
```
- Published reports visible to all authenticated users
- Appears in public research portal
- Available for sharing and export

## 🛠 **Technical Implementation Status**

### ✅ **Fully Implemented**
1. **Role-based Authentication**: Firebase Auth + custom roles
2. **Firestore Security Rules**: Proper permissions per role
3. **Content Publishing Service**: Auto-publish analysis as drafts
4. **Editorial Queue UI**: Admin dashboard with approve/reject
5. **Report Management**: CRUD operations with status tracking
6. **Public Research Portal**: Published content display

### ✅ **Editor Workflow Components**
- `FirebaseAdminDashboard.tsx` - Editorial queue interface
- `contentService.approveReport()` - Approval functionality
- `contentService.getReportsByStatus()` - Queue management
- Firestore rules allow editors to read/update reports

### ✅ **Analyst Workflow Components**
- Main Greybrainer interface for analysis creation
- `contentPublishingService.publishFilmAnalysis()` - Auto-publish
- Report auto-submission with `in_review` status
- Access to own drafts and published content

## 🎯 **User Experience Flow**

### **For Analysts (Content Creators)**
1. Login → Create movie analysis → Content auto-submitted for review
2. Can see their own drafts in "My Reports" (if implemented)
3. Notified when content is approved/rejected (if notifications implemented)

### **For Editors (Content Reviewers)**
1. Login → Access Admin Dashboard → Editorial Queue tab
2. See all pending reports with metadata
3. Review content → Approve or Reject with one click
4. Track approval history and statistics

### **For Admins (Full Control)**
1. All editor capabilities plus:
2. User management (add/remove editors, analysts)
3. System configuration and monitoring
4. Direct publishing capabilities

## 🚀 **Ready for Production**

The complete editor/analyst workflow is **fully implemented and functional**:

- ✅ Role-based access control
- ✅ Content creation and auto-submission
- ✅ Editorial review and approval process
- ✅ Publication and public access
- ✅ Security rules and permissions
- ✅ UI components for all workflows

### **Current Editors**
- `drpratichi@skids.health` ✅
- `saminamisra@gmail.com` ✅

Both editors can now access the Editorial Queue and approve content for publication.