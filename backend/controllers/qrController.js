import QRCode from 'qrcode';
import User from '../models/User.js';

// ====================
// GENERATE QR POSTER
// ====================
export const generateQRPoster = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get business details
    const user = await User.findById(userId);
    if (!user || user.role !== 'business') {
      return res.status(403).json({
        status: 'error',
        message: 'Only business accounts can generate QR posters',
      });
    }

    // Generate deep-link URL
    const storefrontUrl = `https://lumintern.com/store/${user._id}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(storefrontUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    // Get business name
    const businessName = user.businessProfile?.businessName || user.name;

    res.status(200).json({
      status: 'success',
      data: {
        qrCode: qrDataUrl,
        storefrontUrl,
        businessName,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GENERATE QR POSTER HTML
// ====================
export const generateQRPosterHTML = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get business details
    const user = await User.findById(userId);
    if (!user || user.role !== 'business') {
      return res.status(403).json({
        status: 'error',
        message: 'Only business accounts can generate QR posters',
      });
    }

    // Generate deep-link URL
    const storefrontUrl = `https://lumintern.com/store/${user._id}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(storefrontUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    // Get business name
    const businessName = user.businessProfile?.businessName || user.name;

    // Generate HTML poster
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LUMINTERN QR Poster - ${businessName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        .poster {
            background: white;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            padding: 48px;
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 32px;
        }
        .logo-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #00d4ff, #0891b2);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .logo-text {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
        }
        .logo-text span {
            background: linear-gradient(135deg, #00d4ff, #0891b2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .headline {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 8px;
            line-height: 1.3;
        }
        .subheadline {
            font-size: 16px;
            color: #64748b;
            margin-bottom: 32px;
            line-height: 1.5;
        }
        .qr-container {
            background: #f1f5f9;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
            display: inline-block;
        }
        .qr-image {
            width: 200px;
            height: 200px;
        }
        .business-name {
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
            margin-bottom: 8px;
        }
        .business-tagline {
            font-size: 14px;
            color: #94a3b8;
            margin-bottom: 24px;
        }
        .steps {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 32px;
        }
        .step {
            text-align: center;
        }
        .step-number {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #00d4ff, #0891b2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 14px;
            margin: 0 auto 8px;
        }
        .step-text {
            font-size: 12px;
            color: #64748b;
        }
        .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 24px;
        }
        .footer-text {
            font-size: 12px;
            color: #94a3b8;
        }
        .url {
            font-size: 11px;
            color: #00d4ff;
            margin-top: 8px;
            word-break: break-all;
        }
        @media print {
            body { background: white; }
            .poster { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="poster">
        <div class="logo">
            <div class="logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
            </div>
            <div class="logo-text">LUM<span>INTERN</span></div>
        </div>
        
        <div class="headline">Need Tech Help?</div>
        <div class="subheadline">Scan to solve our tech tasks on LUMINTERN!</div>
        
        <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code" class="qr-image">
        </div>
        
        <div class="business-name">${businessName}</div>
        <div class="business-tagline">Hire talented students for your tech needs</div>
        
        <div class="steps">
            <div class="step">
                <div class="step-number">1</div>
                <div class="step-text">Scan QR</div>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <div class="step-text">Post Task</div>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <div class="step-text">Get Help</div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-text">Powered by LUMINTERN - Connecting Talent with Opportunity</div>
            <div class="url">${storefrontUrl}</div>
        </div>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};