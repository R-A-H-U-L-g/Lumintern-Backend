import express from 'express';
import { downloadDeploymentGuide } from '../controllers/deploymentController.js';

const router = express.Router();

// Download deployment guide PDF (public endpoint)
router.get('/guide', downloadDeploymentGuide);

export default router;