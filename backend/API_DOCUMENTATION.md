# LUMINTERN API Documentation

## Base URL
```
http://localhost:5000/api
```

---

## 🔐 Authentication

### Register User
**POST** `/auth/register`

Register a new user (Fresher or Business).

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "password": "string (required, min 8 chars)",
  "role": "fresher | business | admin",
  
  // For Freshers:
  "fresherProfile": {
    "college": "string",
    "yearOfStudy": "1 | 2 | 3 | 4 | 5+ | phd | graduate",
    "skills": ["string"],
    "preferredWorkScale": "small | large | both",
    "portfolioLinks": [{ "title": "string", "url": "string" }]
  },
  
  // For Businesses:
  "businessProfile": {
    "businessName": "string",
    "businessType": "local-retail | ecommerce | restaurant | startup | agency | enterprise | other",
    "phone": "string",
    "address": {
      "street": "string",
      "city": "string",
      "state": "string",
      "zipCode": "string",
      "country": "string"
    }
  }
}
```

**Response (201):**
```json
{
  "status": "success",
  "token": "jwt_token_here",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "Alex Johnson",
      "email": "alex@example.com",
      "role": "fresher",
      "fresherProfile": { ... },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

### Login User
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "status": "success",
  "token": "jwt_token_here",
  "data": {
    "user": { ... }
  }
}
```

---

### Get Current User
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "user": { ... }
  }
}
```

---

### Update Profile
**PATCH** `/auth/updateMe`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "fresherProfile": {
    "skills": ["JavaScript", "React", "Python"],
    "preferredWorkScale": "large"
  }
}
```

---

### Update Password
**PATCH** `/auth/updatePassword`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_secure_password"
}
```

---

## 📋 Tasks

### Get All Tasks
**GET** `/tasks`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| scale | string | Filter by work scale: `small` or `large` |
| skills | string | Comma-separated skills: `React,Node.js` |
| status | string | Task status: `open`, `in_progress`, etc. |
| minBudget | number | Minimum budget |
| maxBudget | number | Maximum budget |
| search | string | Search in title and description |
| sort | string | Sort by: `budget_asc`, `budget_desc`, `deadline` |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |

**Example:**
```
GET /tasks?scale=small&skills=JavaScript,React&sort=budget_desc&page=1&limit=20
```

**Response (200):**
```json
{
  "status": "success",
  "results": 10,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "data": {
    "tasks": [
      {
        "_id": "task_id",
        "title": "Build E-commerce Website",
        "description": "...",
        "workScale": "large",
        "budget": 2500,
        "deadline": "2024-03-15T00:00:00.000Z",
        "skillsRequired": ["React", "Node.js"],
        "status": "open",
        "postedBy": {
          "_id": "user_id",
          "name": "TechCorp",
          "businessProfile": {
            "businessName": "TechCorp Solutions",
            "isVerified": true
          }
        },
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

---

### Get Single Task
**GET** `/tasks/:id`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "task": {
      "_id": "task_id",
      "title": "Build E-commerce Website",
      "description": "Detailed description...",
      "postedBy": { ... },
      "assignedTo": null,
      "status": "open",
      "workScale": "large",
      "budget": 2500,
      "deadline": "2024-03-15T00:00:00.000Z",
      "skillsRequired": ["React", "Node.js", "MongoDB"],
      "milestones": [],
      "deliverables": [],
      "applicationCount": 5
    }
  }
}
```

---

### Create Task (Business Only)
**POST** `/tasks`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Build E-commerce Website",
  "description": "Create a full-stack e-commerce platform with...",
  "workScale": "large",
  "budget": 2500,
  "deadline": "2024-03-15",
  "skillsRequired": ["React", "Node.js", "MongoDB"],
  "tags": ["e-commerce", "web development"],
  "isUrgent": false
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "task": { ... }
  }
}
```

---

### Update Task Status (Business Only)
**PATCH** `/tasks/:taskId/status`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "in_progress",
  "assignedTo": "fresher_user_id"
}
```

**Valid Status Transitions:**
- `open` → `in_progress`, `cancelled`
- `in_progress` → `review`, `cancelled`
- `review` → `in_progress`, `completed`, `cancelled`
- `completed` → (none)
- `cancelled` → `open`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "task": {
      "_id": "task_id",
      "status": "in_progress",
      "assignedTo": "fresher_id",
      "milestones": [
        {
          "_id": "milestone_id",
          "title": "Architecture & Setup",
          "description": "...",
          "status": "pending",
          "dueDate": "2024-02-01T00:00:00.000Z"
        },
        {
          "_id": "milestone_id",
          "title": "Beta Review",
          "status": "pending",
          "dueDate": "2024-02-20T00:00:00.000Z"
        },
        {
          "_id": "milestone_id",
          "title": "Final Production Deployment",
          "status": "pending",
          "dueDate": "2024-03-15T00:00:00.000Z"
        }
      ]
    }
  }
}
```

---

### Apply to Task (Fresher Only)
**POST** `/tasks/:taskId/apply`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "coverNote": "I have 3 years of experience in React and Node.js...",
  "proposedTimeline": "4 weeks",
  "proposedBudget": 2200,
  "relevantExperience": "Built similar e-commerce platforms...",
  "portfolioSamples": [
    {
      "title": "E-commerce Project",
      "url": "https://github.com/username/project"
    }
  ]
}
```

**Response (201):**
```json
{
  "status": "success",
  "data": {
    "application": {
      "_id": "app_id",
      "task": "task_id",
      "applicant": "fresher_id",
      "coverNote": "...",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Error Cases:**
- Profile scale mismatch (400)
- Already applied (400)
- Task not accepting applications (400)

---

### Get Task Applications (Business Only)
**GET** `/tasks/:taskId/applications`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "results": 5,
  "data": {
    "applications": [
      {
        "_id": "app_id",
        "applicant": {
          "_id": "fresher_id",
          "name": "Alex Johnson",
          "email": "alex@example.com",
          "fresherProfile": {
            "skills": ["React", "Node.js"],
            "rating": 4.5,
            "completedTasks": 12
          }
        },
        "coverNote": "...",
        "proposedTimeline": "4 weeks",
        "status": "pending"
      }
    ]
  }
}
```

---

### Accept Application (Business Only)
**PATCH** `/tasks/:taskId/applications/:applicationId/accept`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "application": {
      "_id": "app_id",
      "status": "accepted",
      "acceptedAt": "2024-01-16T10:30:00.000Z"
    },
    "task": {
      "_id": "task_id",
      "status": "in_progress",
      "assignedTo": "fresher_id",
      "milestones": [ ... ]
    }
  }
}
```

**Note:** All other pending applications are automatically rejected.

---

### Submit Milestone (Fresher Only)
**PATCH** `/tasks/:taskId/milestones/:milestoneId/submit`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "submissionLinks": [
    "https://github.com/username/project",
    "https://drive.google.com/file/d/..."
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "task": {
      "_id": "task_id",
      "milestones": [
        {
          "_id": "milestone_id",
          "title": "Architecture & Setup",
          "status": "submitted",
          "submissionLinks": ["..."],
          "submittedAt": "2024-01-20T10:30:00.000Z"
        }
      ]
    }
  }
}
```

---

### Approve Milestone (Business Only)
**PATCH** `/tasks/:taskId/milestones/:milestoneId/approve`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "feedback": "Great work! The architecture looks solid."
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "task": {
      "_id": "task_id",
      "status": "review",
      "milestones": [
        {
          "_id": "milestone_id",
          "status": "approved",
          "feedback": "Great work!",
          "completedAt": "2024-01-21T10:30:00.000Z"
        }
      ]
    }
  }
}
```

**Note:** When all milestones are approved, task status automatically moves to `review`.

---

### Get My Posted Tasks (Business Only)
**GET** `/tasks/my/posted`

**Headers:**
```
Authorization: Bearer <token>
```

---

### Get My Assigned Tasks (Fresher Only)
**GET** `/tasks/my/assigned`

**Headers:**
```
Authorization: Bearer <token>
```

---

## 🔄 Task Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                      TASK LIFECYCLE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────┐    ┌──────────────┐    ┌────────┐    ┌─────────┐│
│   │ OPEN │───▶│ IN_PROGRESS  │───▶│ REVIEW │───▶│COMPLETED││
│   └──┬───┘    └──────┬───────┘    └───┬────┘    └─────────┘│
│      │               │                │                     │
│      │               ▼                │                     │
│      │         ┌──────────┐           │                     │
│      └────────▶│CANCELLED │◀──────────┘                     │
│                └──────────┘                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Milestone System

**Small Tasks (1 milestone):**
```
Final Delivery & Review
```

**Large Tasks (3 milestones):**
```
1. Architecture & Setup (30% of timeline)
2. Beta Review (70% of timeline)
3. Final Production Deployment (100% of timeline)
```

---

## 🛡️ Business Logic Rules

### Profile Scale Check
When a fresher applies to a task:
- ✅ Fresher preference: `both` → Can apply to any scale
- ✅ Fresher preference: `small` → Can only apply to `small` tasks
- ✅ Fresher preference: `large` → Can only apply to `large` tasks
- ❌ Mismatch → 400 Error with descriptive message

### Submission Guard
Before marking a task as `completed`:
- ✅ All milestones must be `approved`
- ✅ At least one deliverable must be provided
- ❌ Missing deliverables → 400 Error

### Status Transition Validation
Only valid transitions are allowed:
- `open` → `in_progress`, `cancelled`
- `in_progress` → `review`, `cancelled`
- `review` → `in_progress`, `completed`, `cancelled`
- `completed` → (none)
- `cancelled` → `open`

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Your work preference is set to \"small\" gigs. This task is a \"large\" scale project."
}
```

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "You are not logged in. Please log in to get access."
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Task not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Something went very wrong!"
}
```

---

## 📊 Database Schema

### User Schema
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'fresher' | 'business' | 'admin',
  fresherProfile: {
    college: String,
    yearOfStudy: String,
    skills: [String],
    preferredWorkScale: 'small' | 'large' | 'both',
    portfolioLinks: [{ title, url }],
    rating: Number,
    totalEarnings: Number,
    completedTasks: Number
  },
  businessProfile: {
    businessName: String,
    businessType: String,
    isVerified: Boolean,
    phone: String,
    address: { street, city, state, zipCode, country },
    totalSpent: Number,
    postedTasks: Number
  },
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Task Schema
```javascript
{
  title: String,
  description: String,
  postedBy: ObjectId (ref: User),
  assignedTo: ObjectId (ref: User),
  status: 'open' | 'in_progress' | 'review' | 'completed' | 'cancelled',
  workScale: 'small' | 'large',
  budget: Number,
  deadline: Date,
  skillsRequired: [String],
  milestones: [{
    title: String,
    description: String,
    status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected',
    dueDate: Date,
    completedAt: Date,
    submissionLinks: [String],
    feedback: String
  }],
  deliverables: [{
    title: String,
    description: String,
    links: [String],
    files: [String],
    submittedAt: Date
  }],
  applicationCount: Number,
  maxApplications: Number,
  tags: [String],
  isUrgent: Boolean,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Application Schema
```javascript
{
  task: ObjectId (ref: Task),
  applicant: ObjectId (ref: User),
  coverNote: String,
  proposedTimeline: String,
  proposedBudget: Number,
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn',
  relevantExperience: String,
  portfolioSamples: [{ title, url }],
  rejectionReason: String,
  acceptedAt: Date,
  rejectedAt: Date,
  withdrawnAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔧 Testing the API

### Using cURL

**Register a Fresher:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "password": "SecurePass123!",
    "role": "fresher",
    "fresherProfile": {
      "college": "MIT",
      "yearOfStudy": "3",
      "skills": ["JavaScript", "React"],
      "preferredWorkScale": "both"
    }
  }'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex@example.com",
    "password": "SecurePass123!"
  }'
```

**Get Tasks:**
```bash
curl http://localhost:5000/api/tasks?scale=small&status=open
```

**Create Task (with token):**
```bash
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Build Website",
    "description": "Create a modern website...",
    "workScale": "small",
    "budget": 500,
    "deadline": "2024-03-01",
    "skillsRequired": ["HTML", "CSS", "JavaScript"]
  }'
```

---

## 📦 Postman Collection

Import the following endpoints into Postman for easy testing:

1. **Environment Variables:**
   - `base_url`: `http://localhost:5000/api`
   - `token`: (set after login)

2. **Pre-request Script for Auth:**
   ```javascript
   pm.request.headers.add({
     key: 'Authorization',
     value: `Bearer ${pm.environment.get('token')}`
   });
   ```

---

## 🚀 Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production MongoDB URI
- [ ] Set appropriate `CLIENT_URL`
- [ ] Enable HTTPS
- [ ] Set up proper logging
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts

---

## 📞 Support

For API support, contact: api-support@lumintern.com