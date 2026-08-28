import PDFDocument from 'pdfkit';

// ====================
// GENERATE INSTANT CONTRACT
// ====================
export const generateInstantContract = (taskDetails, fresherName, businessName) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 60,
          right: 60,
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });

      // Colors
      const primaryColor = '#00d4ff';
      const darkColor = '#0f172a';
      const grayColor = '#64748b';
      const lightGray = '#f1f5f9';

      // Header
      doc
        .rect(0, 0, doc.page.width, 120)
        .fill(darkColor);

      // Logo
      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('LUMINTERN', 60, 40);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(primaryColor)
        .text('WORK AGREEMENT CONTRACT', 60, 75);

      // Contract ID
      const contractId = `LUM-${Date.now().toString(36).toUpperCase()}`;
      doc
        .fontSize(9)
        .fillColor('#94a3b8')
        .text(`Contract ID: ${contractId}`, 400, 45, { align: 'right' });

      doc
        .text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 60, { align: 'right' });

      // Move down
      doc.y = 150;

      // Section: Parties
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text('PARTIES TO THIS AGREEMENT');

      doc.moveDown(0.5);

      // Business
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(grayColor)
        .text('CLIENT (Business):', { continued: false });

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(darkColor)
        .text(businessName);

      doc.moveDown(0.5);

      // Fresher
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(grayColor)
        .text('SERVICE PROVIDER (Fresher):');

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor(darkColor)
        .text(fresherName);

      doc.moveDown(1);

      // Divider
      doc
        .moveTo(60, doc.y)
        .lineTo(doc.page.width - 60, doc.y)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc.moveDown(1);

      // Section: Scope of Work
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text('SCOPE OF WORK');

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(grayColor)
        .text('Task Title:', { continued: true })
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text(` ${taskDetails.title}`);

      doc.moveDown(0.3);

      doc
        .font('Helvetica')
        .fillColor(grayColor)
        .text('Work Scale:', { continued: true })
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text(` ${taskDetails.workScale === 'small' ? 'Small Task' : 'Large Project'}`);

      doc.moveDown(0.3);

      doc
        .font('Helvetica')
        .fillColor(grayColor)
        .text('Description:');

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(darkColor)
        .text(taskDetails.description, {
          width: doc.page.width - 120,
          align: 'left',
        });

      doc.moveDown(1);

      // Divider
      doc
        .moveTo(60, doc.y)
        .lineTo(doc.page.width - 60, doc.y)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc.moveDown(1);

      // Section: Financial Terms
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text('FINANCIAL TERMS');

      doc.moveDown(0.5);

      // Budget box
      doc
        .rect(60, doc.y, doc.page.width - 120, 60)
        .fill(lightGray);

      doc.moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(grayColor)
        .text('Locked Escrow Budget:', 80, doc.y - 10);

      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(`$${taskDetails.budget.toLocaleString()}`, 300, doc.y - 25, { align: 'right', width: 200 });

      doc.moveDown(2);

      // Escrow terms
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text('Escrow Payment Terms:');

      doc.moveDown(0.3);

      const escrowTerms = [
        'Funds are held securely in platform escrow until work is approved.',
        'Payment is released automatically after 72 hours if no action is taken.',
        'Disputes must be raised within the review period.',
      ];

      escrowTerms.forEach((term, index) => {
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor(grayColor)
          .text(`${index + 1}. ${term}`, 70);
        doc.moveDown(0.2);
      });

      doc.moveDown(0.5);

      // Divider
      doc
        .moveTo(60, doc.y)
        .lineTo(doc.page.width - 60, doc.y)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc.moveDown(1);

      // Section: Auto-Release Rule
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text('72-HOUR AUTO-RELEASE RULE');

      doc.moveDown(0.5);

      // Warning box
      doc
        .rect(60, doc.y, doc.page.width - 120, 80)
        .fill('#fef3c7');

      doc.moveDown(0.3);

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#92400e')
        .text('⚠️ IMPORTANT:', 80, doc.y - 10);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#78350f')
        .text(
          'If the Client does not approve or dispute the submitted work within 72 hours of submission, the platform will automatically release the escrow payment to the Service Provider. This ensures fair compensation for completed work.',
          80,
          doc.y + 5,
          { width: doc.page.width - 160 }
        );

      doc.moveDown(3);

      // Divider
      doc
        .moveTo(60, doc.y)
        .lineTo(doc.page.width - 60, doc.y)
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .stroke();

      doc.moveDown(1);

      // Section: Signatures
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text('DIGITAL SIGNATURES');

      doc.moveDown(0.5);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(grayColor)
        .text('By accepting this contract on the LUMINTERN platform, both parties agree to the terms outlined above.');

      doc.moveDown(1);

      // Signature boxes
      const sigY = doc.y;
      const sigWidth = (doc.page.width - 140) / 2;

      // Business signature
      doc
        .rect(60, sigY, sigWidth, 80)
        .fill(lightGray);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(grayColor)
        .text('CLIENT SIGNATURE', 70, sigY + 10);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text(businessName, 70, sigY + 30);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(primaryColor)
        .text('✓ Digitally Signed', 70, sigY + 55);

      // Fresher signature
      doc
        .rect(80 + sigWidth, sigY, sigWidth, 80)
        .fill(lightGray);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(grayColor)
        .text('PROVIDER SIGNATURE', 90 + sigWidth, sigY + 10);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(darkColor)
        .text(fresherName, 90 + sigWidth, sigY + 30);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(primaryColor)
        .text('✓ Digitally Signed', 90 + sigWidth, sigY + 55);

      doc.moveDown(5);

      // Footer
      doc
        .rect(0, doc.page.height - 80, doc.page.width, 80)
        .fill(darkColor);

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(
          'This contract is generated automatically by the LUMINTERN platform. Both parties have digitally signed by accepting the task terms.',
          60,
          doc.page.height - 60,
          { width: doc.page.width - 120, align: 'center' }
        );

      doc
        .fontSize(7)
        .fillColor('#64748b')
        .text(
          `Contract ID: ${contractId} | Generated: ${new Date().toISOString()} | LUMINTERN © ${new Date().getFullYear()}`,
          60,
          doc.page.height - 40,
          { width: doc.page.width - 120, align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

export default generateInstantContract;