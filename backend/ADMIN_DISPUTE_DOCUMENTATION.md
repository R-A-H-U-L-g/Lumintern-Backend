# LUMINTERN Admin Dispute Resolution System

## Overview

The Admin Dispute Resolution System provides a secure, professional interface for internal operations teams to resolve payment disputes between Freshers and Businesses.

---

## 🎨 Frontend Dashboard

### Design Theme
- **Background:** `bg-slate-950` (deep dark)
- **Warning Accents:** Orange/amber for active disputes
- **Success Accents:** Emerald for resolved disputes
- **Typography:** Inter font family

### Layout Structure

#### Left Sidebar Navigation
- Overview Statistics
- Active Disputes ⚠️
- User Verification
- Platform Wallets
- Settings

#### Top Overview Metric Cards (3 Columns)
1. **Total Escrow Locked** - Sum of all funds in dispute
2. **Open Disputes** - Count of disputed tasks
3. **Average Resolution Time** - Hours to settle cases

#### Main Dispute Resolution Workspace (Split-View)

**Left Column (The Evidence Case):**
- Task Context (Title, Budget, Scale)
- Fresher Profile (Rating, History)
- Business Profile (Details, Verification)
- Dispute Reason (Business's explanation)
- Proof of Work (Fresher's submissions)

**Right Column (System Audit & Action Panel):**
- Platform Chat Logs (Read-only view)
- Resolution Notes (Mandatory text area)
- Action Buttons:
  - Release to Fresher (Green)
  - Refund to Business (Red)

---

## 🔐 Backend API Endpoints

### Authentication
All endpoints require admin authentication:
```
Authorization: Bearer <admin_jwt_token>
```

### Endpoints

#### GET /api/admin/disputes
Fetch all disputes with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | `open` or `resolved` |
| page | number | Page number |
| limit | number | Items per page |

**Response:**
```json
{
  "status": "success",
  "results": 7,
  "pagination": { "page": 1, "limit": 20, "total": 7, "pages": 1 },
  "data": {
    "disputes": [...],
    "stats": {
      "totalEscrowLocked": 12450,
      "openDisputes": 7,
      "resolvedDisputes": 12,
      "averageResolutionTimeHours": 18.5
    }
  }
}
```

---

#### GET /api/admin/disputes/:disputeId
Get detailed dispute information.

**Response:**
```json
{
  "status": "success",
  "data": {
    "dispute": { ... },
    "chatMessages": [...],
    "fresherDisputeHistory": 2,
    "businessDisputeHistory": 1
  }
}
```

---

#### POST /api/admin/disputes/:disputeId/resolve
Resolve a dispute.

**Request Body:**
```json
{
  "resolution": "fresher" | "business",
  "notes": "Detailed resolution notes (min 50 characters)"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Dispute resolved successfully. Payment released to fresher.",
  "data": {
    "dispute": { ... },
    "resolution": {
      "verdict": "fresher",
      "amount": 1200,
      "recipient": "Alex Johnson"
    }
  }
}
```

---

#### GET /api/admin/disputes/stats
Get dispute statistics.

**Response:**
```json
{
  "status": "success",
  "data": {
    "statusCounts": [...],
    "monthlyTrend": [...],
    "disputeReasons": [...],
    "resolutionDistribution": [...]
  }
}
```

---

#### GET /api/admin/disputes/export
Export dispute report.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | date | Filter start date |
| endDate | date | Filter end date |
| status | string | `open` or `resolved` |

---

## 🔄 Resolution Logic

### Database Transaction Flow

```javascript
// 1. Validate inputs
// 2. Find disputed task
// 3. Verify status is 'disputed'
// 4. Get wallets (business & fresher)
// 5. Process resolution:
//    - If 'fresher': Release escrow to fresher
//    - If 'business': Refund escrow to business
// 6. Update dispute log
// 7. Update task status
// 8. Commit transaction
```

### Resolution Actions

#### Release to Fresher
```javascript
// Transfer escrow to fresher
await businessWallet.releaseEscrow(
  task.budget,
  task._id,
  fresherWallet,
  `Dispute resolved - Payment awarded: ${task.title}`
);

// Update fresher stats
await User.findByIdAndUpdate(task.assignedTo, {
  $inc: {
    'fresherProfile.completedTasks': 1,
    'fresherProfile.totalEarnings': task.budget
  }
});

// Update task
task.status = 'completed';
task.paymentStatus = 'released';
```

#### Refund to Business
```javascript
// Refund escrow to business
await businessWallet.refundEscrow(
  task.budget,
  task._id,
  `Dispute resolved - Refund issued: ${task.title}`
);

// Update task
task.status = 'cancelled';
task.paymentStatus = 'refunded';
```

---

## 🛡️ Security Features

### Authentication Gate
```javascript
router.use(protect);
router.use(restrictTo('admin'));
```

### Validation Checks
1. ✅ Verify resolution type is valid
2. ✅ Verify notes length (min 50 chars)
3. ✅ Verify task exists
4. ✅ Verify task is disputed
5. ✅ Verify dispute not already resolved

### Atomic Transactions
All resolution operations use MongoDB sessions:
```javascript
const session = await mongoose.startSession();
session.startTransaction();
// ... operations
await session.commitTransaction();
```

---

## 📊 Database Schema Updates

### Task Dispute Log
```javascript
disputeLog: {
  disputedAt: Date,
  reason: String,
  resolvedBy: ObjectId,      // Admin User ID
  resolvedAt: Date,
  resolution: String,        // 'awarded_to_fresher' | 'refunded_to_business'
  resolutionNotes: String,
  adminFee: Number
}
```

---

## 💻 Frontend Integration

### Fetch Disputes
```javascript
const fetchDisputes = async (status = 'open') => {
  const response = await fetch(`/api/admin/disputes?status=${status}`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  return response.json();
};
```

### Resolve Dispute
```javascript
const resolveDispute = async (disputeId, resolution, notes) => {
  const response = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ resolution, notes })
  });
  return response.json();
};
```

---

## 🧪 Testing

### Test Resolution Flow
```bash
# 1. Get open disputes
curl http://localhost:5000/api/admin/disputes?status=open \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 2. Get dispute details
curl http://localhost:5000/api/admin/disputes/DISPUTE_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. Resolve dispute
curl -X POST http://localhost:5000/api/admin/disputes/DISPUTE_ID/resolve \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution": "fresher", "notes": "Work was completed satisfactorily..."}'
```

---

## 📈 Scaling Considerations

### Current Implementation
- ✅ Atomic transactions
- ✅ Admin-only access
- ✅ Detailed audit trail

### Production Enhancements
1. **Notification System**
   - Email notifications to both parties
   - In-app notifications

2. **Appeal Process**
   - Allow appeals within timeframe
   - Second admin review

3. **Automated Evidence Collection**
   - Auto-attach chat logs
   - Screenshot verification

4. **Analytics Dashboard**
   - Dispute trends
   - Resolution time tracking
   - Admin performance metrics

---

## 📞 Support

For admin support:
- **Email:** admin-support@lumintern.com
- **Documentation:** This file
- **Escalation:** Contact system administrator