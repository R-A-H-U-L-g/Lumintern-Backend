# LUMINTERN Deployment Checklist

## Pre-Deployment

### Code Preparation
- [ ] All code committed and pushed to GitHub
- [ ] `backend/package.json` has `"start": "node server.js"`
- [ ] `backend/server.js` uses `process.env.PORT || 10000`
- [ ] CORS configured with production frontend URL
- [ ] No hardcoded localhost URLs in production code
- [ ] Environment variables documented

### MongoDB Atlas
- [ ] Account created at mongodb.com/atlas
- [ ] Free M0 cluster created
- [ ] Database user created with strong password
- [ ] Network access allows 0.0.0.0/0
- [ ] Connection string copied and secured
- [ ] Database `lumintern` created

---

## Backend Deployment (Render)

### Account Setup
- [ ] Render account created at render.com
- [ ] GitHub repository connected

### Service Configuration
- [ ] New Web Service created
- [ ] Repository selected
- [ ] Root directory set to `backend`
- [ ] Runtime set to Node
- [ ] Build command: `npm install`
- [ ] Start command: `node server.js`
- [ ] Instance type: Free

### Environment Variables
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `MONGODB_URI` = MongoDB Atlas connection string
- [ ] `JWT_SECRET` = Generated 64-char secret
- [ ] `JWT_EXPIRES_IN` = `7d`
- [ ] `FRONTEND_URL` = Netlify URL
- [ ] `CLIENT_URL` = Netlify URL

### Deployment
- [ ] Service deployed successfully
- [ ] Health endpoint responds: `/api/health`
- [ ] No errors in Render logs

---

## Frontend Deployment (Netlify)

### Code Preparation
- [ ] `.env.production` created with API URL
- [ ] API config uses environment variable
- [ ] Build command works locally: `npm run build`

### Account Setup
- [ ] Netlify account created at app.netlify.com
- [ ] GitHub repository connected

### Site Configuration
- [ ] New site created from GitHub
- [ ] Base directory: `frontend`
- [ ] Build command: `npm run build`
- [ ] Publish directory: `frontend/dist`

### Environment Variables
- [ ] `VITE_API_URL` = Render backend URL
- [ ] `VITE_SOCKET_URL` = Render backend URL

### Deployment
- [ ] Site deployed successfully
- [ ] Site loads without errors
- [ ] API calls work (check Network tab)

---

## Post-Deployment Verification

### Backend
- [ ] `GET /api/health` returns success
- [ ] Database connection confirmed
- [ ] CORS allows frontend origin
- [ ] Rate limiting active
- [ ] Socket.io connections work

### Frontend
- [ ] Homepage loads
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard displays data
- [ ] Real-time features work

### Security
- [ ] HTTPS enforced on both services
- [ ] JWT_SECRET is strong and unique
- [ ] No secrets exposed in frontend code
- [ ] CORS only allows specified domains
- [ ] Rate limiting prevents abuse

---

## Custom Domain (Optional)

### Netlify
- [ ] Custom domain added in Netlify
- [ ] DNS records configured
- [ ] SSL certificate provisioned

### Render
- [ ] Custom domain added in Render
- [ ] CNAME record points to Render
- [ ] SSL certificate provisioned

---

## Monitoring Setup

- [ ] UptimeRobot configured for health checks
- [ ] MongoDB Atlas alerts configured
- [ ] Render notifications enabled
- [ ] Error tracking (Sentry) configured

---

## Sign-Off

| Task | Completed By | Date |
|------|--------------|------|
| Backend Deployed | _____________ | ________ |
| Frontend Deployed | _____________ | ________ |
| Database Configured | _____________ | ________ |
| Security Verified | _____________ | ________ |
| Testing Complete | _____________ | ________ |

---

## Emergency Contacts

- **Render Support:** https://render.com/support
- **Netlify Support:** https://www.netlify.com/support/
- **MongoDB Support:** https://support.mongodb.com

---

## Rollback Plan

If issues occur:

1. **Frontend:** Netlify → Deploys → Click "..." → "Restore to this deploy"
2. **Backend:** Render → Events → Find last successful deploy → "Restore"
3. **Database:** MongoDB Atlas → Backup → Restore from snapshot

---

✅ **Deployment Complete!**

Your LUMINTERN platform is now live at:
- Frontend: https://lumintern.netlify.app
- Backend: https://lumintern-api.onrender.com