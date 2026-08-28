# LUMINTERN Production Deployment Guide

## Complete Step-by-Step Setup for Netlify, Render & MongoDB Atlas

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [Backend Deployment on Render](#backend-deployment-on-render)
4. [Frontend Deployment on Netlify](#frontend-deployment-on-netlify)
5. [Environment Variables Configuration](#environment-variables-configuration)
6. [Post-Deployment Checklist](#post-deployment-checklist)
7. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:

- ✅ GitHub account with your LUMINTERN repository
- ✅ Node.js 18+ installed locally
- ✅ Git installed and configured
- ✅ Code editor (VS Code recommended)

### Accounts Needed (All Free Tier):

| Service | Purpose | Free Tier Limits |
|---------|---------|------------------|
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Database | 512 MB storage, shared RAM |
| [Render](https://render.com) | Backend API | 750 hours/month, spins down after 15 min |
| [Netlify](https://netlify.com) | Frontend | 100 GB bandwidth/month |

---

## 2. MongoDB Atlas Setup

### Step 2.1: Create MongoDB Atlas Account

1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Click **"Try Free"** or **"Start Free"**
3. Sign up with email or Google/GitHub account
4. Complete the onboarding questionnaire

### Step 2.2: Create a Free Cluster

1. After login, click **"Build a Database"**
2. Select **"M0 FREE"** tier (Shared)
3. Choose a cloud provider:
   - **AWS** (recommended for Render)
   - Select region closest to your Render server (e.g., `us-east-1`)
4. Cluster Name: `LUMINTERN-Cluster` (or keep default)
5. Click **"Create Cluster"**
6. Wait 1-3 minutes for cluster creation

### Step 2.3: Create Database User

1. In the Security section, click **"Database Access"**
2. Click **"Add New Database User"**
3. Authentication Method: **Password**
4. Username: `lumintern_admin`
5. Password: Click **"Autogenerate Secure Password"**
   - ⚠️ **COPY AND SAVE THIS PASSWORD SECURELY!**
6. Database User Privileges: **"Read and write to any database"**
7. Click **"Add User"**

### Step 2.4: Configure Network Access

1. In Security section, click **"Network Access"**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for Render compatibility)
   - This adds `0.0.0.0/0`
4. Click **"Confirm"**

> **Note:** For production, you can restrict IPs after testing.

### Step 2.5: Get Connection String

1. Go to **"Database"** in the left sidebar
2. Click **"Connect"** on your cluster
3. Select **"Connect your application"**
4. Driver: **Node.js**, Version: **5.5 or later**
5. Copy the connection string:
   ```
   mongodb+srv://lumintern_admin:<password>@lumintern-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password
7. Add database name after `.net/`:
   ```
   mongodb+srv://lumintern_admin:YourPassword@lumintern-cluster.xxxxx.mongodb.net/lumintern?retryWrites=true&w=majority
   ```

### Step 2.6: Create Database and Collections

1. Click **"Browse Collections"** on your cluster
2. Click **"Create Database"**
3. Database Name: `lumintern`
4. Collection Name: `users`
5. Click **"Create"**

The other collections will be created automatically by Mongoose.

---

## 3. Backend Deployment on Render

### Step 3.1: Prepare Your Repository

Ensure your backend code is in a `backend/` folder in your repository:

```
lumintern/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── ...
├── frontend/
│   └── ...
└── README.md
```

### Step 3.2: Update package.json

Ensure your `backend/package.json` has:

```json
{
  "name": "lumintern-backend",
  "version": "1.0.0",
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Step 3.3: Update server.js for Production

Key changes needed:

```javascript
// Dynamic port for Render
const PORT = process.env.PORT || 10000;

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// CORS with production URLs
const corsOptions = {
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    'https://lumintern.netlify.app',
  ],
  credentials: true,
};
```

### Step 3.4: Create Render Account

1. Go to [https://render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended for easy repo access)
4. Authorize Render to access your repositories

### Step 3.5: Create New Web Service

1. From Render Dashboard, click **"New +"**
2. Select **"Web Service"**
3. Connect your GitHub repository:
   - If not visible, click **"Configure account"** to grant access
   - Select your `lumintern` repository
4. Click **"Connect"**

### Step 3.6: Configure Web Service

Fill in the following settings:

| Setting | Value |
|---------|-------|
| **Name** | `lumintern-api` |
| **Region** | Choose closest to your users (e.g., Oregon, Frankfurt) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | `Free` |

### Step 3.7: Add Environment Variables

Click **"Advanced"** then **"Add Environment Variable"**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Generate a random 64-character string |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://lumintern.netlify.app` |
| `CLIENT_URL` | `https://lumintern.netlify.app` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` |

### Step 3.8: Generate JWT Secret

Run this in your terminal to generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`.

### Step 3.9: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Run `npm install`
   - Start the server
3. Wait for deployment (2-5 minutes)
4. Your API will be available at: `https://lumintern-api.onrender.com`

### Step 3.10: Verify Deployment

1. Visit `https://lumintern-api.onrender.com/api/health`
2. You should see:
   ```json
   {
     "status": "success",
     "message": "LUMINTERN API is running",
     "environment": "production"
   }
   ```

---

## 4. Frontend Deployment on Netlify

### Step 4.1: Update Frontend Configuration

Create/update `frontend/.env.production`:

```env
VITE_API_URL=https://lumintern-api.onrender.com
VITE_SOCKET_URL=https://lumintern-api.onrender.com
```

### Step 4.2: Update API Configuration

Ensure your frontend uses the environment variable:

```javascript
// frontend/src/config/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
```

### Step 4.3: Create Netlify Account

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click **"Sign up"**
3. Sign up with **GitHub** (recommended)

### Step 4.4: Add New Site

1. From Netlify Dashboard, click **"Add new site"**
2. Select **"Import an existing project"**
3. Choose **"GitHub"**
4. Authorize Netlify to access your repositories
5. Select your `lumintern` repository

### Step 4.5: Configure Build Settings

| Setting | Value |
|---------|-------|
| **Branch to deploy** | `main` |
| **Base directory** | `frontend` |
| **Build command** | `npm run build` |
| **Publish directory** | `frontend/dist` |

### Step 4.6: Add Environment Variables

1. Go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**
3. Add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://lumintern-api.onrender.com` |
| `VITE_SOCKET_URL` | `https://lumintern-api.onrender.com` |

### Step 4.7: Deploy Site

1. Click **"Deploy site"**
2. Wait for build (2-5 minutes)
3. Your site will be available at: `https://random-name.netlify.app`

### Step 4.8: Change Site Name (Optional)

1. Go to **Site settings** → **General**
2. Click **"Change site name"**
3. Enter: `lumintern`
4. Your URL becomes: `https://lumintern.netlify.app`

### Step 4.9: Update Backend CORS

After getting your Netlify URL, update Render environment variables:

1. Go to Render Dashboard → Your service → **Environment**
2. Update:
   - `FRONTEND_URL` = `https://lumintern.netlify.app`
   - `CLIENT_URL` = `https://lumintern.netlify.app`
3. Save and redeploy

---

## 5. Environment Variables Configuration

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `10000` |
| `MONGODB_URI` | Database connection | `mongodb+srv://...` |
| `JWT_SECRET` | Token secret | `a1b2c3d4...` (64 chars) |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `FRONTEND_URL` | Allowed origin | `https://lumintern.netlify.app` |
| `CLIENT_URL` | Socket.io origin | `https://lumintern.netlify.app` |

### Frontend (Netlify)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://lumintern-api.onrender.com` |
| `VITE_SOCKET_URL` | Socket.io URL | `https://lumintern-api.onrender.com` |

---

## 6. Post-Deployment Checklist

### ✅ Backend Verification

- [ ] Health endpoint responds: `/api/health`
- [ ] Database connection successful
- [ ] CORS allows frontend origin
- [ ] Environment variables loaded
- [ ] No console errors in Render logs

### ✅ Frontend Verification

- [ ] Site loads without errors
- [ ] API calls succeed (check Network tab)
- [ ] Socket.io connects
- [ ] Authentication works
- [ ] All pages render correctly

### ✅ Security Verification

- [ ] JWT_SECRET is strong and unique
- [ ] MONGODB_URI not exposed in frontend
- [ ] CORS only allows your domains
- [ ] Rate limiting is active
- [ ] HTTPS is enforced

---

## 7. Troubleshooting

### Common Issues

#### Backend won't start
**Error:** `MongoDB connection error`

**Solution:**
1. Check MONGODB_URI format
2. Ensure password doesn't contain special characters (URL encode if needed)
3. Verify IP whitelist includes `0.0.0.0/0`

#### CORS errors in frontend
**Error:** `Access-Control-Allow-Origin` missing

**Solution:**
1. Verify `FRONTEND_URL` in Render matches your Netlify URL exactly
2. Include both `https://lumintern.netlify.app` and `https://www.lumintern.netlify.app`
3. Redeploy backend after changing environment variables

#### Render service spins down
**Note:** Free tier spins down after 15 minutes of inactivity

**Solution:**
- First request after idle takes 30-60 seconds (cold start)
- Use a cron job to ping `/api/health` every 10 minutes
- Upgrade to paid plan for always-on service

#### Socket.io not connecting
**Error:** WebSocket connection failed

**Solution:**
1. Ensure `CLIENT_URL` matches frontend URL
2. Check if Render allows WebSocket connections (it does)
3. Verify frontend connects to correct URL

### Useful Commands

```bash
# Check Render logs
# Go to Render Dashboard → Your Service → Logs

# Test API locally
curl http://localhost:10000/api/health

# Test production API
curl https://lumintern-api.onrender.com/api/health

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Test MongoDB connection
node -e "require('mongoose').connect('YOUR_URI').then(() => console.log('Connected!')).catch(console.error)"
```

---

## 8. Custom Domain Setup (Optional)

### For Netlify (Frontend)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter your domain: `www.lumintern.com`
4. Follow DNS configuration instructions
5. Enable HTTPS (automatic with Netlify)

### For Render (Backend)

1. Go to your service → **Settings**
2. Scroll to **"Custom Domains"**
3. Click **"Add Custom Domain"**
4. Enter: `api.lumintern.com`
5. Add CNAME record in your DNS:
   ```
   api.lumintern.com → lumintern-api.onrender.com
   ```

---

## 9. Monitoring & Maintenance

### Render Monitoring

1. **Logs:** Dashboard → Service → Logs
2. **Metrics:** Dashboard → Service → Metrics
3. **Events:** Dashboard → Service → Events

### MongoDB Atlas Monitoring

1. **Metrics:** Atlas Dashboard → Metrics
2. **Performance:** Atlas Dashboard → Performance Advisor
3. **Alerts:** Atlas Dashboard → Alerts

### Recommended Monitoring Tools

- **Uptime:** [UptimeRobot](https://uptimerobot.com) (free)
- **Error Tracking:** [Sentry](https://sentry.io) (free tier)
- **Analytics:** [Google Analytics](https://analytics.google.com)

---

## 10. Cost Summary

### Free Tier Limits

| Service | Free Limit | Sufficient For |
|---------|------------|----------------|
| MongoDB Atlas | 512 MB storage | ~10,000 users |
| Render | 750 hours/month | Low-traffic apps |
| Netlify | 100 GB bandwidth | ~50,000 visits/month |

### When to Upgrade

- **MongoDB:** When storage exceeds 500 MB
- **Render:** When you need always-on (no cold starts)
- **Netlify:** When bandwidth exceeds 100 GB

---

## 📞 Support

For deployment issues:
- **Render:** [render.com/docs](https://render.com/docs)
- **Netlify:** [docs.netlify.com](https://docs.netlify.com)
- **MongoDB Atlas:** [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)

---

## 🎉 Congratulations!

Your LUMINTERN platform is now live in production!

- **Frontend:** https://lumintern.netlify.app
- **Backend API:** https://lumintern-api.onrender.com
- **API Health:** https://lumintern-api.onrender.com/api/health

Share your platform and start connecting freshers with businesses! 🚀