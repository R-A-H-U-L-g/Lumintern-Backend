# LUMINTERN Escrow Payment & Work Verification System

## Overview

The LUMINTERN Escrow System provides a secure, anti-fraud payment workflow that protects both Freshers (ensuring they get paid for professional work) and Businesses (ensuring they receive quality deliverables).

---

## 🔄 Payment Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ESCROW PAYMENT WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐          │
│  │ BUSINESS │    │   ESCROW     │    │  FRESHER │    │ COMPLETE │          │
│  │  FUNDS   │───▶│    HOLD      │───▶│  SUBMITS │───▶│ & PAID   │          │
│  │  TASK    │    │              │    │   WORK   │    │          │          │
│  └──────────┘    └──────────────┘    └──────────┘    └──────────┘          │
│       │                │                   │               │               │
│       │                │                   │               │               │
│       ▼                ▼                   ▼               ▼               │
│  ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐          │
│  │unfunded  │    │held_in_escrow│    │  review  │    │ released │          │
│  └──────────┘    └──────────────┘    └──────────┘    └──────────┘          │
│                                                                             │
│                          ┌──────────────┐                                   │
│                          │   DISPUTED   │                                   │
│                          │ (Frozen)     │                                   │
│                          └──────────────┘                                   │
│                                 │                                           │
│                                 ▼                                           │
│                          ┌──────────────┐                                   │
│                          │ ADMIN REVIEW │                                   │
│                          └──────────────┘                                   │
│                                 │                                           │
│                    ┌────────────┼────────────┐                              │
│                    ▼            ▼            ▼                              │
│              ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│              │ Awarded  │ │ Refunded │ │  Split   │                        │
│              │ to       │ │ to       │ │  50/50   │                        │
│              │ Fresher  │ │ Business │ │          │                        │
│              └──────────┘ └──────────┘ └──────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Anti-Fraud Mechanisms

### 1. Business Gate: Fund & Start Task
**Endpoint:** `POST /api/payments/:taskId/fund`

**Purpose:** Ensures business has committed funds before fresher begins work.

**Rules:**
- ✅ Business must have sufficient wallet balance
- ✅ Task must have an assigned fresher
- ✅ Task payment status must be 'unfunded'
- ❌ Cannot start work without funding
- ❌ Cannot double-fund a task

**Flow:**
1. Business adds funds to wallet
2. Business calls fund endpoint
3. Funds move from wallet to escrow
4. Task status changes to 'in_progress'
5. Milestones are initialized

---

### 2. Fresher Gate: Submit Task Work
**Endpoint:** `POST /api/payments/:taskId/submit`

**Purpose:** Ensures fresher provides proof of work before payment release.

**Rules:**
- ✅ Must provide proofLink (URL to code, design, screenshots)
- ✅ Task must be 'in_progress' and funded
- ✅ Only assigned fresher can submit
- ❌ Cannot submit without proof link
- ❌ Cannot submit to unfunded task

**Flow:**
1. Fresher completes work
2. Fresher submits proof link and notes
3. Task status changes to 'review'
4. 72-hour auto-release timer starts

---

### 3. Business Gate: Approve & Release Payment
**Endpoint:** `POST /api/payments/:taskId/approve`

**Purpose:** Ensures business reviews work before payment release.

**Rules:**
- ✅ Task must be in 'review' status
- ✅ Payment must be held in escrow
- ✅ Only task owner can approve
- ❌ Cannot approve without submission

**Flow:**
1. Business reviews proof of work
2. Business approves submission
3. Funds released from escrow to fresher
4. Task status changes to 'completed'
5. Both parties' stats updated

---

## ⏰ Anti-Ghosting: 72-Hour Auto-Release

### Problem
Businesses might disappear after receiving free work, refusing to approve or respond.

### Solution
Automated 72-hour auto-release mechanism.

**Implementation:**
- Uses `node-cron` for scheduled execution
- Runs every hour to check eligible tasks
- Tasks in 'review' for 72+ hours are auto-completed
- Funds automatically released to fresher

**Eligibility Criteria:**
```javascript
{
  status: 'review',
  paymentStatus: 'held_in_escrow',
  'proofOfWork.submittedAt': { $lte: cutoffTime }, // 72 hours ago
  autoReleasedAt: { $exists: false }
}
```

**Monitoring Endpoint:**
```
GET /api/admin/auto-release/eligible
```

**Manual Trigger:**
```
POST /api/admin/auto-release/trigger
```

---

## ⚖️ Dispute Resolution

### Opening a Dispute
**Endpoint:** `POST /api/payments/:taskId/dispute`

**Who:** Business (task owner)

**When:** Task is in 'review' status

**Effect:**
- Task status changes to 'disputed'
- Escrow funds are frozen
- Admin notified

**Requirements:**
- Detailed reason (minimum 20 characters)

---

### Admin Resolution
**Endpoint:** `PATCH /api/admin/resolve-dispute/:taskId`

**Who:** Admin only

**Options:**
1. **awarded_to_fresher** - Full payment to fresher
2. **refunded_to_business** - Full refund to business
3. **partial_split** - 50/50 split

**Admin Fee:**
- Configurable percentage (default: 0%)
- Deducted from total before distribution

**Example Request:**
```json
{
  "resolution": "awarded_to_fresher",
  "resolutionNotes": "Work was completed satisfactorily. Business failed to provide valid reasons for rejection.",
  "adminFeePercentage": 5
}
```

---

## 💰 Wallet System

### Wallet Model
```javascript
{
  user: ObjectId,
  balance: Number,        // Available balance
  escrowBalance: Number,  // Funds held in escrow
  totalEarnings: Number,  // Lifetime earnings
  totalSpent: Number,     // Lifetime spending
  transactions: [{
    type: 'credit' | 'debit' | 'escrow_hold' | 'escrow_release' | 'escrow_refund',
    amount: Number,
    description: String,
    relatedTask: ObjectId,
    status: 'pending' | 'completed' | 'failed',
    createdAt: Date
  }]
}
```

### Transaction Types
- **credit** - Adding funds to wallet
- **debit** - Withdrawing funds
- **escrow_hold** - Funds moved to escrow
- **escrow_release** - Funds released to fresher
- **escrow_refund** - Funds returned to business

---

## 📊 API Endpoints

### Payment Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/payments/:taskId/fund` | Fund task & start work | Business |
| POST | `/api/payments/:taskId/submit` | Submit proof of work | Fresher |
| POST | `/api/payments/:taskId/approve` | Approve & release payment | Business |
| POST | `/api/payments/:taskId/dispute` | Open dispute | Business |
| GET | `/api/payments/:taskId/status` | Get payment status | Business/Fresher |

### Admin Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/dashboard` | Dashboard statistics | Admin |
| GET | `/api/admin/disputes` | List all disputes | Admin |
| PATCH | `/api/admin/resolve-dispute/:taskId` | Resolve dispute | Admin |
| GET | `/api/admin/users` | List all users | Admin |
| GET | `/api/admin/users/:userId` | User details | Admin |
| PATCH | `/api/admin/users/:userId/verify` | Verify business | Admin |
| PATCH | `/api/admin/users/:userId/deactivate` | Deactivate user | Admin |
| GET | `/api/admin/transactions` | Transaction logs | Admin |
| POST | `/api/admin/auto-release/trigger` | Trigger auto-release | Admin |
| GET | `/api/admin/auto-release/eligible` | View eligible tasks | Admin |

---

## 🔐 Security Features

### 1. Atomic Transactions
All payment operations use MongoDB sessions for atomicity:
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // All operations here
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
} finally {
  session.endSession();
}
```

### 2. Balance Validation
- Pre-check wallet balance before escrow hold
- Prevent negative balances
- Validate sufficient escrow before release

### 3. Status Guards
- Strict status transition validation
- Role-based access control
- Ownership verification

### 4. Audit Trail
- Complete transaction history
- Timestamped status changes
- Dispute resolution logs

---

## 📈 Scaling Recommendations

### For Production (High Volume)

**Option 1: Redis + Bull Queue (Recommended)**
```javascript
// Use Bull for job queue
import Queue from 'bull';

const autoReleaseQueue = new Queue('auto-release', {
  redis: { host: 'localhost', port: 6379 }
});

// Process jobs
autoReleaseQueue.process(async (job) => {
  await processAutoReleases();
});

// Schedule recurring job
autoReleaseQueue.add({}, {
  repeat: { cron: '0 * * * *' } // Every hour
});
```

**Benefits:**
- Distributed processing
- Job retry on failure
- Monitoring dashboard
- Scalable across multiple servers

**Option 2: Agenda.js**
```javascript
import Agenda from 'agenda';

const agenda = new Agenda({ db: { address: MONGODB_URI } });

agenda.define('auto-release', async (job) => {
  await processAutoReleases();
});

await agenda.start();
await agenda.every('1 hour', 'auto-release');
```

**Benefits:**
- MongoDB-backed persistence
- Job scheduling UI
- Locking mechanism

**Option 3: Standard Cron (Current Implementation)**
- Simple and lightweight
- Single server only
- No persistence across restarts

---

## 🧪 Testing Scenarios

### Happy Path
1. Business funds task → ✅ Escrow hold
2. Fresher submits work → ✅ Status: review
3. Business approves → ✅ Payment released

### Auto-Release Path
1. Business funds task → ✅ Escrow hold
2. Fresher submits work → ✅ Status: review
3. 72 hours pass → ✅ Auto-release triggered
4. Fresher receives payment → ✅ Status: completed

### Dispute Path
1. Business funds task → ✅ Escrow hold
2. Fresher submits work → ✅ Status: review
3. Business disputes → ✅ Status: disputed, funds frozen
4. Admin reviews → ✅ Resolution applied

### Edge Cases
- Insufficient balance → ❌ 400 Error
- Double funding → ❌ 400 Error
- Submit without proof → ❌ 400 Error
- Approve without submission → ❌ 400 Error
- Invalid status transition → ❌ 400 Error

---

## 🚀 Deployment Checklist

- [ ] Set up MongoDB replica set (required for transactions)
- [ ] Configure Redis (if using Bull queue)
- [ ] Set appropriate auto-release timeout
- [ ] Configure admin fee percentage
- [ ] Set up monitoring for auto-release job
- [ ] Configure alerts for disputed tasks
- [ ] Test all payment flows in staging
- [ ] Set up backup strategy for wallet data

---

## 📞 Support

For payment-related issues:
- **Email:** payments@lumintern.com
- **Dispute Timeline:** 24-48 hours for admin review
- **Auto-Release:** 72 hours after submission