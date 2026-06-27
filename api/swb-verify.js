const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, name, email, phone, profession } = req.body;

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verify nahi hua' });
  }

  try {
    await supabase.from('swb_registrations')
      .update({ payment_status: 'paid', razorpay_payment_id })
      .eq('razorpay_order_id', razorpay_order_id);

    await transporter.sendMail({
      from: `"Coach Shruti Tiwari" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: '✅ Payment Confirmed — Sales Warrior Blueprint',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060610;color:#fff;padding:40px;border-radius:12px;">
          <h1 style="color:#F5C542;font-size:26px;">🎉 You're In, ${name}!</h1>
          <p style="color:#ccc;font-size:15px;line-height:1.7;">Your payment for the <strong>Sales Warrior Blueprint</strong> session is confirmed!</p>
          <div style="background:#0d0d1a;border:1px solid #F5C542;border-radius:8px;padding:24px;margin:24px 0;">
            <p style="color:#F5C542;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Session Details</p>
            <p style="color:#fff;margin:8px 0;">📅 <strong>Date:</strong> ${process.env.WEBINAR_DATE || 'To be announced'}</p>
            <p style="color:#fff;margin:8px 0;">🕙 <strong>Time:</strong> ${process.env.WEBINAR_TIME || 'To be announced'}</p>
            <p style="color:#fff;margin:8px 0;">📍 <strong>Venue:</strong> Zoom (Live Online)</p>
            <p style="color:#fff;margin:8px 0;">🔗 <strong>Zoom Link:</strong> ${process.env.WEBINAR_LINK || 'Will be sent 24 hours before the session'}</p>
          </div>
          <p style="color:#f88;font-size:13px;">⚠️ This is a LIVE-only session. No recording will be provided.</p>
          <p style="color:#F5C542;font-size:18px;margin-top:28px;">See you there! 🚀</p>
        </div>
      `
    });

    await transporter.sendMail({
      from: `"SWB Bot" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `💰 NEW PAID REGISTRATION — ${name}`,
      html: `<div style="font-family:Arial,sans-serif;"><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${phone}</p><p><strong>Profession:</strong> ${profession}</p><p><strong>Amount:</strong> ₹199</p><p><strong>Payment ID:</strong> ${razorpay_payment_id}</p></div>`
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
