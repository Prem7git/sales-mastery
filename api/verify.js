const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature, 
    name, email, phone, profession 
  } = req.body;

  // ── Signature verify ──
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verify nahi hua' });
  }

  try {
    // ── Supabase mein save/update karo ──
    const { data: existing } = await supabase
      .from('registrations')
      .select('id')
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (existing) {
      await supabase
        .from('registrations')
        .update({ 
          payment_status: 'paid', 
          razorpay_payment_id 
        })
        .eq('razorpay_order_id', razorpay_order_id);
    } else {
      await supabase
        .from('registrations')
        .insert({ 
          name, email, phone, profession,
          razorpay_order_id,
          razorpay_payment_id,
          payment_status: 'paid'
        });
    }

    // ── User ko confirmation email ──
    await transporter.sendMail({
      from: `"Coach Shruti Tiwari" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✅ You are Registered! — Sales Mastery Session',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0c0a0e;color:#fff;padding:40px;border-radius:12px;">
          <h1 style="color:#f0b94a;font-size:26px;margin-bottom:8px;">🎉 You're In, ${name}!</h1>
          <p style="color:#ccc;font-size:15px;line-height:1.7;">
            Your seat for the <strong>Sales Mastery Session</strong> is confirmed. We are excited to have you!
          </p>
          <div style="background:#1a1520;border:1px solid #f0b94a;border-radius:8px;padding:24px;margin:24px 0;">
            <p style="color:#f0b94a;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">📋 Session Details</p>
            <p style="margin:8px 0;color:#fff;">📅 <strong>Date:</strong> This Sunday</p>
            <p style="margin:8px 0;color:#fff;">🕙 <strong>Time:</strong> 7:00 PM – 8:30 PM</p>
            <p style="margin:8px 0;color:#fff;">📍 <strong>Venue:</strong> Zoom (Live Online)</p>
            <p style="margin:8px 0;color:#fff;">🔗 <strong>Zoom Link:</strong> <span style="color:#f0b94a;">Will be sent 24 hours before the session</span></p>
          </div>
          <div style="background:#1a1520;border:1px solid rgba(240,185,74,0.3);border-radius:8px;padding:20px;margin:16px 0;">
            <p style="color:#f0b94a;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">📦 What You Get</p>
            <p style="margin:6px 0;color:#ccc;font-size:14px;">✦ 90-Minute LIVE Mastery Session</p>
            <p style="margin:6px 0;color:#ccc;font-size:14px;">✦ Live Q&A with Coach Shruti</p>
            <p style="margin:6px 0;color:#ccc;font-size:14px;">✦ Digital Workbook & Proven Scripts</p>
            <p style="margin:6px 0;color:#ccc;font-size:14px;">✦ Exclusive WhatsApp Community Access</p>
            <p style="margin:6px 0;color:#ccc;font-size:14px;">✦ Session Recording (limited access)</p>
          </div>
          <p style="color:#ccc;font-size:14px;margin-top:24px;">
            Koi sawaal ho toh Instagram pe message karo: 
            <a href="https://instagram.com/coachshrutitiwari" style="color:#f0b94a;">@coachshrutitiwari</a>
          </p>
          <p style="color:#f0b94a;font-size:18px;margin-top:28px;font-weight:bold;">See you Sunday! 🚀</p>
          <p style="color:#666;font-size:12px;margin-top:8px;">— Coach Shruti Tiwari</p>
        </div>
      `
    });

    // ── Admin ko notification email ──
    await transporter.sendMail({
      from: `"CoachST Bot" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `💰 NEW REGISTRATION — ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;background:#0c0a0e;color:#fff;padding:32px;border-radius:12px;">
          <h2 style="color:#f0b94a;">🎉 New Paid Registration!</h2>
          <div style="background:#1a1520;padding:20px;border-radius:8px;margin:16px 0;">
            <p><strong style="color:#f0b94a;">👤 Name:</strong> ${name}</p>
            <p><strong style="color:#f0b94a;">📧 Email:</strong> ${email}</p>
            <p><strong style="color:#f0b94a;">📞 Phone:</strong> ${phone}</p>
            <p><strong style="color:#f0b94a;">💼 Profession:</strong> ${profession}</p>
            <p><strong style="color:#f0b94a;">💰 Amount:</strong> ₹99</p>
            <p><strong style="color:#f0b94a;">🆔 Payment ID:</strong> ${razorpay_payment_id}</p>
            <p><strong style="color:#f0b94a;">📦 Order ID:</strong> ${razorpay_order_id}</p>
          </div>
        </div>
      `
    });

    console.log('✅ Both emails sent successfully');
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('❌ Error in verify:', err);
    return res.status(500).json({ error: err.message });
  }
};
