# LUMINTERN - Complete File Manifest & Upload Guide

## 📁 Where Every File Goes

---

## PLATFORM 1: GITHUB (Your Code Repository)

**What:** Store all your code
**URL:** https://github.com
**Account:** Free

### Upload This Folder Structure:

```
lumintern/                          ← Main repository folder
│
├── frontend/                       ← ALL HTML files go here
│   ├── index.html                  ← Landing page
│   ├── register.html               ← Registration page
│   ├── dashboard.html              ← Fresher dashboard
│   ├── admin-dashboard.html        ← Admin dispute resolution
│   ├── admin-master-dashboard.html ← Admin master control
│   ├── qr-poster.html              ← QR code generator
│   ├── gamification-profile.html   ← XP & levels page
│   ├── motion-ui.html              ← Motion UI demo
│   └── src/
│       └── config/
│           └── api.js              ← API configuration
│
├── backend/                        ← ALL backend files go here
│   ├── server.js                   ← Main server file
│   ├── package.json                ← Dependencies list
│   ├── .env.example                ← Environment template
│   ├── render.yaml                 ← Render config (optional)
│   │
│   ├── models/                     ← Database schemas
│   │   ├── User.js
│   │   ├── Task.js
│   │   ├── Application.js
│   │   ├── Wallet.js
│   │   ├── TransactionLedger.js
│   │   ├── ChatRoom.js
│   │   ├── ChatMessage.js
│   │   ├── Notification.js
│   │   ├── GlobalSetting.js
│   │   └── AuditLog.js
│   │
│   ├── controllers/                ← Business logic
│   │   ├── authController.js
│   │   ├── taskController.js
│   │   ├── paymentController.js
│   │   ├── chatController.js
│   │   ├── walletController.js
│   │   ├── adminController.js
│   │   ├── adminDisputeController.js
│   │   ├── adminMasterController.js
│   │   ├── qrController.js
│   │   ├── contractController.js
│   │   ├── gamificationController.js
│   │   ├── notificationController.js
│   │   └── deploymentController.js
│   │
│   ├── routes/                     ← API endpoints
│   │   ├── authRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── walletRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── adminDisputeRoutes.js
│   │   ├── adminMasterRoutes.js
│   │   ├── qrRoutes.js
│   │   ├── contractRoutes.js
│   │   ├── gamificationRoutes.js
│   │   ├── notificationRoutes.js
│   │   └── deploymentRoutes.js
│   │
│   ├── middleware/                  ← Auth & validation
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── workflow.js
│   │
│   ├── socket/                     ← Real-time chat
│   │   └── socketManager.js
│   │
│   ├── utils/                      ← Helper functions
│   │   ├── gamification.js
│   │   ├── contractGenerator.js
│   │   ├── workNotificationEngine.js
│   │   └── deploymentPdfGenerator.js
│   │
│   └── jobs/                       ← Background tasks
│       └── autoRelease.js
│
├── DEPLOYMENT_GUIDE.md             ← Deployment instructions
├── DEPLOYMENT_CHECKLIST.md         ← Pre/post checklist
├── FILE_MANIFEST.md                ← This file
└── README.md                       ← Project overview
```

---

## PLATFORM 2: MONGODB ATLAS (Database)

**What:** Your database
**URL:** https://www.mongodb.com/atlas
**Account:** Free (512 MB)
**Upload:** Nothing - database is created automatically

### Setup Steps:
1. Create account
2. Create M0 cluster (free)
3. Create database user (save password!)
4. Allow access from anywhere (0.0.0.0/0)
5. Copy connection string

### Your Connection String:
```
mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/lumintern?retryWrites=true&w=majority
```

---

## PLATFORM 3: RENDER (Backend Hosting)

**What:** Runs your Node.js backend
**URL:** https://render.com
**Account:** Free (750 hrs/month)
**Upload:** Connects to GitHub automatically

### What Goes Here:
- Everything in the `backend/` folder
- Render reads from GitHub automatically

### Settings:
| Setting | Value |
|---------|-------|
| Name | lumintern-api |
| Root Directory | backend |
| Build Command | npm install |
| Start Command | node server.js |
| Instance Type | Free |

### Environment Variables to Add:
| Key | Value |
|-----|-------|
| NODE_ENV | production |
| PORT | 10000 |
| MONGODB_URI | (your MongoDB connection string) |
| JWT_SECRET | (generate 64-char random string) |
| JWT_EXPIRES_IN | 7d |
| FRONTEND_URL | https://lumintern.netlify.app |
| CLIENT_URL | https://lumintern.netlify.app |

---

## PLATFORM 4: NETLIFY (Frontend Hosting)

**What:** Serves your HTML pages
**URL:** https://app.netlify.com
**Account:** Free (100 GB bandwidth)
**Upload:** Connects to GitHub automatically

### What Goes Here:
- Everything in the `frontend/` folder
- Netlify reads from GitHub automatically

### Settings:
| Setting | Value |
|---------|-------|
| Base directory | frontend |
| Build command | (leave empty) |
| Publish directory | frontend |

### Environment Variables to Add:
| Key | Value |
|-----|-------|
| VITE_API_URL | https://lumintern-api.onrender.com |

---

## 📋 Step-by-Step Upload Process

### STEP 1: Create GitHub Repository (5 min)

```bash
# 1. Go to github.com and create new repository
#    Name: lumintern
#    Visibility: Private (recommended)

# 2. On your computer, open terminal in project folder
cd lumintern

# 3. Initialize git
git init

# 4. Add all files
git add .

# 5. Commit
git commit -m "Initial LUMINTERN platform"

# 6. Connect to GitHub
git remote add origin https://github.com/YOUR_USERNAME/lumintern.git

# 7. Push
git branch -M main
git push -u origin main
```

### STEP 2: Setup MongoDB Atlas (10 min)

1. Go to https://www.mongodb.com/atlas
2. Sign up (free)
3. Create M0 cluster
4. Create database user:
   - Username: `lumintern_admin`
   - Password: (copy and save!)
5. Network Access → Add IP → Allow from anywhere
6. Connect → Copy connection string
7. Replace `<password>` with your password
8. Save this string for Render

### STEP 3: Deploy Backend on Render (15 min)

1. Go to https://render.com
2. Sign up with GitHub
3. New → Web Service
4. Connect your `lumintern` repository
5. Configure:
   - Name: `lumintern-api`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`
6. Add Environment Variables (see table above)
7. Click "Create Web Service"
8. Wait 3-5 minutes
9. Copy your URL: `https://lumintern-api.onrender.com`

### STEP 4: Deploy Frontend on Netlify (10 min)

1. Go to https://app.netlify.com
2. Sign up with GitHub
3. Add new site → Import from GitHub
4. Select `lumintern` repository
5. Configure:
   - Base directory: `frontend`
   - Publish directory: `frontend`
6. Add Environment Variable:
   - `VITE_API_URL` = `https://lumintern-api.onrender.com`
7. Deploy site
8. Change site name to `lumintern`
9. Your URL: `https://lumintern.netlify.app`

### STEP 5: Update Backend CORS (2 min)

1. Go to Render Dashboard
2. Your service → Environment
3. Verify:
   - `FRONTEND_URL` = `https://lumintern.netlify.app`
   - `CLIENT_URL` = `https://lumintern.netlify.app`
4. Save (triggers redeploy)

### STEP 6: Test (10 min)

1. Visit https://lumintern.netlify.app
2. Register a test account
3. Test all features

---

## 🔐 Generate JWT Secret

Run this in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use as `JWT_SECRET` in Render.

---

## 📊 File Count Summary

| Location | Files | Platform |
|----------|-------|----------|
| Frontend HTML | 8 files | Netlify |
| Frontend Config | 1 file | Netlify |
| Backend Models | 10 files | Render |
| Backend Controllers | 13 files | Render |
| Backend Routes | 13 files | Render |
| Backend Middleware | 3 files | Render |
| Backend Utils | 4 files | Render |
| Backend Socket | 1 file | Render |
| Backend Jobs | 1 file | Render |
| Backend Config | 3 files | Render |
| Documentation | 5+ files | GitHub |
| **TOTAL** | **62+ files** | **4 platforms** |

---

## 💰 Cost Summary

| Platform | Service | Cost | What You Get |
|----------|---------|------|--------------|
| GitHub | Repository | $0 | Code storage |
| MongoDB Atlas | Database | $0 | 512 MB storage |
| Render | Backend | $0 | 750 hrs/month |
| Netlify | Frontend | $0 | 100 GB bandwidth |
| **TOTAL** | | **$0/month** | Full platform |

---

## 🆘 Quick Reference

### Your URLs After Deployment:
| What | URL |
|------|-----|
| Website | https://lumintern.netlify.app |
| API | https://lumintern-api.onrender.com |
| Health Check | https://lumintern-api.onrender.com/api/health |
| Database | MongoDB Atlas Dashboard |

### Support Links:
- GitHub: https://github.com
- MongoDB Atlas: https://cloud.mongodb.com
- Render: https://dashboard.render.com
- Netlify: https://app.netlify.com

---

## ✅ Checklist

### Before Upload:
- [ ] All files organized in correct folders
- [ ] No sensitive data in code (passwords, keys)
- [ ] .env files not included in git

### After Upload:
- [ ] GitHub repository created
- [ ] MongoDB Atlas cluster running
- [ ] Render backend deployed
- [ ] Netlify frontend deployed
- [ ] Environment variables set
- [ ] Health endpoint working
- [ ] Registration working
- [ ] Login working

---

🎉 **You're ready to deploy!**