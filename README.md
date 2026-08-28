# LUMINTERN - Marketplace Platform

A dual-sided marketplace connecting freshers with local businesses for tech tasks.

## Project Structure

```
lumintern/
├── frontend/          # Static HTML frontend (deploy to Netlify)
│   ├── index.html     # Landing page
│   ├── register.html  # Registration
│   ├── dashboard.html # Fresher dashboard
│   └── ...
│
├── backend/           # Node.js API (deploy to Render)
│   ├── server.js      # Main server
│   ├── models/        # Database schemas
│   ├── controllers/   # Business logic
│   └── ...
│
└── netlify.toml       # Netlify configuration
```

## Quick Start

### Frontend (Netlify)
1. Connect GitHub repository to Netlify
2. Set base directory: `frontend`
3. Set publish directory: `frontend`
4. Deploy

### Backend (Render)
1. Connect GitHub repository to Render
2. Set root directory: `backend`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables
6. Deploy

## Environment Variables

### Backend (Render)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://lumintern.netlify.app
CLIENT_URL=https://lumintern.netlify.app
```

### Frontend (Netlify)
```
VITE_API_URL=https://lumintern-api.onrender.com
```

## Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [File Manifest](FILE_MANIFEST.md)
- [MongoDB Setup](MONGODB_SETUP_GUIDE.md)

## URLs

- **Frontend:** https://lumintern.netlify.app
- **Backend:** https://lumintern-api.onrender.com
- **API Health:** https://lumintern-api.onrender.com/api/health

## License

MIT