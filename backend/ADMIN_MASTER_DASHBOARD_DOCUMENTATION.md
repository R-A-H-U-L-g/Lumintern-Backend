# LUMINTERN Global Admin Dashboard Documentation

## Overview

The Global Admin Dashboard is the central command center for the entire LUMINTERN platform, providing full visibility into all platform activity and granting admins the power to dynamically modify settings, review data, and manage user statuses.

---

## 🎨 Frontend Dashboard

### Design Theme
- **Background:** `bg-slate-950` (deep midnight dark)
- **Glassmorphic Cards:** `backdrop-filter: blur(12px)`
- **Active Accents:** Electric cyan
- **Warnings:** Amber/red

### Layout Structure

#### Left Sidebar Navigation
- Dashboard (Analytics)
- User Management
- Settings

#### Three Main Tabs

**Tab A: Live Activity Stream & Analytics**
- Platform Overview Cards (4 columns):
  - Total Registered Freshers
  - Total Registered Businesses
  - Total Active Gigs (Small vs Large)
  - Total Volume Locked in Escrow
- Live Audit Log Timeline (vertically scrolling)

**Tab B: User Directory Management**
- Two data-table grids with search/filter:
  1. Fresher Registry (Name, College, Skills, Rating, Earnings, Status)
  2. Employer Registry (Shop/Company, Scale, Spent, Verification)
- Admin Action Controls (Inspection Drawer):
  - Toggle account suspension
  - Override verification status
  - Edit fresher skill profile

**Tab C: Global Settings & Configuration**
- Platform Commission Fee (%)
- Auto-Release Escrow Timer (hours)
- Scale Threshold Limit (currency)
- Maintenance Mode toggle
- Allow New Registrations toggle

---

## 🔐 Backend API Endpoints

### Authentication
All endpoints require admin authentication:
```
Authorization: Bearer <admin_jwt_token>
```

### Tab A: Analytics

#### GET /api/admin/analytics/overview
Get comprehensive platform analytics.

**Response:**
```json
{
  "status": "success",
  "data": {
    "users": {
      "totalFreshers": 2847,
      "totalBusinesses": 534,
      "activeFreshers": 2800,
      "activeBusinesses": 520,
      "suspendedUsers": 61,
      "total": 3381
    },
    "tasks": {
      "total": 15678,
      "open": 245,
      "inProgress": 890,
      "completed": 14200,
      "disputed": 43,
      "smallTasks": 9800,
      "largeTasks": 5878
    },
    "financials": {
      "totalEscrowLocked": 45230,
      "totalVolumeProcessed": 1250000,
      "platformRevenue": 125000
    },
    "today": {
      "newUsers": 17,
      "newTasks": 45,
      "completed": 38
    },
    "metrics": {
      "avgCompletionHours": 48.5,
      "successRate": 91,
      "disputeRate": 0.3
    },
    "monthlyTrend": [...]
  }
}
```

---

#### GET /api/admin/analytics/activity
Get live activity stream.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Number of activities (default: 50) |

**Response:**
```json
{
  "status": "success",
  "data": {
    "activities": [
      {
        "type": "admin_action",
        "timestamp": "2024-01-15T10:30:00Z",
        "message": "Admin John suspended Alex's account",
        "icon": "🚫",
        "color": "amber",
        "admin": "Admin John",
        "target": "Alex"
      },
      {
        "type": "task_update",
        "timestamp": "2024-01-15T10:25:00Z",
        "message": "Gupta Grocery posted a small gig: \"Set up Digital Inventory\"",
        "icon": "📋",
        "color": "cyan"
      }
    ]
  }
}
```

---

### Tab B: User Management

#### GET /api/admin/users
Get paginated user directory.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| role | string | `fresher` or `business` |
| search | string | Search by name, email, skills |
| status | string | `active` or `suspended` |
| verified | string | `true` or `false` |
| page | number | Page number |
| limit | number | Items per page |
| sort | string | Sort field (e.g., `-createdAt`) |

**Response:**
```json
{
  "status": "success",
  "results": 20,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3381,
    "pages": 170
  },
  "data": {
    "users": [
      {
        "_id": "user_id",
        "name": "Alex Johnson",
        "email": "alex@university.edu",
        "role": "fresher",
        "isActive": true,
        "fresherProfile": {
          "college": "MIT",
          "skills": ["React", "Python"],
          "rating": 4.8
        },
        "wallet": {
          "balance": 1250,
          "totalEarnings": 2450
        }
      }
    ]
  }
}
```

---

#### GET /api/admin/users/:userId
Get detailed user information.

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": { ... },
    "wallet": { ... },
    "tasks": [...],
    "auditHistory": [...],
    "chatCount": 156
  }
}
```

---

#### PATCH /api/admin/users/:userId/status
Update user status, verification, or skills.

**Request Body:**
```json
{
  "status": "suspended",
  "verified": true,
  "skills": ["React", "Node.js", "Python"],
  "reason": "Violation of platform terms"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "User suspended updated successfully",
  "data": {
    "user": { ... }
  }
}
```

**Audit Log Created:**
```json
{
  "adminId": "admin_id",
  "actionType": "user_suspend",
  "targetUserId": "user_id",
  "previousState": { "isActive": true },
  "newState": { "isActive": false },
  "reason": "Violation of platform terms",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

---

### Tab C: Settings

#### GET /api/admin/settings
Get current platform settings.

**Response:**
```json
{
  "status": "success",
  "data": {
    "settings": {
      "platformCommissionFee": 10,
      "autoReleaseEscrowTimer": 72,
      "scaleThresholdLimit": 100,
      "maintenanceMode": false,
      "allowNewRegistrations": true,
      "minimumWithdrawal": 50,
      "maximumTaskBudget": 50000,
      "disputeAutoEscalation": 48,
      "lastUpdatedBy": "admin_id",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

#### PUT /api/admin/settings
Update platform settings.

**Request Body:**
```json
{
  "platformCommissionFee": 12,
  "autoReleaseEscrowTimer": 48,
  "scaleThresholdLimit": 150,
  "maintenanceMode": false,
  "allowNewRegistrations": true
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Settings updated successfully",
  "data": {
    "settings": { ... }
  }
}
```

---

### Audit Logs

#### GET /api/admin/audit-logs
Get audit trail of all admin actions.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| adminId | string | Filter by admin |
| targetUserId | string | Filter by target user |
| actionType | string | Filter by action type |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "status": "success",
  "results": 50,
  "pagination": { ... },
  "data": {
    "logs": [
      {
        "_id": "log_id",
        "adminId": { "name": "Admin John", "email": "john@lumintern.com" },
        "actionType": "user_suspend",
        "targetUserId": { "name": "Alex", "email": "alex@test.com", "role": "fresher" },
        "previousState": { "isActive": true },
        "newState": { "isActive": false },
        "reason": "Terms violation",
        "ipAddress": "192.168.1.1",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

---

## 🗄️ Database Models

### GlobalSetting Schema
```javascript
{
  settingKey: String (unique, default: 'global'),
  platformCommissionFee: Number (default: 10, min: 0, max: 50),
  autoReleaseEscrowTimer: Number (default: 72, min: 24, max: 168),
  scaleThresholdLimit: Number (default: 100, min: 10),
  platformName: String,
  supportEmail: String,
  maintenanceMode: Boolean,
  allowNewRegistrations: Boolean,
  minimumWithdrawal: Number,
  maximumTaskBudget: Number,
  disputeAutoEscalation: Number,
  lastUpdatedBy: ObjectId
}
```

### AuditLog Schema
```javascript
{
  adminId: ObjectId (required),
  actionType: String (enum),
  targetUserId: ObjectId,
  targetResourceType: 'user' | 'task' | 'setting' | 'dispute' | 'wallet',
  targetResourceId: ObjectId,
  details: Mixed,
  previousState: Mixed,
  newState: Mixed,
  ipAddress: String,
  userAgent: String,
  reason: String,
  status: 'success' | 'failed' | 'reverted'
}
```

---

## 🔄 Audit Logging

Every admin action is automatically logged with:
- **Admin ID** - Who performed the action
- **Action Type** - What was done
- **Target User** - Who was affected
- **Previous State** - Before the change
- **New State** - After the change
- **Reason** - Why the action was taken
- **IP Address** - Where it came from
- **User Agent** - Browser/device info
- **Timestamp** - When it happened

### Action Types
- `user_suspend` - Account suspended
- `user_activate` - Account reactivated
- `user_terminate` - Account terminated
- `business_verify` - Business verified
- `business_unverify` - Verification removed
- `setting_update` - Platform settings changed
- `dispute_resolve` - Dispute resolved
- `manual_skill_edit` - Skills manually edited
- `maintenance_toggle` - Maintenance mode toggled
- `registration_toggle` - Registration toggled

---

## 💻 Frontend Integration

### Fetch Analytics
```javascript
const response = await fetch('/api/admin/analytics/overview', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { data } = await response.json();
// data.users, data.tasks, data.financials, data.today, data.metrics
```

### Fetch Users
```javascript
const response = await fetch('/api/admin/users?role=fresher&search=john&page=1', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const { data, pagination } = await response.json();
```

### Update User Status
```javascript
const response = await fetch(`/api/admin/users/${userId}/status`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    status: 'suspended',
    reason: 'Terms violation'
  })
});
```

### Update Settings
```javascript
const response = await fetch('/api/admin/settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    platformCommissionFee: 12,
    autoReleaseEscrowTimer: 48
  })
});
```

---

## 🛡️ Security Features

✅ **Admin Authentication Gate** - JWT + role verification  
✅ **Audit Logging** - Every action tracked  
✅ **IP Address Logging** - Track action origins  
✅ **Previous State Capture** - Enable rollback capability  
✅ **Input Validation** - All settings validated  
✅ **Atomic Operations** - Database consistency  

---

## 📊 Files Created

```
backend/
├── models/
│   ├── GlobalSetting.js (new)
│   └── AuditLog.js (new)
├── controllers/
│   └── adminMasterController.js (new)
├── routes/
│   └── adminMasterRoutes.js (new)
└── ADMIN_MASTER_DASHBOARD_DOCUMENTATION.md (new)

admin-master-dashboard.html (new)
```

---

## 🚀 Deployment

### Environment Variables
No additional environment variables required. Uses existing JWT_SECRET and MONGODB_URI.

### Database Setup
The GlobalSetting model uses a singleton pattern - settings are automatically created on first access.

### Indexes
AuditLog has indexes on:
- `adminId`
- `targetUserId`
- `actionType`
- `createdAt`
- Compound: `adminId + createdAt`
- Compound: `targetUserId + createdAt`

---

## 📞 Support

For admin dashboard support:
- **Email:** admin-support@lumintern.com
- **Documentation:** This file
- **Escalation:** Contact system administrator