const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "https://lgpaxncukijrfpyirgbn.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncGF4bmN1a2lqcmZweWlyZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTAxMjAsImV4cCI6MjEwNDc4NjEyMH0.x9O_ow7avcp4cK2hm9xY9W6FZHj5gS7jSPEFjUdEI08";

// Gmail SMTP Configuration
const SMTP_USER = process.env.SMTP_USER || 'sasisteels863@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASSWORD || 'zvng buds bqyj usej').replace(/\s+/g, '');
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// In-memory OTP storage fallback (with 15-min expiration)
global._sasiOtpStore = global._sasiOtpStore || {};

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { action, email, otp, newPassword, username } = req.body || {};

  const targetEmail = (email || '').trim().toLowerCase();
  const allowedEmails = ['sasisteels863@gmail.com', 'contact@sasisteel.com'];

  // ==========================================
  // ACTION 1: SEND OTP TO GMAIL
  // ==========================================
  if (action === 'send_otp') {
    if (!targetEmail) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    // Verify authorized admin email
    const isAuthorized = allowedEmails.includes(targetEmail) || targetEmail.endsWith('@sasisteel.com') || targetEmail === 'sasisteels863@gmail.com';
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'This email is not registered as a SASI Steels Admin account.' 
      });
    }

    // Generate secure 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Store in global cache
    global._sasiOtpStore[targetEmail] = {
      otp: generatedOtp,
      expiry: expiry
    };

    // Store in Supabase if table exists
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase
        .from('admin_users')
        .update({ 
          password_hash: `RESET_PENDING_${generatedOtp}` 
        })
        .ilike('username', targetEmail);
    } catch (e) {
      console.warn("Supabase OTP sync notice:", e.message);
    }

    // Compose Rich HTML Email
    const mailOptions = {
      from: `"SASI Steel Engineering" <${SMTP_USER}>`,
      to: targetEmail,
      subject: `🔐 Admin Password Reset OTP: ${generatedOtp} - SASI Steels`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .header { text-align: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
            .logo-title { font-size: 22px; font-weight: 800; color: #f97316; letter-spacing: 1px; }
            .subtitle { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
            .badge { display: inline-block; background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 8px; padding: 4px 12px; font-size: 11px; font-weight: 700; margin-bottom: 16px; }
            .otp-box { background: #0f172a; border: 2px dashed #f97316; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #f97316; font-family: monospace; }
            .warning { font-size: 12px; color: #94a3b8; line-height: 1.6; margin-top: 20px; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 30px; border-top: 1px solid #334155; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-title">SASI STEEL ENGINEERING</div>
              <div class="subtitle">Admin Portal Security</div>
            </div>
            
            <div style="text-align: center;">
              <span class="badge">PASSWORD RESET REQUEST</span>
            </div>

            <p style="font-size: 14px; color: #cbd5e1; margin-bottom: 8px;">Hello Administrator,</p>
            <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
              We received a request to reset the admin password for your SASI Steel portal account (<strong>${targetEmail}</strong>).
            </p>

            <div class="otp-box">
              <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
              <div class="otp-code">${generatedOtp}</div>
              <div style="font-size: 11px; color: #f59e0b; margin-top: 6px;">⏱️ Valid for 15 minutes only</div>
            </div>

            <p class="warning">
              ⚠️ If you did not request this password reset, please ignore this email. Your current password will remain unchanged.
            </p>

            <div class="footer">
              SASI Steel Engineering • Hyderabad, Telangana, India<br/>
              Support: +91 83339 91114 | contact@sasisteel.com
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      return res.status(200).json({
        success: true,
        message: `Verification OTP has been sent to ${targetEmail}. Please check your inbox and spam folder.`
      });
    } catch (err) {
      console.error('SMTP Mail Sending Error:', err);
      return res.status(500).json({
        success: false,
        message: `Failed to send email via SMTP: ${err.message || 'Please check Gmail App Password configuration.'}`
      });
    }
  }

  // ==========================================
  // ACTION 2: VERIFY OTP & RESET PASSWORD
  // ==========================================
  if (action === 'verify_reset') {
    if (!targetEmail || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, OTP, and New Password are required.' 
      });
    }

    const inputOtp = otp.toString().trim();
    const cleanPass = newPassword.toString().trim();

    if (cleanPass.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long.' 
      });
    }

    // Check OTP validity
    const cached = global._sasiOtpStore[targetEmail];
    const isCachedValid = cached && cached.otp === inputOtp && Date.now() < cached.expiry;

    // Supabase validation check
    let isDbValid = false;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('*')
        .or(`username.ilike.${targetEmail},username.eq.admin`)
        .limit(2);

      if (data && data.length > 0) {
        isDbValid = data.some(u => u.password_hash === `RESET_PENDING_${inputOtp}`);
      }
    } catch (e) {
      console.warn("DB check error:", e.message);
    }

    if (!isCachedValid && !isDbValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP. Please request a new verification code.'
      });
    }

    // Update password in Supabase for both target email & admin accounts
    try {
      // 1. Update email user
      await supabase
        .from('admin_users')
        .upsert({
          username: targetEmail,
          password_hash: cleanPass,
          role: 'Super Admin'
        }, { onConflict: 'username' });

      // 2. Also update master 'admin' account so both logins work with the new password
      await supabase
        .from('admin_users')
        .upsert({
          username: 'admin',
          password_hash: cleanPass,
          role: 'Super Admin'
        }, { onConflict: 'username' });

    } catch (dbErr) {
      console.warn("Supabase password update notice:", dbErr.message);
    }

    // Clear used OTP
    delete global._sasiOtpStore[targetEmail];

    // Send confirmation email
    try {
      await transporter.sendMail({
        from: `"SASI Steel Engineering" <${SMTP_USER}>`,
        to: targetEmail,
        subject: `✅ Admin Password Successfully Changed - SASI Steels`,
        html: `
          <div style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 24px; border-radius: 12px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #22c55e; margin-top: 0;">Password Reset Successful</h2>
            <p style="color: #cbd5e1; font-size: 14px;">Your SASI Steels admin portal password for <strong>${targetEmail}</strong> was successfully updated.</p>
            <p style="color: #94a3b8; font-size: 12px;">You can now log in to the admin panel with your new password.</p>
            <div style="margin-top: 20px; font-size: 11px; color: #64748b;">SASI Steel Engineering Security Team</div>
          </div>
        `
      });
    } catch (e) {
      // Non-blocking
    }

    return res.status(200).json({
      success: true,
      newPassword: cleanPass,
      message: 'Admin password has been reset successfully! You can now log in with your new password.'
    });
  }

  return res.status(400).json({ success: false, message: 'Invalid action.' });
};
