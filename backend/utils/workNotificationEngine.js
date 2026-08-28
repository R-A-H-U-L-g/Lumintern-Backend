import { EventEmitter } from 'events';
import nodemailer from 'nodemailer';

// ====================
// WORK NOTIFICATION ENGINE
// ====================
class WorkNotificationEngine extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
    this.transporter = null;
    this.initializeTransporter();
    this.registerEventHandlers();
  }

  // ====================
  // INITIALIZE EMAIL TRANSPORTER
  // ====================
  initializeTransporter() {
    // Configure email transporter
    // In production, use SendGrid, AWS SES, or similar
    if (process.env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Development mode - log instead of sending
      console.log('📧 Email transporter in development mode (logs only)');
    }
  }

  // ====================
  // REGISTER EVENT HANDLERS
  // ====================
  registerEventHandlers() {
    // Work Broadcast - Notify freshers about new tasks
    this.on('work.broadcast', async (data) => {
      await this.handleWorkBroadcast(data);
    });

    // Work Submitted - Notify business about proof submission
    this.on('work.submitted', async (data) => {
      await this.handleWorkSubmitted(data);
    });

    // Work Paid - Notify fresher about payment
    this.on('work.paid', async (data) => {
      await this.handleWorkPaid(data);
    });
  }

  // ====================
  // HANDLE WORK BROADCAST
  // ====================
  async handleWorkBroadcast(data) {
    const { task, targetFreshers } = data;

    console.log(`📢 Broadcasting new task "${task.title}" to ${targetFreshers.length} freshers`);

    for (const fresher of targetFreshers) {
      try {
        // Send email notification
        await this.sendEmail({
          to: fresher.email,
          subject: `🎯 New Task Match: ${task.title}`,
          html: this.generateWorkBroadcastEmail(task, fresher),
        });

        // Send push notification (if push service configured)
        await this.sendPushNotification(fresher._id, {
          title: 'New Task Available! 🎯',
          body: `${task.title} - $${task.budget}`,
          data: {
            type: 'new_task',
            taskId: task._id.toString(),
            workScale: task.workScale,
          },
        });

        console.log(`✅ Notified ${fresher.name} about task: ${task.title}`);
      } catch (error) {
        console.error(`❌ Failed to notify ${fresher.name}:`, error.message);
      }
    }
  }

  // ====================
  // HANDLE WORK SUBMITTED
  // ====================
  async handleWorkSubmitted(data) {
    const { task, fresher, proofLink } = data;
    const business = task.postedBy;

    console.log(`📤 Work submitted by ${fresher.name} for task "${task.title}"`);

    try {
      // Send email to business
      await this.sendEmail({
        to: business.email,
        subject: `📋 Work Submitted for Review: ${task.title}`,
        html: this.generateWorkSubmittedEmail(task, fresher, proofLink, business),
      });

      // Send push notification to business
      await this.sendPushNotification(business._id, {
        title: 'Work Submitted for Review 📋',
        body: `${fresher.name} submitted work for "${task.title}"`,
        data: {
          type: 'work_submitted',
          taskId: task._id.toString(),
          fresherName: fresher.name,
          proofLink,
        },
      });

      console.log(`✅ Notified ${business.name || business.businessProfile?.businessName} about submission`);
    } catch (error) {
      console.error(`❌ Failed to notify business:`, error.message);
    }
  }

  // ====================
  // HANDLE WORK PAID
  // ====================
  async handleWorkPaid(data) {
    const { task, fresher, paymentAmount, newBalance } = data;

    console.log(`💰 Payment of $${paymentAmount} released to ${fresher.name} for task "${task.title}"`);

    try {
      // Send email to fresher
      await this.sendEmail({
        to: fresher.email,
        subject: `💰 Payment Received: $${paymentAmount} for "${task.title}"`,
        html: this.generateWorkPaidEmail(task, fresher, paymentAmount, newBalance),
      });

      // Send push notification to fresher
      await this.sendPushNotification(fresher._id, {
        title: 'Payment Received! 💰',
        body: `$${paymentAmount} has been added to your wallet`,
        data: {
          type: 'payment_received',
          taskId: task._id.toString(),
          amount: paymentAmount,
          newBalance,
        },
      });

      console.log(`✅ Notified ${fresher.name} about payment of $${paymentAmount}`);
    } catch (error) {
      console.error(`❌ Failed to notify fresher:`, error.message);
    }
  }

  // ====================
  // SEND EMAIL
  // ====================
  async sendEmail({ to, subject, html }) {
    if (!this.transporter) {
      console.log(`📧 [DEV] Email to: ${to}`);
      console.log(`📧 [DEV] Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"LUMINTERN" <${process.env.SMTP_FROM || 'noreply@lumintern.com'}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Email send error:', error.message);
      // Don't throw - notifications shouldn't break main flow
    }
  }

  // ====================
  // SEND PUSH NOTIFICATION
  // ====================
  async sendPushNotification(userId, payload) {
    // In production, integrate with Firebase Cloud Messaging, OneSignal, etc.
    // For now, we'll log the notification
    console.log(`📱 [Push] User ${userId}:`, payload.title);

    // Store notification in database for in-app display
    try {
      const Notification = (await import('../models/Notification.js')).default;
      await Notification.create({
        user: userId,
        title: payload.title,
        body: payload.body,
        type: payload.data?.type || 'general',
        data: payload.data || {},
        read: false,
      });
    } catch (error) {
      // Notification model might not exist yet - that's okay
      console.log('📱 [Push] Notification stored in memory only');
    }
  }

  // ====================
  // EMAIL TEMPLATES
  // ====================

  generateWorkBroadcastEmail(task, fresher) {
    const skillsMatch = task.skillsRequired.filter((skill) =>
      fresher.fresherProfile?.skills?.includes(skill)
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; text-align: center; }
    .logo { color: #00d4ff; font-size: 28px; font-weight: 800; }
    .content { padding: 32px; }
    .task-card { background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 20px 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-small { background: #fef3c7; color: #92400e; }
    .badge-large { background: #dbeafe; color: #1e40af; }
    .skills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .skill { background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .skill.match { background: #dcfce7; color: #166534; }
    .budget { font-size: 32px; font-weight: 800; color: #00d4ff; }
    .cta { display: inline-block; background: linear-gradient(135deg, #00d4ff, #0891b2); color: #0f172a; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; margin-top: 20px; }
    .footer { background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LUMINTERN</div>
      <p style="color: #94a3b8; margin-top: 8px;">New Task Match Found!</p>
    </div>
    <div class="content">
      <h2 style="color: #0f172a;">Hi ${fresher.name}! 👋</h2>
      <p style="color: #64748b;">A new task matches your skills profile:</p>
      
      <div class="task-card">
        <span class="badge ${task.workScale === 'small' ? 'badge-small' : 'badge-large'}">
          ${task.workScale === 'small' ? '⚡ Small Task' : '🏢 Large Project'}
        </span>
        <h3 style="color: #0f172a; margin: 12px 0 8px;">${task.title}</h3>
        <p style="color: #64748b; font-size: 14px;">${task.description?.substring(0, 150)}...</p>
        
        <div class="skills">
          ${task.skillsRequired
            .map(
              (skill) =>
                `<span class="skill ${skillsMatch.includes(skill) ? 'match' : ''}">${skill}</span>`
            )
            .join('')}
        </div>
        
        <div style="margin-top: 16px;">
          <span class="budget">$${task.budget}</span>
          <span style="color: #64748b; font-size: 14px;"> ${task.workScale === 'small' ? 'Fixed Price' : 'Milestone Payments'}</span>
        </div>
      </div>
      
      <p style="color: #64748b;">
        <strong>Skills Match:</strong> ${skillsMatch.length} of ${task.skillsRequired.length} skills match your profile
      </p>
      
      <a href="${process.env.FRONTEND_URL || 'https://lumintern.netlify.app'}/tasks/${task._id}" class="cta">
        View & Apply Now →
      </a>
    </div>
    <div class="footer">
      <p>You received this because your skills match this task.</p>
      <p>© ${new Date().getFullYear()} LUMINTERN. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  generateWorkSubmittedEmail(task, fresher, proofLink, business) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; text-align: center; }
    .logo { color: #00d4ff; font-size: 28px; font-weight: 800; }
    .content { padding: 32px; }
    .alert-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .proof-link { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 12px 0; }
    .cta { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #0f172a; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; margin-top: 20px; }
    .footer { background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LUMINTERN</div>
      <p style="color: #94a3b8; margin-top: 8px;">Work Submitted for Review</p>
    </div>
    <div class="content">
      <h2 style="color: #0f172a;">Action Required 📋</h2>
      <p style="color: #64748b;">
        <strong>${fresher.name}</strong> has submitted work for your task.
      </p>
      
      <div class="alert-box">
        <h3 style="color: #92400e; margin: 0 0 8px;">⏰ Review Deadline</h3>
        <p style="color: #78350f; margin: 0;">
          Please review within <strong>72 hours</strong>. If no action is taken, payment will be automatically released to the fresher.
        </p>
      </div>
      
      <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 20px 0;">
        <h3 style="color: #0f172a; margin: 0 0 12px;">${task.title}</h3>
        <p style="color: #64748b; margin: 0 0 16px;">Budget: <strong>$${task.budget}</strong></p>
        
        <p style="color: #0f172a; font-weight: 600;">Proof of Work:</p>
        <a href="${proofLink}" class="proof-link">🔗 ${proofLink}</a>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'https://lumintern.netlify.app'}/tasks/${task._id}/review" class="cta">
        Review Work Now →
      </a>
    </div>
    <div class="footer">
      <p>This is an automated notification. Please review the submitted work promptly.</p>
      <p>© ${new Date().getFullYear()} LUMINTERN. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }

  generateWorkPaidEmail(task, fresher, paymentAmount, newBalance) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center; }
    .logo { color: #ffffff; font-size: 28px; font-weight: 800; }
    .content { padding: 32px; }
    .success-box { background: #dcfce7; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center; }
    .amount { font-size: 48px; font-weight: 800; color: #059669; }
    .balance-card { background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .cta { display: inline-block; background: linear-gradient(135deg, #00d4ff, #0891b2); color: #0f172a; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; margin-top: 20px; }
    .footer { background: #f1f5f9; padding: 24px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LUMINTERN</div>
      <p style="color: #d1fae5; margin-top: 8px;">Payment Successful!</p>
    </div>
    <div class="content">
      <h2 style="color: #0f172a;">Congratulations! 🎉</h2>
      <p style="color: #64748b;">Your work has been approved and payment has been released.</p>
      
      <div class="success-box">
        <p style="color: #166534; margin: 0 0 8px;">Payment Received</p>
        <div class="amount">$${paymentAmount}</div>
        <p style="color: #166534; margin: 8px 0 0;">for "${task.title}"</p>
      </div>
      
      <div class="balance-card">
        <h3 style="color: #0f172a; margin: 0 0 12px;">💳 Wallet Balance</h3>
        <div style="font-size: 28px; font-weight: 700; color: #059669;">$${newBalance.toFixed(2)}</div>
        <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Available for withdrawal</p>
      </div>
      
      <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #0f172a; margin: 0 0 12px;">Task Summary</h3>
        <p style="color: #64748b; margin: 4px 0;"><strong>Task:</strong> ${task.title}</p>
        <p style="color: #64748b; margin: 4px 0;"><strong>Scale:</strong> ${task.workScale === 'small' ? 'Small Task' : 'Large Project'}</p>
        <p style="color: #64748b; margin: 4px 0;"><strong>Status:</strong> <span style="color: #059669;">Completed ✓</span></p>
      </div>
      
      <a href="${process.env.FRONTEND_URL || 'https://lumintern.netlify.app'}/wallet" class="cta">
        View Wallet →
      </a>
    </div>
    <div class="footer">
      <p>Keep up the great work! More tasks are waiting for you.</p>
      <p>© ${new Date().getFullYear()} LUMINTERN. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }
}

// Create singleton instance
const workNotificationEngine = new WorkNotificationEngine();

export default workNotificationEngine;