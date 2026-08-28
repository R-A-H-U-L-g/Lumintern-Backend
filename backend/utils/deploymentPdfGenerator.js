import PDFDocument from 'pdfkit';
import fs from 'fs';

// ====================
// GENERATE DEPLOYMENT PDF
// ====================
export const generateDeploymentPDF = async (outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: 'LUMINTERN Deployment Guide',
          Author: 'LUMINTERN Team',
          Subject: 'Production Deployment Instructions',
        },
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Colors
      const primary = '#00d4ff';
      const dark = '#0f172a';
      const gray = '#64748b';
      const lightGray = '#f1f5f9';

      // Helper functions
      const addHeading = (text, level = 1) => {
        doc.moveDown(level === 1 ? 1 : 0.5);
        if (level === 1) {
          doc.fontSize(20).font('Helvetica-Bold').fillColor(dark).text(text);
          doc.moveTo(60, doc.y).lineTo(doc.page.width - 60, doc.y).strokeColor(primary).lineWidth(2).stroke();
          doc.moveDown(0.5);
        } else if (level === 2) {
          doc.fontSize(14).font('Helvetica-Bold').fillColor(dark).text(text);
          doc.moveDown(0.3);
        } else {
          doc.fontSize(12).font('Helvetica-Bold').fillColor(dark).text(text);
          doc.moveDown(0.2);
        }
      };

      const addParagraph = (text) => {
        doc.fontSize(10).font('Helvetica').fillColor(gray).text(text, { align: 'left' });
        doc.moveDown(0.5);
      };

      const addCode = (text) => {
        doc.moveDown(0.3);
        doc.rect(60, doc.y - 5, doc.page.width - 120, 20).fill(lightGray);
        doc.fontSize(9).font('Courier').fillColor(dark).text(text, 70, doc.y);
        doc.moveDown(0.8);
      };

      const addBullet = (text) => {
        doc.fontSize(10).font('Helvetica').fillColor(gray).text(`• ${text}`, 70);
        doc.moveDown(0.2);
      };

      const addStep = (number, text) => {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primary).text(`${number}. `, { continued: true });
        doc.font('Helvetica').fillColor(dark).text(text);
        doc.moveDown(0.3);
      };

      // ====================
      // COVER PAGE
      // ====================
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(dark);

      doc.fontSize(40).font('Helvetica-Bold').fillColor('#ffffff').text('LUMINTERN', 60, 150);
      doc.fontSize(24).font('Helvetica').fillColor(primary).text('Production Deployment Guide', 60, 200);

      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica').fillColor('#94a3b8').text('Complete Step-by-Step Setup');
      doc.text('Netlify • Render • MongoDB Atlas');

      doc.moveDown(4);
      doc.fontSize(12).font('Helvetica').fillColor('#64748b').text(`Version 1.0 | ${new Date().toLocaleDateString()}`);

      // New page
      doc.addPage();

      // ====================
      // TABLE OF CONTENTS
      // ====================
      addHeading('Table of Contents');

      const toc = [
        '1. Prerequisites',
        '2. MongoDB Atlas Setup',
        '3. Backend Deployment on Render',
        '4. Frontend Deployment on Netlify',
        '5. Environment Variables',
        '6. Post-Deployment Checklist',
        '7. Troubleshooting',
      ];

      toc.forEach((item) => {
        doc.fontSize(12).font('Helvetica').fillColor(dark).text(item);
        doc.moveDown(0.3);
      });

      // ====================
      // SECTION 1: PREREQUISITES
      // ====================
      doc.addPage();
      addHeading('1. Prerequisites');

      addParagraph('Before starting deployment, ensure you have:');

      addBullet('GitHub account with LUMINTERN repository');
      addBullet('Node.js 18+ installed locally');
      addBullet('Git installed and configured');

      addHeading('Free Tier Accounts Needed', 2);

      const services = [
        { name: 'MongoDB Atlas', purpose: 'Database', limit: '512 MB storage' },
        { name: 'Render', purpose: 'Backend API', limit: '750 hours/month' },
        { name: 'Netlify', purpose: 'Frontend', limit: '100 GB bandwidth' },
      ];

      services.forEach((s) => {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(dark).text(`${s.name}: `, { continued: true });
        doc.font('Helvetica').fillColor(gray).text(`${s.purpose} - ${s.limit}`);
        doc.moveDown(0.3);
      });

      // ====================
      // SECTION 2: MONGODB ATLAS
      // ====================
      doc.addPage();
      addHeading('2. MongoDB Atlas Setup');

      addHeading('Step 2.1: Create Account', 2);
      addStep(1, 'Go to https://www.mongodb.com/atlas');
      addStep(2, 'Click "Try Free" or "Start Free"');
      addStep(3, 'Sign up with email or Google/GitHub');

      addHeading('Step 2.2: Create Free Cluster', 2);
      addStep(1, 'Click "Build a Database"');
      addStep(2, 'Select "M0 FREE" tier (Shared)');
      addStep(3, 'Choose AWS as cloud provider');
      addStep(4, 'Select region closest to your users');
      addStep(5, 'Click "Create Cluster"');

      addHeading('Step 2.3: Create Database User', 2);
      addStep(1, 'Go to Security → Database Access');
      addStep(2, 'Click "Add New Database User"');
      addStep(3, 'Username: lumintern_admin');
      addStep(4, 'Click "Autogenerate Secure Password"');
      addStep(5, 'COPY AND SAVE PASSWORD SECURELY!');
      addStep(6, 'Privileges: "Read and write to any database"');

      addHeading('Step 2.4: Configure Network Access', 2);
      addStep(1, 'Go to Security → Network Access');
      addStep(2, 'Click "Add IP Address"');
      addStep(3, 'Click "Allow Access from Anywhere"');
      addStep(4, 'Click "Confirm"');

      addHeading('Step 2.5: Get Connection String', 2);
      addStep(1, 'Go to Database → Click "Connect"');
      addStep(2, 'Select "Connect your application"');
      addStep(3, 'Driver: Node.js, Version: 5.5+');
      addStep(4, 'Copy the connection string');
      addStep(5, 'Replace <password> with your password');
      addStep(6, 'Add /lumintern after .net/');

      addCode('mongodb+srv://user:pass@cluster.mongodb.net/lumintern?retryWrites=true&w=majority');

      // ====================
      // SECTION 3: RENDER
      // ====================
      doc.addPage();
      addHeading('3. Backend Deployment on Render');

      addHeading('Step 3.1: Create Render Account', 2);
      addStep(1, 'Go to https://render.com');
      addStep(2, 'Click "Get Started for Free"');
      addStep(3, 'Sign up with GitHub');

      addHeading('Step 3.2: Create Web Service', 2);
      addStep(1, 'Click "New +" → "Web Service"');
      addStep(2, 'Connect your GitHub repository');
      addStep(3, 'Select your LUMINTERN repository');

      addHeading('Step 3.3: Configure Service', 2);

      const settings = [
        'Name: lumintern-api',
        'Region: Oregon (or closest)',
        'Branch: main',
        'Root Directory: backend',
        'Runtime: Node',
        'Build Command: npm install',
        'Start Command: node server.js',
        'Instance Type: Free',
      ];

      settings.forEach((s) => addBullet(s));

      addHeading('Step 3.4: Add Environment Variables', 2);

      const envVars = [
        'NODE_ENV = production',
        'PORT = 10000',
        'MONGODB_URI = your_connection_string',
        'JWT_SECRET = your_64_char_secret',
        'JWT_EXPIRES_IN = 7d',
        'FRONTEND_URL = https://lumintern.netlify.app',
        'CLIENT_URL = https://lumintern.netlify.app',
      ];

      envVars.forEach((v) => addBullet(v));

      addHeading('Step 3.5: Generate JWT Secret', 2);
      addParagraph('Run this command in your terminal:');
      addCode('node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');

      addHeading('Step 3.6: Deploy', 2);
      addStep(1, 'Click "Create Web Service"');
      addStep(2, 'Wait for deployment (2-5 minutes)');
      addStep(3, 'Your API: https://lumintern-api.onrender.com');

      // ====================
      // SECTION 4: NETLIFY
      // ====================
      doc.addPage();
      addHeading('4. Frontend Deployment on Netlify');

      addHeading('Step 4.1: Update Environment', 2);
      addParagraph('Create frontend/.env.production:');
      addCode('VITE_API_URL=https://lumintern-api.onrender.com');

      addHeading('Step 4.2: Create Netlify Account', 2);
      addStep(1, 'Go to https://app.netlify.com');
      addStep(2, 'Sign up with GitHub');

      addHeading('Step 4.3: Add New Site', 2);
      addStep(1, 'Click "Add new site"');
      addStep(2, 'Select "Import an existing project"');
      addStep(3, 'Choose GitHub');
      addStep(4, 'Select your LUMINTERN repository');

      addHeading('Step 4.4: Configure Build Settings', 2);

      const buildSettings = [
        'Branch: main',
        'Base directory: frontend',
        'Build command: npm run build',
        'Publish directory: frontend/dist',
      ];

      buildSettings.forEach((s) => addBullet(s));

      addHeading('Step 4.5: Add Environment Variables', 2);
      addStep(1, 'Go to Site settings → Environment variables');
      addStep(2, 'Add VITE_API_URL = https://lumintern-api.onrender.com');

      addHeading('Step 4.6: Deploy', 2);
      addStep(1, 'Click "Deploy site"');
      addStep(2, 'Wait for build (2-5 minutes)');
      addStep(3, 'Your site: https://lumintern.netlify.app');

      // ====================
      // SECTION 5: ENVIRONMENT VARIABLES
      // ====================
      doc.addPage();
      addHeading('5. Environment Variables Reference');

      addHeading('Backend (Render)', 2);

      const backendVars = [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'PORT', value: '10000' },
        { key: 'MONGODB_URI', value: 'mongodb+srv://...' },
        { key: 'JWT_SECRET', value: '64_char_random_string' },
        { key: 'FRONTEND_URL', value: 'https://lumintern.netlify.app' },
      ];

      backendVars.forEach((v) => {
        doc.fontSize(9).font('Courier').fillColor(dark).text(`${v.key} = ${v.value}`);
        doc.moveDown(0.2);
      });

      addHeading('Frontend (Netlify)', 2);

      const frontendVars = [
        { key: 'VITE_API_URL', value: 'https://lumintern-api.onrender.com' },
        { key: 'VITE_SOCKET_URL', value: 'https://lumintern-api.onrender.com' },
      ];

      frontendVars.forEach((v) => {
        doc.fontSize(9).font('Courier').fillColor(dark).text(`${v.key} = ${v.value}`);
        doc.moveDown(0.2);
      });

      // ====================
      // SECTION 6: CHECKLIST
      // ====================
      doc.addPage();
      addHeading('6. Post-Deployment Checklist');

      addHeading('Backend Verification', 2);
      addBullet('Health endpoint responds: /api/health');
      addBullet('Database connection successful');
      addBullet('CORS allows frontend origin');
      addBullet('No console errors in Render logs');

      addHeading('Frontend Verification', 2);
      addBullet('Site loads without errors');
      addBullet('API calls succeed');
      addBullet('Socket.io connects');
      addBullet('Authentication works');

      addHeading('Security Verification', 2);
      addBullet('JWT_SECRET is strong and unique');
      addBullet('MONGODB_URI not exposed');
      addBullet('CORS only allows your domains');
      addBullet('HTTPS is enforced');

      // ====================
      // SECTION 7: TROUBLESHOOTING
      // ====================
      doc.addPage();
      addHeading('7. Troubleshooting');

      addHeading('MongoDB Connection Error', 2);
      addParagraph('Check MONGODB_URI format. Ensure password doesn\'t contain special characters. Verify IP whitelist includes 0.0.0.0/0.');

      addHeading('CORS Errors', 2);
      addParagraph('Verify FRONTEND_URL matches your Netlify URL exactly. Redeploy backend after changing environment variables.');

      addHeading('Render Cold Start', 2);
      addParagraph('Free tier spins down after 15 minutes. First request takes 30-60 seconds. Use UptimeRobot to ping /api/health every 10 minutes.');

      addHeading('Socket.io Connection Failed', 2);
      addParagraph('Ensure CLIENT_URL matches frontend URL. Check if Render allows WebSocket connections (it does).');

      // ====================
      // FINAL PAGE
      // ====================
      doc.addPage();

      doc.rect(0, 0, doc.page.width, doc.page.height).fill(dark);

      doc.fontSize(30).font('Helvetica-Bold').fillColor('#ffffff').text('🎉 Congratulations!', 60, 150, { align: 'center' });

      doc.moveDown(1);
      doc.fontSize(16).font('Helvetica').fillColor(primary).text('Your LUMINTERN platform is live!', { align: 'center' });

      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica').fillColor('#94a3b8').text('Frontend: https://lumintern.netlify.app', { align: 'center' });
      doc.text('Backend: https://lumintern-api.onrender.com', { align: 'center' });

      doc.moveDown(3);
      doc.fontSize(10).fillColor('#64748b').text('For support, contact: deploy@lumintern.com', { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });
    } catch (error) {
      reject(error);
    }
  });
};

export default generateDeploymentPDF;