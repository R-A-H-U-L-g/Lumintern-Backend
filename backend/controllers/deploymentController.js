import { generateDeploymentPDF } from '../utils/deploymentPdfGenerator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====================
// GENERATE DEPLOYMENT PDF
// ====================
export const downloadDeploymentGuide = async (req, res, next) => {
  try {
    const outputPath = path.join(__dirname, '..', 'temp', 'deployment-guide.pdf');

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate PDF
    await generateDeploymentPDF(outputPath);

    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="LUMINTERN-Deployment-Guide.pdf"');

    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);

    // Clean up after sending
    fileStream.on('end', () => {
      fs.unlinkSync(outputPath);
    });
  } catch (error) {
    next(error);
  }
};