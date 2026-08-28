# LUMINTERN Backend API

A complete backend API for the LUMINTERN dual-sided marketplace platform connecting freshers with businesses.

## 🚀 Features

- **Dual User Roles**: Freshers and Businesses with role-specific profiles
- **Task Management**: Small gigs and large project support
- **Application System**: Freshers can apply to tasks with cover notes
- **Milestone Tracking**: Automated milestone creation based on task scale
- **Professional Workflow**: Enforced business logic for task lifecycle
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Protected routes with role verification

## 📁 Project Structure

```
backend/
├── controllers/
│   ├── authController.js      # Authentication logic
│   └── taskController.js      # Task management logic
├── middleware/
│   ├── auth.js                # JWT & role-based auth
│   ├── errorHandler.js        # Global error handling
│   └── workflow.js            # Business logic middleware
├── models/
│   ├── User.js                # User schema (Fresher/Business)
│   ├── Task.js                # Task schema with milestones
│   └── Application.js         # Application schema
├── routes/
│   ├── authRoutes.js          # Auth endpoints
│   └── taskRoutes.js          # Task endpoints
├── .env.example               # Environment variables template
├── package.json               # Dependencies
└── server.js                  # Main server file
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd lumintern/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running locally or update MONGODB_URI in .env
   ```

5. **Run the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login user | Public |
| GET | `/api/auth/me` | Get current user | Protected |
| PATCH | `/api/auth/updateMe` | Update profile | Protected |
| PATCH | `/api/auth/updatePassword` | Update password | Protected |

### Tasks

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/tasks` | Get all tasks (with filters) | Public |
| GET | `/api/tasks/:id` | Get single task | Public |
| POST | `/api/tasks` | Create new task | Business |
| PATCH | `/api/tasks/:id` | Update task | Business (owner) |
| PATCH | `/api/tasks/:taskId/status` | Update task status | Business |
| POST | `/api/tasks/:taskId/apply` | Apply to task | Fresher |
| GET | `/api/tasks/my/posted` | Get my posted tasks | Business |
| GET | `/api/tasks/my/assigned` | Get my assigned tasks | Fresher |

### Applications

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/tasks/:taskId/applications` | Get task applications | Business |
| PATCH | `/api/tasks/:taskId/applications/:appId/accept` | Accept application | Business |

### Milestones

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| PATCH | `/api/tasks/:taskId/milestones/:milestoneId/submit` | Submit milestone | Fresher |
| PATCH | `/api/tasks/:taskId/milestones/:milestoneId/approve` | Approve milestone | Business |

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 📝 Request Examples

### Register a Fresher
```json
POST /api/auth/register
{
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "password": "SecurePass123!",
  "role": "fresher",
  "fresherProfile": {
    "college": "MIT",
    "yearOfStudy": "3",
    "skills": ["JavaScript", "React", "Node.js"],
    "preferredWorkScale": "both"
  }
}
```

### Register a Business
```json
POST /api/auth/register
{
  "name": "John Smith",
  "email": "john@business.com",
  "password": "SecurePass123!",
  "role": "business",
  "businessProfile": {
    "businessName": "TechCorp Solutions",
    "businessType": "startup",
    "phone": "+1234567890"
  }
}
```

### Create a Task
```json
POST /api/tasks
{
  "title": "Build E-commerce Website",
  "description": "Create a full-stack e-commerce platform...",
  "workScale": "large",
  "budget": 2500,
  "deadline": "2024-03-15",
  "skillsRequired": ["React", "Node.js", "MongoDB"],
  "tags": ["e-commerce", "web development"]
}
```

### Apply to a Task
```json
POST /api/tasks/:taskId/apply
{
  "coverNote": "I have 3 years of experience...",
  "proposedTimeline": "4 weeks",
  "proposedBudget": 2200,
  "relevantExperience": "Built similar platforms...",
  "portfolioSamples": [
    { "title": "E-commerce Project", "url": "https://..." }
  ]
}
```

## 🔄 Task Lifecycle

```
open → in_progress → review → completed
  ↓         ↓           ↓
cancelled cancelled   cancelled
```

### Milestone System

**Small Tasks**: Single milestone
- Final Delivery & Review

**Large Tasks**: Three milestones
1. Architecture & Setup (30% of timeline)
2. Beta Review (70% of timeline)
3. Final Production Deployment (100% of timeline)

## 🛡️ Business Logic

### Profile Scale Check
- Freshers can only apply to tasks matching their preferred work scale
- Scale preference: `small`, `large`, or `both`

### Submission Guard
- All milestones must be approved before task completion
- Deliverables must be provided before marking as completed

### Status Transitions
- Valid transitions are enforced programmatically
- Invalid transitions return appropriate error messages

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/lumintern |
| JWT_SECRET | JWT secret key | (required) |
| JWT_EXPIRES_IN | JWT expiration | 7d |
| CLIENT_URL | Frontend URL for CORS | http://localhost:3000 |

## 📊 Database Indexes

### User Model
- `email` (unique)
- `role`
- `fresherProfile.skills`
- `businessProfile.isVerified`

### Task Model
- `status`
- `workScale`
- `skillsRequired`
- `postedBy`
- `assignedTo`
- `deadline`
- Compound: `status + workScale`

### Application Model
- `task`
- `applicant`
- `status`
- Compound: `task + applicant` (unique)

## 🚨 Error Handling

The API returns consistent error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## 📦 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **morgan** - HTTP request logger

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.