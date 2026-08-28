# MongoDB Atlas Setup Guide - Complete Step-by-Step

## 🎯 What We're Doing

Setting up a free cloud database that stores all LUMINTERN data (users, tasks, payments, etc.)

---

## STEP 1: Create MongoDB Atlas Account

### 1.1 Go to MongoDB Atlas
```
Open browser → Go to: https://www.mongodb.com/atlas
```

### 1.2 Sign Up
```
Click "Try Free" button (top right corner)
```

### 1.3 Choose Sign Up Method
```
You'll see options:
┌─────────────────────────────────────┐
│         Sign Up for MongoDB Atlas    │
├─────────────────────────────────────┤
│                                      │
│  [Sign up with Google]  ← CLICK THIS│
│                                      │
│  [Sign up with GitHub]              │
│                                      │
│  Or sign up with email:             │
│  Email: [your-email@gmail.com]      │
│  Password: [create-password]        │
│  [Create Account]                   │
│                                      │
└─────────────────────────────────────┘

✅ RECOMMENDED: Click "Sign up with Google" (easiest)
```

### 1.4 Complete Profile
```
You'll see: "Tell us a bit about yourself"

┌─────────────────────────────────────┐
│ What is your primary goal?          │
│                                     │
│ ○ Learn MongoDB                     │
│ ● Build a new application  ← SELECT│
│ ○ Evaluate for work                 │
│ ○ Other                             │
├─────────────────────────────────────┤
│ What is your primary language?      │
│                                     │
│ ● JavaScript  ← SELECT THIS         │
│ ○ Python                            │
│ ○ Java                              │
│ ○ C#                                │
│ ○ Other                             │
├─────────────────────────────────────┤
│ [Finish]  ← CLICK                   │
└─────────────────────────────────────┘
```

---

## STEP 2: Create Free Database Cluster

### 2.1 You'll See the Deployment Page
```
┌─────────────────────────────────────────────────────────┐
│                    Create a cluster                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Choose a cloud provider and region                      │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   AWS    │  │  Google  │  │  Azure   │              │
│  │  ☑️      │  │          │  │          │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                          │
│  Region: [N. Virginia (us-east-1) ▼]                    │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  Cluster Tier:                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  M0 FREE  ← SELECT THIS ONE                     │   │
│  │  Shared • 512 MB Storage • Shared RAM            │   │
│  │  $0/month forever                                │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  M10 Dedicated                                   │   │
│  │  $57/month                                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  Cluster Name: [Cluster0 ▼]  (keep default)             │
│                                                          │
│  [Create Cluster]  ← CLICK THIS                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Exact Selections:
```
✅ Cloud Provider: AWS (Amazon Web Services)
✅ Region: N. Virginia (us-east-1) - or closest to you
✅ Cluster Tier: M0 FREE (Shared)
✅ Cluster Name: Cluster0 (keep default)
```

### 2.3 Click "Create Cluster"
```
Wait 1-3 minutes while cluster is created...
You'll see a loading animation.
```

---

## STEP 3: Create Database User

### 3.1 Security Quickstart Appears
```
┌─────────────────────────────────────────────────────────┐
│              Security Quickstart                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  How would you like to authenticate your connection?     │
│                                                          │
│  ● Username and Password  ← SELECT THIS                  │
│  ○ AWS IAM                                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Enter Username and Password
```
┌─────────────────────────────────────────────────────────┐
│              Create a database user                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Username: [lumintern_admin]  ← TYPE THIS                │
│                                                          │
│  Password: [Auto Generate]  ← CLICK THIS BUTTON         │
│            OR type your own (min 8 chars)                │
│                                                          │
│  ⚠️ IMPORTANT: COPY AND SAVE THIS PASSWORD!              │
│  Example: xK9mP2nQ7wR5tY                               │
│                                                          │
│  [Create User]  ← CLICK                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3.3 SAVE YOUR PASSWORD!
```
┌─────────────────────────────────────────┐
│  📋 COPY THIS NOW!                      │
│                                          │
│  Username: lumintern_admin               │
│  Password: xK9mP2nQ7wR5tY (example)     │
│                                          │
│  Save in: Notes / Password Manager       │
│                                          │
│  ⚠️ You CANNOT see this password again!  │
└─────────────────────────────────────────┘
```

---

## STEP 4: Configure Network Access

### 4.1 Add IP Address
```
┌─────────────────────────────────────────────────────────┐
│              Where would you like to connect from?       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Add My Current IP Address]                             │
│                                                          │
│  [Add a Different IP Address]                            │
│                                                          │
│  [Allow Access from Anywhere]  ← CLICK THIS              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Confirm
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  IP Address: 0.0.0.0/0                                  │
│  Description: Allow access from anywhere                 │
│                                                          │
│  [Add Entry]  ← CLICK                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Click "Finish and Close"
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  [Finish and Close]  ← CLICK                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## STEP 5: Get Connection String

### 5.1 Go to Database Section
```
Left sidebar → Click "Database"
```

### 5.2 Click "Connect"
```
┌─────────────────────────────────────────────────────────┐
│  Cluster0                                    [Connect] ← │
│  M0 FREE • AWS • us-east-1                              │
│  Status: Active                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Choose Connection Method
```
┌─────────────────────────────────────────────────────────┐
│              Connect to Cluster0                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Choose a connection method:                             │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Connect with MongoDB for VS Code]             │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Connect using MongoDB Compass]                │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [Connect your application]  ← CLICK THIS       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.4 Copy Connection String
```
┌─────────────────────────────────────────────────────────┐
│              Connect your application                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Driver: Node.js  ← SELECT THIS                          │
│  Version: 5.5 or later  ← SELECT THIS                   │
│                                                          │
│  Connection string:                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ mongodb+srv://lumintern_admin:<password>@cluster │   │
│  │ 0.abc123.mongodb.net/?retryWrites=true&w=majori │   │
│  │ ty                                               │   │
│  │                                    [Copy] ← CLICK│   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ⚠️ Replace <password> with your actual password         │
│                                                          │
│  [Done]  ← CLICK                                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.5 Your Final Connection String
```
ORIGINAL (from MongoDB):
mongodb+srv://lumintern_admin:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority

AFTER REPLACING PASSWORD:
mongodb+srv://lumintern_admin:xK9mP2nQ7wR5tY@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority

ADD DATABASE NAME (add /lumintern before ?):
mongodb+srv://lumintern_admin:xK9mP2nQ7wR5tY@cluster0.abc123.mongodb.net/lumintern?retryWrites=true&w=majority
```

---

## STEP 6: Create Database (Optional - Auto-Created)

### 6.1 Go to Collections
```
Left sidebar → Click "Browse Collections"
```

### 6.2 Create Database
```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  [Create Database]  ← CLICK                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Enter Details
```
┌─────────────────────────────────────────────────────────┐
│              Create Database                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Database Name: [lumintern]  ← TYPE THIS                 │
│                                                          │
│  Collection Name: [users]  ← TYPE THIS                   │
│                                                          │
│  [Create]  ← CLICK                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘

Note: Other collections (tasks, wallets, etc.) will be 
created automatically by Mongoose when the app runs.
```

---

## STEP 7: Link to LUMINTERN Project

### 7.1 Create .env File in Backend
```
In your backend/ folder, create a file named .env
```

### 7.2 Add Connection String
```env
# backend/.env

# MongoDB Connection
MONGODB_URI=mongodb+srv://lumintern_admin:xK9mP2nQ7wR5tY@cluster0.abc123.mongodb.net/lumintern?retryWrites=true&w=majority

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your_generated_secret_here

# Other variables
NODE_ENV=development
PORT=10000
JWT_EXPIRES_IN=7d
```

### 7.3 For Render (Production)
```
In Render Dashboard → Environment → Add:

Key: MONGODB_URI
Value: mongodb+srv://lumintern_admin:xK9mP2nQ7wR5tY@cluster0.abc123.mongodb.net/lumintern?retryWrites=true&w=majority
```

---

## STEP 8: Test Connection

### 8.1 Run Backend Locally
```bash
cd backend
npm install
npm run dev
```

### 8.2 Look for Success Message
```
✅ MongoDB connected successfully
📊 Database: mongodb+srv://lumintern_admin:***@cluster0.abc123.mongodb.net/lumintern
🚀 LUMINTERN API running on port 10000
```

### 8.3 If Error Appears
```
❌ MongoDB connection error: ...

Common fixes:
1. Check password is correct (no < > brackets)
2. Check username is correct
3. Check IP whitelist includes 0.0.0.0/0
4. Check connection string format
```

---

## 📋 Quick Reference Card

### Your MongoDB Atlas Credentials:
```
┌─────────────────────────────────────────┐
│  MONGODB ATLAS CREDENTIALS              │
├─────────────────────────────────────────┤
│                                          │
│  Username: lumintern_admin               │
│  Password: [your saved password]         │
│  Cluster: cluster0.abc123.mongodb.net    │
│  Database: lumintern                     │
│                                          │
│  Connection String:                      │
│  mongodb+srv://lumintern_admin:          │
│  [PASSWORD]@cluster0.abc123.mongodb.net  │
│  /lumintern?retryWrites=true&w=majority  │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Error: "Authentication failed"
```
Fix: Check username and password are correct
     Make sure no < > brackets in password
```

### Error: "IP not whitelisted"
```
Fix: Go to Network Access → Add IP → Allow from anywhere (0.0.0.0/0)
```

### Error: "Connection timeout"
```
Fix: Check internet connection
     Try different region (us-east-1 recommended)
```

### Error: "Database not found"
```
Fix: Database is auto-created when first document is inserted
     Just run the app and it will create automatically
```

---

## ✅ Checklist

- [ ] MongoDB Atlas account created
- [ ] M0 FREE cluster created
- [ ] Database user created (username + password saved)
- [ ] Network access allows 0.0.0.0/0
- [ ] Connection string copied
- [ ] Password replaced in connection string
- [ ] /lumintern added to connection string
- [ ] .env file created in backend folder
- [ ] Connection string added to .env
- [ ] Connection tested successfully

---

## 🎉 Done!

Your MongoDB Atlas database is now connected to LUMINTERN!

**Next Steps:**
1. Deploy backend to Render
2. Add the same MONGODB_URI to Render environment variables
3. Deploy frontend to Netlify

**Your connection string (save this):**
```
mongodb+srv://lumintern_admin:YOUR_PASSWORD@cluster0.XXXXX.mongodb.net/lumintern?retryWrites=true&w=majority
```