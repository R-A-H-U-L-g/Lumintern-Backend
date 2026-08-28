#!/usr/bin/env node

// ====================
// LUMINTERN Backend Verification Script
// ====================
// Run this to check if all backend files are correct

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 LUMINTERN Backend Verification');
console.log('==================================\n');

let errors = 0;
let warnings = 0;

// ====================
// CHECK FUNCTIONS
// ====================

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    if (stats.size > 0) {
      console.log(`✅ ${description}: ${filePath}`);
      return true;
    } else {
      console.log(`⚠️  ${description}: ${filePath} (empty file)`);
      warnings++;
      return false;
    }
  } else {
    console.log(`❌ ${description}: ${filePath} (MISSING)`);
    errors++;
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, dirPath);
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath);
    console.log(`✅ ${description}: ${dirPath} (${files.length} files)`);
    return true;
  } else {
    console.log(`❌ ${description}: ${dirPath} (MISSING)`);
    errors++;
    return false;
  }
}

// ====================
// CHECK MAIN FILES
// ====================

console.log('📁 Main Files:');
checkFile('server.js', 'Main Server');
checkFile('package.json', 'Package Config');
checkFile('.env.example', 'Environment Example');
checkFile('.env.production', 'Environment Production');

console.log('');

// ====================
// CHECK DIRECTORIES
// ====================

console.log('📂 Directories:');
checkDirectory('models', 'Database Models');
checkDirectory('controllers', 'Controllers');
checkDirectory('routes', 'Routes');
checkDirectory('middleware', 'Middleware');
checkDirectory('utils', 'Utilities');
checkDirectory('socket', 'Socket.io');
checkDirectory('jobs', 'Background Jobs');

console.log('');

// ====================
// CHECK MODELS
// ====================

console.log('📊 Database Models:');
const models = [
  'User.js',
  'Task.js',
  'Application.js',
  'Wallet.js',
  'TransactionLedger.js',
  'ChatRoom.js',
  'ChatMessage.js',
  'Notification.js',
  'GlobalSetting.js',
  'AuditLog.js',
];

models.forEach((model) => checkFile(`models/${model}`, `Model: ${model.replace('.js', '')}`));

console.log('');

// ====================
// CHECK CONTROLLERS
// ====================

console.log('🎮 Controllers:');
const controllers = [
  'authController.js',
  'taskController.js',
  'paymentController.js',
  'chatController.js',
  'walletController.js',
  'adminController.js',
  'adminDisputeController.js',
  'adminMasterController.js',
  'qrController.js',
  'contractController.js',
  'gamificationController.js',
  'notificationController.js',
  'deploymentController.js',
];

controllers.forEach((ctrl) => checkFile(`controllers/${ctrl}`, `Controller: ${ctrl.replace('.js', '')}`));

console.log('');

// ====================
// CHECK ROUTES
// ====================

console.log('🛣️  Routes:');
const routes = [
  'authRoutes.js',
  'taskRoutes.js',
  'paymentRoutes.js',
  'chatRoutes.js',
  'walletRoutes.js',
  'adminRoutes.js',
  'adminDisputeRoutes.js',
  'adminMasterRoutes.js',
  'qrRoutes.js',
  'contractRoutes.js',
  'gamificationRoutes.js',
  'notificationRoutes.js',
  'deploymentRoutes.js',
];

routes.forEach((route) => checkFile(`routes/${route}`, `Route: ${route.replace('.js', '')}`));

console.log('');

// ====================
// CHECK MIDDLEWARE
// ====================

console.log('🛡️  Middleware:');
const middleware = ['auth.js', 'errorHandler.js', 'workflow.js'];

middleware.forEach((mw) => checkFile(`middleware/${mw}`, `Middleware: ${mw.replace('.js', '')}`));

console.log('');

// ====================
// CHECK UTILS
// ====================

console.log('🔧 Utilities:');
const utils = [
  'gamification.js',
  'contractGenerator.js',
  'workNotificationEngine.js',
  'deploymentPdfGenerator.js',
];

utils.forEach((util) => checkFile(`utils/${util}`, `Utility: ${util.replace('.js', '')}`));

console.log('');

// ====================
// CHECK SOCKET & JOBS
// ====================

console.log('⚡ Real-time & Jobs:');
checkFile('socket/socketManager.js', 'Socket Manager');
checkFile('jobs/autoRelease.js', 'Auto Release Job');

console.log('');

// ====================
// CHECK PACKAGE.JSON
// ====================

console.log('📦 Package.json Dependencies:');
try {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const requiredDeps = [
    'express',
    'mongoose',
    'cors',
    'helmet',
    'bcryptjs',
    'jsonwebtoken',
    'dotenv',
    'socket.io',
    'qrcode',
    'pdfkit',
    'nodemailer',
    'node-cron',
    'express-rate-limit',
    'morgan',
  ];

  const missingDeps = requiredDeps.filter((dep) => !packageJson.dependencies[dep]);

  if (missingDeps.length === 0) {
    console.log('✅ All required dependencies present');
  } else {
    console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
    errors++;
  }

  // Check scripts
  if (packageJson.scripts.start === 'node server.js') {
    console.log('✅ Start script correct');
  } else {
    console.log('⚠️  Start script should be: node server.js');
    warnings++;
  }

  if (packageJson.type === 'module') {
    console.log('✅ ES Modules enabled');
  } else {
    console.log('⚠️  Consider adding "type": "module" for ES6 imports');
    warnings++;
  }
} catch (error) {
  console.log('❌ Error reading package.json');
  errors++;
}

console.log('');

// ====================
// CHECK SERVER.JS IMPORTS
// ====================

console.log('🔗 Server.js Import Verification:');
try {
  const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

  const importChecks = [
    { import: 'authRoutes', file: './routes/authRoutes.js' },
    { import: 'taskRoutes', file: './routes/taskRoutes.js' },
    { import: 'paymentRoutes', file: './routes/paymentRoutes.js' },
    { import: 'adminRoutes', file: './routes/adminRoutes.js' },
    { import: 'adminDisputeRoutes', file: './routes/adminDisputeRoutes.js' },
    { import: 'adminMasterRoutes', file: './routes/adminMasterRoutes.js' },
    { import: 'chatRoutes', file: './routes/chatRoutes.js' },
    { import: 'walletRoutes', file: './routes/walletRoutes.js' },
    { import: 'qrRoutes', file: './routes/qrRoutes.js' },
    { import: 'contractRoutes', file: './routes/contractRoutes.js' },
    { import: 'gamificationRoutes', file: './routes/gamificationRoutes.js' },
    { import: 'deploymentRoutes', file: './routes/deploymentRoutes.js' },
    { import: 'notificationRoutes', file: './routes/notificationRoutes.js' },
    { import: 'initializeSocket', file: './socket/socketManager.js' },
    { import: 'startAutoReleaseJob', file: './jobs/autoRelease.js' },
    { import: 'errorHandler', file: './middleware/errorHandler.js' },
    { import: 'notFound', file: './middleware/errorHandler.js' },
  ];

  importChecks.forEach(({ import: importName, file }) => {
    if (serverContent.includes(importName)) {
      console.log(`✅ Import: ${importName}`);
    } else {
      console.log(`⚠️  Import not found: ${importName}`);
      warnings++;
    }
  });
} catch (error) {
  console.log('❌ Error reading server.js');
  errors++;
}

console.log('');

// ====================
// SUMMARY
// ====================

console.log('📊 Verification Summary');
console.log('======================');
console.log(`✅ Errors: ${errors}`);
console.log(`⚠️  Warnings: ${warnings}`);

if (errors === 0) {
  console.log('\n🎉 All checks passed! Backend is ready for deployment.');
  console.log('\n📋 Next Steps:');
  console.log('1. Create .env file with your MongoDB URI and JWT_SECRET');
  console.log('2. Run: npm install');
  console.log('3. Run: npm run dev (for testing)');
  console.log('4. Deploy to Render');
} else {
  console.log('\n❌ Some files are missing. Please check the errors above.');
}

console.log('');
process.exit(errors > 0 ? 1 : 0);