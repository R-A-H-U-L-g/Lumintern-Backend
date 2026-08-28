# LUMINTERN Work Notification Engine Documentation

## Overview

The Work Notification Engine is an event-driven system that automatically sends notifications to users at key points in the task lifecycle.

---

## 🔔 Notification Events

### 1. `work.broadcast` - New Task Alert

**Triggered:** When a business creates and funds a new task

**Flow:**
1. Business posts a new task
2. System queries database for top 10 matching freshers
3. Filters by skill overlap and work scale preference
4. Sends email and push notification to each matching fresher

**Data Payload:**
```javascript
{
  task: {
    _id, title, description, workScale, budget, skillsRequired, deadline
  },
  targetFreshers: [
    { _id, name, email, fresherProfile: { skills, preferredWorkScale } }
  ]
}
```

**Email Template:** Professional task match notification with:
- Task details and budget
- Skills match highlighting
- Direct link to apply

---

### 2. `work.submitted` - Proof Submission Alert

**Triggered:** When a fresher submits proof of work

**Flow:**
1. Fresher uploads proofLink
2. Task status changes to 'review'
3. System populates business metadata
4. Sends notification to business owner

**Data Payload:**
```javascript
{
  task: {
    _id, title, budget, workScale, postedBy: { name, email, businessProfile }
  },
  fresher: {
    _id, name, email
  },
  proofLink: "https://..."
}
```

**Email Template:** Action-required notification with:
- 72-hour review deadline warning
- Proof link for review
- Direct link to review page

---

### 3. `work.paid` - Payment Confirmation

**Triggered:** After escrow payment is released to fresher

**Flow:**
1. Business approves work
2. Escrow funds transferred to fresher wallet
3. Database confirms transaction
4. System fetches updated wallet balance
5. Sends notification with accurate balance

**Data Payload:**
```javascript
{
  task: {
    _id, title, workScale
  },
  fresher: {
    _id, name, email
  },
  paymentAmount: 500,
  newBalance: 1250.00
}
```

**Email Template:** Payment confirmation with:
- Payment amount
- Updated wallet balance
- Task summary
- Link to wallet

---

## 📧 Email Configuration

### Environment Variables

```env
# SMTP Configuration (for production)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=noreply@lumintern.com
```

### Development Mode

When SMTP is not configured, emails are logged to console:
```
📧 [DEV] Email to: user@example.com
📧 [DEV] Subject: Payment Received: $500
```

---

## 📱 Push Notifications

### In-App Notifications

All notifications are stored in the `Notification` collection for in-app display.

**API Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| DELETE | `/api/notifications/:id` | Delete notification |
| DELETE | `/api/notifications/read/all` | Delete all read |

### Push Service Integration

For production push notifications, integrate with:
- **Firebase Cloud Messaging (FCM)** - For Android/Web
- **Apple Push Notification Service (APNs)** - For iOS
- **OneSignal** - Multi-platform solution

---

## 🔧 Integration Points

### In taskController.js

```javascript
import workNotificationEngine from '../utils/workNotificationEngine.js';

// After creating task
workNotificationEngine.emit('work.broadcast', {
  task: taskData,
  targetFreshers: matchingFreshers,
});

// After submitting work
workNotificationEngine.emit('work.submitted', {
  task: taskData,
  fresher: fresherData,
  proofLink: url,
});

// After releasing payment
workNotificationEngine.emit('work.paid', {
  task: taskData,
  fresher: fresherData,
  paymentAmount: amount,
  newBalance: balance,
});
```

---

## 📊 Notification Schema

```javascript
{
  user: ObjectId,          // Recipient
  title: String,           // Notification title
  body: String,            // Notification body
  type: String,            // Notification type
  data: Mixed,             // Additional data
  read: Boolean,           // Read status
  readAt: Date,            // When read
  actionUrl: String,       // Click action URL
  priority: String,        // low/medium/high/urgent
  expiresAt: Date,         // Auto-delete date
  createdAt: Date
}
```

---

## 🛡️ Error Handling

Notifications are designed to be non-blocking:

```javascript
try {
  workNotificationEngine.emit('work.broadcast', data);
} catch (error) {
  // Log error but don't fail the main operation
  console.error('Notification error (non-blocking):', error.message);
}
```

This ensures that notification failures never prevent:
- Task creation
- Work submission
- Payment release

---

## 📁 Files Created

```
backend/
├── utils/
│   └── workNotificationEngine.js (new)
├── models/
│   └── Notification.js (new)
├── controllers/
│   ├── notificationController.js (new)
│   └── taskControllerWithNotifications.js (new)
├── routes/
│   └── notificationRoutes.js (new)
└── WORK_NOTIFICATION_DOCUMENTATION.md (new)
```

---

## 🧪 Testing

### Test Work Broadcast
```bash
# Create a task as business
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build Website",
    "description": "Need a modern website",
    "workScale": "small",
    "budget": 500,
    "deadline": "2024-03-01",
    "skillsRequired": ["React", "CSS"]
  }'

# Check console for broadcast logs
```

### Test Work Submission
```bash
# Submit work as fresher
curl -X POST http://localhost:5000/api/tasks/TASK_ID/submit \
  -H "Authorization: Bearer FRESHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"proofLink": "https://github.com/project"}'
```

### Test Payment Notification
```bash
# Approve work as business
curl -X POST http://localhost:5000/api/payments/TASK_ID/approve \
  -H "Authorization: Bearer BUSINESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"feedback": "Great work!"}'
```

### Get Notifications
```bash
curl http://localhost:5000/api/notifications \
  -H "Authorization: Bearer TOKEN"
```

---

## 🚀 Production Setup

### 1. Configure SMTP (SendGrid Example)

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx
SMTP_FROM=noreply@lumintern.com
```

### 2. Configure Push Notifications

Add Firebase credentials for push notifications.

### 3. Monitor Notifications

Check logs for:
```
📢 Task broadcast sent to 8 matching freshers
📤 Work submission notification sent to business
💰 Payment notification sent to fresher
```

---

## 📞 Support

For notification system issues:
- **Email:** tech-support@lumintern.com
- **Logs:** Check server console for notification events